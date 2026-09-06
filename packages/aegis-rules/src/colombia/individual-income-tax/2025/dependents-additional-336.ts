import type {
  DependentsAdditionalDeductionCandidate,
  DependentsAdditionalDeductionComputation,
  ExcludedAdditionalDependent,
} from '../../../types';
import { getTaxUnit } from './tax-unit';

/**
 * Beneficio adicional de 72 UVT por dependiente (art. 336 numeral 3, inciso
 * 2 del Estatuto Tributario, adicionado por la Ley 2277 de 2022).
 *
 * Texto literal del inciso: «Sin perjuicio de lo establecido en el inciso 2
 * del artículo 387 del Estatuto Tributario, el trabajador podrá deducir, en
 * adición al límite establecido en el inciso anterior, setenta y dos (72)
 * UVT por dependiente hasta un máximo de cuatro (4) dependientes.»
 *
 * Diferencias deliberadas frente al art. 387 (`dependents.ts`), que NO deben
 * fusionarse en una sola fórmula:
 *   - Es "en adición" al límite general del 40 % / 1.340 UVT (art. 336): NO
 *     se somete a ese tope conjunto (a diferencia del art. 387, que sí).
 *   - Es "en adición" a la deducción del art. 387: ambas pueden coexistir
 *     para el mismo dependiente, pero solo cuando el contribuyente tiene
 *     rentas de una relación laboral, legal o reglamentaria (ver
 *     `dependents-coexistence.ts`); para honorarios/servicios personales,
 *     un mismo dependiente solo da lugar a UNA de las dos deducciones.
 *   - SÍ tiene un máximo de cuatro dependientes (el art. 387 no lo tiene).
 *   - El monto es 72 UVT × dependiente aplicado, no un porcentaje de ingreso.
 *
 * Este motor NO evalúa elegibilidad ni coexistencia: recibe candidatos ya
 * marcados `eligible` por el evaluador correspondiente (fuera de este
 * paquete puro, en el dominio) y solo aplica el tope de cuatro y la
 * multiplicación por 72 UVT.
 */
export const DEPENDENTS_ADDITIONAL_DEDUCTION_SOURCE_ID = 'et-art-336-num-3';
export const DEPENDENTS_ADDITIONAL_UVT_PER_DEPENDENT = 72;
export const DEPENDENTS_ADDITIONAL_MAX_ELIGIBLE = 4;

export interface DependentsAdditionalDeductionInput {
  taxYear: number;
  dependents: readonly DependentsAdditionalDeductionCandidate[];
}

/**
 * Calcula la adición por dependientes (72 UVT × hasta 4 dependientes) para
 * el año gravable 2025. Los dependientes marcados `eligible: false` se
 * excluyen con motivo `not_eligible`; los elegibles que exceden el cuarto se
 * excluyen con motivo `exceeds_max_four`, conservando el orden de
 * declaración (no se pierden: solo no participan del cálculo).
 */
export function computeDependentsAdditionalDeduction(
  input: DependentsAdditionalDeductionInput,
): DependentsAdditionalDeductionComputation {
  if (input.taxYear !== 2025) {
    throw new Error(
      `DEPENDENTS_ADDITIONAL_DEDUCTION aún no modela el año ${input.taxYear}. Añade el ruleset correspondiente.`,
    );
  }
  const uvt = getTaxUnit(input.taxYear).valueCop;
  const dependentsProvidedCount = input.dependents.length;
  const eligible = input.dependents.filter((dependent) => dependent.eligible);
  const dependentsEligibleCount = eligible.length;
  const applied = eligible.slice(0, DEPENDENTS_ADDITIONAL_MAX_ELIGIBLE);
  const dependentsAppliedCount = applied.length;

  const excludedDependents: ExcludedAdditionalDependent[] = [
    ...input.dependents
      .filter((dependent) => !dependent.eligible)
      .map((dependent): ExcludedAdditionalDependent => ({ id: dependent.id, reason: 'not_eligible' })),
    ...eligible
      .slice(DEPENDENTS_ADDITIONAL_MAX_ELIGIBLE)
      .map((dependent): ExcludedAdditionalDependent => ({ id: dependent.id, reason: 'exceeds_max_four' })),
  ];

  const totalUvt = dependentsAppliedCount * DEPENDENTS_ADDITIONAL_UVT_PER_DEPENDENT;
  const totalCop = Math.round(totalUvt * uvt);

  const warnings: string[] = [];
  if (dependentsEligibleCount > DEPENDENTS_ADDITIONAL_MAX_ELIGIBLE) {
    warnings.push(
      `Se declararon ${dependentsEligibleCount} dependientes elegibles para este beneficio; solo los primeros ${DEPENDENTS_ADDITIONAL_MAX_ELIGIBLE} entran en la adición de 72 UVT (art. 336 num. 3 ET). Los demás se conservan, pero no generan este beneficio.`,
    );
  }

  const formula = `${dependentsAppliedCount} × ${DEPENDENTS_ADDITIONAL_UVT_PER_DEPENDENT} UVT — art. 336 num. 3 ET (fuera del límite conjunto de 40 % / 1.340 UVT)`;

  return {
    taxYear: input.taxYear,
    dependentsProvidedCount,
    dependentsEligibleCount,
    dependentsAppliedCount,
    uvtPerDependent: DEPENDENTS_ADDITIONAL_UVT_PER_DEPENDENT,
    totalUvt,
    totalCop,
    excludedDependents,
    ruleSourceId: DEPENDENTS_ADDITIONAL_DEDUCTION_SOURCE_ID,
    formula,
    warnings,
  };
}
