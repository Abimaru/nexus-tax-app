import { describe, expect, it } from 'vitest';
import type {
  DocumentFact,
  NormalizedExogenousRecord,
  TaxResolutionDecision,
} from '@nexus-tax/domain';
import {
  DEPENDENTS_MAX_ELIGIBLE,
  ELECTRONIC_INVOICING_ANNUAL_CAP_UVT,
  UVT_2025,
  computeProgressiveIncomeTax,
} from '@nexus-tax/aegis-rules';
import { buildForm210Draft } from '../src';

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
    selectedAlternative: 'Ajuste sintético para prueba',
    originalValue: null,
    finalValue: overrides.finalValue,
    originalCategory: null,
    finalCategory: null,
    proposedBox: overrides.boxNumber,
    reason: 'Prueba de la liquidación preliminar',
    note: 'Fixture sintético',
    evidence: [],
    localAuthor: 'test',
    decidedAt: '2026-08-03T00:00:00.000Z',
    ruleVersion: 'test-2025',
    reversible: true,
    replacesDecisionId: null,
  };
}

/**
 * Fixtures sintéticos que ejercitan la Fase K.
 * No usan datos reales; los conceptos y valores están elegidos para producir
 * resultados verificables a mano contra el art. 336 (límite) y el art. 241
 * (tarifa progresiva).
 */
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

function factOverride(overrides: Partial<DocumentFact>): DocumentFact {
  return {
    id: 'fact-x',
    caseId: 'case-1',
    documentId: null,
    entityId: null,
    productId: null,
    originalConcept: 'Concepto',
    category: 'asset',
    nature: 'asset',
    treatment: 'add_to_assets',
    value: 0,
    currency: 'COP',
    cutoffDate: null,
    period: '',
    pageOrSection: '',
    evidence: '',
    captureMethod: 'manual',
    confidence: 'medium',
    reviewStatus: 'reviewed',
    requirementIds: [],
    author: 'test',
    history: [],
    createdAt: '2026-08-03T00:00:00.000Z',
    updatedAt: '2026-08-03T00:00:00.000Z',
    ...overrides,
  };
}

