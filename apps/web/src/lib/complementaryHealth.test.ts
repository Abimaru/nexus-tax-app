import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { processWorkbookFile } from '@nexus-tax/exogenous-parser';
import {
  addDependentSupport,
  createCase,
  createComplementaryHealthPayment,
  createTaxDependent,
  decideComplementaryHealthPayment,
  getComplementaryHealthPayments,
  getForm210Draft,
  removeComplementaryHealthPayment,
  saveDependentsCaseContext,
  saveResult,
  updateComplementaryHealthPayment,
} from './repository';
import { getDb } from './db';

function employmentResult() {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ['NIT', 'Nombre', 'Concepto', 'Valor'],
    ['9001', 'Empleador Sintético SAS', 'Salarios', 60_000_000],
  ]);
  XLSX.utils.book_append_sheet(wb, ws, 'Datos');
  return processWorkbookFile(
    XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer,
    'laboral.xlsx',
    1,
    { sheetName: 'Datos' },
  );
}

async function resetDatabase() {
  const db = getDb();
  await db.delete();
  await db.open();
}

/**
 * Salud complementaria y medicina prepagada (Sprint 2.4, Fase H). Cubre
 * los escenarios de integración H/I/J/O del prompt (§21) que necesitan el
 * repositorio real: beneficiario contribuyente/cónyuge/dependiente
 * vinculado, y ausencia de doble conteo entre dependientes (art. 387,
 * beneficio 1) y salud complementaria (art. 387, beneficio 2 — mismo
 * artículo, deducciones independientes).
 */
