import { describe, expect, it } from 'vitest';
import { evaluateReconciliationDifference } from '../src';

describe('política central de conciliación', () => {
  it.each([1, 5])('trata una diferencia de %s como redondeo compatible', (difference) => {
    const result = evaluateReconciliationDifference({
      leftValue: 10_000,
      rightValue: 10_000 + difference,
      source: 'exogenous_threshold',
      roundingUnit: 5,
      groupNature: 'income',
    });
    expect(result.status).toBe('rounding_difference');
    expect(result.requiresHumanConfirmation).toBe(true);
  });

  it('distingue una diferencia relevante', () => {
    expect(
      evaluateReconciliationDifference({
        leftValue: 10_000,
        rightValue: 12_000,
        source: 'document',
        roundingUnit: 1,
        groupNature: 'asset',
      }).status,
    ).toBe('relevant_difference');
  });
});
