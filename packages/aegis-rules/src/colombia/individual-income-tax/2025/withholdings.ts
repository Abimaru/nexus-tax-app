import type {
  DuplicateWithholdingPair,
  WithholdingConsolidation,
  WithholdingOriginBreakdown,
  WithholdingSource,
} from '../../../types';

/**
 * Consolidación de retenciones en la fuente para efectos del F-210
 * (casilla 132). El sustento normativo es el art. 373 del Estatuto
 * Tributario: los valores retenidos se imputan al impuesto sobre la renta
 * del contribuyente.
 *
 * El motor **no** decide el origen de cada retención (esa clasificación la
 * aporta el analista mediante `breakdown`); solo agrega, valida coherencia
 * y detecta pares sospechosos de duplicidad para revisión humana.
 */
export const WITHHOLDINGS_SOURCE_ID = 'et-art-373';

/** Diferencia relativa aceptada para tratar dos retenciones como duplicadas. */
export const WITHHOLDING_DUPLICATE_RELATIVE_TOLERANCE = 0.01;

export interface WithholdingConsolidationInput {
  taxYear: number;
  sources: readonly WithholdingSource[];
  breakdown?: WithholdingOriginBreakdown;
}

function detectDuplicates(
  sources: readonly WithholdingSource[],
  toleranceRelative: number,
): DuplicateWithholdingPair[] {
  const pairs: DuplicateWithholdingPair[] = [];
  for (let i = 0; i < sources.length; i += 1) {
    const a = sources[i]!;
    if (a.valueCop <= 0 || !a.entityTaxId) continue;
    for (let j = i + 1; j < sources.length; j += 1) {
      const b = sources[j]!;
      if (b.valueCop <= 0 || !b.entityTaxId) continue;
      if (a.entityTaxId !== b.entityTaxId) continue;
      const maxValue = Math.max(a.valueCop, b.valueCop);
      const relative = maxValue === 0 ? 0 : Math.abs(a.valueCop - b.valueCop) / maxValue;
      if (relative <= toleranceRelative) {
        pairs.push({
          a,
          b,
          reason: `Mismo retenedor (${a.entityTaxId}) con valor similar; posible doble conteo.`,
        });
      }
    }
  }
  return pairs;
}

function sumBreakdown(breakdown: WithholdingOriginBreakdown): number {
  return (
    Math.max(0, breakdown.employmentCop) +
    Math.max(0, breakdown.capitalCop) +
    Math.max(0, breakdown.nonLaborCop) +
    Math.max(0, breakdown.occasionalGainCop) +
    Math.max(0, breakdown.dividendsCop) +
    Math.max(0, breakdown.otherCop)
  );
}

/**
 * Consolida retenciones y devuelve el análisis explicable. Valores
 * negativos se tratan como cero. Los pares con mismo retenedor y valor
 * similar se marcan como duplicados sospechosos (no se eliminan).
 */
export function consolidateWithholdings(
  input: WithholdingConsolidationInput,
): WithholdingConsolidation {
  if (input.taxYear !== 2025) {
    throw new Error(
      `WITHHOLDINGS_CONSOLIDATION aún no modela el año ${input.taxYear}. Añade el ruleset correspondiente.`,
    );
  }
  const normalizedSources = input.sources.map((source) => ({
    ...source,
    valueCop: Math.max(0, source.valueCop),
  }));
  const totalReportedCop = normalizedSources.reduce(
    (sum, source) => sum + source.valueCop,
    0,
  );
  const positiveSources = normalizedSources.filter((source) => source.valueCop > 0);
  const entriesWithoutSupport = positiveSources.filter(
    (source) => !source.hasDocumentSupport,
  );
  const suspectedDuplicates = detectDuplicates(
    positiveSources,
    WITHHOLDING_DUPLICATE_RELATIVE_TOLERANCE,
  );

  let breakdown: WithholdingOriginBreakdown | null = null;
  let breakdownTotalCop: number | null = null;
  let breakdownMatchesReported = true;
  let breakdownDifferenceCop = 0;
  if (input.breakdown) {
    breakdown = {
      employmentCop: Math.max(0, input.breakdown.employmentCop),
      capitalCop: Math.max(0, input.breakdown.capitalCop),
      nonLaborCop: Math.max(0, input.breakdown.nonLaborCop),
      occasionalGainCop: Math.max(0, input.breakdown.occasionalGainCop),
      dividendsCop: Math.max(0, input.breakdown.dividendsCop),
      otherCop: Math.max(0, input.breakdown.otherCop),
    };
    breakdownTotalCop = sumBreakdown(breakdown);
    breakdownDifferenceCop = breakdownTotalCop - totalReportedCop;
    breakdownMatchesReported = breakdownDifferenceCop === 0;
  }

  return {
    taxYear: input.taxYear,
    totalReportedCop,
    entriesCount: positiveSources.length,
    entriesWithoutSupportCount: entriesWithoutSupport.length,
    entriesWithoutSupportIds: entriesWithoutSupport.map((source) => source.sourceId),
    breakdown,
    breakdownTotalCop,
    breakdownMatchesReported,
    breakdownDifferenceCop,
    suspectedDuplicates,
    formula:
      breakdown === null
        ? 'Σ retenciones reportadas'
        : 'Σ retenciones reportadas ≡ Σ (empleo + capital + no laboral + GO + dividendos + otro)',
    ruleSourceId: WITHHOLDINGS_SOURCE_ID,
  };
}
