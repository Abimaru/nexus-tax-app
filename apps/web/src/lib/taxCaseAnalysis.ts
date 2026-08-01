import type {
  CaseAnalysis,
  CaseEntitySummary,
  CaseProgress,
  DocumentFact,
  PreliminaryReconciliation,
  ProcessingResult,
  ReconciliationSuggestion,
  ReportingEntity,
  RequirementCoverage,
  TaxCase,
  UploadedDocument,
  CaseProduct,
  EmploymentIncomeGroup,
  EmployerInstance,
} from '@nexus-tax/domain';
import { MAX_EMPLOYER_INSTANCES, TAX_CASE_EXPORT_SCHEMA_VERSION } from '@nexus-tax/domain';

function percentage(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : Math.round((numerator / denominator) * 100);
}

export function calculateEmploymentGroupCoverage(
  instances: readonly EmployerInstance[],
): EmploymentIncomeGroup['coverage'] {
  const active = instances.filter((instance) => instance.status !== 'not_applicable');
  if (active.length === 0) return instances.length ? 'not_applicable' : 'pending';
  if (active.some((instance) => instance.status === 'requires_review')) return 'requires_review';
  if (active.every((instance) => instance.status === 'covered')) return 'covered';
  if (active.some((instance) => ['covered', 'partially_covered'].includes(instance.status)))
    return 'partial';
  return 'pending';
}

