import { describe, expect, it } from 'vitest';
import type {
  ComplementaryHealthPayment,
  DependentEvaluation,
  DocumentExtractionSession,
  DocumentFact,
  DocumentFactCandidate,
  ElectronicInvoicePurchase,
  ElectronicInvoiceReport,
  ProcessingResult,
  TaxDependent,
  UploadedDocument,
} from '@nexus-tax/domain';
import { processWorkbookFile } from '@nexus-tax/exogenous-parser';
import * as XLSX from 'xlsx';
import {
  buildEmploymentIncomeGroup,
  buildCaseTasks,
  calculateCaseProgress,
  calculateEmploymentGroupCoverage,
  suggestReconciliations,
} from './taxCaseAnalysis';

function result(): ProcessingResult {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet([
      ['NIT', 'Nombre', 'Concepto', 'Valor'],
      ['900', 'Banco Sintetico', 'Saldo cuenta bancaria', 100],
    ]),
    'Datos',
  );
  return processWorkbookFile(
    XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer,
    'x.xlsx',
    1,
    { sheetName: 'Datos', now: () => '2026-01-01T00:00:00.000Z' },
  );
}

function fact(entityId: string): DocumentFact {
  return {
    id: 'fact:1',
    caseId: 'case:1',
    documentId: null,
    entityId,
    productId: null,
    originalConcept: 'Saldo cuenta bancaria',
    category: 'asset',
    nature: 'asset',
    treatment: 'add_to_assets',
    value: 100,
    currency: 'COP',
    cutoffDate: '2025-12-31',
    period: '2025',
    pageOrSection: '1',
    evidence: 'sintetica',
    captureMethod: 'manual',
    confidence: 'high',
    reviewStatus: 'reviewed',
    requirementIds: [],
    author: 'Analista',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    history: [],
  };
}

function employmentResult(employers: number, conceptsPerEmployer = 1): ProcessingResult {
  const workbook = XLSX.utils.book_new();
  const rows: unknown[][] = [['NIT', 'Nombre', 'Concepto', 'Valor']];
  for (let employer = 1; employer <= employers; employer += 1) {
    for (let concept = 1; concept <= conceptsPerEmployer; concept += 1) {
      rows.push([
        `900${employer}`,
        `Empleador Sintetico ${employer}`,
        concept === 1 ? 'Salarios y pagos laborales' : 'Pago laboral adicional',
        employer * concept * 100,
      ]);
    }
  }
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), 'Datos');
  return processWorkbookFile(
    XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer,
    'laboral.xlsx',
    1,
    { sheetName: 'Datos', now: () => '2026-01-01T00:00:00.000Z' },
  );
}

