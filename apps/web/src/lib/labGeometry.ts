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
