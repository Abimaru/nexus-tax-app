import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  createCase,
  createPropertyExpense,
  createRentalActivity,
  createTaxProperty,
  decidePropertyExpense,
  deleteTaxProperty,
  getPropertyExpenses,
  getRentalActivities,
  getRentalIncomes,
  getTaxProperties,
  linkRentalIncome,
  removePropertyExpense,
  removeRentalActivity,
  removeRentalIncome,
  updatePropertyExpense,
  updateTaxProperty,
} from './repository';
import { getDb } from './db';

async function resetDatabase() {
  const db = getDb();
  await db.delete();
  await db.open();
}

/**
 * Inmuebles, renta inmobiliaria y administración de propiedad horizontal
 * (Sprint 2.4, Fase G). Cubre el principio inviolable "propiedad != gasto
 * deducible" (§2 del prompt) y los guardarraíles de doble conteo (§26).
 */
describe('inmuebles (Sprint 2.4, Fase G)', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('vivienda personal nunca sugiere un gasto potencialmente deducible', async () => {
    const created = await createCase({ alias: 'Vivienda personal', taxYear: 2025 });
    const property = await createTaxProperty(created.id, {
      label: 'Apartamento donde vivo',
      propertyType: 'apartment',
      use: 'personal_residence',
      ownershipPercentage: 100,
      taxYear: 2025,
    });
    const expense = await createPropertyExpense(created.id, property.id, {
      expenseType: 'administration_fee',
      amountCop: 350_000,
      supportStatus: 'sufficient',
      supportTypes: ['administration_account_statement'],
    });
    expect(expense.eligibilityStatus).toBe('not_applicable');
  });

  it('arrendado con período, ingreso y soporte suficiente queda potencialmente deducible; sin período o sin ingreso requiere contexto', async () => {
    const created = await createCase({ alias: 'Arrendado', taxYear: 2025 });
    const property = await createTaxProperty(created.id, {
      label: 'Apartamento arrendado',
      propertyType: 'apartment',
      use: 'rented',
      ownershipPercentage: 100,
      taxYear: 2025,
    });
    // Sin período ni ingreso: requiere contexto, nunca asume los 12 meses.
    let expense = await createPropertyExpense(created.id, property.id, {
      expenseType: 'administration_fee',
      amountCop: 300_000,
      supportStatus: 'sufficient',
      supportTypes: ['administration_account_statement'],
    });
    expect(expense.eligibilityStatus).toBe('requires_context');

    const activity = await createRentalActivity(created.id, property.id, {
      from: '2025-01-01',
      to: '2025-12-31',
      monthsCovered: 12,
    });
    // Con período pero sin ingreso conciliado, sigue en requires_context.
    const expenses = await getPropertyExpenses(created.id);
    expect(expenses[0]?.eligibilityStatus).toBe('requires_context');

    await linkRentalIncome(created.id, {
      propertyId: property.id,
      rentalActivityId: activity.id,
      sourceKind: 'manual',
      sourceId: null,
      amountCop: 12_000_000,
      period: '2025',
    });
    const [recalculated] = await getPropertyExpenses(created.id);
    expect(recalculated?.eligibilityStatus).toBe('potentially_deductible');
    expense = recalculated!;

    // Confirmar/descartar es siempre una decisión humana explícita.
    expect(expense.decisionStatus).toBe('pending');
    const confirmed = await decidePropertyExpense(expense.id, 'confirmed');
    expect(confirmed?.decisionStatus).toBe('confirmed');
  });

  it('uso mixto sin asignación requiere asignación; nunca asume 50 % por defecto', async () => {
    const created = await createCase({ alias: 'Mixto', taxYear: 2025 });
    const property = await createTaxProperty(created.id, {
      label: 'Local mixto',
      propertyType: 'commercial',
      use: 'mixed',
      ownershipPercentage: 100,
      taxYear: 2025,
    });
    let expense = await createPropertyExpense(created.id, property.id, {
      expenseType: 'maintenance',
      amountCop: 200_000,
      supportStatus: 'sufficient',
      supportTypes: [],
    });
    expect(expense.eligibilityStatus).toBe('requires_allocation');

    const updated = await updatePropertyExpense(expense.id, {
      allocationMethod: 'percentage',
      allocationPercentage: 60,
    });
    expect(updated?.eligibilityStatus).not.toBe('requires_allocation');
  });

  it('administración de PH nunca exige factura: cuenta de cobro o certificado de la copropiedad bastan', async () => {
    const created = await createCase({ alias: 'Administración PH', taxYear: 2025 });
    const property = await createTaxProperty(created.id, {
      label: 'Apartamento arrendado',
      propertyType: 'apartment',
      use: 'rented',
      ownershipPercentage: 100,
      taxYear: 2025,
    });
    const activity = await createRentalActivity(created.id, property.id, {
      from: '2025-01-01',
      to: '2025-12-31',
      monthsCovered: 12,
    });
    await linkRentalIncome(created.id, {
      propertyId: property.id,
      rentalActivityId: activity.id,
      sourceKind: 'manual',
      sourceId: null,
      amountCop: 12_000_000,
    });
    const expense = await createPropertyExpense(created.id, property.id, {
      expenseType: 'administration_fee',
      amountCop: 350_000,
      supportStatus: 'missing',
      supportTypes: [],
    });
    expect(expense.eligibilityStatus).toBe('requires_support');
    expect(expense.eligibilityReasons.join(' ')).toContain('cuenta de cobro');
    expect(expense.eligibilityReasons.join(' ')).not.toMatch(/factura (electrónica )?(es obligatoria|requerida|exigida)/);

    const withSupport = await updatePropertyExpense(expense.id, {
      supportStatus: 'sufficient',
      supportTypes: ['administration_account_statement'],
    });
    expect(withSupport?.eligibilityStatus).toBe('potentially_deductible');
  });

  it('una cuota extraordinaria de administración siempre requiere revisión, nunca se mezcla con la ordinaria', async () => {
    const created = await createCase({ alias: 'Cuota extraordinaria', taxYear: 2025 });
    const property = await createTaxProperty(created.id, {
      label: 'Apartamento arrendado',
      propertyType: 'apartment',
      use: 'rented',
      ownershipPercentage: 100,
      taxYear: 2025,
    });
    const activity = await createRentalActivity(created.id, property.id, {
      from: '2025-01-01',
      to: '2025-12-31',
      monthsCovered: 12,
    });
    await linkRentalIncome(created.id, {
      propertyId: property.id,
      rentalActivityId: activity.id,
      sourceKind: 'manual',
      sourceId: null,
      amountCop: 12_000_000,
    });
    const expense = await createPropertyExpense(created.id, property.id, {
      expenseType: 'administration_fee',
      amountCop: 1_500_000,
      supportStatus: 'sufficient',
      supportTypes: ['administration_account_statement'],
      isExtraordinary: true,
    });
    expect(expense.eligibilityStatus).toBe('requires_review');
  });

  it('un posible duplicado (§26) requiere revisión antes que cualquier otro criterio', async () => {
    const created = await createCase({ alias: 'Duplicado', taxYear: 2025 });
    const property = await createTaxProperty(created.id, {
      label: 'Apartamento arrendado',
      propertyType: 'apartment',
      use: 'rented',
      ownershipPercentage: 100,
      taxYear: 2025,
    });
    const activity = await createRentalActivity(created.id, property.id, {
      from: '2025-01-01',
      to: '2025-12-31',
      monthsCovered: 12,
    });
    await linkRentalIncome(created.id, {
      propertyId: property.id,
      rentalActivityId: activity.id,
      sourceKind: 'manual',
      sourceId: null,
      amountCop: 12_000_000,
    });
    const monthlyExpense = await createPropertyExpense(created.id, property.id, {
      expenseType: 'administration_fee',
      amountCop: 300_000,
      supportStatus: 'sufficient',
      supportTypes: ['administration_account_statement'],
    });
    expect(monthlyExpense.eligibilityStatus).toBe('potentially_deductible');

    // Un segundo gasto marcado como posible duplicado del primero (p. ej.
    // el mismo concepto capturado como total anual) nunca se declara
    // deducible solo porque el resto del contexto esté completo.
    const annualExpense = await createPropertyExpense(created.id, property.id, {
      expenseType: 'administration_fee',
      amountCop: 3_600_000,
      supportStatus: 'sufficient',
      supportTypes: ['administration_account_statement'],
      possiblyDuplicateOfExpenseId: monthlyExpense.id,
    });
    expect(annualExpense.eligibilityStatus).toBe('requires_review');
  });

  it('intereses de vivienda ya confirmados como hecho documental se marcan como posible duplicado', async () => {
    const created = await createCase({ alias: 'Intereses vivienda', taxYear: 2025 });
    const property = await createTaxProperty(created.id, {
      label: 'Apartamento arrendado',
      propertyType: 'apartment',
      use: 'rented',
      ownershipPercentage: 100,
      taxYear: 2025,
    });
    const activity = await createRentalActivity(created.id, property.id, {
      from: '2025-01-01',
      to: '2025-12-31',
      monthsCovered: 12,
    });
    await linkRentalIncome(created.id, {
      propertyId: property.id,
      rentalActivityId: activity.id,
      sourceKind: 'manual',
      sourceId: null,
      amountCop: 12_000_000,
    });
    const expense = await createPropertyExpense(created.id, property.id, {
      expenseType: 'mortgage_interest',
      amountCop: 2_000_000,
      supportStatus: 'sufficient',
      supportTypes: [],
      relatedFactId: 'fact-housing-interest-1',
    });
    expect(expense.eligibilityStatus).toBe('requires_review');
  });

  it('elimina el inmueble y sus dependencias (actividad, ingreso, gastos)', async () => {
    const created = await createCase({ alias: 'Eliminar inmueble', taxYear: 2025 });
    const property = await createTaxProperty(created.id, {
      label: 'Apartamento a eliminar',
      propertyType: 'apartment',
      use: 'rented',
      ownershipPercentage: 100,
      taxYear: 2025,
    });
    const activity = await createRentalActivity(created.id, property.id, {
      from: '2025-01-01',
      to: '2025-12-31',
      monthsCovered: 12,
    });
    const income = await linkRentalIncome(created.id, {
      propertyId: property.id,
      rentalActivityId: activity.id,
      sourceKind: 'manual',
      sourceId: null,
      amountCop: 12_000_000,
    });
    const expense = await createPropertyExpense(created.id, property.id, {
      expenseType: 'administration_fee',
      amountCop: 300_000,
      supportStatus: 'sufficient',
      supportTypes: ['administration_account_statement'],
    });

    await deleteTaxProperty(property.id);

    expect(await getTaxProperties(created.id)).toHaveLength(0);
    expect((await getRentalActivities(created.id)).find((item) => item.id === activity.id)).toBeUndefined();
    expect((await getRentalIncomes(created.id)).find((item) => item.id === income.id)).toBeUndefined();
    expect((await getPropertyExpenses(created.id)).find((item) => item.id === expense.id)).toBeUndefined();
  });

  it('cambiar el uso del inmueble a residencia personal recalcula en cascada los gastos existentes', async () => {
    const created = await createCase({ alias: 'Cambio de uso', taxYear: 2025 });
    const property = await createTaxProperty(created.id, {
      label: 'Apartamento',
      propertyType: 'apartment',
      use: 'rented',
      ownershipPercentage: 100,
      taxYear: 2025,
    });
    const activity = await createRentalActivity(created.id, property.id, {
      from: '2025-01-01',
      to: '2025-12-31',
      monthsCovered: 12,
    });
    await linkRentalIncome(created.id, {
      propertyId: property.id,
      rentalActivityId: activity.id,
      sourceKind: 'manual',
      sourceId: null,
      amountCop: 12_000_000,
    });
    const expense = await createPropertyExpense(created.id, property.id, {
      expenseType: 'administration_fee',
      amountCop: 300_000,
      supportStatus: 'sufficient',
      supportTypes: ['administration_account_statement'],
    });
    expect(expense.eligibilityStatus).toBe('potentially_deductible');

    await updateTaxProperty(property.id, { use: 'personal_residence' });
    const [recalculated] = await getPropertyExpenses(created.id);
    expect(recalculated?.eligibilityStatus).toBe('not_applicable');
  });

  it('eliminar el único período de arrendamiento revierte el gasto a requires_context', async () => {
    const created = await createCase({ alias: 'Quitar periodo', taxYear: 2025 });
    const property = await createTaxProperty(created.id, {
      label: 'Apartamento',
      propertyType: 'apartment',
      use: 'rented',
      ownershipPercentage: 100,
      taxYear: 2025,
    });
    const activity = await createRentalActivity(created.id, property.id, {
      from: '2025-01-01',
      to: '2025-12-31',
      monthsCovered: 12,
    });
    await linkRentalIncome(created.id, {
      propertyId: property.id,
      rentalActivityId: activity.id,
      sourceKind: 'manual',
      sourceId: null,
      amountCop: 12_000_000,
    });
    const expense = await createPropertyExpense(created.id, property.id, {
      expenseType: 'administration_fee',
      amountCop: 300_000,
      supportStatus: 'sufficient',
      supportTypes: ['administration_account_statement'],
    });
    expect(expense.eligibilityStatus).toBe('potentially_deductible');

    await removeRentalActivity(activity.id);
    const [recalculated] = await getPropertyExpenses(created.id);
    expect(recalculated?.eligibilityStatus).toBe('requires_context');
  });

  it('quitar el ingreso vinculado revierte el gasto a requires_context', async () => {
    const created = await createCase({ alias: 'Quitar ingreso', taxYear: 2025 });
    const property = await createTaxProperty(created.id, {
      label: 'Apartamento',
      propertyType: 'apartment',
      use: 'rented',
      ownershipPercentage: 100,
      taxYear: 2025,
    });
    const activity = await createRentalActivity(created.id, property.id, {
      from: '2025-01-01',
      to: '2025-12-31',
      monthsCovered: 12,
    });
    const income = await linkRentalIncome(created.id, {
      propertyId: property.id,
      rentalActivityId: activity.id,
      sourceKind: 'manual',
      sourceId: null,
      amountCop: 12_000_000,
    });
    const expense = await createPropertyExpense(created.id, property.id, {
      expenseType: 'administration_fee',
      amountCop: 300_000,
      supportStatus: 'sufficient',
      supportTypes: ['administration_account_statement'],
    });
    expect(expense.eligibilityStatus).toBe('potentially_deductible');

    await removeRentalIncome(income.id);
    const [recalculated] = await getPropertyExpenses(created.id);
    expect(recalculated?.eligibilityStatus).toBe('requires_context');
  });

  it('elimina un gasto individual sin afectar los demás', async () => {
    const created = await createCase({ alias: 'Eliminar gasto', taxYear: 2025 });
    const property = await createTaxProperty(created.id, {
      label: 'Apartamento',
      propertyType: 'apartment',
      use: 'personal_residence',
      ownershipPercentage: 100,
      taxYear: 2025,
    });
    const first = await createPropertyExpense(created.id, property.id, {
      expenseType: 'property_tax',
      amountCop: 500_000,
      supportStatus: 'sufficient',
      supportTypes: [],
    });
    await createPropertyExpense(created.id, property.id, {
      expenseType: 'maintenance',
      amountCop: 100_000,
      supportStatus: 'sufficient',
      supportTypes: [],
    });
    await removePropertyExpense(first.id);
    const remaining = await getPropertyExpenses(created.id);
    expect(remaining).toHaveLength(1);
    expect(remaining[0]?.expenseType).toBe('maintenance');
  });
});
