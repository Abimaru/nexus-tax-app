import { describe, expect, it } from 'vitest';
import {
  ANNUAL_CAP_UVT_HEALTH,
  COMPLEMENTARY_HEALTH_MONTHLY_CAP_SOURCE_ID,
  MONTHLY_CAP_UVT_HEALTH,
  evaluateComplementaryHealthMonthlyCap,
} from '../src/colombia/individual-income-tax/2025/complementary-health-monthly-cap';
import { evaluateComplementaryHealthPaymentEligibility } from '../src/colombia/individual-income-tax/2025/complementary-health-eligibility';

/**
 * Salud complementaria y medicina prepagada (Sprint 2.4, Fase H).
 * Cubre A-G, K, L, M, N de §21 del prompt (H, I, J y O — integración con
 * dependientes y no double counting a nivel de expediente — se cubren en
 * `apps/web/src/lib/complementaryHealth.test.ts`, integración real).
 */
describe('evaluateComplementaryHealthMonthlyCap (Sprint 2.4, Fase H)', () => {
  const UVT_2025 = 49_799;

  it('§2 el equivalente anual de 192 UVT se DERIVA del tope mensual de 16 UVT (16 × 12), nunca al revés', () => {
    expect(MONTHLY_CAP_UVT_HEALTH).toBe(16);
    expect(ANNUAL_CAP_UVT_HEALTH).toBe(192);
    expect(ANNUAL_CAP_UVT_HEALTH).toBe(MONTHLY_CAP_UVT_HEALTH * 12);
  });

  it('A. un proveedor bajo el tope: se considera el valor completo', () => {
    const result = evaluateComplementaryHealthMonthlyCap({
      taxYear: 2025,
      payments: [{ id: 'p1', month: 1, amountPaidCop: 500_000 }],
    });
    expect(result.months[0]?.capApplied).toBe(false);
    expect(result.allocations[0]?.eligibleAmountCop).toBe(500_000);
    expect(result.annualEligibleCop).toBe(500_000);
    expect(result.ruleSourceIds).toContain(COMPLEMENTARY_HEALTH_MONTHLY_CAP_SOURCE_ID);
  });

  it('B. un pago sobre el tope mensual: se recorta a 16 UVT', () => {
    const monthlyCapCop = Math.round(16 * UVT_2025);
    const result = evaluateComplementaryHealthMonthlyCap({
      taxYear: 2025,
      payments: [{ id: 'p1', month: 1, amountPaidCop: monthlyCapCop + 300_000 }],
    });
    expect(result.months[0]?.capApplied).toBe(true);
    expect(result.allocations[0]?.eligibleAmountCop).toBe(monthlyCapCop);
    expect(result.allocations[0]?.capApplied).toBe(true);
    expect(result.annualEligibleCop).toBe(monthlyCapCop);
  });

  it('C. dos proveedores el mismo mes: un solo tope agregado, repartido proporcionalmente', () => {
    const result = evaluateComplementaryHealthMonthlyCap({
      taxYear: 2025,
      payments: [
        { id: 'a', month: 1, amountPaidCop: 500_000 },
        { id: 'b', month: 1, amountPaidCop: 500_000 },
      ],
    });
    const monthlyCapCop = Math.round(16 * UVT_2025);
    expect(result.months).toHaveLength(1);
    expect(result.months[0]?.totalPaidCop).toBe(1_000_000);
    expect(result.months[0]?.eligibleCop).toBe(monthlyCapCop);
    expect(result.months[0]?.capApplied).toBe(true);
    // Reparto proporcional: ambos aportaron 50 %, cada uno recibe 50 % del tope.
    const allocationA = result.allocations.find((item) => item.id === 'a')!;
    const allocationB = result.allocations.find((item) => item.id === 'b')!;
    expect(allocationA.eligibleAmountCop).toBe(Math.round(monthlyCapCop / 2));
    expect(allocationB.eligibleAmountCop).toBe(Math.round(monthlyCapCop / 2));
    expect(allocationA.eligibleAmountCop + allocationB.eligibleAmountCop).toBeLessThanOrEqual(
      monthlyCapCop,
    );
    // Nunca permite que la suma de ambos proveedores exceda 1.000.000 sin recorte.
    expect(result.annualEligibleCop).toBeLessThan(1_000_000);
  });

  it('D. 12 meses bajo el tope: el anual coincide exactamente con la suma mensual', () => {
    const monthlyAmount = 300_000;
    const payments = Array.from({ length: 12 }, (_, index) => ({
      id: `m${index + 1}`,
      month: index + 1,
      amountPaidCop: monthlyAmount,
    }));
    const result = evaluateComplementaryHealthMonthlyCap({ taxYear: 2025, payments });
    expect(result.months).toHaveLength(12);
    expect(result.annualEligibleCop).toBe(monthlyAmount * 12);
    expect(result.months.every((month) => !month.capApplied)).toBe(true);
  });

  it('E. 6 meses: nunca se multiplica por 12 ni se asume el año completo', () => {
    const payments = Array.from({ length: 6 }, (_, index) => ({
      id: `m${index + 1}`,
      month: index + 1,
      amountPaidCop: 300_000,
    }));
    const result = evaluateComplementaryHealthMonthlyCap({ taxYear: 2025, payments });
    expect(result.months).toHaveLength(6);
    expect(result.annualEligibleCop).toBe(300_000 * 6);
    // Nunca extrapola a 12 meses.
    expect(result.annualEligibleCop).not.toBe(300_000 * 12);
  });

  it('F. meses con valores distintos: cada mes aplica su propio tope de forma independiente', () => {
    const monthlyCapCop = Math.round(16 * UVT_2025);
    const result = evaluateComplementaryHealthMonthlyCap({
      taxYear: 2025,
      payments: [
        { id: 'jan', month: 1, amountPaidCop: 200_000 },
        { id: 'feb', month: 2, amountPaidCop: monthlyCapCop + 500_000 },
        { id: 'mar', month: 3, amountPaidCop: 700_000 },
      ],
    });
    expect(result.months).toHaveLength(3);
    const jan = result.months.find((m) => m.month === 1)!;
    const feb = result.months.find((m) => m.month === 2)!;
    const mar = result.months.find((m) => m.month === 3)!;
    expect(jan.capApplied).toBe(false);
    expect(jan.eligibleCop).toBe(200_000);
    expect(feb.capApplied).toBe(true);
    expect(feb.eligibleCop).toBe(monthlyCapCop);
    expect(mar.capApplied).toBe(false);
    expect(mar.eligibleCop).toBe(700_000);
  });

  it('K/L/M — nunca modela negativos y siempre expone la regla en pesos y UVT', () => {
    const result = evaluateComplementaryHealthMonthlyCap({
      taxYear: 2025,
      payments: [{ id: 'p1', month: 1, amountPaidCop: -100_000 }],
    });
    expect(result.allocations[0]?.eligibleAmountCop).toBe(0);
    expect(result.monthlyCapCop).toBe(Math.round(16 * UVT_2025));
  });

  it('rechaza años distintos a 2025 (aún no modelados)', () => {
    expect(() =>
      evaluateComplementaryHealthMonthlyCap({ taxYear: 2026, payments: [] }),
    ).toThrow();
  });
});

