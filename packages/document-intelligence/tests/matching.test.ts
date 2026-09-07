import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PDF_LIMITS,
  describeMatchConfidence,
  extractCandidates,
  suggestExogenousMatches,
} from '../src';
import { representation } from './fixtures';

const context = {
  caseId: 'case:synthetic',
  documentId: 'document:synthetic',
  sessionId: 'session:synthetic',
  timestamp: '2026-08-01T00:00:00.000Z',
};

describe('suggestExogenousMatches — estados granulares (Sprint 2.4, Fase E)', () => {
  it('detecta un redondeo explícito: el decimal documental redondea al entero de la exógena', () => {
    const candidate = extractCandidates(
      representation('Saldo al cierre: $ 1.000.000'),
      'balance_certificate',
      context,
      DEFAULT_PDF_LIMITS,
    ).candidates[0]!;
    const roundingCandidate = {
      ...candidate,
      extractedValue: 1_000_000.4,
      amount: candidate.amount
        ? { ...candidate.amount, decimalValue: 1_000_000.4, roundedTaxValue: 1_000_000 }
        : candidate.amount,
    };
    const record = {
      id: 'record:1',
      category: candidate.proposedCategory,
      reportedValue: 1_000_000,
      entityName: '',
    } as Parameters<typeof suggestExogenousMatches>[1][number];
    const [match] = suggestExogenousMatches(roundingCandidate, [record]);
    expect(match?.status).toBe('rounding_match');
    expect(match?.reasons.join(' ')).toMatch(/redondea/i);
    // Sprint 2.4, Fase E.1, §11: "por redondeo" reemplaza a "valor
    // cercano", nunca coexisten — la UI no debe mostrar ambas frases.
    expect(match?.reasons).not.toContain('Valor cercano.');
  });

  it('marca ambiguo cuando dos registros empatan en el primer lugar', () => {
    const candidate = extractCandidates(
      representation('Saldo al cierre: $ 1.000.000'),
      'balance_certificate',
      context,
      DEFAULT_PDF_LIMITS,
    ).candidates[0]!;
    const recordA = {
      id: 'record:a',
      category: candidate.proposedCategory,
      reportedValue: 1_000_100,
      entityName: '',
    } as Parameters<typeof suggestExogenousMatches>[1][number];
    const recordB = {
      id: 'record:b',
      category: candidate.proposedCategory,
      reportedValue: 999_900,
      entityName: '',
    } as Parameters<typeof suggestExogenousMatches>[1][number];
    const matches = suggestExogenousMatches(candidate, [recordA, recordB]);
    expect(matches[0]?.status).toBe('ambiguous');
    expect(matches[1]?.status).toBe('ambiguous');
  });

  it('Fase F.3 (política unificada): un desfase de $1 se trata como redondeo, sin importar si proviene de centavos o de un entero', () => {
    // Antes de la unificación (Fase F.3), un desfase de exactamente $1
    // entre dos valores enteros producía `minor_difference`, mientras que
    // el mismo desfase originado por centavos producía `rounding_match`
    // — una divergencia real detectada en el benchmark (Fase F.1). La
    // política única (`evaluateNumericReconciliation`, §3-§4 del prompt
    // de Fase F.3) trata ambos casos igual: un desfase dentro de la
    // tolerancia de redondeo ($1 por defecto) siempre es `rounding_match`,
    // fiscalmente equivalente, pero SIGUE exigiendo confirmación humana
    // explícita (nunca se autoconfirma silenciosamente).
    const candidate = extractCandidates(
      representation('Saldo al cierre: $ 1.000.000'),
      'balance_certificate',
      context,
      DEFAULT_PDF_LIMITS,
    ).candidates[0]!;
    const record = {
      id: 'record:1',
      category: candidate.proposedCategory,
      reportedValue: 1_000_001,
      entityName: '',
    } as Parameters<typeof suggestExogenousMatches>[1][number];
    const [match] = suggestExogenousMatches(candidate, [record]);
    expect(match?.status).toBe('rounding_match');
  });

  it('marca diferencia menor cuando el desfase supera la tolerancia de redondeo pero es absoluta y relativamente pequeño', () => {
    const candidate = extractCandidates(
      representation('Saldo al cierre: $ 1.000.000'),
      'balance_certificate',
      context,
      DEFAULT_PDF_LIMITS,
    ).candidates[0]!;
    // $50 de diferencia sobre $1.000.000 = 0.005 %: dentro de ambos
    // límites (absoluto ≤$100 y relativo ≤0.01 %) de la política única.
    const record = {
      id: 'record:1',
      category: candidate.proposedCategory,
      reportedValue: 1_000_050,
      entityName: '',
    } as Parameters<typeof suggestExogenousMatches>[1][number];
    const [match] = suggestExogenousMatches(candidate, [record]);
    expect(match?.status).toBe('minor_difference');
  });

  it('describeMatchConfidence nunca expone un score crudo, solo etiqueta y descripción', () => {
    for (const status of [
      'exact_match',
      'rounding_match',
      'minor_difference',
      'possible_match',
      'ambiguous',
      'contradiction',
      'no_match',
    ] as const) {
      const description = describeMatchConfidence(status);
      expect(description.label.length).toBeGreaterThan(0);
      expect(description.description.length).toBeGreaterThan(0);
      expect(description.label).not.toMatch(/\d/);
    }
  });
});
