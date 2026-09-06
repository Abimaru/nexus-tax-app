import { describe, expect, it } from 'vitest';
import type { DocumentFactCandidate, ProcessingResult } from '@nexus-tax/domain';
import { buildEvidenceReviewSuggestions, buildExpectedTaxEvidence } from './evidenceReview';

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

describe('buildExpectedTaxEvidence', () => {
  it('deriva una expectativa por cada registro exógeno con valor reportado', () => {
    const expectations = buildExpectedTaxEvidence({ caseId: 'case:1', result: processingResult() });
    expect(expectations).toHaveLength(1);
    expect(expectations[0]).toMatchObject({
      sourceKind: 'exogenous_record',
      sourceId: 'record:1',
      entityId: 'entity:1',
      conceptLabel: 'Saldo cuenta bancaria',
      expectedValueCop: 1_000_000,
    });
  });

  it('devuelve una lista vacía sin resultado procesado', () => {
    expect(buildExpectedTaxEvidence({ caseId: 'case:1' })).toEqual([]);
  });
});

describe('buildEvidenceReviewSuggestions', () => {
  it('marca "matched" y permite confirmación en bloque para un exact_match sin ambigüedad', () => {
    const expectation = buildExpectedTaxEvidence({ caseId: 'case:1', result: processingResult() })[0]!;
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
    const suggestions = buildEvidenceReviewSuggestions({
      caseId: 'case:1',
      candidates: [candidate],
      expectedEvidence: [expectation],
      now: NOW,
    });
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]).toMatchObject({
      status: 'matched',
      candidateId: candidate.id,
      safeForBulkConfirm: true,
    });
  });

  it('marca "unresolved" y ofrece captura manual cuando no hay ningún candidato para la expectativa', () => {
    const expectation = buildExpectedTaxEvidence({ caseId: 'case:1', result: processingResult() })[0]!;
    const suggestions = buildEvidenceReviewSuggestions({
      caseId: 'case:1',
      candidates: [],
      expectedEvidence: [expectation],
      now: NOW,
    });
    expect(suggestions[0]).toMatchObject({ status: 'unresolved', candidateId: null });
    expect(suggestions[0]?.allowedActions).toContain('capture_manually');
  });

  it('nunca permite confirmación en bloque para un estado ambiguo', () => {
    const expectation = buildExpectedTaxEvidence({ caseId: 'case:1', result: processingResult() })[0]!;
    const candidateA = baseCandidate({
      id: 'candidate:a',
      suggestedExogenousMatches: [
        { recordId: 'record:1', status: 'ambiguous', reasons: ['Empate.'], exogenousValue: 1_000_000, difference: 100 },
      ],
    });
    const candidateB = baseCandidate({
      id: 'candidate:b',
      suggestedExogenousMatches: [
        { recordId: 'record:1', status: 'ambiguous', reasons: ['Empate.'], exogenousValue: 1_000_000, difference: 100 },
      ],
    });
    const suggestions = buildEvidenceReviewSuggestions({
      caseId: 'case:1',
      candidates: [candidateA, candidateB],
      expectedEvidence: [expectation],
      now: NOW,
    });
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]?.status).toBe('needs_review');
    expect(suggestions[0]?.safeForBulkConfirm).toBe(false);
    expect(suggestions[0]?.allowedActions).toContain('choose_alternative');
  });

  it('marca "new_relevant_value" para un candidato sin ninguna relación con la exógena', () => {
    const candidate = baseCandidate({ suggestedExogenousMatches: [] });
    const suggestions = buildEvidenceReviewSuggestions({
      caseId: 'case:1',
      candidates: [candidate],
      expectedEvidence: [],
      now: NOW,
    });
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]).toMatchObject({ status: 'new_relevant_value', candidateId: candidate.id });
  });

  it('ignora candidatos ya confirmados (con factId) para no duplicar la revisión', () => {
    const candidate = baseCandidate({ factId: 'fact:1', status: 'confirmed' });
    const suggestions = buildEvidenceReviewSuggestions({
      caseId: 'case:1',
      candidates: [candidate],
      expectedEvidence: [],
      now: NOW,
    });
    expect(suggestions).toHaveLength(0);
  });
});
