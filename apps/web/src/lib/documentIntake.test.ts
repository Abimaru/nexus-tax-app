import { describe, expect, it } from 'vitest';
import type { DocumentaryRequirement, RequirementCoverage } from '@nexus-tax/domain';
import { buildDocumentChecklist, intakeFileType } from './documentIntake';

function requirement(id: string, entityName: string, documentName: string): DocumentaryRequirement {
  return {
    id,
    entityName,
    entityCategory: 'bank',
    documentName,
    documentCategory: 'financial',
    reason: 'Prueba',
    status: 'pending',
    recommendationSource: 'test',
    confidence: 'medium',
    isLegallyRequired: false,
    attachment: null,
  } as DocumentaryRequirement;
}

function covered(requirementId: string): RequirementCoverage {
  return {
    id: `cov-${requirementId}`,
    caseId: 'c',
    requirementId,
    documentId: 'd',
    factId: null,
    entityId: null,
    status: 'covered',
    relation: 'supports',
    notes: '',
    updatedAt: '2026-01-01T00:00:00.000Z',
  } as unknown as RequirementCoverage;
}

describe('intakeFileType', () => {
  it('reconoce PDF y hojas de cálculo sin distinguir mayúsculas', () => {
    expect(intakeFileType('Certificado.PDF')).toBe('pdf');
    expect(intakeFileType('facturas.xlsx')).toBe('sheet');
    expect(intakeFileType('foto.png')).toBe('unsupported');
    expect(intakeFileType('sin-extension')).toBe('unsupported');
  });
});

describe('buildDocumentChecklist', () => {
  const reqs = [
    requirement('1', 'Banco A', 'Certificado tributario'),
    requirement('2', 'Banco B', 'Certificado tributario'),
    requirement('3', 'Empresa', 'Certificado de ingresos y retenciones'),
  ];

  it('agrupa por tipo de documento y cuenta lo cubierto', () => {
    const list = buildDocumentChecklist(reqs, [covered('1')]);
    expect(list.totalRequirements).toBe(3);
    expect(list.coveredRequirements).toBe(1);
    expect(list.pendingRequirements).toBe(2);
    const tax = list.items.find((item) => item.name === 'Certificado tributario')!;
    expect(tax).toMatchObject({ total: 2, covered: 1, complete: false });
  });

  it('pone primero lo pendiente y al final lo completo', () => {
    const list = buildDocumentChecklist(reqs, [covered('3')]);
    expect(list.items[0]!.complete).toBe(false);
    expect(list.items.at(-1)!.name).toBe('Certificado de ingresos y retenciones');
    expect(list.items.at(-1)!.complete).toBe(true);
  });

  it('limita las entidades mostradas y cuenta el resto', () => {
    const many = Array.from({ length: 5 }, (_, i) =>
      requirement(`m${i}`, `Entidad ${i}`, 'Saldos'),
    );
    const item = buildDocumentChecklist(many, []).items[0]!;
    expect(item.entities).toHaveLength(3);
    expect(item.extraEntities).toBe(2);
  });

  it('con cero requisitos devuelve una lista vacía', () => {
    expect(buildDocumentChecklist([], [])).toMatchObject({ items: [], pendingRequirements: 0 });
  });
});
