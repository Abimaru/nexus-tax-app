import type {
  AcceptedExogenousValue,
  CaseAnalysis,
  CaseEntitySummary,
  CaseProgress,
  CaseTask,
  DocumentFact,
  PreliminaryReconciliation,
  ProcessingResult,
  ReconciliationSuggestion,
  ReportingEntity,
  RequirementCoverage,
  RequirementSourceDecision,
  TaxCase,
  UploadedDocument,
  CaseProduct,
  CaseNavigationState,
  EmploymentIncomeGroup,
  EmployerInstance,
  DocumentExtractionSession,
  DocumentFactCandidate,
  DocumentProfile,
  ExtractionFeedback,
  TaxResolutionDecision,
} from '@nexus-tax/domain';
import { deriveForm210BoxTasks, type Form210Draft } from '@nexus-tax/form-210';
import { MAX_EMPLOYER_INSTANCES, TAX_CASE_EXPORT_SCHEMA_VERSION } from '@nexus-tax/domain';
import { compareCaseTasks } from './caseTaskPriority';

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
  requirementSourceDecisions?: readonly RequirementSourceDecision[];
}): CaseProgress {
  const requirements = (input.result?.requirements ?? []).filter(
    (requirement) => !normalize(requirement.documentName).includes('formulario 220'),
  );
  let coveredWeight = requirements.reduce((sum, requirement) => {
    const sourceDecision = input.requirementSourceDecisions?.find(
      (decision) => decision.requirementId === requirement.id,
    );
    if (
      sourceDecision &&
      ['alternative_source_covered', 'justified_unavailable'].includes(sourceDecision.status)
    )
      return sum + 1;
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
      if (
        input.requirementSourceDecisions?.some(
          (decision) => decision.requirementId === requirement.id,
        )
      )
        return false;
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

export function buildCaseTasks(input: {
  caseId: string;
  result?: ProcessingResult;
  analysis?: CaseAnalysis;
  documents: readonly UploadedDocument[];
  coverages: readonly RequirementCoverage[];
  candidates: readonly DocumentFactCandidate[];
  extractionSessions?: readonly DocumentExtractionSession[];
  documentProfiles?: readonly DocumentProfile[];
  extractionFeedback?: readonly ExtractionFeedback[];
  resolutionDecisions?: readonly TaxResolutionDecision[];
  form210Draft?: Form210Draft;
  reconciliations: readonly PreliminaryReconciliation[];
  requirementSourceDecisions?: readonly RequirementSourceDecision[];
  vatResponsibility: boolean | null;
  now?: string;
}): CaseTask[] {
  const timestamp = input.now ?? new Date().toISOString();
  const tasks: CaseTask[] = [];
  const activeDocumentIds = new Set(
    input.documents
      .filter((document) => document.status === 'active')
      .map((document) => document.id),
  );
  const latestSessions = new Map<string, DocumentExtractionSession>();
  for (const session of input.extractionSessions ?? []) {
    if (!activeDocumentIds.has(session.documentId)) continue;
    const current = latestSessions.get(session.documentId);
    if (!current || session.runNumber > current.runNumber)
      latestSessions.set(session.documentId, session);
  }
  for (const session of latestSessions.values()) {
    const outcomes = new Map((session.ocrOutcomes ?? []).map((outcome) => [outcome.page, outcome]));
    for (const page of session.diagnosis?.pages ?? []) {
      const outcome = outcomes.get(page.pageNumber);
      if (outcome?.status === 'failed') {
        tasks.push({
          id: `task:ocr-recovery:${session.id}:${page.pageNumber}`,
          caseId: input.caseId,
          type: 'recover_document_extraction',
          title: `Recuperar OCR de la página ${page.pageNumber}`,
          explanation: 'El reconocimiento local falló y requiere una decisión de recuperación.',
          source: 'ocr',
          stage: 'organizacion',
          view: 'laboratorio',
          entityId: null,
          documentId: session.documentId,
          requirementId: null,
          candidateId: null,
          reconciliationId: null,
          matrixGroupId: null,
          extractionSessionId: session.id,
          profileId: null,
          page: page.pageNumber,
          priority: 'high',
          blocking: false,
          status: 'pending',
          recommendedAction: 'Abrir opciones de recuperación',
          ruleId: 'case-task.ocr-recovery.v1',
          evidence: [outcome.errorCode ?? 'Fallo local sin código'],
          createdAt: timestamp,
          updatedAt: timestamp,
        });
        continue;
      }
      if (
        outcome?.status === 'completed' &&
        ['contradiction', 'requires_review'].includes(outcome.comparisonStatus ?? '')
      ) {
        tasks.push({
          id: `task:ocr-contradiction:${session.id}:${page.pageNumber}`,
          caseId: input.caseId,
          type: 'review_ocr_contradiction',
          title: `Revisar contradicción en la página ${page.pageNumber}`,
          explanation: 'El texto nativo y el OCR no ofrecen una lectura inequívoca.',
          source: 'ocr',
          stage: 'organizacion',
          view: 'laboratorio',
          entityId: null,
          documentId: session.documentId,
          requirementId: null,
          candidateId: null,
          reconciliationId: null,
          matrixGroupId: null,
          extractionSessionId: session.id,
          profileId: null,
          page: page.pageNumber,
          priority: 'high',
          blocking: true,
          status: 'pending',
          recommendedAction: 'Comparar ambas lecturas',
          ruleId: 'case-task.ocr-contradiction.v1',
          evidence: [`Página ${page.pageNumber} · ${outcome.comparisonStatus}`],
          createdAt: timestamp,
          updatedAt: timestamp,
        });
        continue;
      }
      if (
        (!outcome || outcome.status === 'cancelled') &&
        (page.type === 'scanned' || page.type === 'insufficient_text')
      ) {
        tasks.push({
          id: `task:page-ocr:${session.id}:${page.pageNumber}`,
          caseId: input.caseId,
          type: 'run_page_ocr',
          title: `Revisar página ${page.pageNumber} con OCR`,
          explanation:
            page.type === 'scanned'
              ? 'La página parece escaneada y no contiene texto seleccionable.'
              : 'La página contiene texto insuficiente para una lectura confiable.',
          source: 'ocr',
          stage: 'organizacion',
          view: 'laboratorio',
          entityId: null,
          documentId: session.documentId,
          requirementId: null,
          candidateId: null,
          reconciliationId: null,
          matrixGroupId: null,
          extractionSessionId: session.id,
          profileId: null,
          page: page.pageNumber,
          priority: 'medium',
          blocking: false,
          status: 'pending',
          recommendedAction: 'Abrir página en el laboratorio',
          ruleId: 'case-task.page-ocr.v1',
          evidence: [`Página ${page.pageNumber} · ${page.type}`],
          createdAt: timestamp,
          updatedAt: timestamp,
        });
      }
    }
  }
  const profilesById = new Map(
    (input.documentProfiles ?? []).map((profile) => [profile.id, profile]),
  );
  const profileTaskIds = new Set<string>();
  for (const feedback of input.extractionFeedback ?? []) {
    if (!feedback.profileId || feedback.applicability !== 'profile_update') continue;
    const profile = profilesById.get(feedback.profileId);
    if (!profile || profile.status !== 'draft' || !activeDocumentIds.has(feedback.documentId))
      continue;
    const taskId = `task:profile:${profile.id}:${feedback.documentId}`;
    if (profileTaskIds.has(taskId)) continue;
    profileTaskIds.add(taskId);
    tasks.push({
      id: taskId,
      caseId: input.caseId,
      type: 'test_document_profile',
      title: `Probar perfil ${profile.name}`,
      explanation: 'El perfil está en borrador y necesita validación explícita con este formato.',
      source: 'profile',
      stage: 'organizacion',
      view: 'laboratorio',
      entityId: profile.entityId,
      documentId: feedback.documentId,
      requirementId: null,
      candidateId: feedback.candidateId,
      reconciliationId: null,
      matrixGroupId: null,
      extractionSessionId: feedback.extractionSessionId,
      profileId: profile.id,
      page: feedback.page,
      priority: 'low',
      blocking: false,
      status: 'pending',
      recommendedAction: 'Revisar y probar perfil',
      ruleId: 'case-task.document-profile-test.v1',
      evidence: [feedback.reason],
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }
  for (const candidate of input.candidates) {
    if (!activeDocumentIds.has(candidate.documentId)) continue;
    if (!['pending', 'requires_review'].includes(candidate.status)) continue;
    tasks.push({
      id: `task:candidate:${candidate.id}`,
      caseId: input.caseId,
      type: candidate.proposedEntityId
        ? candidate.proposedProductId
          ? 'confirm_candidate'
          : 'identify_product'
        : 'associate_entity',
      title: candidate.proposedProductId
        ? `Confirmar ${candidate.originalConcept}`
        : candidate.proposedEntityId
          ? `Identificar producto de ${candidate.originalConcept}`
          : `Asociar entidad a ${candidate.originalConcept}`,
      explanation: `El valor documental de la página ${candidate.page} todavía no afecta la matriz.`,
      source: 'candidate',
      stage: 'organizacion',
      view: 'revision-documental',
      entityId: candidate.proposedEntityId,
      documentId: candidate.documentId,
      requirementId: candidate.suggestedRequirementIds[0] ?? null,
      candidateId: candidate.id,
      reconciliationId: null,
      matrixGroupId: null,
      extractionSessionId: candidate.extractionSessionId,
      profileId: null,
      page: candidate.page,
      priority: candidate.confidence.level === 'low' ? 'high' : 'medium',
      blocking: true,
      status: 'pending',
      recommendedAction: 'Revisar candidato documental',
      ruleId: 'case-task.pending-document-candidate.v1',
      evidence: [candidate.evidence.excerpt],
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }
  for (const requirement of input.result?.requirements ?? []) {
    if (
      input.requirementSourceDecisions?.some(
        (decision) => decision.requirementId === requirement.id,
      )
    )
      continue;
    const statuses = input.coverages
      .filter((coverage) => coverage.requirementId === requirement.id)
      .map((coverage) => coverage.status);
    if (statuses.includes('covered') || statuses.includes('not_applicable')) continue;
    const partial = statuses.includes('partial');
    const entity = input.result?.entities.find((item) => item.name === requirement.entityName);
    tasks.push({
      id: `task:requirement:${requirement.id}`,
      caseId: input.caseId,
      type: 'cover_requirement',
      title: `${partial ? 'Completar' : 'Cubrir'} ${requirement.documentName}`,
      explanation:
        `${requirement.reason} ${partial ? 'La cobertura actual es parcial.' : ''}`.trim(),
      source: 'requirement',
      stage: 'organizacion',
      view: 'requisitos',
      entityId: entity?.id ?? null,
      documentId: null,
      requirementId: requirement.id,
      candidateId: null,
      reconciliationId: null,
      matrixGroupId: null,
      extractionSessionId: null,
      profileId: null,
      page: null,
      priority: requirement.confidence === 'high' ? 'high' : 'medium',
      blocking: true,
      status: 'pending',
      recommendedAction: partial ? 'Completar cobertura documental' : 'Cargar o asociar soporte',
      ruleId: 'case-task.requirement-coverage.v1',
      evidence: [requirement.reason],
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }
  for (const reconciliation of input.reconciliations) {
    if (
      reconciliation.confirmedByHuman &&
      ['reconciled', 'minor_difference'].includes(reconciliation.status)
    )
      continue;
    tasks.push({
      id: `task:reconciliation:${reconciliation.id}`,
      caseId: input.caseId,
      type: 'reconcile_value',
      title: 'Resolver conciliación documental',
      explanation: reconciliation.explanation,
      source: 'matrix',
      stage: 'conciliacion',
      view: 'conciliaciones',
      entityId: null,
      documentId: null,
      requirementId: null,
      candidateId: null,
      reconciliationId: reconciliation.id,
      matrixGroupId: null,
      extractionSessionId: null,
      profileId: null,
      page: null,
      priority: reconciliation.status === 'relevant_difference' ? 'high' : 'medium',
      blocking: true,
      status: 'pending',
      recommendedAction: 'Revisar evidencia y confirmar conciliación',
      ruleId: 'case-task.reconciliation.v1',
      evidence: [reconciliation.explanation],
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }
  for (const group of input.analysis?.matrix.groups ?? []) {
    if (
      ['reconciled', 'rounding_difference', 'not_comparable'].includes(group.reconciliationStatus)
    )
      continue;
    tasks.push({
      id: `task:matrix:${group.id}`,
      caseId: input.caseId,
      type: 'resolve_matrix_group',
      title: `Resolver ${group.label}`,
      explanation: group.recommendedAction,
      source: 'matrix',
      stage: 'conciliacion',
      view: 'matriz',
      entityId: null,
      documentId: null,
      requirementId: null,
      candidateId: null,
      reconciliationId: null,
      matrixGroupId: group.id,
      extractionSessionId: null,
      profileId: null,
      page: null,
      priority: group.reconciliationStatus === 'relevant_difference' ? 'high' : 'medium',
      blocking: group.pendingCount > 0,
      status: 'pending',
      recommendedAction: group.recommendedAction,
      ruleId: 'case-task.matrix-group.v1',
      evidence: group.warnings,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }

  const form210Draft = input.form210Draft;
  if (form210Draft) {
    const boxTemplates = deriveForm210BoxTasks(form210Draft);
    const boxByNumber = new Map(form210Draft.boxes.map((box) => [box.number, box]));
    for (const template of boxTemplates) {
      const box = boxByNumber.get(template.formBoxNumber);
      tasks.push({
        id: `task:${input.caseId}:form210:${template.formBoxNumber}`,
        caseId: input.caseId,
        type: template.type,
        title: template.title,
        explanation: template.explanation,
        source: template.source,
        stage: template.stage,
        view: template.view,
        entityId: null,
        documentId: null,
        requirementId: null,
        candidateId: null,
        reconciliationId: null,
        matrixGroupId: null,
        extractionSessionId: null,
        profileId: null,
        page: null,
        formBoxNumber: template.formBoxNumber,
        resolutionDecisionId: box?.resolutionId ?? null,
        priority: template.priority,
        blocking: template.blocking,
        status: 'pending',
        recommendedAction: template.recommendedAction,
        ruleId: `${form210Draft.ruleVersion}.${template.ruleId}`,
        evidence: box?.sources.map((source) => source.evidence) ?? [],
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }
  }
  if (input.result && input.vatResponsibility === null) {
    tasks.push({
      id: `task:filing:vat:${input.caseId}`,
      caseId: input.caseId,
      type: 'confirm_vat',
      title: 'Confirmar responsabilidad de IVA',
      explanation: 'La condición al 31 de diciembre no puede inferirse del archivo exógeno.',
      source: 'filing',
      stage: 'declaracion',
      view: 'obligacion',
      entityId: null,
      documentId: null,
      requirementId: null,
      candidateId: null,
      reconciliationId: null,
      matrixGroupId: null,
      extractionSessionId: null,
      profileId: null,
      page: null,
      priority: 'high',
      blocking: true,
      status: 'pending',
      recommendedAction: 'Responder la pregunta de IVA',
      ruleId: 'case-task.vat-confirmation.v1',
      evidence: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }
  const replacedDecisionIds = new Set(
    (input.resolutionDecisions ?? [])
      .map((decision) => decision.replacesDecisionId)
      .filter((id): id is string => Boolean(id)),
  );
  const resolvedTargets = new Set(
    (input.resolutionDecisions ?? [])
      .filter(
        (decision) =>
          !replacedDecisionIds.has(decision.id) &&
          !['leave_pending', 'revert_decision', 'restore_automatic_value'].includes(decision.type),
      )
      .map((decision) => `${decision.objectType}:${decision.objectId}`),
  );
  const targetForTask = (task: CaseTask): string | null => {
    if (task.formBoxNumber) return `form_box:${task.formBoxNumber}`;
    if (task.matrixGroupId) return `matrix_group:${task.matrixGroupId}`;
    if (task.reconciliationId) return `reconciliation:${task.reconciliationId}`;
    if (task.candidateId) return `candidate:${task.candidateId}`;
    if (task.requirementId) return `requirement:${task.requirementId}`;
    return null;
  };
  return tasks
    .filter((task) => {
      const target = targetForTask(task);
      return !target || !resolvedTargets.has(target);
    })
    .sort(compareCaseTasks);
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
      legalName: entity.legalName ?? entity.name,
      brandName: entity.brandName ?? null,
      groupName: entity.groupName ?? null,
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
  navigation?: CaseNavigationState;
  acceptedSources?: readonly AcceptedExogenousValue[];
  requirementSourceDecisions?: readonly RequirementSourceDecision[];
  extractionSessions?: readonly DocumentExtractionSession[];
  documentCandidates?: readonly DocumentFactCandidate[];
  tasks?: readonly CaseTask[];
  documentProfiles?: readonly DocumentProfile[];
  extractionFeedback?: readonly ExtractionFeedback[];
  resolutionDecisions?: readonly TaxResolutionDecision[];
  form210Draft?: Form210Draft;
}) {
  const latestSessions = new Map<string, DocumentExtractionSession>();
  for (const session of input.extractionSessions ?? []) {
    const current = latestSessions.get(session.documentId);
    if (!current || session.runNumber > current.runNumber)
      latestSessions.set(session.documentId, session);
  }
  const sessions = [...latestSessions.values()];
  const linkedProfileIds = new Set(
    (input.extractionFeedback ?? [])
      .map((item) => item.profileId)
      .filter((profileId): profileId is string => Boolean(profileId)),
  );
  const linkedProfiles = (input.documentProfiles ?? []).filter((profile) =>
    linkedProfileIds.has(profile.id),
  );
  const countProfileStatus = (status: DocumentProfile['status']) =>
    linkedProfiles.filter((profile) => profile.status === status).length;
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
    workflow: input.navigation ?? null,
    acceptedSources: input.acceptedSources ?? [],
    requirementSourceDecisions: input.requirementSourceDecisions ?? [],
    documentExtraction: {
      sessions: input.extractionSessions ?? [],
      candidates: input.documentCandidates ?? [],
      includesFullText: false as const,
      includesPasswords: false as const,
      includesRenderedImages: false as const,
      metrics: {
        pagesRecommendedForOcr: sessions.reduce(
          (total, session) => total + (session.metrics?.pagesRecommendedForOcr ?? 0),
          0,
        ),
        pagesProcessedWithOcr: sessions.reduce(
          (total, session) => total + (session.metrics?.pagesProcessedWithOcr ?? 0),
          0,
        ),
        ocrFailures: sessions.reduce(
          (total, session) => total + (session.metrics?.ocrFailures ?? 0),
          0,
        ),
        ocrContradictions: sessions.reduce(
          (total, session) => total + (session.metrics?.ocrContradictions ?? 0),
          0,
        ),
        nativeCandidates: sessions.reduce(
          (total, session) => total + (session.metrics?.nativeCandidates ?? 0),
          0,
        ),
        ocrCandidates: sessions.reduce(
          (total, session) => total + (session.metrics?.ocrCandidates ?? 0),
          0,
        ),
        manualCandidates: sessions.reduce(
          (total, session) => total + (session.metrics?.manualCandidates ?? 0),
          0,
        ),
        linkedProfiles: linkedProfiles.length,
        profilesByStatus: {
          draft: countProfileStatus('draft'),
          tested: countProfileStatus('tested'),
          active: countProfileStatus('active'),
          obsolete: countProfileStatus('obsolete'),
        },
        feedbackRecords: input.extractionFeedback?.length ?? 0,
      },
    },
    tasks: input.tasks ?? [],
    resolutionDecisions: input.resolutionDecisions ?? [],
    form210Draft: input.form210Draft ?? null,
  };
}
