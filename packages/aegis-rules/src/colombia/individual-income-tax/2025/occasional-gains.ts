import type {
  OccasionalGainComponent,
  OccasionalGainKind,
  OccasionalGainRate,
  OccasionalGainsTaxComputation,
} from '../../../types';

/**
 * Tarifas de ganancias ocasionales aplicables en Colombia durante el año
 * gravable 2025 para personas naturales residentes.
 *
 * - `general` (art. 314 ET): 15 % desde la Ley 2277 de 2022. Aplica a la
 *   mayoría de ganancias ocasionales (venta de activos fijos poseídos por más
 *   de 2 años, indemnizaciones por seguros de vida, herencias/legados por
 *   encima de la parte exenta, etc.).
 * - `lottery` (art. 317 ET): 20 % para loterías, rifas, apuestas y similares.
 *
 * Las tarifas se conservan en el motor puro; el motor NO decide qué base es
 * lotería y cuál es general: eso lo determina el clasificador y el analista.
 */
export const OCCASIONAL_GAIN_RATES_2025: readonly OccasionalGainRate[] = [
  {
    kind: 'general',
    rate: 0.15,
    officialSourceId: 'et-art-314',
    description: 'Tarifa general del 15 % — art. 314 ET (Ley 2277 de 2022).',
  },
  {
    kind: 'lottery',
    rate: 0.2,
    officialSourceId: 'et-art-317',
    description: 'Loterías, rifas y apuestas — 20 %, art. 317 ET.',
  },
] as const;

/** Recupera la tarifa aplicable a un tipo de ganancia ocasional. */
export function getOccasionalGainRate(kind: OccasionalGainKind): OccasionalGainRate {
  const found = OCCASIONAL_GAIN_RATES_2025.find((rate) => rate.kind === kind);
  if (!found) {
    throw new Error(`Tarifa desconocida para ganancia ocasional: "${kind}".`);
  }
  return found;
}

export interface OccasionalGainsTaxInput {
  taxYear: number;
  /** Base gravable de ganancias ocasionales con tarifa general (art. 314 ET). */
  generalBaseCop: number;
  /**
   * Base gravable de loterías, rifas y apuestas (art. 317 ET). Se separa
   * porque su tarifa es distinta a la general.
   */
  lotteryBaseCop: number;
}

/**
 * Calcula el impuesto orientativo de ganancias ocasionales para el año 2025.
 *
 * El resultado devuelve un componente por cada base positiva, con su tarifa,
 * fuente y aritmética. Bases negativas o cero producen `components: []` para
 * el rubro correspondiente. El total se redondea al peso más cercano.
 *
 * Convención de redondeo: se redondea cada componente por separado y luego se
 * suman. Esto conserva la trazabilidad exacta por concepto (el analista puede
 * verificar cada componente sin volver a recalcular).
 */
export function computeOccasionalGainsTax(
  input: OccasionalGainsTaxInput,
): OccasionalGainsTaxComputation {
  if (input.taxYear !== 2025) {
    throw new Error(
      `OCCASIONAL_GAIN_RATES aún no modela el año ${input.taxYear}. Añade el ruleset correspondiente.`,
    );
  }
  const generalBase = Math.max(0, input.generalBaseCop);
  const lotteryBase = Math.max(0, input.lotteryBaseCop);
  const generalRate = getOccasionalGainRate('general');
  const lotteryRate = getOccasionalGainRate('lottery');

  const components: OccasionalGainComponent[] = [];
  if (generalBase > 0) {
    components.push({
      kind: 'general',
      baseCop: generalBase,
      rate: generalRate.rate,
      taxCop: Math.round(generalBase * generalRate.rate),
      officialSourceId: generalRate.officialSourceId,
    });
  }
  if (lotteryBase > 0) {
    components.push({
      kind: 'lottery',
      baseCop: lotteryBase,
      rate: lotteryRate.rate,
      taxCop: Math.round(lotteryBase * lotteryRate.rate),
      officialSourceId: lotteryRate.officialSourceId,
    });
  }

  const totalBaseCop = generalBase + lotteryBase;
  const totalTaxCop = components.reduce((sum, component) => sum + component.taxCop, 0);
  const ruleSourceIds = Array.from(
    new Set(components.map((component) => component.officialSourceId)),
  );

  const formulaParts = components.map(
    (component) =>
      `${component.kind === 'lottery' ? 'loterías' : 'GO general'} × ${(component.rate * 100).toFixed(0)} %`,
  );
  const formula =
    components.length === 0
      ? '0 (sin base gravable)'
      : formulaParts.join(' + ');

  return {
    taxYear: input.taxYear,
    components,
    totalBaseCop,
    totalTaxCop,
    formula,
    ruleSourceIds,
  };
}
