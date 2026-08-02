import { describe, expect, it } from 'vitest';
import { computeDocumentProfileSignals, matchDocumentProfiles } from '../src';
import { documentFromPages, diagnosisPage } from './fixtures';
import type { DocumentProfile } from '@nexus-tax/domain';

function baseProfile(overrides: Partial<DocumentProfile> = {}): DocumentProfile {
  return {
    id: 'profile-1',
    name: 'Certificado de saldos — Banco Ficticio',
    documentKind: 'balance_certificate',
    entityId: null,
    brandName: 'Banco Ficticio',
    signals: {
      pageWidth: 612,
      pageHeight: 792,
      pageCount: 1,
      sectionLabels: ['balances'],
      headerKeywords: ['certificado de saldos'],
    },
    expectedPageCount: 1,
    zones: [],
    fields: ['balance'],
    adapterId: 'co.balance-certificate.generic',
    version: '1.0.0',
    confidence: 'high',
    origin: 'manual',
    status: 'active',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('señales estructurales de documentos', () => {
  it('calcula dimensiones, número de páginas y palabras del encabezado', () => {
    const document = documentFromPages([
      diagnosisPage({
        pageNumber: 1,
        normalizedText: 'Certificado de saldos\nBanco Ficticio\nSaldo: 100',
        readConfidence: 'high',
        width: 612,
        height: 792,
        sections: [{ id: 's1', label: 'balances', kind: 'balances', startLine: 0, endLine: 1 }],
      }),
    ]);
    const signals = computeDocumentProfileSignals(document);
    expect(signals.pageWidth).toBe(612);
    expect(signals.pageHeight).toBe(792);
    expect(signals.pageCount).toBe(1);
    expect(signals.sectionLabels).toEqual(['balances']);
    expect(signals.headerKeywords[0]).toBe('certificado de saldos');
  });
});

describe('matching de perfiles documentales', () => {
  it('no sugiere nada si el tipo documental no coincide', () => {
    const signals = {
      pageWidth: 612,
      pageHeight: 792,
      pageCount: 1,
      sectionLabels: ['balances'],
      headerKeywords: ['certificado de saldos'],
    };
    const matches = matchDocumentProfiles(signals, 'debt_certificate', [baseProfile()]);
    expect(matches).toEqual([]);
  });

  it('nunca asocia solo por nombre de archivo: requiere señales estructurales reales', () => {
    const signals = {
      pageWidth: 200,
      pageHeight: 300,
      pageCount: 5,
      sectionLabels: ['debts'],
      headerKeywords: ['algo completamente distinto'],
    };
    const matches = matchDocumentProfiles(signals, 'balance_certificate', [baseProfile()]);
    expect(matches).toEqual([]);
  });

  it('da confianza alta cuando todas las señales coinciden', () => {
    const signals = {
      pageWidth: 612,
      pageHeight: 792,
      pageCount: 1,
      sectionLabels: ['balances'],
      headerKeywords: ['certificado de saldos'],
    };
    const matches = matchDocumentProfiles(signals, 'balance_certificate', [baseProfile()]);
    expect(matches).toHaveLength(1);
    expect(matches[0]?.confidence).toBe('high');
    expect(matches[0]?.score).toBeCloseTo(1, 5);
    expect(matches[0]?.reasons.length).toBeGreaterThan(0);
  });

  it('excluye perfiles obsoletos y ordena por score descendente', () => {
    const signals = {
      pageWidth: 612,
      pageHeight: 792,
      pageCount: 1,
      sectionLabels: ['balances'],
      headerKeywords: ['certificado de saldos'],
    };
    const obsolete = baseProfile({ id: 'profile-obsolete', status: 'obsolete' });
    const partial = baseProfile({
      id: 'profile-partial',
      signals: { ...baseProfile().signals, sectionLabels: ['debts'], headerKeywords: ['otro'] },
    });
    const matches = matchDocumentProfiles(signals, 'balance_certificate', [
      obsolete,
      partial,
      baseProfile(),
    ]);
    expect(matches.map((match) => match.profileId)).toEqual(['profile-1', 'profile-partial']);
    expect(matches[0]!.score).toBeGreaterThan(matches[1]!.score);
  });
});
