import type {
  DocumentFact,
  NormalizedExogenousRecord,
  TaxCategory,
  TaxResolutionDecision,
} from '@nexus-tax/domain';
import {
  DEPENDENTS_MAX_ELIGIBLE,
  TAX_LIMIT_RULES_2025,
  TAX_UNIT_2025,
  applyLimitRule,
  computeAdvancePayment,
  computeDependentsDeduction,
  computeOccasionalGainsTax,
  computeProgressiveIncomeTax,
  copToUvt,
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
  return findings;
}

/**
 * Deriva la liquidación privada preliminar del borrador. La numeración de las
 * casillas de impuesto y saldo (119, 123, 133, 139…) NO se afirma aquí porque
 * varía entre versiones del formulario y aún no ha sido verificada contra el
 * instructivo DIAN 2025. Los importes viven en el objeto de liquidación con
 * fórmula y fuente propias hasta que la numeración se confirme.
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
  const priorYearBalanceCop = Math.max(0, get(131) ?? 0);
  const withholdingsCop = Math.max(0, get(132) ?? 0);

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

  const netBalanceCop =
    totalTaxDueCop +
    (nextYearAdvance?.netAdvanceCop ?? 0) -
    priorYearAdvanceCop -
    priorYearBalanceCop -
    withholdingsCop;

  const warnings: string[] = [];
  if (!incomeTax) {
    warnings.push(
      'No hay renta líquida cedular suficiente para calcular el impuesto progresivo.',
    );
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
    dependentsDeduction.dependentsProvidedCount > dependentsDeduction.dependentsEligibleCount
  ) {
    warnings.push(
      `Se declararon ${dependentsDeduction.dependentsProvidedCount} dependientes; solo los primeros ${DEPENDENTS_MAX_ELIGIBLE} entran en la deducción del art. 387 ET.`,
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
  const pendingBoxNumbers = new Set<number>();
  const duplicateSourceIds: string[] = [];
  const stateByRecord = new Map(input.recordStates?.map((state) => [state.recordId, state]));
  const provisional = new Set(input.provisionalRecordIds ?? []);

  for (const record of input.records) {
    const state = stateByRecord.get(record.id);
    const category = state?.category ?? record.category;
    const boxNumber = CATEGORY_BOX[category];
    if (!boxNumber || record.reportedValue === null) continue;
    const trace = recordTrace(record, record.reportedValue, provisional.has(record.id));
    if (state && state.disposition !== 'included') {
      excludedByBox.set(boxNumber, [...(excludedByBox.get(boxNumber) ?? []), trace.sourceId]);
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
    const duplicate = (sourcesByBox.get(boxNumber) ?? []).some(
      (source) =>
        source.value === trace.value &&
        source.label.toLocaleLowerCase('es').includes(trace.label.toLocaleLowerCase('es')),
    );
    if (duplicate) {
      excludedByBox.set(boxNumber, [...(excludedByBox.get(boxNumber) ?? []), trace.sourceId]);
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

  const replacedIds = new Set(
    (input.resolutions ?? [])
      .map((item) => item.replacesDecisionId)
      .filter((id): id is string => Boolean(id)),
  );
  const adjustmentByBox = new Map<number, TaxResolutionDecision>();
  for (const decision of [...(input.resolutions ?? [])].sort((a, b) =>
    a.decidedAt.localeCompare(b.decidedAt),
  )) {
    if (decision.objectType !== 'form_box' || replacedIds.has(decision.id)) continue;
    const number = Number(decision.objectId);
    if (decision.type === 'restore_automatic_value') adjustmentByBox.delete(number);
    else if (decision.type === 'adjust_form_box') adjustmentByBox.set(number, decision);
  }

  const boxes: Form210BoxValue[] = FORM_210_RULESET_2025.boxes.map((definition) => {
    const sources = sourcesByBox.get(definition.number) ?? [];
    const suggestedValue = sources.length
      ? sources.reduce((sum, source) => sum + source.value, 0)
      : null;
    const adjustment = adjustmentByBox.get(definition.number);
    return {
      ...definition,
      suggestedValue,
      confirmedValue: adjustment?.finalValue ?? null,
      sources,
      includedSourceIds: sources.map((source) => source.sourceId),
      excludedSourceIds: excludedByBox.get(definition.number) ?? [],
      confidence: sources.some((source) => source.type === 'provisional_source')
        ? 'low'
        : sources.length
          ? 'medium'
          : 'low',
      status: adjustment
        ? 'confirmed'
        : suggestedValue === null
          ? 'no_data'
          : definition.ruleComplete
            ? 'suggested'
            : 'incomplete',
      warnings: definition.ruleComplete
        ? []
        : [
            'La regla completa de esta casilla todavía no está incorporada; no se calcula automáticamente.',
          ],
      resolutionId: adjustment?.id ?? null,
      ruleVersion: FORM_210_RULESET_2025.ruleVersion,
    };
  });

  const getValue = (number: number) => {
    const target = boxes.find((box) => box.number === number);
    return target?.confirmedValue ?? target?.suggestedValue ?? null;
  };
  for (const box of boxes.filter((item) => item.formula && item.ruleComplete)) {
    if (box.confirmedValue !== null) continue;
    const calculated = computeFormula(box.number, getValue);
    if (calculated !== null) {
      box.suggestedValue = calculated;
      box.status = 'calculated';
      box.confidence = 'high';
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
  const pendingBoxes = boxes.filter((box) =>
    ['incomplete', 'requires_decision', 'contradicted'].includes(box.status),
  ).length;
  const blockers = findings.filter((finding) => finding.severity === 'error').length;
  const populated = boxes.filter(
    (box) => box.suggestedValue !== null || box.confirmedValue !== null,
  ).length;
  const preliminaryLiquidation = computePreliminaryLiquidation(
    boxes,
    FORM_210_RULESET_2025.ruleVersion,
    generatedAt,
    input.occasionalGainsBreakdown,
    input.advancePaymentContext,
    dependentsDeduction,
  );
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
