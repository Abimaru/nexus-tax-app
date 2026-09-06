import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { DocumentFactCandidate, ProcessingResult } from '@nexus-tax/domain';
import { EvidenceReviewPanel } from './EvidenceReviewPanel';

const confirmEvidenceMatch = vi.fn();
const confirmEvidenceMatchesBulk = vi.fn();
const createGuidedManualCapture = vi.fn();
const reviewDocumentCandidate = vi.fn();

vi.mock('@/lib/repository', () => ({
  confirmEvidenceMatch: (...args: unknown[]) => confirmEvidenceMatch(...args),
  confirmEvidenceMatchesBulk: (...args: unknown[]) => confirmEvidenceMatchesBulk(...args),
  createGuidedManualCapture: (...args: unknown[]) => createGuidedManualCapture(...args),
  reviewDocumentCandidate: (...args: unknown[]) => reviewDocumentCandidate(...args),
  restoreDocumentCandidate: vi.fn(),
  restoreDocumentCandidatesBulk: vi.fn(),
  reviewDocumentCandidatesBulk: vi.fn(),
  associateDocumentCandidatesBulk: vi.fn(),
  correctExtractionClassification: vi.fn(),
  getDocumentBinary: vi.fn(),
}));

const NOW = '2026-01-01T00:00:00.000Z';

function processingResult(): ProcessingResult {
  return {
    entities: [{ id: 'entity:1', name: 'Banco Sintetico', taxId: '900123456', kind: 'financial' }],
    normalizedRecords: [
      {
        id: 'record:1',
        rawId: 'raw:1',
        source: { sheet: 'Datos', row: 2, column: 4 },
        entityName: 'Banco Sintetico',
        entityTaxId: '900123456',
        reportingEntityDocument: '900123456',
        reportedPersonDocument: null,
        reportedPersonDocumentNormalized: null,
        identityMatch: 'match',
        conceptCode: null,
        conceptLabel: 'Saldo cuenta bancaria',
        reportedValue: 1_000_000,
        withholding: null,
        currency: 'COP',
        suggestedUse: null,
        classificationVersion: 'v1',
        nature: 'asset',
        category: 'asset',
        treatment: 'add_to_assets',
        confidence: 'high',
        classificationEvidence: [],
        secondaryUses: [],
        multiplicityType: 'unique',
        multiplicityExplanation: null,
        consolidationDisposition: 'include',
        consolidationReason: '',
        extra: {},
      },
    ],
  } as unknown as ProcessingResult;
}

function baseCandidate(overrides: Partial<DocumentFactCandidate> = {}): DocumentFactCandidate {
  return {
    id: 'candidate:1',
    caseId: 'case:1',
    documentId: 'document:1',
    extractionSessionId: 'session:1',
    page: 1,
    proposedEntityId: 'entity:1',
    entityName: 'Banco Sintetico',
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
    extractedValue: 1_000_000,
    correctedValue: null,
    finalValue: null,
    currency: 'COP',
    period: '2025',
    cutoffDate: '2025-12-31',
    evidence: {
      page: 1,
      excerpt: 'Saldo al cierre: $ 1.000.000',
      detectedLabel: 'Saldo al cierre',
      detectedValue: '$ 1.000.000',
      location: 'page:1',
    },
    adapterId: 'co.balance-certificate',
    adapterVersion: '1.0.0',
    ruleId: 'rule:balance',
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
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

const session = {
  id: 'session:1',
  caseId: 'case:1',
  documentId: 'document:1',
  runNumber: 1,
  status: 'ready_for_review' as const,
  phase: 'review' as const,
  completedPhases: [],
  pageCount: 1,
  readablePageCount: 1,
  candidateIds: ['candidate:1'],
  classification: null,
  adapterId: null,
  adapterVersion: null,
  findings: [],
  textPersisted: false as const,
  errorCode: null,
  errorMessage: null,
  supersedesSessionId: null,
  obsoleteCandidateIds: [],
  startedAt: NOW,
  finishedAt: NOW,
  updatedAt: NOW,
};

describe('EvidenceReviewPanel', () => {
  it('muestra un estado vacío sin sesiones de extracción', () => {
    render(
      <EvidenceReviewPanel
        caseId="case:1"
        documents={[]}
        products={[]}
        sessions={[]}
        candidates={[]}
        onOpenReconciliations={() => undefined}
      />,
    );
    expect(screen.getByText('Sin extracciones documentales')).toBeInTheDocument();
  });

  it('agrupa una coincidencia exacta como "Coinciden con la exógena" y permite confirmarla', async () => {
    const candidate = baseCandidate({
      suggestedExogenousMatches: [
        {
          recordId: 'record:1',
          status: 'exact_match',
          reasons: ['Mismo valor.'],
          exogenousValue: 1_000_000,
          difference: 0,
        },
      ],
    });
    render(
      <EvidenceReviewPanel
        caseId="case:1"
        result={processingResult()}
        documents={[]}
        products={[]}
        sessions={[session]}
        candidates={[candidate]}
        onOpenReconciliations={() => undefined}
      />,
    );
    expect(screen.getByText('Coinciden con la exógena')).toBeInTheDocument();
    expect(screen.getByText('Saldo cuenta bancaria')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    await waitFor(() =>
      expect(confirmEvidenceMatch).toHaveBeenCalledWith(
        'candidate:1',
        expect.objectContaining({ exogenousRecordId: 'record:1', matchStatus: 'exact_match' }),
      ),
    );
  });

  it('ofrece captura manual guiada cuando la exógena espera un valor sin ningún candidato', async () => {
    render(
      <EvidenceReviewPanel
        caseId="case:1"
        result={processingResult()}
        documents={[]}
        products={[]}
        sessions={[session]}
        candidates={[]}
        onOpenReconciliations={() => undefined}
      />,
    );
    expect(screen.getByText('Datos que faltan')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Capturar manualmente/ }));
    const input = screen.getByLabelText(/Valor observado en el documento/);
    fireEvent.change(input, { target: { value: '1.000.000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() =>
      expect(createGuidedManualCapture).toHaveBeenCalledWith(
        'case:1',
        expect.objectContaining({ value: 1_000_000, expectedEvidenceId: 'expected:record:1' }),
      ),
    );
  });

  it('alterna el modo avanzado sin ocultar la revisión guiada', () => {
    const candidate = baseCandidate({ suggestedExogenousMatches: [] });
    render(
      <EvidenceReviewPanel
        caseId="case:1"
        result={processingResult()}
        documents={[]}
        products={[]}
        sessions={[session]}
        candidates={[candidate]}
        onOpenReconciliations={() => undefined}
      />,
    );
    const toggle = screen.getByRole('button', { name: /Ver otros datos detectados/ });
    fireEvent.click(toggle);
    expect(screen.getByRole('button', { name: /Ocultar modo avanzado/ })).toBeInTheDocument();
  });
});
