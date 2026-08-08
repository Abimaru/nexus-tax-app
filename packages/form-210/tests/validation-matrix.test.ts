import { describe, expect, it } from 'vitest';
import {
  FORM_210_BOXES_2025,
  FORM_210_VALIDATION_MATRIX_2025,
  getBoxValidation,
  summarizeValidationStatus,
} from '../src';

describe('matriz de validación normativa del Formulario 210 (AG 2025)', () => {
  it('cubre exactamente el mismo conjunto de casillas que el ruleset', () => {
    const ruleset = new Set(FORM_210_BOXES_2025.map((box) => box.number));
    const matrix = new Set(FORM_210_VALIDATION_MATRIX_2025.map((entry) => entry.boxNumber));
    expect(matrix).toEqual(ruleset);
  });

  it('cada fila referencia al menos una fuente oficial', () => {
    for (const entry of FORM_210_VALIDATION_MATRIX_2025) {
      expect(entry.legalBasisSourceIds.length).toBeGreaterThan(0);
    }
  });

  it('cada fila `verified` tiene al menos un ejemplo determinista', () => {
    for (const entry of FORM_210_VALIDATION_MATRIX_2025) {
      if (entry.implementationStatus !== 'verified') continue;
      expect(entry.examples.length).toBeGreaterThan(0);
    }
  });

  it('los ejemplos de casillas `verified` aritméticas son consistentes con sus fórmulas', () => {
    // Reproduce las operaciones declaradas por número de casilla, para atrapar
    // desviaciones si alguien edita un ejemplo sin actualizar el resultado. El
    // helper trata las claves ausentes como 0 para respetar
    // `noUncheckedIndexedAccess` sin duplicar guardas en cada expresión.
    const get = (inputs: Record<string, number>, key: string): number => inputs[key] ?? 0;
    const arithmeticExamples: Record<number, (inputs: Record<string, number>) => number> = {
      31: (i) => get(i, 'box29') - get(i, 'box30'),
      34: (i) => get(i, 'box32') - get(i, 'box33'),
      37: (i) => get(i, 'box35') + get(i, 'box36'),
      40: (i) => get(i, 'box38') + get(i, 'box39'),
      42: (i) => get(i, 'box34') - get(i, 'box41'),
      61: (i) => get(i, 'box58') - get(i, 'box59') - get(i, 'box60'),
      78: (i) => get(i, 'box74') - get(i, 'box75') - get(i, 'box76') - get(i, 'box77'),
      101: (i) => get(i, 'box99') - get(i, 'box100'),
      103: (i) => get(i, 'box101') - get(i, 'box102'),
      115: (i) => get(i, 'box112') - get(i, 'box113') - get(i, 'box114'),
    };
    for (const [boxNumber, compute] of Object.entries(arithmeticExamples)) {
      const entry = getBoxValidation(Number(boxNumber));
      for (const example of entry.examples) {
        expect(compute(example.inputs)).toBe(example.expected);
      }
    }
  });

  it('el resumen por estado incluye todas las categorías y suma el total', () => {
    const summary = summarizeValidationStatus();
    const total =
      summary.verified +
      summary.implemented_unverified +
      summary.requires_review +
      summary.not_implemented;
    expect(total).toBe(FORM_210_VALIDATION_MATRIX_2025.length);
    // Estado inicial documentado del sprint 2.3.1:
    expect(summary.verified).toBeGreaterThan(0);
    expect(summary.not_implemented).toBeGreaterThan(0);
  });
});
