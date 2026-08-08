import { describe, expect, it } from 'vitest';
import {
  CEDULAR_SUM_TOLERANCE_COP,
  CROSS_VALIDATIONS_PATRIMONY_SOURCE_ID,
  PATRIMONY_TO_INCOME_RATIO_ALERT,
  WITHHOLDING_TO_TAX_RATIO_ALERT,
  evaluateCrossValidations,
} from '../src/colombia/individual-income-tax/2025/cross-validations';

function baseInput() {
  return {
    taxYear: 2025 as const,
    incomeTaxCop: 10_000_000,
    withholdingsAppliedCop: 5_000_000,
    grossPatrimonyCop: 50_000_000,
    totalGrossIncomeCop: 100_000_000,
    reportedCedularTaxableIncomeCop: 80_000_000,
    computedCedularTaxableIncomeCop: 80_000_000,
  };
}

describe('validaciones cruzadas del F-210 AG 2025', () => {
  it('declara constantes y fuente', () => {
    expect(WITHHOLDING_TO_TAX_RATIO_ALERT).toBe(2);
    expect(PATRIMONY_TO_INCOME_RATIO_ALERT).toBe(10);
    expect(CEDULAR_SUM_TOLERANCE_COP).toBe(1);
    expect(CROSS_VALIDATIONS_PATRIMONY_SOURCE_ID).toBe('et-art-236');
  });

  describe('withholdings_exceed_income_tax', () => {
    it('no dispara cuando la razón está bajo umbral', () => {
      const result = evaluateCrossValidations(baseInput());
      expect(result.withholdingsExceedIncomeTax.triggered).toBe(false);
      expect(result.withholdingsExceedIncomeTax.ratio).toBeCloseTo(0.5, 6);
    });

    it('dispara cuando las retenciones son ≥ 2× el impuesto', () => {
      const result = evaluateCrossValidations({
        ...baseInput(),
        incomeTaxCop: 5_000_000,
        withholdingsAppliedCop: 12_000_000,
      });
      expect(result.withholdingsExceedIncomeTax.triggered).toBe(true);
      expect(result.withholdingsExceedIncomeTax.ratio).toBeCloseTo(2.4, 3);
      expect(result.withholdingsExceedIncomeTax.message).toMatch(/subestim|Revisa/i);
    });

    it('no evaluable cuando el impuesto de renta es cero', () => {
      const result = evaluateCrossValidations({
        ...baseInput(),
        incomeTaxCop: 0,
        withholdingsAppliedCop: 5_000_000,
      });
      expect(result.withholdingsExceedIncomeTax.triggered).toBe(false);
      expect(result.withholdingsExceedIncomeTax.message).toMatch(/no es evaluable/);
    });
  });

  describe('patrimony_income_disproportion', () => {
    it('no dispara con razón normal', () => {
      const result = evaluateCrossValidations(baseInput());
      expect(result.patrimonyIncomeDisproportion.triggered).toBe(false);
      expect(result.patrimonyIncomeDisproportion.ratio).toBeCloseTo(0.5, 6);
    });

    it('dispara cuando patrimonio ≥ 10× ingresos', () => {
      const result = evaluateCrossValidations({
        ...baseInput(),
        grossPatrimonyCop: 1_200_000_000,
        totalGrossIncomeCop: 100_000_000,
      });
      expect(result.patrimonyIncomeDisproportion.triggered).toBe(true);
      expect(result.patrimonyIncomeDisproportion.ratio).toBeCloseTo(12, 3);
      expect(result.patrimonyIncomeDisproportion.ruleSourceId).toBe('et-art-236');
      expect(result.patrimonyIncomeDisproportion.message).toMatch(/art\. 236/);
    });

    it('no evaluable cuando falta patrimonio o ingresos', () => {
      const noPat = evaluateCrossValidations({
        ...baseInput(),
        grossPatrimonyCop: 0,
      });
      expect(noPat.patrimonyIncomeDisproportion.triggered).toBe(false);
      const noIncome = evaluateCrossValidations({
        ...baseInput(),
        totalGrossIncomeCop: 0,
      });
      expect(noIncome.patrimonyIncomeDisproportion.triggered).toBe(false);
    });
  });

  describe('cedular_sum_mismatch', () => {
    it('no dispara cuando la suma coincide', () => {
      const result = evaluateCrossValidations(baseInput());
      expect(result.cedularSumMismatch.triggered).toBe(false);
      expect(result.cedularSumMismatch.differenceCop).toBe(0);
    });

    it('dispara cuando la diferencia excede la tolerancia', () => {
      const result = evaluateCrossValidations({
        ...baseInput(),
        reportedCedularTaxableIncomeCop: 80_000_000,
        computedCedularTaxableIncomeCop: 79_500_000,
      });
      expect(result.cedularSumMismatch.triggered).toBe(true);
      expect(result.cedularSumMismatch.differenceCop).toBe(500_000);
    });

    it('tolera diferencias de redondeo de un peso', () => {
      const result = evaluateCrossValidations({
        ...baseInput(),
        reportedCedularTaxableIncomeCop: 80_000_001,
        computedCedularTaxableIncomeCop: 80_000_000,
      });
      expect(result.cedularSumMismatch.triggered).toBe(false);
    });
  });

  it('rechaza años no modelados', () => {
    expect(() =>
      evaluateCrossValidations({ ...baseInput(), taxYear: 2024 as unknown as 2025 }),
    ).toThrow(/no modela/i);
  });
});