describe('evaluateComplementaryHealthPaymentEligibility (Sprint 2.4, Fase H)', () => {
  const base = {
    taxYear: 2025 as const,
    productType: 'prepaid_medicine' as const,
    beneficiary: 'taxpayer' as const,
    beneficiaryDependentLinked: false,
    month: 1,
    supportStatus: 'sufficient' as const,
    supportTypes: ['prepaid_medicine_certificate'],
    isMandatoryEpsContribution: false,
    isDirectMedicalExpense: false,
    hasPossibleDuplicate: false,
  };

  it('H. taxpayer beneficiario: elegible cuando el resto de contexto está completo', () => {
    const result = evaluateComplementaryHealthPaymentEligibility(base);
    expect(result.status).toBe('eligible');
  });

  it('I. spouse (cónyuge/compañero permanente) beneficiario: elegible', () => {
    const result = evaluateComplementaryHealthPaymentEligibility({
      ...base,
      beneficiary: 'spouse_or_partner',
    });
    expect(result.status).toBe('eligible');
  });

  it('J. dependent vinculado a un TaxDependent existente: elegible', () => {
    const result = evaluateComplementaryHealthPaymentEligibility({
      ...base,
      beneficiary: 'dependent',
      beneficiaryDependentLinked: true,
    });
    expect(result.status).toBe('eligible');
  });

  it('J. dependent SIN vincular a un TaxDependent: requires_beneficiary_review (nunca asume elegibilidad por texto)', () => {
    const result = evaluateComplementaryHealthPaymentEligibility({
      ...base,
      beneficiary: 'dependent',
      beneficiaryDependentLinked: false,
    });
    expect(result.status).toBe('requires_beneficiary_review');
  });

  it('K. beneficiario desconocido/inválido: requires_beneficiary_review', () => {
    const result = evaluateComplementaryHealthPaymentEligibility({
      ...base,
      beneficiary: 'unknown',
    });
    expect(result.status).toBe('requires_beneficiary_review');
  });

  it('L. aporte obligatorio a EPS: not_applicable, nunca se suma al tope de medicina prepagada', () => {
    const result = evaluateComplementaryHealthPaymentEligibility({
      ...base,
      isMandatoryEpsContribution: true,
    });
    expect(result.status).toBe('not_applicable');
  });

  it('M. gasto médico directo (consulta/odontología/medicamentos/hospital/cirugía): not_applicable', () => {
    const result = evaluateComplementaryHealthPaymentEligibility({
      ...base,
      isDirectMedicalExpense: true,
    });
    expect(result.status).toBe('not_applicable');
  });

  it('§7/§8 certificado anual sin detalle mensual (month = null): requires_monthly_breakdown, nunca total/12', () => {
    const result = evaluateComplementaryHealthPaymentEligibility({ ...base, month: null });
    expect(result.status).toBe('requires_monthly_breakdown');
  });

  it('§11 soporte faltante: requires_support', () => {
    const result = evaluateComplementaryHealthPaymentEligibility({
      ...base,
      supportStatus: 'missing',
    });
    expect(result.status).toBe('requires_support');
  });

  it('posible duplicado domina sobre cualquier otro criterio', () => {
    const result = evaluateComplementaryHealthPaymentEligibility({
      ...base,
      hasPossibleDuplicate: true,
      isMandatoryEpsContribution: true,
    });
    expect(result.status).toBe('requires_review');
  });

  it('nunca reduce el estado a un booleano', () => {
    const result = evaluateComplementaryHealthPaymentEligibility(base);
    expect(typeof result.status).toBe('string');
    expect(result.status).not.toBe(true);
    expect(result.status).not.toBe(false);
  });

  it('rechaza años distintos a 2025', () => {
    expect(() =>
      evaluateComplementaryHealthPaymentEligibility({ ...base, taxYear: 2026 }),
    ).toThrow();
  });
});
