import { describe, expect, it } from 'vitest';
import {
  PRIOR_YEAR_BALANCE_SOURCE_ID,
  evaluatePriorYearBalance,
} from '../src/colombia/individual-income-tax/2025/prior-year-balance';

describe('saldo a favor del año anterior (art. 850 ET) — AG 2025', () => {
  it('devuelve `no_declared` cuando no hay saldo', () => {
    const result = evaluatePriorYearBalance({
      taxYear: 2025,
      declaredCop: 0,
      confirmedByAnalyst: false,
      hasPendingCompensationOrRefundRequest: false,
    });
    expect(result.status).toBe('no_declared');
    expect(result.appliedCop).toBe(0);
    expect(result.ruleSourceId).toBe(PRIOR_YEAR_BALANCE_SOURCE_ID);
  });

  it('mantiene `pending_confirmation` sin confirmación explícita', () => {
    const result = evaluatePriorYearBalance({
      taxYear: 2025,
      declaredCop: 5_000_000,
      confirmedByAnalyst: false,
      hasPendingCompensationOrRefundRequest: false,
    });
    expect(result.status).toBe('pending_confirmation');
    expect(result.appliedCop).toBe(0);
    expect(result.reason).toMatch(/confirmaci[oó]n/i);
  });

  it('bloquea cuando hay solicitud de devolución o compensación pendiente', () => {
    const result = evaluatePriorYearBalance({
      taxYear: 2025,
      declaredCop: 5_000_000,
      confirmedByAnalyst: true,
      hasPendingCompensationOrRefundRequest: true,
    });
    expect(result.status).toBe('blocked_by_pending_request');
    expect(result.appliedCop).toBe(0);
    expect(result.reason).toMatch(/dev[oó]l|compensaci[oó]n/i);
  });

  it('aplica el saldo cuando está confirmado y sin solicitudes pendientes', () => {
    const result = evaluatePriorYearBalance({
      taxYear: 2025,
      declaredCop: 5_000_000,
      confirmedByAnalyst: true,
      hasPendingCompensationOrRefundRequest: false,
      priorYearFilingDate: '2025-08-10',
      evidence: 'Formulario 210 AG 2024 confirmado por el analista',
    });
    expect(result.status).toBe('applied');
    expect(result.appliedCop).toBe(5_000_000);
    expect(result.priorYearFilingDate).toBe('2025-08-10');
    expect(result.evidence).toContain('Formulario 210');
  });

  it('normaliza declarados negativos a cero', () => {
    const result = evaluatePriorYearBalance({
      taxYear: 2025,
      declaredCop: -1_000_000,
      confirmedByAnalyst: true,
      hasPendingCompensationOrRefundRequest: false,
    });
    expect(result.declaredCop).toBe(0);
    expect(result.appliedCop).toBe(0);
    expect(result.status).toBe('no_declared');
  });

  it('rechaza años no modelados', () => {
    expect(() =>
      evaluatePriorYearBalance({
        taxYear: 2024,
        declaredCop: 1_000_000,
        confirmedByAnalyst: true,
        hasPendingCompensationOrRefundRequest: false,
      }),
    ).toThrow(/no modela/i);
  });
});
