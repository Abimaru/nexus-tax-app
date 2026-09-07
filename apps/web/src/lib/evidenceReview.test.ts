import { describe, expect, it } from 'vitest';
import type { DocumentFactCandidate, ProcessingResult } from '@nexus-tax/domain';
import {
  buildEvidenceReviewSuggestions,
  buildExpectedTaxEvidence,
  computeHumanReviewBurden,
} from './evidenceReview';

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

  it('Sprint 2.4, Fase F.3 (§16): excluye categorías estructuralmente sin certificado esperado', () => {
    const result = {
      entities: [],
      normalizedRecords: (
        ['card_consumption', 'bank_movement', 'investment_movement', 'electronic_invoicing_total', 'electronic_invoicing_benefit_base', 'asset'] as const
      ).map((category, index) => ({
        id: `record:${index}`,
        rawId: `raw:${index}`,
        source: { sheet: 'Datos', row: index + 2, column: 4 },
        entityName: 'Entidad Sintetica',
        entityTaxId: null,
        reportingEntityDocument: null,
        reportedPersonDocument: null,
        reportedPersonDocumentNormalized: null,
        identityMatch: 'unavailable',
        conceptCode: null,
        conceptLabel: `Concepto ${category}`,
        reportedValue: 1_000,
        withholding: null,
        currency: 'COP',
        suggestedUse: null,
        classificationVersion: 'v1',
        nature: 'unclassified',
        category,
        treatment: 'do_not_aggregate',
        confidence: 'medium',
        classificationEvidence: [],
        secondaryUses: [],
        multiplicityType: 'single',
        multiplicityExplanation: null,
        consolidationDisposition: 'included',
        consolidationReason: '',
        extra: {},
      })),
    } as unknown as ProcessingResult;
    const expectations = buildExpectedTaxEvidence({ caseId: 'case:1', result });
    // Solo la categoría "asset" (la última) genera expectativa; las 5
    // categorías del §16 quedan excluidas.
    expect(expectations).toHaveLength(1);
    expect(expectations[0]?.category).toBe('asset');
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

  it('resuelve una ambigüedad de dos registros para el mismo candidato: elegir uno deja al otro "unresolved" (§12/§17)', () => {
    const expectationA = buildExpectedTaxEvidence({
      caseId: 'case:1',
      result: processingResult(),
    })[0]!;
    const expectationB = { ...expectationA, id: 'expected:record:2', sourceId: 'record:2' };
    const candidate = baseCandidate({
      suggestedExogenousMatches: [
        {
          recordId: 'record:1',
          status: 'ambiguous',
          reasons: ['Empate con otro registro.'],
          exogenousValue: 1_000_000,
          difference: 0,
        },
        {
          recordId: 'record:2',
          status: 'ambiguous',
          reasons: ['Empate con otro registro.'],
          exogenousValue: 1_000_000,
          difference: 0,
        },
      ],
    });
    const suggestions = buildEvidenceReviewSuggestions({
      caseId: 'case:1',
      candidates: [candidate],
      expectedEvidence: [expectationA, expectationB],
      now: NOW,
    });
    expect(suggestions).toHaveLength(2);
    expect(suggestions.every((item) => item.candidateId === candidate.id)).toBe(true);
    expect(suggestions.every((item) => item.status === 'needs_review')).toBe(true);
    expect(suggestions.every((item) => item.allowedActions.includes('confirm'))).toBe(true);

    // Al "consumir" el candidato (factId asignado tras confirmar una de las
    // dos expectativas), la recomputación ya no lo encuentra abierto para
    // la otra expectativa: vuelve a "unresolved" sin un mecanismo paralelo
    // de "elegir entre alternativas".
    const candidateConsumed = { ...candidate, factId: 'fact:chosen' };
    const suggestionsAfterChoice = buildEvidenceReviewSuggestions({
      caseId: 'case:1',
      candidates: [candidateConsumed],
      expectedEvidence: [expectationA, expectationB],
      now: NOW,
    });
    expect(suggestionsAfterChoice).toHaveLength(2);
    expect(suggestionsAfterChoice.every((item) => item.status === 'unresolved')).toBe(true);
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

  it('Sprint 2.4, Fase F.3 (§16): un candidato cuya única coincidencia apunta a un registro excluido (p. ej. bank_movement) NO desaparece silenciosamente', () => {
    // El registro exógeno "record:excluded" pertenece a una categoría
    // filtrada por `buildExpectedTaxEvidence` (§16), así que NUNCA
    // aparece en `expectedEvidence` — pero el candidato SÍ tiene un match
    // exitoso contra ese recordId. Debe seguir surgiendo como "posible
    // valor nuevo", nunca ocultarse (§28).
    const candidate = baseCandidate({
      suggestedExogenousMatches: [
        {
          recordId: 'record:excluded',
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
      expectedEvidence: [], // record:excluded nunca llega aquí (§16)
      now: NOW,
    });
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]).toMatchObject({ status: 'new_relevant_value', candidateId: candidate.id });
  });

  it('Sprint 2.4, Fase F.2 (§15): la vivienda sin exógena NO se presenta como error', () => {
    const candidate = baseCandidate({
      proposedCategory: 'housing_interest',
      proposedNature: 'deduction',
      suggestedExogenousMatches: [],
    });
    const suggestions = buildEvidenceReviewSuggestions({
      caseId: 'case:1',
      candidates: [candidate],
      expectedEvidence: [],
      now: NOW,
    });
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]?.status).toBe('new_relevant_value');
    expect(suggestions[0]?.reasons.join(' ')).not.toMatch(/no aparece en (la )?ex[oó]gena/i);
    expect(suggestions[0]?.reasons.join(' ')).toMatch(/no necesitamos una coincidencia en ex[oó]gena/i);
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

  it('excluye por completo una expectativa ya conciliada, sin volver a mostrarla como "unresolved" (§18)', () => {
    const expectation = buildExpectedTaxEvidence({ caseId: 'case:1', result: processingResult() })[0]!;
    // El candidato que confirmó esta expectativa ya quedó consumido
    // (factId), así que sin la exclusión explícita reaparecería como
    // "unresolved" pese a estar ya conciliada.
    const suggestions = buildEvidenceReviewSuggestions({
      caseId: 'case:1',
      candidates: [],
      expectedEvidence: [expectation],
      reconciledExogenousRecordIds: new Set([expectation.sourceId]),
      now: NOW,
    });
    expect(suggestions).toHaveLength(0);
  });
});

describe('computeHumanReviewBurden (Fase F.3, §1/§19)', () => {
  it('clasifica cada estado en el balde correcto', () => {
    const burden = computeHumanReviewBurden([
      { status: 'matched', safeForBulkConfirm: true },
      { status: 'matched', safeForBulkConfirm: true },
      { status: 'matched', safeForBulkConfirm: false },
      { status: 'likely_match', safeForBulkConfirm: false },
      { status: 'needs_review', safeForBulkConfirm: false },
      { status: 'unresolved', safeForBulkConfirm: false },
      { status: 'unresolved', safeForBulkConfirm: false },
      { status: 'new_relevant_value', safeForBulkConfirm: false },
    ]);
    expect(burden).toEqual({
      bulkConfirmable: 2,
      meaningfulHumanReview: 3,
      manualGuidedCapture: 2,
      irrelevantCandidateReview: 1,
      unresolvedAfterAllDocuments: 2,
      total: 8,
    });
  });

  it('nunca cuenta una sugerencia en más de un balde (bulkConfirmable y meaningfulHumanReview son mutuamente excluyentes)', () => {
    const burden = computeHumanReviewBurden([
      { status: 'matched', safeForBulkConfirm: true },
    ]);
    expect(burden.bulkConfirmable).toBe(1);
    expect(burden.meaningfulHumanReview).toBe(0);
  });

  it('lista vacía produce todos los conteos en cero', () => {
    expect(computeHumanReviewBurden([])).toEqual({
      bulkConfirmable: 0,
      meaningfulHumanReview: 0,
      manualGuidedCapture: 0,
      irrelevantCandidateReview: 0,
      unresolvedAfterAllDocuments: 0,
      total: 0,
    });
  });
});
