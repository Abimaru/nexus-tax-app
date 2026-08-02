// Transforma coordenadas PDF (origen inferior-izquierdo, Y crece hacia
// arriba) al espacio de píxeles de la imagen renderizada (origen superior-
// izquierdo, Y crece hacia abajo), para dibujar el overlay SVG del
// laboratorio. Función pura, sin DOM, para poder probarla sin navegador.

export interface ImageRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function pdfBlockToImageRect(
  block: { x: number; y: number; width: number; height: number },
  pageHeightPdf: number,
  renderScale: number,
): ImageRect {
  return {
    x: block.x * renderScale,
    y: (pageHeightPdf - block.y - block.height) * renderScale,
    width: block.width * renderScale,
    height: block.height * renderScale,
  };
}

export function pdfPointToImagePoint(
  point: { x: number; y: number },
  pageHeightPdf: number,
  renderScale: number,
): { x: number; y: number } {
  return {
    x: point.x * renderScale,
    y: (pageHeightPdf - point.y) * renderScale,
  };
}

export function normalizeImageSelection(
  start: { x: number; y: number },
  end: { x: number; y: number },
  imageWidth: number,
  imageHeight: number,
): ImageRect {
  const clamp = (value: number, maximum: number) => Math.min(maximum, Math.max(0, value));
  const x1 = clamp(Math.min(start.x, end.x), imageWidth);
  const y1 = clamp(Math.min(start.y, end.y), imageHeight);
  const x2 = clamp(Math.max(start.x, end.x), imageWidth);
  const y2 = clamp(Math.max(start.y, end.y), imageHeight);
  return {
    x: imageWidth ? x1 / imageWidth : 0,
    y: imageHeight ? y1 / imageHeight : 0,
    width: imageWidth ? (x2 - x1) / imageWidth : 0,
    height: imageHeight ? (y2 - y1) / imageHeight : 0,
  };
}
