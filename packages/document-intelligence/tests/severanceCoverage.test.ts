import { describe, expect, it } from 'vitest';
import { DEFAULT_PDF_LIMITS, extractCandidates } from '../src';
import { representation } from './fixtures';

/**
 * Sprint 2.4, Fase F.3 — Unified Reconciliation & Coverage Hardening (§8/§21).
 *
 * Cobertura estructural de cesantías: verifica que cada subconcepto real
 * (saldo, rendimiento, aporte/consignación, retiro) produzca una
 * categoría COMPATIBLE con la categoría que la exógena asigna al mismo
 * subconcepto (`packages/exogenous-parser/src/classification.ts`), para
 * que `suggestExogenousMatches` pueda emparejarlos. Ningún valor es real.
 */

const context = {
  caseId: 'case:synthetic',
  documentId: 'document:synthetic',
  sessionId: 'session:synthetic',
  timestamp: '2026-09-01T00:00:00.000Z',
};

describe('co.severance.generic — cobertura estructural de subconceptos (Fase F.3, §8)', () => {
  it('saldo: category="severance" (compatible con el fallback exógeno de cesantías, no "asset")', () => {
    const result = extractCandidates(
      representation('Saldo final del fondo de cesantías: $ 3.000.000'),
      'severance_certificate',
      context,
      DEFAULT_PDF_LIMITS,
    );
    const candidate = result.candidates.find((c) => c.ruleId === 'closing-balance');
    expect(candidate).toBeDefined();
    expect(candidate!.proposedCategory).toBe('severance');
  });

  it('cesantías abonadas: category="severance"', () => {
    const result = extractCandidates(
      representation('Cesantías abonadas durante el año: $ 1.200.000'),
      'severance_certificate',
      context,
      DEFAULT_PDF_LIMITS,
    );
    const candidate = result.candidates.find((c) => c.ruleId === 'credited');
    expect(candidate).toBeDefined();
    expect(candidate!.proposedCategory).toBe('severance');
  });

  it('aporte/consignación patronal: category="severance" (antes caía en bank_movement en la exógena)', () => {
    const result = extractCandidates(
      representation('Consignación patronal cesantías: $ 1.200.000'),
      'severance_certificate',
      context,
      DEFAULT_PDF_LIMITS,
    );
    const candidate = result.candidates.find((c) => c.ruleId === 'credited');
    expect(candidate).toBeDefined();
    expect(candidate!.proposedCategory).toBe('severance');
  });

  it('retiros: category="severance"', () => {
    const result = extractCandidates(
      representation('Retiros de cesantías durante el año: $ 500.000'),
      'severance_certificate',
      context,
      DEFAULT_PDF_LIMITS,
    );
    const candidate = result.candidates.find((c) => c.ruleId === 'withdrawals');
    expect(candidate).toBeDefined();
    expect(candidate!.proposedCategory).toBe('severance');
  });

  it('rendimientos: category="financial_income" (compatible con la excepción exógena para intereses de cesantías)', () => {
    const result = extractCandidates(
      representation('Rendimientos del fondo de cesantías: $ 80.000'),
      'severance_certificate',
      context,
      DEFAULT_PDF_LIMITS,
    );
    const candidate = result.candidates.find((c) => c.ruleId === 'returns');
    expect(candidate).toBeDefined();
    expect(candidate!.proposedCategory).toBe('financial_income');
  });
});
