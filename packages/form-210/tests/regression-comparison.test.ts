import { describe, expect, it } from 'vitest';
import {
  compareForm210WithReference,
  type Form210BoxValue,
  type Form210ReferenceValue,
} from '../src';

const REFERENCE: Form210ReferenceValue[] = [
  { boxNumber: 29, expectedValue: 379_888_164, label: 'Patrimonio bruto' },
  { boxNumber: 37, expectedValue: 104_780_000, label: 'Total rentas de trabajo' },
  { boxNumber: 40, expectedValue: 12_400_000, label: 'Deducciones imputables' },
];

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
  it('distingue coincidencia, redondeo, revisión y fallo sin completar valores', () => {
    const result = compareForm210WithReference(
      {
        boxes: [
          box(29, 379_888_164, 'confirmed'),
          box(37, 104_780_001, 'calculated'),
          box(40, 11_000_000, 'requires_review'),
        ],
      },
      REFERENCE,
    );
    expect(result.map((item) => item.status)).toEqual([
      'exact_match',
      'rounding_difference',
      'requires_review',
    ]);
    expect(
      compareForm210WithReference({ boxes: [box(29, 1, 'confirmed')] }, REFERENCE)[1]?.status,
    ).toBe('requires_review');
    expect(
      compareForm210WithReference({ boxes: [box(29, 100, 'confirmed')] }, REFERENCE)[0]?.status,
    ).toBe('failure');
  });
});
