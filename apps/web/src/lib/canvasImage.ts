import type { RawImageData } from '@nexus-tax/document-intelligence';

/**
 * Puente delgado hacia <canvas>: sin lógica propia que probar en Node (no hay
 * canvas real en el entorno de pruebas). Las transformaciones de píxeles son
 * las funciones puras de @nexus-tax/document-intelligence; verificar en el
 * navegador del usuario junto al resto del laboratorio de OCR.
 */

export function canvasToRawImage(canvas: HTMLCanvasElement): RawImageData {
  const context = canvas.getContext('2d');
  if (!context) throw new Error('No fue posible obtener el contexto 2D del canvas.');
  const { data, width, height } = context.getImageData(0, 0, canvas.width, canvas.height);
  return { data, width, height };
}

export function rawImageToCanvas(image: RawImageData): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('No fue posible obtener el contexto 2D del canvas.');
  context.putImageData(
    new ImageData(new Uint8ClampedArray(image.data), image.width, image.height),
    0,
    0,
  );
  return canvas;
}

export function rawImageToBlob(image: RawImageData, type = 'image/png'): Promise<Blob> {
  const canvas = rawImageToCanvas(image);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('No fue posible generar la imagen para OCR.'));
    }, type);
  });
}
