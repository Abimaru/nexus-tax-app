/**
 * Política numérica única de conciliación (Sprint 2.4, Fase F.3 — Unified
 * Reconciliation & Coverage Hardening).
 *
 * El benchmark real Documento ↔ Exógena (Fase F.1) encontró dos
 * divergencias reales entre los consumidores existentes de "¿qué tan
 * cerca están estos dos valores?":
 *
 *   - `suggestExogenousMatches` (candidato↔exógena,
 *     `packages/document-intelligence/src/matching.ts`) trataba una
 *     diferencia relativa ≤1% como "diferencia menor", sin límite
 *     absoluto — un monto grande podía calificar como "menor" solo por
 *     ser un porcentaje pequeño.
 *   - `evaluateReconciliationDifference` (umbral/matriz,
 *     `packages/exogenous-parser/src/reconciliationPolicy.ts`) exigía
 *     ≤$100 absolutos Y ≤0.01% relativo — mucho más estricto.
 *   - El panel de conciliación (`ReconciliationsPanel.tsx`) tenía además
 *     un tercer umbral ad-hoc (`score >= 75 && difference <= 5`) sin
 *     relación con ninguno de los dos anteriores y sin ninguna
 *     protección semántica.
 *
 * Este módulo es la ÚNICA fuente de verdad para exact/rounding/minor/
 * relevant. Vive en `@nexus-tax/domain` (sin dependencias hacia otros
 * paquetes de NexusTax) porque tanto `@nexus-tax/document-intelligence`
 * (matching.ts) como `@nexus-tax/exogenous-parser`
 * (reconciliationPolicy.ts) necesitan importarlo, y `exogenous-parser` ya
 * depende de `document-intelligence` — solo `domain` es alcanzable desde
 * ambos sin crear una dependencia circular.
 *
 * Principio (§3-§5 del prompt de Fase F.3): "menor" exige SIEMPRE
 * condición absoluta Y relativa. Nunca se considera "menor" solo por
 * porcentaje relativo cuando el monto es grande (un 0.01% de un monto
 * enorme puede seguir siendo una cifra absoluta significativa).
 *
 * Esta política NO sustituye el gate semántico de Fase F.2
 * (`detectSemanticContradiction`): evalúa solo la dimensión numérica. Los
 * consumidores deben combinar `semantic compatibility + numeric policy =
 * estado final`, con precedencia semántica (§6 del prompt de Fase F.3).
 */

export const NUMERIC_RECONCILIATION_POLICY_VERSION = 'co.reconciliation.numeric.2025.v1';

export type NumericReconciliationStatus = 'exact' | 'rounding' | 'minor' | 'relevant';

export interface NumericReconciliationInput {
  /** Valor documental con centavos (p. ej. 3.241.486,57). */
  documentDecimalValue: number;
  /**
   * Valor documental redondeado al peso más cercano. Opcional: si se
   * omite, se calcula como `Math.round(documentDecimalValue)`.
   */
  documentRoundedValue?: number;
  /** Valor reportado por la exógena/tope/registro comparado (entero COP). */
  exogenousValue: number;
  /**
   * Tolerancia de redondeo, en pesos (por defecto 1 = redondeo simple de
   * centavos). Un valor mayor (p. ej. 5) permite modelar tolerancias de
   * redondeo agregado en conciliaciones de topes/consolidados, donde
   * ambos lados ya son enteros pero pueden diferir por acumulación de
   * redondeos en el cálculo — sigue siendo la MISMA política, con un
   * parámetro explícito en vez de un segundo mecanismo paralelo.
   */
  roundingToleranceCop?: number;
}

export interface NumericReconciliationResult {
  status: NumericReconciliationStatus;
  /** Diferencia absoluta entre el valor documental redondeado y el exógeno. */
  differenceAbsolute: number;
  /** Diferencia porcentual respecto al valor exógeno (base), o `null` si la base es 0. */
  differencePercentage: number | null;
  roundingToleranceCop: number;
  /** Explicación humana, reutilizable directamente en UI. */
  explanation: string;
  /**
   * `true` para `rounding`/`minor`/`relevant` — ninguno de estos estados
   * se acepta silenciosamente sin una acción humana explícita (§4 del
   * prompt de Fase F.3: `bulk confirmable != auto confirmed`). Solo
   * `exact` puede considerarse suficientemente inequívoco por sí mismo,
   * y aun así requiere la confirmación humana del flujo (esta bandera
   * describe la política numérica, no sustituye el flujo de
   * confirmación).
   */
  requiresHumanConfirmation: boolean;
  policyVersion: string;
}

