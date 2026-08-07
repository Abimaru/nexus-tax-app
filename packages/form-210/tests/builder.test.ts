import { describe, expect, it } from 'vitest';
import type {
  DocumentFact,
  NormalizedExogenousRecord,
  TaxResolutionDecision,
} from '@nexus-tax/domain';
import { buildForm210Draft, serializeForm210Draft } from '../src';

function record(
  id: string,
  category: NormalizedExogenousRecord['category'],
  value: number,
): NormalizedExogenousRecord {
  return {
    id,
    rawId: `raw-${id}`,
    source: { sheet: 'Sintética', row: Number(id.replace(/\D/g, '')) || 1 },
    reportingEntityDocument: '900000000',
    entityTaxId: '900000000',
    entityName: 'Entidad sintética',
    reportedPersonDocument: '1000000000',
    reportedPersonDocumentNormalized: '1000000000',
    identityMatch: 'matched',
    conceptCode: null,
    conceptLabel: `Concepto ${id}`,
    reportedValue: value,
    withholding: null,
    currency: 'COP',
    suggestedUse: null,
    classificationVersion: 'test',
    nature: category === 'liability' ? 'liability' : 'income',
    category,
    treatment: category === 'liability' ? 'add_to_liabilities' : 'add_to_income',
    confidence: 'high',
    classificationEvidence: [],
    secondaryUses: [],
    multiplicityType: 'single',
    multiplicityExplanation: null,
    consolidationDisposition: 'included',
    consolidationReason: '',
    extra: {},
  };
}

function fact(overrides: Partial<DocumentFact> = {}): DocumentFact {
  return {
    id: 'fact-1',
    caseId: 'case-1',
    documentId: 'document-1',
    entityId: null,
    productId: null,
    originalConcept: 'Saldo sintético',
    category: 'asset',
    nature: 'asset',
    treatment: 'add_to_assets',
    value: 100,
    currency: 'COP',
    cutoffDate: '2024-12-31',
    period: 'Año 2024',
    pageOrSection: 'Página 1',
    evidence: 'Evidencia sintética',
    captureMethod: 'manual',
    confidence: 'high',
    reviewStatus: 'confirmed',
    requirementIds: [],
    author: 'Analista local',
    createdAt: '2026-08-02T00:00:00.000Z',
    updatedAt: '2026-08-02T00:00:00.000Z',
    history: [],
    ...overrides,
  };
}

