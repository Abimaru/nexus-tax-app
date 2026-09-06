import type {
  DocumentFact,
  NormalizedExogenousRecord,
  TaxCategory,
  TaxResolutionDecision,
} from '@nexus-tax/domain';
import {
  AFC_FVP_AVC_LIMIT_RULE_2025,
  HOUSING_INTEREST_LIMIT_RULE_2025,
  PREPAID_MEDICINE_LIMIT_RULE_2025,
  TAX_LIMIT_RULES_2025,
  TAX_UNIT_2025,
  applyIndividualDeductionLimit,
  applyLimitRule,
  computeAdvancePayment,
  computeDependentsAdditionalDeduction,
  computeDependentsDeduction,
  computeElectronicInvoicingDeduction,
  computeOccasionalGainsTax,
  computeProgressiveIncomeTax,
  consolidateWithholdings,
  copToUvt,
  detectDuplicatePatrimonyEntries,
  detectLiabilityWithoutAsset,
  detectMovementWithoutBalance,
  evaluateCrossValidations,
  evaluatePriorYearBalance,
} from '@nexus-tax/aegis-rules';
import type {
  IndividualDeductionLimitComputation,
  WithholdingSource,
} from '@nexus-tax/aegis-rules';
import { FORM_210_RULESET_2025 } from './ruleset-2025';
import type {
  Form210BoxValue,
  Form210BuildInput,
  Form210Draft,
  Form210PreliminaryLiquidation,
  Form210SourceTrace,
  Form210ValidationFinding,
} from './types';

const CATEGORY_BOX: Partial<Record<TaxCategory, number>> = {
  asset: 29,
  investment_asset: 29,
  liability: 30,
  employment_income: 32,
  employment_non_constitutive_income: 33,
  housing_interest: 38,
  financial_income: 58,
  other_income: 74,
  pension_income: 99,
  dividend_income: 104,
  occasional_gain: 112,
  prior_year_balance: 131,
  withholding: 132,
};

function recordTrace(
  record: NormalizedExogenousRecord,
  value: number,
  provisional: boolean,
): Form210SourceTrace {
  return {
    type: provisional ? 'provisional_source' : 'exogenous',
    sourceId: `record:${record.id}`,
    recordId: record.id,
    documentId: null,
    factId: null,
    label: record.conceptLabel ?? record.conceptCode ?? 'Registro exógeno',
    value,
    evidence: `${record.source.sheet} · fila ${record.source.row}`,
    originalValue: record.reportedValue ?? value,
    originalText: record.reportedValue === null ? undefined : String(record.reportedValue),
    transformation: null,
    confidence: record.confidence,
    role:
      record.category === 'prior_year_balance'
        ? 'prior_year_reference'
        : ['bank_movement', 'investment_movement'].includes(record.category)
          ? 'movement_only'
          : /total|resumen|patrimonio bruto/i.test(record.conceptLabel ?? '')
            ? 'summary'
            : record.category === 'asset' || record.category === 'investment_asset'
              ? 'closing_asset'
              : 'informational',
    included: true,
    exclusionReason: null,
  };
}

function factTrace(fact: DocumentFact): Form210SourceTrace {
  return {
    type: fact.captureMethod === 'manual' ? 'manual_fact' : 'document',
    sourceId: `fact:${fact.id}`,
    recordId: null,
    documentId: fact.documentId,
    factId: fact.id,
    label: fact.originalConcept,
    value: fact.value,
    evidence: fact.evidence || fact.pageOrSection || 'Hecho confirmado por el analista',
    originalValue: fact.amount?.decimalValue ?? fact.extractedValue ?? fact.value,
    originalText: fact.amount?.rawText,
    transformation: fact.amount
      ? `${fact.amount.parsingStrategy}; redondeo al peso: ${fact.amount.decimalValue} → ${fact.value}`
      : null,
    confidence:
      fact.finalConfidence === 'insufficient' ? 'low' : (fact.finalConfidence ?? fact.confidence),
    role:
      fact.category === 'asset' || fact.category === 'investment_asset'
        ? 'closing_asset'
        : fact.category === 'prior_year_balance'
          ? 'prior_year_reference'
          : 'informational',
    included: true,
    exclusionReason: null,
  };
}

function safeSubtract(values: number[]): number {
  return Math.max(
    0,
    values.slice(1).reduce((result, value) => result - value, values[0] ?? 0),
  );
}

/**
 * Aplica el límite conjunto de rentas exentas y deducciones (art. 336 ET) a la
 * casilla objetivo. La regla se toma de `TAX_LIMIT_RULES_2025`; si la casilla
 * no tiene una regla asociada, se devuelve `null` para dejar que la fórmula
 * genérica intente resolver la casilla.
 */
function applyCedularLimit(
  targetBoxNumber: number,
  get: (box: number) => number | null,
): number | null {
  const rule = TAX_LIMIT_RULES_2025.find((entry) => entry.targetBoxNumber === targetBoxNumber);
  if (!rule) return null;
  const inputs: Record<number, number> = {};
  inputs[rule.baseBoxNumber] = get(rule.baseBoxNumber) ?? 0;
  for (const boxNumber of rule.componentBoxNumbers) inputs[boxNumber] = get(boxNumber) ?? 0;
  const hasSomeSignal =
    get(rule.baseBoxNumber) !== null ||
    rule.componentBoxNumbers.some((boxNumber) => get(boxNumber) !== null);
  if (!hasSomeSignal) return null;
  const result = applyLimitRule(rule, inputs, 2025);
  return result.appliedValueCop;
}

function computeFormula(number: number, get: (box: number) => number | null): number | null {
  const formula: Partial<Record<number, () => number | null>> = {
    31: () =>
      get(29) !== null || get(30) !== null ? safeSubtract([get(29) ?? 0, get(30) ?? 0]) : null,
    34: () => (get(32) !== null ? safeSubtract([get(32) ?? 0, get(33) ?? 0]) : null),
    37: () => (get(35) !== null || get(36) !== null ? (get(35) ?? 0) + (get(36) ?? 0) : null),
    40: () => (get(38) !== null || get(39) !== null ? (get(38) ?? 0) + (get(39) ?? 0) : null),
    41: () => applyCedularLimit(41, get),
    42: () =>
      get(34) !== null && get(41) !== null ? safeSubtract([get(34) ?? 0, get(41) ?? 0]) : null,
    61: () => (get(58) !== null ? safeSubtract([get(58) ?? 0, get(59) ?? 0, get(60) ?? 0]) : null),
    65: () => applyCedularLimit(65, get),
    66: () =>
      get(61) !== null && get(65) !== null ? safeSubtract([get(61) ?? 0, get(65) ?? 0]) : null,
    78: () =>
      get(74) !== null
        ? safeSubtract([get(74) ?? 0, get(75) ?? 0, get(76) ?? 0, get(77) ?? 0])
        : null,
    82: () => applyCedularLimit(82, get),
    83: () =>
      get(78) !== null && get(82) !== null ? safeSubtract([get(78) ?? 0, get(82) ?? 0]) : null,
    101: () => (get(99) !== null ? safeSubtract([get(99) ?? 0, get(100) ?? 0]) : null),
    103: () =>
      get(101) !== null && get(102) !== null ? safeSubtract([get(101) ?? 0, get(102) ?? 0]) : null,
    115: () =>
      get(112) !== null ? safeSubtract([get(112) ?? 0, get(113) ?? 0, get(114) ?? 0]) : null,
    91: () =>
      get(34) !== null || get(61) !== null || get(78) !== null
        ? (get(34) ?? 0) + (get(61) ?? 0) + (get(78) ?? 0)
        : null,
    92: () =>
      get(41) !== null || get(65) !== null || get(82) !== null || get(139) !== null || get(141) !== null
        ? (get(41) ?? 0) + (get(65) ?? 0) + (get(82) ?? 0) + (get(139) ?? 0) + (get(141) ?? 0)
        : null,
    93: () =>
      get(91) !== null && get(92) !== null ? safeSubtract([get(91) ?? 0, get(92) ?? 0]) : null,
  };
  return formula[number]?.() ?? null;
}

