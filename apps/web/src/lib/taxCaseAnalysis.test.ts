import { describe, expect, it } from 'vitest';
import type {
  DependentEvaluation,
  DocumentExtractionSession,
  DocumentFact,
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
});
