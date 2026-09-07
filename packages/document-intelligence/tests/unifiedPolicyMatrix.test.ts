import { describe, expect, it } from 'vitest';
import type { NormalizedExogenousRecord } from '@nexus-tax/domain';
import { DEFAULT_PDF_LIMITS, extractCandidates, suggestExogenousMatches } from '../src';
import { representation } from './fixtures';

/**
 * Sprint 2.4, Fase F.3 — Unified Reconciliation & Coverage Hardening (§20).
 *
 * Completa la matriz de tests obligatorios del scorer que no quedaban
 * cubiertos por `matching.test.ts` (exact/rounding/minor/ambiguous) ni por
 * `semanticGate.test.ts` (contradicción semántica + exact_match). Aquí:
 * contradicción semántica + rounding_match, y diferencia absoluta pequeña
 * en monto pequeño.
 */

const context = {
  caseId: 'case:synthetic',
  documentId: 'document:synthetic',
  sessionId: 'session:synthetic',
  timestamp: '2026-09-01T00:00:00.000Z',
  entityName: 'Entidad Sintética',
};

function record(
  overrides: Partial<NormalizedExogenousRecord> & { category: NormalizedExogenousRecord['category'] },
): NormalizedExogenousRecord {
  return {
    id: `record:${Math.random().toString(36).slice(2)}`,
    rawId: 'raw:1',
    source: { sheet: 'Datos', row: 1 },
    entityName: '',
    entityTaxId: null,
    reportingEntityDocument: null,
    reportedPersonDocument: null,
    reportedPersonDocumentNormalized: null,
    identityMatch: 'unavailable',
    conceptCode: null,
    conceptLabel: 'Concepto sintético',
    reportedValue: 0,
    withholding: null,
    currency: 'COP',
    suggestedUse: null,
    classificationVersion: 'synthetic',
    nature: 'unclassified',
    treatment: 'do_not_aggregate',
    confidence: 'medium',
    classificationEvidence: [],
    secondaryUses: [],
    multiplicityType: 'single',
    multiplicityExplanation: null,
    consolidationDisposition: 'included',
    consolidationReason: 'synthetic',
    extra: {},
    ...overrides,
  } as NormalizedExogenousRecord;
}

describe('Fase F.3 — matriz obligatoria del scorer (§20)', () => {
  it('contradicción semántica + rounding_match: nunca queda bulk-confirmable', () => {
    const candidate = extractCandidates(
      representation('Retención sobre rendimientos financieros $ 1.234.567,40'),
      'income_withholding_certificate',
      context,
      DEFAULT_PDF_LIMITS,
    ).candidates[0]!;
    // El candidato ya se clasifica como `withholding` (Fase F.2 corrigió
    // la causa raíz), pero se compara aquí contra un registro de
    // INGRESOS cuyo valor redondea exactamente — contradicción cruzada
    // (§6 de docs/EVIDENCE_MATCHING.md) que debe bloquear el rounding_match.
    const [match] = suggestExogenousMatches(candidate, [
      record({ category: 'financial_income', reportedValue: 1_234_567, entityName: 'Entidad Sintética' }),
    ]);
    expect(match?.status).not.toBe('exact_match');
    expect(match?.status).not.toBe('rounding_match');
    expect(match?.anomalyCodes).toContain('semantic_concept_contradiction');
  });

  it('diferencia absoluta pequeña en monto pequeño: sigue siendo rounding, nunca "relevante" solo por ser un monto chico', () => {
    const candidate = extractCandidates(
      representation('Saldo al cierre: $ 500'),
      'balance_certificate',
      context,
      DEFAULT_PDF_LIMITS,
    ).candidates[0]!;
    const [match] = suggestExogenousMatches(candidate, [
      record({ category: candidate.proposedCategory, reportedValue: 501 }),
    ]);
    expect(match?.status).toBe('rounding_match');
  });
});
