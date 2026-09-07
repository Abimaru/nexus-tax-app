import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PDF_LIMITS,
  extractCandidates,
  suggestExogenousMatches,
  type NormalizedExogenousRecord,
} from '@nexus-tax/document-intelligence';
import { representation } from '../../document-intelligence/tests/fixtures';
import { evaluateReconciliationDifference } from '../src/reconciliationPolicy';

/**
 * Sprint 2.4, Fase F.3 — Unified Reconciliation & Coverage Hardening (§20).
 *
 * Guardarraíl obligatorio: "same numeric pair cannot receive contradictory
 * reconciliation policy outcomes". Verifica que `suggestExogenousMatches`
 * (candidato↔exógena, `@nexus-tax/document-intelligence`) y
 * `evaluateReconciliationDifference` (umbral/matriz,
 * `@nexus-tax/exogenous-parser`) — los dos consumidores auditados en F.3 —
 * produzcan un veredicto NUMÉRICO compatible para el mismo par de valores,
 * porque ambos derivan de la misma política central
 * (`evaluateNumericReconciliation`, `@nexus-tax/domain`).
 *
 * "Compatible" aquí significa: ambos concuerdan en si el par es
 * exacto/redondeo (reconciliado sin revisión relevante), diferencia menor,
 * o diferencia relevante — nunca uno dice "reconciliado" mientras el otro
 * dice "diferencia relevante" para el MISMO par numérico.
 */

const context = {
  caseId: 'case:synthetic',
  documentId: 'document:synthetic',
  sessionId: 'session:synthetic',
  timestamp: '2026-09-01T00:00:00.000Z',
};

type Bucket = 'reconciled_or_rounding' | 'minor' | 'relevant';

function matcherBucket(status: string): Bucket {
  if (status === 'exact_match' || status === 'rounding_match') return 'reconciled_or_rounding';
  if (status === 'minor_difference') return 'minor';
  return 'relevant';
}

function policyBucket(status: string): Bucket {
  if (status === 'reconciled' || status === 'rounding_difference') return 'reconciled_or_rounding';
  if (status === 'minor_difference') return 'minor';
  return 'relevant';
}

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

describe('Guardarraíl F.3 (§20): mismo par numérico → resultado compatible entre los dos consumidores', () => {
  it.each([
    { label: 'exacto', documentValue: 1_000_000, exogenousValue: 1_000_000 },
    { label: 'redondeo $1', documentValue: 1_000_000, exogenousValue: 1_000_001 },
    { label: 'menor ($50, 0.005%)', documentValue: 1_000_000, exogenousValue: 1_000_050 },
    { label: 'relevante ($101 en monto grande)', documentValue: 10_000_000 - 101, exogenousValue: 10_000_000 },
    { label: 'relevante (1%)', documentValue: 9_900, exogenousValue: 10_000 },
  ])('$label: ambos consumidores concuerdan en el mismo balde de resultado', ({ documentValue, exogenousValue }) => {
    const candidate = extractCandidates(
      representation(`Saldo al cierre: $ ${documentValue}`),
      'balance_certificate',
      context,
      DEFAULT_PDF_LIMITS,
    ).candidates[0]!;
    const [match] = suggestExogenousMatches(candidate, [
      record({ category: candidate.proposedCategory, reportedValue: exogenousValue }),
    ]);
    const policy = evaluateReconciliationDifference({
      leftValue: documentValue,
      rightValue: exogenousValue,
      source: 'document',
      roundingUnit: 1,
      groupNature: 'asset',
    });
    expect(matcherBucket(match!.status)).toBe(policyBucket(policy.status));
  });
});