function validate(
  boxes: readonly Form210BoxValue[],
  input: Form210BuildInput,
  duplicateSourceIds: readonly string[],
  pendingBoxNumbers: ReadonlySet<number>,
): Form210ValidationFinding[] {
  const findings: Form210ValidationFinding[] = [];
  const value = (number: number) =>
    boxes.find((box) => box.number === number)?.confirmedValue ??
    boxes.find((box) => box.number === number)?.suggestedValue ??
    null;
  if (
    value(31) !== null &&
    value(29) !== null &&
    value(30) !== null &&
    value(31) !== Math.max(0, value(29)! - value(30)!)
  ) {
    findings.push({
      id: 'net-worth',
      severity: 'error',
      code: 'inconsistent_net_worth',
      message: 'El patrimonio líquido no coincide con patrimonio bruto menos deudas.',
      boxNumbers: [29, 30, 31],
      sourceIds: [],
    });
  }
  for (const [income, costs] of [
    [112, 113],
    [58, 60],
    [74, 77],
  ] as const) {
    if (value(income) !== null && value(costs) !== null && value(costs)! > value(income)!) {
      findings.push({
        id: `costs-${income}`,
        severity: 'error',
        code: 'costs_exceed_income',
        message: `Los costos de la casilla ${costs} superan los ingresos de la casilla ${income}.`,
        boxNumbers: [income, costs],
        sourceIds: [],
      });
    }
  }
  const withholding = boxes.find((box) => box.number === 132);
  if (
    withholding?.suggestedValue &&
    withholding.sources.every((source) => source.documentId === null)
  ) {
    findings.push({
      id: 'withholding-support',
      severity: 'warning',
      code: 'withholding_without_support',
      message: 'Hay retenciones sugeridas sin un certificado documental relacionado.',
      boxNumbers: [132],
      sourceIds: withholding.includedSourceIds,
    });
  }
  for (const box of boxes.filter((item) =>
    item.sources.some((source) => source.type === 'provisional_source'),
  )) {
    findings.push({
      id: `provisional-${box.number}`,
      severity: 'warning',
      code: 'provisional_source',
      message: `La casilla ${box.number} contiene una fuente aceptada provisionalmente.`,
      boxNumbers: [box.number],
      sourceIds: box.includedSourceIds,
    });
  }
  if (duplicateSourceIds.length) {
    findings.push({
      id: 'possible-double-counting',
      severity: 'warning',
      code: 'double_counting',
      message:
        'Se excluyeron fuentes documentales que podrían duplicar valores exógenos ya incluidos.',
      boxNumbers: boxes
        .filter((box) => box.excludedSourceIds.some((id) => duplicateSourceIds.includes(id)))
        .map((box) => box.number),
      sourceIds: [...duplicateSourceIds],
    });
  }
  for (const box of boxes.filter((item) => item.sources.some((source) => source.value < 0))) {
    findings.push({
      id: `negative-value-${box.number}`,
      severity: 'warning',
      code: 'implausible_value',
      message: `La casilla ${box.number} contiene un valor negativo y requiere confirmar su naturaleza.`,
      boxNumbers: [box.number],
      sourceIds: box.sources.filter((source) => source.value < 0).map((source) => source.sourceId),
    });
  }
  for (const fact of input.facts.filter((item) =>
    ['asset', 'investment_asset', 'liability'].includes(item.category),
  )) {
    if (fact.cutoffDate && !fact.cutoffDate.startsWith('2025-12-31')) {
      findings.push({
        id: `cutoff-${fact.id}`,
        severity: 'warning',
        code: 'wrong_cutoff_date',
        message: 'Un saldo patrimonial no corresponde al corte del 31 de diciembre de 2025.',
        boxNumbers: [fact.category === 'liability' ? 30 : 29],
        sourceIds: [`fact:${fact.id}`],
      });
    }
  }
  for (const fact of input.facts.filter(
    (item) => item.period && /\b20\d{2}\b/.test(item.period) && !item.period.includes('2025'),
  )) {
    findings.push({
      id: `period-${fact.id}`,
      severity: 'warning',
      code: 'incompatible_year',
      message: `El período del hecho “${fact.originalConcept}” no corresponde al año gravable 2025.`,
      boxNumbers: [],
      sourceIds: [`fact:${fact.id}`],
    });
  }
  for (const box of boxes.filter(
    (item) => item.status === 'confirmed' && pendingBoxNumbers.has(item.number),
  )) {
    findings.push({
      id: `confirmed-pending-${box.number}`,
      severity: 'error',
      code: 'confirmed_with_pending_records',
      message: `La casilla ${box.number} fue confirmada aunque conserva registros pendientes.`,
      boxNumbers: [box.number],
      sourceIds: box.excludedSourceIds,
    });
  }

  // Validaciones patrimoniales (art. 261 ET). Se apoyan en el motor puro
  // `patrimony-checks` y solo dependen del estado ya construido del borrador.
  const grossPatrimonyBox = boxes.find((box) => box.number === 29);
  const liabilitiesBox = boxes.find((box) => box.number === 30);
  const grossPatrimonyCop =
    grossPatrimonyBox?.confirmedValue ?? grossPatrimonyBox?.suggestedValue ?? 0;
  const liabilitiesCop = liabilitiesBox?.confirmedValue ?? liabilitiesBox?.suggestedValue ?? 0;

  const liabilityCheck = detectLiabilityWithoutAsset({
    grossPatrimonyCop,
    liabilitiesCop,
  });
  if (liabilityCheck.triggered) {
    findings.push({
      id: 'patrimony-liability-without-asset',
      severity: 'warning',
      code: 'liability_without_asset',
      message:
        'Hay deudas declaradas en la casilla 30 pero el patrimonio bruto (casilla 29) es cero: probablemente falta declarar el activo que respalda la deuda.',
      boxNumbers: [29, 30],
      sourceIds: liabilitiesBox?.includedSourceIds ?? [],
    });
  }

  const movementCategories = new Set<TaxCategory>([
    'bank_movement',
    'card_consumption',
    'investment_movement',
    'purchase',
  ]);
  const movementSources = input.records
    .filter(
      (record) =>
        movementCategories.has(record.category) &&
        record.reportedValue !== null &&
        record.reportedValue > 0,
    )
    .map((record) => ({
      sourceId: `record:${record.id}`,
      label: record.conceptLabel ?? record.conceptCode ?? 'Movimiento',
      valueCop: record.reportedValue ?? 0,
    }));
  const movementCheck = detectMovementWithoutBalance({
    taxYear: 2025,
    grossPatrimonyCop,
    movementSources,
  });
  if (movementCheck.triggered) {
    findings.push({
      id: 'patrimony-movement-without-balance',
      severity: 'warning',
      code: 'movement_without_balance',
      message: `Se declararon movimientos (bancarios, tarjetas o inversiones) por más de ${movementCheck.thresholdCop.toLocaleString('es-CO')} pesos sin patrimonio bruto declarado. Revisa si falta el saldo asociado (art. 261 ET).`,
      boxNumbers: [29],
      sourceIds: [...movementCheck.significantSourceIds],
    });
  }

  const patrimonySources = (grossPatrimonyBox?.sources ?? []).map((source) => ({
    sourceId: source.sourceId,
    label: source.label,
    valueCop: source.value,
  }));
  const duplicatesCheck = detectDuplicatePatrimonyEntries({ sources: patrimonySources });
  for (const pair of duplicatesCheck.pairs) {
    findings.push({
      id: `patrimony-duplicate-${pair.a.sourceId}-${pair.b.sourceId}`,
      severity: 'warning',
      code: 'duplicate_patrimony_entry',
      message: `Dos entradas de patrimonio parecen duplicadas ("${pair.a.label}" y "${pair.b.label}"): verifica si se están contando dos veces.`,
      boxNumbers: [29],
      sourceIds: [pair.a.sourceId, pair.b.sourceId],
    });
  }

  return findings;
}

