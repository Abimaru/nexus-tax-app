import type {
  DependentDeclaration,
  DependentDeductionDetail,
  DependentsDeductionComputation,
} from '../../../types';
import { getTaxUnit } from './tax-unit';

/**
 * Reglas del art. 387 del Estatuto Tributario sobre la deducción por
 * dependientes económicos aplicable a rentas de trabajo (personas naturales
 * residentes en Colombia).
 *
 * El artículo permite deducir el 10 % de los ingresos brutos por rentas de
 * trabajo del contribuyente, con dos topes por dependiente calificado:
 *   - 32 UVT mensuales por dependiente (`MONTHLY_CAP_UVT_PER_DEPENDENT`).
 *   - 384 UVT anuales por dependiente (`ANNUAL_CAP_UVT_PER_DEPENDENT`).
 *
 * Además, la doctrina limita el beneficio a **máximo cuatro dependientes**.
 * Cuando el analista declara más de cuatro, el motor toma los primeros
 * cuatro por orden de aparición y devuelve el excedente en el conteo para
 * que la UI pueda generar un warning.
 *
 * Este motor NO valida la elegibilidad de cada dependiente (edad, ingresos,
 * certificaciones, parentesco) — esa clasificación es del analista y se
 * conserva por trazabilidad. El motor tampoco decide en qué casilla del F-210
 * se alimenta la deducción; eso lo determina el builder de `form-210`.
 */
export const DEPENDENTS_DEDUCTION_SOURCE_ID = 'et-art-387';
export const DEPENDENTS_INCOME_PERCENTAGE = 0.1;
export const DEPENDENTS_MAX_ELIGIBLE = 4;
export const MONTHLY_CAP_UVT_PER_DEPENDENT = 32;
export const ANNUAL_CAP_UVT_PER_DEPENDENT = 384;

export interface DependentsDeductionInput {
  taxYear: number;
  dependents: readonly DependentDeclaration[];
  /**
   * Ingresos brutos de rentas de trabajo en pesos (casilla 32 del F-210).
   * Valores negativos se tratan como cero.
   */
  grossEmploymentIncomeCop: number;
}

function clampMonths(months: number): number {
  if (!Number.isFinite(months)) return 0;
  if (months < 0) return 0;
  if (months > 12) return 12;
  return months;
}

/**
 * Calcula la deducción orientativa por dependientes para el año 2025.
 *
 * El resultado siempre incluye el detalle por dependiente y los tres
 * candidatos (porcentaje, tope mensual, tope anual) para que el analista
 * pueda ver cuál fue el limitante efectivo. La deducción aplicada es el
 * mínimo entre los tres.
 */
export function computeDependentsDeduction(
  input: DependentsDeductionInput,
): DependentsDeductionComputation {
  if (input.taxYear !== 2025) {
    throw new Error(
      `DEPENDENTS_DEDUCTION aún no modela el año ${input.taxYear}. Añade el ruleset correspondiente.`,
    );
  }
  const uvt = getTaxUnit(input.taxYear).valueCop;
  const grossIncome = Math.max(0, input.grossEmploymentIncomeCop);
  const providedCount = input.dependents.length;
  const eligible = input.dependents.slice(0, DEPENDENTS_MAX_ELIGIBLE);
  const eligibleCount = eligible.length;

  const monthlyCapPerDependentCop = MONTHLY_CAP_UVT_PER_DEPENDENT * uvt;
  const details: DependentDeductionDetail[] = eligible.map((dependent) => {
    const months = clampMonths(dependent.monthsClaimed);
    return {
      id: dependent.id,
      kind: dependent.kind,
      monthsClaimed: months,
      monthlyCapContributionCop: Math.round(months * monthlyCapPerDependentCop),
    };
  });

  const percentageCandidateCop = Math.round(grossIncome * DEPENDENTS_INCOME_PERCENTAGE);
  const monthlyCapCandidateCop = details.reduce(
    (sum, detail) => sum + detail.monthlyCapContributionCop,
    0,
  );
  const annualCapCandidateCop = Math.round(eligibleCount * ANNUAL_CAP_UVT_PER_DEPENDENT * uvt);

  const candidates: readonly {
    key: DependentsDeductionComputation['bindingCandidate'];
    value: number;
  }[] = [
    { key: 'percentage', value: percentageCandidateCop },
    { key: 'monthly_cap', value: monthlyCapCandidateCop },
    { key: 'annual_cap', value: annualCapCandidateCop },
  ];
  const binding = candidates.reduce((min, current) =>
    current.value < min.value ? current : min,
  );

  const appliedDeductionCop = Math.max(0, binding.value);

  const formula = `min(10 % × ingresos_trabajo, Σ 32 UVT × meses, ${eligibleCount} × 384 UVT) — art. 387 ET`;

  return {
    taxYear: input.taxYear,
    grossEmploymentIncomeCop: grossIncome,
    dependentsProvidedCount: providedCount,
    dependentsEligibleCount: eligibleCount,
    percentageCandidateCop,
    monthlyCapCandidateCop,
    annualCapCandidateCop,
    appliedDeductionCop,
    bindingCandidate: binding.key,
    formula,
    ruleSourceId: DEPENDENTS_DEDUCTION_SOURCE_ID,
    dependents: details,
  };
}