/** Umbral absoluto y relativo combinados para "diferencia menor" (§5). */
const MINOR_ABSOLUTE_LIMIT_COP = 100;
const MINOR_RELATIVE_LIMIT_PERCENTAGE = 0.01;

/**
 * Evalúa la diferencia numérica entre un valor documental y un valor
 * exógeno/tope/consolidado según la política única de Fase F.3. Pura,
 * determinista, sin dependencias externas.
 */
export function evaluateNumericReconciliation(
  input: NumericReconciliationInput,
): NumericReconciliationResult {
  const documentRoundedValue =
    input.documentRoundedValue ?? Math.round(input.documentDecimalValue);
  const roundingToleranceCop = Math.max(1, Math.abs(input.roundingToleranceCop ?? 1));
  // Diferencia RAW (con centavos): decide si es un `exact` literal. Debe
  // calcularse ANTES de redondear — si el decimal tiene centavos que se
  // pierden al redondear, el resultado nunca es "exact", aunque el valor
  // redondeado coincida exactamente (ese caso es `rounding`, no `exact`).
  const rawDifference = Math.abs(input.documentDecimalValue - input.exogenousValue);
  if (rawDifference === 0) {
    return {
      status: 'exact',
      differenceAbsolute: 0,
      differencePercentage: 0,
      roundingToleranceCop,
      explanation: 'Los valores coinciden exactamente.',
      requiresHumanConfirmation: false,
      policyVersion: NUMERIC_RECONCILIATION_POLICY_VERSION,
    };
  }
  const differenceAbsolute = Math.abs(documentRoundedValue - input.exogenousValue);
  const base = Math.max(Math.abs(input.exogenousValue), 1);
  const differencePercentage =
    input.exogenousValue === 0 ? null : (differenceAbsolute / base) * 100;
  if (differenceAbsolute <= roundingToleranceCop) {
    return {
      status: 'rounding',
      differenceAbsolute,
      differencePercentage,
      roundingToleranceCop,
      explanation:
        differenceAbsolute === 0
          ? 'El valor documental redondea exactamente al valor de la exógena.'
          : `La diferencia de ${differenceAbsolute} es compatible con la tolerancia de redondeo de ${roundingToleranceCop}.`,
      requiresHumanConfirmation: true,
      policyVersion: NUMERIC_RECONCILIATION_POLICY_VERSION,
    };
  }
  // §5: "menor" exige SIEMPRE ambas condiciones — absoluta Y relativa.
  // Un monto grande con porcentaje pequeño (p. ej. $101 de diferencia en
  // un valor de $10.000.000, 0.00101%) NO califica como "menor" solo
  // porque el porcentaje es diminuto: el límite absoluto sigue aplicando.
  // Cuando el valor exógeno es 0 no hay base para calcular un porcentaje
  // (`differencePercentage: null`): en ese caso la condición relativa se
  // considera satisfecha por definición y solo el límite absoluto decide.
  if (
    differenceAbsolute <= MINOR_ABSOLUTE_LIMIT_COP &&
    (differencePercentage === null || differencePercentage <= MINOR_RELATIVE_LIMIT_PERCENTAGE)
  ) {
    return {
      status: 'minor',
      differenceAbsolute,
      differencePercentage,
      roundingToleranceCop,
      explanation:
        'La diferencia es menor según el umbral absoluto y porcentual combinado de esta política.',
      requiresHumanConfirmation: true,
      policyVersion: NUMERIC_RECONCILIATION_POLICY_VERSION,
    };
  }
  return {
    status: 'relevant',
    differenceAbsolute,
    differencePercentage,
    roundingToleranceCop,
    explanation: 'La diferencia supera los límites de redondeo y revisión menor.',
    requiresHumanConfirmation: true,
    policyVersion: NUMERIC_RECONCILIATION_POLICY_VERSION,
  };
}
