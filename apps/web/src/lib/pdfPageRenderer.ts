import type * as PdfJsApi from 'pdfjs-dist/legacy/build/pdf.mjs';
import type { RawImageData } from '@nexus-tax/document-intelligence';
import { canvasToRawImage } from './canvasImage';

/**
 * Renderiza una página de PDF a píxeles para OCR/preprocesamiento. Vive en
 * apps/web (no en el paquete puro) porque requiere <canvas>: document-
 * intelligence solo extrae texto, nunca pinta la página.
 */

export interface RenderPdfPageOptions {
  password?: string;
  scale?: number;
  signal?: AbortSignal;
}

// Suficiente resolución para OCR sin duplicar el costo de memoria de escalas
// mayores; ver docs/PROJECT_HANDOFF.md (riesgos de memoria del OCR local).
const DEFAULT_SCALE = 2;

export class PdfRenderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PdfRenderError';
  }
}

export async function renderPdfPage(
  bytes: ArrayBuffer | Uint8Array,
  pageNumber: number,
  options: RenderPdfPageOptions = {},
): Promise<RawImageData> {
  if (options.signal?.aborted) throw new PdfRenderError('El renderizado fue cancelado.');
  const moduleUrl = '/vendor/pdfjs/pdf.mjs';
  const pdfjs = (await import(/* webpackIgnore: true */ moduleUrl)) as typeof PdfJsApi;
  pdfjs.GlobalWorkerOptions.workerSrc = '/vendor/pdfjs/pdf.worker.mjs';
  const data =
    bytes instanceof Uint8Array ? bytes.slice() : new Uint8Array(bytes.slice(0));
  const loadingTask = pdfjs.getDocument({
    data,
    password: options.password,
    useWorkerFetch: false,
    isEvalSupported: false,
    stopAtErrors: false,
  });
  const pdf = await loadingTask.promise;
  try {
    if (pageNumber < 1 || pageNumber > pdf.numPages) {
      throw new PdfRenderError(`La página ${pageNumber} no existe en este documento.`);
    }
    const page = await pdf.getPage(pageNumber);
    try {
      const viewport = page.getViewport({ scale: options.scale ?? DEFAULT_SCALE });
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.ceil(viewport.width));
      canvas.height = Math.max(1, Math.ceil(viewport.height));
      const context = canvas.getContext('2d');
      if (!context) throw new PdfRenderError('No fue posible crear el contexto de renderizado.');
      const renderTask = page.render({ canvasContext: context, canvas, viewport });
      const cancelOnAbort = () => renderTask.cancel();
      options.signal?.addEventListener('abort', cancelOnAbort, { once: true });
      try {
        await renderTask.promise;
      } catch (error) {
        if (options.signal?.aborted) throw new PdfRenderError('El renderizado fue cancelado.');
        throw error;
      } finally {
        options.signal?.removeEventListener('abort', cancelOnAbort);
      }
      return canvasToRawImage(canvas);
    } finally {
      page.cleanup();
    }
  } finally {
    await pdf.destroy();
  }
}
