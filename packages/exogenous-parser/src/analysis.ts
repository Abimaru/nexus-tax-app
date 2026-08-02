import type {
  ClassificationSnapshot,
  DataQualityFinding,
  ExogenousThreshold,
  MatrixEntryDisposition,
  MatrixGroup,
  MatrixGroupId,
  NormalizedExogenousRecord,
  QualityDimensions,
  RecordRelation,
  RecordResolution,
  ReconciliationStatus,
  ResolutionStatus,
  TaxCategory,
  TaxConfidence,
  TaxMatrix,
  TaxResolutionDecision,
} from '@nexus-tax/domain';
import { prefixedId } from './ids';
import { evaluateReconciliationDifference } from './reconciliationPolicy';
import { normalizeForCompare } from './text';

export const ANALYSIS_RULE_VERSION = '2.3.0';

export function automaticClassificationSnapshot(
  record: NormalizedExogenousRecord,
): ClassificationSnapshot {
  return {
    category: record.category,
    nature: record.nature,
    treatment: record.treatment,
    confidence: record.confidence,
    evidence: record.classificationEvidence,
  };
}

function relation(
  sourceRecordId: string,
  targetRecordId: string,
  type: RecordRelation['type'],
  confidence: RecordRelation['confidence'],
  ruleId: string,
  description: string,
  reviewStatus: RecordRelation['reviewStatus'] = 'automatically_resolved',
): RecordRelation {
  return {
    id: prefixedId('relation', [sourceRecordId, targetRecordId, type, ruleId]),
    sourceRecordId,
    targetRecordId,
    type,
    confidence,
    evidence: [{ kind: 'classification', description }],
    ruleId,
    ruleVersion: ANALYSIS_RULE_VERSION,
    reviewStatus,
  };
}

/** Detecta relaciones sin alterar valores ni registros originales. */
export function buildRecordRelationships(
  records: readonly NormalizedExogenousRecord[],
): RecordRelation[] {
  const relationships: RecordRelation[] = [];
  const invoiceTotals = records.filter(
    (record) => record.category === 'electronic_invoicing_total',
  );
  const benefitBases = records.filter(
    (record) => record.category === 'electronic_invoicing_benefit_base',
  );

  for (const base of benefitBases) {
    const target =
      invoiceTotals.find(
        (total) =>
          total.reportingEntityDocument &&
          total.reportingEntityDocument === base.reportingEntityDocument,
      ) ?? invoiceTotals[0];
    if (target) {
      relationships.push(
        relation(
          base.id,
          target.id,
          'subset_of',
          'high',
          'electronic-invoice-benefit-subset',
          'La base susceptible del beneficio forma parte del total neto facturado.',
        ),
      );
    }
  }

  const byEntity = new Map<string, NormalizedExogenousRecord[]>();
  for (const record of records) {
    const key = record.reportingEntityDocument ?? record.entityName ?? '__unknown__';
    const group = byEntity.get(key) ?? [];
    group.push(record);
    byEntity.set(key, group);
  }

  for (const group of byEntity.values()) {
    const investmentMovements = group.filter((record) => record.category === 'investment_movement');
    const investmentAssets = group.filter((record) => record.category === 'investment_asset');
    for (const movement of investmentMovements) {
      for (const asset of investmentAssets) {
        relationships.push(
          relation(
            movement.id,
            asset.id,
            'related_movement',
            'medium',
            'investment-movement-to-closing-balance',
            'El movimiento de inversión se relaciona con un saldo al cierre, pero no lo reemplaza.',
          ),
        );
      }
    }

    const summaries = group.filter((record) => {
      const label = normalizeForCompare(record.conceptLabel ?? '');
      return /\b(total|resumen)\b/.test(label) && record.category !== 'electronic_invoicing_total';
    });
    for (const summary of summaries) {
      const components = group.filter(
        (candidate) =>
          candidate.id !== summary.id &&
          candidate.category === summary.category &&
          candidate.reportedValue !== null,
      );
      const componentSum = components.reduce((sum, record) => sum + (record.reportedValue ?? 0), 0);
      if (
        components.length > 0 &&
        summary.reportedValue !== null &&
        Math.abs(componentSum - summary.reportedValue) <= 1
      ) {
        for (const component of components) {
          relationships.push(
            relation(
              summary.id,
              component.id,
              'summary_of',
              'high',
              'summary-matches-components',
              'El total coincide con la suma de componentes; se incluye el resumen y se excluyen los componentes.',
            ),
          );
        }
      }
    }
  }

  const seen = new Map<string, NormalizedExogenousRecord>();
  for (const record of records) {
    const signature = [
      record.reportingEntityDocument ?? record.entityName ?? '',
      record.conceptCode ?? record.conceptLabel ?? '',
      record.reportedValue ?? '',
    ].join('|');
    const prior = seen.get(signature);
    if (prior && signature !== '||') {
      relationships.push(
        relation(
          record.id,
          prior.id,
          'possible_duplicate_of',
          'medium',
          'exact-record-signature',
          'Entidad, concepto y valor coinciden; requiere confirmar si es duplicado.',
          'pending_review',
        ),
      );
    } else {
      seen.set(signature, record);
    }
  }

  return relationships.sort(
    (a, b) =>
      a.sourceRecordId.localeCompare(b.sourceRecordId) ||
      a.targetRecordId.localeCompare(b.targetRecordId) ||
      a.type.localeCompare(b.type),
  );
}

