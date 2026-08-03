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
    // desviaciones si alguien edita un ejemplo sin actualizar el resultado.
    const arithmeticExamples: Record<number, (inputs: Record<string, number>) => number> = {
      31: (i) => i.box29 - i.box30,
      34: (i) => i.box32 - i.box33,
      37: (i) => i.box35 + i.box36,
      40: (i) => i.box38 + i.box39,
      42: (i) => i.box34 - i.box41,
      61: (i) => i.box58 - i.box59 - i.box60,
      78: (i) => i.box74 - i.box75 - i.box76 - i.box77,
      101: (i) => i.box99 - i.box100,
      103: (i) => i.box101 - i.box102,
      115: (i) => i.box112 - i.box113 - i.box114,
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
