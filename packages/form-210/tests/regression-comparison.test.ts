import { describe, expect, it } from 'vitest';
import { compareForm210WithReference, type Form210BoxValue } from '../src';
import {
  ANONYMIZED_DEPENDENTS_REFERENCE,
  ANONYMIZED_FORM_210_REFERENCE,
} from './fixtures/reference-form210';

function box(
  number: number,
  value: number | null,
  status: Form210BoxValue['status'],
): Form210BoxValue {
  return {
    number,
    name: `Casilla ${number}`,
    section: 'patrimony',
    formula: null,
    dependencies: [],
    ruleComplete: true,
    suggestedValue: value,
    confirmedValue: null,
    sources: [],
    includedSourceIds: [],
    excludedSourceIds: [],
    excludedSources: [],
    confidence: 'high',
    status,
    warnings: [],
    resolutionId: null,
    ruleVersion: 'test',
  };
}

describe('comparación de regresión del Formulario 210', () => {
  it('conserva el oráculo completo y distingue resultado sin forzar coincidencias', () => {
    const reference = ANONYMIZED_FORM_210_REFERENCE.slice(0, 3);
    const result = compareForm210WithReference(
      {
        boxes: [
          box(29, 148_984_000, 'confirmed'),
          box(30, 120_032_001, 'calculated'),
          box(31, 20_000_000, 'requires_review'),
        ],
      },
      reference,
    );
    expect(result.map((item) => item.status)).toEqual([
      'exact_match',
      'rounding_difference',
      'requires_review',
    ]);
    expect(
      compareForm210WithReference({ boxes: [box(29, 100, 'confirmed')] }, reference)[0]?.status,
    ).toBe('failure');
    expect(ANONYMIZED_FORM_210_REFERENCE).toHaveLength(34);
    expect(ANONYMIZED_DEPENDENTS_REFERENCE).toEqual({
      count: 1,
      additionalDeductionCop: 3_586_000,
    });
  });
});