/**
 * Asigna informativamente el valor de una casilla estructural (Fase B0,
 * Sprint 2.4) usando un valor YA calculado por un motor probado en otra
 * parte del builder. Solo actúa sobre casillas que no tienen fórmula propia
 * (`structuralBox` en `ruleset-2025.ts`, `formula: null`) y por tanto nunca
 * pisa un valor derivado por `computeFormula`. No modifica ninguna casilla
 * verificada existente.
 */
function attachInformationalBoxValue(
  boxes: Form210BoxValue[],
  boxNumber: number,
  value: number | null,
  trace: Pick<Form210SourceTrace, 'sourceId' | 'label' | 'evidence'>,
): void {
  if (value === null) return;
  const index = boxes.findIndex((box) => box.number === boxNumber);
  if (index === -1) return;
  const target = boxes[index];
  if (!target) return;
  if (target.confirmedValue !== null || target.status === 'not_applicable') return;
  const source: Form210SourceTrace = {
    type: 'calculation',
    sourceId: trace.sourceId,
    recordId: null,
    documentId: null,
    factId: null,
    label: trace.label,
    value,
    evidence: trace.evidence,
  };
  boxes[index] = {
    ...target,
    suggestedValue: value,
    confirmedValue: target.confirmedValue,
    sources: [source],
    includedSourceIds: [source.sourceId],
    status: value === 0 ? 'confirmed_zero' : 'calculated',
    confidence: 'medium',
  };
}

/**
 * Deriva la liquidación privada preliminar del borrador. La numeración de las
 * casillas de impuesto y saldo (91-93, 111, 116…) que todavía NO se cablea
 * NO se afirma aquí porque varía entre versiones del formulario y aún no ha
 * sido verificada contra el instructivo DIAN 2025. Los importes viven en el
 * objeto de liquidación con fórmula y fuente propias; las casillas 126, 127,
 * 129, 133 y 137 se cablean informativamente en `buildForm210Draft` (Fase B0)
 * con estado `implemented_unverified`/`requires_review` en el catálogo hasta
 * que la numeración se confirme contra el instructivo oficial.
 */
