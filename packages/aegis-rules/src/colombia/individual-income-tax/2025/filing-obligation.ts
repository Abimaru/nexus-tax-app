import type { ExogenousThreshold } from '@nexus-tax/domain';
import type {
  FilingCriterion,
  FilingCriterionResult,
  FilingObligationAssessment,
  FilingObligationInputs,
  FilingThresholdCriterionId,
  MappedThreshold,
} from '../../../types';
import { calculateFilingDeadline } from './deadlines-2026';

export const INDIVIDUAL_INCOME_TAX_2025_RULE_VERSION = 'co-renta-pn-2025.1.0.0';
export const TAX_YEAR = 2025;
export const FILING_YEAR = 2026;
export const UVT_2025 = 49_799;
export const CRITERIA_SOURCE_ID = 'dian-renta-personas-naturales-ag-2025';

export const FILING_CRITERIA_2025: readonly FilingCriterion[] = [
  {
    id: 'gross_income',
    label: 'Ingresos brutos',
    inputKind: 'threshold',
    operator: 'gte',
    uvtAmount: 1_400,
    exactAmount: 69_718_600,
    officialRoundedAmount: 69_719_000,
    sourceId: CRITERIA_SOURCE_ID,
  },
  {
    id: 'gross_assets',
    label: 'Patrimonio bruto',
    inputKind: 'threshold',
    operator: 'gt',
    uvtAmount: 4_500,
    exactAmount: 224_095_500,
    officialRoundedAmount: 224_096_000,
    sourceId: CRITERIA_SOURCE_ID,
  },
  {
    id: 'credit_card_consumption',
    label: 'Consumos con tarjeta de crédito',
    inputKind: 'threshold',
    operator: 'gt',
    uvtAmount: 1_400,
    exactAmount: 69_718_600,
    officialRoundedAmount: 69_719_000,
    sourceId: CRITERIA_SOURCE_ID,
  },
  {
    id: 'deposits_and_investments',
    label: 'Consignaciones, depósitos o inversiones',
    inputKind: 'threshold',
    operator: 'gt',
    uvtAmount: 1_400,
    exactAmount: 69_718_600,
    officialRoundedAmount: 69_719_000,
    sourceId: CRITERIA_SOURCE_ID,
  },
  {
    id: 'purchases_and_consumption',
    label: 'Compras y consumos',
    inputKind: 'threshold',
    operator: 'gt',
    uvtAmount: 1_400,
    exactAmount: 69_718_600,
    officialRoundedAmount: 69_719_000,
    sourceId: CRITERIA_SOURCE_ID,
  },
  {
    id: 'vat_responsible_at_year_end',
    label: 'Responsable de IVA al 31 de diciembre de 2025',
    inputKind: 'boolean',
    operator: 'eq',
    sourceId: CRITERIA_SOURCE_ID,
  },
];

