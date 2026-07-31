import type {
  CaseAnalysis,
  ClassificationSnapshot,
  CreateTaxCaseInput,
  ProcessingResult,
  RecordResolution,
  RequirementStatus,
  ResolutionStatus,
  TaxCase,
  TaxCaseStatus,
  UploadedDocument,
} from '@nexus-tax/domain';
import type { FilingObligationInputs } from '@nexus-tax/aegis-rules';
import {
  ANALYSIS_RULE_VERSION,
  automaticClassificationSnapshot,
  buildTaxMatrix,
} from '@nexus-tax/exogenous-parser';
import { getDb, type StoredResult } from './db';
import { newId, nowIso } from './id';

/**
 * Repositorio de acceso a datos locales. Envuelve Dexie con operaciones de
 * dominio para que los componentes no hablen directamente con la base.
 */

export async function createCase(input: CreateTaxCaseInput): Promise<TaxCase> {
  const db = getDb();
  const timestamp = nowIso();
  const taxCase: TaxCase = {
    id: newId('case'),
    alias: input.alias.trim(),
    taxYear: input.taxYear,
    notes: input.notes?.trim() || undefined,
    status: 'draft',
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  await db.cases.add(taxCase);
  return taxCase;
}

export async function listCases(): Promise<TaxCase[]> {
  const db = getDb();
  const cases = await db.cases.toArray();
  return cases.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getCase(caseId: string): Promise<TaxCase | undefined> {
  return getDb().cases.get(caseId);
}

export async function updateCaseStatus(caseId: string, status: TaxCaseStatus): Promise<void> {
  await getDb().cases.update(caseId, { status, updatedAt: nowIso() });
}

export async function deleteCase(caseId: string): Promise<void> {
  const db = getDb();
  await db.transaction(
    'rw',
    db.cases,
    db.documents,
    db.results,
    db.filingInputs,
    db.analyses,
    async () => {
      await db.results.delete(caseId);
      await db.filingInputs.delete(caseId);
      await db.analyses.delete(caseId);
      await db.documents.where('caseId').equals(caseId).delete();
      await db.cases.delete(caseId);
    },
  );
}

export async function getFilingInputs(caseId: string) {
  return getDb().filingInputs.get(caseId);
}

export async function saveVatResponsibility(
  caseId: string,
  value: FilingObligationInputs['isVatResponsibleAtYearEnd'],
): Promise<void> {
  await getDb().filingInputs.put({
    caseId,
    isVatResponsibleAtYearEnd: value,
    updatedAt: nowIso(),
  });
}

export async function saveDocument(doc: UploadedDocument): Promise<void> {
  await getDb().documents.put(doc);
}

export async function listDocuments(caseId: string): Promise<UploadedDocument[]> {
  return getDb().documents.where('caseId').equals(caseId).toArray();
}

export async function saveResult(caseId: string, result: ProcessingResult): Promise<void> {
  const db = getDb();
  const timestamp = nowIso();
  const stored: StoredResult = { caseId, result, updatedAt: timestamp };
  const priorAnalysis = await db.analyses.get(caseId);
  const analysis = reconcileAnalysis(caseId, result, priorAnalysis, timestamp);
  await db.transaction('rw', db.results, db.analyses, db.cases, async () => {
    await db.results.put(stored);
    await db.analyses.put(analysis);
    await db.cases.update(caseId, { status: 'ready', updatedAt: timestamp });
  });
}

export async function getResult(caseId: string): Promise<ProcessingResult | undefined> {
  const stored = await getDb().results.get(caseId);
  return stored?.result;
}

function snapshotChanged(a: ClassificationSnapshot, b: ClassificationSnapshot): boolean {
  return (
    a.category !== b.category ||
    a.nature !== b.nature ||
    a.treatment !== b.treatment ||
    a.confidence !== b.confidence
  );
}

function reconcileAnalysis(
  caseId: string,
  result: ProcessingResult,
  prior: CaseAnalysis | undefined,
  timestamp: string,
): CaseAnalysis {
  const relationships = result.relationships.map((relationship) => {
    const previous = prior?.relationships.find((item) => item.id === relationship.id);
    return previous ? { ...relationship, reviewStatus: previous.reviewStatus } : relationship;
  });
  const resolutions = (prior?.resolutions ?? []).map((resolution) => {
    const record = result.normalizedRecords.find((item) => item.id === resolution.recordId);
    if (!record) {
      return {
        ...resolution,
        isObsolete: true,
        obsoleteReason: 'El registro ya no existe después del reprocesamiento.',
      };
    }
    const currentAutomatic = automaticClassificationSnapshot(record);
    const obsolete =
      resolution.ruleVersion !== ANALYSIS_RULE_VERSION ||
      snapshotChanged(resolution.automaticClassification, currentAutomatic);
    return {
      ...resolution,
      automaticClassification: currentAutomatic,
      isObsolete: obsolete,
      obsoleteReason: obsolete
        ? 'La regla o clasificación automática cambió; revisa esta decisión antes de aplicarla.'
        : null,
    };
  });
  const matrix = buildTaxMatrix({
    records: result.normalizedRecords,
    thresholds: result.report.thresholds,
    relationships,
    findings: result.findings,
    resolutions,
    generatedAt: timestamp,
  });
  return {
    caseId,
    relationships,
    resolutions,
    matrix,
    ruleVersion: ANALYSIS_RULE_VERSION,
    sourceParserVersion: result.parserVersion,
    updatedAt: timestamp,
  };
}

export async function getCaseAnalysis(caseId: string): Promise<CaseAnalysis | undefined> {
  const db = getDb();
  const stored = await db.analyses.get(caseId);
  if (stored) return stored;
  const result = await getResult(caseId);
  if (!result) return undefined;
  const timestamp = nowIso();
  const analysis = reconcileAnalysis(caseId, result, undefined, timestamp);
  await db.analyses.put(analysis);
  return analysis;
}

export interface SaveRecordResolutionInput {
  status: Exclude<ResolutionStatus, 'automatically_resolved'>;
  finalClassification?: ClassificationSnapshot;
  observation?: string;
  justification?: string;
}

function requiresJustification(
  status: SaveRecordResolutionInput['status'],
  automatic: ClassificationSnapshot,
  finalClassification: ClassificationSnapshot,
): boolean {
  return (
    status === 'excluded_justified' ||
    status === 'ignored_justified' ||
    (status === 'analyst_modified' && snapshotChanged(automatic, finalClassification))
  );
}

export async function saveRecordResolution(
  caseId: string,
  recordId: string,
  input: SaveRecordResolutionInput,
): Promise<RecordResolution> {
  const db = getDb();
  const storedResult = await db.results.get(caseId);
  if (!storedResult) throw new Error('No existe un resultado para resolver.');
  const record = storedResult.result.normalizedRecords.find((item) => item.id === recordId);
  if (!record) throw new Error('El registro afectado ya no existe.');
  const timestamp = nowIso();
  const analysis =
    (await getCaseAnalysis(caseId)) ??
    reconcileAnalysis(caseId, storedResult.result, undefined, timestamp);
  const automatic = automaticClassificationSnapshot(record);
  const existing = analysis.resolutions.find((item) => item.recordId === recordId);
  const justification = input.justification?.trim() ?? '';
  const observation = input.observation?.trim() ?? '';
  const requestedClassification =
    input.finalClassification ?? existing?.finalClassification ?? automatic;
  const finalClassification =
    input.status === 'analyst_modified' && snapshotChanged(automatic, requestedClassification)
      ? {
          ...requestedClassification,
          evidence: [
            ...requestedClassification.evidence,
            {
              kind: 'analyst_decision' as const,
              value: justification || observation || 'Clasificación modificada manualmente',
            },
          ],
        }
      : requestedClassification;
  if (requiresJustification(input.status, automatic, finalClassification) && justification === '') {
    throw new Error('La decisión seleccionada requiere una justificación.');
  }
  const affectedRelationIds = analysis.relationships
    .filter((item) => item.sourceRecordId === recordId || item.targetRecordId === recordId)
    .map((item) => item.id);
  const decision = {
    id: newId('decision'),
    status: input.status,
    classification: finalClassification,
    observation,
    justification,
    decidedAt: timestamp,
    ruleVersion: ANALYSIS_RULE_VERSION,
    origin: 'manual' as const,
  };
  const resolution: RecordResolution = {
    recordId,
    status: input.status,
    automaticClassification: automatic,
    finalClassification,
    observation,
    justification,
    resolvedAt: input.status === 'pending_review' ? null : timestamp,
    ruleVersion: ANALYSIS_RULE_VERSION,
    origin: 'manual',
    affectedRecordIds: [recordId],
    affectedRelationIds,
    isObsolete: false,
    obsoleteReason: null,
    history: [...(existing?.history ?? []), decision],
  };
  const resolutions = [
    ...analysis.resolutions.filter((item) => item.recordId !== recordId),
    resolution,
  ].sort((a, b) => a.recordId.localeCompare(b.recordId));
  const matrix = buildTaxMatrix({
    records: storedResult.result.normalizedRecords,
    thresholds: storedResult.result.report.thresholds,
    relationships: analysis.relationships,
    findings: storedResult.result.findings,
    resolutions,
    generatedAt: timestamp,
  });
  await db.analyses.put({ ...analysis, resolutions, matrix, updatedAt: timestamp });
  return resolution;
}

export async function restoreAutomaticClassification(
  caseId: string,
  recordId: string,
  observation = 'Clasificación automática restaurada.',
): Promise<RecordResolution> {
  const db = getDb();
  const storedResult = await db.results.get(caseId);
  if (!storedResult) throw new Error('No existe un resultado para restaurar.');
  const record = storedResult.result.normalizedRecords.find((item) => item.id === recordId);
  if (!record) throw new Error('El registro afectado ya no existe.');
  const analysis = await getCaseAnalysis(caseId);
  if (!analysis) throw new Error('No existe análisis para restaurar.');
  const automatic = automaticClassificationSnapshot(record);
  const existing = analysis.resolutions.find((item) => item.recordId === recordId);
  const timestamp = nowIso();
  const decision = {
    id: newId('decision'),
    status: 'automatically_resolved' as const,
    classification: automatic,
    observation,
    justification: 'Restauración explícita de la propuesta automática.',
    decidedAt: timestamp,
    ruleVersion: ANALYSIS_RULE_VERSION,
    origin: 'manual' as const,
  };
  const resolution: RecordResolution = {
    recordId,
    status: 'automatically_resolved',
    automaticClassification: automatic,
    finalClassification: automatic,
    observation,
    justification: decision.justification,
    resolvedAt: timestamp,
    ruleVersion: ANALYSIS_RULE_VERSION,
    origin: 'manual',
    affectedRecordIds: [recordId],
    affectedRelationIds: analysis.relationships
      .filter((item) => item.sourceRecordId === recordId || item.targetRecordId === recordId)
      .map((item) => item.id),
    isObsolete: false,
    obsoleteReason: null,
    history: [...(existing?.history ?? []), decision],
  };
  const resolutions = [
    ...analysis.resolutions.filter((item) => item.recordId !== recordId),
    resolution,
  ].sort((a, b) => a.recordId.localeCompare(b.recordId));
  const matrix = buildTaxMatrix({
    records: storedResult.result.normalizedRecords,
    thresholds: storedResult.result.report.thresholds,
    relationships: analysis.relationships,
    findings: storedResult.result.findings,
    resolutions,
    generatedAt: timestamp,
  });
  await db.analyses.put({ ...analysis, resolutions, matrix, updatedAt: timestamp });
  return resolution;
}

export async function restoreAutomaticAnalysis(caseId: string): Promise<void> {
  const db = getDb();
  const storedResult = await db.results.get(caseId);
  if (!storedResult) return;
  const timestamp = nowIso();
  await db.analyses.put(reconcileAnalysis(caseId, storedResult.result, undefined, timestamp));
}

/** Actualiza el estado de un requisito documental dentro del resultado persistido. */
export async function updateRequirementStatus(
  caseId: string,
  requirementId: string,
  status: RequirementStatus,
): Promise<void> {
  const db = getDb();
  const stored = await db.results.get(caseId);
  if (!stored) return;
  const requirements = stored.result.requirements.map((req) =>
    req.id === requirementId ? { ...req, status } : req,
  );
  const next = { ...stored, result: { ...stored.result, requirements }, updatedAt: nowIso() };
  await db.results.put(next);
}

export interface LocalPdfDescriptor {
  name: string;
  size: number;
  type: string;
}

/** Asocia únicamente metadatos del PDF; el binario nunca se persiste. */
export async function attachRequirementPdf(
  caseId: string,
  requirementId: string,
  file: LocalPdfDescriptor,
): Promise<void> {
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  if (!isPdf) throw new Error('Selecciona un archivo PDF válido.');
  const db = getDb();
  const stored = await db.results.get(caseId);
  if (!stored) throw new Error('No existe un resultado para asociar el PDF.');
  const attachment = {
    id: newId('attachment'),
    fileName: file.name,
    fileSizeBytes: file.size,
    mimeType: 'application/pdf' as const,
    attachedAt: nowIso(),
  };
  const requirements = stored.result.requirements.map((requirement) =>
    requirement.id === requirementId
      ? { ...requirement, attachment, status: 'received' as const }
      : requirement,
  );
  await db.results.put({
    ...stored,
    result: { ...stored.result, requirements },
    updatedAt: nowIso(),
  });
}

export async function removeRequirementPdf(caseId: string, requirementId: string): Promise<void> {
  const db = getDb();
  const stored = await db.results.get(caseId);
  if (!stored) return;
  const requirements = stored.result.requirements.map((requirement) =>
    requirement.id === requirementId
      ? { ...requirement, attachment: null, status: 'pending' as const }
      : requirement,
  );
  await db.results.put({
    ...stored,
    result: { ...stored.result, requirements },
    updatedAt: nowIso(),
  });
}

/** Borra TODA la información local (§12: botón "limpiar todo"). */
export async function clearAllData(): Promise<void> {
  const db = getDb();
  await db.transaction(
    'rw',
    db.cases,
    db.documents,
    db.results,
    db.filingInputs,
    db.analyses,
    async () => {
      await db.results.clear();
      await db.filingInputs.clear();
      await db.analyses.clear();
      await db.documents.clear();
      await db.cases.clear();
    },
  );
}
