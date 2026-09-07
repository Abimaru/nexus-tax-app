import { describe, expect, it } from 'vitest';
import { evaluateNumericReconciliation } from '../src/numericReconciliation';

/**
 * Sprint 2.4, Fase F.3 — Unified Reconciliation & Coverage Hardening.
 *
 * Cubre la matriz de casos exigida en el prompt de Fase F.3 (§5/§20):
 * monto pequeño, monto grande, $1, $99, $101, 0.009%, 0.02%, 0.5%, 1%.
 * Ningún valor es real; todos son sintéticos.
 */
describe('evaluateNumericReconciliation — política numérica única (Fase F.3)', () => {
  it('exact: valores idénticos, incluso con centavos', () => {
    const result = evaluateNumericReconciliation({
      documentDecimalValue: 1_234_567,
      exogenousValue: 1_234_567,
    });
    expect(result.status).toBe('exact');
    expect(result.requiresHumanConfirmation).toBe(false);
  });

  it('rounding: el decimal con centavos redondea exactamente al entero exógeno ($1 tolerancia por defecto)', () => {
    const result = evaluateNumericReconciliation({
      documentDecimalValue: 3_241_486.57,
      documentRoundedValue: 3_241_487,
      exogenousValue: 3_241_487,
    });
    expect(result.status).toBe('rounding');
    expect(result.requiresHumanConfirmation).toBe(true);
  });

  it('rounding: diferencia de $1 sin centavos también es tolerancia de redondeo', () => {
    const result = evaluateNumericReconciliation({
      documentDecimalValue: 10_000,
      exogenousValue: 10_001,
    });
    expect(result.status).toBe('rounding');
  });

  it('rounding: tolerancia ampliada a $5 para conciliación de topes/consolidados', () => {
    for (const difference of [1, 5]) {
      const result = evaluateNumericReconciliation({
        documentDecimalValue: 10_000,
        exogenousValue: 10_000 + difference,
        roundingToleranceCop: 5,
      });
      expect(result.status).toBe('rounding');
      expect(result.requiresHumanConfirmation).toBe(true);
    }
  });

  it('minor: monto pequeño con diferencia absoluta y porcentual dentro de umbral ($99 en base $1.000.000 ≈ 0.0099%)', () => {
    const result = evaluateNumericReconciliation({
      documentDecimalValue: 1_000_000 - 99,
      exogenousValue: 1_000_000,
    });
    expect(result.status).toBe('minor');
    expect(result.differenceAbsolute).toBe(99);
    expect(result.differencePercentage).toBeLessThan(0.01);
  });

  it('relevant: $101 de diferencia en un monto GRANDE nunca es "minor" solo porque el porcentaje es diminuto', () => {
    // 101 / 10.000.000 = 0.00101 % — un porcentaje minúsculo, pero el
    // límite absoluto de $100 sigue aplicando (§5: nunca "menor" solo por
    // porcentaje relativo cuando el monto es grande).
    const result = evaluateNumericReconciliation({
      documentDecimalValue: 10_000_000 - 101,
      exogenousValue: 10_000_000,
    });
    expect(result.status).toBe('relevant');
    expect(result.differenceAbsolute).toBe(101);
    expect(result.differencePercentage).toBeLessThan(0.01);
  });

  it('minor: 0.009% de diferencia con absoluto también dentro de umbral', () => {
    const exogenousValue = 1_000_000;
    const difference = Math.round(exogenousValue * 0.00009); // 0.009%
    const result = evaluateNumericReconciliation({
      documentDecimalValue: exogenousValue - difference,
      exogenousValue,
    });
    expect(result.status).toBe('minor');
  });

  it('relevant: 0.02% de diferencia supera el umbral relativo (0.01%)', () => {
    const exogenousValue = 1_000_000;
    const difference = Math.round(exogenousValue * 0.0002); // 0.02%
    const result = evaluateNumericReconciliation({
      documentDecimalValue: exogenousValue - difference,
      exogenousValue,
    });
    expect(result.status).toBe('relevant');
  });

  it('relevant: 0.5% de diferencia en monto pequeño no es "minor" (el porcentaje domina, no basta con ser absolutamente pequeño)', () => {
    const exogenousValue = 10_000;
    const difference = Math.round(exogenousValue * 0.005); // 0.5% = $50
    const result = evaluateNumericReconciliation({
      documentDecimalValue: exogenousValue - difference,
      exogenousValue,
    });
    expect(result.status).toBe('relevant');
  });

  it('relevant: 1% de diferencia tampoco califica como "minor"', () => {
    const exogenousValue = 10_000;
    const difference = Math.round(exogenousValue * 0.01); // 1% = $100
    const result = evaluateNumericReconciliation({
      documentDecimalValue: exogenousValue - difference,
      exogenousValue,
    });
    expect(result.status).toBe('relevant');
  });

  it('nunca se autoconfirma silenciosamente: rounding/minor/relevant siempre exigen confirmación humana', () => {
    const rounding = evaluateNumericReconciliation({
      documentDecimalValue: 10_000,
      exogenousValue: 10_001,
    });
    const minor = evaluateNumericReconciliation({
      documentDecimalValue: 1_000_000 - 50,
      exogenousValue: 1_000_000,
    });
    const relevant = evaluateNumericReconciliation({
      documentDecimalValue: 10_000,
      exogenousValue: 20_000,
    });
    expect(rounding.requiresHumanConfirmation).toBe(true);
    expect(minor.requiresHumanConfirmation).toBe(true);
    expect(relevant.requiresHumanConfirmation).toBe(true);
  });

  it('conserva el policyVersion para trazabilidad', () => {
    const result = evaluateNumericReconciliation({
      documentDecimalValue: 100,
      exogenousValue: 100,
    });
    expect(result.policyVersion).toMatch(/^co\.reconciliation\.numeric\./);
  });
});
