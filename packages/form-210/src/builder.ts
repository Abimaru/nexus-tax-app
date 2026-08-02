import type {
  DocumentFact,
  NormalizedExogenousRecord,
  TaxCategory,
  TaxResolutionDecision,
} from '@nexus-tax/domain';
import { FORM_210_RULESET_2025 } from './ruleset-2025';
import type {
  Form210BoxValue,
  Form210BuildInput,
  Form210Draft,
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

function computeFormula(number: number, get: (box: number) => number | null): number | null {
  const formula: Partial<Record<number, () => number | null>> = {
    31: () =>
      get(29) !== null || get(30) !== null ? safeSubtract([get(29) ?? 0, get(30) ?? 0]) : null,
    34: () => (get(32) !== null ? safeSubtract([get(32) ?? 0, get(33) ?? 0]) : null),
    37: () => (get(35) !== null || get(36) !== null ? (get(35) ?? 0) + (get(36) ?? 0) : null),
    40: () => (get(38) !== null || get(39) !== null ? (get(38) ?? 0) + (get(39) ?? 0) : null),
    42: () =>
      get(34) !== null && get(41) !== null ? safeSubtract([get(34) ?? 0, get(41) ?? 0]) : null,
    61: () => (get(58) !== null ? safeSubtract([get(58) ?? 0, get(59) ?? 0, get(60) ?? 0]) : null),
    78: () =>
      get(74) !== null
        ? safeSubtract([get(74) ?? 0, get(75) ?? 0, get(76) ?? 0, get(77) ?? 0])
        : null,
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
