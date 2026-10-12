import { describe, expect, it } from 'vitest';
import type { DocumentaryRequirement, RequirementCoverage } from '@nexus-tax/domain';
import {
  suggestRequirementMatches,
  type MatchCandidate,
  type MatchDocument,
  type MatchSession,
} from './requirementMatching';

const entities = [
  { id: 'e-banco', name: 'Banco A' },
  { id: 'e-fondo', name: 'Fondo B' },
];

function req(id: string, entityName: string, documentName: string): DocumentaryRequirement {
  return {
    id,
    entityName,
    entityCategory: 'bank',
    documentName,
    documentCategory: 'Financiero',
    reason: 'x',
    status: 'pending',
    recommendationSource: 't',
    confidence: 'medium',
    isLegallyRequired: false,
    attachment: null,
  } as DocumentaryRequirement;
}

function doc(
  id: string,
  kind: MatchDocument['kind'],
  extra: Partial<MatchDocument> = {},
): MatchDocument {
  return { id, fileName: `${id}.pdf`, kind, status: 'active', entityIds: [], ...extra };
}

function session(
  documentId: string,
  kind: NonNullable<MatchSession['classification']>['proposedKind'],
  confidence: 'high' | 'medium' | 'low',
): MatchSession {
  return {
    documentId,
    runNumber: 1,
    classification: { proposedKind: kind, correctedKind: null, confidence },
  };
}

const bankSaldos = req('r1', 'Banco A', 'Certificado de saldos');
const fondoSaldos = req('r2', 'Fondo B', 'Certificado de saldos');
const entityCandidate = (documentId: string, id: string): MatchCandidate => ({
  documentId,
  proposedEntityId: id,
});

function run(over: Partial<Parameters<typeof suggestRequirementMatches>[0]>) {
  return suggestRequirementMatches({
    documents: [],
    sessions: [],
    candidates: [],
    requirements: [bankSaldos, fondoSaldos],
    coverages: [],
    entities,
    ...over,
  });
}

describe('suggestRequirementMatches', () => {
  it('sugiere «segura» cuando coinciden tipo adoptado y entidad', () => {
    const result = run({
      documents: [doc('d1', 'balance_certificate')],
      candidates: [entityCandidate('d1', 'e-banco')],
    });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ requirementId: 'r1', strength: 'strong' });
  });

  it('degrada a «probable» si el tipo solo es una propuesta de confianza media', () => {
    const result = run({
      documents: [doc('d1', 'other')],
      sessions: [session('d1', 'balance_certificate', 'medium')],
      candidates: [entityCandidate('d1', 'e-fondo')],
    });
    expect(result[0]).toMatchObject({ requirementId: 'r2', strength: 'possible' });
  });

  it('no sugiere cuando la entidad del documento no coincide con ningún requisito', () => {
    const result = run({
      documents: [doc('d1', 'balance_certificate')],
      candidates: [entityCandidate('d1', 'e-otra')],
    });
    expect(result).toEqual([]);
  });

  it('sin entidad legible solo sugiere si hay un único soporte de ese tipo', () => {
    expect(run({ documents: [doc('d1', 'balance_certificate')] })).toEqual([]);
    const single = run({
      documents: [doc('d1', 'balance_certificate')],
      requirements: [bankSaldos],
    });
    expect(single[0]).toMatchObject({ requirementId: 'r1', strength: 'possible' });
  });

  it('sin entidad legible no propone por descarte si el tipo es solo una propuesta media', () => {
    expect(
      run({
        documents: [doc('d1', 'other')],
        sessions: [session('d1', 'balance_certificate', 'medium')],
        requirements: [bankSaldos],
      }),
    ).toEqual([]);
  });

  it('con varios documentos para el mismo requisito, ninguno es «segura»', () => {
    const result = run({
      documents: [doc('d1', 'balance_certificate'), doc('d2', 'balance_certificate')],
      candidates: [entityCandidate('d1', 'e-banco'), entityCandidate('d2', 'e-banco')],
    });
    expect(result).toHaveLength(2);
    expect(result.every((item) => item.strength === 'possible')).toBe(true);
    expect(result[0]!.reason).toContain('Varios documentos');
  });

  it('no adivina cuando dos entidades empatan', () => {
    const result = run({
      documents: [doc('d1', 'balance_certificate')],
      candidates: [entityCandidate('d1', 'e-banco'), entityCandidate('d1', 'e-fondo')],
    });
    expect(result).toEqual([]);
  });

  it('ignora requisitos ya cubiertos y documentos inactivos', () => {
    const covered = {
      id: 'c',
      caseId: 'x',
      requirementId: 'r1',
      documentId: 'dX',
      factId: null,
      entityId: null,
      status: 'covered',
      relation: 'covers',
      notes: '',
      updatedAt: '2026-01-01T00:00:00.000Z',
    } as RequirementCoverage;
    expect(
      run({
        documents: [doc('d1', 'balance_certificate')],
        candidates: [entityCandidate('d1', 'e-banco')],
        coverages: [covered],
      }),
    ).toEqual([]);
    expect(
      run({
        documents: [doc('d1', 'balance_certificate', { status: 'obsolete' })],
        candidates: [entityCandidate('d1', 'e-banco')],
      }),
    ).toEqual([]);
  });

  it('ordena primero las seguras', () => {
    const result = run({
      documents: [doc('d2', 'other'), doc('d1', 'balance_certificate')],
      sessions: [session('d2', 'balance_certificate', 'medium')],
      candidates: [entityCandidate('d1', 'e-banco'), entityCandidate('d2', 'e-fondo')],
    });
    expect(result.map((item) => item.strength)).toEqual(['strong', 'possible']);
  });
});