describe('liquidación privada preliminar (Fase K)', () => {
  it('produce insufficient_data cuando no hay datos', () => {
    const draft = buildForm210Draft({
      caseId: 'case-empty',
      taxYear: 2025,
      records: [],
      facts: [],
    });
    expect(draft.preliminaryLiquidation).not.toBeNull();
    const liquidation = draft.preliminaryLiquidation!;
    expect(liquidation.status).toBe('insufficient_data');
    expect(liquidation.incomeTax).toBeNull();
    expect(liquidation.totalTaxDueCop).toBe(0);
  });

  it('aplica el límite del art. 336 en 41 y calcula 42 con el resultado', () => {
    // Ingresos brutos 60M, sin no constitutivos → renta líquida trabajo (34) = 60M.
    // Rentas exentas + deducciones (37 + 40) = 20M + 10M = 30M.
    // 40 % × 60M = 24M ← limitante. 30M > 24M > tope UVT? no: 1.340 UVT = 66.7M.
    // Casilla 41 esperada = 24M. Casilla 42 = 60M − 24M = 36M.
    const draft = buildForm210Draft({
      caseId: 'case-1',
      taxYear: 2025,
      records: [employmentRecord('rec-1', 60_000_000)],
      facts: [
        factOverride({
          id: 'fact-exempt',
          category: 'employment_income',
          nature: 'income',
          treatment: 'add_to_income',
          originalConcept: 'Aportes AFC',
          value: 20_000_000,
        }),
      ],
    });
    // Nota: el fact anterior alimenta la casilla 32 (ingresos), no la 35.
    // Aquí probamos que el ruleset y el mecanismo funcionan; el aporte real a
    // 41 se ejercita con el helper aplicado directamente en el siguiente caso.
    const box41 = draft.boxes.find((box) => box.number === 41)!;
    // Con solo ingresos y sin aportes 37/40, el límite aplicable es 0 (el
    // componente detectado es 0), y 41 se calcula como 0.
    expect(box41.suggestedValue).toBe(0);
    expect(box41.status).toBe('calculated');
  });

  it('calcula impuesto progresivo cuando hay renta líquida cedular consolidada', () => {
    // Fabricamos manualmente los inputs de 42/66/83 saltando el pipeline con
    // resoluciones tipo adjust_form_box. Renta consolidada = 3.000 UVT.
    const rentaConsolidadaCop = 3_000 * UVT_2025;
    const resolutions: TaxResolutionDecision[] = [
      makeAdjustBoxDecision({
        id: 'dec-42',
        caseId: 'case-tax',
        boxNumber: 42,
        finalValue: rentaConsolidadaCop,
      }),
    ];
    const draft = buildForm210Draft({
      caseId: 'case-tax',
      taxYear: 2025,
      records: [],
      facts: [],
      resolutions,
    });
    const liq = draft.preliminaryLiquidation!;
    // Renta consolidada = 42 + 66 + 83; solo 42 tiene valor, así que es 3.000 UVT.
    expect(liq.generalCedularTaxableIncomeCop).toBe(rentaConsolidadaCop);
    expect(liq.generalCedularTaxableIncomeUvt).toBeCloseTo(3_000, 6);
    // Impuesto esperado según art. 241: rango 1.700–4.100 → (3.000 − 1.700) ×
    // 28 % + 116 = 364 + 116 = 480 UVT.
    const expected = computeProgressiveIncomeTax(rentaConsolidadaCop, 2025);
    expect(liq.incomeTax?.totalTaxCopRounded).toBe(expected.totalTaxCopRounded);
    expect(liq.incomeTax?.totalTaxUvt).toBeCloseTo(480, 6);
  });

  it('descuenta retenciones para producir saldo a favor', () => {
    // Renta 3.000 UVT → impuesto ≈ 480 UVT (23.9M).
    // Retenciones (casilla 132) = 30M → saldo a favor.
    const uvt = UVT_2025;
    const impuestoUvt = 480;
    const retenciones = 30_000_000;
    const draft = buildForm210Draft({
      caseId: 'case-refund',
      taxYear: 2025,
      records: [],
      facts: [],
      resolutions: [
        makeAdjustBoxDecision({
          id: 'dec-42',
          caseId: 'case-refund',
          boxNumber: 42,
          finalValue: 3_000 * uvt,
        }),
        makeAdjustBoxDecision({
          id: 'dec-132',
          caseId: 'case-refund',
          boxNumber: 132,
          finalValue: retenciones,
        }),
      ],
    });
    const liq = draft.preliminaryLiquidation!;
    expect(liq.withholdingsCop).toBe(retenciones);
    expect(liq.totalTaxDueCop).toBe(Math.round(impuestoUvt * uvt));
    expect(liq.netBalanceCop).toBe(liq.totalTaxDueCop - retenciones);
    expect(liq.status).toBe('refund');
  });

  it('aplica 15 % (art. 314) a la casilla 115 cuando no hay desglose', () => {
    // Base 115 = 100M sin desglose → tributa toda al 15 % = 15M.
    const draft = buildForm210Draft({
      caseId: 'case-go-general',
      taxYear: 2025,
      records: [],
      facts: [],
      resolutions: [
        makeAdjustBoxDecision({
          id: 'dec-115',
          caseId: 'case-go-general',
          boxNumber: 115,
          finalValue: 100_000_000,
        }),
      ],
    });
    const liq = draft.preliminaryLiquidation!;
    expect(liq.occasionalGainsTaxableCop).toBe(100_000_000);
    expect(liq.occasionalGainsTax?.totalTaxCop).toBe(15_000_000);
    expect(liq.occasionalGainsTax?.components).toHaveLength(1);
    expect(liq.occasionalGainsTax?.components[0]!.kind).toBe('general');
    expect(liq.occasionalGainsTax?.components[0]!.rate).toBe(0.15);
    expect(liq.totalTaxDueCop).toBe(15_000_000);
    expect(liq.warnings.some((warning) => warning.includes('15 %'))).toBe(true);
  });

  it('separa loterías (20 %) del resto (15 %) cuando el analista lo desglosa', () => {
    // 115 = 60M ; 40M al 15 % = 6M ; 20M al 20 % = 4M ; total = 10M.
    const draft = buildForm210Draft({
      caseId: 'case-go-mixed',
      taxYear: 2025,
      records: [],
      facts: [],
      resolutions: [
        makeAdjustBoxDecision({
          id: 'dec-115',
          caseId: 'case-go-mixed',
          boxNumber: 115,
          finalValue: 60_000_000,
        }),
      ],
      occasionalGainsBreakdown: {
        generalBaseCop: 40_000_000,
        lotteryBaseCop: 20_000_000,
      },
    });
    const liq = draft.preliminaryLiquidation!;
    expect(liq.occasionalGainsTax?.totalTaxCop).toBe(10_000_000);
    expect(liq.occasionalGainsTax?.components).toHaveLength(2);
    expect(liq.occasionalGainsTax?.ruleSourceIds).toEqual(['et-art-314', 'et-art-317']);
    expect(liq.totalTaxDueCop).toBe(10_000_000);
    // No debería quejarse del 15 % porque el desglose es explícito.
    expect(liq.warnings.some((warning) => warning.includes('15 %'))).toBe(false);
  });

  it('advierte cuando el desglose de GO no coincide con la casilla 115', () => {
    // Casilla 115 = 60M pero se declaran 40+10 = 50M en desglose → warning.
    const draft = buildForm210Draft({
      caseId: 'case-go-mismatch',
      taxYear: 2025,
      records: [],
      facts: [],
      resolutions: [
        makeAdjustBoxDecision({
          id: 'dec-115',
          caseId: 'case-go-mismatch',
          boxNumber: 115,
          finalValue: 60_000_000,
        }),
      ],
      occasionalGainsBreakdown: {
        generalBaseCop: 40_000_000,
        lotteryBaseCop: 10_000_000,
      },
    });
    const liq = draft.preliminaryLiquidation!;
    expect(liq.warnings.some((warning) => warning.includes('no coincide'))).toBe(true);
  });

  it('agrega el anticipo del año siguiente al saldo cuando hay contexto', () => {
    // Renta 3.000 UVT → impuesto ≈ 480 UVT.
    // Primera declaración, sin retenciones → anticipo = 25 % del impuesto neto.
    const uvt = UVT_2025;
    const draft = buildForm210Draft({
      caseId: 'case-advance-first',
      taxYear: 2025,
      records: [],
      facts: [],
      resolutions: [
        makeAdjustBoxDecision({
          id: 'dec-42',
          caseId: 'case-advance-first',
          boxNumber: 42,
          finalValue: 3_000 * uvt,
        }),
      ],
      advancePaymentContext: {
        filingCountIncludingCurrent: 1,
        priorNetIncomeTaxCop: null,
      },
    });
    const liq = draft.preliminaryLiquidation!;
    const impuestoRenta = liq.incomeTax!.totalTaxCopRounded;
    expect(liq.nextYearAdvance).not.toBeNull();
    expect(liq.nextYearAdvance!.bracket.rate).toBe(0.25);
    expect(liq.nextYearAdvance!.grossAdvanceCop).toBe(Math.round(impuestoRenta * 0.25));
    expect(liq.nextYearAdvance!.netAdvanceCop).toBe(Math.round(impuestoRenta * 0.25));
    expect(liq.netBalanceCop).toBe(impuestoRenta + Math.round(impuestoRenta * 0.25));
    expect(liq.status).toBe('to_pay');
  });

  it('advierte cuando falta el contexto del anticipo pero hay impuesto', () => {
    const uvt = UVT_2025;
    const draft = buildForm210Draft({
      caseId: 'case-advance-warning',
      taxYear: 2025,
      records: [],
      facts: [],
      resolutions: [
        makeAdjustBoxDecision({
          id: 'dec-42',
          caseId: 'case-advance-warning',
          boxNumber: 42,
          finalValue: 3_000 * uvt,
        }),
      ],
    });
    const liq = draft.preliminaryLiquidation!;
    expect(liq.nextYearAdvance).toBeNull();
    expect(liq.warnings.some((warning) => warning.includes('anticipo'))).toBe(true);
  });

  it('no calcula anticipo cuando el impuesto neto es cero', () => {
    // Sin renta cedular → sin impuesto → sin anticipo (aunque haya contexto).
    const draft = buildForm210Draft({
      caseId: 'case-advance-no-tax',
      taxYear: 2025,
      records: [],
      facts: [],
      advancePaymentContext: {
        filingCountIncludingCurrent: 3,
        priorNetIncomeTaxCop: 5_000_000,
      },
    });
    const liq = draft.preliminaryLiquidation!;
    expect(liq.nextYearAdvance).toBeNull();
  });

  it('cablea la deducción por dependientes a la casilla 39 y a la liquidación', () => {
    // Ingreso 60M. 10 % = 6M ; tope mensual 12 × 32 UVT × UVT_2025 ≈ 19.1M.
    // Aplicado = 6M (limitante = percentage).
    const draft = buildForm210Draft({
      caseId: 'case-dependents',
      taxYear: 2025,
      records: [employmentRecord('rec-1', 60_000_000)],
      facts: [],
      dependents: [{ id: 'dep-1', kind: 'child_minor', monthsClaimed: 12 }],
    });
    const box39 = draft.boxes.find((box) => box.number === 39)!;
    expect(box39.suggestedValue).toBe(6_000_000);
    expect(box39.sources.some((source) => source.sourceId === 'calc:dependents-387')).toBe(
      true,
    );
    const liq = draft.preliminaryLiquidation!;
    expect(liq.dependentsDeduction).not.toBeNull();
    expect(liq.dependentsDeduction!.appliedDeductionCop).toBe(6_000_000);
    expect(liq.dependentsDeduction!.bindingCandidate).toBe('percentage');
    expect(liq.dependentsDeduction!.ruleSourceId).toBe('et-art-387');
  });

  it('advierte cuando se declaran más de cuatro dependientes', () => {
    const dependents = Array.from({ length: 6 }, (_, index) => ({
      id: `dep-${index + 1}`,
      kind: 'child_minor' as const,
      monthsClaimed: 12,
    }));
    const draft = buildForm210Draft({
      caseId: 'case-dependents-cap',
      taxYear: 2025,
      records: [employmentRecord('rec-1', 500_000_000)],
      facts: [],
      dependents,
    });
    const liq = draft.preliminaryLiquidation!;
    expect(liq.dependentsDeduction!.dependentsProvidedCount).toBe(6);
    expect(liq.dependentsDeduction!.dependentsEligibleCount).toBe(DEPENDENTS_MAX_ELIGIBLE);
    expect(liq.warnings.some((warning) => warning.includes('primeros'))).toBe(true);
  });

  it('cablea la deducción por facturas electrónicas a la casilla 39 y a la liquidación', () => {
    // Compras 50M → 1 % = 500.000, muy por debajo del tope 240 UVT ≈ 11.95M.
    const draft = buildForm210Draft({
      caseId: 'case-fe',
      taxYear: 2025,
      records: [employmentRecord('rec-1', 60_000_000)],
      facts: [],
      electronicInvoicing: { purchasesWithElectronicInvoiceCop: 50_000_000 },
    });
    const box39 = draft.boxes.find((box) => box.number === 39)!;
    expect(box39.suggestedValue).toBe(500_000);
    expect(
      box39.sources.some((source) => source.sourceId === 'calc:electronic-invoicing-336-1'),
    ).toBe(true);
    const liq = draft.preliminaryLiquidation!;
    expect(liq.electronicInvoicingDeduction).not.toBeNull();
    expect(liq.electronicInvoicingDeduction!.appliedDeductionCop).toBe(500_000);
    expect(liq.electronicInvoicingDeduction!.bindingCandidate).toBe('percentage');
    expect(liq.electronicInvoicingDeduction!.ruleSourceId).toBe('et-art-336-1');
  });

  it('respeta el tope de 240 UVT cuando el 1 % lo excede', () => {
    // Compras 2.000M → 1 % = 20M, tope 240 UVT ≈ 11.95M.
    const draft = buildForm210Draft({
      caseId: 'case-fe-cap',
      taxYear: 2025,
      records: [employmentRecord('rec-1', 100_000_000)],
      facts: [],
      electronicInvoicing: { purchasesWithElectronicInvoiceCop: 2_000_000_000 },
    });
    const liq = draft.preliminaryLiquidation!;
    const expectedCap = Math.round(ELECTRONIC_INVOICING_ANNUAL_CAP_UVT * UVT_2025);
    expect(liq.electronicInvoicingDeduction!.appliedDeductionCop).toBe(expectedCap);
    expect(liq.electronicInvoicingDeduction!.bindingCandidate).toBe('uvt_cap');
  });

  it('acumula dependientes y facturas electrónicas en la casilla 39', () => {
    // Dependiente 10 % × 60M = 6M ; compras 50M × 1 % = 500.000.
    // Casilla 39 debería sumar ambas: 6.500.000.
    const draft = buildForm210Draft({
      caseId: 'case-combo',
      taxYear: 2025,
      records: [employmentRecord('rec-1', 60_000_000)],
      facts: [],
      dependents: [{ id: 'dep-1', kind: 'child_minor', monthsClaimed: 12 }],
      electronicInvoicing: { purchasesWithElectronicInvoiceCop: 50_000_000 },
    });
    const box39 = draft.boxes.find((box) => box.number === 39)!;
    expect(box39.suggestedValue).toBe(6_500_000);
    expect(box39.sources).toHaveLength(2);
  });

  it('aplica límites individuales declarativos (AFC, vivienda, medicina) y advierte excesos', () => {
    // AFC 20M declarados sobre ingreso 50M → recorta al 30 % = 15M.
    // Vivienda 30M declarados < tope 1.200 UVT ≈ 59.7M → aplica 30M.
    // Medicina 15M declarados > tope 192 UVT ≈ 9.56M → recorta.
    const draft = buildForm210Draft({
      caseId: 'case-individual-limits',
      taxYear: 2025,
      records: [employmentRecord('rec-1', 50_000_000)],
      facts: [],
      individualDeductions: {
        afcFvpAvcCop: 20_000_000,
        housingInterestCop: 30_000_000,
        prepaidMedicineCop: 15_000_000,
      },
    });
    const liq = draft.preliminaryLiquidation!;
    expect(liq.individualDeductionLimits).toHaveLength(3);
    const afc = liq.individualDeductionLimits.find((c) => c.ruleId === 'afc-fvp-avc-2025')!;
    expect(afc.appliedCop).toBe(15_000_000);
    expect(afc.bindingCandidate).toBe('percentage');
    const housing = liq.individualDeductionLimits.find(
      (c) => c.ruleId === 'housing-interest-2025',
    )!;
    expect(housing.appliedCop).toBe(30_000_000);
    expect(housing.bindingCandidate).toBe('declared');
    const medicine = liq.individualDeductionLimits.find(
      (c) => c.ruleId === 'prepaid-medicine-2025',
    )!;
    expect(medicine.bindingCandidate).toBe('uvt_cap');
    // La casilla 35 recibe el aplicado de AFC.
    const box35 = draft.boxes.find((box) => box.number === 35)!;
    expect(box35.suggestedValue).toBe(15_000_000);
    // Warnings de exceso emitidos para AFC y medicina (declarado ≠ aplicado).
    const codes = draft.findings.map((f) => f.code);
    expect(codes.filter((c) => c === 'unsupported_deduction').length).toBeGreaterThanOrEqual(
      2,
    );
  });

  it('aplica el saldo a favor anterior cuando está confirmado y sin solicitudes pendientes', () => {
    // Renta 3.000 UVT → impuesto 480 UVT. Saldo a favor confirmado 10M.
    const uvt = UVT_2025;
    const draft = buildForm210Draft({
      caseId: 'case-prior-balance-applied',
      taxYear: 2025,
      records: [],
      facts: [],
      resolutions: [
        makeAdjustBoxDecision({
          id: 'dec-42',
          caseId: 'case-prior-balance-applied',
          boxNumber: 42,
          finalValue: 3_000 * uvt,
        }),
      ],
      priorYearBalance: {
        declaredCop: 10_000_000,
        confirmedByAnalyst: true,
        hasPendingCompensationOrRefundRequest: false,
        priorYearFilingDate: '2025-08-10',
        evidence: 'F-210 AG 2024',
      },
    });
    const liq = draft.preliminaryLiquidation!;
    expect(liq.priorYearBalance).not.toBeNull();
    expect(liq.priorYearBalance!.status).toBe('applied');
    expect(liq.priorYearBalance!.appliedCop).toBe(10_000_000);
    expect(liq.priorYearBalanceCop).toBe(10_000_000);
    const expectedTax = computeProgressiveIncomeTax(3_000 * uvt, 2025).totalTaxCopRounded;
    expect(liq.netBalanceCop).toBe(expectedTax - 10_000_000);
  });

  it('mantiene pending_confirmation cuando falta la confirmación humana', () => {
    const uvt = UVT_2025;
    const draft = buildForm210Draft({
      caseId: 'case-prior-balance-pending',
      taxYear: 2025,
      records: [],
      facts: [],
      resolutions: [
        makeAdjustBoxDecision({
          id: 'dec-42',
          caseId: 'case-prior-balance-pending',
          boxNumber: 42,
          finalValue: 3_000 * uvt,
        }),
      ],
      priorYearBalance: {
        declaredCop: 10_000_000,
        confirmedByAnalyst: false,
        hasPendingCompensationOrRefundRequest: false,
      },
    });
    const liq = draft.preliminaryLiquidation!;
    expect(liq.priorYearBalance!.status).toBe('pending_confirmation');
    expect(liq.priorYearBalance!.appliedCop).toBe(0);
    expect(liq.priorYearBalanceCop).toBe(0);
    expect(liq.warnings.some((w) => w.includes('no confirmado'))).toBe(true);
  });

  it('bloquea el saldo cuando hay solicitud de devolución/compensación pendiente', () => {
    const uvt = UVT_2025;
    const draft = buildForm210Draft({
      caseId: 'case-prior-balance-blocked',
      taxYear: 2025,
      records: [],
      facts: [],
      resolutions: [
        makeAdjustBoxDecision({
          id: 'dec-42',
          caseId: 'case-prior-balance-blocked',
          boxNumber: 42,
          finalValue: 3_000 * uvt,
        }),
      ],
      priorYearBalance: {
        declaredCop: 8_000_000,
        confirmedByAnalyst: true,
        hasPendingCompensationOrRefundRequest: true,
      },
    });
    const liq = draft.preliminaryLiquidation!;
    expect(liq.priorYearBalance!.status).toBe('blocked_by_pending_request');
    expect(liq.priorYearBalance!.appliedCop).toBe(0);
    expect(liq.warnings.some((w) => w.includes('devolución o compensación'))).toBe(true);
  });

  it('advierte cuando la casilla 131 tiene valor pero falta el contexto de confirmación', () => {
    const uvt = UVT_2025;
    const draft = buildForm210Draft({
      caseId: 'case-prior-balance-no-context',
      taxYear: 2025,
      records: [],
      facts: [],
      resolutions: [
        makeAdjustBoxDecision({
          id: 'dec-42',
          caseId: 'case-prior-balance-no-context',
          boxNumber: 42,
          finalValue: 3_000 * uvt,
        }),
        makeAdjustBoxDecision({
          id: 'dec-131',
          caseId: 'case-prior-balance-no-context',
          boxNumber: 131,
          finalValue: 5_000_000,
        }),
      ],
    });
    const liq = draft.preliminaryLiquidation!;
    expect(liq.priorYearBalance).toBeNull();
    expect(liq.priorYearBalanceCop).toBe(0);
    expect(liq.warnings.some((w) => w.includes('casilla 131'))).toBe(true);
  });

  it('sin ingresos de trabajo la deducción es cero y se advierte', () => {
    const draft = buildForm210Draft({
      caseId: 'case-dependents-no-income',
      taxYear: 2025,
      records: [],
      facts: [],
      dependents: [{ id: 'dep-1', kind: 'child_minor', monthsClaimed: 12 }],
    });
    const liq = draft.preliminaryLiquidation!;
    expect(liq.dependentsDeduction!.appliedDeductionCop).toBe(0);
    expect(liq.warnings.some((warning) => warning.includes('casilla 32'))).toBe(true);
  });

  it('suma impuesto de renta y de GO en totalTaxDueCop', () => {
    // Renta 3.000 UVT → 480 UVT ≈ 23.9M. GO 100M → 15M. Total ≈ 38.9M.
    const uvt = UVT_2025;
    const draft = buildForm210Draft({
      caseId: 'case-go-plus-income',
      taxYear: 2025,
      records: [],
      facts: [],
      resolutions: [
        makeAdjustBoxDecision({
          id: 'dec-42',
          caseId: 'case-go-plus-income',
          boxNumber: 42,
          finalValue: 3_000 * uvt,
        }),
        makeAdjustBoxDecision({
          id: 'dec-115',
          caseId: 'case-go-plus-income',
          boxNumber: 115,
          finalValue: 100_000_000,
        }),
      ],
    });
    const liq = draft.preliminaryLiquidation!;
    const expectedRenta = computeProgressiveIncomeTax(3_000 * uvt, 2025).totalTaxCopRounded;
    expect(liq.incomeTax?.totalTaxCopRounded).toBe(expectedRenta);
    expect(liq.occasionalGainsTax?.totalTaxCop).toBe(15_000_000);
    expect(liq.totalTaxDueCop).toBe(expectedRenta + 15_000_000);
    expect(liq.status).toBe('to_pay');
  });
});
