import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { processWorkbookFile } from '@nexus-tax/exogenous-parser';
import {
  DEFAULT_PDF_LIMITS,
  classifyDocument,
  detectSemanticContradiction,
  extractCandidates,
  extractPriorYearForm210,
  suggestExogenousMatches,
  type DocumentPageRepresentation,
  type DocumentRepresentation,
} from '@nexus-tax/document-intelligence';
import { evaluatePropertyExpenseEligibility } from '@nexus-tax/aegis-rules';
import { getDb } from './db';
import {
  addDependentSupport,
  createCase,
  createComplementaryHealthPayment,
  createPropertyExpense,
  createRentalActivity,
  createTaxDependent,
  createTaxProperty,
  getCase,
  getComplementaryHealthPayments,
  getDependentEvaluations,
  getElectronicInvoicePurchases,
  getForm210Draft,
  getPriorYearCarryForwardCandidates,
  getPropertyExpenses,
  importElectronicInvoiceReport,
  linkRentalIncome,
  refreshPriorYearCarryForwardCandidates,
  saveDependentsCaseContext,
  savePriorYearReturn,
  saveResult,
} from './repository';
import { buildEvidenceReviewSuggestions, buildExpectedTaxEvidence, computeHumanReviewBurden } from './evidenceReview';
import { buildPriorYearReturnFromExtraction, checkPriorYearIdentity } from './priorYearReturns';
import {
  GOLDEN_CASE_PROFILE,
  GOLDEN_DEPENDENT_INPUT,
  GOLDEN_DOCUMENTS,
  GOLDEN_ELECTRONIC_INVOICE_EXPECTATIONS,
  GOLDEN_EXOGENOUS_RECORDS,
  GOLDEN_EXOGENOUS_VALUES,
  GOLDEN_HEALTH_EXPECTED_ANNUAL_ELIGIBLE_COP,
  GOLDEN_HEALTH_MONTHLY_CAP_COP,
  GOLDEN_HEALTH_PAYMENT_DEPENDENT_COP,
  GOLDEN_HEALTH_PAYMENT_JANUARY_COP,
  GOLDEN_HEALTH_PAYMENT_JUNE_COP,
  GOLDEN_HEALTH_PROVIDER,
  GOLDEN_PRIOR_YEAR_TEXT_LINES,
  GOLDEN_PROPERTY_EXPENSE_INPUT,
  GOLDEN_PROPERTY_INPUT,
  GOLDEN_RENTAL_ACTIVITY_INPUT,
  GOLDEN_RENTAL_INCOME_AMOUNT_COP,
  buildGoldenElectronicInvoiceWorkbook,
  buildGoldenExogenousWorkbook,
  toLocalFileInput,
} from './goldenCase';

/**
 * Suite de coherencia del caso sintético "golden case" (Sprint 2.4, Fase
 * G.1). No es una demo de UI: ejercita el pipeline REAL (parser de
 * exógena, adaptadores documentales, matcher, motor de inmuebles,
 * dependientes, facturación electrónica, declaración anterior) para
 * demostrar que el caso es internamente coherente y sigue produciendo los
 * mismos resultados ante cambios futuros (regresión).
 *
 * Ningún valor proviene de un expediente real — ver `goldenCase.ts` y
 * `docs/SYNTHETIC_SAMPLE_CASE.md`.
 */

/** Construye una `DocumentRepresentation` de texto plano, sin PDF binario (§6 del prompt). */
function representation(...pages: readonly string[]): DocumentRepresentation {
  const built: DocumentPageRepresentation[] = pages.map((text, index) => ({
    pageNumber: index + 1,
    normalizedText: text,
    blocks: [{ text }],
    width: 612,
    height: 792,
    errors: [],
    readConfidence: text ? 'high' : 'insufficient',
  }));
  return { pageCount: built.length, pages: built, metadata: {}, encrypted: false, warnings: [] };
}

async function resetDatabase() {
  const db = getDb();
  await db.delete();
  await db.open();
}

