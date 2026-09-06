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
 * trabajo del contribuyente, con un tope **total para el contribuyente**
 * (no por dependiente). La **regla primaria** (fuente de verdad) es el
 * límite **mensual**: 32 UVT (`MONTHLY_CAP_UVT_TOTAL`). El equivalente
 * **anual** de 384 UVT (`ANNUAL_CAP_UVT_TOTAL`) NO es una constante
 * normativa independiente: es la equivalencia matemática de acumular el
 * tope mensual durante los 12 meses completos del año
 * (`MONTHLY_CAP_UVT_TOTAL × MONTHS_PER_YEAR`), y se deriva así en código a
 * propósito para que ambos valores nunca puedan divergir.
 *
 * CORRECCIÓN NORMATIVA (Sprint 2.4, Fase C): la implementación anterior
 * multiplicaba estos topes por el número de dependientes elegibles
 * (`eligibleCount × 384 UVT`), inflando el beneficio cuando había más de un
 * dependiente. La doctrina es explícita: "el límite es por el total de
 * dependientes, pues esta deducción no fija un número máximo de ellos... la
 * deducción es la misma si se tiene un solo dependiente, cuatro o cinco"
 * (Gerencie, guía de renta 2025; confirmado además por Tributi). El número
 * de dependientes NO escala el tope de este artículo — solo habilita que el
 * beneficio exista (basta con tener al menos un dependiente calificado). El
 * límite de "máximo cuatro dependientes" (`DEPENDENTS_MAX_ELIGIBLE`) NO
 * aplica al art. 387: es exclusivo del beneficio adicional de 72 UVT del
 * art. 336 num. 3 (ver `dependents-additional-336.ts`). Se conserva aquí por
 * compatibilidad de la doctrina histórica del art. 387 (que no fija número
 * máximo), pero el motor ya no lo usa para escalar el tope.
 *
 * REVISIÓN NORMATIVA PUNTUAL (Sprint 2.4, Fase C — segunda auditoría): se
 * confirmó que la corrección anterior no reemplazó el bug del escalado por
 * dependiente por una simplificación incorrecta del cálculo mensual/anual.
 * El cálculo sigue siendo un agregado ANUAL (no una simulación mes a mes de
 * retención en la fuente con ingreso variable): el candidato de porcentaje
 * usa el ingreso bruto ANUAL agregado (casilla 32), no un ingreso mensual.
 * Esto es consistente con el resto del motor de liquidación preliminar del
 * F-210 (que siempre opera sobre agregados anuales, no sobre retención
 * mensual) y con el alcance declarado del proyecto (no liquida retenciones
 * mensuales). El tope mensual de 32 UVT se usa aquí para determinar cuántos
 * MESES de cobertura de dependiente están disponibles (`coveredMonths`,
 * prorrateado cuando el dependiente no calificó los 12 meses), no para
 * simular ingresos mes a mes.
 *
 * El tope anual se prorratea por el mes con mayor cobertura entre los
 * dependientes declarados (`coveredMonths`): si el contribuyente tuvo al
 * menos un dependiente calificado durante N meses del año, el tope aplicable
 * es `N × 32 UVT` (máximo 384 UVT a los 12 meses). Esto refleja que el tope
 * es mensual y único, no una suma de contribuciones por dependiente.
 *
 * Este motor NO valida la elegibilidad de cada dependiente (edad, ingresos,
 * certificaciones, parentesco) — esa clasificación es del analista y se
 * conserva por trazabilidad. El motor tampoco decide en qué casilla del F-210
 * se alimenta la deducción; eso lo determina el builder de `form-210`.
 *
 * Fuentes oficiales: `et-art-387` (Estatuto Tributario, art. 387) y el
 * catálogo `OFFICIAL_SOURCES_2025` en `official-sources.ts`.
 */