describe('borrador Formulario 210', () => {
  it('separa ganancias ocasionales de rentas de trabajo y calcula patrimonio', () => {
    const draft = buildForm210Draft({
      caseId: 'case-1',
      taxYear: 2025,
      generatedAt: '2026-08-02T00:00:00.000Z',
      records: [
        record('1', 'employment_income', 10_000),
        record('2', 'occasional_gain', 5_000),
        record('3', 'asset', 20_000),
        record('4', 'liability', 3_000),
      ],
      facts: [],
    });
    expect(draft.boxes.find((box) => box.number === 32)?.suggestedValue).toBe(10_000);
    expect(draft.boxes.find((box) => box.number === 112)?.suggestedValue).toBe(5_000);
    expect(draft.boxes.find((box) => box.number === 31)?.suggestedValue).toBe(17_000);
  });

  it('lleva aportes laborales a la casilla 33', () => {
    const draft = buildForm210Draft({
      caseId: 'case-1',
      taxYear: 2025,
      records: [record('1', 'employment_non_constitutive_income', 900)],
      facts: [],
    });
    expect(draft.boxes.find((box) => box.number === 33)?.suggestedValue).toBe(900);
  });

  it('advierte período, corte, duplicidad y confirmación con registros pendientes', () => {
    const draft = buildForm210Draft({
      caseId: 'case-1',
      taxYear: 2025,
      records: [record('1', 'asset', 100), record('2', 'asset', 100)],
      facts: [fact({ originalConcept: 'Concepto 2' })],
      recordStates: [
        { recordId: '1', category: 'asset', disposition: 'pending' },
        { recordId: '2', category: 'asset', disposition: 'included' },
      ],
      resolutions: [
        {
          id: 'decision-pending',
          caseId: 'case-1',
          type: 'adjust_form_box',
          objectType: 'form_box',
          objectId: '29',
          previousState: 'no_data',
          finalState: 'confirmed',
          selectedAlternative: 'Ajustar casilla',
          originalValue: null,
          finalValue: 100,
          originalCategory: null,
          finalCategory: null,
          proposedBox: 29,
          reason: 'Prueba sintética',
          note: '',
          evidence: [],
          localAuthor: 'Analista local',
          decidedAt: '2026-08-02T00:00:00.000Z',
          ruleVersion: 'test',
          reversible: true,
          replacesDecisionId: null,
        },
      ],
    });
    expect(draft.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining([
        'wrong_cutoff_date',
        'incompatible_year',
        'double_counting',
        'confirmed_with_pending_records',
      ]),
    );
    expect(draft.status.blockers).toBe(1);
  });

  it('aplica y restaura ajustes mediante decisiones inmutables', () => {
    const base: TaxResolutionDecision = {
      id: 'decision-1',
      caseId: 'case-1',
      type: 'adjust_form_box',
      objectType: 'form_box',
      objectId: '29',
      previousState: 'suggested',
      finalState: 'confirmed',
      selectedAlternative: 'Registrar ajuste',
      originalValue: 100,
      finalValue: 120,
      originalCategory: null,
      finalCategory: null,
      proposedBox: 29,
      reason: 'Corrección sintética',
      note: '',
      evidence: [{ kind: 'manual_note', referenceId: null, description: 'Prueba sintética' }],
      localAuthor: 'Analista local',
      decidedAt: '2026-08-02T00:00:00.000Z',
      ruleVersion: 'test',
      reversible: true,
      replacesDecisionId: null,
    };
    const adjusted = buildForm210Draft({
      caseId: 'case-1',
      taxYear: 2025,
      records: [record('1', 'asset', 100)],
      facts: [],
      resolutions: [base],
    });
    expect(adjusted.boxes.find((box) => box.number === 29)?.confirmedValue).toBe(120);
    const reverted = buildForm210Draft({
      caseId: 'case-1',
      taxYear: 2025,
      records: [record('1', 'asset', 100)],
      facts: [],
      resolutions: [
        base,
        {
          ...base,
          id: 'decision-2',
          type: 'restore_automatic_value',
          finalValue: null,
          decidedAt: '2026-08-02T00:01:00.000Z',
          replacesDecisionId: 'decision-1',
        },
      ],
    });
    expect(reverted.boxes.find((box) => box.number === 29)?.confirmedValue).toBeNull();
  });

  it('exporta JSON inequívocamente identificado como borrador', () => {
    const json = serializeForm210Draft(
      buildForm210Draft({ caseId: 'case-1', taxYear: 2025, records: [], facts: [] }),
    );
    expect(json).toContain('nexustax.form210.working-draft');
    expect(json).toContain('no presentado ante la DIAN');
  });

  it('advierte deuda sin activo (art. 261 ET)', () => {
    const draft = buildForm210Draft({
      caseId: 'case-liability',
      taxYear: 2025,
      records: [record('1', 'liability', 5_000_000)],
      facts: [],
    });
    expect(draft.findings.map((finding) => finding.code)).toContain('liability_without_asset');
  });

  it('advierte movimientos significativos sin patrimonio bruto', () => {
    // Movimientos > 100 UVT ≈ 5M; sin patrimonio ⇒ warning.
    const draft = buildForm210Draft({
      caseId: 'case-movement',
      taxYear: 2025,
      records: [
        record('1', 'bank_movement', 6_000_000),
        record('2', 'card_consumption', 3_000_000),
      ],
      facts: [],
    });
    expect(draft.findings.map((finding) => finding.code)).toContain('movement_without_balance');
  });

  it('advierte posibles duplicados de patrimonio con label y valor similar', () => {
    const draft = buildForm210Draft({
      caseId: 'case-duplicate',
      taxYear: 2025,
      records: [
        { ...record('1', 'asset', 10_000_000), conceptLabel: 'Cuenta ahorros Bancolombia' },
        { ...record('2', 'asset', 10_050_000), conceptLabel: 'cuenta ahorros bancolombia' },
      ],
      facts: [],
    });
    expect(draft.findings.map((finding) => finding.code)).toContain('duplicate_patrimony_entry');
  });

  it('no emite hallazgos patrimoniales cuando el caso es consistente', () => {
    const draft = buildForm210Draft({
      caseId: 'case-consistent',
      taxYear: 2025,
      records: [
        record('1', 'asset', 20_000_000),
        record('2', 'liability', 5_000_000),
      ],
      facts: [],
    });
    const codes = draft.findings.map((finding) => finding.code);
    expect(codes).not.toContain('liability_without_asset');
    expect(codes).not.toContain('movement_without_balance');
    expect(codes).not.toContain('duplicate_patrimony_entry');
  });
});
