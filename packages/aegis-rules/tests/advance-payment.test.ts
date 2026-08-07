import { describe, expect, it } from 'vitest';
import {
  ADVANCE_PAYMENT_BRACKETS_2025,
  ADVANCE_PAYMENT_SOURCE_ID,
  computeAdvancePayment,
  getAdvancePaymentBracket,
} from '../src/colombia/individual-income-tax/2025/advance-payment';

describe('anticipo del impuesto de renta (art. 807 ET) — AG 2025', () => {
  it('declara tres tramos con tarifas 25 % / 50 % / 75 %', () => {
    expect(ADVANCE_PAYMENT_BRACKETS_2025).toHaveLength(3);
    expect(getAdvancePaymentBracket(1).rate).toBe(0.25);
    expect(getAdvancePaymentBracket(2).rate).toBe(0.5);
    expect(getAdvancePaymentBracket(3).rate).toBe(0.75);
    expect(ADVANCE_PAYMENT_SOURCE_ID).toBe('et-art-807');
  });

  it('primera declaración: 25 % sobre impuesto neto del año actual', () => {
    // Impuesto neto = 20M ; retenciones = 5M.
    // Bruto = 20M × 25 % = 5M. Neto = max(0, 5M − 5M) = 0.
    const result = computeAdvancePayment({
      taxYear: 2025,
      filingCountIncludingCurrent: 1,
      currentNetIncomeTaxCop: 20_000_000,
      withholdingsCop: 5_000_000,
    });
    expect(result.baseMethod).toBe('current_only');
    expect(result.baseCop).toBe(20_000_000);
    expect(result.grossAdvanceCop).toBe(5_000_000);
    expect(result.withholdingsAppliedCop).toBe(5_000_000);
    expect(result.netAdvanceCop).toBe(0);
    expect(result.ruleSourceId).toBe('et-art-807');
  });

  it('segunda declaración con historial: elige el mayor entre actual y promedio', () => {
    // Actual 30M, anterior 20M → promedio 25M < 30M actual.
    // Regla: base = max → 30M actual. Bruto = 30M × 50 % = 15M.
    const result = computeAdvancePayment({
      taxYear: 2025,
      filingCountIncludingCurrent: 2,
      currentNetIncomeTaxCop: 30_000_000,
      priorNetIncomeTaxCop: 20_000_000,
      withholdingsCop: 0,
    });
    expect(result.baseMethod).toBe('current_only');
    expect(result.baseCop).toBe(30_000_000);
    expect(result.grossAdvanceCop).toBe(15_000_000);
    expect(result.netAdvanceCop).toBe(15_000_000);
  });

  it('segunda declaración: promedio mayor gana', () => {
    // Actual 10M, anterior 30M → promedio 20M > 10M actual.
    // base = 20M. Bruto = 20M × 50 % = 10M.
    const result = computeAdvancePayment({
      taxYear: 2025,
      filingCountIncludingCurrent: 2,
      currentNetIncomeTaxCop: 10_000_000,
      priorNetIncomeTaxCop: 30_000_000,
      withholdingsCop: 0,
    });
    expect(result.baseMethod).toBe('average_of_two');
    expect(result.baseCop).toBe(20_000_000);
    expect(result.grossAdvanceCop).toBe(10_000_000);
  });

  it('tercera declaración: 75 % con promedio disponible', () => {
    // Actual 40M, anterior 20M → promedio 30M < 40M actual.
    // base = 40M. Bruto = 40M × 75 % = 30M.
    const result = computeAdvancePayment({
      taxYear: 2025,
      filingCountIncludingCurrent: 3,
      currentNetIncomeTaxCop: 40_000_000,
      priorNetIncomeTaxCop: 20_000_000,
      withholdingsCop: 10_000_000,
    });
    expect(result.bracket.rate).toBe(0.75);
    expect(result.baseCop).toBe(40_000_000);
    expect(result.grossAdvanceCop).toBe(30_000_000);
    expect(result.withholdingsAppliedCop).toBe(10_000_000);
    expect(result.netAdvanceCop).toBe(20_000_000);
  });

  it('sin impuesto neto: anticipo cero', () => {
    const result = computeAdvancePayment({
      taxYear: 2025,
      filingCountIncludingCurrent: 3,
      currentNetIncomeTaxCop: 0,
      priorNetIncomeTaxCop: 0,
      withholdingsCop: 0,
    });
    expect(result.grossAdvanceCop).toBe(0);
    expect(result.netAdvanceCop).toBe(0);
  });

  it('sin historial anterior en segunda declaración: usa solo el actual', () => {
    // Sin prior, aunque sea 2da declaración, no puede promediar.
    const result = computeAdvancePayment({
      taxYear: 2025,
      filingCountIncludingCurrent: 2,
      currentNetIncomeTaxCop: 20_000_000,
      priorNetIncomeTaxCop: null,
      withholdingsCop: 0,
    });
    expect(result.baseMethod).toBe('current_only');
    expect(result.baseCop).toBe(20_000_000);
    expect(result.grossAdvanceCop).toBe(10_000_000);
    expect(result.rationale).toMatch(/no se conoce/i);
  });

  it('las retenciones que exceden el bruto no generan crédito', () => {
    // Impuesto neto 8M, bruto 2M, retenciones 10M → neto anticipo = 0.
    const result = computeAdvancePayment({
      taxYear: 2025,
      filingCountIncludingCurrent: 1,
      currentNetIncomeTaxCop: 8_000_000,
      withholdingsCop: 10_000_000,
    });
    expect(result.grossAdvanceCop).toBe(2_000_000);
    expect(result.withholdingsAppliedCop).toBe(2_000_000);
    expect(result.netAdvanceCop).toBe(0);
  });

  it('trata valores negativos como cero', () => {
    const result = computeAdvancePayment({
      taxYear: 2025,
      filingCountIncludingCurrent: 1,
      currentNetIncomeTaxCop: -5_000_000,
      withholdingsCop: -1_000_000,
    });
    expect(result.baseCop).toBe(0);
    expect(result.grossAdvanceCop).toBe(0);
    expect(result.netAdvanceCop).toBe(0);
  });

  it('rechaza años no modelados', () => {
    expect(() =>
      computeAdvancePayment({
        taxYear: 2024,
        filingCountIncludingCurrent: 1,
        currentNetIncomeTaxCop: 10_000_000,
        withholdingsCop: 0,
      }),
    ).toThrow(/no modela/i);
  });
});
