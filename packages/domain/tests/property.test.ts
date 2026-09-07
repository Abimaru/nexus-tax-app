import { describe, expect, it } from 'vitest';
import {
  PROPERTY_SCHEMA_VERSION,
  PropertyExpenseSchema,
  RentalActivitySchema,
  RentalIncomeSchema,
  TaxPropertySchema,
} from '../src/property';

/**
 * Inmuebles, renta inmobiliaria y administración de propiedad horizontal
 * (Sprint 2.4, Fase G). Cubre el contrato de dominio: `TaxProperty`,
 * `RentalActivity`, `RentalIncome` (enlace, nunca segundo libro de
 * ingresos) y `PropertyExpense` (candidato, nunca un booleano de
 * deducibilidad).
 */
describe('esquemas de inmuebles (Sprint 2.4, Fase G)', () => {
  it('valida un TaxProperty completo, con uso por defecto sin inferir', () => {
    const property = TaxPropertySchema.parse({
      id: 'property:1',
      caseId: 'case:1',
      label: 'Apartamento principal',
      propertyType: 'apartment',
      use: 'unknown',
      ownershipPercentage: 100,
      ownedFrom: null,
      ownedUntil: null,
      taxYear: 2025,
      sourceDocumentIds: [],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    expect(property.use).toBe('unknown');
    expect(PROPERTY_SCHEMA_VERSION).toBe('2.4.0');
  });

  it('rechaza un porcentaje de propiedad fuera de 0-100', () => {
    expect(() =>
      TaxPropertySchema.parse({
        id: 'property:1',
        caseId: 'case:1',
        label: 'Apartamento',
        propertyType: 'apartment',
        use: 'unknown',
        ownershipPercentage: 150,
        ownedFrom: null,
        ownedUntil: null,
        taxYear: 2025,
        sourceDocumentIds: [],
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      }),
    ).toThrow();
  });

  it('RentalActivity limita meses cubiertos a 0-12 y no asume el año completo', () => {
    const activity = RentalActivitySchema.parse({
      id: 'activity:1',
      caseId: 'case:1',
      propertyId: 'property:1',
      from: '2025-06-01',
      to: '2025-12-31',
      monthsCovered: 7,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    expect(activity.monthsCovered).toBe(7);
    expect(() =>
      RentalActivitySchema.parse({
        ...activity,
        monthsCovered: 13,
      }),
    ).toThrow();
  });

  it('RentalIncome de fuente exógena/documental exige sourceId; manual permite null', () => {
    const linked = RentalIncomeSchema.parse({
      id: 'income:1',
      caseId: 'case:1',
      propertyId: 'property:1',
      rentalActivityId: 'activity:1',
      sourceKind: 'exogenous_record',
      sourceId: 'record:1',
      amountCop: 1_000_000,
      period: '2025-06',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    expect(linked.sourceId).toBe('record:1');

    const manual = RentalIncomeSchema.parse({
      ...linked,
      id: 'income:2',
      sourceKind: 'manual',
      sourceId: null,
    });
    expect(manual.sourceId).toBeNull();
  });

  it('PropertyExpense nunca modela la elegibilidad como booleano', () => {
    const expense = PropertyExpenseSchema.parse({
      id: 'expense:1',
      propertyId: 'property:1',
      caseId: 'case:1',
      expenseType: 'administration_fee',
      rentalActivityId: null,
      period: null,
      amountCop: 300_000,
      sourceDocumentId: null,
      evidenceDescription: null,
      supportStatus: 'sufficient',
      supportTypes: ['administration_account_statement'],
      allocationMethod: 'unknown',
      allocationPercentage: null,
      allocationReason: null,
      eligibilityStatus: 'potentially_deductible',
      eligibilityReasons: [],
      ruleVersion: 'co.property.expense-eligibility.2025.v1',
      decisionStatus: 'pending',
      reasons: [],
      isExtraordinary: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    expect(typeof expense.eligibilityStatus).toBe('string');
    expect(expense.eligibilityStatus).not.toBe(true);
    expect(expense.eligibilityStatus).not.toBe(false);
    expect(expense.decisionStatus).toBe('pending');
  });
});