const CONTEXT = {
  caseId: 'case:golden',
  documentId: 'document:golden',
  sessionId: 'session:golden',
  timestamp: '2026-09-08T00:00:00.000Z',
};

/** Valores del benchmark real (Fase F/F.1) que NUNCA deben reaparecer aquí (§19 del prompt). */
const REAL_BENCHMARK_DOCUMENT_NUMBERS = ['1130641532', '1130671777'];

describe('caso sintético golden case (Sprint 2.4, Fase G.1)', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  describe('§19 privacidad — guardarraíl permanente', () => {
    it('ningún identificador del golden case coincide con los documentos del benchmark real', () => {
      const serialized = JSON.stringify({
        GOLDEN_CASE_PROFILE,
        GOLDEN_EXOGENOUS_RECORDS,
        GOLDEN_DOCUMENTS,
        GOLDEN_PRIOR_YEAR_TEXT_LINES,
      });
      for (const real of REAL_BENCHMARK_DOCUMENT_NUMBERS) {
        expect(serialized).not.toContain(real);
      }
    });

    it('el documento del contribuyente es un patrón obviamente sintético (todo ceros salvo el último dígito)', () => {
      expect(GOLDEN_CASE_PROFILE.documentNumber).toBe('1000000001');
    });
  });

  describe('§17 coherencia interna — exógena', () => {
    it('el libro exógeno se procesa sin errores y reconoce la identidad del contribuyente', () => {
      const buffer = buildGoldenExogenousWorkbook();
      const result = processWorkbookFile(buffer, 'exogena-golden-case.xlsx', buffer.byteLength, {
        sheetName: 'Reporte',
      });
      expect(result.report.taxpayer?.documentType).toBe('CC');
      expect(result.report.taxpayer?.documentNormalized).toBe(GOLDEN_CASE_PROFILE.documentNumber);
      expect(result.normalizedRecords.length).toBe(GOLDEN_EXOGENOUS_RECORDS.length);
    });

    it('clasifica cada registro en la categoría esperada (salarios, rendimientos, retención, saldo, cesantías, pensión)', () => {
      const buffer = buildGoldenExogenousWorkbook();
      const result = processWorkbookFile(buffer, 'exogena-golden-case.xlsx', buffer.byteLength, {
        sheetName: 'Reporte',
      });
      const byDetail = new Map(result.normalizedRecords.map((record) => [record.conceptLabel, record]));
      expect(byDetail.get('Salarios')?.category).toBe('employment_income');
      expect(byDetail.get('Rendimientos financieros')?.category).toBe('financial_income');
      expect(byDetail.get('Retencion en la fuente')?.category).toBe('withholding');
      expect(byDetail.get('Saldo cuenta bancaria')?.category).toBe('asset');
      expect(byDetail.get('Aporte a cesantias')?.category).toBe('severance');
    });

    it('los cinco topes se reconocen por contenido con los valores esperados (nunca por posición de fila)', () => {
      const buffer = buildGoldenExogenousWorkbook();
      const result = processWorkbookFile(buffer, 'exogena-golden-case.xlsx', buffer.byteLength, {
        sheetName: 'Reporte',
      });
      const byLabel = new Map(result.report.thresholds.map((threshold) => [threshold.label, threshold]));
      expect(byLabel.get('Patrimonio bruto')?.value).toBe(GOLDEN_EXOGENOUS_VALUES.thresholdAssets);
      expect(byLabel.get('Ingresos brutos')?.value).toBe(GOLDEN_EXOGENOUS_VALUES.thresholdIncome);
      expect(byLabel.get('Consumos con tarjeta')?.value).toBe(
        GOLDEN_EXOGENOUS_VALUES.thresholdCardConsumption,
      );
      expect(byLabel.get('Compras y consumos')?.value).toBe(GOLDEN_EXOGENOUS_VALUES.thresholdPurchases);
      expect(byLabel.get('Consignaciones bancarias')?.value).toBe(
        GOLDEN_EXOGENOUS_VALUES.thresholdBankMovements,
      );
    });
  });

  describe('§6/§17 coherencia documental — cada documento resuelve el adaptador esperado', () => {
    it.each(GOLDEN_DOCUMENTS)('$key ($kind) es clasificado y extrae al menos un candidato', (spec) => {
      const document = representation(...spec.pages);
      const classification = classifyDocument(document);
      expect(['medium', 'high']).toContain(classification.confidence);
      const extraction = extractCandidates(document, spec.kind, CONTEXT, DEFAULT_PDF_LIMITS);
      expect(extraction.candidates.length).toBeGreaterThan(0);
    });
  });

  describe('§7 tabla de reconciliaciones esperada', () => {
    let normalizedRecords: ReturnType<typeof processWorkbookFile>['normalizedRecords'];

    beforeEach(() => {
      const buffer = buildGoldenExogenousWorkbook();
      normalizedRecords = processWorkbookFile(buffer, 'exogena-golden-case.xlsx', buffer.byteLength, {
        sheetName: 'Reporte',
      }).normalizedRecords;
    });

    function candidateByRule(kind: (typeof GOLDEN_DOCUMENTS)[number]['kind'], ruleId: string) {
      const spec = GOLDEN_DOCUMENTS.find((item) => item.kind === kind)!;
      const document = representation(...spec.pages);
      const extraction = extractCandidates(document, kind, CONTEXT, DEFAULT_PDF_LIMITS);
      const candidate = extraction.candidates.find((item) => item.ruleId === ruleId);
      expect(candidate, `no se encontró el candidato de la regla "${ruleId}"`).toBeDefined();
      return candidate!;
    }

    it('A. exact_match — rendimientos financieros', () => {
      const candidate = candidateByRule('consolidated_tax_certificate', 'interest');
      const matches = suggestExogenousMatches(candidate, normalizedRecords);
      const financialRecord = normalizedRecords.find(
        (record) => record.conceptLabel === 'Rendimientos financieros' && record.entityName === GOLDEN_CASE_PROFILE.bank.name,
      )!;
      const match = matches.find((item) => item.recordId === financialRecord.id);
      expect(match?.status).toBe('exact_match');
    });

    it('B. rounding_match — retención en la fuente (centavos que redondean al mismo peso)', () => {
      const candidate = candidateByRule('consolidated_tax_certificate', 'withholding');
      const matches = suggestExogenousMatches(candidate, normalizedRecords);
      const withholdingRecord = normalizedRecords.find((record) => record.category === 'withholding')!;
      const match = matches.find((item) => item.recordId === withholdingRecord.id);
      expect(match?.status).toBe('rounding_match');
    });

    it('C. minor_difference — saldo cuenta bancaria ($80 de diferencia dentro de la tolerancia)', () => {
      const candidate = candidateByRule('consolidated_tax_certificate', 'closing-balance');
      const matches = suggestExogenousMatches(candidate, normalizedRecords);
      const balanceRecord = normalizedRecords.find(
        (record) => record.conceptLabel === 'Saldo cuenta bancaria',
      )!;
      const match = matches.find((item) => item.recordId === balanceRecord.id);
      expect(match?.status).toBe('minor_difference');
      expect(match?.difference).toBe(80);
    });

    it('D. semantic contradiction — un candidato adversario nunca queda exact/rounding aunque el valor coincida', () => {
      // Construido deliberadamente para ejercitar el gate semántico
      // (`detectSemanticContradiction`), NO producido por los adaptadores
      // reales del golden case (que ya evitan esta clasificación errónea
      // desde la raíz, Fase F.2). Representa "lo que un extractor menos
      // protegido podría producir" — el mismo escenario documentado en
      // `docs/EVIDENCE_MATCHING.md` §Fase F.2.
      const contradiction = detectSemanticContradiction({
        originalConcept: 'Retencion en la fuente sobre rendimientos financieros',
        normalizedConcept: 'retencion en la fuente sobre rendimientos financieros',
        proposedCategory: 'financial_income',
      });
      expect(contradiction.contradictory).toBe(true);
      expect(contradiction.marker).toBe('withholding');
      expect(contradiction.reason).not.toMatch(/semantic|score/i);
    });

    it('E. document_only — intereses de vivienda no tienen ningún registro exógeno que los reporte', () => {
      const candidate = candidateByRule('housing_interest_certificate', 'housing-interest');
      const matches = suggestExogenousMatches(candidate, normalizedRecords);
      expect(matches).toHaveLength(0);
      expect(
        normalizedRecords.some((record) => record.category === 'housing_interest'),
      ).toBe(false);
    });

    it('F. exogenous-only — aportes obligatorios a pensión generan una acción comprensible (captura manual)', () => {
      const expected = buildExpectedTaxEvidence({ caseId: CONTEXT.caseId, result: buildResultStub(normalizedRecords) });
      const pensionExpectation = expected.find(
        (item) => item.conceptLabel === 'Aportes obligatorios a pension a cargo del trabajador',
      );
      expect(pensionExpectation).toBeDefined();
      const suggestions = buildEvidenceReviewSuggestions({
        caseId: CONTEXT.caseId,
        candidates: [],
        expectedEvidence: expected,
      });
      const suggestion = suggestions.find((item) => item.expectedEvidenceId === pensionExpectation!.id);
      expect(suggestion?.status).toBe('unresolved');
      expect(suggestion?.allowedActions).toContain('capture_manually');
    });

    it('G. ambigüedad realista — dos registros exógenos con el mismo valor empatan frente a un único candidato', () => {
      const candidate = candidateByRule('consolidated_tax_certificate', 'interest');
      // El candidato del rendimiento ambiguo es el segundo `interest` del
      // documento consolidado (mismo ruleId, dos ocurrencias).
      const spec = GOLDEN_DOCUMENTS.find((item) => item.kind === 'consolidated_tax_certificate')!;
      const document = representation(...spec.pages);
      const extraction = extractCandidates(document, 'consolidated_tax_certificate', CONTEXT, DEFAULT_PDF_LIMITS);
      const ambiguousCandidate = extraction.candidates.find(
        (item) => item.ruleId === 'interest' && item.extractedValue === GOLDEN_EXOGENOUS_VALUES.ambiguousValue,
      );
      expect(ambiguousCandidate, 'no se encontró el candidato ambiguo de rendimientos').toBeDefined();
      const matches = suggestExogenousMatches(ambiguousCandidate ?? candidate, normalizedRecords);
      const ambiguousRecords = normalizedRecords.filter(
        (record) => record.reportedValue === GOLDEN_EXOGENOUS_VALUES.ambiguousValue,
      );
      expect(ambiguousRecords).toHaveLength(2);
      const relatedMatches = matches.filter((match) =>
        ambiguousRecords.some((record) => record.id === match.recordId),
      );
      expect(relatedMatches.length).toBeGreaterThanOrEqual(2);
      expect(relatedMatches.every((match) => match.status === 'ambiguous')).toBe(true);
    });
  });

  describe('§8 facturación electrónica — sin doble conteo, CUFE únicos, base derivada por el motor real', () => {
    it('importa el reporte, calcula totales coherentes y NO hardcodea la base susceptible', async () => {
      const created = await createCase({ alias: GOLDEN_CASE_PROFILE.alias, taxYear: GOLDEN_CASE_PROFILE.taxYear });
      const buffer = buildGoldenElectronicInvoiceWorkbook();
      const report = await importElectronicInvoiceReport(
        created.id,
        GOLDEN_CASE_PROFILE.taxYear,
        toLocalFileInput('facturas-golden-case.xlsx', buffer),
      );
      expect(report).not.toBeNull();
      expect(report!.totals.grossTotalCop).toBe(GOLDEN_ELECTRONIC_INVOICE_EXPECTATIONS.grossTotalCop);
      expect(report!.totals.creditNoteTotalCop).toBe(
        GOLDEN_ELECTRONIC_INVOICE_EXPECTATIONS.creditNoteTotalCop,
      );
      expect(report!.totals.netTotalCop).toBe(GOLDEN_ELECTRONIC_INVOICE_EXPECTATIONS.netTotalCop);
      expect(report!.totals.eligibleBenefitTotalCop).toBe(
        GOLDEN_ELECTRONIC_INVOICE_EXPECTATIONS.eligibleBenefitTotalCop,
      );

      const purchases = await getElectronicInvoicePurchases(created.id);
      expect(purchases).toHaveLength(GOLDEN_ELECTRONIC_INVOICE_EXPECTATIONS.invoiceCount);
      const cufes = new Set(purchases.map((purchase) => purchase.normalizedCufe));
      expect(cufes.size).toBe(purchases.length);

      // La compra pagada en efectivo NUNCA participa del beneficio del 1 %,
      // aunque su CUFE sea válido y único (§8: anomalía comprensible).
      const cashPurchase = purchases.find((purchase) => purchase.paymentMethodRaw === 'Efectivo');
      expect(cashPurchase?.eligibleBenefitValue.roundedTaxValue).toBe(0);
    });

    it('el neto de la FE coincide con el Tope 5 de la exógena (compras) sin doble conteo', async () => {
      const created = await createCase({ alias: GOLDEN_CASE_PROFILE.alias, taxYear: GOLDEN_CASE_PROFILE.taxYear });
      const exogenousBuffer = buildGoldenExogenousWorkbook();
      const result = processWorkbookFile(
        exogenousBuffer,
        'exogena-golden-case.xlsx',
        exogenousBuffer.byteLength,
        { sheetName: 'Reporte' },
      );
      await saveResult(created.id, result);
      const feBuffer = buildGoldenElectronicInvoiceWorkbook();
      const report = await importElectronicInvoiceReport(
        created.id,
        GOLDEN_CASE_PROFILE.taxYear,
        toLocalFileInput('facturas-golden-case.xlsx', feBuffer),
      );
      expect(report!.totals.netTotalCop).toBe(GOLDEN_EXOGENOUS_VALUES.thresholdPurchases);
    });
  });

  describe('§9 dependiente — beneficios art. 387/336 coexisten sin decisión adicional (naturaleza laboral)', () => {
    it('el dependiente queda elegible tras aportar el soporte de registro civil, con ambos beneficios candidatos', async () => {
      const created = await createCase({ alias: GOLDEN_CASE_PROFILE.alias, taxYear: GOLDEN_CASE_PROFILE.taxYear });
      await saveDependentsCaseContext(created.id, { employmentIncomeNature: 'labor_relation' });
      const dependent = await createTaxDependent(created.id, GOLDEN_DEPENDENT_INPUT);
      let evaluations = await getDependentEvaluations(created.id);
      let evaluation = evaluations.find((item) => item.dependentId === dependent.id);
      expect(evaluation?.status).toBe('requires_support');

      await addDependentSupport(dependent.id, created.id, 'civil_registry', null);
      evaluations = await getDependentEvaluations(created.id);
      evaluation = evaluations.find((item) => item.dependentId === dependent.id);
      expect(evaluation?.status).toBe('eligible');
      expect(evaluation?.candidateBenefits).toContain('article_387');
      expect(evaluation?.candidateBenefits).toContain('article_336');
    });
  });

  describe('§10 inmueble — apartamento arrendado, sin gasto automático', () => {
    it('el gasto de administración queda "potencialmente deducible" solo tras registrar período e ingreso', async () => {
      const created = await createCase({ alias: GOLDEN_CASE_PROFILE.alias, taxYear: GOLDEN_CASE_PROFILE.taxYear });
      const property = await createTaxProperty(created.id, GOLDEN_PROPERTY_INPUT);
      // Antes de registrar período/ingreso, el motor puro nunca sugiere
      // el gasto como deducible (§2 de Fase G: propiedad != deducción).
      const beforeContext = evaluatePropertyExpenseEligibility({
        taxYear: GOLDEN_CASE_PROFILE.taxYear,
        propertyUse: property.use,
        expenseType: GOLDEN_PROPERTY_EXPENSE_INPUT.expenseType,
        hasCompatibleRentalIncome: false,
        hasRentalPeriodDefined: false,
        supportStatus: GOLDEN_PROPERTY_EXPENSE_INPUT.supportStatus,
        supportTypes: GOLDEN_PROPERTY_EXPENSE_INPUT.supportTypes ?? [],
        allocationMethod: 'unknown',
        allocationPercentage: null,
        isExtraordinary: false,
        hasPossibleDuplicate: false,
      });
      expect(beforeContext.status).toBe('requires_context');

      const activity = await createRentalActivity(created.id, property.id, GOLDEN_RENTAL_ACTIVITY_INPUT);
      await linkRentalIncome(created.id, {
        propertyId: property.id,
        rentalActivityId: activity.id,
        sourceKind: 'manual',
        sourceId: null,
        amountCop: GOLDEN_RENTAL_INCOME_AMOUNT_COP,
        period: '2025',
      });
      const expense = await createPropertyExpense(created.id, property.id, GOLDEN_PROPERTY_EXPENSE_INPUT);
      expect(expense.eligibilityStatus).toBe('potentially_deductible');

      const expenses = await getPropertyExpenses(created.id);
      expect(expenses).toHaveLength(1);
    });
  });

  describe('§H salud complementaria (Sprint 2.4, Fase H, §23 del prompt) — dos meses, uno sobre el tope, beneficiario vinculado', () => {
    it('el tope mensual agregado recorta junio pero no enero, y el pago del dependiente vinculado queda íntegro', async () => {
      const created = await createCase({ alias: GOLDEN_CASE_PROFILE.alias, taxYear: GOLDEN_CASE_PROFILE.taxYear });
      const exogenousBuffer = buildGoldenExogenousWorkbook();
      const result = processWorkbookFile(
        exogenousBuffer,
        'exogena-golden-case.xlsx',
        exogenousBuffer.byteLength,
        { sheetName: 'Reporte' },
      );
      await saveResult(created.id, result);
      await saveDependentsCaseContext(created.id, { employmentIncomeNature: 'labor_relation' });
      const dependent = await createTaxDependent(created.id, GOLDEN_DEPENDENT_INPUT);
      await addDependentSupport(dependent.id, created.id, 'civil_registry', null);

      const january = await createComplementaryHealthPayment(created.id, {
        providerName: GOLDEN_HEALTH_PROVIDER.name,
        productType: 'prepaid_medicine',
        beneficiary: 'taxpayer',
        month: 1,
        amountPaidCop: GOLDEN_HEALTH_PAYMENT_JANUARY_COP,
        supportStatus: 'sufficient',
        supportTypes: ['prepaid_medicine_certificate'],
      });
      expect(january.eligibilityStatus).toBe('eligible');
      expect(january.eligibleAmountCop).toBe(GOLDEN_HEALTH_PAYMENT_JANUARY_COP);

      const june = await createComplementaryHealthPayment(created.id, {
        providerName: GOLDEN_HEALTH_PROVIDER.name,
        productType: 'prepaid_medicine',
        beneficiary: 'taxpayer',
        month: 6,
        amountPaidCop: GOLDEN_HEALTH_PAYMENT_JUNE_COP,
        supportStatus: 'sufficient',
        supportTypes: ['prepaid_medicine_certificate'],
      });
      expect(june.eligibilityStatus).toBe('cap_applied');
      expect(june.eligibleAmountCop).toBe(GOLDEN_HEALTH_MONTHLY_CAP_COP);

      const dependentPayment = await createComplementaryHealthPayment(created.id, {
        providerName: 'Aseguradora Sintetica Golden Case S.A.',
        productType: 'health_insurance',
        beneficiary: 'dependent',
        beneficiaryDependentId: dependent.id,
        month: 3,
        amountPaidCop: GOLDEN_HEALTH_PAYMENT_DEPENDENT_COP,
        supportStatus: 'sufficient',
        supportTypes: ['health_insurance_certificate'],
      });
      expect(dependentPayment.eligibilityStatus).toBe('eligible');

      const payments = await getComplementaryHealthPayments(created.id);
      const totalEligible = payments.reduce((sum, item) => sum + (item.eligibleAmountCop ?? 0), 0);
      expect(totalEligible).toBe(GOLDEN_HEALTH_EXPECTED_ANNUAL_ELIGIBLE_COP);

      const draft = await getForm210Draft(created.id);
      const box39 = draft?.boxes.find((box) => box.number === 39);
      expect(box39?.sources.map((source) => source.sourceId)).toEqual(
        expect.arrayContaining(['calc:dependents-387', 'calc:complementary-health-387']),
      );
    });
  });

  describe('§4 declaración anterior — identidad, carry-forward y no double counting', () => {
    it('la identidad coincide y el anticipo/saldo a favor generan candidatos de arrastre coherentes', async () => {
      const created = await createCase({ alias: GOLDEN_CASE_PROFILE.alias, taxYear: GOLDEN_CASE_PROFILE.taxYear });
      const exogenousBuffer = buildGoldenExogenousWorkbook();
      const result = processWorkbookFile(
        exogenousBuffer,
        'exogena-golden-case.xlsx',
        exogenousBuffer.byteLength,
        { sheetName: 'Reporte' },
      );
      await saveResult(created.id, result);
      const taxCase = await getCase(created.id);
      expect(taxCase?.taxpayer.documentMasked?.slice(-4)).toBe(
        GOLDEN_CASE_PROFILE.documentNumber.slice(-4),
      );

      const priorYearDocument = representation(GOLDEN_PRIOR_YEAR_TEXT_LINES.join('\n'));
      const extraction = extractPriorYearForm210(priorYearDocument);
      expect(extraction.detection.isForm210).toBe(true);
      expect(extraction.detection.taxYear).toBe(GOLDEN_CASE_PROFILE.priorTaxYear);

      const identityMatch = checkPriorYearIdentity(taxCase!, extraction.detection);
      expect(identityMatch).toBe('match');

      const priorReturn = buildPriorYearReturnFromExtraction({
        caseId: created.id,
        documentId: 'document:golden-prior-year',
        extraction,
        identityMatch,
        confirmedTaxYear: GOLDEN_CASE_PROFILE.priorTaxYear,
      });
      await savePriorYearReturn(priorReturn);
      const candidates = await refreshPriorYearCarryForwardCandidates(created.id);
      expect(candidates.length).toBeGreaterThan(0);
      const advanceCandidate = candidates.find((item) => item.sourceBoxNumber === 133);
      expect(advanceCandidate).toBeDefined();

      const stored = await getPriorYearCarryForwardCandidates(created.id);
      expect(stored).toHaveLength(candidates.length);
    });
  });

  describe('§12 Human Review Burden — sin recrear las ~88 decisiones del benchmark real', () => {
    it('produce un HRB modesto (no inflado) para el golden case', () => {
      const buffer = buildGoldenExogenousWorkbook();
      const result = processWorkbookFile(buffer, 'exogena-golden-case.xlsx', buffer.byteLength, {
        sheetName: 'Reporte',
      });
      const expected = buildExpectedTaxEvidence({ caseId: CONTEXT.caseId, result: buildResultStub(result.normalizedRecords) });
      const suggestions = buildEvidenceReviewSuggestions({
        caseId: CONTEXT.caseId,
        candidates: [],
        expectedEvidence: expected,
      });
      const burden = computeHumanReviewBurden(suggestions);
      // Sin documentos vinculados todavía, todas las expectativas quedan
      // `unresolved` — el HRB real (con documentos cargados) es menor;
      // este número es el TECHO del expediente antes de subir evidencia,
      // útil como referencia de que no se infló artificialmente.
      expect(burden.total).toBeLessThan(20);
    });
  });
});

/** Construye un `ProcessingResult` mínimo válido solo con los campos que `buildExpectedTaxEvidence` necesita. */
function buildResultStub(
  normalizedRecords: ReturnType<typeof processWorkbookFile>['normalizedRecords'],
): Parameters<typeof buildExpectedTaxEvidence>[0]['result'] {
  return {
    normalizedRecords,
    entities: [],
  } as unknown as Parameters<typeof buildExpectedTaxEvidence>[0]['result'];
}
