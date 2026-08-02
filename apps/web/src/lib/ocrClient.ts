import Tesseract from 'tesseract.js';

/**
 * Orquesta Tesseract.js desde apps/web (nunca desde el paquete puro):
 * el motor y su Web Worker interno viven aquí, junto a la política de
 * concurrencia, watchdog y cancelación local. document-intelligence solo
 * conocerá el resultado ya normalizado (Fase C.3).
 */

export type OcrErrorCode =
  'worker_unavailable' | 'language_unavailable' | 'timeout' | 'stalled' | 'cancelled' | 'unknown';

export class OcrError extends Error {
  constructor(
    public readonly code: OcrErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'OcrError';
  }
}

export interface OcrProgressEvent {
  status: string;
  progress: number;
}

export interface OcrToken {
  text: string;
  confidence: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface OcrPageResult {
  text: string;
  confidence: number;
  tokens: OcrToken[];
}

export interface OcrRecognizeOptions {
  signal?: AbortSignal;
  onProgress?: (event: OcrProgressEvent) => void;
  timeoutMs?: number;
  watchdogMs?: number;
}

const DEFAULT_TIMEOUT_MS = 120_000;
const DEFAULT_WATCHDOG_MS = 30_000;
const WATCHDOG_CHECK_INTERVAL_MS = 1_000;

// Tesseract.js consume WASM cuyo heap solo crece durante la vida del worker;
// mantener un único trabajo local activo evita picos de memoria en equipos
// modestos. Ver docs/PROJECT_HANDOFF.md (riesgos de OCR local).
export const MAX_CONCURRENT_OCR_JOBS = 1;

let activeJobs = 0;
const waitQueue: (() => void)[] = [];

async function acquireSlot(): Promise<void> {
  if (activeJobs < MAX_CONCURRENT_OCR_JOBS) {
    activeJobs += 1;
    return;
  }
  await new Promise<void>((resolve) => waitQueue.push(resolve));
  activeJobs += 1;
}

function releaseSlot(): void {
  activeJobs = Math.max(0, activeJobs - 1);
  const next = waitQueue.shift();
  next?.();
}

function tokensFromPage(page: Tesseract.Page): OcrToken[] {
  const tokens: OcrToken[] = [];
  for (const block of page.blocks ?? []) {
    for (const paragraph of block.paragraphs) {
      for (const line of paragraph.lines) {
        for (const word of line.words) {
          tokens.push({
            text: word.text,
            confidence: word.confidence,
            x: word.bbox.x0,
            y: word.bbox.y0,
            width: word.bbox.x1 - word.bbox.x0,
            height: word.bbox.y1 - word.bbox.y0,
          });
        }
      }
    }
  }
  return tokens;
}

export class OcrClient {
  private worker: Tesseract.Worker | null = null;
  private disposed = false;
  private currentProgressHandler: ((event: OcrProgressEvent) => void) | null = null;

  private async ensureWorker(): Promise<Tesseract.Worker> {
    if (this.worker) return this.worker;
    try {
      this.worker = await Tesseract.createWorker('spa', Tesseract.OEM.LSTM_ONLY, {
        corePath: '/vendor/tesseract/core',
        workerPath: '/vendor/tesseract/worker.min.js',
        langPath: '/vendor/tesseract/lang',
        gzip: false,
        logger: (message) =>
          this.currentProgressHandler?.({ status: message.status, progress: message.progress }),
      });
    } catch {
      throw new OcrError(
        'worker_unavailable',
        'No fue posible iniciar el motor de OCR local en este navegador.',
      );
    }
    return this.worker;
  }

  async recognizePage(image: Blob, options: OcrRecognizeOptions = {}): Promise<OcrPageResult> {
    if (this.disposed) {
      throw new OcrError('worker_unavailable', 'El cliente de OCR ya fue liberado.');
    }
    await acquireSlot();
    try {
      const worker = await this.ensureWorker();
      return await this.runWithGuards(worker, image, options);
    } finally {
      releaseSlot();
    }
  }

  private async runWithGuards(
    worker: Tesseract.Worker,
    image: Blob,
    options: OcrRecognizeOptions,
  ): Promise<OcrPageResult> {
    const watchdogMs = options.watchdogMs ?? DEFAULT_WATCHDOG_MS;
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    let lastProgressAt = Date.now();
    let watchdogTimer: ReturnType<typeof setInterval> | undefined;
    let timeoutTimer: ReturnType<typeof setTimeout> | undefined;
    let abortListener: (() => void) | undefined;

    this.currentProgressHandler = (event) => {
      lastProgressAt = Date.now();
      options.onProgress?.(event);
    };

    const watchdog = new Promise<never>((_resolve, reject) => {
      watchdogTimer = setInterval(() => {
        if (Date.now() - lastProgressAt >= watchdogMs) {
          reject(new OcrError('stalled', 'El OCR no reportó avance en el tiempo esperado.'));
        }
      }, WATCHDOG_CHECK_INTERVAL_MS);
    });

    const timeout = new Promise<never>((_resolve, reject) => {
      timeoutTimer = setTimeout(() => {
        reject(new OcrError('timeout', 'El OCR superó el tiempo local permitido.'));
      }, timeoutMs);
    });

    const cancellation = new Promise<never>((_resolve, reject) => {
      if (!options.signal) return;
      if (options.signal.aborted) {
        reject(new OcrError('cancelled', 'El OCR fue cancelado.'));
        return;
      }
      abortListener = () => reject(new OcrError('cancelled', 'El OCR fue cancelado.'));
      options.signal.addEventListener('abort', abortListener, { once: true });
    });

    const recognition = worker
      .recognize(image, {}, { text: true, blocks: true })
      .then((result) => ({
        text: result.data.text,
        confidence: result.data.confidence,
        tokens: tokensFromPage(result.data),
      }));

    try {
      return await Promise.race([recognition, watchdog, timeout, cancellation]);
    } catch (error) {
      await this.terminate();
      if (error instanceof OcrError) throw error;
      throw new OcrError(
        'unknown',
        error instanceof Error ? error.message : 'Fallo desconocido del OCR local.',
      );
    } finally {
      this.currentProgressHandler = null;
      if (watchdogTimer) clearInterval(watchdogTimer);
      if (timeoutTimer) clearTimeout(timeoutTimer);
      if (abortListener) options.signal?.removeEventListener('abort', abortListener);
    }
  }

  async terminate(): Promise<void> {
    const worker = this.worker;
    this.worker = null;
    if (worker) await worker.terminate().catch(() => undefined);
  }

  async dispose(): Promise<void> {
    this.disposed = true;
    await this.terminate();
  }
}