export function buildEmploymentIncomeGroup(input: {
  caseId: string;
  result?: ProcessingResult;
  existing?: EmploymentIncomeGroup;
  now?: string;
}): EmploymentIncomeGroup | undefined {
  const timestamp = input.now ?? new Date().toISOString();
  const existing = input.existing;
  const entities = input.result?.entities ?? [];
  const laborEntityIds = new Set<string>();
  for (const record of input.result?.normalizedRecords ?? []) {
    if (record.category !== 'employment_income') continue;
    const entity = entityForRecord(record, entities);
    if (entity) laborEntityIds.add(entity.id);
  }
  const candidates = entities
    .filter((entity) => entity.category === 'employer' || laborEntityIds.has(entity.id))
    .filter(
      (entity, index, all) =>
        all.findIndex((candidate) => {
          if (entity.taxId && candidate.taxId) return entity.taxId === candidate.taxId;
          return normalize(entity.name) === normalize(candidate.name);
        }) === index,
    )
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));

  if (!existing && candidates.length === 0) return undefined;

  const instances: EmployerInstance[] = [...(existing?.instances ?? [])];
  const additionalDetectedEmployers: EmploymentIncomeGroup['additionalDetectedEmployers'] = [];
  for (const entity of candidates) {
    const matched = instances.some(
      (instance) =>
        instance.entityId === entity.id ||
        (instance.manualMatchConfirmed &&
          normalize(instance.employerName) === normalize(entity.name)),
    );
    if (matched) continue;
    if (instances.length >= MAX_EMPLOYER_INSTANCES) {
      additionalDetectedEmployers.push({
        entityId: entity.id,
        employerName: entity.name,
        taxIdMasked: mask(entity.taxId),
      });
      continue;
    }
    instances.push({
      id: `employer:${entity.id}`,
      employerName: entity.name,
      taxIdMasked: mask(entity.taxId),
      workedPeriod: '',
      entityId: entity.id,
      form220DocumentId: null,
      complementaryDocumentIds: [],
      status: 'pending',
      coverage: 'not_evaluated',
      observations: '',
      source: 'detected',
      manualMatchConfirmed: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }
  const findings = additionalDetectedEmployers.length
    ? [
        {
          id: `employment-limit:${input.caseId}`,
          code: 'employment_employer_limit_exceeded' as const,
          severity: 'info' as const,
          message: `Se detectaron ${candidates.length} empleadores. La interfaz conserva tres instancias activas y ${additionalDetectedEmployers.length} entidades adicionales para una ampliacion futura.`,
          entityIds: additionalDetectedEmployers.map((item) => item.entityId),
        },
      ]
    : [];
  return {
    id: existing?.id ?? `employment-group:${input.caseId}`,
    caseId: input.caseId,
    title: 'Ingresos laborales y empleadores',
    receivedEmploymentIncome:
      existing?.receivedEmploymentIncome ?? (candidates.length ? true : null),
    instances,
    additionalDetectedEmployers,
    coverage: calculateEmploymentGroupCoverage(instances),
    findings,
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
  };
}

export function calculateCaseProgress(input: {
  result?: ProcessingResult;
  analysis?: CaseAnalysis;
  documents: readonly UploadedDocument[];
  coverages: readonly RequirementCoverage[];
  facts: readonly DocumentFact[];
  reconciliations: readonly PreliminaryReconciliation[];
  employmentGroup?: EmploymentIncomeGroup;
}): CaseProgress {
  const requirements = (input.result?.requirements ?? []).filter(
    (requirement) => !normalize(requirement.documentName).includes('formulario 220'),
  );
  let coveredWeight = requirements.reduce((sum, requirement) => {
    const statuses = input.coverages
      .filter((coverage) => coverage.requirementId === requirement.id)
      .map((coverage) => coverage.status);
    if (statuses.includes('covered') || statuses.includes('not_applicable')) return sum + 1;
    if (statuses.includes('partial')) return sum + 0.5;
    return sum;
  }, 0);
  const activeEmployers =
    input.employmentGroup?.instances.filter((item) => item.status !== 'not_applicable') ?? [];
  coveredWeight += activeEmployers.reduce(
    (sum, employer) =>
      sum + (employer.status === 'covered' ? 1 : employer.status === 'partially_covered' ? 0.5 : 0),
    0,
  );
  const requirementCount = requirements.length + activeEmployers.length;
  const reviewedFacts = input.facts.filter((fact) =>
    ['reviewed', 'confirmed'].includes(fact.reviewStatus),
  ).length;
  const reconciledFacts = new Set(
    input.reconciliations
      .filter(
        (item) => item.confirmedByHuman && ['reconciled', 'minor_difference'].includes(item.status),
      )
      .flatMap((item) => item.factIds),
  ).size;
  const resolvedFindingIds = new Set(
    (input.analysis?.resolutions ?? [])
      .filter((resolution) => !resolution.isObsolete && resolution.status !== 'pending_review')
      .map((resolution) => resolution.recordId),
  );
  const findings = input.result?.findings ?? [];
  const openFindings = findings.filter(
    (finding) => !finding.relatedRecordId || !resolvedFindingIds.has(finding.relatedRecordId),
  ).length;
  const groups = input.analysis?.matrix.groups ?? [];
  const pendingMatrixGroups = groups.filter(
    (group) =>
      !['reconciled', 'rounding_difference', 'not_comparable'].includes(group.reconciliationStatus),
  ).length;
  const pendingRequirements =
    requirements.filter((requirement) => {
      const statuses = input.coverages
        .filter((coverage) => coverage.requirementId === requirement.id)
        .map((coverage) => coverage.status);
      return !statuses.includes('covered') && !statuses.includes('not_applicable');
    }).length + activeEmployers.filter((item) => item.status !== 'covered').length;
  const explanation: string[] = [];
  if (pendingRequirements)
    explanation.push(`${pendingRequirements} requisitos requieren cobertura.`);
  if (openFindings) explanation.push(`${openFindings} hallazgos siguen abiertos.`);
  if (pendingMatrixGroups)
    explanation.push(`${pendingMatrixGroups} grupos de matriz no estan conciliados.`);
  if (input.facts.length === 0) explanation.push('Aun no hay hechos documentales registrados.');
  if (explanation.length === 0)
    explanation.push('El expediente esta preparado para revision humana final.');

  return {
    documentCoverage: percentage(coveredWeight, requirementCount),
    reviewedFacts: percentage(reviewedFacts, input.facts.length),
    reconciliation: percentage(reconciledFacts, input.facts.length),
    findings: percentage(Math.max(0, findings.length - openFindings), findings.length),
    matrixPreparation: percentage(groups.length - pendingMatrixGroups, groups.length),
    documentCount: input.documents.filter((document) => document.status === 'active').length,
    pendingRequirements,
    openFindings,
    pendingMatrixGroups,
    explanation,
  };
}

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function entityForRecord(
  record: ProcessingResult['normalizedRecords'][number],
  entities: ReportingEntity[],
) {
  return entities.find(
    (entity) =>
      (entity.taxId && entity.taxId === record.reportingEntityDocument) ||
      (!entity.taxId && entity.name === record.entityName),
  );
}

export function suggestReconciliations(input: {
  facts: readonly DocumentFact[];
  result?: ProcessingResult;
  products: readonly CaseProduct[];
}): ReconciliationSuggestion[] {
  if (!input.result) return [];
  const suggestions: ReconciliationSuggestion[] = [];
  for (const fact of input.facts) {
    for (const record of input.result.normalizedRecords) {
      if (record.reportedValue === null) continue;
      const signals: string[] = [];
      let score = 0;
      const entity = entityForRecord(record, input.result.entities);
      if (fact.entityId && entity?.id === fact.entityId) {
        score += 35;
        signals.push('misma entidad');
      }
      if (fact.category === record.category) {
        score += 25;
        signals.push('misma categoria');
      }
      const difference = Math.abs(fact.value - record.reportedValue);
      const base = Math.max(Math.abs(record.reportedValue), 1);
      const relative = difference / base;
      if (difference === 0) {
        score += 25;
        signals.push('valor igual');
      } else if (relative <= 0.01) {
        score += 15;
        signals.push('valor cercano');
      }
      const factWords = new Set(
        normalize(fact.originalConcept)
          .split(/\W+/)
          .filter((word) => word.length > 3),
      );
      const recordWords = normalize(record.conceptLabel ?? '').split(/\W+/);
      if (recordWords.some((word) => factWords.has(word))) {
        score += 10;
        signals.push('concepto relacionado');
      }
      const product = input.products.find((item) => item.id === fact.productId);
      if (
        product &&
        normalize(record.conceptLabel ?? '').includes(normalize(product.type).replaceAll('_', ' '))
      ) {
        score += 5;
        signals.push('mismo producto');
      }
      if (score < 40) continue;
      suggestions.push({
        id: `suggestion:${fact.id}:${record.id}`,
        factId: fact.id,
        exogenousRecordId: record.id,
        score,
        signals,
        exogenousValue: record.reportedValue,
        documentaryValue: fact.value,
        difference,
        differencePercentage:
          record.reportedValue === 0 ? null : (difference / Math.abs(record.reportedValue)) * 100,
      });
    }
  }
  return suggestions.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
}

function mask(value: string | null): string | null {
  if (!value) return null;
  return `${'•'.repeat(Math.max(4, value.length - 4))}${value.slice(-4)}`;
}

export function buildEntitySummaries(input: {
  result?: ProcessingResult;
  documents: readonly UploadedDocument[];
  coverages: readonly RequirementCoverage[];
  facts: readonly DocumentFact[];
  reconciliations: readonly PreliminaryReconciliation[];
}): CaseEntitySummary[] {
  if (!input.result) return [];
  return input.result.entities.map((entity) => {
    const requirements = input.result!.requirements.filter(
      (requirement) => requirement.entityName === entity.name,
    );
    const requirementIds = new Set(requirements.map((requirement) => requirement.id));
    const entityCoverages = input.coverages.filter(
      (coverage) => coverage.entityId === entity.id || requirementIds.has(coverage.requirementId),
    );
    const covered = requirements.filter((requirement) =>
      entityCoverages.some(
        (coverage) =>
          coverage.requirementId === requirement.id &&
          ['covered', 'not_applicable'].includes(coverage.status),
      ),
    ).length;
    const facts = input.facts.filter((fact) => fact.entityId === entity.id);
    const factIds = new Set(facts.map((fact) => fact.id));
    const reconciliationCount = input.reconciliations.filter((item) =>
      item.factIds.some((id) => factIds.has(id)),
    ).length;
    const recordIds = new Set(
      input
        .result!.normalizedRecords.filter(
          (record) => entityForRecord(record, input.result!.entities)?.id === entity.id,
        )
        .map((record) => record.id),
    );
    const entityRecords = input.result!.normalizedRecords.filter((record) =>
      recordIds.has(record.id),
    );
    const inferredProducts = new Set<string>();
    for (const record of entityRecords) {
      if (record.category === 'card_consumption') inferredProducts.add('Tarjeta de crédito');
      if (record.category === 'investment_asset') inferredProducts.add('Fondo o inversión');
      if (record.category === 'investment_movement')
        inferredProducts.add('CDT o inversión por identificar');
      if (record.category === 'employment_income') inferredProducts.add('Ingreso laboral');
      if (record.category === 'liability') inferredProducts.add('Crédito o deuda por identificar');
      if (record.category === 'asset' && entity.category === 'bank')
        inferredProducts.add('Cuenta bancaria por identificar');
    }
    const openFindingCount = input.result!.findings.filter(
      (finding) => finding.relatedRecordId && recordIds.has(finding.relatedRecordId),
    ).length;
    return {
      id: entity.id,
      name: entity.name,
      taxIdMasked: mask(entity.taxId),
      category: entity.category,
      exogenousRecordCount: entity.recordCount,
      documentCount: input.documents.filter((document) => document.entityIds.includes(entity.id))
        .length,
      requirementCount: requirements.length,
      coveredRequirementCount: covered,
      factCount: facts.length,
      reconciliationCount,
      openFindingCount,
      coveragePercentage: percentage(covered, requirements.length),
      inferredProducts: [...inferredProducts].sort(),
      status:
        covered === requirements.length && openFindingCount === 0 ? 'al_dia' : 'requiere_revision',
    };
  });
}

export function buildTaxCaseManifest(input: {
  taxCase: TaxCase;
  result?: ProcessingResult;
  analysis?: CaseAnalysis;
  documents: readonly UploadedDocument[];
  products: readonly CaseProduct[];
  coverages: readonly RequirementCoverage[];
  facts: readonly DocumentFact[];
  reconciliations: readonly PreliminaryReconciliation[];
  employmentGroup?: EmploymentIncomeGroup;
}) {
  return {
    schema: 'nexustax.tax-case.manifest',
    schemaVersion: TAX_CASE_EXPORT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    includesBinaryData: false as const,
    taxCase: input.taxCase,
    exogenous: input.result ?? null,
    analysis: input.analysis ?? null,
    documents: input.documents,
    products: input.products,
    coverages: input.coverages,
    facts: input.facts,
    reconciliations: input.reconciliations,
    employmentIncomeGroup: input.employmentGroup ?? null,
  };
}
