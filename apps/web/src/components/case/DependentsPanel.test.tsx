import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { DependentEvaluation, TaxDependent } from '@nexus-tax/domain';
import { DependentsPanel } from './DependentsPanel';

vi.mock('@/lib/repository', () => ({
  createTaxDependent: vi.fn(),
  updateTaxDependent: vi.fn(),
  archiveTaxDependent: vi.fn(),
  saveDependentsCaseContext: vi.fn(),
  setNoDependentsDeclared: vi.fn(),
}));

function dependent(overrides: Partial<TaxDependent> = {}): TaxDependent {
  return {
    id: 'dep-1',
    caseId: 'case-1',
    fullName: 'María López',
    documentType: 'CC',
    documentNumber: '1130123532',
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
    caseId: 'case-1',
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

describe('DependentsPanel (Sprint 2.4, Fase C)', () => {
  it('muestra el estado vacío con las dos acciones principales', () => {
    render(
      <DependentsPanel
        caseId="case-1"
        taxYear={2025}
        dependents={[]}
        supports={[]}
        evaluations={[]}
        priorYearReturns={[]}
        tasks={[]}
        advanced={false}
        onToggleAdvanced={() => {}}
      />,
    );
    expect(screen.getByText('No has registrado dependientes')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Agregar dependiente' }).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'No tengo dependientes' })).toBeInTheDocument();
  });

  it('enmascara el documento y nunca muestra el número completo', () => {
    render(
      <DependentsPanel
        caseId="case-1"
        taxYear={2025}
        dependents={[dependent()]}
        supports={[]}
        evaluations={[evaluation()]}
        priorYearReturns={[]}
        tasks={[]}
        advanced={false}
        onToggleAdvanced={() => {}}
      />,
    );
    expect(screen.queryByText('1130123532')).not.toBeInTheDocument();
    expect(screen.getByText(/113\.\*+\.3532/)).toBeInTheDocument();
  });

  it('modo normal no muestra el nombre del artículo; modo avanzado sí', () => {
    const { rerender } = render(
      <DependentsPanel
        caseId="case-1"
        taxYear={2025}
        dependents={[dependent()]}
        supports={[]}
        evaluations={[evaluation()]}
        priorYearReturns={[]}
        tasks={[]}
        advanced={false}
        onToggleAdvanced={() => {}}
      />,
    );
    expect(screen.getByText('Puede aplicar a 2 beneficios')).toBeInTheDocument();
    expect(screen.queryByText(/Art\. 387/)).not.toBeInTheDocument();

    rerender(
      <DependentsPanel
        caseId="case-1"
        taxYear={2025}
        dependents={[dependent()]}
        supports={[]}
        evaluations={[evaluation()]}
        priorYearReturns={[]}
        tasks={[]}
        advanced
        onToggleAdvanced={() => {}}
      />,
    );
    expect(screen.getByText(/Art\. 387/)).toBeInTheDocument();
  });

  it('muestra la señal histórica sin crear dependientes automáticamente', () => {
    render(
      <DependentsPanel
        caseId="case-1"
        taxYear={2025}
        dependents={[]}
        supports={[]}
        evaluations={[]}
        priorYearReturns={[
          {
            id: 'prior-1',
            caseId: 'case-1',
            taxYear: 2024,
            filingYear: 2025,
            formType: '210',
            formNumber: null,
            previousFormNumber: null,
            taxpayerIdentityMasked: null,
            submittedAt: null,
            sourceDocumentId: 'doc-1',
            status: 'submitted',
            identityMatch: 'match',
            replaces: null,
            replacedBy: null,
            isCurrentVersion: true,
            boxes: {
              '138': {
                boxNumber: 138,
                rawValue: '3',
                normalizedValueCop: 3,
                extractionMethod: 'native_text',
                confidence: 'high',
                role: 'historical_reference',
                page: 1,
                evidence: null,
              },
            },
            extractionConfidence: 'high',
            parserVersion: 'test',
            createdAt: '2026-09-05T00:00:00.000Z',
            updatedAt: '2026-09-05T00:00:00.000Z',
          },
        ]}
        tasks={[]}
        advanced={false}
        onToggleAdvanced={() => {}}
      />,
    );
    expect(screen.getByText(/El año anterior registraste 3 dependiente/)).toBeInTheDocument();
    // No debe existir ningún dependiente creado automáticamente.
    expect(screen.getByText('No has registrado dependientes')).toBeInTheDocument();
  });
});
