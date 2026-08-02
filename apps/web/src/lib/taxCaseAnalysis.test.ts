import { describe, expect, it } from 'vitest';
import type {
  DocumentExtractionSession,
  DocumentFact,
  ProcessingResult,
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
