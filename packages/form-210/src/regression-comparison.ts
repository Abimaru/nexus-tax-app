import type { Form210Draft } from './types';

export interface Form210ReferenceValue {
  boxNumber: number;
  expectedValue: number;
  label: string;
}

export type RegressionComparisonStatus =
  'exact_match' | 'rounding_difference' | 'requires_review' | 'failure';

export interface Form210RegressionComparison {
  boxNumber: number;
  label: string;
  expectedValue: number;
  actualValue: number | null;
  difference: number | null;
  status: RegressionComparisonStatus;
  explanation: string;
}

/**
 * Oráculo de regresión para fixtures sintéticos. Nunca se usa para completar
 * una declaración real ni se incluye en las reglas productivas.
 */
export function compareForm210WithReference(
  draft: Pick<Form210Draft, 'boxes'>,
  reference: readonly Form210ReferenceValue[],
  roundingToleranceCop = 1,
): Form210RegressionComparison[] {
  return reference.map((expected) => {
    const box = draft.boxes.find((candidate) => candidate.number === expected.boxNumber);
    const actualValue = box?.confirmedValue ?? box?.suggestedValue ?? null;
    if (actualValue === null) {
      return {
        ...expected,
        actualValue,
        difference: null,
        status: 'requires_review',
        explanation: 'La casilla no tiene un valor calculado para comparar.',
      };
    }
    const difference = actualValue - expected.expectedValue;
    const absoluteDifference = Math.abs(difference);
    const status: RegressionComparisonStatus =
      absoluteDifference === 0
        ? 'exact_match'
        : absoluteDifference <= roundingToleranceCop
          ? 'rounding_difference'
          : box?.status === 'requires_review' || box?.status === 'provisional'
            ? 'requires_review'
            : 'failure';
    return {
      ...expected,
      actualValue,
      difference,
      status,
      explanation:
        status === 'exact_match'
          ? 'Coincidencia exacta.'
          : status === 'rounding_difference'
            ? 'Diferencia explicada por la tolerancia de redondeo configurada.'
            : status === 'requires_review'
              ? 'La fuente o la casilla sigue pendiente de revisión humana.'
              : 'La diferencia supera la tolerancia y debe investigarse.',
    };
  });
}
