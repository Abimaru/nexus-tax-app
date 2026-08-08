import type {
  DuplicatePatrimonyCheckResult,
  DuplicatePatrimonyPair,
  LiabilityWithoutAssetCheckResult,
  MovementWithoutBalanceCheckResult,
  PatrimonySourceCandidate,
} from '../../../types';
import { getTaxUnit } from './tax-unit';

/**
 * Validaciones puras de coherencia patrimonial para el año gravable 2025.
 * Se sustentan en el art. 261 del Estatuto Tributario (patrimonio bruto —
 * valor patrimonial de los activos poseídos al último día del año).
 *
 * Estas verificaciones NO fijan la composición del patrimonio; solo detectan
 * incoherencias observables desde los datos ya normalizados por el analista.
 * El motor devuelve `triggered: boolean` y evidencia numérica; la creación
 * de hallazgos con severidad y `boxNumbers` queda del builder del F-210.
 */
export const PATRIMONY_SOURCE_ID = 'et-art-261';

/**
 * Movimiento acumulado (en UVT anuales) a partir del cual se espera ver
 * un saldo declarado. El objetivo es detectar cuentas o inversiones
 * omitidas en el patrimonio bruto cuando el analista sí reporta actividad.
 */
export const PATRIMONY_MOVEMENT_SIGNIFICANCE_UVT = 100;

/**
 * Diferencia relativa máxima entre dos entradas de patrimonio para
 * considerarlas posibles duplicados. 1 % cubre diferencias de redondeo y
 * ajustes menores sin generar demasiado ruido.
 */
export const PATRIMONY_DUPLICATE_RELATIVE_TOLERANCE = 0.01;

/**
 * Detecta el caso "hay pasivo pero no hay activo" — típicamente indica que
 * el analista olvidó declarar el activo respaldo del pasivo (una tarjeta de
 * crédito registrada pero sin la cuenta o el bien asociado).
 */
export function detectLiabilityWithoutAsset(input: {
  grossPatrimonyCop: number;
  liabilitiesCop: number;
}): LiabilityWithoutAssetCheckResult {
  const gross = Math.max(0, input.grossPatrimonyCop);
  const liabilities = Math.max(0, input.liabilitiesCop);
  return {
    triggered: liabilities > 0 && gross === 0,
    grossPatrimonyCop: gross,
    liabilitiesCop: liabilities,
  };
}

/**
 * Detecta movimientos significativos declarados (bancarios, tarjetas,
 * inversiones) sin patrimonio bruto que los respalde. El umbral es
 * configurable a través de `thresholdUvt`; por defecto se usa el valor de
 * `PATRIMONY_MOVEMENT_SIGNIFICANCE_UVT`.
 */
export function detectMovementWithoutBalance(input: {
  taxYear: number;
  grossPatrimonyCop: number;
  movementSources: readonly PatrimonySourceCandidate[];
  thresholdUvt?: number;
}): MovementWithoutBalanceCheckResult {
  const uvt = getTaxUnit(input.taxYear).valueCop;
  const thresholdUvt = input.thresholdUvt ?? PATRIMONY_MOVEMENT_SIGNIFICANCE_UVT;
  const thresholdCop = Math.round(thresholdUvt * uvt);
  const positiveMovements = input.movementSources.filter((source) => source.valueCop > 0);
  const movementTotalCop = positiveMovements.reduce(
    (sum, source) => sum + source.valueCop,
    0,
  );
  const gross = Math.max(0, input.grossPatrimonyCop);
  const triggered = gross === 0 && movementTotalCop >= thresholdCop;
  const significantSourceIds = triggered
    ? positiveMovements.map((source) => source.sourceId)
    : [];
  return {
    triggered,
    grossPatrimonyCop: gross,
    movementTotalCop,
    thresholdCop,
    significantSourceIds,
  };
}

/**
 * Detecta pares de entradas patrimoniales cuyo valor y etiqueta sugieren
 * duplicidad. El motor compara pares con el mismo label normalizado (sin
 * acentos, en minúsculas) y una diferencia relativa dentro de la tolerancia
 * (`PATRIMONY_DUPLICATE_RELATIVE_TOLERANCE`).
 *
 * No modifica los datos; solo devuelve los pares para que el analista
 * decida si consolidar.
 */
export function detectDuplicatePatrimonyEntries(input: {
  sources: readonly PatrimonySourceCandidate[];
  toleranceRelative?: number;
}): DuplicatePatrimonyCheckResult {
  const tolerance = input.toleranceRelative ?? PATRIMONY_DUPLICATE_RELATIVE_TOLERANCE;
  const normalize = (text: string) =>
    text
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .trim()
      .toLocaleLowerCase('es');
  const pairs: DuplicatePatrimonyPair[] = [];
  const sources = input.sources.filter((source) => source.valueCop > 0);
  for (let i = 0; i < sources.length; i += 1) {
    const a = sources[i]!;
    const labelA = normalize(a.label);
    if (!labelA) continue;
    for (let j = i + 1; j < sources.length; j += 1) {
      const b = sources[j]!;
      if (normalize(b.label) !== labelA) continue;
      const maxValue = Math.max(a.valueCop, b.valueCop);
      const relative = maxValue === 0 ? 0 : Math.abs(a.valueCop - b.valueCop) / maxValue;
      if (relative <= tolerance) {
        pairs.push({ a, b, relativeDifference: relative });
      }
    }
  }
  return {
    triggered: pairs.length > 0,
    pairs,
  };
}