describe('salud complementaria (Sprint 2.4, Fase H)', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('H. taxpayer beneficiario: elegible y cablea a la casilla 39 del Formulario 210', async () => {
    const created = await createCase({ alias: 'Salud taxpayer', taxYear: 2025 });
    const payment = await createComplementaryHealthPayment(created.id, {
      providerName: 'Medicina Prepagada Sintética SAS',
      productType: 'prepaid_medicine',
      beneficiary: 'taxpayer',
      month: 1,
      amountPaidCop: 300_000,
      supportStatus: 'sufficient',
      supportTypes: ['prepaid_medicine_certificate'],
    });
    expect(payment.eligibilityStatus).toBe('eligible');
    expect(payment.eligibleAmountCop).toBe(300_000);
    const draft = await getForm210Draft(created.id);
    const box39 = draft?.boxes.find((box) => box.number === 39);
    expect(box39?.suggestedValue).toBe(300_000);
  });

  it('I. spouse (cónyuge/compañero permanente) beneficiario: elegible', async () => {
    const created = await createCase({ alias: 'Salud spouse', taxYear: 2025 });
    const payment = await createComplementaryHealthPayment(created.id, {
      providerName: 'Aseguradora Sintética S.A.',
      productType: 'health_insurance',
      beneficiary: 'spouse_or_partner',
      month: 3,
      amountPaidCop: 250_000,
      supportStatus: 'sufficient',
      supportTypes: ['health_insurance_certificate'],
    });
    expect(payment.eligibilityStatus).toBe('eligible');
  });

  it('J. dependent vinculado a un TaxDependent existente: elegible; sin vincular queda en revisión de beneficiario', async () => {
    const created = await createCase({ alias: 'Salud dependiente', taxYear: 2025 });
    const dependent = await createTaxDependent(created.id, {
      fullName: 'Hijo Menor Sintético',
      documentType: 'RC',
      documentNumber: '1000000099',
      relationship: 'child_minor',
      dateOfBirth: '2016-01-01',
      dependencyType: 'not_applicable',
      studentStatus: 'not_applicable',
      monthsClaimed: 12,
    });

    const unlinked = await createComplementaryHealthPayment(created.id, {
      providerName: 'Medicina Prepagada Sintética SAS',
      productType: 'prepaid_medicine',
      beneficiary: 'dependent',
      beneficiaryDependentId: null,
      month: 1,
      amountPaidCop: 200_000,
      supportStatus: 'sufficient',
      supportTypes: ['prepaid_medicine_certificate'],
    });
    expect(unlinked.eligibilityStatus).toBe('requires_beneficiary_review');

    const linked = await createComplementaryHealthPayment(created.id, {
      providerName: 'Medicina Prepagada Sintética SAS',
      productType: 'prepaid_medicine',
      beneficiary: 'dependent',
      beneficiaryDependentId: dependent.id,
      month: 2,
      amountPaidCop: 200_000,
      supportStatus: 'sufficient',
      supportTypes: ['prepaid_medicine_certificate'],
    });
    expect(linked.eligibilityStatus).toBe('eligible');
  });

  it('N. no double counting: eliminar un pago recalcula el tope agregado sin arrastrar el valor anterior', async () => {
    const created = await createCase({ alias: 'Sin doble conteo', taxYear: 2025 });
    const monthlyCapCop = Math.round(16 * 49_799);
    const a = await createComplementaryHealthPayment(created.id, {
      providerName: 'Proveedor A',
      productType: 'prepaid_medicine',
      beneficiary: 'taxpayer',
      month: 1,
      amountPaidCop: monthlyCapCop + 100_000, // por sí solo ya excede el tope de enero.
      supportStatus: 'sufficient',
      supportTypes: ['prepaid_medicine_certificate'],
    });
    const b = await createComplementaryHealthPayment(created.id, {
      providerName: 'Proveedor B',
      productType: 'health_insurance',
      beneficiary: 'taxpayer',
      month: 1,
      amountPaidCop: 200_000,
      supportStatus: 'sufficient',
      supportTypes: ['health_insurance_certificate'],
    });
    // Con ambos presentes, el tope se reparte proporcionalmente entre A y B.
    let payments = await getComplementaryHealthPayments(created.id);
    const totalWithBoth = payments.reduce((sum, item) => sum + (item.eligibleAmountCop ?? 0), 0);
    expect(totalWithBoth).toBe(monthlyCapCop);

    // Al eliminar B, el tope debe seguir siendo 796.784 (nunca la suma de
    // ambos valores originales ni un remanente del reparto anterior).
    await removeComplementaryHealthPayment(b.id);
    payments = await getComplementaryHealthPayments(created.id);
    expect(payments).toHaveLength(1);
    expect(payments[0]!.id).toBe(a.id);
    expect(payments[0]!.eligibleAmountCop).toBe(monthlyCapCop);
    expect(payments[0]!.eligibilityStatus).toBe('cap_applied');
  });

  it('O. integración con dependientes: la deducción de dependientes (beneficio 1) y de salud (beneficio 2) coexisten sin fusionarse', async () => {
    const created = await createCase({ alias: 'Coexistencia 387', taxYear: 2025 });
    await saveResult(created.id, employmentResult());
    await saveDependentsCaseContext(created.id, { employmentIncomeNature: 'labor_relation' });
    const dependent = await createTaxDependent(created.id, {
      fullName: 'Hijo Menor Sintético',
      documentType: 'RC',
      documentNumber: '1000000098',
      relationship: 'child_minor',
      dateOfBirth: '2016-01-01',
      dependencyType: 'not_applicable',
      studentStatus: 'not_applicable',
      monthsClaimed: 12,
    });
    await addDependentSupport(dependent.id, created.id, 'civil_registry', null);
    await createComplementaryHealthPayment(created.id, {
      providerName: 'Medicina Prepagada Sintética SAS',
      productType: 'prepaid_medicine',
      beneficiary: 'taxpayer',
      month: 1,
      amountPaidCop: 300_000,
      supportStatus: 'sufficient',
      supportTypes: ['prepaid_medicine_certificate'],
    });
    const draft = await getForm210Draft(created.id);
    const box39 = draft?.boxes.find((box) => box.number === 39);
    // Ambas fuentes deben coexistir en la casilla 39, nunca reemplazarse.
    expect(box39?.sources.map((source) => source.sourceId)).toEqual(
      expect.arrayContaining(['calc:dependents-387', 'calc:complementary-health-387']),
    );
    expect(draft?.preliminaryLiquidation?.dependentsDeduction).not.toBeNull();
    expect(draft?.preliminaryLiquidation?.dependentsDeduction?.appliedDeductionCop).toBeGreaterThan(0);
    expect(draft?.preliminaryLiquidation?.complementaryHealthDeduction).not.toBeNull();
  });

  it('§9 aporte obligatorio a EPS: not_applicable, nunca cablea a la casilla 39', async () => {
    const created = await createCase({ alias: 'EPS excluida', taxYear: 2025 });
    const payment = await createComplementaryHealthPayment(created.id, {
      providerName: 'EPS Sintética',
      productType: 'other',
      beneficiary: 'taxpayer',
      month: 1,
      amountPaidCop: 200_000,
      supportStatus: 'sufficient',
      isMandatoryEpsContribution: true,
    });
    expect(payment.eligibilityStatus).toBe('not_applicable');
    const draft = await getForm210Draft(created.id);
    const box39 = draft?.boxes.find((box) => box.number === 39);
    expect(box39?.sources.some((source) => source.sourceId === 'calc:complementary-health-387')).toBe(
      false,
    );
  });

  it('§10 gasto médico directo: not_applicable', async () => {
    const created = await createCase({ alias: 'Gasto directo excluido', taxYear: 2025 });
    const payment = await createComplementaryHealthPayment(created.id, {
      providerName: 'Clínica Sintética',
      productType: 'other',
      beneficiary: 'taxpayer',
      month: 1,
      amountPaidCop: 500_000,
      supportStatus: 'sufficient',
      isDirectMedicalExpense: true,
    });
    expect(payment.eligibilityStatus).toBe('not_applicable');
  });

  it('§7/§8 certificado anual sin mes: requires_monthly_breakdown, nunca total/12', async () => {
    const created = await createCase({ alias: 'Sin detalle mensual', taxYear: 2025 });
    const payment = await createComplementaryHealthPayment(created.id, {
      providerName: 'Medicina Prepagada Sintética SAS',
      productType: 'prepaid_medicine',
      beneficiary: 'taxpayer',
      month: null,
      amountPaidCop: 3_600_000,
      supportStatus: 'sufficient',
      supportTypes: ['prepaid_medicine_certificate'],
    });
    expect(payment.eligibilityStatus).toBe('requires_monthly_breakdown');
    expect(payment.eligibleAmountCop).toBeNull();
  });

  it('decisión humana explícita: nunca se autoconfirma', async () => {
    const created = await createCase({ alias: 'Decisión humana', taxYear: 2025 });
    const payment = await createComplementaryHealthPayment(created.id, {
      providerName: 'Medicina Prepagada Sintética SAS',
      productType: 'prepaid_medicine',
      beneficiary: 'taxpayer',
      month: 1,
      amountPaidCop: 300_000,
      supportStatus: 'sufficient',
      supportTypes: ['prepaid_medicine_certificate'],
    });
    expect(payment.decisionStatus).toBe('pending');
    const confirmed = await decideComplementaryHealthPayment(payment.id, 'confirmed');
    expect(confirmed?.decisionStatus).toBe('confirmed');
  });

  it('actualizar el mes de un pago recalcula el tope agregado', async () => {
    const created = await createCase({ alias: 'Actualizar mes', taxYear: 2025 });
    const payment = await createComplementaryHealthPayment(created.id, {
      providerName: 'Medicina Prepagada Sintética SAS',
      productType: 'prepaid_medicine',
      beneficiary: 'taxpayer',
      month: null,
      amountPaidCop: 300_000,
      supportStatus: 'sufficient',
      supportTypes: ['prepaid_medicine_certificate'],
    });
    expect(payment.eligibilityStatus).toBe('requires_monthly_breakdown');
    const updated = await updateComplementaryHealthPayment(payment.id, { month: 5 });
    expect(updated?.eligibilityStatus).toBe('eligible');
    expect(updated?.eligibleAmountCop).toBe(300_000);
  });
});
