import type {
  DataQualityFinding,
  NormalizedExogenousRecord,
  ProcessingMetrics,
  ReportedConcept,
  ReportingEntity,
  QualityDimensions,
} from '@nexus-tax/domain';
import { inferEntityCategory } from './category';
import { resolveEntityIdentity } from './entityIdentity';
import { prefixedId } from './ids';

/** Agrupa registros normalizados en entidades reportantes. */
export function buildEntities(records: NormalizedExogenousRecord[]): ReportingEntity[] {
  const groups = new Map<
    string,
    {
      name: string | null;
      taxId: string | null;
      concepts: (string | null)[];
      total: number;
      count: number;
      legalName: string;
      brandName: string | null;
      groupName: string | null;
      identityRuleVersion: string;
    }
  >();

  for (const rec of records) {
    const identity = resolveEntityIdentity(rec.entityName);
    const key = rec.reportingEntityDocument ?? identity.canonicalKey;
    const group = groups.get(key) ?? {
      name: null,
      taxId: null,
      concepts: [],
      total: 0,
      count: 0,
      legalName: identity.legalName,
      brandName: identity.brandName,
      groupName: identity.groupName,
      identityRuleVersion: identity.ruleVersion,
    };
    group.name = group.name ?? rec.entityName;
    group.taxId = group.taxId ?? rec.reportingEntityDocument;
    group.concepts.push(rec.conceptLabel ?? rec.conceptCode);
    group.total += rec.reportedValue ?? 0;
    group.count += 1;
    groups.set(key, group);
  }

  const entities: ReportingEntity[] = [];
  for (const [key, group] of groups) {
    entities.push({
      id: prefixedId('entity', [key]),
      name: group.brandName ?? group.name ?? 'Sin nombre',
      taxId: group.taxId,
      category: inferEntityCategory(group.name, group.concepts),
      legalName: group.legalName,
      brandName: group.brandName,
      groupName: group.groupName,
      identityRuleVersion: group.identityRuleVersion,
      recordCount: group.count,
      totalReported: group.total,
    });
  }

  // Orden determinista: mayor valor primero, luego nombre.
  entities.sort((a, b) => b.totalReported - a.totalReported || a.name.localeCompare(b.name, 'es'));
  return entities;
}

/** Agrupa registros normalizados por concepto reportado. */
export function buildConcepts(records: NormalizedExogenousRecord[]): ReportedConcept[] {
  const groups = new Map<
    string,
    { code: string | null; label: string | null; total: number; count: number }
  >();

  for (const rec of records) {
    const key = rec.conceptCode ?? rec.conceptLabel ?? '__sin_concepto__';
    const group = groups.get(key) ?? { code: null, label: null, total: 0, count: 0 };
    group.code = group.code ?? rec.conceptCode;
    group.label = group.label ?? rec.conceptLabel;
    group.total += rec.reportedValue ?? 0;
    group.count += 1;
    groups.set(key, group);
  }

  const concepts: ReportedConcept[] = [];
  for (const [key, group] of groups) {
    concepts.push({
      id: prefixedId('concept', [key]),
      code: group.code,
      label: group.label ?? group.code ?? 'Sin concepto',
      recordCount: group.count,
      totalReported: group.total,
    });
  }

  concepts.sort(
    (a, b) => b.totalReported - a.totalReported || a.label.localeCompare(b.label, 'es'),
  );
  return concepts;
}

/** Calcula métricas agregadas, incluido un puntaje de calidad heurístico. */
export function computeMetrics(
  records: NormalizedExogenousRecord[],
  entities: ReportingEntity[],
  concepts: ReportedConcept[],
  findings: DataQualityFinding[],
  qualityDimensions: QualityDimensions,
): ProcessingMetrics {
  const totalReported = records.reduce((sum, r) => sum + (r.reportedValue ?? 0), 0);
  const totalWithholding = records.reduce((sum, r) => sum + (r.withholding ?? 0), 0);
  const homogeneousTotals = {
    detectedIncome: 0,
    detectedAssets: 0,
    detectedLiabilities: 0,
    detectedWithholdings: 0,
    financialMovements: 0,
    cardConsumption: 0,
    purchases: 0,
    unclassifiedRecordCount: 0,
  };
  for (const record of records) {
    if (record.consolidationDisposition !== 'included') {
      if (record.category === 'unclassified') homogeneousTotals.unclassifiedRecordCount += 1;
      continue;
    }
    const value = record.reportedValue ?? 0;
    switch (record.category) {
      case 'employment_income':
      case 'financial_income':
      case 'other_income':
      case 'occasional_gain':
        homogeneousTotals.detectedIncome += value;
        break;
      case 'asset':
      case 'investment_asset':
        homogeneousTotals.detectedAssets += value;
        break;
      case 'liability':
        homogeneousTotals.detectedLiabilities += value;
        break;
      case 'withholding':
        homogeneousTotals.detectedWithholdings += value;
        break;
      case 'bank_movement':
      case 'investment_movement':
        homogeneousTotals.financialMovements += value;
        break;
      case 'card_consumption':
        homogeneousTotals.cardConsumption += value;
        break;
      case 'purchase':
      case 'electronic_invoicing_total':
        homogeneousTotals.purchases += value;
        break;
      case 'unclassified':
        homogeneousTotals.unclassifiedRecordCount += 1;
        break;
      default:
        break;
    }
  }

  const findingCounts = { info: 0, warning: 0, error: 0 };
  for (const f of findings) findingCounts[f.severity] += 1;

  const weightedIssues = findingCounts.error * 2 + findingCounts.warning;
  const denom = records.length + weightedIssues;
  const qualityScore = denom === 0 ? 100 : Math.round(100 * (1 - weightedIssues / denom));

  return {
    recordCount: records.length,
    entityCount: entities.length,
    conceptCount: concepts.length,
    totalReported,
    grossUnconsolidatedSum: totalReported,
    totalWithholding,
    homogeneousTotals,
    findingCounts,
    qualityScore: Math.max(0, Math.min(100, qualityScore)),
    qualityDimensions,
  };
}