interface GroupDefinition {
  id: MatrixGroupId;
  label: string;
  categories: TaxCategory[];
  thresholdNumber: number | null;
  comparable: boolean;
}

const GROUPS: readonly GroupDefinition[] = [
  {
    id: 'gross_income_total',
    label: 'Ingresos consolidados',
    categories: ['employment_income', 'financial_income', 'other_income'],
    thresholdNumber: 1,
    comparable: true,
  },
  {
    id: 'employment_income',
    label: 'Ingresos laborales',
    categories: ['employment_income'],
    thresholdNumber: 1,
    comparable: false,
  },
  {
    id: 'financial_income',
    label: 'Rendimientos financieros',
    categories: ['financial_income'],
    thresholdNumber: 1,
    comparable: false,
  },
  {
    id: 'other_income',
    label: 'Otros ingresos',
    categories: ['other_income'],
    thresholdNumber: 1,
    comparable: false,
  },
  {
    id: 'occasional_gains',
    label: 'Ganancias ocasionales',
    categories: ['occasional_gain'],
    thresholdNumber: 1,
    comparable: false,
  },
  {
    id: 'assets',
    label: 'Activos',
    categories: ['asset', 'investment_asset'],
    thresholdNumber: 2,
    comparable: true,
  },
  {
    id: 'liabilities',
    label: 'Pasivos',
    categories: ['liability'],
    thresholdNumber: null,
    comparable: false,
  },
  {
    id: 'withholdings',
    label: 'Retenciones',
    categories: ['withholding'],
    thresholdNumber: null,
    comparable: false,
  },
  {
    id: 'financial_movements',
    label: 'Movimientos financieros',
    categories: ['bank_movement', 'investment_movement'],
    thresholdNumber: 4,
    comparable: true,
  },
  {
    id: 'card_consumption',
    label: 'Consumos con tarjeta',
    categories: ['card_consumption'],
    thresholdNumber: 3,
    comparable: true,
  },
  {
    id: 'invoiced_purchases',
    label: 'Compras facturadas',
    categories: ['purchase', 'electronic_invoicing_total'],
    thresholdNumber: 5,
    comparable: true,
  },
  {
    id: 'electronic_invoice_benefit_base',
    label: 'Base de factura electrónica susceptible',
    categories: ['electronic_invoicing_benefit_base'],
    thresholdNumber: null,
    comparable: false,
  },
  {
    id: 'informational_records',
    label: 'Registros informativos',
    categories: ['employment_reference', 'informational', 'prior_year_balance', 'severance'],
    thresholdNumber: null,
    comparable: false,
  },
  {
    id: 'pending_records',
    label: 'Registros pendientes',
    categories: ['unclassified', 'deduction_candidate', 'social_security_contribution'],
    thresholdNumber: null,
    comparable: false,
  },
];

