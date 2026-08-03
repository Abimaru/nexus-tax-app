import type {
  ProgressiveTaxBracket,
  ProgressiveTaxComputation,
  ProgressiveTaxTable,
} from '../../../types';
import { VERIFIED_AT } from './sources';
import { getTaxUnit } from './tax-unit';

/**
 * Tabla progresiva del impuesto sobre la renta para personas naturales
 * residentes, aplicable a la base gravable de la cédula general (art. 241 ET,
 * numeral 1). Vigente durante el año gravable 2025.
 *
 * Fuente: Estatuto Tributario, artículo 241 — id `et-art-241` en el catálogo
 * oficial. La tabla se expresa exclusivamente en UVT: el conversor a pesos
 * usa `TAX_UNIT_2025` para no duplicar el valor de la UVT.
 *
 * Interpretación oficial del rango:
 * - Se aplica la tarifa marginal al EXCESO sobre `fromUvt`.
 * - `baseTaxUvt` es el impuesto acumulado que llega hasta el piso del rango.
 * - `toUvt` marca el techo inclusive; el siguiente rango inicia inmediatamente
 *   después.
 */
export const PROGRESSIVE_TAX_BRACKETS_2025: readonly ProgressiveTaxBracket[] = [
  { fromUvt: 0, toUvt: 1_090, marginalRate: 0.0, baseTaxUvt: 0 },
  { fromUvt: 1_090, toUvt: 1_700, marginalRate: 0.19, baseTaxUvt: 0 },
  { fromUvt: 1_700, toUvt: 4_100, marginalRate: 0.28, baseTaxUvt: 116 },
  { fromUvt: 4_100, toUvt: 8_670, marginalRate: 0.33, baseTaxUvt: 788 },
  { fromUvt: 8_670, toUvt: 18_970, marginalRate: 0.35, baseTaxUvt: 2_296 },
  { fromUvt: 18_970, toUvt: 31_000, marginalRate: 0.37, baseTaxUvt: 5_901 },
  { fromUvt: 31_000, marginalRate: 0.39, baseTaxUvt: 10_352 },
] as const;

export const PROGRESSIVE_TAX_TABLE_2025: ProgressiveTaxTable = {
  taxYear: 2025,
  officialSourceId: 'et-art-241',
  verifiedAt: VERIFIED_AT,
  brackets: PROGRESSIVE_TAX_BRACKETS_2025,
};

/** Localiza el rango aplicable a una base gravable expresada en UVT. */
export function findBracket(
  taxableIncomeUvt: number,
  table: ProgressiveTaxTable = PROGRESSIVE_TAX_TABLE_2025,
): ProgressiveTaxBracket {
  const positive = Math.max(0, taxableIncomeUvt);
  // Recorre en orden descendente: el primer rango cuyo piso sea <= base es el
  // aplicable, incluyendo el último (sin techo).
  for (let index = table.brackets.length - 1; index >= 0; index -= 1) {
    const bracket = table.brackets[index]!;
    if (positive >= bracket.fromUvt) return bracket;
  }
  return table.brackets[0]!;
}

/**
 * Calcula el impuesto de renta progresivo para una base gravable en pesos.
 * Devuelve el detalle completo — rango, tarifa, aritmética y redondeo — para
 * que la UI pueda explicar el resultado paso a paso.
 *
 * Redondeo: el impuesto se conserva exacto en UVT y se redondea a pesos al
 * peso más cercano (política DIAN cuando corresponda pasar a moneda de curso).
 */
export function computeProgressiveIncomeTax(
  taxableIncomeCop: number,
  taxYear: number = 2025,
): ProgressiveTaxComputation {
  const table = PROGRESSIVE_TAX_TABLE_2025;
  if (taxYear !== table.taxYear) {
    throw new Error(
      `PROGRESSIVE_TAX_TABLE aún no modela el año ${taxYear}. Añade el ruleset correspondiente.`,
    );
  }
  const uvt = getTaxUnit(taxYear).valueCop;
  const positiveIncomeCop = Math.max(0, taxableIncomeCop);
  const taxableIncomeUvt = uvt === 0 ? 0 : positiveIncomeCop / uvt;
  const bracket = findBracket(taxableIncomeUvt, table);
  const excessUvt = Math.max(0, taxableIncomeUvt - bracket.fromUvt);
  const marginalTaxUvt = excessUvt * bracket.marginalRate;
  const totalTaxUvt = bracket.baseTaxUvt + marginalTaxUvt;
  const totalTaxCopRounded = Math.round(totalTaxUvt * uvt);
  const formula = bracket.marginalRate === 0
    ? '0 (rango exento)'
    : `(base − ${bracket.fromUvt} UVT) × ${(bracket.marginalRate * 100).toFixed(0)}% + ${bracket.baseTaxUvt} UVT`;
  return {
    taxYear,
    taxableIncomeCop: positiveIncomeCop,
    taxableIncomeUvt,
    bracket,
    excessUvt,
    marginalTaxUvt,
    totalTaxUvt,
    totalTaxCopRounded,
    ruleSourceId: table.officialSourceId,
    formula,
  };
}