export function computePreliminaryLiquidation(
  boxes: readonly Form210BoxValue[],
  ruleVersion: string,
  generatedAt: string,
  occasionalGainsBreakdown?: {
    generalBaseCop: number;
    lotteryBaseCop: number;
  },
  advancePaymentContext?: {
    filingCountIncludingCurrent: 1 | 2 | 3;
    priorNetIncomeTaxCop: number | null;
  },
  dependentsDeduction: Form210PreliminaryLiquidation['dependentsDeduction'] = null,
  electronicInvoicingDeduction: Form210PreliminaryLiquidation['electronicInvoicingDeduction'] = null,
  individualDeductionLimits: Form210PreliminaryLiquidation['individualDeductionLimits'] = [],
  priorYearBalanceContext?: {
    declaredCop: number;
    confirmedByAnalyst: boolean;
    hasPendingCompensationOrRefundRequest: boolean;
    priorYearFilingDate?: string | null;
    evidence?: string | null;
  },
  withholdings: Form210PreliminaryLiquidation['withholdings'] | null = null,
  dependentsAdditionalDeduction: Form210PreliminaryLiquidation['dependentsAdditionalDeduction'] = null,
): Form210PreliminaryLiquidation {
  const get = (number: number): number | null => {
    const box = boxes.find((entry) => entry.number === number);
    return box?.confirmedValue ?? box?.suggestedValue ?? null;
  };
  const findLimit = (targetBox: number) => {
    const rule = TAX_LIMIT_RULES_2025.find((entry) => entry.targetBoxNumber === targetBox);
    if (!rule) return null;
    const inputs: Record<number, number> = {};
    inputs[rule.baseBoxNumber] = get(rule.baseBoxNumber) ?? 0;
    for (const boxNumber of rule.componentBoxNumbers) inputs[boxNumber] = get(boxNumber) ?? 0;
    const hasSignal =
      get(rule.baseBoxNumber) !== null ||
      rule.componentBoxNumbers.some((boxNumber) => get(boxNumber) !== null);
    return hasSignal ? applyLimitRule(rule, inputs, 2025) : null;
  };

  const employmentLimit = findLimit(41);
  const capitalLimit = findLimit(65);
  const nonLaborLimit = findLimit(82);

  // Renta líquida gravable de la cédula general = suma de rentas líquidas
  // ordinarias de trabajo (42), capital (66) y no laboral (83).
  const cedularParts: readonly (number | null)[] = [get(42), get(66), get(83)];
  const anyCedularSignal = cedularParts.some((part) => part !== null);
  let generalCedularTaxableIncomeCop = 0;
  for (const part of cedularParts) generalCedularTaxableIncomeCop += Math.max(0, part ?? 0);
  const generalCedularTaxableIncomeUvt = copToUvt(generalCedularTaxableIncomeCop, 2025);

  const incomeTax = anyCedularSignal
    ? computeProgressiveIncomeTax(generalCedularTaxableIncomeCop, 2025)
    : null;

  // Ganancias ocasionales gravables: base disponible desde la casilla 115.
  const occasionalGainsTaxableCop = Math.max(0, get(115) ?? 0);

  // Impuesto de GO: si el analista provee el desglose entre general y
  // loterías, cada componente aplica su tarifa (art. 314 / 317 ET). Si no lo
  // provee, se asume que toda la casilla 115 tributa a la tarifa general y se
  // emite una advertencia — es la interpretación más conservadora dado que la
  // 20 % es mayor y podría subestimar el impuesto.
  const providedBreakdown = occasionalGainsBreakdown ?? null;
  const generalGoBase = providedBreakdown
    ? Math.max(0, providedBreakdown.generalBaseCop)
    : occasionalGainsTaxableCop;
  const lotteryGoBase = providedBreakdown ? Math.max(0, providedBreakdown.lotteryBaseCop) : 0;
  const occasionalGainsTax =
    generalGoBase + lotteryGoBase > 0
      ? computeOccasionalGainsTax({
          taxYear: 2025,
          generalBaseCop: generalGoBase,
          lotteryBaseCop: lotteryGoBase,
        })
      : null;

  const priorYearAdvanceCop = Math.max(0, get(130) ?? 0);
  const withholdingsConsolidation =
    withholdings ??
    consolidateWithholdings({
      taxYear: 2025,
      sources: [],
    });
  const withholdingsCop = withholdingsConsolidation.totalReportedCop;

  const totalTaxDueCop =
    (incomeTax?.totalTaxCopRounded ?? 0) + (occasionalGainsTax?.totalTaxCop ?? 0);

  // Anticipo del año siguiente (art. 807 ET). Se calcula solo si el analista
  // aporta el contexto (número de veces que declara e histórico) y si el
  // impuesto neto de renta es positivo. El impuesto neto usado como base es
  // `incomeTax.totalTaxCopRounded`: el motor puro NO conoce descuentos
  // tributarios porque aún no se modelan.
  const currentNetIncomeTaxCop = incomeTax?.totalTaxCopRounded ?? 0;
  const nextYearAdvance =
    advancePaymentContext && currentNetIncomeTaxCop > 0
      ? computeAdvancePayment({
          taxYear: 2025,
          filingCountIncludingCurrent: advancePaymentContext.filingCountIncludingCurrent,
          currentNetIncomeTaxCop,
          priorNetIncomeTaxCop: advancePaymentContext.priorNetIncomeTaxCop,
          withholdingsCop,
        })
      : null;

  // Saldo a favor del año anterior (art. 850 ET). Se descuenta solo cuando
  // el analista lo confirma y no tiene solicitud de devolución/compensación
  // pendiente. Sin contexto, se ignora la casilla 131 en el descuento.
  const priorYearBalance = priorYearBalanceContext
    ? evaluatePriorYearBalance({
        taxYear: 2025,
        declaredCop: priorYearBalanceContext.declaredCop,
        confirmedByAnalyst: priorYearBalanceContext.confirmedByAnalyst,
        hasPendingCompensationOrRefundRequest:
          priorYearBalanceContext.hasPendingCompensationOrRefundRequest,
        priorYearFilingDate: priorYearBalanceContext.priorYearFilingDate ?? null,
        evidence: priorYearBalanceContext.evidence ?? null,
      })
    : null;
  const priorYearBalanceCop = priorYearBalance?.appliedCop ?? 0;

  const netBalanceCop =
    totalTaxDueCop +
    (nextYearAdvance?.netAdvanceCop ?? 0) -
    priorYearAdvanceCop -
    priorYearBalanceCop -
    withholdingsCop;

  const warnings: string[] = [];
  if (!incomeTax) {
    warnings.push('No hay renta líquida cedular suficiente para calcular el impuesto progresivo.');
  }
  if (occasionalGainsTaxableCop > 0 && !providedBreakdown) {
    warnings.push(
      'Se asumió que toda la casilla 115 tributa al 15 % (art. 314 ET). Si hay loterías, rifas o apuestas, indícalo para aplicar la tarifa del 20 % (art. 317 ET).',
    );
  }
  if (
    providedBreakdown &&
    providedBreakdown.generalBaseCop + providedBreakdown.lotteryBaseCop !==
      occasionalGainsTaxableCop
  ) {
    warnings.push(
      'El desglose de ganancias ocasionales por tarifa no coincide con la casilla 115. Verifica las bases.',
    );
  }
  if (get(130) === null && get(131) === null && get(132) === null && incomeTax) {
    warnings.push(
      'No hay retenciones ni anticipo ni saldo anterior confirmados; el saldo puede subir al incorporarlos.',
    );
  }
  if (incomeTax && !advancePaymentContext) {
    warnings.push(
      'El anticipo del año siguiente (art. 807 ET) no se calculó porque falta indicar cuántas veces has declarado.',
    );
  }
  if (
    dependentsDeduction &&
    dependentsDeduction.dependentsEligibleCount > 0 &&
    dependentsDeduction.appliedDeductionCop === 0
  ) {
    warnings.push(
      'Los dependientes declarados no producen deducción: la casilla 32 no tiene ingresos brutos de rentas de trabajo aún.',
    );
  }
  if (priorYearBalance && priorYearBalance.status === 'pending_confirmation') {
    warnings.push(
      'El saldo a favor del año anterior está declarado pero no confirmado por el analista: no se descuenta hasta que se confirme (art. 850 ET).',
    );
  }
  if (priorYearBalance && priorYearBalance.status === 'blocked_by_pending_request') {
    warnings.push(
      'El saldo a favor del año anterior tiene una solicitud de devolución o compensación pendiente; no puede volver a aplicarse aquí (art. 850 ET).',
    );
  }
  if (!priorYearBalance && get(131) !== null && (get(131) ?? 0) > 0) {
    warnings.push(
      'La casilla 131 tiene un valor de saldo anterior pero no se aportó el contexto de confirmación humana; el motor no lo descuenta hasta que se confirme (art. 850 ET).',
    );
  }
  if (withholdingsConsolidation.entriesWithoutSupportCount > 0) {
    warnings.push(
      `${withholdingsConsolidation.entriesWithoutSupportCount} retenciones no tienen certificado documental asociado; adjunta el soporte antes de confirmar la casilla 132 (art. 373 ET).`,
    );
  }
  for (const pair of withholdingsConsolidation.suspectedDuplicates) {
    warnings.push(
      `Posible doble conteo en retenciones: "${pair.a.label}" y "${pair.b.label}" comparten retenedor y valor similar (${pair.reason}).`,
    );
  }
  if (
    withholdingsConsolidation.breakdown !== null &&
    !withholdingsConsolidation.breakdownMatchesReported
  ) {
    warnings.push(
      `El desglose de retenciones por origen no coincide con las retenciones reportadas (diferencia ${withholdingsConsolidation.breakdownDifferenceCop.toLocaleString('es-CO')} pesos). Verifica los montos por cédula.`,
    );
  }

  let status: Form210PreliminaryLiquidation['status'];
  if (!anyCedularSignal && occasionalGainsTaxableCop === 0 && totalTaxDueCop === 0) {
    status = 'insufficient_data';
  } else if (netBalanceCop > 0) status = 'to_pay';
  else if (netBalanceCop < 0) status = 'refund';
  else status = 'zero';

  return {
    ruleVersion,
    generatedAt,
    generalCedularTaxableIncomeCop,
    generalCedularTaxableIncomeUvt,
    employmentLimit,
    capitalLimit,
    nonLaborLimit,
    incomeTax,
    occasionalGainsTaxableCop,
    occasionalGainsTax,
    totalTaxDueCop,
    priorYearAdvanceCop,
    priorYearBalanceCop,
    withholdingsCop,
    nextYearAdvance,
    dependentsDeduction,
    dependentsAdditionalDeduction,
    electronicInvoicingDeduction,
    individualDeductionLimits,
    priorYearBalance,
    withholdings: withholdingsConsolidation,
    netBalanceCop,
    status,
    warnings,
    notice: 'Liquidación preliminar orientativa — no presentada ante la DIAN',
  };
}