function inferThresholdNumber(threshold: ExogenousThreshold): number | null {
  const label = normalizeForCompare(`${threshold.label} ${threshold.normalizedLabel}`);
  if (/ingreso/.test(label)) return 1;
  if (/patrimonio|activo bruto/.test(label)) return 2;
  if (/tarjeta|\btc\b|\bt\s+c\b/.test(label)) return 3;
  if (/consign|deposit|inversion|movimiento/.test(label)) return 4;
  if (/compra|adquisicion/.test(label)) return 5;
  return threshold.number && threshold.number >= 1 && threshold.number <= 5
    ? threshold.number
    : null;
}

function thresholdsByNumber(
  thresholds: readonly ExogenousThreshold[],
): Map<number, ExogenousThreshold> {
  const result = new Map<number, ExogenousThreshold>();
  for (const threshold of thresholds) {
    const number = inferThresholdNumber(threshold);
    if (number !== null && !result.has(number)) result.set(number, threshold);
  }
  return result;
}

function resolutionFor(
  recordId: string,
  resolutions: readonly RecordResolution[],
): RecordResolution | undefined {
  return resolutions.find((resolution) => resolution.recordId === recordId);
}

function effectiveClassification(
  record: NormalizedExogenousRecord,
  resolution: RecordResolution | undefined,
): ClassificationSnapshot {
  return resolution && !resolution.isObsolete
    ? resolution.finalClassification
    : automaticClassificationSnapshot(record);
}

function defaultDispositionForCategory(category: TaxCategory): MatrixEntryDisposition {
  if (
    ['informational', 'employment_reference', 'prior_year_balance', 'severance'].includes(category)
  ) {
    return 'informational';
  }
  if (['unclassified', 'deduction_candidate', 'social_security_contribution'].includes(category)) {
    return 'pending';
  }
  return 'included';
}

function entryDisposition(
  record: NormalizedExogenousRecord,
  groupId: MatrixGroupId,
  resolution: RecordResolution | undefined,
  relations: readonly RecordRelation[],
): { disposition: MatrixEntryDisposition; reason: string; resolutionStatus: ResolutionStatus } {
  const resolutionStatus = resolution?.status ?? 'automatically_resolved';
  if (resolution?.isObsolete) {
    return {
      disposition: 'pending',
      reason: resolution.obsoleteReason ?? 'Decisión obsoleta pendiente de revisión.',
      resolutionStatus: 'pending_review',
    };
  }
  if (resolutionStatus === 'pending_review') {
    return {
      disposition: 'pending',
      reason: 'El analista dejó el registro pendiente de revisión.',
      resolutionStatus,
    };
  }
  if (resolutionStatus === 'excluded_justified' || resolutionStatus === 'ignored_justified') {
    return {
      disposition: 'excluded',
      reason: resolution?.justification ?? 'Exclusión justificada por el analista.',
      resolutionStatus,
    };
  }
  if (relations.some((item) => item.type === 'summary_of' && item.targetRecordId === record.id)) {
    return {
      disposition: 'excluded',
      reason: 'Excluido porque un registro resumen equivalente fue incluido.',
      resolutionStatus,
    };
  }
  if (
    relations.some(
      (item) =>
        item.type === 'possible_duplicate_of' &&
        item.sourceRecordId === record.id &&
        item.reviewStatus === 'pending_review',
    )
  ) {
    return {
      disposition: 'pending',
      reason: 'Posible doble conteo pendiente de resolver.',
      resolutionStatus: 'pending_review',
    };
  }
  if (groupId === 'electronic_invoice_benefit_base') {
    return {
      disposition: 'included',
      reason: 'Incluido solo para calcular la base susceptible y su 1 %.',
      resolutionStatus,
    };
  }
  if (
    !resolution ||
    resolution.status === 'analyst_confirmed' ||
    resolution.status === 'automatically_resolved'
  ) {
    return {
      disposition: record.consolidationDisposition,
      reason: record.consolidationReason,
      resolutionStatus,
    };
  }
  return {
    disposition: defaultDispositionForCategory(resolution.finalClassification.category),
    reason: resolution.justification || 'Clasificación modificada por el analista.',
    resolutionStatus,
  };
}

