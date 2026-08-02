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

/** Política única: clasifica la diferencia, pero nunca la acepta por el analista. */
export function evaluateReconciliationDifference(
  input: ReconciliationPolicyInput,
): ReconciliationPolicyResult {
  const differenceAbsolute = Math.abs(input.leftValue - input.rightValue);
  const base = Math.abs(input.rightValue);
  const differencePercentage = base === 0 ? null : (differenceAbsolute / base) * 100;
  const roundingUnit = Math.max(1, Math.abs(input.roundingUnit ?? 1));

  if (differenceAbsolute === 0) {
    return {
      status: 'reconciled',
      differenceAbsolute,
      differencePercentage: 0,
      roundingUnit,
      explanation: 'Los valores coinciden exactamente.',
      requiresHumanConfirmation: false,
      policyVersion: RECONCILIATION_POLICY_VERSION,
    };
  }
  if (differenceAbsolute <= roundingUnit) {
    return {
      status: 'rounding_difference',
      differenceAbsolute,
      differencePercentage,
      roundingUnit,
      explanation: `La diferencia de ${differenceAbsolute} es compatible con la unidad de redondeo de ${roundingUnit}.`,
      requiresHumanConfirmation: true,
      policyVersion: RECONCILIATION_POLICY_VERSION,
    };
  }
  if (
    differenceAbsolute <= 100 &&
    (differencePercentage === null || differencePercentage <= 0.01)
  ) {
    return {
      status: 'minor_difference',
      differenceAbsolute,
      differencePercentage,
      roundingUnit,
      explanation: 'La diferencia es menor según el umbral absoluto y porcentual de esta política.',
      requiresHumanConfirmation: true,
      policyVersion: RECONCILIATION_POLICY_VERSION,
    };
  }
  return {
    status: 'relevant_difference',
    differenceAbsolute,
    differencePercentage,
    roundingUnit,
    explanation: 'La diferencia supera los límites de redondeo y revisión menor.',
    requiresHumanConfirmation: true,
    policyVersion: RECONCILIATION_POLICY_VERSION,
  };
}
