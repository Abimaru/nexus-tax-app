import { describe, expect, it } from 'vitest';
import type {
  NormalizedExogenousRecord,
  TaxResolutionDecision,
} from '@nexus-tax/domain';
import { UVT_2025, computeProgressiveIncomeTax } from '@nexus-tax/aegis-rules';
import { buildForm210Draft, computeResolutionImpact } from '../src';

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

function makeAdjust(
  caseId: string,
  id: string,
  boxNumber: number,
  finalValue: number,
): TaxResolutionDecision {
  return {
    id,
    caseId,
    type: 'adjust_form_box',
    objectType: 'form_box',
    objectId: String(boxNumber),
    previousState: 'automatic',
    finalState: 'confirmed',
    selectedAlternative: 'Ajuste sintético',
    originalValue: null,
    finalValue,
    originalCategory: null,
    finalCategory: null,
    proposedBox: boxNumber,
    reason: 'Prueba de impacto',
    note: '',
    evidence: [],
    localAuthor: 'test',
    decidedAt: '2026-08-08T00:00:00.000Z',
    ruleVersion: 'test',
    reversible: true,
    replacesDecisionId: null,
  };
}

describe('computeResolutionImpact (Fase Q)', () => {
  it('reporta delta cero cuando no hay cambios', () => {
    const draft = buildForm210Draft({
      caseId: 'case-eq',
      taxYear: 2025,
      records: [],
      facts: [],
    });
    const impact = computeResolutionImpact(draft, draft);
    expect(impact.deltas.netBalanceCop).toBe(0);
    expect(impact.statusChanged).toBe(false);
    expect(impact.changedBoxes).toEqual([]);
    expect(impact.newWarnings).toEqual([]);
    expect(impact.resolvedWarnings).toEqual([]);
    expect(impact.summary).toContain('no cambia');
  });

  it('detecta el aumento del saldo por confirmar impuesto extra en la 42', () => {
    // before: sin renta cedular. after: renta 3.000 UVT.
    const before = buildForm210Draft({
      caseId: 'case-delta',
      taxYear: 2025,
      records: [],
      facts: [],
    });
    const after = buildForm210Draft({
      caseId: 'case-delta',
      taxYear: 2025,
      records: [],
      facts: [],
      resolutions: [makeAdjust('case-delta', 'dec-42', 42, 3_000 * UVT_2025)],
    });
    const impact = computeResolutionImpact(before, after);
    const expectedTax = computeProgressiveIncomeTax(3_000 * UVT_2025, 2025)
      .totalTaxCopRounded;
    expect(impact.deltas.incomeTaxCop).toBe(expectedTax);
    expect(impact.deltas.totalTaxDueCop).toBe(expectedTax);
    expect(impact.deltas.netBalanceCop).toBe(expectedTax);
    expect(impact.changedBoxes.some((change) => change.boxNumber === 42)).toBe(true);
    expect(impact.summary).toMatch(/aumenta/);
  });

  it('detecta cambio de status cuando pasa de insufficient_data a to_pay', () => {
    const before = buildForm210Draft({
      caseId: 'case-status',
      taxYear: 2025,
      records: [],
      facts: [],
    });
    const after = buildForm210Draft({
      caseId: 'case-status',
      taxYear: 2025,
      records: [],
      facts: [],
      resolutions: [makeAdjust('case-status', 'dec-42', 42, 3_000 * UVT_2025)],
    });
    const impact = computeResolutionImpact(before, after);
    expect(impact.before.status).toBe('insufficient_data');
    expect(impact.after.status).toBe('to_pay');
    expect(impact.statusChanged).toBe(true);
    expect(impact.summary).toContain('estado pasa de insufficient_data a to_pay');
  });

  it('detecta warnings nuevos y resueltos entre borradores', () => {
    // before: renta + GO sin desglose (warning "se asumió 15 %").
    const before = buildForm210Draft({
      caseId: 'case-warn',
      taxYear: 2025,
      records: [],
      facts: [],
      resolutions: [
        makeAdjust('case-warn', 'dec-42', 42, 3_000 * UVT_2025),
        makeAdjust('case-warn', 'dec-115', 115, 5_000_000),
      ],
    });
    // after: mismo caso pero con desglose provisto (warning se resuelve).
    const after = buildForm210Draft({
      caseId: 'case-warn',
      taxYear: 2025,
      records: [],
      facts: [],
      resolutions: [
        makeAdjust('case-warn', 'dec-42', 42, 3_000 * UVT_2025),
        makeAdjust('case-warn', 'dec-115', 115, 5_000_000),
      ],
      occasionalGainsBreakdown: {
        generalBaseCop: 5_000_000,
        lotteryBaseCop: 0,
      },
    });
    const impact = computeResolutionImpact(before, after);
    expect(impact.resolvedWarnings.some((w) => w.includes('15 %'))).toBe(true);
    expect(impact.deltas.warningsCount).toBeLessThan(0);
  });

  it('reporta descuento en netBalance cuando aumentan las retenciones', () => {
    const before = buildForm210Draft({
      caseId: 'case-ret',
      taxYear: 2025,
      records: [],
      facts: [],
      resolutions: [makeAdjust('case-ret', 'dec-42', 42, 3_000 * UVT_2025)],
    });
    const after = buildForm210Draft({
      caseId: 'case-ret',
      taxYear: 2025,
      records: [],
      facts: [],
      resolutions: [
        makeAdjust('case-ret', 'dec-42', 42, 3_000 * UVT_2025),
        makeAdjust('case-ret', 'dec-132', 132, 10_000_000),
      ],
    });
    const impact = computeResolutionImpact(before, after);
    expect(impact.deltas.withholdingsCop).toBe(10_000_000);
    expect(impact.deltas.netBalanceCop).toBe(-10_000_000);
    expect(impact.summary).toMatch(/disminuye/);
  });

  it('anota casillas con delta positivo y negativo', () => {
    const before = buildForm210Draft({
      caseId: 'case-boxes',
      taxYear: 2025,
      records: [employmentRecord('rec-1', 60_000_000)],
      facts: [],
    });
    const after = buildForm210Draft({
      caseId: 'case-boxes',
      taxYear: 2025,
      records: [employmentRecord('rec-1', 40_000_000)],
      facts: [],
    });
    const impact = computeResolutionImpact(before, after);
    const change32 = impact.changedBoxes.find((c) => c.boxNumber === 32);
    expect(change32?.beforeCop).toBe(60_000_000);
    expect(change32?.afterCop).toBe(40_000_000);
    expect(change32?.deltaCop).toBe(-20_000_000);
  });
});
