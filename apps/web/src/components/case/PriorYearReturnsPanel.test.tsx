import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { PriorYearCarryForwardCandidate, PriorYearTaxReturn, TaxCase } from '@nexus-tax/domain';
import { PriorYearReturnsPanel } from './PriorYearReturnsPanel';

vi.mock('@/lib/repository', () => ({
  savePriorYearReturn: vi.fn(),
  removePriorYearReturn: vi.fn(),
  refreshPriorYearCarryForwardCandidates: vi.fn(),
  decideCarryForwardCandidate: vi.fn(),
  answerRefundCarryForwardQuestion: vi.fn(),
  discardCaseTask: vi.fn(),
  saveTaxResolutionDecision: vi.fn(),
}));

function taxCase(): TaxCase {
  return {
    id: 'case-1',
    alias: 'Prueba',
    taxpayer: { documentType: 'CC', documentMasked: '••••4567', displayName: 'Analista' },
    taxYear: 2025,
    filingYear: 2026,
    status: 'new',
    createdAt: '2026-09-05T00:00:00.000Z',
    updatedAt: '2026-09-05T00:00:00.000Z',
  };
}

function priorReturn(overrides: Partial<PriorYearTaxReturn> = {}): PriorYearTaxReturn {
  return {
    id: 'prior-return:1',
    caseId: 'case-1',
    taxYear: 2024,
    filingYear: 2025,
    formType: '210',
    formNumber: '1102345678901',
    previousFormNumber: null,
    taxpayerIdentityMasked: '••••4567',
    submittedAt: '2025-05-10T00:00:00.000Z',
    sourceDocumentId: 'doc-1',
    status: 'submitted',
    identityMatch: 'match',
    replaces: null,
    replacedBy: null,
    isCurrentVersion: true,
    boxes: {
      '133': {
        boxNumber: 133,
        rawValue: '79.000',
        normalizedValueCop: 79_000,
        extractionMethod: 'native_text',
        confidence: 'high',
        role: 'carry_forward_candidate',
        page: 2,
        evidence: '133 Anticipo 79.000',
      },
    },
    extractionConfidence: 'high',
    parserVersion: 'form210-prior-year-1.0.0',
    createdAt: '2026-09-05T00:00:00.000Z',
    updatedAt: '2026-09-05T00:00:00.000Z',
    ...overrides,
  };
}

describe('PriorYearReturnsPanel (Sprint 2.4, Fase B1)', () => {
  it('muestra el estado vacío cuando no hay declaraciones anteriores', () => {
    render(
      <PriorYearReturnsPanel
        caseId="case-1"
        taxCase={taxCase()}
        priorYearReturns={[]}
        carryForwardCandidates={[]}
        tasks={[]}
      />,
    );
    expect(screen.getByText('No has agregado declaraciones anteriores')).toBeInTheDocument();
  });

  it('muestra la tarjeta del año con estado y casillas reconocidas', () => {
    render(
      <PriorYearReturnsPanel
        caseId="case-1"
        taxCase={taxCase()}
        priorYearReturns={[priorReturn()]}
        carryForwardCandidates={[]}
        tasks={[]}
      />,
    );
    expect(screen.getByText('AG 2024')).toBeInTheDocument();
    expect(screen.getByText('Presentada')).toBeInTheDocument();
    expect(screen.getByText('Identidad verificada')).toBeInTheDocument();
  });

  it('muestra la tarjeta de anticipo con el valor detectado y permite aplicarlo', () => {
    const candidate: PriorYearCarryForwardCandidate = {
      id: 'carry:1',
      caseId: 'case-1',
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
    };
    render(
      <PriorYearReturnsPanel
        caseId="case-1"
        taxCase={taxCase()}
        priorYearReturns={[priorReturn()]}
        carryForwardCandidates={[candidate]}
        tasks={[]}
      />,
    );
    expect(screen.getByText('Anticipo del año anterior')).toBeInTheDocument();
    expect(screen.getByText('$ 79.000')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Aplicar' })).toBeInTheDocument();
  });

  it('bloquea el uso cuando la identidad no coincide', () => {
    render(
      <PriorYearReturnsPanel
        caseId="case-1"
        taxCase={taxCase()}
        priorYearReturns={[priorReturn({ identityMatch: 'mismatch' })]}
        carryForwardCandidates={[]}
        tasks={[]}
      />,
    );
    expect(screen.getByText('Identidad no verificada')).toBeInTheDocument();
  });
});