function reconciliation(
  definition: GroupDefinition,
  consolidatedValue: number,
  threshold: ExogenousThreshold | undefined,
  pendingCount: number,
  hasPendingDocuments: boolean,
): {
  status: ReconciliationStatus;
  differenceAbsolute: number | null;
  differencePercentage: number | null;
  warning: string | null;
  action: string;
  confidence: TaxConfidence;
} {
  if (!definition.comparable) {
    return {
      status: 'not_comparable',
      differenceAbsolute: threshold ? Math.abs(consolidatedValue - threshold.value) : null,
      differencePercentage: null,
      warning: threshold ? 'El tope representa un agregado distinto de este subgrupo.' : null,
      action: 'Usar este grupo como desglose, no como conciliación independiente.',
      confidence: 'medium',
    };
  }
  if (!threshold) {
    return {
      status: 'incomplete',
      differenceAbsolute: null,
      differencePercentage: null,
      warning: 'No se detectó el tope DIAN relacionado.',
      action: 'Revisar la sección de topes del archivo.',
      confidence: 'low',
    };
  }
  const policy = evaluateReconciliationDifference({
    leftValue: consolidatedValue,
    rightValue: threshold.value,
    source: 'exogenous_threshold',
    roundingUnit: 5,
    groupNature:
      definition.id === 'assets'
        ? 'asset'
        : definition.id === 'financial_movements'
          ? 'movement'
          : 'income',
  });
  const difference = policy.differenceAbsolute;
  const percentage = policy.differencePercentage;
  if (pendingCount > 0) {
    return {
      status: 'incomplete',
      differenceAbsolute: difference,
      differencePercentage: percentage,
      warning: 'Existen registros pendientes que pueden cambiar el consolidado.',
      action: 'Resolver los registros pendientes antes de conciliar.',
      confidence: 'low',
    };
  }
  if (hasPendingDocuments) {
    return {
      status: 'pending_documents',
      differenceAbsolute: difference,
      differencePercentage: percentage,
      warning: 'Faltan certificados para confirmar saldos al cierre.',
      action: 'Adjuntar y revisar los certificados relacionados.',
      confidence: 'medium',
    };
  }
  if (policy.status === 'reconciled') {
    return {
      status: 'reconciled',
      differenceAbsolute: 0,
      differencePercentage: 0,
      warning: null,
      action: 'Sin acción adicional.',
      confidence: 'high',
    };
  }
  if (policy.status === 'rounding_difference') {
    return {
      status: 'rounding_difference',
      differenceAbsolute: difference,
      differencePercentage: percentage,
      warning: policy.explanation,
      action: 'Confirmar si se acepta la diferencia bajo la política de redondeo aplicada.',
      confidence: 'high',
    };
  }
  if (policy.status === 'minor_difference') {
    return {
      status: 'minor_difference',
      differenceAbsolute: difference,
      differencePercentage: percentage,
      warning: policy.explanation,
      action: 'Revisar y confirmar si la diferencia menor es aceptable.',
      confidence: 'medium',
    };
  }
  return {
    status: 'relevant_difference',
    differenceAbsolute: difference,
    differencePercentage: percentage,
    warning: 'La diferencia requiere explicación o documentos adicionales.',
    action: 'Revisar los registros incluidos y la composición del tope.',
    confidence: 'medium',
  };
}

