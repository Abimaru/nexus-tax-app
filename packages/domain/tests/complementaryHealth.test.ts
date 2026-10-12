import { describe, expect, it } from 'vitest';
import { COMPLEMENTARY_HEALTH_SCHEMA_VERSION, ComplementaryHealthPaymentSchema } from '../src/complementaryHealth';

/**
 * Salud complementaria y medicina prepagada (Sprint 2.4, Fase H). Cubre el
 * contrato de dominio: `ComplementaryHealthPayment` nunca modela la
 * elegibilidad como booleano, admite `month: null` (certificado anual sin
 * detalle) y separa explícitamente aportes EPS/gastos médicos directos.
 */
describe('esquemas de salud complementaria (Sprint 2.4, Fase H)', () => {
  const base = {
    id: 'health:1',
    caseId: 'case:1',
    providerName: 'Medicina Prepagada Sintética SAS',
    providerTaxIdMasked: null,
    productType: 'prepaid_medicine' as const,
    beneficiary: 'taxpayer' as const,
    beneficiaryDependentId: null,
    taxYear: 2025,
    month: 1,
    amountPaidCop: 300_000,
    eligibleAmountCop: null,
    sourceDocumentId: null,
    evidenceDescription: null,
    supportStatus: 'sufficient' as const,
    supportTypes: ['prepaid_medicine_certificate'],
    isMandatoryEpsContribution: false,
    isDirectMedicalExpense: false,
    eligibilityStatus: 'eligible' as const,
    eligibilityReasons: [],
    ruleVersion: 'co.complementary-health.eligibility.2025.v1',
    decisionStatus: 'pending' as const,
    reasons: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  it('valida un ComplementaryHealthPayment completo con mes conocido', () => {
    const payment = ComplementaryHealthPaymentSchema.parse(base);
    expect(payment.month).toBe(1);
    expect(COMPLEMENTARY_HEALTH_SCHEMA_VERSION).toBe('2.4.0');
  });

  it('permite month: null para certificados anuales sin detalle mensual (§7/§8)', () => {
    const payment = ComplementaryHealthPaymentSchema.parse({ ...base, month: null });
    expect(payment.month).toBeNull();
  });

  it('rechaza un mes fuera del rango 1-12', () => {
    expect(() => ComplementaryHealthPaymentSchema.parse({ ...base, month: 13 })).toThrow();
    expect(() => ComplementaryHealthPaymentSchema.parse({ ...base, month: 0 })).toThrow();
  });

  it('nunca modela la elegibilidad como booleano', () => {
    const payment = ComplementaryHealthPaymentSchema.parse(base);
    expect(typeof payment.eligibilityStatus).toBe('string');
    expect(payment.eligibilityStatus).not.toBe(true);
    expect(payment.eligibilityStatus).not.toBe(false);
  });

  it('modela explícitamente la exclusión de aportes EPS y gastos médicos directos', () => {
    const epsPayment = ComplementaryHealthPaymentSchema.parse({
      ...base,
      isMandatoryEpsContribution: true,
      eligibilityStatus: 'not_applicable',
    });
    expect(epsPayment.isMandatoryEpsContribution).toBe(true);
    const directExpensePayment = ComplementaryHealthPaymentSchema.parse({
      ...base,
      isDirectMedicalExpense: true,
      eligibilityStatus: 'not_applicable',
    });
    expect(directExpensePayment.isDirectMedicalExpense).toBe(true);
  });

  it('beneficiario dependent admite vincular un TaxDependent existente', () => {
    const payment = ComplementaryHealthPaymentSchema.parse({
      ...base,
      beneficiary: 'dependent',
      beneficiaryDependentId: 'dependent:1',
    });
    expect(payment.beneficiaryDependentId).toBe('dependent:1');
  });

  it('permite describir el período de cobertura cuando el mes exacto no se conoce (§7/§8)', () => {
    const payment = ComplementaryHealthPaymentSchema.parse({
      ...base,
      month: null,
      coveragePeriodDescription: 'Enero-Diciembre 2025',
    });
    expect(payment.month).toBeNull();
    expect(payment.coveragePeriodDescription).toBe('Enero-Diciembre 2025');
  });
});
