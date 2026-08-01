import { describe, expect, it } from 'vitest';
import type { DocumentFact, ProcessingResult } from '@nexus-tax/domain';
import { processWorkbookFile } from '@nexus-tax/exogenous-parser';
import * as XLSX from 'xlsx';
import {
  buildEmploymentIncomeGroup,
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
});
