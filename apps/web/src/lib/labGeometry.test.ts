import { describe, expect, it } from 'vitest';
import { pdfBlockToImageRect, pdfPointToImagePoint } from './labGeometry';

describe('labGeometry', () => {
  it('convierte un bloque PDF (Y hacia arriba) a un rectángulo de imagen (Y hacia abajo)', () => {
    const rect = pdfBlockToImageRect({ x: 10, y: 20, width: 30, height: 5 }, 100, 2);
    expect(rect).toEqual({ x: 20, y: 150, width: 60, height: 10 });
  });

  it('no transforma nada cuando la escala es 1 y el bloque toca el borde superior', () => {
    const rect = pdfBlockToImageRect({ x: 0, y: 90, width: 10, height: 10 }, 100, 1);
    expect(rect).toEqual({ x: 0, y: 0, width: 10, height: 10 });
  });

  it('un bloque en la esquina inferior izquierda queda en la esquina inferior de la imagen', () => {
    const rect = pdfBlockToImageRect({ x: 0, y: 0, width: 10, height: 10 }, 100, 1);
    expect(rect).toEqual({ x: 0, y: 90, width: 10, height: 10 });
  });

  it('convierte un punto PDF a coordenadas de imagen respetando la escala', () => {
    expect(pdfPointToImagePoint({ x: 10, y: 90 }, 100, 1)).toEqual({ x: 10, y: 10 });
    expect(pdfPointToImagePoint({ x: 10, y: 90 }, 100, 2)).toEqual({ x: 20, y: 20 });
  });
});
