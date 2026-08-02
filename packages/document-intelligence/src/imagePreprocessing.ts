// Transformaciones puras de píxeles para el preprocesamiento opcional de OCR.
// Operan sobre un arreglo RGBA plano (misma forma que ImageData del navegador)
// sin tocar <canvas> ni ninguna API del DOM: la conversión hacia/desde un
// <canvas> real vive en apps/web. Todas las funciones devuelven una copia
// nueva; el original nunca se modifica.

export interface RawImageData {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

export interface CropMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

function emptyLike(width: number, height: number): RawImageData {
  return { width, height, data: new Uint8ClampedArray(width * height * 4) };
}

function luminance(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

export function toGrayscale(image: RawImageData): RawImageData {
  const output = emptyLike(image.width, image.height);
  for (let i = 0; i < image.data.length; i += 4) {
    const gray = luminance(image.data[i]!, image.data[i + 1]!, image.data[i + 2]!);
    output.data[i] = gray;
    output.data[i + 1] = gray;
    output.data[i + 2] = gray;
    output.data[i + 3] = image.data[i + 3]!;
  }
  return output;
}

export function adjustContrast(image: RawImageData, factor: number): RawImageData {
  const output = emptyLike(image.width, image.height);
  for (let i = 0; i < image.data.length; i += 4) {
    output.data[i] = (image.data[i]! - 128) * factor + 128;
    output.data[i + 1] = (image.data[i + 1]! - 128) * factor + 128;
    output.data[i + 2] = (image.data[i + 2]! - 128) * factor + 128;
    output.data[i + 3] = image.data[i + 3]!;
  }
  return output;
}

export function binarize(image: RawImageData, threshold: number): RawImageData {
  const output = emptyLike(image.width, image.height);
  for (let i = 0; i < image.data.length; i += 4) {
    const value = luminance(image.data[i]!, image.data[i + 1]!, image.data[i + 2]!) >= threshold ? 255 : 0;
    output.data[i] = value;
    output.data[i + 1] = value;
    output.data[i + 2] = value;
    output.data[i + 3] = image.data[i + 3]!;
  }
  return output;
}

export function scale(image: RawImageData, factor: number): RawImageData {
  if (factor <= 0) throw new Error('El factor de escala debe ser mayor que cero.');
  const width = Math.max(1, Math.round(image.width * factor));
  const height = Math.max(1, Math.round(image.height * factor));
  const output = emptyLike(width, height);
  for (let y = 0; y < height; y += 1) {
    const sourceY = Math.min(image.height - 1, Math.floor(y / factor));
    for (let x = 0; x < width; x += 1) {
      const sourceX = Math.min(image.width - 1, Math.floor(x / factor));
      const sourceIndex = (sourceY * image.width + sourceX) * 4;
      const targetIndex = (y * width + x) * 4;
      output.data[targetIndex] = image.data[sourceIndex]!;
      output.data[targetIndex + 1] = image.data[sourceIndex + 1]!;
      output.data[targetIndex + 2] = image.data[sourceIndex + 2]!;
      output.data[targetIndex + 3] = image.data[sourceIndex + 3]!;
    }
  }
  return output;
}

function rotate90Clockwise(image: RawImageData): RawImageData {
  const output = emptyLike(image.height, image.width);
  for (let r = 0; r < output.height; r += 1) {
    for (let c = 0; c < output.width; c += 1) {
      const sourceX = r;
      const sourceY = image.height - 1 - c;
      const sourceIndex = (sourceY * image.width + sourceX) * 4;
      const targetIndex = (r * output.width + c) * 4;
      output.data[targetIndex] = image.data[sourceIndex]!;
      output.data[targetIndex + 1] = image.data[sourceIndex + 1]!;
      output.data[targetIndex + 2] = image.data[sourceIndex + 2]!;
      output.data[targetIndex + 3] = image.data[sourceIndex + 3]!;
    }
  }
  return output;
}

// Corrección manual de orientación en múltiplos de 90°, seleccionada por el
// analista. La detección automática de orientación requeriría el motor
// Tesseract "legacy" (osd) y queda fuera de alcance de este cambio.
export function rotateQuarterTurns(image: RawImageData, quarterTurns: number): RawImageData {
  const turns = ((quarterTurns % 4) + 4) % 4;
  let result = image;
  for (let i = 0; i < turns; i += 1) {
    result = rotate90Clockwise(result);
  }
  return result;
}

export function cropMargins(image: RawImageData, margins: CropMargins): RawImageData {
  const width = image.width - margins.left - margins.right;
  const height = image.height - margins.top - margins.bottom;
  if (width <= 0 || height <= 0) {
    throw new Error('Los márgenes de recorte exceden las dimensiones de la imagen.');
  }
  const output = emptyLike(width, height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const sourceIndex = ((y + margins.top) * image.width + (x + margins.left)) * 4;
      const targetIndex = (y * width + x) * 4;
      output.data[targetIndex] = image.data[sourceIndex]!;
      output.data[targetIndex + 1] = image.data[sourceIndex + 1]!;
      output.data[targetIndex + 2] = image.data[sourceIndex + 2]!;
      output.data[targetIndex + 3] = image.data[sourceIndex + 3]!;
    }
  }
  return output;
}

function medianOf9(values: number[]): number {
  return [...values].sort((a, b) => a - b)[4]!;
}

// Filtro de mediana 3x3 por canal; simple y determinista, no elimina ruido
// estructurado (rayas, moaré). Los bordes se conservan sin filtrar.
export function denoise(image: RawImageData): RawImageData {
  const output = emptyLike(image.width, image.height);
  output.data.set(image.data);
  for (let y = 1; y < image.height - 1; y += 1) {
    for (let x = 1; x < image.width - 1; x += 1) {
      const targetIndex = (y * image.width + x) * 4;
      for (let channel = 0; channel < 3; channel += 1) {
        const neighbours: number[] = [];
        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            const neighbourIndex = ((y + dy) * image.width + (x + dx)) * 4 + channel;
            neighbours.push(image.data[neighbourIndex]!);
          }
        }
        output.data[targetIndex + channel] = medianOf9(neighbours);
      }
      output.data[targetIndex + 3] = image.data[targetIndex + 3]!;
    }
  }
  return output;
}
