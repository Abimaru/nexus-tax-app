/**
 * Tope mensual agregado de la deducción por pagos de salud (medicina
 * prepagada, seguros de salud) — art. 387 ET (Sprint 2.4, Fase H).
 *
 * REGLA PRIMARIA (§2 del prompt de Fase H): el límite es MENSUAL — 16 UVT
 * (`MONTHLY_CAP_UVT`). El equivalente anual de 192 UVT (16 × 12,
 * `ANNUAL_CAP_UVT`) NUNCA es una constante normativa independiente: es la
 * equivalencia matemática de acumular el tope mensual durante los 12
 * meses completos del año, y se deriva así en código a propósito para que
 * ambos valores nunca puedan divergir (mismo patrón que
 * `computeDependentsDeduction`, `dependents.ts`).
 *
 * El tope es AGREGADO para el contribuyente en cada mes — nunca por
 * proveedor, por póliza ni por beneficiario (§5/§6 del prompt; texto
 * verbatim del art. 387 ET: "la misma limitación del literal anterior"
 * comparte un único tope de 16 UVT entre medicina prepagada y seguros de
 * salud del mismo mes). Cuando el total pagado en un mes supera el tope,
 * el valor considerado de cada pago de ese mes se reparte
 * PROPORCIONALMENTE a su participación en el total pagado ese mes — un
 * criterio determinista y neutral que no privilegia arbitrariamente a un
 * proveedor sobre otro cuando ambos reportan el mismo mes (§6: "Proveedor
 * A enero: 500.000, Proveedor B enero: 500.000 → NO permitir 1.000.000,
 * aplicar cap agregado mensual").
 *
 * Este motor SOLO recibe pagos que YA pasaron la validación individual de
 * `evaluateComplementaryHealthPaymentEligibility` (beneficiario, mes,
 * soporte, exclusión de EPS/gasto médico directo) — no vuelve a evaluar
 * esos criterios.
 *
 * Fuente normativa: `et-art-387-par-2-salud`.
 */
import { getTaxUnit } from './tax-unit';

export const COMPLEMENTARY_HEALTH_MONTHLY_CAP_SOURCE_ID = 'et-art-387-par-2-salud';
export const COMPLEMENTARY_HEALTH_MONTHLY_CAP_ENGINE_VERSION =
  'co.complementary-health.monthly-cap.2025.v1';

/** Regla primaria (fuente de verdad): tope mensual agregado, 16 UVT. */
export const MONTHLY_CAP_UVT_HEALTH = 16;
/** Meses de un año completo, usado únicamente para derivar el equivalente anual. */
export const MONTHS_PER_YEAR_HEALTH = 12;
/**
 * Equivalencia anual DERIVADA del tope mensual (16 UVT × 12 meses = 192
 * UVT). No es una constante normativa independiente.
 */
export const ANNUAL_CAP_UVT_HEALTH = MONTHLY_CAP_UVT_HEALTH * MONTHS_PER_YEAR_HEALTH;

export interface ComplementaryHealthPaymentDeclaration {
  id: string;
  /** Mes 1-12; solo pagos con mes conocido (ya validados individualmente) participan del agregado. */
  month: number;
  amountPaidCop: number;
}

export interface ComplementaryHealthMonthDetail {
  month: number;
  totalPaidCop: number;
  monthlyCapCop: number;
  eligibleCop: number;
  capApplied: boolean;
}

export interface ComplementaryHealthPaymentAllocation {
  id: string;
  month: number;
  amountPaidCop: number;
  /** Valor considerado tras el tope mensual agregado, repartido proporcionalmente si el mes se recortó. */
  eligibleAmountCop: number;
  capApplied: boolean;
}

export interface ComplementaryHealthMonthlyCapComputation {
  taxYear: number;
  monthlyCapUvt: number;
  monthlyCapCop: number;
  annualCapUvt: number;
  months: readonly ComplementaryHealthMonthDetail[];
  allocations: readonly ComplementaryHealthPaymentAllocation[];
  annualEligibleCop: number;
  formula: string;
  ruleSourceIds: readonly string[];
  ruleVersion: string;
}

/**
 * Calcula el valor eligible del año agregando el tope mensual de 16 UVT
 * por cada mes con pagos declarados. `payments` debe contener SOLO pagos
 * que ya pasaron la validación individual (beneficiario, mes, soporte,
 * exclusiones de EPS/gasto médico directo) —
 * `evaluateComplementaryHealthPaymentEligibility`.
 */
export function evaluateComplementaryHealthMonthlyCap(input: {
  taxYear: number;
  payments: readonly ComplementaryHealthPaymentDeclaration[];
}): ComplementaryHealthMonthlyCapComputation {
  if (input.taxYear !== 2025) {
    throw new Error(
      `COMPLEMENTARY_HEALTH_MONTHLY_CAP aún no modela el año ${input.taxYear}. Añade el ruleset correspondiente.`,
    );
  }
  const uvt = getTaxUnit(input.taxYear).valueCop;
  const monthlyCapCop = Math.round(MONTHLY_CAP_UVT_HEALTH * uvt);

  const totalsByMonth = new Map<number, number>();
  for (const payment of input.payments) {
    const amount = Math.max(0, payment.amountPaidCop);
    totalsByMonth.set(payment.month, (totalsByMonth.get(payment.month) ?? 0) + amount);
  }

  const months: ComplementaryHealthMonthDetail[] = [...totalsByMonth.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([month, totalPaidCop]) => {
      const eligibleCop = Math.min(totalPaidCop, monthlyCapCop);
      return {
        month,
        totalPaidCop,
        monthlyCapCop,
        eligibleCop,
        capApplied: totalPaidCop > monthlyCapCop,
      };
    });
  const monthByNumber = new Map(months.map((detail) => [detail.month, detail]));

  const allocations: ComplementaryHealthPaymentAllocation[] = input.payments.map((payment) => {
    const amount = Math.max(0, payment.amountPaidCop);
    const monthDetail = monthByNumber.get(payment.month)!;
    const eligibleAmountCop = monthDetail.capApplied
      ? monthDetail.totalPaidCop > 0
        ? Math.round((amount / monthDetail.totalPaidCop) * monthDetail.eligibleCop)
        : 0
      : amount;
    return {
      id: payment.id,
      month: payment.month,
      amountPaidCop: amount,
      eligibleAmountCop,
      capApplied: monthDetail.capApplied && eligibleAmountCop < amount,
    };
  });

  const annualEligibleCop = months.reduce((sum, detail) => sum + detail.eligibleCop, 0);

  return {
    taxYear: input.taxYear,
    monthlyCapUvt: MONTHLY_CAP_UVT_HEALTH,
    monthlyCapCop,
    annualCapUvt: ANNUAL_CAP_UVT_HEALTH,
    months,
    allocations,
    annualEligibleCop,
    formula:
      `sum(min(total_pagado_mes, ${MONTHLY_CAP_UVT_HEALTH} UVT)) para cada mes con pagos — ` +
      `art. 387 ET (tope mensual agregado para el contribuyente, nunca por proveedor/póliza/beneficiario; ` +
      `${ANNUAL_CAP_UVT_HEALTH} UVT = ${MONTHLY_CAP_UVT_HEALTH} UVT × ${MONTHS_PER_YEAR_HEALTH} meses, solo como equivalencia si los 12 meses están cubiertos)`,
    ruleSourceIds: [COMPLEMENTARY_HEALTH_MONTHLY_CAP_SOURCE_ID],
    ruleVersion: COMPLEMENTARY_HEALTH_MONTHLY_CAP_ENGINE_VERSION,
  };
}