describe('expediente tributario derivado', () => {
  it('sugiere por varias senales pero no crea conciliacion definitiva', () => {
    const processed = result();
    const suggestions = suggestReconciliations({
      facts: [fact(processed.entities[0]!.id)],
      result: processed,
      products: [],
    });
    expect(suggestions[0]).toMatchObject({ score: 95, difference: 0 });
    expect(suggestions[0]?.signals).toEqual(
      expect.arrayContaining(['misma entidad', 'misma categoria', 'valor igual']),
    );
  });

  it('Sprint 2.4, Fase F.3 (§6): marca contradiccion semantica cuando el hecho describe una retencion comparada contra un registro de ingresos', () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([
        ['NIT', 'Nombre', 'Concepto', 'Valor'],
        ['900', 'Banco Sintetico', 'Rendimientos financieros', 100],
      ]),
      'Datos',
    );
    const processed = processWorkbookFile(
      XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer,
      'x.xlsx',
      1,
      { sheetName: 'Datos', now: () => '2026-01-01T00:00:00.000Z' },
    );
    const record = processed.normalizedRecords[0]!;
    expect(record.category).toBe('financial_income');
    const withholdingFact: DocumentFact = {
      ...fact(processed.entities[0]!.id),
      originalConcept: 'Retención sobre rendimientos financieros',
      category: 'withholding',
      nature: 'tax_credit',
      treatment: 'subtract_from_tax',
      value: record.reportedValue ?? 0,
    };
    const suggestions = suggestReconciliations({
      facts: [withholdingFact],
      result: processed,
      products: [],
    });
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]?.semanticContradiction).toBe(true);
    expect(suggestions[0]?.semanticContradictionReason).not.toBeNull();
    expect(suggestions[0]?.semanticContradictionReason).toMatch(/retenci[oó]n/i);
  });

  it('calcula coberturas por separado sin porcentaje general enganoso', () => {
    const progress = calculateCaseProgress({
      documents: [],
      coverages: [],
      facts: [],
      reconciliations: [],
    });
    expect(progress).toMatchObject({
      documentCoverage: 0,
      reviewedFacts: 0,
      reconciliation: 0,
      findings: 0,
      matrixPreparation: 0,
    });
    expect(progress.explanation).toContain('Aun no hay hechos documentales registrados.');
  });

  it.each([1, 2, 3])('detecta %i empleador(es) como instancias unicas', (count) => {
    const group = buildEmploymentIncomeGroup({
      caseId: 'case:1',
      result: employmentResult(count),
      now: '2026-01-01T00:00:00.000Z',
    });
    expect(group?.instances).toHaveLength(count);
    expect(group?.additionalDetectedEmployers).toHaveLength(0);
  });

  it('no duplica un empleador que tiene varios conceptos laborales', () => {
    const group = buildEmploymentIncomeGroup({
      caseId: 'case:1',
      result: employmentResult(1, 3),
      now: '2026-01-01T00:00:00.000Z',
    });
    expect(group?.instances).toHaveLength(1);
  });

  it('limita la interfaz a tres y conserva un hallazgo con empleadores adicionales', () => {
    const group = buildEmploymentIncomeGroup({
      caseId: 'case:1',
      result: employmentResult(5),
      now: '2026-01-01T00:00:00.000Z',
    });
    expect(group?.instances).toHaveLength(3);
    expect(group?.additionalDetectedEmployers).toHaveLength(2);
    expect(group?.findings[0]).toMatchObject({
      code: 'employment_employer_limit_exceeded',
      severity: 'info',
    });
  });

  it('calcula cobertura solo con instancias activas', () => {
    const group = buildEmploymentIncomeGroup({
      caseId: 'case:1',
      result: employmentResult(2),
      now: '2026-01-01T00:00:00.000Z',
    })!;
    expect(
      calculateEmploymentGroupCoverage([
        { ...group.instances[0]!, status: 'covered', coverage: 'covered' },
        { ...group.instances[1]!, status: 'pending', coverage: 'not_evaluated' },
      ]),
    ).toBe('partial');
    expect(
      calculateEmploymentGroupCoverage([
        { ...group.instances[0]!, status: 'covered', coverage: 'covered' },
        { ...group.instances[1]!, status: 'not_applicable', coverage: 'not_applicable' },
      ]),
    ).toBe('covered');
  });

  it('deriva pendientes accionables y elimina los resueltos al recalcular', () => {
    const processed = result();
    const requirement = processed.requirements[0]!;
    const pending = buildCaseTasks({
      caseId: 'case:1',
      result: processed,
      documents: [],
      coverages: [],
      candidates: [],
      reconciliations: [],
      vatResponsibility: null,
      now: '2026-08-02T00:00:00.000Z',
    });
    expect(pending.some((task) => task.requirementId === requirement.id)).toBe(true);
    expect(pending.some((task) => task.type === 'confirm_vat')).toBe(true);

    const resolved = buildCaseTasks({
      caseId: 'case:1',
      result: processed,
      documents: [],
      coverages: [
        {
          id: 'coverage:1',
          caseId: 'case:1',
          requirementId: requirement.id,
          documentId: null,
          factId: null,
          entityId: null,
          status: 'covered',
          relation: 'covers',
          notes: 'Soporte confirmado',
          updatedAt: '2026-08-02T00:00:00.000Z',
        },
      ],
      candidates: [],
      reconciliations: [],
      vatResponsibility: false,
      now: '2026-08-02T00:00:00.000Z',
    });
    expect(resolved.some((task) => task.requirementId === requirement.id)).toBe(false);
    expect(resolved.some((task) => task.type === 'confirm_vat')).toBe(false);
  });

  it('deriva tareas de declaraciones anteriores (Sprint 2.4, Fase B1)', () => {
    const basePriorReturn = {
      id: 'prior-return:1',
      caseId: 'case:1',
      taxYear: 2024,
      filingYear: 2025,
      formType: '210' as const,
      formNumber: '1102345678901',
      previousFormNumber: null,
      taxpayerIdentityMasked: '••••4567',
      submittedAt: '2025-05-10T00:00:00.000Z',
      sourceDocumentId: 'doc-prior-1',
      status: 'submitted' as const,
      identityMatch: 'match' as const,
      replaces: null,
      replacedBy: null,
      isCurrentVersion: true,
      boxes: {},
      extractionConfidence: 'high' as const,
      parserVersion: 'form210-prior-year-1.0.0',
      createdAt: '2026-09-05T00:00:00.000Z',
      updatedAt: '2026-09-05T00:00:00.000Z',
    };
    const mismatchTasks = buildCaseTasks({
      caseId: 'case:1',
      documents: [],
      coverages: [],
      candidates: [],
      reconciliations: [],
      vatResponsibility: false,
      priorYearReturns: [{ ...basePriorReturn, identityMatch: 'mismatch' }],
      now: '2026-09-05T00:00:00.000Z',
    });
    expect(
      mismatchTasks.some(
        (task) => task.type === 'review_prior_year_identity_mismatch' && task.blocking,
      ),
    ).toBe(true);

    const carryForwardTasks = buildCaseTasks({
      caseId: 'case:1',
      documents: [],
      coverages: [],
      candidates: [],
      reconciliations: [],
      vatResponsibility: false,
      priorYearReturns: [basePriorReturn],
      carryForwardCandidates: [
        {
          id: 'carry:1',
          caseId: 'case:1',
          priorYearReturnId: 'prior-return:1',
          priorYearTaxYear: 2024,
          sourceBoxNumber: 133,
          targetBoxNumber: 130,
          sourceValueCop: 79_000,
          refundOrCompensationRequested: null,
          decision: 'pending',
          finalValueCop: null,
          evidence: '133 Anticipo 79.000',
          decidedAt: null,
          createdAt: '2026-09-05T00:00:00.000Z',
          updatedAt: '2026-09-05T00:00:00.000Z',
        },
        {
          id: 'carry:2',
          caseId: 'case:1',
          priorYearReturnId: 'prior-return:1',
          priorYearTaxYear: 2024,
          sourceBoxNumber: 137,
          targetBoxNumber: 131,
          sourceValueCop: 0,
          refundOrCompensationRequested: 'unknown',
          decision: 'pending',
          finalValueCop: null,
          evidence: '137 Saldo a favor 0',
          decidedAt: null,
          createdAt: '2026-09-05T00:00:00.000Z',
          updatedAt: '2026-09-05T00:00:00.000Z',
        },
      ],
      now: '2026-09-05T00:00:00.000Z',
    });
    // El candidato de anticipo (valor > 0) genera tarea; el de saldo a
    // favor en cero NO genera una tarea innecesaria (adenda punto 9).
    expect(
      carryForwardTasks.some((task) => task.id === 'task:prior-year-carry-forward:carry:1'),
    ).toBe(true);
    expect(
      carryForwardTasks.some((task) => task.id === 'task:prior-year-carry-forward:carry:2'),
    ).toBe(false);

    const conflictTasks = buildCaseTasks({
      caseId: 'case:1',
      documents: [],
      coverages: [],
      candidates: [],
      reconciliations: [],
      vatResponsibility: false,
      priorYearReturns: [
        basePriorReturn,
        { ...basePriorReturn, id: 'prior-return:2', sourceDocumentId: 'doc-prior-2' },
      ],
      now: '2026-09-05T00:00:00.000Z',
    });
    expect(conflictTasks.some((task) => task.type === 'resolve_prior_year_conflict')).toBe(true);
  });

  it('deriva tareas de dependientes económicos (Sprint 2.4, Fase C)', () => {
    function dependent(overrides: Partial<TaxDependent> = {}): TaxDependent {
      return {
        id: 'dep-1',
        caseId: 'case:1',
        fullName: 'María Pérez',
        documentType: 'CC',
        documentNumber: '1000000001',
        relationship: 'parent',
        dateOfBirth: null,
        dependencyType: 'no_income_or_low_income',
        annualIncomeCop: 0,
        studentStatus: 'not_applicable',
        educationalInstitution: null,
        disabilityOrDependencyCondition: null,
        monthsClaimed: 12,
        preferredBenefit: null,
        notes: '',
        status: 'active',
        createdAt: '2026-09-05T00:00:00.000Z',
        updatedAt: '2026-09-05T00:00:00.000Z',
        ...overrides,
      };
    }
    function evaluation(overrides: Partial<DependentEvaluation> = {}): DependentEvaluation {
      return {
        id: 'eval-1',
        dependentId: 'dep-1',
        caseId: 'case:1',
        status: 'eligible',
        reasons: [],
        missingSupportTypes: [],
        candidateBenefits: ['article_387', 'article_336'],
        requiresCoexistenceChoice: false,
        ruleVersion: 'test',
        confirmedByAnalyst: false,
        staleDueToRuleChange: false,
        previousRuleVersion: null,
        evaluatedAt: '2026-09-05T00:00:00.000Z',
        updatedAt: '2026-09-05T00:00:00.000Z',
        ...overrides,
      };
    }

    const missingDocumentTasks = buildCaseTasks({
      caseId: 'case:1',
      documents: [],
      coverages: [],
      candidates: [],
      reconciliations: [],
      vatResponsibility: false,
      dependents: [dependent({ documentNumber: null })],
      dependentEvaluations: [evaluation()],
      now: '2026-09-05T00:00:00.000Z',
    });
    expect(missingDocumentTasks.some((task) => task.type === 'dependent_missing_document')).toBe(
      true,
    );

    const requiresSupportTasks = buildCaseTasks({
      caseId: 'case:1',
      documents: [],
      coverages: [],
      candidates: [],
      reconciliations: [],
      vatResponsibility: false,
      dependents: [dependent()],
      dependentEvaluations: [
        evaluation({ status: 'requires_support', missingSupportTypes: ['education_certificate'] }),
      ],
      now: '2026-09-05T00:00:00.000Z',
    });
    expect(
      requiresSupportTasks.some((task) => task.type === 'dependent_missing_education_certificate'),
    ).toBe(true);

    const staleTasks = buildCaseTasks({
      caseId: 'case:1',
      documents: [],
      coverages: [],
      candidates: [],
      reconciliations: [],
      vatResponsibility: false,
      dependents: [dependent()],
      dependentEvaluations: [evaluation({ staleDueToRuleChange: true })],
      now: '2026-09-05T00:00:00.000Z',
    });
    expect(staleTasks.some((task) => task.type === 'dependent_stale_rule_change')).toBe(true);

    // Quinto dependiente candidato a 72 UVT: se conserva pero genera tarea de límite.
    const fiveDependents = Array.from({ length: 5 }, (_, index) =>
      dependent({ id: `dep-${index + 1}`, fullName: `Dependiente ${index + 1}` }),
    );
    const fiveEvaluations = fiveDependents.map((item) => evaluation({ dependentId: item.id, id: `eval-${item.id}` }));
    const maxTasks = buildCaseTasks({
      caseId: 'case:1',
      documents: [],
      coverages: [],
      candidates: [],
      reconciliations: [],
      vatResponsibility: false,
      dependents: fiveDependents,
      dependentEvaluations: fiveEvaluations,
      now: '2026-09-05T00:00:00.000Z',
    });
    expect(maxTasks.some((task) => task.type === 'dependent_exceeds_additional_max')).toBe(true);
    // Los 5 dependientes se conservan (no se pierden ni se eliminan tareas de otros).
    expect(maxTasks.filter((task) => task.source === 'dependent').length).toBeGreaterThan(0);

    // "No tengo dependientes" suprime todas las tareas de dependientes.
    const noDependentsTasks = buildCaseTasks({
      caseId: 'case:1',
      documents: [],
      coverages: [],
      candidates: [],
      reconciliations: [],
      vatResponsibility: false,
      dependents: [dependent({ documentNumber: null })],
      dependentEvaluations: [evaluation()],
      noDependentsDeclared: true,
      now: '2026-09-05T00:00:00.000Z',
    });
    expect(noDependentsTasks.some((task) => task.source === 'dependent')).toBe(false);
  });

  it('deriva tareas de facturación electrónica (Sprint 2.4, Fase D)', () => {
    function report(overrides: Partial<ElectronicInvoiceReport> = {}): ElectronicInvoiceReport {
      return {
        id: 'fe-report-1',
        caseId: 'case:1',
        taxYear: 2025,
        sourceKind: 'dian_electronic_invoice_report',
        sourceDocumentId: null,
        fileName: 'facturas.xlsx',
        detectedTitle: 'CUFE · Valor Facturado',
        headerRowIndex: 25,
        headerConfidence: 0.9,
        importedAt: '2026-09-06T00:00:00.000Z',
        parserVersion: '1.0.0',
        rowCount: 1,
        totals: {
          rowCount: 1,
          uniqueInvoiceCount: 1,
          grossTotalCop: 1_000_000,
          creditNoteTotalCop: 0,
          debitNoteTotalCop: 0,
          netTotalCop: 1_000_000,
          eligibleBenefitTotalCop: 1_000_000,
          countByPaymentMethod: { electronic: 1, cash: 0, other: 0, data_error: 0, not_informed: 0 },
          countEligibleZero: 0,
          duplicateExactCount: 0,
          duplicateConflictingCount: 0,
          missingCufeCount: 0,
          anomalyCount: 0,
        },
        reconciliation: null,
        processingStatus: 'processed',
        benefitOptedOut: false,
        warnings: [],
        ...overrides,
      };
    }
    function purchase(overrides: Partial<ElectronicInvoicePurchase> = {}): ElectronicInvoicePurchase {
      const amount = {
        rawText: '1.000.000',
        normalizedText: '1000000',
        parsedValue: 1_000_000,
        decimalValue: 1_000_000,
        roundedTaxValue: 1_000_000,
        detectedLocale: 'es_CO' as const,
        decimalSeparator: '.' as const,
        thousandsSeparator: ',' as const,
        parsingStrategy: 'grouped_integer' as const,
        confidence: 'high' as const,
        warnings: [],
        sourceDocumentId: null,
        page: null,
        boundingBox: null,
        extractionMethod: 'imported' as const,
        originalEvidence: '1.000.000',
        parserVersion: '2.0.0',
      };
      return {
        id: 'fe-purchase-1',
        reportId: 'fe-report-1',
        caseId: 'case:1',
        sourceRow: 26,
        issuerTaxId: '900111222',
        issuerName: 'Proveedor Sintético SAS',
        issuedAt: '2025-02-10',
        invoiceNumber: 'FES-0001',
        rawCufe: 'a'.repeat(96),
        normalizedCufe: 'a'.repeat(96),
        cufeStatus: 'unique',
        grossValue: amount,
        creditNoteValue: { ...amount, roundedTaxValue: 0, rawText: '0', parsedValue: 0, decimalValue: 0 },
        debitNoteValue: { ...amount, roundedTaxValue: 0, rawText: '0', parsedValue: 0, decimalValue: 0 },
        officialNetValue: amount,
        computedNetValueCop: 1_000_000,
        netReconciliationStatus: 'exact',
        eligibleBenefitValue: amount,
        paymentMethodRaw: 'Tarjeta débito o crédito',
        paymentMethodCategory: 'electronic',
        benefitDecision: 'eligible',
        benefitDecisionReason: null,
        createdAt: '2026-09-06T00:00:00.000Z',
        ...overrides,
      };
    }

    const notReconciledTasks = buildCaseTasks({
      caseId: 'case:1',
      documents: [],
      coverages: [],
      candidates: [],
      reconciliations: [],
      vatResponsibility: false,
      electronicInvoiceReport: report(),
      electronicInvoicePurchases: [purchase()],
      now: '2026-09-06T00:00:00.000Z',
    });
    expect(
      notReconciledTasks.some((task) => task.type === 'electronic_invoice_report_not_reconciled'),
    ).toBe(true);
    expect(
      notReconciledTasks.some((task) => task.type === 'electronic_invoice_base_without_decision'),
    ).toBe(true);

    const conflictingTasks = buildCaseTasks({
      caseId: 'case:1',
      documents: [],
      coverages: [],
      candidates: [],
      reconciliations: [],
      vatResponsibility: false,
      electronicInvoiceReport: report(),
      electronicInvoicePurchases: [purchase({ cufeStatus: 'duplicate_conflicting' })],
      now: '2026-09-06T00:00:00.000Z',
    });
    expect(
      conflictingTasks.some((task) => task.type === 'electronic_invoice_duplicate_conflicting'),
    ).toBe(true);

    const missingCufeTasks = buildCaseTasks({
      caseId: 'case:1',
      documents: [],
      coverages: [],
      candidates: [],
      reconciliations: [],
      vatResponsibility: false,
      electronicInvoiceReport: report(),
      electronicInvoicePurchases: [purchase({ cufeStatus: 'missing_cufe', normalizedCufe: null })],
      now: '2026-09-06T00:00:00.000Z',
    });
    expect(missingCufeTasks.some((task) => task.type === 'electronic_invoice_missing_cufe')).toBe(
      true,
    );

    const paymentErrorTasks = buildCaseTasks({
      caseId: 'case:1',
      documents: [],
      coverages: [],
      candidates: [],
      reconciliations: [],
      vatResponsibility: false,
      electronicInvoiceReport: report(),
      electronicInvoicePurchases: [purchase({ paymentMethodCategory: 'data_error' })],
      now: '2026-09-06T00:00:00.000Z',
    });
    expect(
      paymentErrorTasks.some((task) => task.type === 'electronic_invoice_payment_method_error'),
    ).toBe(true);

    const relevantDifferenceTasks = buildCaseTasks({
      caseId: 'case:1',
      documents: [],
      coverages: [],
      candidates: [],
      reconciliations: [],
      vatResponsibility: false,
      electronicInvoiceReport: report({
        reconciliation: {
          status: 'relevant_difference',
          invoiceReportNetTotalCop: 1_000_000,
          exogenousNetTotalCop: 5_000_000,
          differenceAbsoluteCop: 4_000_000,
          differencePercentage: 400,
          roundingUnitCop: 1,
          explanation: 'Diferencia relevante entre el reporte y la exógena.',
          requiresHumanConfirmation: true,
          policyVersion: 'test',
          evaluatedAt: '2026-09-06T00:00:00.000Z',
        },
      }),
      electronicInvoicePurchases: [purchase()],
      now: '2026-09-06T00:00:00.000Z',
    });
    expect(
      relevantDifferenceTasks.some((task) => task.type === 'electronic_invoice_relevant_difference'),
    ).toBe(true);

    // "No usaré deducción" suprime las tareas de nivel de reporte.
    const optedOutTasks = buildCaseTasks({
      caseId: 'case:1',
      documents: [],
      coverages: [],
      candidates: [],
      reconciliations: [],
      vatResponsibility: false,
      electronicInvoiceReport: report({ benefitOptedOut: true }),
      electronicInvoicePurchases: [purchase()],
      now: '2026-09-06T00:00:00.000Z',
    });
    expect(
      optedOutTasks.some((task) => task.type === 'electronic_invoice_report_not_reconciled'),
    ).toBe(false);
  });

  it('deriva tareas OCR con destino exacto de documento y página', () => {
    const timestamp = '2026-08-02T00:00:00.000Z';
    const document: UploadedDocument = {
      id: 'document:ocr',
      caseId: 'case:1',
      kind: 'other',
      category: 'other',
      fileName: 'escaneado-sintetico.pdf',
      extension: '.pdf',
      fileSizeBytes: 100,
      mimeType: 'application/pdf',
      sha256: 'a'.repeat(64),
      storageMode: 'store_locally',
      status: 'active',
      entityIds: [],
      productIds: [],
      taxYear: 2025,
      cutoffDate: null,
      notes: '',
      requiresPassword: false,
      version: 1,
      replacesDocumentId: null,
      replacedByDocumentId: null,
      coveredRequirementIds: [],
      partialRequirementIds: [],
      uploadedAt: timestamp,
      updatedAt: timestamp,
    };
    const session: DocumentExtractionSession = {
      id: 'session:ocr',
      caseId: 'case:1',
      documentId: document.id,
      runNumber: 1,
      status: 'partially_read',
      phase: 'review',
      completedPhases: ['reading'],
      pageCount: 2,
      readablePageCount: 1,
      diagnosis: {
        type: 'hybrid',
        textualPageCount: 1,
        scannedPageCount: 1,
        insufficientPageCount: 0,
        damagedPageCount: 0,
        signals: [],
        pages: [
          {
            pageNumber: 2,
            type: 'scanned',
            characterCount: 0,
            tokenCount: 0,
            textCoverage: 0,
            orientation: 'portrait',
            width: 612,
            height: 792,
            warnings: [],
            recommendedMethod: 'ocr',
          },
        ],
      },
      candidateIds: [],
      classification: null,
      adapterId: null,
      adapterVersion: null,
      findings: [],
      textPersisted: false,
      errorCode: null,
      errorMessage: null,
      supersedesSessionId: null,
      obsoleteCandidateIds: [],
      startedAt: timestamp,
      finishedAt: timestamp,
      updatedAt: timestamp,
    };
    const tasks = buildCaseTasks({
      caseId: 'case:1',
      documents: [document],
      coverages: [],
      candidates: [],
      extractionSessions: [session],
      reconciliations: [],
      vatResponsibility: false,
      now: timestamp,
    });
    expect(tasks).toContainEqual(
      expect.objectContaining({
        type: 'run_page_ocr',
        documentId: document.id,
        extractionSessionId: session.id,
        page: 2,
        view: 'laboratorio',
      }),
    );
  });

  it('deriva tareas de revisión guiada: ambigüedad y expectativa sin resolver (Sprint 2.4, Fase E)', () => {
    const timestamp = '2026-08-02T00:00:00.000Z';
    const processed = result();
    const record = processed.normalizedRecords[0]!;
    const document: UploadedDocument = {
      id: 'document:evidence',
      caseId: 'case:1',
      kind: 'other',
      category: 'other',
      fileName: 'certificado.pdf',
      extension: '.pdf',
      fileSizeBytes: 100,
      mimeType: 'application/pdf',
      sha256: 'b'.repeat(64),
      storageMode: 'store_locally',
      status: 'active',
      entityIds: [],
      productIds: [],
      taxYear: 2025,
      cutoffDate: null,
      notes: '',
      requiresPassword: false,
      version: 1,
      replacesDocumentId: null,
      replacedByDocumentId: null,
      coveredRequirementIds: [],
      partialRequirementIds: [],
      uploadedAt: timestamp,
      updatedAt: timestamp,
    };
    const ambiguousCandidate: DocumentFactCandidate = {
      id: 'candidate:ambiguous',
      caseId: 'case:1',
      documentId: document.id,
      extractionSessionId: 'session:1',
      page: 1,
      proposedEntityId: null,
      entityName: null,
      proposedProductId: null,
      productType: 'unidentified',
      productLabel: null,
      originalConcept: 'Saldo al cierre',
      normalizedConcept: 'saldo al cierre',
      proposedCategory: 'asset',
      proposedNature: 'asset',
      proposedTreatment: 'add_to_assets',
      correctedCategory: null,
      correctedNature: null,
      correctedTreatment: null,
      extractedValue: 100,
      correctedValue: null,
      finalValue: null,
      currency: 'COP',
      period: '2025',
      cutoffDate: null,
      evidence: {
        page: 1,
        excerpt: 'Saldo al cierre: $ 100',
        detectedLabel: 'Saldo al cierre',
        detectedValue: '$ 100',
        location: 'page:1',
      },
      adapterId: 'co.balance-certificate',
      adapterVersion: '1.0.0',
      ruleId: 'rule:balance',
      confidence: { level: 'medium', score: 60, reasons: [] },
      warnings: [],
      status: 'pending',
      possibleDuplicateIds: [],
      suggestedRequirementIds: [],
      suggestedExogenousMatches: [
        {
          recordId: record.id,
          status: 'ambiguous',
          reasons: ['Dos registros empatan.'],
          exogenousValue: record.reportedValue ?? 0,
          difference: 0,
        },
      ],
      selectedExogenousRecordId: null,
      observation: '',
      factId: null,
      decisions: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    const withAmbiguousCandidate = buildCaseTasks({
      caseId: 'case:1',
      result: processed,
      documents: [document],
      coverages: [],
      candidates: [ambiguousCandidate],
      reconciliations: [],
      vatResponsibility: false,
      now: timestamp,
    });
    expect(withAmbiguousCandidate).toContainEqual(
      expect.objectContaining({ type: 'evidence_ambiguous_match', candidateId: ambiguousCandidate.id }),
    );

    const withoutAnyCandidate = buildCaseTasks({
      caseId: 'case:1',
      result: processed,
      documents: [document],
      coverages: [],
      candidates: [],
      reconciliations: [],
      vatResponsibility: false,
      now: timestamp,
    });
    expect(withoutAnyCandidate).toContainEqual(
      expect.objectContaining({ type: 'evidence_missing_expected' }),
    );
  });

  it('Sprint 2.4, Fase F.2 (§17/§18): fallback guiado de vivienda SIN depender de la exógena', () => {
    const timestamp = '2026-09-06T00:00:00.000Z';
    const document: UploadedDocument = {
      id: 'document:housing',
      caseId: 'case:1',
      kind: 'other',
      category: 'other',
      fileName: 'certificado-vivienda.pdf',
      extension: '.pdf',
      fileSizeBytes: 100,
      mimeType: 'application/pdf',
      sha256: 'c'.repeat(64),
      storageMode: 'store_locally',
      status: 'active',
      entityIds: [],
      productIds: [],
      taxYear: 2025,
      cutoffDate: null,
      notes: '',
      requiresPassword: false,
      version: 1,
      replacesDocumentId: null,
      replacedByDocumentId: null,
      coveredRequirementIds: [],
      partialRequirementIds: [],
      uploadedAt: timestamp,
      updatedAt: timestamp,
    };
    const session: DocumentExtractionSession = {
      id: 'session:housing',
      caseId: 'case:1',
      documentId: document.id,
      runNumber: 1,
      status: 'confirmed',
      phase: 'complete',
      completedPhases: ['reading', 'classifying', 'extracting'],
      pageCount: 1,
      readablePageCount: 1,
      candidateIds: [],
      classification: {
        proposedKind: 'housing_interest_certificate',
        confidence: 'medium',
        alternatives: [],
        supportingSignals: [],
        opposingSignals: [],
        requiresReview: true,
        correctedKind: null,
      },
      adapterId: 'co.housing-interest.generic',
      adapterVersion: '1.2.0',
      findings: [],
      textPersisted: false,
      errorCode: null,
      errorMessage: null,
      supersedesSessionId: null,
      obsoleteCandidateIds: [],
      startedAt: timestamp,
      finishedAt: timestamp,
      updatedAt: timestamp,
    };

    // Sin ningún candidato `housing_interest`: debe aparecer el fallback
    // guiado — nunca depende de un `ExpectedTaxEvidence` de la exógena
    // (§15/§18), ya esta deducción no se reporta como información exógena.
    const withoutInterestCandidate = buildCaseTasks({
      caseId: 'case:1',
      documents: [document],
      coverages: [],
      candidates: [],
      extractionSessions: [session],
      reconciliations: [],
      vatResponsibility: false,
      now: timestamp,
    });
    expect(withoutInterestCandidate).toContainEqual(
      expect.objectContaining({
        type: 'evidence_missing_expected',
        documentId: document.id,
        recommendedAction: 'Capturar manualmente desde la revisión guiada',
      }),
    );

    // Con un candidato `housing_interest` ya presente: el fallback NO debe
    // aparecer (no inventa un problema que ya está resuelto, §13/§17).
    const interestCandidate: DocumentFactCandidate = {
      id: 'candidate:housing-interest',
      caseId: 'case:1',
      documentId: document.id,
      extractionSessionId: session.id,
      page: 1,
      proposedEntityId: null,
      entityName: null,
      proposedProductId: null,
      productType: 'mortgage_loan',
      productLabel: null,
      originalConcept: 'Intereses pagados',
      normalizedConcept: 'intereses pagados',
      proposedCategory: 'housing_interest',
      proposedNature: 'deduction',
      proposedTreatment: 'deductible_subject_to_rules',
      correctedCategory: null,
      correctedNature: null,
      correctedTreatment: null,
      extractedValue: 450_000,
      correctedValue: null,
      finalValue: null,
      currency: 'COP',
      period: '2025',
      cutoffDate: null,
      evidence: {
        page: 1,
        excerpt: 'Intereses pagados: $ 450.000',
        detectedLabel: 'Intereses pagados',
        detectedValue: '$ 450.000',
        location: 'page:1',
      },
      adapterId: 'co.housing-interest.generic',
      adapterVersion: '1.2.0',
      ruleId: 'housing-interest',
      confidence: { level: 'medium', score: 72, reasons: [] },
      warnings: [],
      status: 'pending',
      possibleDuplicateIds: [],
      suggestedRequirementIds: [],
      suggestedExogenousMatches: [],
      selectedExogenousRecordId: null,
      observation: '',
      factId: null,
      decisions: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    const withInterestCandidate = buildCaseTasks({
      caseId: 'case:1',
      documents: [document],
      coverages: [],
      candidates: [interestCandidate],
      extractionSessions: [session],
      reconciliations: [],
      vatResponsibility: false,
      now: timestamp,
    });
    expect(withInterestCandidate).not.toContainEqual(
      expect.objectContaining({ type: 'evidence_missing_expected', documentId: document.id }),
    );
  });
});

