import { evaluateNumericReconciliation } from '@nexus-tax/domain';

export const RECONCILIATION_POLICY_VERSION = 'co.form210.reconciliation.2025.v1';

export type ReconciliationPolicyStatus =
  'reconciled' | 'rounding_difference' | 'minor_difference' | 'relevant_difference';

export interface ReconciliationPolicyInput {
  leftValue: number;
  rightValue: number;
  source: 'exogenous_threshold' | 'document' | 'manual' | 'form_box';
  roundingUnit?: number;
  groupNature: 'income' | 'asset' | 'liability' | 'withholding' | 'movement' | 'other';
}

export interface ReconciliationPolicyResult {
  status: ReconciliationPolicyStatus;
  differenceAbsolute: number;
  differencePercentage: number | null;
  roundingUnit: number;
  explanation: string;
  requiresHumanConfirmation: boolean;
  policyVersion: string;
}

const STATUS_MAP: Record<
  ReturnType<typeof evaluateNumericReconciliation>['status'],
  ReconciliationPolicyStatus
> = {
  exact: 'reconciled',
  rounding: 'rounding_difference',
  minor: 'minor_difference',
  relevant: 'relevant_difference',
};

/**
 * Política de conciliación de umbrales/consolidados (Sprint 2.4, Fase D/E,
 * evolucionada en Fase F.3 — Unified Reconciliation & Coverage Hardening).
 *
 * Desde Fase F.3, esta función es un envoltorio delgado sobre la política
 * numérica única (`evaluateNumericReconciliation`,
 * `@nexus-tax/domain/numericReconciliation.ts`): conserva su contrato
 * público exacto (nombres de estado, forma del resultado) para no romper
 * a sus consumidores existentes (`analysis.ts` para topes/consolidados,
 * `ReconciliationsPanel.tsx` para hechos↔exógena), pero YA NO redefine
 * sus propios umbrales — delega la clasificación exacta/redondeo/menor/
 * relevante a la fuente única compartida también por
 * `suggestExogenousMatches` (`@nexus-tax/document-intelligence`).
 */
export function evaluateReconciliationDifference(
  input: ReconciliationPolicyInput,
): ReconciliationPolicyResult {
  const result = evaluateNumericReconciliation({
    documentDecimalValue: input.leftValue,
    exogenousValue: input.rightValue,
    roundingToleranceCop: input.roundingUnit,
  });
  return {
    status: STATUS_MAP[result.status],
    differenceAbsolute: result.differenceAbsolute,
    differencePercentage: result.differencePercentage,
    roundingUnit: result.roundingToleranceCop,
    explanation: result.explanation,
    requiresHumanConfirmation: result.requiresHumanConfirmation,
    policyVersion: RECONCILIATION_POLICY_VERSION,
  };
}
