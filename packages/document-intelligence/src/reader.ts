import type { DocumentRepresentation, PdfReadOptions } from './contracts';
import { DEFAULT_PDF_LIMITS } from './contracts';
import { normalizeDocumentText } from './normalize';

export type PdfReadErrorCode =
  | 'password_required'
  | 'incorrect_password'
  | 'no_text'
  | 'invalid_pdf'
  | 'limit_exceeded'
  | 'timeout'
  | 'cancelled';

export class PdfReadError extends Error {
  constructor(
    public readonly code: PdfReadErrorCode,
    message: string,
    public readonly page: number | null = null,
  ) {
    super(message);
    this.name = 'PdfReadError';
  }
}

export async function readPdfText(
  source: ArrayBuffer | Uint8Array,
  options: PdfReadOptions = {},
): Promise<DocumentRepresentation> {
  const limits = { ...DEFAULT_PDF_LIMITS, ...options.limits };
  const data = source instanceof Uint8Array ? source.slice() : new Uint8Array(source.slice(0));
  if (data.byteLength > limits.maxBytes) {
    throw new PdfReadError(
      'limit_exceeded',
      'El PDF supera el tamaño permitido para lectura local.',
    );
  }
  if (options.signal?.aborted) throw cancelled();

  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  if (options.workerSrc) pdfjs.GlobalWorkerOptions.workerSrc = options.workerSrc;
  const loadingTask = pdfjs.getDocument({
    data,
    password: options.password,
    useWorkerFetch: false,
    isEvalSupported: false,
    stopAtErrors: false,
  });
  let passwordFailure: ((error: PdfReadError) => void) | undefined;
  const passwordPromise = new Promise<never>((_resolve, reject) => {
    passwordFailure = reject;
  });
  loadingTask.onPassword = (_updatePassword: (password: string) => void, reason: number) => {
    passwordFailure?.(passwordErrorForReason(reason));
  };
  loadingTask.onProgress = ({ loaded, total }: { loaded: number; total: number }) => {
    options.onProgress?.({
      phase: 'reading',
      completed: loaded,
      total: total || data.byteLength,
      message: 'Leyendo el PDF localmente…',
    });
  };

  const abortPromise = new Promise<never>((_resolve, reject) => {
    options.signal?.addEventListener('abort', () => reject(cancelled()), { once: true });
  });
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timeoutId = globalThis.setTimeout(
      () => reject(new PdfReadError('timeout', 'La lectura superó el tiempo local permitido.')),
      limits.timeoutMs,
    );
  });

  try {
    const pdf = await Promise.race([
      loadingTask.promise,
      passwordPromise,
      abortPromise,
      timeoutPromise,
    ]);
    if (pdf.numPages > limits.maxPages) {
      throw new PdfReadError('limit_exceeded', 'El PDF supera el número de páginas permitido.');
    }
    const pageCount = pdf.numPages;
    const pages: DocumentRepresentation['pages'] = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      if (options.signal?.aborted) throw cancelled();
      try {
        const page = await pdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 1 });
        const content = await page.getTextContent();
        const blocks = content.items.flatMap((item) => {
          if (!('str' in item) || !item.str.trim()) return [];
          return [
            {
              text: normalizeDocumentText(item.str),
              x: item.transform[4],
              y: item.transform[5],
              width: item.width,
              height: item.height,
            },
          ];
        });
        const normalizedText = normalizeDocumentText(blocks.map((block) => block.text).join('\n'));
        pages.push({
          pageNumber,
          normalizedText,
          blocks,
          width: viewport.width,
          height: viewport.height,
          errors: [],
          readConfidence:
            normalizedText.length >= 20 ? 'high' : normalizedText ? 'low' : 'insufficient',
        });
        page.cleanup();
      } catch {
        pages.push({
          pageNumber,
          normalizedText: '',
          blocks: [],
          errors: ['No fue posible leer esta página.'],
          readConfidence: 'insufficient',
        });
      }
      options.onProgress?.({
        phase: 'reading',
        completed: pageNumber,
        total: pdf.numPages,
        message: `Leyendo página ${pageNumber} de ${pdf.numPages}…`,
      });
    }
    const metadataResult = await pdf.getMetadata().catch(() => null);
    const info = metadataResult?.info as Record<string, unknown> | undefined;
    await pdf.destroy();
    if (!pages.some((page) => page.normalizedText)) {
      throw new PdfReadError(
        'no_text',
        'El PDF no contiene texto seleccionable. Puedes registrar los valores manualmente o dejarlo pendiente para OCR futuro.',
      );
    }
    return {
      pageCount,
      pages,
      metadata: {
        title: typeof info?.Title === 'string' ? info.Title : undefined,
        author: typeof info?.Author === 'string' ? info.Author : undefined,
        subject: typeof info?.Subject === 'string' ? info.Subject : undefined,
      },
      encrypted: Boolean(options.password),
      warnings: pages.flatMap((page) => page.errors),
    };
  } catch (error) {
    await loadingTask.destroy().catch(() => undefined);
    if (error instanceof PdfReadError) throw error;
    const name = error instanceof Error ? error.name : '';
    if (name === 'PasswordException') {
      throw new PdfReadError(
        options.password ? 'incorrect_password' : 'password_required',
        options.password
          ? 'La contraseña no permitió abrir el PDF.'
          : 'El PDF requiere una contraseña para continuar.',
      );
    }
    throw new PdfReadError('invalid_pdf', 'El archivo no pudo leerse como PDF de texto.');
  } finally {
    if (timeoutId) globalThis.clearTimeout(timeoutId);
  }
}

function cancelled() {
  return new PdfReadError('cancelled', 'La lectura fue cancelada.');
}

export function passwordErrorForReason(reason: number): PdfReadError {
  return reason === 1
    ? new PdfReadError('password_required', 'El PDF requiere una contraseña para continuar.')
    : new PdfReadError('incorrect_password', 'La contraseña no permitió abrir el PDF.');
}
