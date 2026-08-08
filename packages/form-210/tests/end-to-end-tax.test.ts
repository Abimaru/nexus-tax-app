import { describe, expect, it } from 'vitest';
import type {
  DocumentFact,
  NormalizedExogenousRecord,
  TaxResolutionDecision,
} from '@nexus-tax/domain';
import {
  UVT_2025,
  computeOccasionalGainsTax,
  computeProgressiveIncomeTax,
} from '@nexus-tax/aegis-rules';
import { buildForm210Draft, computeResolutionImpact } from '../src';

/**
 * Tests tributarios end-to-end (Fase V).
 *
 * Cubren un fixture sintético completo (rentas de trabajo + ganancias
 * ocasionales + retenciones + saldo anterior + dependientes + factura
 * electrónica + deducciones individuales) y verifican que:
 *   - la liquidación pública coincide con la de los motores puros,
 *   - los descuentos aplican en el orden correcto,
 *   - las decisiones tentativas producen los deltas esperados.
 *
 * No hay datos reales. Los importes están elegidos para ser reproducibles
 * y verificables a mano contra el artículo 241 y 314 del ET.
 */

function employmentRecord(
  id: string,
  reportedValue: number,
): NormalizedExogenousRecord {
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
    reportedValue,
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
    selectedAlternative: 'Ajuste E2E',
    originalValue: null,
    finalValue,
    originalCategory: null,
    finalCategory: null,
    proposedBox: boxNumber,
    reason: 'Escenario end-to-end',
    note: '',
    evidence: [],
    localAuthor: 'test',
    decidedAt: '2026-08-08T00:00:00.000Z',
    ruleVersion: 'test',
    reversible: true,
    replacesDecisionId: null,
  };
}

