import { describe, expect, it } from 'vitest';
import {
  adjustContrast,
  binarize,
  cropMargins,
  denoise,
  rotateQuarterTurns,
  scale,
  toGrayscale,
  type RawImageData,
} from '../src';

function image(width: number, height: number, pixels: readonly (readonly [number, number, number, number])[]): RawImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  pixels.forEach(([r, g, b, a], index) => {
    data.set([r, g, b, a], index * 4);
  });
  return { width, height, data };
}

function pixelAt(img: RawImageData, x: number, y: number): number[] {
  const index = (y * img.width + x) * 4;
  return Array.from(img.data.slice(index, index + 4));
}

describe('preprocesamiento de imagen (puro)', () => {
  it('convierte a escala de grises preservando blanco, negro y alfa', () => {
    const source = image(2, 1, [
      [255, 255, 255, 255],
      [0, 0, 0, 128],
    ]);
    const gray = toGrayscale(source);
    expect(pixelAt(gray, 0, 0)).toEqual([255, 255, 255, 255]);
    expect(pixelAt(gray, 1, 0)).toEqual([0, 0, 0, 128]);
  });

  it('no modifica la imagen original (inmutabilidad)', () => {
    const source = image(1, 1, [[10, 20, 30, 255]]);
    toGrayscale(source);
    expect(pixelAt(source, 0, 0)).toEqual([10, 20, 30, 255]);
  });

  it('ajusta el contraste dejando el gris medio (128) sin cambios', () => {
    const source = image(1, 1, [[128, 128, 128, 255]]);
    const result = adjustContrast(source, 2);
    expect(pixelAt(result, 0, 0)).toEqual([128, 128, 128, 255]);
  });

  it('binariza según el umbral de luminancia', () => {
    const source = image(2, 1, [
      [255, 255, 255, 255],
      [0, 0, 0, 255],
    ]);
    const result = binarize(source, 128);
    expect(pixelAt(result, 0, 0)).toEqual([255, 255, 255, 255]);
    expect(pixelAt(result, 1, 0)).toEqual([0, 0, 0, 255]);
  });

  it('escala una imagen manteniendo el color más cercano', () => {
    const source = image(1, 1, [[9, 8, 7, 255]]);
    const result = scale(source, 2);
    expect(result.width).toBe(2);
    expect(result.height).toBe(2);
    expect(pixelAt(result, 0, 0)).toEqual([9, 8, 7, 255]);
    expect(pixelAt(result, 1, 1)).toEqual([9, 8, 7, 255]);
  });

  it('rota 90 grados en sentido horario reubicando las cuatro esquinas', () => {
    const source = image(2, 2, [
      [255, 0, 0, 255], // superior-izquierda: rojo
      [0, 255, 0, 255], // superior-derecha: verde
      [0, 0, 255, 255], // inferior-izquierda: azul
      [255, 255, 0, 255], // inferior-derecha: amarillo
    ]);
    const rotated = rotateQuarterTurns(source, 1);
    expect(pixelAt(rotated, 0, 0)).toEqual([0, 0, 255, 255]); // azul (era inferior-izquierda)
    expect(pixelAt(rotated, 1, 0)).toEqual([255, 0, 0, 255]); // rojo (era superior-izquierda)
    expect(pixelAt(rotated, 0, 1)).toEqual([255, 255, 0, 255]); // amarillo (era inferior-derecha)
    expect(pixelAt(rotated, 1, 1)).toEqual([0, 255, 0, 255]); // verde (era superior-derecha)
  });

  it('rotar cuatro veces devuelve la imagen original', () => {
    const source = image(2, 1, [
      [1, 2, 3, 255],
      [4, 5, 6, 255],
    ]);
    const result = rotateQuarterTurns(source, 4);
    expect(Array.from(result.data)).toEqual(Array.from(source.data));
    expect(result.width).toBe(source.width);
    expect(result.height).toBe(source.height);
  });

  it('recorta márgenes conservando solo el centro', () => {
    const source = image(
      3,
      3,
      Array.from({ length: 9 }, (_, index) => [index, index, index, 255] as const),
    );
    const cropped = cropMargins(source, { top: 1, right: 1, bottom: 1, left: 1 });
    expect(cropped.width).toBe(1);
    expect(cropped.height).toBe(1);
    expect(pixelAt(cropped, 0, 0)).toEqual([4, 4, 4, 255]);
  });

  it('rechaza márgenes que exceden las dimensiones de la imagen', () => {
    const source = image(2, 2, Array.from({ length: 4 }, () => [0, 0, 0, 255] as const));
    expect(() => cropMargins(source, { top: 2, right: 0, bottom: 2, left: 0 })).toThrow();
  });

  it('elimina un píxel aislado con el filtro de mediana sin tocar los bordes', () => {
    const pixels = Array.from({ length: 9 }, () => [100, 100, 100, 255] as const);
    const source = image(3, 3, pixels);
    source.data.set([250, 250, 250, 255], (1 * 3 + 1) * 4);
    source.data.set([7, 8, 9, 255], 0);
    const result = denoise(source);
    expect(pixelAt(result, 1, 1)).toEqual([100, 100, 100, 255]);
    expect(pixelAt(result, 0, 0)).toEqual([7, 8, 9, 255]);
  });
});