export const DEPENDENTS_DEDUCTION_SOURCE_ID = 'et-art-387';
export const DEPENDENTS_INCOME_PERCENTAGE = 0.1;
/** Regla primaria (fuente de verdad): tope mensual agregado, 32 UVT. */
export const MONTHLY_CAP_UVT_TOTAL = 32;
/** Meses de un año completo, usado únicamente para derivar el tope anual. */
export const MONTHS_PER_YEAR = 12;
/**
 * Equivalencia anual DERIVADA del tope mensual (32 UVT × 12 meses = 384
 * UVT). No es una constante normativa independiente: si el tope mensual
 * cambiara, este valor debe seguir derivándose de él, nunca fijarse aparte.
 */
export const ANNUAL_CAP_UVT_TOTAL = MONTHLY_CAP_UVT_TOTAL * MONTHS_PER_YEAR;

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
  if (months > MONTHS_PER_YEAR) return MONTHS_PER_YEAR;
  return months;
}

/**
 * Calcula la deducción orientativa por dependientes para el año 2025.
 *
 * El cálculo es un AGREGADO ANUAL (no una simulación mes a mes de retención
 * en la fuente): `grossEmploymentIncomeCop` es el ingreso bruto anual ya
 * agregado (casilla 32 del F-210), y el candidato de porcentaje se calcula
 * una sola vez sobre ese agregado — el motor no reparte el ingreso entre
 * meses ni simula retención mensual variable, lo cual está fuera del
 * alcance de este proyecto (que no liquida retenciones).
 *
 * El resultado siempre incluye el detalle por dependiente y los tres
 * candidatos (porcentaje, tope mensual, tope anual) para que el analista
 * pueda ver cuál fue el limitante efectivo. La deducción aplicada es el
 * mínimo entre los tres. El tope mensual/anual es agregado (no se multiplica
 * por dependiente): se calcula sobre `coveredMonths`, el mayor número de
 * meses declarado entre los dependientes (basta con tener al menos uno
 * calificado ese mes para que el tope de ese mes esté disponible). El tope
 * anual (`annualCapCandidateCop`) es matemáticamente redundante cuando
 * `coveredMonths = 12` (coincide exactamente con el tope mensual acumulado)
 * y nunca puede ser más restrictivo que él, porque `coveredMonths` está
 * acotado a `[0, MONTHS_PER_YEAR]`; se conserva como candidato explícito
 * por trazabilidad y como salvaguarda defensiva, no porque compita con una
 * regla distinta.
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
  // El art. 387 ET no fija un número máximo de dependientes: el tope es
  // agregado para el contribuyente, no por dependiente (a diferencia del
  // beneficio adicional de 72 UVT del art. 336 num. 3, que sí limita a
  // cuatro). Todos los dependientes declarados participan del cálculo.
  const eligibleCount = providedCount;
  const monthlyCapTotalCop = MONTHLY_CAP_UVT_TOTAL * uvt;
  const details: DependentDeductionDetail[] = input.dependents.map((dependent) => {
    const months = clampMonths(dependent.monthsClaimed);
    return {
      id: dependent.id,
      kind: dependent.kind,
      monthsClaimed: months,
      // Cobertura informativa de este dependiente por sí solo; el tope
      // agregado usa `coveredMonths` (el máximo entre todos), no la suma.
      monthlyCapContributionCop: Math.round(months * monthlyCapTotalCop),
    };
  });
  const coveredMonths = details.reduce((max, detail) => Math.max(max, detail.monthsClaimed), 0);

  const percentageCandidateCop = Math.round(grossIncome * DEPENDENTS_INCOME_PERCENTAGE);
  const monthlyCapCandidateCop = Math.round(coveredMonths * monthlyCapTotalCop);
  const annualCapCandidateCop = Math.round(ANNUAL_CAP_UVT_TOTAL * uvt);

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

  const formula =
    `min(${DEPENDENTS_INCOME_PERCENTAGE * 100} % × ingresos_trabajo, ` +
    `${coveredMonths} meses × ${MONTHLY_CAP_UVT_TOTAL} UVT, ${ANNUAL_CAP_UVT_TOTAL} UVT) ` +
    `— art. 387 ET (tope total para el contribuyente, no por dependiente; ` +
    `${ANNUAL_CAP_UVT_TOTAL} UVT = ${MONTHLY_CAP_UVT_TOTAL} UVT × ${MONTHS_PER_YEAR} meses)`;

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