describe('flujo tributario end-to-end AG 2025', () => {
  it('caso pleno: rentas de trabajo + GO + retenciones + saldo anterior', () => {
    const caseId = 'e2e-full';
    const rentaLiquidaOrdinariaCop = 80_000_000; // casilla 42 tras deducciones
    const goCop = 20_000_000; // casilla 115
    const retencionesCop = 5_000_000; // casilla 132
    const anticipoAnteriorCop = 1_000_000; // casilla 130
    const saldoAnteriorConfirmadoCop = 2_000_000;

    const draft = buildForm210Draft({
      caseId,
      taxYear: 2025,
      records: [employmentRecord('rec-1', 120_000_000)],
      facts: [] satisfies DocumentFact[],
      resolutions: [
        makeAdjust(caseId, 'dec-42', 42, rentaLiquidaOrdinariaCop),
        makeAdjust(caseId, 'dec-115', 115, goCop),
        makeAdjust(caseId, 'dec-130', 130, anticipoAnteriorCop),
        makeAdjust(caseId, 'dec-132', 132, retencionesCop),
      ],
      priorYearBalance: {
        declaredCop: saldoAnteriorConfirmadoCop,
        confirmedByAnalyst: true,
        hasPendingCompensationOrRefundRequest: false,
      },
    });
    const liq = draft.preliminaryLiquidation;
    expect(liq).not.toBeNull();
    if (!liq) return;

    // 1) Base cedular consolidada = casilla 42 (única con valor).
    expect(liq.generalCedularTaxableIncomeCop).toBe(rentaLiquidaOrdinariaCop);
    expect(liq.generalCedularTaxableIncomeUvt).toBeCloseTo(
      rentaLiquidaOrdinariaCop / UVT_2025,
      6,
    );

    // 2) Impuesto de renta coincide con el motor puro.
    const expectedIncomeTax = computeProgressiveIncomeTax(
      rentaLiquidaOrdinariaCop,
      2025,
    );
    expect(liq.incomeTax).not.toBeNull();
    expect(liq.incomeTax!.totalTaxCopRounded).toBe(expectedIncomeTax.totalTaxCopRounded);
    expect(liq.incomeTax!.ruleSourceId).toBe('et-art-241');

    // 3) Impuesto de GO al 15 % (sin desglose de loterías).
    const expectedGO = computeOccasionalGainsTax({
      taxYear: 2025,
      generalBaseCop: goCop,
      lotteryBaseCop: 0,
    });
    expect(liq.occasionalGainsTax).not.toBeNull();
    expect(liq.occasionalGainsTax!.totalTaxCop).toBe(expectedGO.totalTaxCop);

    // 4) Total impuesto a cargo = renta + GO.
    expect(liq.totalTaxDueCop).toBe(
      expectedIncomeTax.totalTaxCopRounded + expectedGO.totalTaxCop,
    );

    // 5) Saldo anterior aplicado (motor confirmó).
    expect(liq.priorYearBalance?.status).toBe('applied');
    expect(liq.priorYearBalanceCop).toBe(saldoAnteriorConfirmadoCop);

    // 6) Retenciones consolidadas leen el ajuste manual de la casilla 132.
    expect(liq.withholdingsCop).toBe(retencionesCop);
    expect(liq.withholdings.ruleSourceId).toBe('et-art-373');

    // 7) Anticipo del año siguiente: no calculado (sin contexto).
    expect(liq.nextYearAdvance).toBeNull();

    // 8) Saldo neto = totalTax − anticipo anterior − saldo anterior − retenciones.
    const expectedNet =
      liq.totalTaxDueCop - anticipoAnteriorCop - saldoAnteriorConfirmadoCop - retencionesCop;
    expect(liq.netBalanceCop).toBe(expectedNet);

    // 9) Status coherente con el signo del saldo neto.
    if (expectedNet > 0) expect(liq.status).toBe('to_pay');
    else if (expectedNet < 0) expect(liq.status).toBe('refund');
    else expect(liq.status).toBe('zero');
  });

  it('confirmar retenciones adicionales reduce el saldo en el mismo importe', () => {
    const caseId = 'e2e-impact';
    const base = buildForm210Draft({
      caseId,
      taxYear: 2025,
      records: [],
      facts: [],
      resolutions: [makeAdjust(caseId, 'dec-42', 42, 3_000 * UVT_2025)],
    });
    const after = buildForm210Draft({
      caseId,
      taxYear: 2025,
      records: [],
      facts: [],
      resolutions: [
        makeAdjust(caseId, 'dec-42', 42, 3_000 * UVT_2025),
        makeAdjust(caseId, 'dec-132', 132, 10_000_000),
      ],
    });
    const impact = computeResolutionImpact(base, after);
    expect(impact.deltas.withholdingsCop).toBe(10_000_000);
    expect(impact.deltas.netBalanceCop).toBe(-10_000_000);
    expect(impact.summary).toMatch(/disminuye/);
  });

  it('agregar dependientes + factura electrónica alimenta la casilla 39 con dos fuentes', () => {
    const caseId = 'e2e-deducciones';
    const draft = buildForm210Draft({
      caseId,
      taxYear: 2025,
      records: [employmentRecord('rec-1', 100_000_000)],
      facts: [],
      dependents: [{ id: 'dep-1', kind: 'child_minor', monthsClaimed: 12 }],
      electronicInvoicing: { purchasesWithElectronicInvoiceCop: 50_000_000 },
    });
    const box39 = draft.boxes.find((box) => box.number === 39)!;
    // 10% × 100M = 10M (dependientes) + 1% × 50M = 500K (FE) = 10.5M
    expect(box39.suggestedValue).toBe(10_500_000);
    expect(box39.sources.map((source) => source.sourceId)).toEqual(
      expect.arrayContaining([
        'calc:dependents-387',
        'calc:electronic-invoicing-336-1',
      ]),
    );
    const liq = draft.preliminaryLiquidation!;
    expect(liq.dependentsDeduction?.ruleSourceId).toBe('et-art-387');
    expect(liq.electronicInvoicingDeduction?.ruleSourceId).toBe('et-art-336-1');
  });

  it('escenario sin datos suficientes reporta insufficient_data y saldo neto 0', () => {
    const draft = buildForm210Draft({
      caseId: 'e2e-empty',
      taxYear: 2025,
      records: [],
      facts: [],
    });
    const liq = draft.preliminaryLiquidation!;
    expect(liq.status).toBe('insufficient_data');
    expect(liq.netBalanceCop).toBe(0);
    expect(liq.incomeTax).toBeNull();
    expect(liq.occasionalGainsTax).toBeNull();
  });

  it('escenario grande dispara validación cruzada de comparación patrimonial', () => {
    // Patrimonio 500M con ingresos totales 20M ⇒ ratio 25 → dispara.
    const caseId = 'e2e-cross';
    const draft = buildForm210Draft({
      caseId,
      taxYear: 2025,
      records: [
        employmentRecord('rec-1', 20_000_000),
        {
          ...employmentRecord('rec-asset', 500_000_000),
          category: 'asset',
          nature: 'asset',
          treatment: 'add_to_assets',
        } as NormalizedExogenousRecord,
      ],
      facts: [],
    });
    const codes = draft.findings.map((finding) => finding.code);
    expect(codes).toContain('patrimony_income_disproportion');
  });
});