// Sanity check: la UVT usada por copToUvt corresponde al año modelado.
if (TAX_UNIT_2025.taxYear !== 2025) {
  throw new Error('TAX_UNIT_2025.taxYear debe ser 2025.');
}

export function buildForm210Draft(input: Form210BuildInput): Form210Draft {
  if (input.taxYear !== 2025)
    throw new Error('El ruleset disponible solo corresponde al año gravable 2025.');
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const sourcesByBox = new Map<number, Form210SourceTrace[]>();
  const excludedByBox = new Map<number, string[]>();
  const excludedSourcesByBox = new Map<number, Form210SourceTrace[]>();
  const pendingBoxNumbers = new Set<number>();
  const moneyReviewByBox = new Map<number, string[]>();
  const duplicateSourceIds: string[] = [];
  const stateByRecord = new Map(input.recordStates?.map((state) => [state.recordId, state]));
  const provisional = new Set(input.provisionalRecordIds ?? []);
  const documentReplacedRecordIds = new Set(
    (input.reconciliations ?? [])
      .filter(
        (item) => ['reconciled', 'minor_difference'].includes(item.status) && item.confirmedByHuman,
      )
      .flatMap((item) => item.exogenousRecordIds),
  );

  for (const record of input.records) {
    const state = stateByRecord.get(record.id);
    const category = state?.category ?? record.category;
    const boxNumber = CATEGORY_BOX[category];
    if (!boxNumber || record.reportedValue === null) continue;
    const trace = recordTrace(record, record.reportedValue, provisional.has(record.id));
    if (documentReplacedRecordIds.has(record.id)) {
      excludedByBox.set(boxNumber, [...(excludedByBox.get(boxNumber) ?? []), trace.sourceId]);
      excludedSourcesByBox.set(boxNumber, [
        ...(excludedSourcesByBox.get(boxNumber) ?? []),
        {
          ...trace,
          included: false,
          role: 'document_replacement',
          exclusionReason:
            'La conciliación humana confirmó un hecho documental como fuente de reemplazo; se evita el doble conteo.',
        },
      ]);
      continue;
    }
    if (state && state.disposition !== 'included') {
      excludedByBox.set(boxNumber, [...(excludedByBox.get(boxNumber) ?? []), trace.sourceId]);
      excludedSourcesByBox.set(boxNumber, [
        ...(excludedSourcesByBox.get(boxNumber) ?? []),
        {
          ...trace,
          included: false,
          role: state.disposition === 'pending' ? 'pending' : trace.role,
          exclusionReason: `Disposición del análisis: ${state.disposition}.`,
        },
      ]);
      if (state.disposition === 'pending') pendingBoxNumbers.add(boxNumber);
      continue;
    }
    sourcesByBox.set(boxNumber, [...(sourcesByBox.get(boxNumber) ?? []), trace]);
  }

  for (const fact of input.facts.filter((item) =>
    ['reviewed', 'confirmed'].includes(item.reviewStatus),
  )) {
    const boxNumber = CATEGORY_BOX[fact.category];
    if (!boxNumber) continue;
    const trace = factTrace(fact);
    const moneyWarnings = fact.amount?.warnings ?? [];
    if (
      fact.moneyParserVersion === 'legacy' ||
      fact.amount?.confidence === 'low' ||
      moneyWarnings.length > 0
    ) {
      moneyReviewByBox.set(boxNumber, [
        ...(moneyReviewByBox.get(boxNumber) ?? []),
        ...(moneyWarnings.length
          ? moneyWarnings
          : ['La fuente fue generada con una versión monetaria anterior y requiere reanálisis.']),
      ]);
    }
    const duplicate = (sourcesByBox.get(boxNumber) ?? []).some(
      (source) =>
        source.value === trace.value &&
        source.label.toLocaleLowerCase('es').includes(trace.label.toLocaleLowerCase('es')),
    );
    if (duplicate) {
      excludedByBox.set(boxNumber, [...(excludedByBox.get(boxNumber) ?? []), trace.sourceId]);
      excludedSourcesByBox.set(boxNumber, [
        ...(excludedSourcesByBox.get(boxNumber) ?? []),
        {
          ...trace,
          included: false,
          role: 'potential_duplicate',
          exclusionReason: 'Posible duplicado de una fuente exógena ya incluida.',
        },
      ]);
      duplicateSourceIds.push(trace.sourceId);
    } else sourcesByBox.set(boxNumber, [...(sourcesByBox.get(boxNumber) ?? []), trace]);
  }

  // Deducción por dependientes (art. 387 ET): se calcula con el motor puro
  // usando los ingresos brutos de rentas de trabajo (casilla 32 = suma de
  // sources reunidas hasta aquí) y se cablea a la casilla 39 como una fuente
  // de tipo `calculation`. La misma computación se expondrá luego en
  // `preliminaryLiquidation.dependentsDeduction`.
  const dependentsInput = input.dependents ?? [];
  const grossEmploymentIncomeCop = (sourcesByBox.get(32) ?? []).reduce(
    (sum, source) => sum + source.value,
    0,
  );
  const dependentsDeduction = dependentsInput.length
    ? computeDependentsDeduction({
        taxYear: 2025,
        dependents: dependentsInput,
        grossEmploymentIncomeCop,
      })
    : null;
  if (dependentsDeduction && dependentsDeduction.appliedDeductionCop > 0) {
    const label =
      dependentsDeduction.dependentsEligibleCount === 1
        ? 'Deducción por dependientes (art. 387 ET)'
        : `Deducción por ${dependentsDeduction.dependentsEligibleCount} dependientes (art. 387 ET)`;
    const dependentsTrace: Form210SourceTrace = {
      type: 'calculation',
      sourceId: 'calc:dependents-387',
      recordId: null,
      documentId: null,
      factId: null,
      label,
      value: dependentsDeduction.appliedDeductionCop,
      evidence: dependentsDeduction.formula,
    };
    sourcesByBox.set(39, [...(sourcesByBox.get(39) ?? []), dependentsTrace]);
  }

  // Adición por dependientes (72 UVT, art. 336 num. 3 ET). Independiente del
  // art. 387: recibe candidatos YA resueltos por elegibilidad y coexistencia
  // (fuera de este builder); solo aplica el tope de cuatro y multiplica por
  // 72 UVT. R138 (conteo) y R139 (valor) se cablean como fuentes propias —
  // R139 NUNCA se agrega a la casilla 39: es un componente de R92 (fórmula
  // 92 = 41 + 65 + 82 + 139 en `computeFormula`).
  const dependentsAdditionalInput = input.dependentsAdditional ?? [];
  const dependentsAdditionalDeduction = dependentsAdditionalInput.length
    ? computeDependentsAdditionalDeduction({ taxYear: 2025, dependents: dependentsAdditionalInput })
    : null;
  if (dependentsAdditionalDeduction) {
    sourcesByBox.set(138, [
      {
        type: 'calculation',
        sourceId: 'calc:dependents-additional-336-count',
        recordId: null,
        documentId: null,
        factId: null,
        label: 'Número de dependientes económicos confirmados (adición 72 UVT)',
        value: dependentsAdditionalDeduction.dependentsAppliedCount,
        evidence: `${dependentsAdditionalDeduction.dependentsAppliedCount} dependiente(s) confirmado(s) de ${dependentsAdditionalDeduction.dependentsEligibleCount} elegible(s)`,
      },
    ]);
    if (dependentsAdditionalDeduction.totalCop > 0) {
      sourcesByBox.set(139, [
        {
          type: 'calculation',
          sourceId: 'calc:dependents-additional-336',
          recordId: null,
          documentId: null,
          factId: null,
          label: 'Adición por dependientes (72 UVT, art. 336 num. 3 ET)',
          value: dependentsAdditionalDeduction.totalCop,
          evidence: dependentsAdditionalDeduction.formula,
        },
      ]);
    }
  }

  // Deducción por facturas electrónicas (art. 336-1 ET). El motor recibe la
  // base de compras calificadas que aporta el analista y aplica 1 % con
  // tope de 240 UVT.
  //
  // CORRECCIÓN NORMATIVA (Sprint 2.4, Fase D): el Decreto 2231 de 2023
  // (que sustituye el numeral 5 del art. 336 ET) establece textualmente que
  // "la deducción de que trata el presente numeral NO SE ENCUENTRA SUJETA
  // AL LÍMITE previsto en el numeral 3 del presente artículo" — el mismo
  // límite del 40 %/1.340 UVT que gobierna las casillas 41/65/82. La
  // implementación anterior (Fase B0) cableaba esta deducción a la casilla
  // 39 (componente de 37+40), que SÍ entra al candidato "componente" del
  // límite conjunto en la casilla 41 — violando esa exención igual que el
  // bug ya corregido para R139 (72 UVT por dependiente) en la Fase C. Se
  // cablea ahora, análogamente a R138/R139, como componente de R92 (fuera
  // del límite): R140 = base de compras calificadas (informativo), R141 =
  // deducción aplicada (componente de la fórmula 92 = 41+65+82+139+141 en
  // `computeFormula`). R141 NUNCA se agrega a la casilla 39.
  const electronicInvoicingInput = input.electronicInvoicing;
  const electronicInvoicingDeduction =
    electronicInvoicingInput && electronicInvoicingInput.purchasesWithElectronicInvoiceCop > 0
      ? computeElectronicInvoicingDeduction({
          taxYear: 2025,
          purchasesWithElectronicInvoiceCop:
            electronicInvoicingInput.purchasesWithElectronicInvoiceCop,
        })
      : null;
  if (electronicInvoicingDeduction) {
    sourcesByBox.set(140, [
      {
        type: 'calculation',
        sourceId: 'calc:electronic-invoicing-336-1-base',
        recordId: null,
        documentId: null,
        factId: null,
        label: 'Valor de compras con derecho a la deducción por facturación electrónica',
        value: electronicInvoicingDeduction.purchasesBaseCop,
        evidence: `Base declarada por el analista (art. 336-1 ET): ${electronicInvoicingDeduction.purchasesBaseCop.toLocaleString('es-CO')} pesos.`,
      },
    ]);
    if (electronicInvoicingDeduction.appliedDeductionCop > 0) {
      sourcesByBox.set(141, [
        {
          type: 'calculation',
          sourceId: 'calc:electronic-invoicing-336-1',
          recordId: null,
          documentId: null,
          factId: null,
          label: 'Deducción por facturas electrónicas (art. 336-1 ET)',
          value: electronicInvoicingDeduction.appliedDeductionCop,
          evidence: electronicInvoicingDeduction.formula,
        },
      ]);
    }
  }

  // Límites individuales declarativos (Fase E): AFC/AVC/FVP (art. 126-1/126-4),
  // intereses de vivienda (art. 119) y medicina prepagada (art. 387 par. 2).
  // El motor puro recibe el declarado y — cuando aplica — el ingreso base
  // de trabajo. Cada resultado se acumula en `individualDeductionLimits`
  // y se cablea a su casilla objetivo como fuente `calculation`.
  const individualDeductionLimits: IndividualDeductionLimitComputation[] = [];
  const declaredDeductions = input.individualDeductions;
  if (declaredDeductions) {
    const specs: readonly {
      rule: typeof AFC_FVP_AVC_LIMIT_RULE_2025;
      declaredCop: number | undefined;
      sourceId: string;
      label: string;
    }[] = [
      {
        rule: AFC_FVP_AVC_LIMIT_RULE_2025,
        declaredCop: declaredDeductions.afcFvpAvcCop,
        sourceId: 'calc:afc-fvp-avc-126',
        label: 'Aportes AFC/AVC/FVP limitados (arts. 126-1 y 126-4 ET)',
      },
      {
        rule: HOUSING_INTEREST_LIMIT_RULE_2025,
        declaredCop: declaredDeductions.housingInterestCop,
        sourceId: 'calc:housing-interest-119',
        label: 'Intereses de vivienda limitados (art. 119 ET)',
      },
      {
        rule: PREPAID_MEDICINE_LIMIT_RULE_2025,
        declaredCop: declaredDeductions.prepaidMedicineCop,
        sourceId: 'calc:prepaid-medicine-387',
        label: 'Medicina prepagada limitada (art. 387 ET, par. 2)',
      },
    ];
    for (const spec of specs) {
      if (spec.declaredCop === undefined || spec.declaredCop <= 0) continue;
      const computation = applyIndividualDeductionLimit(spec.rule, {
        taxYear: 2025,
        declaredCop: spec.declaredCop,
        baseIncomeCop: spec.rule.baseIncomeRequired ? grossEmploymentIncomeCop : null,
      });
      individualDeductionLimits.push(computation);
      if (computation.appliedCop > 0) {
        const trace: Form210SourceTrace = {
          type: 'calculation',
          sourceId: spec.sourceId,
          recordId: null,
          documentId: null,
          factId: null,
          label: spec.label,
          value: computation.appliedCop,
          evidence: computation.formula,
        };
        sourcesByBox.set(spec.rule.targetBoxNumber, [
          ...(sourcesByBox.get(spec.rule.targetBoxNumber) ?? []),
          trace,
        ]);
      }
    }
  }

  const replacedIds = new Set(
    (input.resolutions ?? [])
      .map((item) => item.replacesDecisionId)
      .filter((id): id is string => Boolean(id)),
  );
  const adjustmentByBox = new Map<number, TaxResolutionDecision>();
  const stateOverrideByBox = new Map<number, TaxResolutionDecision>();
  for (const decision of [...(input.resolutions ?? [])].sort((a, b) =>
    a.decidedAt.localeCompare(b.decidedAt),
  )) {
    if (decision.objectType !== 'form_box' || replacedIds.has(decision.id)) continue;
    const number = Number(decision.objectId);
    if (decision.type === 'restore_automatic_value') {
      adjustmentByBox.delete(number);
      stateOverrideByBox.delete(number);
    } else if (decision.type === 'adjust_form_box') adjustmentByBox.set(number, decision);
    else if (decision.type === 'mark_not_applicable' || decision.type === 'confirm_zero')
      stateOverrideByBox.set(number, decision);
  }

  const boxes: Form210BoxValue[] = FORM_210_RULESET_2025.boxes.map((definition) => {
    const sources = sourcesByBox.get(definition.number) ?? [];
    const suggestedValue = sources.length
      ? sources.reduce((sum, source) => sum + source.value, 0)
      : null;
    const adjustment = adjustmentByBox.get(definition.number);
    const stateOverride = stateOverrideByBox.get(definition.number);
    const markedNotApplicable = stateOverride?.type === 'mark_not_applicable';
    const hasProvisionalSource = sources.some((source) => source.type === 'provisional_source');
    const moneyWarnings = moneyReviewByBox.get(definition.number) ?? [];
    return {
      ...definition,
      suggestedValue: markedNotApplicable ? null : suggestedValue,
      confirmedValue: stateOverride?.type === 'confirm_zero' ? 0 : (adjustment?.finalValue ?? null),
      sources: markedNotApplicable ? [] : sources,
      includedSourceIds: markedNotApplicable ? [] : sources.map((source) => source.sourceId),
      excludedSourceIds: [
        ...(excludedByBox.get(definition.number) ?? []),
        ...(markedNotApplicable ? sources.map((source) => source.sourceId) : []),
      ],
      excludedSources: [
        ...(excludedSourcesByBox.get(definition.number) ?? []),
        ...(markedNotApplicable
          ? sources.map((source) => ({
              ...source,
              included: false,
              exclusionReason: 'El analista marcó la casilla como no aplicable.',
            }))
          : []),
      ],
      confidence: hasProvisionalSource ? 'low' : sources.length ? 'medium' : 'low',
      status:
        stateOverride?.type === 'mark_not_applicable'
          ? 'not_applicable'
          : stateOverride?.type === 'confirm_zero'
            ? 'confirmed_zero'
            : adjustment
              ? 'confirmed'
              : suggestedValue === null
                ? 'no_data'
                : moneyWarnings.length
                  ? 'requires_review'
                  : hasProvisionalSource
                    ? 'provisional'
                    : definition.ruleComplete
                      ? 'suggested'
                      : 'incomplete',
      warnings: definition.ruleComplete
        ? moneyWarnings
        : [
            'La regla completa de esta casilla todavía no está incorporada; no se calcula automáticamente.',
            ...moneyWarnings,
          ],
      resolutionId: stateOverride?.id ?? adjustment?.id ?? null,
      ruleVersion: FORM_210_RULESET_2025.ruleVersion,
    };
  });

  const getValue = (number: number) => {
    const target = boxes.find((box) => box.number === number);
    if (target?.status === 'not_applicable') return 0;
    return target?.confirmedValue ?? target?.suggestedValue ?? null;
  };
  for (const box of boxes.filter((item) => item.formula && item.ruleComplete)) {
    if (box.confirmedValue !== null) continue;
    const calculated = computeFormula(box.number, getValue);
    if (calculated !== null) {
      const dependencyNeedsReview = box.dependencies.some((dependency) =>
        ['requires_review', 'provisional', 'blocked'].includes(
          boxes.find((candidate) => candidate.number === dependency)?.status ?? 'no_data',
        ),
      );
      box.suggestedValue = calculated;
      box.status = dependencyNeedsReview ? 'requires_review' : 'calculated';
      box.confidence = dependencyNeedsReview ? 'low' : 'high';
      if (dependencyNeedsReview) {
        box.warnings.push(
          'La fórmula depende de una casilla cuya fuente monetaria requiere revisión.',
        );
      }
      box.sources = box.dependencies.map((dependency) => ({
        type: 'calculation',
        sourceId: `box:${dependency}`,
        recordId: null,
        documentId: null,
        factId: null,
        label: `Casilla ${dependency}`,
        value: getValue(dependency) ?? 0,
        evidence: box.formula ?? 'Fórmula versionada',
      }));
      box.includedSourceIds = box.sources.map((source) => source.sourceId);
    }
  }

  const findings = validate(boxes, input, duplicateSourceIds, pendingBoxNumbers);
  for (const [boxNumber, warnings] of moneyReviewByBox) {
    findings.push({
      id: `money-review-${boxNumber}`,
      severity: 'error',
      code: 'monetary_parse_low_confidence',
      message: `La casilla ${boxNumber} contiene una fuente monetaria que debe reanalizarse: ${warnings.join(' ')}`,
      boxNumbers: [boxNumber],
      sourceIds: (sourcesByBox.get(boxNumber) ?? []).map((source) => source.sourceId),
    });
  }
  for (const computation of individualDeductionLimits) {
    if (computation.bindingCandidate === 'declared') continue;
    findings.push({
      id: `individual-limit-${computation.ruleId}`,
      severity: 'warning',
      code: 'unsupported_deduction',
      message: `La deducción declarada excede el límite del ruleset (${computation.formula}). Aplicado: ${computation.appliedCop.toLocaleString('es-CO')} pesos.`,
      boxNumbers: [computation.targetBoxNumber],
      sourceIds: [],
    });
  }
  const pendingBoxes = boxes.filter((box) =>
    ['incomplete', 'requires_decision', 'contradicted', 'requires_review', 'blocked'].includes(
      box.status,
    ),
  ).length;
  const blockers = findings.filter((finding) => finding.severity === 'error').length;
  const populated = boxes.filter(
    (box) => box.suggestedValue !== null || box.confirmedValue !== null,
  ).length;
  const withholdingRecords = input.records.filter(
    (record) => record.category === 'withholding' && record.reportedValue !== null,
  );
  const includedWithholdings = withholdingRecords.filter((record) => {
    const state = stateByRecord.get(record.id);
    return !state || state.disposition === 'included';
  });
  const withholdingSources: WithholdingSource[] = includedWithholdings.map((record) => ({
    sourceId: `record:${record.id}`,
    label: record.conceptLabel ?? record.conceptCode ?? 'Retención',
    valueCop: record.reportedValue ?? 0,
    entityTaxId: record.entityTaxId ?? null,
    hasDocumentSupport: false,
  }));
  // Si la casilla 132 tiene valor por un ajuste manual o por otro medio
  // (no por records de category='withholding'), agregamos una fuente
  // sintética por la diferencia para no perder el total declarado.
  const box132 = boxes.find((box) => box.number === 132);
  const box132Value = box132?.confirmedValue ?? box132?.suggestedValue ?? 0;
  const recordsSum = withholdingSources.reduce((sum, source) => sum + source.valueCop, 0);
  const boxOnlyDelta = Math.max(0, box132Value - recordsSum);
  if (boxOnlyDelta > 0) {
    withholdingSources.push({
      sourceId: 'box:132:manual',
      label: 'Retenciones de casilla 132 (fuente manual)',
      valueCop: boxOnlyDelta,
      entityTaxId: null,
      hasDocumentSupport: false,
    });
  }
  const withholdingsConsolidation = consolidateWithholdings({
    taxYear: 2025,
    sources: withholdingSources,
    breakdown: input.withholdingsBreakdown,
  });

  const preliminaryLiquidation = computePreliminaryLiquidation(
    boxes,
    FORM_210_RULESET_2025.ruleVersion,
    generatedAt,
    input.occasionalGainsBreakdown,
    input.advancePaymentContext,
    dependentsDeduction,
    electronicInvoicingDeduction,
    individualDeductionLimits,
    input.priorYearBalance,
    withholdingsConsolidation,
    dependentsAdditionalDeduction,
  );

  // Fase B0 (Sprint 2.4): cablear informativamente las casillas 126, 127,
  // 129, 133 y 137 con valores YA calculados por motores probados. No se
  // toca ninguna casilla existente ni se cambia `totalTaxDueCop`/
  // `netBalanceCop`: solo se les asigna la numeración de casilla propuesta
  // (marcada `implemented_unverified`/`requires_review` en el catálogo
  // porque esa numeración no está confirmada contra el instructivo oficial).
  // Se omiten por completo cuando la liquidación no tiene datos suficientes
  // (evita marcar "confirmado en cero" un expediente vacío).
  if (preliminaryLiquidation.status !== 'insufficient_data') {
    attachInformationalBoxValue(
      boxes,
      126,
      preliminaryLiquidation.incomeTax?.totalTaxCopRounded ?? null,
      {
        sourceId: 'calc:income-tax-241',
        label: 'Impuesto de renta líquida gravable (art. 241 ET)',
        evidence: preliminaryLiquidation.incomeTax?.formula ?? 'Tarifa progresiva art. 241 ET',
      },
    );
    attachInformationalBoxValue(
      boxes,
      127,
      preliminaryLiquidation.occasionalGainsTax?.totalTaxCop ?? null,
      {
        sourceId: 'calc:occasional-gains-tax',
        label: 'Impuesto de ganancias ocasionales',
        evidence: preliminaryLiquidation.occasionalGainsTax?.formula ?? 'Arts. 314 y 317 ET',
      },
    );
    attachInformationalBoxValue(boxes, 129, preliminaryLiquidation.totalTaxDueCop, {
      sourceId: 'calc:total-tax-due',
      label: 'Total impuesto a cargo (renta + ganancias ocasionales)',
      evidence: 'Casilla 126 + casilla 127',
    });
    attachInformationalBoxValue(
      boxes,
      133,
      preliminaryLiquidation.nextYearAdvance?.netAdvanceCop ?? null,
      {
        sourceId: 'calc:next-year-advance-807',
        label: 'Anticipo de renta por el año gravable siguiente (art. 807 ET)',
        evidence: preliminaryLiquidation.nextYearAdvance?.formula ?? 'Art. 807 ET',
      },
    );
    const refundValue =
      preliminaryLiquidation.netBalanceCop < 0 ? -preliminaryLiquidation.netBalanceCop : 0;
    attachInformationalBoxValue(boxes, 137, refundValue, {
      sourceId: 'calc:refund-balance',
      label: 'Saldo a favor',
      evidence: 'Casillas 126 + 127 + 133 − 130 − 131 − 132, cuando el resultado es negativo',
    });
  }

  // Validaciones cruzadas (Fase T): red de seguridad que compara
  // indicadores agregados una vez que la liquidación está resuelta.
  const readBox = (number: number) => {
    const box = boxes.find((entry) => entry.number === number);
    return box?.confirmedValue ?? box?.suggestedValue ?? 0;
  };
  const totalGrossIncomeCop =
    Math.max(0, readBox(32)) +
    Math.max(0, readBox(58)) +
    Math.max(0, readBox(74)) +
    Math.max(0, readBox(99)) +
    Math.max(0, readBox(104)) +
    Math.max(0, readBox(112));
  const computedCedular =
    Math.max(0, readBox(42)) + Math.max(0, readBox(66)) + Math.max(0, readBox(83));
  const crossValidations = evaluateCrossValidations({
    taxYear: 2025,
    incomeTaxCop: preliminaryLiquidation.incomeTax?.totalTaxCopRounded ?? 0,
    withholdingsAppliedCop: preliminaryLiquidation.withholdingsCop,
    grossPatrimonyCop: readBox(29),
    totalGrossIncomeCop,
    reportedCedularTaxableIncomeCop: preliminaryLiquidation.generalCedularTaxableIncomeCop,
    computedCedularTaxableIncomeCop: computedCedular,
  });
  const crossChecks = [
    crossValidations.withholdingsExceedIncomeTax,
    crossValidations.patrimonyIncomeDisproportion,
    crossValidations.cedularSumMismatch,
  ];
  for (const check of crossChecks) {
    if (!check.triggered) continue;
    findings.push({
      id: `cross-${check.code}`,
      severity: 'warning',
      code: check.code,
      message: check.message,
      boxNumbers:
        check.code === 'withholdings_exceed_income_tax'
          ? [132]
          : check.code === 'patrimony_income_disproportion'
            ? [29]
            : [42, 66, 83],
      sourceIds: [],
    });
  }

  return {
    id: `form210:${input.caseId}:2025`,
    caseId: input.caseId,
    taxYear: 2025,
    filingYear: 2026,
    formVersion: FORM_210_RULESET_2025.formVersion,
    ruleVersion: FORM_210_RULESET_2025.ruleVersion,
    generatedAt,
    notice: 'Borrador de trabajo — no presentado ante la DIAN',
    boxes,
    findings,
    preliminaryLiquidation,
    status: {
      status:
        populated === 0
          ? 'not_started'
          : blockers > 0 || pendingBoxes > 0
            ? 'with_pending_items'
            : 'ready_for_review',
      confirmedBoxes: boxes.filter((box) => box.status === 'confirmed').length,
      calculatedBoxes: boxes.filter((box) => box.status === 'calculated').length,
      pendingBoxes,
      blockers,
    },
    resolutionIds: (input.resolutions ?? []).map((item) => item.id),
    includesBinaryData: false,
    presentationStatus: 'out_of_scope',
  };
}

export function serializeForm210Draft(draft: Form210Draft): string {
  return JSON.stringify(
    { schema: 'nexustax.form210.working-draft', schemaVersion: '1.0.0', ...draft },
    null,
    2,
  );
}
