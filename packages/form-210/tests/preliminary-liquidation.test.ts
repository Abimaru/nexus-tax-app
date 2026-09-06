import { describe, expect, it } from 'vitest';
import type {
  DocumentFact,
  NormalizedExogenousRecord,
  TaxResolutionDecision,
} from '@nexus-tax/domain';
import {
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

  it('ya no limita a cuatro dependientes: el art. 387 no fija número máximo (Fase C)', () => {
    // Corrección de auditoría (Sprint 2.4, Fase C): el warning de "solo los
    // primeros 4" se eliminó porque no reflejaba la norma (ver
    // packages/aegis-rules/tests/dependents.test.ts para el detalle).
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
    expect(liq.dependentsDeduction!.dependentsEligibleCount).toBe(6);
    expect(liq.warnings.some((warning) => warning.includes('primeros'))).toBe(false);
  });

  it('cablea la deducción por facturas electrónicas a la casilla 28 (revisión normativa puntual)', () => {
    // CORRECCIÓN NORMATIVA (revisión posterior a Fase D): la ubicación
    // oficial de esta deducción es la casilla 28 (dato informativo previo a
    // patrimonio), confirmada por múltiples fuentes independientes. Las
    // casillas 140/141 NO le pertenecen: 140 es un indicador de exceso de
    // costos/gastos (art. 336-1 ET, norma distinta) y 141 es el impuesto
    // voluntario (art. 244-1 ET). El fundamento legal correcto es el
    // numeral 5 del art. 336 ET, exento del límite del 40 %/1.340 UVT, por
    // lo que nunca entra a R39 ni a la fórmula de R92.
    // Compras 50M → 1 % = 500.000, muy por debajo del tope 240 UVT ≈ 11.95M.
    const draft = buildForm210Draft({
      caseId: 'case-fe',
      taxYear: 2025,
      records: [employmentRecord('rec-1', 60_000_000)],
      facts: [],
      electronicInvoicing: { purchasesWithElectronicInvoiceCop: 50_000_000 },
    });
    const box39 = draft.boxes.find((box) => box.number === 39)!;
    expect(
      box39.sources.some((source) => source.sourceId.includes('electronic-invoicing')),
    ).toBe(false);
    const box140 = draft.boxes.find((box) => box.number === 140)!;
    expect(box140.suggestedValue).toBeNull();
    const box141 = draft.boxes.find((box) => box.number === 141)!;
    expect(box141.suggestedValue).toBeNull();
    const box28 = draft.boxes.find((box) => box.number === 28)!;
    expect(box28.suggestedValue).toBe(500_000);
    expect(
      box28.sources.some((source) => source.sourceId === 'calc:electronic-invoicing-336-num-5'),
    ).toBe(true);
    const box92 = draft.boxes.find((box) => box.number === 92)!;
    // R92 se calcula por su propia fórmula (41+65+82+139, todas en 0 aquí
    // por falta de rentas exentas/deducciones/dependientes declarados) —
    // nunca incluye el valor de la deducción de facturación electrónica.
    expect(box92.suggestedValue).toBe(0);
    const liq = draft.preliminaryLiquidation!;
    expect(liq.electronicInvoicingDeduction).not.toBeNull();
    expect(liq.electronicInvoicingDeduction!.appliedDeductionCop).toBe(500_000);
    expect(liq.electronicInvoicingDeduction!.bindingCandidate).toBe('percentage');
    expect(liq.electronicInvoicingDeduction!.ruleSourceId).toBe('et-art-336-num-5');
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
    const box28 = draft.boxes.find((box) => box.number === 28)!;
    expect(box28.suggestedValue).toBe(expectedCap);
  });

  it('dependientes (R39 vía art. 387) y facturación electrónica (R28) nunca se mezclan en la misma casilla', () => {
    // Dependiente 10 % × 60M = 6M (casilla 39) ; compras 50M × 1 % = 500.000 (casilla 28, independiente).
    const draft = buildForm210Draft({
      caseId: 'case-combo',
      taxYear: 2025,
      records: [employmentRecord('rec-1', 60_000_000)],
      facts: [],
      dependents: [{ id: 'dep-1', kind: 'child_minor', monthsClaimed: 12 }],
      electronicInvoicing: { purchasesWithElectronicInvoiceCop: 50_000_000 },
    });
    const box39 = draft.boxes.find((box) => box.number === 39)!;
    expect(box39.suggestedValue).toBe(6_000_000);
    expect(box39.sources).toHaveLength(1);
    const box28 = draft.boxes.find((box) => box.number === 28)!;
    expect(box28.suggestedValue).toBe(500_000);
  });

  describe('GUARDARRAÍL — revisión normativa puntual (impide la reintroducción de los 4 errores encontrados)', () => {
    it('R140 nunca se trata como importe monetario (COP): permanece null/sin sources incluso con facturación electrónica declarada', () => {
      const draft = buildForm210Draft({
        caseId: 'case-guard-140',
        taxYear: 2025,
        records: [employmentRecord('rec-1', 60_000_000)],
        facts: [],
        electronicInvoicing: { purchasesWithElectronicInvoiceCop: 50_000_000 },
      });
      const box140 = draft.boxes.find((box) => box.number === 140)!;
      expect(box140.suggestedValue).toBeNull();
      expect(box140.sources).toHaveLength(0);
      expect(box140.formula).toBeNull();
      expect(box140.ruleComplete).toBe(false);
    });

    it('R141 nunca se usa para la deducción de facturación electrónica: permanece null/sin sources', () => {
      const draft = buildForm210Draft({
        caseId: 'case-guard-141',
        taxYear: 2025,
        records: [employmentRecord('rec-1', 60_000_000)],
        facts: [],
        electronicInvoicing: { purchasesWithElectronicInvoiceCop: 2_000_000_000 }, // fuerza el tope de 240 UVT también
      });
      const box141 = draft.boxes.find((box) => box.number === 141)!;
      expect(box141.suggestedValue).toBeNull();
      expect(box141.sources).toHaveLength(0);
      expect(
        box141.sources.some((source) => source.sourceId.includes('electronic-invoicing')),
      ).toBe(false);
    });

    it('la deducción del 1 % nunca vuelve a cablearse en la casilla 39', () => {
      const draft = buildForm210Draft({
        caseId: 'case-guard-39',
        taxYear: 2025,
        records: [employmentRecord('rec-1', 60_000_000)],
        facts: [],
        dependents: [{ id: 'dep-1', kind: 'child_minor', monthsClaimed: 12 }],
        electronicInvoicing: { purchasesWithElectronicInvoiceCop: 50_000_000 },
      });
      const box39 = draft.boxes.find((box) => box.number === 39)!;
      // Solo la fuente de dependientes debe estar presente; nunca facturación electrónica.
      expect(box39.sources.map((source) => source.sourceId)).toEqual(['calc:dependents-387']);
      expect(
        box39.sources.some((source) => source.sourceId.includes('electronic-invoicing')),
      ).toBe(false);
    });

    it('la deducción del 1 % nunca queda sujeta al límite del 40 %/1.340 UVT (R92/R41): un tope de deducciones bajo no la recorta', () => {
      // Ingreso de trabajo 500M, SIN rentas exentas/deducciones declaradas
      // (37+40 = 0), por lo que R41 = min(40%×500M, 1.340 UVT, 0) = 0 — el
      // componente detectado es el limitante más restrictivo posible. Si la
      // deducción del 1 % dependiera de R41/R92 (el bug corregido), su valor
      // se vería arrastrado a 0. Compras 50M → 1 % = 500.000: debe
      // conservarse íntegro en R28, ajeno por completo a esa cadena.
      const draft = buildForm210Draft({
        caseId: 'case-guard-limit',
        taxYear: 2025,
        records: [employmentRecord('rec-1', 500_000_000)],
        facts: [],
        electronicInvoicing: { purchasesWithElectronicInvoiceCop: 50_000_000 },
      });
      const box41 = draft.boxes.find((box) => box.number === 41)!;
      expect(box41.suggestedValue).toBe(0); // confirma que el límite conjunto SÍ está activo y restrictivo.
      const box28 = draft.boxes.find((box) => box.number === 28)!;
      expect(box28.suggestedValue).toBe(500_000); // la deducción del 1 % no se ve afectada.
      const liq = draft.preliminaryLiquidation!;
      expect(liq.electronicInvoicingDeduction!.appliedDeductionCop).toBe(500_000);
    });
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

  it('consolida retenciones desde records con entityTaxId y detecta duplicados', () => {
    const withholdingRecord = (
      id: string,
      value: number,
      entityTaxId: string,
      label: string,
    ): NormalizedExogenousRecord => ({
      ...employmentRecord(id, value),
      category: 'withholding',
      treatment: 'subtract_from_tax',
      nature: 'tax_credit',
      entityTaxId,
      conceptLabel: label,
    });
    const draft = buildForm210Draft({
      caseId: 'case-withholdings-consolidation',
      taxYear: 2025,
      records: [
        withholdingRecord('w1', 3_000_000, '900000001', 'Retención Empresa A cert 1'),
        withholdingRecord('w2', 3_010_000, '900000001', 'Retención Empresa A cert 2'),
        withholdingRecord('w3', 2_000_000, '900000002', 'Retención Empresa B'),
      ],
      facts: [],
    });
    const liq = draft.preliminaryLiquidation!;
    expect(liq.withholdings.totalReportedCop).toBe(8_010_000);
    expect(liq.withholdings.entriesCount).toBe(3);
    expect(liq.withholdings.entriesWithoutSupportCount).toBe(3);
    expect(liq.withholdings.suspectedDuplicates).toHaveLength(1);
    expect(liq.withholdings.suspectedDuplicates[0]!.a.sourceId).toBe('record:w1');
    expect(liq.withholdingsCop).toBe(8_010_000);
    expect(liq.withholdings.ruleSourceId).toBe('et-art-373');
    expect(liq.warnings.some((w) => w.includes('doble conteo'))).toBe(true);
    expect(liq.warnings.some((w) => w.includes('certificado documental'))).toBe(true);
  });

  it('valida desglose de retenciones contra el total reportado', () => {
    const withholdingRecord = (id: string, value: number): NormalizedExogenousRecord => ({
      ...employmentRecord(id, value),
      category: 'withholding',
      treatment: 'subtract_from_tax',
      nature: 'tax_credit',
      entityTaxId: '900000001',
    });
    const draft = buildForm210Draft({
      caseId: 'case-withholdings-breakdown',
      taxYear: 2025,
      records: [withholdingRecord('w1', 10_000_000)],
      facts: [],
      withholdingsBreakdown: {
        employmentCop: 7_000_000,
        capitalCop: 2_000_000,
        nonLaborCop: 0,
        occasionalGainCop: 0,
        dividendsCop: 0,
        otherCop: 500_000,
      },
    });
    const liq = draft.preliminaryLiquidation!;
    expect(liq.withholdings.breakdown).not.toBeNull();
    expect(liq.withholdings.breakdownTotalCop).toBe(9_500_000);
    expect(liq.withholdings.breakdownMatchesReported).toBe(false);
    expect(liq.withholdings.breakdownDifferenceCop).toBe(-500_000);
    expect(liq.warnings.some((w) => w.includes('desglose de retenciones'))).toBe(true);
  });

  it('respeta ajustes manuales al box 132 cuando no hay records de retención', () => {
    // Cuando el analista ajusta directamente la casilla 132, la
    // consolidación agrega una fuente sintética por la diferencia.
    const draft = buildForm210Draft({
      caseId: 'case-withholdings-manual',
      taxYear: 2025,
      records: [],
      facts: [],
      resolutions: [
        makeAdjustBoxDecision({
          id: 'dec-132',
          caseId: 'case-withholdings-manual',
          boxNumber: 132,
          finalValue: 5_000_000,
        }),
      ],
    });
    const liq = draft.preliminaryLiquidation!;
    expect(liq.withholdings.totalReportedCop).toBe(5_000_000);
    expect(liq.withholdings.entriesCount).toBe(1);
    expect(liq.withholdingsCop).toBe(5_000_000);
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

describe('casillas estructurales de liquidación (Fase B0, Sprint 2.4)', () => {
  it('cablea 126, 127 y 129 informativamente sin alterar el impuesto ya calculado', () => {
    const uvt = UVT_2025;
    const draft = buildForm210Draft({
      caseId: 'case-b0-tax-boxes',
      taxYear: 2025,
      records: [],
      facts: [],
      resolutions: [
        makeAdjustBoxDecision({
          id: 'dec-42',
          caseId: 'case-b0-tax-boxes',
          boxNumber: 42,
          finalValue: 3_000 * uvt,
        }),
        makeAdjustBoxDecision({
          id: 'dec-115',
          caseId: 'case-b0-tax-boxes',
          boxNumber: 115,
          finalValue: 100_000_000,
        }),
      ],
    });
    const liq = draft.preliminaryLiquidation!;
    const box126 = draft.boxes.find((box) => box.number === 126)!;
    const box127 = draft.boxes.find((box) => box.number === 127)!;
    const box129 = draft.boxes.find((box) => box.number === 129)!;
    expect(box126.suggestedValue).toBe(liq.incomeTax!.totalTaxCopRounded);
    expect(box127.suggestedValue).toBe(liq.occasionalGainsTax!.totalTaxCop);
    expect(box129.suggestedValue).toBe(liq.totalTaxDueCop);
    expect(box129.suggestedValue).toBe(box126.suggestedValue! + box127.suggestedValue!);
    // El estado de implementación sigue marcado como no verificado: la
    // numeración oficial de estas casillas no está confirmada.
    expect(box126.implementationStatus).toBe('implemented_unverified');
    expect(box127.implementationStatus).toBe('requires_review');
  });

  it('cablea 133 (anticipo siguiente año) y 137 (saldo a favor) cuando aplican', () => {
    const uvt = UVT_2025;
    const retenciones = 30_000_000;
    const draft = buildForm210Draft({
      caseId: 'case-b0-settlement-boxes',
      taxYear: 2025,
      records: [],
      facts: [],
      resolutions: [
        makeAdjustBoxDecision({
          id: 'dec-42',
          caseId: 'case-b0-settlement-boxes',
          boxNumber: 42,
          finalValue: 3_000 * uvt,
        }),
        makeAdjustBoxDecision({
          id: 'dec-132',
          caseId: 'case-b0-settlement-boxes',
          boxNumber: 132,
          finalValue: retenciones,
        }),
      ],
      advancePaymentContext: {
        filingCountIncludingCurrent: 1,
        priorNetIncomeTaxCop: null,
      },
    });
    const liq = draft.preliminaryLiquidation!;
    const box133 = draft.boxes.find((box) => box.number === 133)!;
    const box137 = draft.boxes.find((box) => box.number === 137)!;
    expect(box133.suggestedValue).toBe(liq.nextYearAdvance!.netAdvanceCop);
    expect(liq.status).toBe('refund');
    expect(box137.suggestedValue).toBe(-liq.netBalanceCop);
  });

  it('138/139 permanecen sin calcular si solo se declara `dependents` (art. 387), no `dependentsAdditional` (art. 336)', () => {
    // El campo `dependents` alimenta el motor del art. 387 (casilla 39);
    // 138/139 requieren específicamente `dependentsAdditional` (art. 336 num.
    // 3), que es un input independiente — confirma que ambos motores nunca
    // se fusionan.
    const draft = buildForm210Draft({
      caseId: 'case-b0-dependents-336',
      taxYear: 2025,
      records: [employmentRecord('rec-1', 60_000_000)],
      facts: [],
      dependents: [{ id: 'dep-1', kind: 'child_minor', monthsClaimed: 12 }],
    });
    const box138 = draft.boxes.find((box) => box.number === 138)!;
    const box139 = draft.boxes.find((box) => box.number === 139)!;
    expect(box138.suggestedValue).toBeNull();
    expect(box139.suggestedValue).toBeNull();
    expect(box138.status).toBe('no_data');
    expect(box139.status).toBe('no_data');
  });
});

describe('adición por dependientes — R138/R139/R91/R92/R93 (Fase C, Sprint 2.4)', () => {
  it('cablea R138 (conteo confirmado) y R139 (72 UVT × conteo) como componente de R92, nunca de R39', () => {
    const draft = buildForm210Draft({
      caseId: 'case-c-additional-dependents',
      taxYear: 2025,
      records: [employmentRecord('rec-1', 60_000_000)],
      facts: [],
      dependentsAdditional: [{ id: 'dep-1', eligible: true }],
    });
    const box39 = draft.boxes.find((box) => box.number === 39)!;
    const box138 = draft.boxes.find((box) => box.number === 138)!;
    const box139 = draft.boxes.find((box) => box.number === 139)!;
    const box92 = draft.boxes.find((box) => box.number === 92)!;
    expect(box138.suggestedValue).toBe(1);
    expect(box139.suggestedValue).toBe(Math.round(72 * UVT_2025));
    // R139 NUNCA se agrega a R39 (no fusionar con el art. 387).
    expect(box39.suggestedValue).toBeNull();
    expect(box92.suggestedValue).toBe(box139.suggestedValue);
    expect(draft.preliminaryLiquidation!.dependentsAdditionalDeduction!.dependentsAppliedCount).toBe(
      1,
    );
  });

  it('4 dependientes elegibles: R138=4, R139=288 UVT; el quinto se excluye sin perderse', () => {
    const draft = buildForm210Draft({
      caseId: 'case-c-five-dependents',
      taxYear: 2025,
      records: [],
      facts: [],
      dependentsAdditional: [
        { id: 'dep-1', eligible: true },
        { id: 'dep-2', eligible: true },
        { id: 'dep-3', eligible: true },
        { id: 'dep-4', eligible: true },
        { id: 'dep-5', eligible: true },
      ],
    });
    const additional = draft.preliminaryLiquidation!.dependentsAdditionalDeduction!;
    expect(additional.dependentsProvidedCount).toBe(5);
    expect(additional.dependentsAppliedCount).toBe(4);
    expect(additional.totalUvt).toBe(288);
    expect(additional.excludedDependents).toEqual([{ id: 'dep-5', reason: 'exceeds_max_four' }]);
    const box138 = draft.boxes.find((box) => box.number === 138)!;
    expect(box138.suggestedValue).toBe(4);
  });

  it('R91 = R34 + R61 + R78 y R93 = R91 − R92 se calculan cuando hay señal en las subcédulas', () => {
    const draft = buildForm210Draft({
      caseId: 'case-c-cedular-consolidation',
      taxYear: 2025,
      records: [],
      facts: [],
      resolutions: [
        makeAdjustBoxDecision({ id: 'dec-34', caseId: 'case-c-cedular-consolidation', boxNumber: 34, finalValue: 60_000_000 }),
        makeAdjustBoxDecision({ id: 'dec-41', caseId: 'case-c-cedular-consolidation', boxNumber: 41, finalValue: 10_000_000 }),
        makeAdjustBoxDecision({ id: 'dec-61', caseId: 'case-c-cedular-consolidation', boxNumber: 61, finalValue: 10_000_000 }),
        makeAdjustBoxDecision({ id: 'dec-65', caseId: 'case-c-cedular-consolidation', boxNumber: 65, finalValue: 2_000_000 }),
        makeAdjustBoxDecision({ id: 'dec-78', caseId: 'case-c-cedular-consolidation', boxNumber: 78, finalValue: 20_000_000 }),
        makeAdjustBoxDecision({ id: 'dec-82', caseId: 'case-c-cedular-consolidation', boxNumber: 82, finalValue: 3_000_000 }),
      ],
      dependentsAdditional: [{ id: 'dep-1', eligible: true }],
    });
    const box91 = draft.boxes.find((box) => box.number === 91)!;
    const box92 = draft.boxes.find((box) => box.number === 92)!;
    const box93 = draft.boxes.find((box) => box.number === 93)!;
    const uvtCop = Math.round(72 * UVT_2025);
    expect(box91.suggestedValue).toBe(90_000_000);
    expect(box92.suggestedValue).toBe(10_000_000 + 2_000_000 + 3_000_000 + uvtCop);
    expect(box93.suggestedValue).toBe(90_000_000 - (15_000_000 + uvtCop));
  });

  it('la adición de 72 UVT NO se somete al límite conjunto de 40 %/1.340 UVT (queda fuera de R41/R65/R82)', () => {
    // Renta líquida de trabajo muy alta para que el 40 % / 1.340 UVT dominen
    // R41; la adición de dependientes debe seguir intacta en R139/R92 sin
    // reducirse por ese límite, porque nunca pasa por R39/R41.
    const draft = buildForm210Draft({
      caseId: 'case-c-joint-limit-exclusion',
      taxYear: 2025,
      records: [employmentRecord('rec-1', 500_000_000)],
      facts: [],
      dependentsAdditional: [
        { id: 'dep-1', eligible: true },
        { id: 'dep-2', eligible: true },
      ],
    });
    const box139 = draft.boxes.find((box) => box.number === 139)!;
    expect(box139.suggestedValue).toBe(Math.round(144 * UVT_2025));
  });

  it('dependiente no elegible no genera R139 ni cuenta en R138', () => {
    const draft = buildForm210Draft({
      caseId: 'case-c-not-eligible',
      taxYear: 2025,
      records: [],
      facts: [],
      dependentsAdditional: [{ id: 'dep-1', eligible: false }],
    });
    const box138 = draft.boxes.find((box) => box.number === 138)!;
    const box139 = draft.boxes.find((box) => box.number === 139)!;
    expect(box138.suggestedValue).toBe(0);
    expect(box139.suggestedValue).toBeNull();
  });
});
