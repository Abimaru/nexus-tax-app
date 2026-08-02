import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type LoggerFn = (message: { status: string; progress: number }) => void;

const createWorkerMock = vi.fn();

vi.mock('tesseract.js', () => ({
  default: {
    createWorker: (...args: unknown[]) => createWorkerMock(...args),
    OEM: { LSTM_ONLY: 1 },
  },
}));

function fakePage(overrides: Partial<{ text: string; confidence: number }> = {}) {
  return {
    text: overrides.text ?? 'texto reconocido',
    confidence: overrides.confidence ?? 92,
    blocks: [
      {
        paragraphs: [
          {
            lines: [
              {
                words: [
                  {
                    text: 'palabra',
                    confidence: 90,
                    bbox: { x0: 10, y0: 20, x1: 60, y1: 40 },
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };
}

describe('OcrClient', () => {
  let logger: LoggerFn = () => undefined;
  let recognizeMock: ReturnType<typeof vi.fn>;
  let terminateMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    recognizeMock = vi.fn();
    terminateMock = vi.fn().mockResolvedValue(undefined);
    createWorkerMock.mockReset();
    createWorkerMock.mockImplementation(async (_langs, _oem, options) => {
      logger = options.logger;
      return { recognize: recognizeMock, terminate: terminateMock };
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetModules();
  });

  it('nunca configura Tesseract.js con un CDN: solo rutas locales same-origin', async () => {
    const { OcrClient } = await import('./ocrClient');
    recognizeMock.mockResolvedValue({ data: fakePage() });
    const client = new OcrClient();

    await client.recognizePage(new Blob());

    expect(createWorkerMock).toHaveBeenCalledTimes(1);
    const options = createWorkerMock.mock.calls[0]?.[2];
    for (const key of ['corePath', 'workerPath', 'langPath'] as const) {
      const value = options[key] as string;
      expect(value.startsWith('/vendor/tesseract/')).toBe(true);
      expect(value).not.toMatch(/^https?:\/\//);
      expect(value).not.toContain('cdn.jsdelivr.net');
      expect(value).not.toContain('unpkg.com');
    }
    expect(options.gzip).toBe(false);
  });

  it('reconoce una página y normaliza tokens con sus coordenadas', async () => {
    const { OcrClient } = await import('./ocrClient');
    recognizeMock.mockResolvedValue({ data: fakePage() });
    const client = new OcrClient();

    const result = await client.recognizePage(new Blob());

    expect(result.text).toBe('texto reconocido');
    expect(result.confidence).toBe(92);
    expect(result.tokens).toEqual([
      { text: 'palabra', confidence: 90, x: 10, y: 20, width: 50, height: 20 },
    ]);
  });

  it('lanza OcrError con code=timeout cuando el reconocimiento no termina a tiempo', async () => {
    const { OcrClient } = await import('./ocrClient');
    recognizeMock.mockImplementation(() => new Promise(() => undefined));
    const client = new OcrClient();

    const pending = client.recognizePage(new Blob(), { timeoutMs: 5_000, watchdogMs: 60_000 });
    const assertion = expect(pending).rejects.toMatchObject({ code: 'timeout' });
    await vi.advanceTimersByTimeAsync(5_001);
    await assertion;
    expect(terminateMock).toHaveBeenCalledTimes(1);
  });

  it('lanza OcrError con code=stalled cuando no hay avance dentro del watchdog', async () => {
    const { OcrClient } = await import('./ocrClient');
    recognizeMock.mockImplementation(() => new Promise(() => undefined));
    const client = new OcrClient();

    const pending = client.recognizePage(new Blob(), { timeoutMs: 60_000, watchdogMs: 5_000 });
    const assertion = expect(pending).rejects.toMatchObject({ code: 'stalled' });
    await vi.advanceTimersByTimeAsync(6_100);
    await assertion;
  });

  it('reinicia el watchdog cuando llegan eventos reales de progreso', async () => {
    const { OcrClient } = await import('./ocrClient');
    recognizeMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve({ data: fakePage() }), 8_000);
        }),
    );
    const client = new OcrClient();

    const pending = client.recognizePage(new Blob(), { timeoutMs: 60_000, watchdogMs: 5_000 });
    await vi.advanceTimersByTimeAsync(3_000);
    logger({ status: 'recognizing text', progress: 0.5 });
    await vi.advanceTimersByTimeAsync(3_000);
    logger({ status: 'recognizing text', progress: 0.9 });
    await vi.advanceTimersByTimeAsync(2_000);

    await expect(pending).resolves.toMatchObject({ text: 'texto reconocido' });
  });

  it('lanza OcrError con code=cancelled cuando se aborta la señal', async () => {
    const { OcrClient } = await import('./ocrClient');
    recognizeMock.mockImplementation(() => new Promise(() => undefined));
    const client = new OcrClient();
    const controller = new AbortController();

    const pending = client.recognizePage(new Blob(), { signal: controller.signal });
    const assertion = expect(pending).rejects.toMatchObject({ code: 'cancelled' });
    controller.abort();
    await assertion;
  });

  it('limita los trabajos concurrentes: el segundo espera a que termine el primero', async () => {
    const { OcrClient } = await import('./ocrClient');
    recognizeMock
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve({ data: fakePage() }), 10_000);
          }),
      )
      .mockImplementationOnce(async () => ({ data: fakePage({ text: 'segunda página' }) }));
    const client = new OcrClient();

    const first = client.recognizePage(new Blob());
    const second = client.recognizePage(new Blob());

    await vi.advanceTimersByTimeAsync(1_000);
    expect(recognizeMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(9_500);
    const [, secondResult] = await Promise.all([first, second]);
    expect(recognizeMock).toHaveBeenCalledTimes(2);
    expect(secondResult.text).toBe('segunda página');
  });
});