function buildQuality(
  records: readonly NormalizedExogenousRecord[],
  findings: readonly DataQualityFinding[],
  groups: readonly MatrixGroup[],
): QualityDimensions {
  const extractionCodes = new Set([
    'empty_sheet',
    'unknown_format',
    'duplicate_header',
    'unnamed_column',
    'record_without_entity',
    'record_without_concept',
    'record_without_value',
    'non_numeric_value',
    'possibly_truncated_identifier',
    'reported_person_mismatch',
    'possible_column_mapping_error',
  ]);
  const extractionIssues = findings.filter((finding) => extractionCodes.has(finding.code)).length;
  const classificationPending = new Set(
    groups.flatMap((group) =>
      group.entries
        .filter((entry) => entry.disposition === 'pending')
        .map((entry) => entry.recordId),
    ),
  ).size;
  const reconciliationIds = new Set<MatrixGroupId>([
    'gross_income_total',
    'assets',
    'financial_movements',
    'card_consumption',
    'invoiced_purchases',
  ]);
  const unresolvedGroups = groups.filter(
    (group) =>
      reconciliationIds.has(group.id) &&
      !['reconciled', 'rounding_difference'].includes(group.reconciliationStatus),
  ).length;
  const recordDenominator = Math.max(records.length, 1);
  return {
    extraction: {
      score: Math.max(0, Math.round(100 * (1 - extractionIssues / recordDenominator))),
      issueCount: extractionIssues,
      explanation:
        'Mide estructura, lectura, identidad y valores extraídos; no evalúa su tratamiento tributario.',
    },
    classification: {
      score: Math.max(0, Math.round(100 * (1 - classificationPending / recordDenominator))),
      pendingCount: classificationPending,
      explanation:
        'Mide registros pendientes o realmente ambiguos; los informativos y usos compatibles no penalizan.',
    },
    reconciliation: {
      score: Math.max(0, Math.round(100 * (1 - unresolvedGroups / reconciliationIds.size))),
      unresolvedGroupCount: unresolvedGroups,
      explanation: 'Mide el estado preliminar de comparación con los cinco topes detectados.',
    },
  };
}

