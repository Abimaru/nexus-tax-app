import { describe, expect, it } from 'vitest';
import type { CaseProgress, DocumentFactCandidate, ProcessingResult } from '@nexus-tax/domain';
import { processWorkbookFile } from '@nexus-tax/exogenous-parser';
import * as XLSX from 'xlsx';
import {
  defaultWorkflowDestination,
  deriveWorkflowStages,
  isWorkflowDestinationValid,
  recommendedWorkflowAction,
  type WorkflowContext,
} from './workflow';

const EMPTY_PROGRESS: CaseProgress = {
  documentCoverage: 0,
  reviewedFacts: 0,
  reconciliation: 0,
  findings: 0,
  matrixPreparation: 0,
  documentCount: 0,
  pendingRequirements: 0,
  openFindings: 0,
  pendingMatrixGroups: 0,
  explanation: [],
};

function processedResult(): ProcessingResult {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet([
      ['NIT', 'Nombre', 'Concepto', 'Valor'],
      ['9001', 'Banco Sintetico', 'Saldo cuenta bancaria', 100],
    ]),
    'Datos',
  );
  return processWorkbookFile(
    XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer,
    'sintetico.xlsx',
    1,
    { sheetName: 'Datos', now: () => '2026-01-01T00:00:00.000Z' },
  );
}

function context(changes: Partial<WorkflowContext> = {}): WorkflowContext {
  return {
    documents: [],
    facts: [],
    reconciliations: [],
    progress: EMPTY_PROGRESS,
    manualMode: false,
    extractionPending: false,
    vatResponsibility: null,
    completedViews: [],
    ...changes,
  };
}

describe('flujo guiado del expediente', () => {
  it('abre un expediente nuevo en Fuente y bloquea etapas dependientes', () => {
    const current = context();
    expect(defaultWorkflowDestination(current)).toEqual({ stage: 'fuente', view: 'cargar' });
    const stages = deriveWorkflowStages(current);
    expect(stages.find((stage) => stage.id === 'fuente')?.status).toBe('available');
    expect(stages.find((stage) => stage.id === 'extraccion')?.status).toBe('locked');
    expect(stages.find((stage) => stage.id === 'exportacion')?.status).toBe('available');
  });

  it('abre Extracción cuando hay una inspección pendiente', () => {
    const current = context({ extractionPending: true });
    expect(defaultWorkflowDestination(current)).toEqual({
      stage: 'extraccion',
      view: 'inspeccion',
    });
    expect(isWorkflowDestinationValid('extraccion', 'inspeccion', current)).toBe(true);
  });

  it('habilita progresivamente Organización, Conciliación y Declaración', () => {
    const result = processedResult();
    const current = context({ result });
    const stages = deriveWorkflowStages(current);
    expect(stages.find((stage) => stage.id === 'organizacion')?.status).toBe('incomplete');
    expect(stages.find((stage) => stage.id === 'conciliacion')?.status).toBe('available');
    expect(stages.find((stage) => stage.id === 'declaracion')?.status).toBe('incomplete');
  });

  it('limita el modo manual a documentos y hechos', () => {
    const current = context({ manualMode: true });
    expect(defaultWorkflowDestination(current)).toEqual({
      stage: 'organizacion',
      view: 'documentos',
    });
    expect(isWorkflowDestinationValid('organizacion', 'documentos', current)).toBe(true);
    expect(isWorkflowDestinationValid('organizacion', 'entidades', current)).toBe(false);
    expect(isWorkflowDestinationValid('declaracion', 'obligacion', current)).toBe(false);
  });

  it('redirige una vista inválida al destino válido calculado', () => {
    const current = context();
    expect(isWorkflowDestinationValid('conciliacion', 'matriz', current)).toBe(false);
    expect(defaultWorkflowDestination(current)).toEqual({ stage: 'fuente', view: 'cargar' });
  });

  it('recomienda acciones deterministas según pendientes reales', () => {
    expect(recommendedWorkflowAction(context())).toMatchObject({
      id: 'load-source',
      stage: 'fuente',
      priority: 'high',
    });
    const result = processedResult();
    expect(recommendedWorkflowAction(context({ result }))).toMatchObject({
      id: 'review-entities',
      stage: 'organizacion',
      pendingCount: 1,
    });
  });

  it('mantiene Exportación disponible para un expediente incompleto', () => {
    const current = context({ progress: { ...EMPTY_PROGRESS, openFindings: 2 } });
    expect(isWorkflowDestinationValid('exportacion', 'manifiesto', current)).toBe(true);
  });

  it('prioriza la revisión documental cuando hay candidatos pendientes', () => {
    const result = processedResult();
    const candidate = { status: 'pending' } as DocumentFactCandidate;
    expect(
      recommendedWorkflowAction(
        context({
          result,
          documents: [{ id: 'document:1' } as WorkflowContext['documents'][number]],
          documentCandidates: [candidate],
        }),
      ),
    ).toMatchObject({
      id: 'review-document-extraction',
      view: 'revision-documental',
      pendingCount: 1,
    });
  });
});