function normalizeLabel(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function inferCriterionFromLabel(label: string): FilingThresholdCriterionId | null {
  if (/\b(ingreso|ingresos)\b/.test(label)) return 'gross_income';
  if (/\bpatrimonio\b|\bactivo(s)?\s+bruto(s)?\b/.test(label)) return 'gross_assets';
  if (/tarjeta|\btc\b|\bt\s+c\b/.test(label) && /consum|credito/.test(label)) {
    return 'credit_card_consumption';
  }
  if (/consign|deposit|inversion|movimiento/.test(label)) return 'deposits_and_investments';
  if (/compra|adquisicion/.test(label)) return 'purchases_and_consumption';
  return null;
}

const NUMBER_MAPPING: Record<number, FilingThresholdCriterionId> = {
  1: 'gross_income',
  2: 'gross_assets',
  3: 'credit_card_consumption',
  4: 'deposits_and_investments',
  5: 'purchases_and_consumption',
};

export function mapExogenousThreshold(threshold: ExogenousThreshold): MappedThreshold | null {
  const label = normalizeLabel(`${threshold.label} ${threshold.normalizedLabel}`);
  const semanticMatch = inferCriterionFromLabel(label);
  const numberMatch = threshold.number === undefined ? undefined : NUMBER_MAPPING[threshold.number];
  const criterionId = semanticMatch ?? numberMatch;
  return criterionId ? { criterionId, threshold } : null;
}

export function mapExogenousThresholds(
  thresholds: readonly ExogenousThreshold[],
): Map<FilingThresholdCriterionId, MappedThreshold> {
  const mapped = new Map<FilingThresholdCriterionId, MappedThreshold>();
  for (const threshold of thresholds) {
    const match = mapExogenousThreshold(threshold);
    if (match && !mapped.has(match.criterionId)) mapped.set(match.criterionId, match);
  }
  return mapped;
}

function compareAmount(value: number, criterion: FilingCriterion): boolean {
  const limit = criterion.officialRoundedAmount;
  if (limit === undefined) return false;
  return criterion.operator === 'gte' ? value >= limit : value > limit;
}

function amountReason(
  criterion: FilingCriterion,
  match: MappedThreshold | undefined,
): FilingCriterionResult {
  if (!match) {
    return {
      criterionId: criterion.id,
      label: criterion.label,
      operator: criterion.operator,
      sourceId: criterion.sourceId,
      result: 'not_evaluable',
      observedValue: null,
      uvtAmount: criterion.uvtAmount,
      exactAmount: criterion.exactAmount,
      officialRoundedAmount: criterion.officialRoundedAmount,
      evidence: null,
      explanation: 'El reporte no contiene un tope identificable para este criterio.',
    };
  }

  const met = compareAmount(match.threshold.value, criterion);
  const operatorText = criterion.operator === 'gte' ? 'igual o superior a' : 'superior a';
  return {
    criterionId: criterion.id,
    label: criterion.label,
    operator: criterion.operator,
    sourceId: criterion.sourceId,
    result: met ? 'met' : 'not_met',
    observedValue: match.threshold.value,
    uvtAmount: criterion.uvtAmount,
    exactAmount: criterion.exactAmount,
    officialRoundedAmount: criterion.officialRoundedAmount,
    evidence: {
      originalLabel: match.threshold.label,
      normalizedLabel: match.threshold.normalizedLabel,
      source: match.threshold.source,
    },
    explanation: `El valor detectado ${met ? 'sí' : 'no'} es ${operatorText} $${criterion.officialRoundedAmount?.toLocaleString('es-CO')}.`,
  };
}

function vatReason(value: boolean | null, criterion: FilingCriterion): FilingCriterionResult {
  return {
    criterionId: criterion.id,
    label: criterion.label,
    operator: criterion.operator,
    sourceId: criterion.sourceId,
    result: value === null ? 'not_evaluable' : value ? 'met' : 'not_met',
    observedValue: value,
    evidence: value === null ? null : { kind: 'user_input', label: criterion.label },
    explanation:
      value === null
        ? 'Esta condición no puede inferirse del Excel y requiere confirmación.'
        : value
          ? 'La persona confirmó que era responsable de IVA al cierre del año.'
          : 'La persona confirmó que no era responsable de IVA al cierre del año.',
  };
}

export function assessFilingObligation(inputs: FilingObligationInputs): FilingObligationAssessment {
  const mappedThresholds = mapExogenousThresholds(inputs.thresholds);
  const reasons = FILING_CRITERIA_2025.map((criterion) =>
    criterion.inputKind === 'boolean'
      ? vatReason(inputs.isVatResponsibleAtYearEnd, criterion)
      : amountReason(criterion, mappedThresholds.get(criterion.id as FilingThresholdCriterionId)),
  );
  const missingInputs = reasons
    .filter((reason) => reason.result === 'not_evaluable')
    .map((reason) => reason.label);
  const status = reasons.some((reason) => reason.result === 'met')
    ? 'required'
    : missingInputs.length > 0
      ? 'pending_information'
      : 'not_required';

  return {
    taxYear: TAX_YEAR,
    filingYear: FILING_YEAR,
    status,
    reasons,
    missingInputs,
    deadline: calculateFilingDeadline(inputs.document, inputs.documentType),
    evaluatedAt: inputs.evaluatedAt,
    ruleVersion: INDIVIDUAL_INCOME_TAX_2025_RULE_VERSION,
  };
}