describe('tareas de salud complementaria (Sprint 2.4, Fase H)', () => {
  const timestamp = '2026-09-08T00:00:00.000Z';

  function payment(overrides: Partial<ComplementaryHealthPayment> = {}): ComplementaryHealthPayment {
    return {
      id: 'health:1',
      caseId: 'case:1',
      providerName: 'Medicina Prepagada Sintética SAS',
      providerTaxIdMasked: null,
      productType: 'prepaid_medicine',
      beneficiary: 'taxpayer',
      beneficiaryDependentId: null,
      taxYear: 2025,
      month: 1,
      coveragePeriodDescription: null,
      amountPaidCop: 300_000,
      eligibleAmountCop: 300_000,
      sourceDocumentId: null,
      evidenceDescription: null,
      supportStatus: 'sufficient',
      supportTypes: ['prepaid_medicine_certificate'],
      isMandatoryEpsContribution: false,
      isDirectMedicalExpense: false,
      eligibilityStatus: 'eligible',
      eligibilityReasons: [],
      ruleVersion: 'co.complementary-health.eligibility.2025.v1',
      decisionStatus: 'pending',
      reasons: [],
      possiblyDuplicateOfPaymentId: null,
      createdAt: timestamp,
      updatedAt: timestamp,
      ...overrides,
    };
  }

  it('beneficiario sin definir genera complementary_health_beneficiary_missing', () => {
    const tasks = buildCaseTasks({
      caseId: 'case:1',
      documents: [],
      coverages: [],
      candidates: [],
      reconciliations: [],
      vatResponsibility: false,
      complementaryHealthPayments: [
        payment({ eligibilityStatus: 'requires_beneficiary_review' }),
      ],
      now: timestamp,
    });
    expect(tasks.some((task) => task.type === 'complementary_health_beneficiary_missing')).toBe(true);
  });

  it('mes desconocido SIN período de cobertura genera complementary_health_period_missing', () => {
    const tasks = buildCaseTasks({
      caseId: 'case:1',
      documents: [],
      coverages: [],
      candidates: [],
      reconciliations: [],
      vatResponsibility: false,
      complementaryHealthPayments: [
        payment({ month: null, eligibilityStatus: 'requires_monthly_breakdown', coveragePeriodDescription: null }),
      ],
      now: timestamp,
    });
    expect(tasks.some((task) => task.type === 'complementary_health_period_missing')).toBe(true);
    expect(
      tasks.some((task) => task.type === 'complementary_health_monthly_breakdown_required'),
    ).toBe(false);
  });

  it('mes desconocido CON período de cobertura genera complementary_health_monthly_breakdown_required', () => {
    const tasks = buildCaseTasks({
      caseId: 'case:1',
      documents: [],
      coverages: [],
      candidates: [],
      reconciliations: [],
      vatResponsibility: false,
      complementaryHealthPayments: [
        payment({
          month: null,
          eligibilityStatus: 'requires_monthly_breakdown',
          coveragePeriodDescription: 'Enero-Diciembre 2025',
        }),
      ],
      now: timestamp,
    });
    expect(
      tasks.some((task) => task.type === 'complementary_health_monthly_breakdown_required'),
    ).toBe(true);
    expect(tasks.some((task) => task.type === 'complementary_health_period_missing')).toBe(false);
  });

  it('soporte faltante genera complementary_health_support_missing', () => {
    const tasks = buildCaseTasks({
      caseId: 'case:1',
      documents: [],
      coverages: [],
      candidates: [],
      reconciliations: [],
      vatResponsibility: false,
      complementaryHealthPayments: [payment({ eligibilityStatus: 'requires_support' })],
      now: timestamp,
    });
    expect(tasks.some((task) => task.type === 'complementary_health_support_missing')).toBe(true);
  });

  it('pago elegible pendiente de decisión humana genera complementary_health_review_required, con prioridad alta si es posible duplicado', () => {
    const pendingTasks = buildCaseTasks({
      caseId: 'case:1',
      documents: [],
      coverages: [],
      candidates: [],
      reconciliations: [],
      vatResponsibility: false,
      complementaryHealthPayments: [payment({ eligibilityStatus: 'eligible', decisionStatus: 'pending' })],
      now: timestamp,
    });
    const reviewTask = pendingTasks.find((task) => task.type === 'complementary_health_review_required');
    expect(reviewTask).toBeDefined();
    expect(reviewTask?.priority).toBe('low');

    const duplicateTasks = buildCaseTasks({
      caseId: 'case:1',
      documents: [],
      coverages: [],
      candidates: [],
      reconciliations: [],
      vatResponsibility: false,
      complementaryHealthPayments: [
        payment({
          eligibilityStatus: 'requires_review',
          possiblyDuplicateOfPaymentId: 'health:other',
        }),
      ],
      now: timestamp,
    });
    const duplicateReviewTask = duplicateTasks.find(
      (task) => task.type === 'complementary_health_review_required',
    );
    expect(duplicateReviewTask?.priority).toBe('high');
  });

  it('pago confirmado sin ninguna condición pendiente no genera ninguna tarea', () => {
    const tasks = buildCaseTasks({
      caseId: 'case:1',
      documents: [],
      coverages: [],
      candidates: [],
      reconciliations: [],
      vatResponsibility: false,
      complementaryHealthPayments: [payment({ eligibilityStatus: 'eligible', decisionStatus: 'confirmed' })],
      now: timestamp,
    });
    expect(tasks.some((task) => task.source === 'complementary_health')).toBe(false);
  });

  it('pago not_applicable (EPS/gasto médico directo) nunca genera tarea', () => {
    const tasks = buildCaseTasks({
      caseId: 'case:1',
      documents: [],
      coverages: [],
      candidates: [],
      reconciliations: [],
      vatResponsibility: false,
      complementaryHealthPayments: [payment({ eligibilityStatus: 'not_applicable' })],
      now: timestamp,
    });
    expect(tasks.some((task) => task.source === 'complementary_health')).toBe(false);
  });
});
