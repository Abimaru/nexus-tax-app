import { describe, expect, it } from 'vitest';
import type {
  DocumentFact,
  NormalizedExogenousRecord,
  TaxResolutionDecision,
} from '@nexus-tax/domain';
import {
  buildForm210Draft,
  buildForm210ExportBundle,
  serializeForm210ExportBundle,
} from '../src';

function employmentRecord(id: string, value: number): NormalizedExogenousRecord {
  return {
    id,
    rawId: `raw-${id}`,
    source: { sheet: 'Sintética', row: 1 },
    reportingEntityDocument: '900000000',
    entityTaxId: '900000000',
    entityName: 'Empleador sintético',
    reportedPersonDocument: '1000000000',
    reportedPersonDocumentNormalized: '1000000000',
    identityMatch: 'matched',
    conceptCode: null,
    conceptLabel: `Ingresos ${id}`,
    reportedValue: value,
    withholding: null,
    currency: 'COP',
    suggestedUse: null,
    classificationVersion: 'test',
    nature: 'income',
    category: 'employment_income',
    treatment: 'add_to_income',
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

function makeAdjustBoxDecision(overrides: {
  id: string;
  caseId: string;
  boxNumber: number;
  finalValue: number;
}): TaxResolutionDecision {
  return {
    id: overrides.id,
    caseId: overrides.caseId,
    type: 'adjust_form_box',
    objectType: 'form_box',
    objectId: String(overrides.boxNumber),
    previousState: 'automatic',
    finalState: 'confirmed',
    selectedAlternative: 'Ajuste sintético',
    originalValue: null,
    finalValue: overrides.finalValue,
    originalCategory: null,
    finalCategory: null,
    proposedBox: overrides.boxNumber,
    reason: 'Prueba',
    note: '',
    evidence: [],
    localAuthor: 'test',
    decidedAt: '2026-08-03T00:00:00.000Z',
    ruleVersion: 'test',
    reversible: true,
    replacesDecisionId: null,
  };
}

describe('exportación consolidada del F-210 (Fase U)', () => {
  it('empaqueta ruleset y draft con notice fija cuando no hay fuentes citadas', () => {
    const draft = buildForm210Draft({
      caseId: 'case-empty',
      taxYear: 2025,
      records: [],
      facts: [] satisfies DocumentFact[],
      generatedAt: '2026-08-03T00:00:00.000Z',
    });
    const bundle = buildForm210ExportBundle(draft, {
      generatedAt: '2026-08-03T00:00:00.000Z',
    });
    expect(bundle.schema).toBe('nexustax.form210.export-bundle');
    expect(bundle.schemaVersion).toBe('1.0.0');
    expect(bundle.notice).toContain('no presentada ante la DIAN');
    expect(bundle.ruleset.taxYear).toBe(2025);
    expect(bundle.ruleset.filingYear).toBe(2026);
    expect(bundle.ruleset.ruleVersion).toBe('co.dian.form210.2025.v1');
    // Sin liquidación cedular ni GO, solo se cita et-art-373 (retenciones).
    expect(bundle.officialSources.map((source) => source.id)).toEqual(['et-art-373']);
    expect(bundle.draft.caseId).toBe('case-empty');
  });

  it('incluye todas las fuentes citadas por los motores cuando hay cálculo pleno', () => {
    const draft = buildForm210Draft({
      caseId: 'case-full',
      taxYear: 2025,
      records: [employmentRecord('rec-1', 200_000_000)],
      facts: [],
      resolutions: [
        makeAdjustBoxDecision({
          id: 'dec-115',
          caseId: 'case-full',
          boxNumber: 115,
          finalValue: 10_000_000,
        }),
      ],
      dependents: [{ id: 'dep-1', kind: 'child_minor', monthsClaimed: 12 }],
      electronicInvoicing: { purchasesWithElectronicInvoiceCop: 50_000_000 },
      individualDeductions: {
        afcFvpAvcCop: 5_000_000,
        housingInterestCop: 15_000_000,
        prepaidMedicineCop: 3_000_000,
      },
      advancePaymentContext: {
        filingCountIncludingCurrent: 2,
        priorNetIncomeTaxCop: 5_000_000,
      },
      priorYearBalance: {
        declaredCop: 2_000_000,
        confirmedByAnalyst: true,
        hasPendingCompensationOrRefundRequest: false,
      },
    });
    const bundle = buildForm210ExportBundle(draft, {
      generatedAt: '2026-08-03T00:00:00.000Z',
    });
    const ids = bundle.officialSources.map((source) => source.id);
    // Se citan las 8 fuentes esperadas del cálculo pleno.
    expect(ids).toEqual(
      expect.arrayContaining([
        'et-art-241',
        'et-art-314',
        'et-art-336',
        'et-art-387',
        'et-art-336-1',
        'et-art-126-1',
        'et-art-126-4',
        'et-art-119',
        'et-art-807',
        'et-art-850',
        'et-art-373',
      ]),
    );
    // Todas las fuentes vienen resueltas con url y verifiedAt.
    for (const source of bundle.officialSources) {
      expect(source.url).toMatch(/^https?:/);
      expect(source.verifiedAt).toBeTruthy();
    }
  });

  it('produce salida determinista con el mismo generatedAt', () => {
    const draft = buildForm210Draft({
      caseId: 'case-det',
      taxYear: 2025,
      records: [],
      facts: [],
      generatedAt: '2026-08-03T00:00:00.000Z',
    });
    const a = serializeForm210ExportBundle(
      buildForm210ExportBundle(draft, { generatedAt: '2026-08-03T00:00:00.000Z' }),
    );
    const b = serializeForm210ExportBundle(
      buildForm210ExportBundle(draft, { generatedAt: '2026-08-03T00:00:00.000Z' }),
    );
    expect(a).toBe(b);
  });

  it('serializa como JSON válido con la advertencia visible', () => {
    const draft = buildForm210Draft({
      caseId: 'case-json',
      taxYear: 2025,
      records: [],
      facts: [],
    });
    const json = serializeForm210ExportBundle(
      buildForm210ExportBundle(draft, { generatedAt: '2026-08-03T00:00:00.000Z' }),
    );
    expect(json).toContain('nexustax.form210.export-bundle');
    expect(json).toContain('no presentada ante la DIAN');
    // Trailing newline no obligatorio; JSON.parse debe reconstruirlo.
    const parsed = JSON.parse(json);
    expect(parsed.ruleset.ruleVersion).toBe('co.dian.form210.2025.v1');
    expect(Array.isArray(parsed.officialSources)).toBe(true);
  });

  it('deduplica fuentes cuando el mismo ruleSourceId aparece varias veces', () => {
    // Múltiples deducciones individuales (todas con et-art-119 solo una vez,
    // et-art-387 solo una vez).
    const draft = buildForm210Draft({
      caseId: 'case-dedup',
      taxYear: 2025,
      records: [employmentRecord('rec-1', 100_000_000)],
      facts: [],
      individualDeductions: {
        housingInterestCop: 10_000_000,
        prepaidMedicineCop: 5_000_000,
      },
      dependents: [{ id: 'dep-1', kind: 'child_minor', monthsClaimed: 12 }],
    });
    const bundle = buildForm210ExportBundle(draft, {
      generatedAt: '2026-08-03T00:00:00.000Z',
    });
    const ids = bundle.officialSources.map((source) => source.id);
    // et-art-387 aparece solo una vez aunque lo citen dependientes y medicina.
    const count387 = ids.filter((id) => id === 'et-art-387').length;
    expect(count387).toBe(1);
    // et-art-119 aparece solo una vez.
    const count119 = ids.filter((id) => id === 'et-art-119').length;
    expect(count119).toBe(1);
  });
});