export function buildTaxMatrix(input: {
  records: readonly NormalizedExogenousRecord[];
  thresholds: readonly ExogenousThreshold[];
  relationships: readonly RecordRelation[];
  findings?: readonly DataQualityFinding[];
  resolutions?: readonly RecordResolution[];
  resolutionDecisions?: readonly TaxResolutionDecision[];
  generatedAt: string;
}): TaxMatrix {
  const resolutions = input.resolutions ?? [];
  const thresholdMap = thresholdsByNumber(input.thresholds);
  const groups: MatrixGroup[] = GROUPS.map((definition) => {
    const entries = input.records
      .filter((record) => {
        const resolution = resolutionFor(record.id, resolutions);
        return definition.categories.includes(effectiveClassification(record, resolution).category);
      })
      .map((record) => {
        const resolution = resolutionFor(record.id, resolutions);
        const classification = effectiveClassification(record, resolution);
        const disposition = entryDisposition(
          record,
          definition.id,
          resolution,
          input.relationships,
        );
        return {
          recordId: record.id,
          disposition: disposition.disposition,
          reason: disposition.reason,
          value: record.reportedValue ?? 0,
          effectiveClassification: classification,
          relationIds: input.relationships
            .filter(
              (item) => item.sourceRecordId === record.id || item.targetRecordId === record.id,
            )
            .map((item) => item.id),
          resolutionStatus: disposition.resolutionStatus,
        };
      });
    const consolidatedValue = entries
      .filter((entry) => entry.disposition === 'included')
      .reduce((sum, entry) => sum + entry.value, 0);
    const pendingCount = entries.filter((entry) => entry.disposition === 'pending').length;
    const threshold = definition.thresholdNumber
      ? thresholdMap.get(definition.thresholdNumber)
      : undefined;
    const relatedRecords = input.records.filter((record) =>
      entries.some((entry) => entry.recordId === record.id),
    );
    const comparison = reconciliation(
      definition,
      consolidatedValue,
      threshold,
      pendingCount,
      relatedRecords.some((record) => record.treatment === 'reconcile_with_certificate'),
    );
    const replacedDecisionIds = new Set(
      (input.resolutionDecisions ?? [])
        .map((decision) => decision.replacesDecisionId)
        .filter((id): id is string => Boolean(id)),
    );
    const groupDecision = [...(input.resolutionDecisions ?? [])]
      .filter(
        (decision) =>
          decision.objectType === 'matrix_group' &&
          decision.objectId === definition.id &&
          !replacedDecisionIds.has(decision.id),
      )
      .sort((a, b) => b.decidedAt.localeCompare(a.decidedAt))[0];
    const decidedStatus =
      groupDecision?.type === 'declare_not_comparable'
        ? ('not_comparable' as const)
        : comparison.status;
    return {
      id: definition.id,
      label: definition.label,
      consolidatedValue,
      includedCount: entries.filter((entry) => entry.disposition === 'included').length,
      excludedCount: entries.filter((entry) => entry.disposition === 'excluded').length,
      pendingCount,
      thresholdNumber: definition.thresholdNumber,
      thresholdValue: threshold?.value ?? null,
      differenceAbsolute: comparison.differenceAbsolute,
      differencePercentage: comparison.differencePercentage,
      reconciliationStatus: decidedStatus,
      confidence: comparison.confidence,
      warnings: [
        comparison.warning,
        groupDecision ? `Decisión del analista: ${groupDecision.reason}` : null,
      ].filter((warning): warning is string => Boolean(warning)),
      recommendedAction: groupDecision
        ? 'Decisión registrada; puede revertirse desde el centro de resolución.'
        : comparison.action,
      sourceEvidence: relatedRecords.map((record) => record.source),
      entries,
    };
  });

  const totalEntries = groups.find((group) => group.id === 'invoiced_purchases')?.entries ?? [];
  const benefitEntries =
    groups.find((group) => group.id === 'electronic_invoice_benefit_base')?.entries ?? [];
  const totalRecordIds = totalEntries
    .filter((entry) => entry.effectiveClassification.category === 'electronic_invoicing_total')
    .map((entry) => entry.recordId);
  const benefitBaseRecordIds = benefitEntries.map((entry) => entry.recordId);
  const totalNetInvoiced = totalEntries
    .filter(
      (entry) =>
        entry.disposition === 'included' &&
        entry.effectiveClassification.category === 'electronic_invoicing_total',
    )
    .reduce((sum, entry) => sum + entry.value, 0);
  const eligibleBenefitBase = benefitEntries
    .filter((entry) => entry.disposition === 'included')
    .reduce((sum, entry) => sum + entry.value, 0);
  const invoiceRelationIds = input.relationships
    .filter(
      (item) =>
        item.type === 'subset_of' &&
        benefitBaseRecordIds.includes(item.sourceRecordId) &&
        totalRecordIds.includes(item.targetRecordId),
    )
    .map((item) => item.id);
  const quality = buildQuality(input.records, input.findings ?? [], groups);

  return {
    ruleVersion: ANALYSIS_RULE_VERSION,
    generatedAt: input.generatedAt,
    groups,
    electronicInvoicing: {
      totalNetInvoiced,
      eligibleBenefitBase,
      eligiblePercentage:
        totalNetInvoiced === 0 ? null : (eligibleBenefitBase / totalNetInvoiced) * 100,
      preliminaryBenefit: eligibleBenefitBase * 0.01,
      difference: totalNetInvoiced - eligibleBenefitBase,
      totalRecordIds,
      benefitBaseRecordIds,
      relationIds: invoiceRelationIds,
      reviewStatus:
        totalRecordIds.length === 0 && benefitBaseRecordIds.length === 0
          ? 'not_available'
          : invoiceRelationIds.length > 0 || benefitBaseRecordIds.length === 0
            ? 'reviewed'
            : 'pending',
    },
    quality,
  };
}
