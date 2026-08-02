import type {
  AcceptedExogenousValue,
  AcceptedSourceStatus,
  CaseAnalysis,
  CaseNavigationState,
  CaseProduct,
  ClassificationSnapshot,
  CreateTaxCaseInput,
  DocumentFact,
  DocumentKind,
  DocumentStorageMode,
  EmployerInstance,
  EmployerInstanceStatus,
  EmploymentIncomeGroup,
  FactRequirementRelation,
  PreliminaryReconciliation,
  ProcessingResult,
  RecordResolution,
  RequirementCoverage,
  RequirementSourceDecision,
  RequirementStatus,
  ResolutionStatus,
  TaxCase,
  TaxCaseStatus,
  UploadedDocument,
  WorkflowStageId,
  WorkflowViewId,
} from '@nexus-tax/domain';
import { ACCEPTED_SOURCE_RULE_VERSION, DOCUMENT_CATALOG } from '@nexus-tax/domain';
import type { FilingObligationInputs } from '@nexus-tax/aegis-rules';
import {
  ANALYSIS_RULE_VERSION,
  automaticClassificationSnapshot,
  buildTaxMatrix,
} from '@nexus-tax/exogenous-parser';
import { getDb, type StoredResult } from './db';
import { newId, nowIso } from './id';
import { buildEmploymentIncomeGroup, calculateEmploymentGroupCoverage } from './taxCaseAnalysis';

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
    taxpayer: { documentType: null, documentMasked: null, displayName: null },
    taxYear: input.taxYear,
    filingYear: input.taxYear + 1,
    notes: input.notes?.trim() || undefined,
    status: 'new',
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
    [
      db.cases,
      db.documents,
      db.results,
      db.filingInputs,
      db.analyses,
      db.documentBlobs,
      db.products,
      db.coverages,
      db.facts,
      db.reconciliations,
      db.employmentGroups,
      db.navigationStates,
      db.acceptedSources,
      db.requirementSourceDecisions,
    ],
    async () => {
      await db.results.delete(caseId);
      await db.filingInputs.delete(caseId);
      await db.analyses.delete(caseId);
      await db.documentBlobs.where('caseId').equals(caseId).delete();
      await db.products.where('caseId').equals(caseId).delete();
      await db.coverages.where('caseId').equals(caseId).delete();
      await db.facts.where('caseId').equals(caseId).delete();
      await db.reconciliations.where('caseId').equals(caseId).delete();
      await db.employmentGroups.where('caseId').equals(caseId).delete();
      await db.navigationStates.delete(caseId);
      await db.acceptedSources.where('caseId').equals(caseId).delete();
      await db.requirementSourceDecisions.where('caseId').equals(caseId).delete();
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

export async function saveResult(
  caseId: string,
  result: ProcessingResult,
  source: { sha256?: string | null; loadedAt?: string } = {},
): Promise<void> {
  const db = getDb();
  const timestamp = nowIso();
  const previousStored = await db.results.get(caseId);
  const stored: StoredResult = {
    caseId,
    result,
    updatedAt: timestamp,
    sourceSha256: source.sha256 ?? previousStored?.sourceSha256 ?? null,
    sourceLoadedAt: source.loadedAt ?? timestamp,
  };
  const priorAnalysis = await db.analyses.get(caseId);
  const analysis = reconcileAnalysis(caseId, result, priorAnalysis, timestamp);
  const priorEmploymentGroup = await db.employmentGroups.where('caseId').equals(caseId).first();
  const employmentGroup = buildEmploymentIncomeGroup({
    caseId,
    result,
    existing: priorEmploymentGroup,
    now: timestamp,
  });
  await db.transaction('rw', db.results, db.analyses, db.cases, db.employmentGroups, async () => {
    await db.results.put(stored);
    await db.analyses.put(analysis);
    if (employmentGroup) await db.employmentGroups.put(employmentGroup);
    await db.cases.update(caseId, {
      status: 'under_analysis',
      taxpayer: {
        documentType: result.report.taxpayer?.documentType ?? null,
        documentMasked: result.report.taxpayer?.documentNormalized
          ? `${'•'.repeat(Math.max(4, result.report.taxpayer.documentNormalized.length - 4))}${result.report.taxpayer.documentNormalized.slice(-4)}`
          : null,
        displayName: result.report.taxpayer?.taxpayerName ?? null,
      },
      updatedAt: timestamp,
    });
  });
}

export async function getResult(caseId: string): Promise<ProcessingResult | undefined> {
  const stored = await getDb().results.get(caseId);
  return stored?.result;
}

export async function getStoredResult(caseId: string): Promise<StoredResult | undefined> {
  return getDb().results.get(caseId);
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
    [
      db.cases,
      db.documents,
      db.results,
      db.filingInputs,
      db.analyses,
      db.documentBlobs,
      db.products,
      db.coverages,
      db.facts,
      db.reconciliations,
      db.employmentGroups,
      db.navigationStates,
      db.acceptedSources,
      db.requirementSourceDecisions,
    ],
    async () => {
      await db.results.clear();
      await db.filingInputs.clear();
      await db.analyses.clear();
      await db.documentBlobs.clear();
      await db.products.clear();
      await db.coverages.clear();
      await db.facts.clear();
      await db.reconciliations.clear();
      await db.employmentGroups.clear();
      await db.navigationStates.clear();
      await db.acceptedSources.clear();
      await db.requirementSourceDecisions.clear();
      await db.documents.clear();
      await db.cases.clear();
    },
  );
}

export interface LocalFileInput {
  name: string;
  size: number;
  type: string;
  arrayBuffer: () => Promise<ArrayBuffer>;
}

export interface AddCaseDocumentInput {
  kind: DocumentKind;
  storageMode: DocumentStorageMode;
  entityIds?: string[];
  productIds?: string[];
  taxYear: number;
  cutoffDate?: string;
  notes?: string;
  requiresPassword?: boolean;
  replacesDocumentId?: string;
  coveredRequirementIds?: string[];
  partialRequirementIds?: string[];
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
}

export async function sha256File(file: LocalFileInput): Promise<{
  sha256: string;
  bytes: ArrayBuffer;
}> {
  const bytes = await file.arrayBuffer();
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return { sha256: bytesToHex(new Uint8Array(digest)), bytes };
}

export async function addCaseDocument(
  caseId: string,
  file: LocalFileInput,
  input: AddCaseDocumentInput,
): Promise<UploadedDocument> {
  const db = getDb();
  const taxCase = await db.cases.get(caseId);
  if (!taxCase) throw new Error('El expediente ya no existe.');
  const extension = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : '';
  const catalog = DOCUMENT_CATALOG.find((entry) => entry.kind === input.kind);
  if (!catalog) throw new Error('Tipo documental no reconocido.');
  if (!catalog.acceptedExtensions.includes(extension)) {
    throw new Error(`El tipo ${catalog.name} no admite archivos .${extension || 'sin extensión'}.`);
  }
  const { sha256, bytes } = await sha256File(file);
  const duplicate = await db.documents.where('sha256').equals(sha256).first();
  if (duplicate && duplicate.caseId === caseId && duplicate.status === 'active') {
    throw new Error(`El archivo ya existe como “${duplicate.fileName}” (mismo hash SHA-256).`);
  }
  const replaced = input.replacesDocumentId
    ? await db.documents.get(input.replacesDocumentId)
    : undefined;
  if (replaced && replaced.caseId !== caseId) {
    throw new Error('El documento reemplazado pertenece a otro expediente.');
  }
  const timestamp = nowIso();
  const document: UploadedDocument = {
    id: newId('document'),
    caseId,
    kind: input.kind,
    category: catalog.category,
    fileName: file.name,
    extension,
    fileSizeBytes: file.size,
    mimeType: file.type || 'application/octet-stream',
    sha256,
    storageMode: input.storageMode,
    status: 'active',
    entityIds: [...new Set(input.entityIds ?? [])],
    productIds: [...new Set(input.productIds ?? [])],
    taxYear: input.taxYear,
    cutoffDate: input.cutoffDate?.trim() || null,
    notes: input.notes?.trim() ?? '',
    requiresPassword: input.requiresPassword ?? false,
    version: (replaced?.version ?? 0) + 1,
    replacesDocumentId: replaced?.id ?? null,
    replacedByDocumentId: null,
    coveredRequirementIds: [...new Set(input.coveredRequirementIds ?? [])],
    partialRequirementIds: [...new Set(input.partialRequirementIds ?? [])],
    uploadedAt: timestamp,
    updatedAt: timestamp,
  };
  await db.transaction('rw', db.documents, db.documentBlobs, db.coverages, db.cases, async () => {
    await db.documents.add(document);
    if (input.storageMode === 'store_locally') {
      await db.documentBlobs.put({
        documentId: document.id,
        caseId,
        bytes,
        mimeType: document.mimeType,
        storedAt: timestamp,
      });
    }
    if (replaced) {
      await db.documents.update(replaced.id, {
        status: 'replaced',
        replacedByDocumentId: document.id,
        updatedAt: timestamp,
      });
    }
    for (const requirementId of document.coveredRequirementIds) {
      await db.coverages.put({
        id: `coverage:${document.id}:${requirementId}`,
        caseId,
        requirementId,
        documentId: document.id,
        factId: null,
        entityId: document.entityIds[0] ?? null,
        status: 'covered',
        relation: 'covers',
        notes: 'Cobertura seleccionada al registrar el documento.',
        updatedAt: timestamp,
      });
    }
    for (const requirementId of document.partialRequirementIds) {
      await db.coverages.put({
        id: `coverage:${document.id}:${requirementId}`,
        caseId,
        requirementId,
        documentId: document.id,
        factId: null,
        entityId: document.entityIds[0] ?? null,
        status: 'partial',
        relation: 'partially_covers',
        notes: 'Cobertura parcial seleccionada al registrar el documento.',
        updatedAt: timestamp,
      });
    }
    await db.cases.update(caseId, { status: 'collecting_documents', updatedAt: timestamp });
  });
  return document;
}

export async function getDocumentBinary(documentId: string) {
  const db = getDb();
  const [document, stored] = await Promise.all([
    db.documents.get(documentId),
    db.documentBlobs.get(documentId),
  ]);
  if (!document || !stored) return undefined;
  return { fileName: document.fileName, mimeType: stored.mimeType, bytes: stored.bytes };
}

export async function removeDocumentBinary(documentId: string): Promise<void> {
  const db = getDb();
  const timestamp = nowIso();
  await db.transaction('rw', db.documents, db.documentBlobs, async () => {
    await db.documentBlobs.delete(documentId);
    await db.documents.update(documentId, { storageMode: 'metadata_only', updatedAt: timestamp });
  });
}

export async function markDocumentObsolete(documentId: string): Promise<void> {
  await getDb().documents.update(documentId, { status: 'obsolete', updatedAt: nowIso() });
}

export async function getLocalStorageUsage(caseId: string): Promise<number> {
  const blobs = await getDb().documentBlobs.where('caseId').equals(caseId).toArray();
  return blobs.reduce((sum, item) => sum + item.bytes.byteLength, 0);
}

export async function saveRequirementCoverage(
  coverage: Omit<RequirementCoverage, 'id' | 'updatedAt'>,
): Promise<RequirementCoverage> {
  const db = getDb();
  const updatedAt = nowIso();
  const id = `coverage:${coverage.documentId ?? coverage.factId ?? 'manual'}:${coverage.requirementId}`;
  const stored = { ...coverage, id, updatedAt };
  await db.transaction('rw', db.coverages, db.documents, async () => {
    await db.coverages.put(stored);
    if (coverage.documentId) {
      const document = await db.documents.get(coverage.documentId);
      if (document) {
        const covered = new Set(document.coveredRequirementIds);
        const partial = new Set(document.partialRequirementIds);
        covered.delete(coverage.requirementId);
        partial.delete(coverage.requirementId);
        if (coverage.status === 'covered') covered.add(coverage.requirementId);
        if (coverage.status === 'partial') partial.add(coverage.requirementId);
        await db.documents.update(document.id, {
          coveredRequirementIds: [...covered],
          partialRequirementIds: [...partial],
          updatedAt,
        });
      }
    }
  });
  return stored;
}

export async function listCoverages(caseId: string): Promise<RequirementCoverage[]> {
  return getDb().coverages.where('caseId').equals(caseId).toArray();
}

export async function saveProduct(
  input: Omit<CaseProduct, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<CaseProduct> {
  const timestamp = nowIso();
  const product = { ...input, id: newId('product'), createdAt: timestamp, updatedAt: timestamp };
  await getDb().products.add(product);
  return product;
}

export async function listProducts(caseId: string): Promise<CaseProduct[]> {
  return getDb().products.where('caseId').equals(caseId).toArray();
}

export type SaveDocumentFactInput = Omit<
  DocumentFact,
  'id' | 'caseId' | 'createdAt' | 'updatedAt' | 'history'
>;

export async function saveDocumentFact(
  caseId: string,
  input: SaveDocumentFactInput,
  requirementRelation: FactRequirementRelation = 'provides_evidence',
): Promise<DocumentFact> {
  const timestamp = nowIso();
  const fact: DocumentFact = {
    ...input,
    id: newId('fact'),
    caseId,
    author: input.author.trim() || 'Analista local',
    createdAt: timestamp,
    updatedAt: timestamp,
    history: [
      {
        id: newId('fact-history'),
        changedAt: timestamp,
        author: input.author.trim() || 'Analista local',
        action: 'created',
        previousValue: null,
        nextValue: input.value,
        observation: 'Hecho documental registrado manualmente.',
      },
    ],
  };
  const db = getDb();
  await db.transaction('rw', db.facts, db.coverages, async () => {
    await db.facts.add(fact);
    for (const requirementId of fact.requirementIds) {
      await db.coverages.put({
        id: `coverage:${fact.id}:${requirementId}`,
        caseId,
        requirementId,
        documentId: fact.documentId,
        factId: fact.id,
        entityId: fact.entityId,
        status: 'requires_review',
        relation: requirementRelation,
        notes: 'El hecho documental aporta evidencia pendiente de revisión.',
        updatedAt: timestamp,
      });
    }
  });
  return fact;
}

export async function updateDocumentFact(
  factId: string,
  changes: Partial<Pick<DocumentFact, 'value' | 'reviewStatus' | 'evidence'>>,
  observation: string,
): Promise<void> {
  const db = getDb();
  const fact = await db.facts.get(factId);
  if (!fact) throw new Error('El hecho documental ya no existe.');
  const updatedAt = nowIso();
  await db.facts.update(factId, {
    ...changes,
    updatedAt,
    history: [
      ...fact.history,
      {
        id: newId('fact-history'),
        changedAt: updatedAt,
        author: fact.author,
        action: 'updated',
        previousValue: fact.value,
        nextValue: changes.value ?? fact.value,
        observation: observation.trim(),
      },
    ],
  });
}

export async function listDocumentFacts(caseId: string): Promise<DocumentFact[]> {
  return getDb().facts.where('caseId').equals(caseId).sortBy('updatedAt');
}

export type AcceptExogenousValueInput = Pick<
  AcceptedExogenousValue,
  | 'exogenousRecordId'
  | 'requirementId'
  | 'entityId'
  | 'reason'
  | 'observation'
  | 'includedInMatrix'
  | 'occasionalGainRecognition'
  | 'beneficiaryAlias'
> & { author?: string };

export async function acceptExogenousValue(
  caseId: string,
  input: AcceptExogenousValueInput,
): Promise<AcceptedExogenousValue> {
  const db = getDb();
  const stored = await db.results.get(caseId);
  const record = stored?.result.normalizedRecords.find(
    (item) => item.id === input.exogenousRecordId,
  );
  if (!record || record.reportedValue === null) {
    throw new Error('El registro exógeno seleccionado no tiene un valor utilizable.');
  }
  const observation = input.observation.trim();
  if (input.reason === 'other' && !observation) {
    throw new Error('Describe el motivo cuando seleccionas “Otro motivo”.');
  }
  if (input.occasionalGainRecognition === 'collected_for_third_party' && !observation) {
    throw new Error('Explica por qué el premio fue cobrado para un tercero.');
  }
  const timestamp = nowIso();
  const author = input.author?.trim() || 'Analista local';
  const previous = await db.acceptedSources
    .where('caseId')
    .equals(caseId)
    .filter((item) => item.exogenousRecordId === record.id)
    .first();
  const status: AcceptedSourceStatus =
    input.occasionalGainRecognition === 'unrecognized' ||
    input.occasionalGainRecognition === 'collected_for_third_party'
      ? 'pending_review'
      : 'provisionally_accepted';
  const accepted: AcceptedExogenousValue = {
    id: previous?.id ?? newId('accepted-source'),
    caseId,
    exogenousRecordId: record.id,
    requirementId: input.requirementId,
    entityId: input.entityId,
    primarySource: 'exogenous_information',
    secondarySources: ['analyst_resolution'],
    captureMethod: 'analyst_resolution',
    confidence: record.confidence,
    status,
    reason: input.reason,
    observation,
    originalConcept: record.conceptLabel ?? record.conceptCode ?? 'Concepto sin etiqueta',
    originalValue: record.reportedValue,
    provisionalValue: record.reportedValue,
    category: record.category,
    taxGroup: record.category,
    source: record.source,
    includedInMatrix: input.includedInMatrix && status === 'provisionally_accepted',
    documentId: previous?.documentId ?? null,
    replacementDecisionId: previous?.replacementDecisionId ?? null,
    occasionalGainRecognition: input.occasionalGainRecognition,
    beneficiaryAlias: input.beneficiaryAlias?.trim() || null,
    ruleVersion: ACCEPTED_SOURCE_RULE_VERSION,
    author,
    createdAt: previous?.createdAt ?? timestamp,
    updatedAt: timestamp,
    history: [
      ...(previous?.history ?? []),
      {
        id: newId('source-history'),
        changedAt: timestamp,
        author,
        action: previous ? 'updated_acceptance' : 'accepted_exogenous_value',
        previousStatus: previous?.status ?? null,
        nextStatus: status,
        observation,
      },
    ],
  };
  await db.transaction('rw', db.acceptedSources, db.requirementSourceDecisions, async () => {
    await db.acceptedSources.put(accepted);
    if (input.requirementId) {
      const requirementDecision = await db.requirementSourceDecisions
        .where('caseId')
        .equals(caseId)
        .filter((item) => item.requirementId === input.requirementId)
        .first();
      if (requirementDecision) {
        await db.requirementSourceDecisions.update(requirementDecision.id, {
          acceptedSourceId: accepted.id,
          status:
            status === 'provisionally_accepted' ? 'alternative_source_covered' : 'requires_review',
          updatedAt: timestamp,
        });
      }
    }
  });
  return accepted;
}

export async function confirmAcceptedExogenousValue(id: string): Promise<void> {
  const db = getDb();
  const current = await db.acceptedSources.get(id);
  if (!current) throw new Error('La aceptación ya no existe.');
  const timestamp = nowIso();
  await db.acceptedSources.update(id, {
    status: 'analyst_confirmed',
    includedInMatrix: true,
    updatedAt: timestamp,
    history: [
      ...current.history,
      {
        id: newId('source-history'),
        changedAt: timestamp,
        author: current.author,
        action: 'analyst_confirmed',
        previousStatus: current.status,
        nextStatus: 'analyst_confirmed',
        observation: 'Valor confirmado por el analista.',
      },
    ],
  });
}

export async function listAcceptedExogenousValues(
  caseId: string,
): Promise<AcceptedExogenousValue[]> {
  return getDb().acceptedSources.where('caseId').equals(caseId).sortBy('updatedAt');
}

export type SaveRequirementSourceDecisionInput = Omit<
  RequirementSourceDecision,
  'id' | 'caseId' | 'author' | 'createdAt' | 'updatedAt'
> & { author?: string };

export async function saveRequirementSourceDecision(
  caseId: string,
  input: SaveRequirementSourceDecisionInput,
): Promise<RequirementSourceDecision> {
  if (!input.reason.trim()) throw new Error('Indica por qué la entidad no emite el soporte.');
  if (!input.managedAt) throw new Error('Indica la fecha de gestión.');
  const db = getDb();
  const timestamp = nowIso();
  const previous = await db.requirementSourceDecisions
    .where('caseId')
    .equals(caseId)
    .filter((item) => item.requirementId === input.requirementId)
    .first();
  const decision: RequirementSourceDecision = {
    ...input,
    id: previous?.id ?? newId('requirement-source'),
    caseId,
    reason: input.reason.trim(),
    observation: input.observation.trim(),
    author: input.author?.trim() || 'Analista local',
    createdAt: previous?.createdAt ?? timestamp,
    updatedAt: timestamp,
  };
  await db.transaction('rw', db.requirementSourceDecisions, db.coverages, async () => {
    await db.requirementSourceDecisions.put(decision);
    await db.coverages.put({
      id: `coverage:source-decision:${input.requirementId}`,
      caseId,
      requirementId: input.requirementId,
      documentId: input.evidenceDocumentId,
      factId: null,
      entityId: null,
      status:
        input.status === 'alternative_source_covered'
          ? 'covered'
          : input.status === 'requires_review'
            ? 'requires_review'
            : 'not_evaluated',
      relation:
        input.status === 'alternative_source_covered' ? 'provides_evidence' : 'requires_support',
      notes: `La entidad no emite este soporte. ${decision.reason}`,
      updatedAt: timestamp,
    });
  });
  return decision;
}

export async function listRequirementSourceDecisions(
  caseId: string,
): Promise<RequirementSourceDecision[]> {
  return getDb().requirementSourceDecisions.where('caseId').equals(caseId).sortBy('updatedAt');
}

export type SaveReconciliationInput = Omit<
  PreliminaryReconciliation,
  'id' | 'caseId' | 'createdAt' | 'updatedAt' | 'difference' | 'differencePercentage'
>;

export async function savePreliminaryReconciliation(
  caseId: string,
  input: SaveReconciliationInput,
): Promise<PreliminaryReconciliation> {
  if (input.status === 'reconciled' && !input.confirmedByHuman) {
    throw new Error('Una conciliacion definitiva requiere confirmacion humana.');
  }
  const timestamp = nowIso();
  const difference = Math.abs(input.exogenousValue - input.documentaryValue);
  const reconciliation: PreliminaryReconciliation = {
    ...input,
    id: newId('reconciliation'),
    caseId,
    difference,
    differencePercentage:
      input.exogenousValue === 0 ? null : (difference / Math.abs(input.exogenousValue)) * 100,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const db = getDb();
  await db.transaction('rw', db.reconciliations, db.acceptedSources, db.facts, async () => {
    await db.reconciliations.add(reconciliation);
    const relatedFacts = await db.facts.bulkGet(input.factIds);
    const supportingDocumentId = relatedFacts.find((fact) => fact?.documentId)?.documentId ?? null;
    for (const recordId of input.exogenousRecordIds) {
      const accepted = await db.acceptedSources
        .where('caseId')
        .equals(caseId)
        .filter((item) => item.exogenousRecordId === recordId)
        .first();
      if (!accepted) continue;
      if (!supportingDocumentId) continue;
      const nextStatus: AcceptedSourceStatus =
        input.status === 'not_comparable'
          ? 'not_comparable'
          : difference === 0
            ? 'supported_by_document'
            : 'contradicted_by_document';
      await db.acceptedSources.update(accepted.id, {
        status: nextStatus,
        secondarySources: Array.from(new Set([...accepted.secondarySources, 'document' as const])),
        documentId: supportingDocumentId,
        replacementDecisionId: reconciliation.id,
        updatedAt: timestamp,
        history: [
          ...accepted.history,
          {
            id: newId('source-history'),
            changedAt: timestamp,
            author: 'Analista local',
            action: 'document_reconciliation',
            previousStatus: accepted.status,
            nextStatus,
            observation: input.analystDecision,
          },
        ],
      });
    }
  });
  return reconciliation;
}

export async function listReconciliations(caseId: string): Promise<PreliminaryReconciliation[]> {
  return getDb().reconciliations.where('caseId').equals(caseId).sortBy('updatedAt');
}

export async function getEmploymentIncomeGroup(
  caseId: string,
): Promise<EmploymentIncomeGroup | undefined> {
  return getDb().employmentGroups.where('caseId').equals(caseId).first();
}

async function putEmploymentInstances(
  group: EmploymentIncomeGroup,
  instances: EmployerInstance[],
): Promise<EmploymentIncomeGroup> {
  const stored: EmploymentIncomeGroup = {
    ...group,
    instances,
    coverage: calculateEmploymentGroupCoverage(instances),
    updatedAt: nowIso(),
  };
  await getDb().employmentGroups.put(stored);
  return stored;
}

export async function addEmployerInstance(
  caseId: string,
  input: { employerName?: string; receivedEmploymentIncome?: boolean } = {},
): Promise<EmployerInstance> {
  const db = getDb();
  const timestamp = nowIso();
  const current = await getEmploymentIncomeGroup(caseId);
  const group: EmploymentIncomeGroup = current ?? {
    id: `employment-group:${caseId}`,
    caseId,
    title: 'Ingresos laborales y empleadores',
    receivedEmploymentIncome: input.receivedEmploymentIncome ?? true,
    instances: [],
    additionalDetectedEmployers: [],
    coverage: 'pending',
    findings: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  if (group.instances.length >= 3) throw new Error('La interfaz admite hasta tres empleadores.');
  const instance: EmployerInstance = {
    id: newId('employer'),
    employerName: input.employerName?.trim() ?? '',
    taxIdMasked: null,
    workedPeriod: '',
    entityId: null,
    form220DocumentId: null,
    complementaryDocumentIds: [],
    status: 'pending',
    coverage: 'not_evaluated',
    observations: '',
    source: 'manual',
    manualMatchConfirmed: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  await db.employmentGroups.put({
    ...group,
    receivedEmploymentIncome: input.receivedEmploymentIncome ?? group.receivedEmploymentIncome,
    instances: [...group.instances, instance],
    coverage: calculateEmploymentGroupCoverage([...group.instances, instance]),
    updatedAt: timestamp,
  });
  return instance;
}

export async function updateEmployerInstance(
  caseId: string,
  instanceId: string,
  changes: Partial<
    Pick<
      EmployerInstance,
      | 'employerName'
      | 'workedPeriod'
      | 'entityId'
      | 'taxIdMasked'
      | 'observations'
      | 'manualMatchConfirmed'
    >
  >,
): Promise<void> {
  const group = await getEmploymentIncomeGroup(caseId);
  if (!group) throw new Error('El grupo laboral no existe.');
  const timestamp = nowIso();
  const instances = group.instances.map((instance) =>
    instance.id === instanceId ? { ...instance, ...changes, updatedAt: timestamp } : instance,
  );
  if (!instances.some((instance) => instance.id === instanceId)) {
    throw new Error('La instancia de empleador no existe.');
  }
  await putEmploymentInstances(group, instances);
}

export async function setEmployerInstanceStatus(
  caseId: string,
  instanceId: string,
  status: EmployerInstanceStatus,
): Promise<void> {
  const group = await getEmploymentIncomeGroup(caseId);
  if (!group) throw new Error('El grupo laboral no existe.');
  const timestamp = nowIso();
  const instances = group.instances.map((instance) => {
    if (instance.id !== instanceId) return instance;
    const coverage: EmployerInstance['coverage'] =
      status === 'covered'
        ? 'covered'
        : status === 'partially_covered'
          ? 'partial'
          : status === 'not_applicable'
            ? 'not_applicable'
            : status === 'requires_review'
              ? 'requires_review'
              : 'not_evaluated';
    return { ...instance, status, coverage, updatedAt: timestamp };
  });
  await putEmploymentInstances(group, instances);
}

export async function removeEmployerInstance(caseId: string, instanceId: string): Promise<void> {
  const group = await getEmploymentIncomeGroup(caseId);
  if (!group) return;
  await putEmploymentInstances(
    group,
    group.instances.filter((instance) => instance.id !== instanceId),
  );
}

export async function associateEmployerDocument(
  caseId: string,
  instanceId: string,
  documentId: string,
  options: { complementary?: boolean; allowConsolidatedAsPrimary?: boolean } = {},
): Promise<void> {
  const db = getDb();
  const [group, document] = await Promise.all([
    getEmploymentIncomeGroup(caseId),
    db.documents.get(documentId),
  ]);
  if (!group) throw new Error('El grupo laboral no existe.');
  if (!document || document.caseId !== caseId || document.status !== 'active') {
    throw new Error('El documento no esta activo en este expediente.');
  }
  const target = group.instances.find((instance) => instance.id === instanceId);
  if (!target) throw new Error('La instancia de empleador no existe.');
  if (options.complementary) {
    if (document.kind === 'form_220') {
      throw new Error('El Formulario 220 debe asociarse como documento principal.');
    }
  } else {
    if (!['form_220', 'consolidated_tax_certificate'].includes(document.kind)) {
      throw new Error('El documento principal debe ser un Formulario 220.');
    }
    if (document.kind === 'consolidated_tax_certificate' && !options.allowConsolidatedAsPrimary) {
      throw new Error(
        'Un certificado consolidado requiere una decision expresa del analista para reemplazar el Formulario 220.',
      );
    }
    if (
      document.kind === 'form_220' &&
      group.instances.some(
        (instance) => instance.id !== instanceId && instance.form220DocumentId === document.id,
      )
    ) {
      throw new Error('Este Formulario 220 ya esta asociado a otro empleador.');
    }
  }
  if (
    document.entityIds.length &&
    target.entityId &&
    !document.entityIds.includes(target.entityId)
  ) {
    throw new Error('El documento esta asociado a una entidad diferente.');
  }
  const timestamp = nowIso();
  const instances = group.instances.map((instance) => {
    if (instance.id !== instanceId) return instance;
    if (options.complementary) {
      return {
        ...instance,
        complementaryDocumentIds: [...new Set([...instance.complementaryDocumentIds, documentId])],
        status: instance.status === 'pending' ? ('partially_covered' as const) : instance.status,
        coverage: instance.coverage === 'not_evaluated' ? ('partial' as const) : instance.coverage,
        updatedAt: timestamp,
      };
    }
    return {
      ...instance,
      form220DocumentId: documentId,
      status: 'covered' as const,
      coverage: 'covered' as const,
      observations:
        document.kind === 'consolidated_tax_certificate'
          ? `${instance.observations}\nEl analista acepto expresamente un certificado consolidado como soporte principal.`.trim()
          : instance.observations,
      updatedAt: timestamp,
    };
  });
  await db.transaction('rw', db.employmentGroups, db.documents, async () => {
    await db.employmentGroups.put({
      ...group,
      instances,
      coverage: calculateEmploymentGroupCoverage(instances),
      updatedAt: timestamp,
    });
    if (target.entityId && !document.entityIds.includes(target.entityId)) {
      await db.documents.update(document.id, {
        entityIds: [...document.entityIds, target.entityId],
        updatedAt: timestamp,
      });
    }
  });
}

export async function getCaseNavigationState(
  caseId: string,
): Promise<CaseNavigationState | undefined> {
  return getDb().navigationStates.get(caseId);
}

export async function saveCaseNavigation(input: {
  caseId: string;
  stage: WorkflowStageId;
  view: WorkflowViewId;
  recommendedStage: WorkflowStageId;
  completedViews?: string[];
}): Promise<CaseNavigationState> {
  const db = getDb();
  const current = await db.navigationStates.get(input.caseId);
  const state: CaseNavigationState = {
    caseId: input.caseId,
    lastStage: input.stage,
    lastView: input.view,
    recommendedStage: input.recommendedStage,
    completedViews: input.completedViews ?? current?.completedViews ?? [],
    manualMode: current?.manualMode ?? false,
    updatedAt: nowIso(),
  };
  await db.navigationStates.put(state);
  return state;
}

export async function enableManualCase(caseId: string): Promise<CaseNavigationState> {
  const db = getDb();
  const current = await db.navigationStates.get(caseId);
  const timestamp = nowIso();
  const state: CaseNavigationState = {
    caseId,
    lastStage: 'organizacion',
    lastView: 'documentos',
    recommendedStage: 'organizacion',
    completedViews: current?.completedViews ?? [],
    manualMode: true,
    updatedAt: timestamp,
  };
  await db.transaction('rw', db.navigationStates, db.cases, async () => {
    await db.navigationStates.put(state);
    await db.cases.update(caseId, { status: 'collecting_documents', updatedAt: timestamp });
  });
  return state;
}

export async function markWorkflowViewCompleted(
  caseId: string,
  stage: WorkflowStageId,
  view: WorkflowViewId,
): Promise<void> {
  const db = getDb();
  const current = await db.navigationStates.get(caseId);
  const completedViews = new Set(current?.completedViews ?? []);
  completedViews.add(`${stage}/${view}`);
  await db.navigationStates.put({
    caseId,
    lastStage: stage,
    lastView: view,
    recommendedStage: current?.recommendedStage ?? stage,
    completedViews: [...completedViews].sort(),
    manualMode: current?.manualMode ?? false,
    updatedAt: nowIso(),
  });
}

export async function removeExogenousSource(caseId: string): Promise<void> {
  const db = getDb();
  const timestamp = nowIso();
  const group = await db.employmentGroups.where('caseId').equals(caseId).first();
  const manualInstances = (group?.instances ?? [])
    .filter((instance) => instance.source === 'manual')
    .map((instance) => ({
      ...instance,
      entityId: null,
      manualMatchConfirmed: false,
      updatedAt: timestamp,
    }));
  const navigation = await db.navigationStates.get(caseId);
  await db.transaction(
    'rw',
    [
      db.results,
      db.analyses,
      db.employmentGroups,
      db.navigationStates,
      db.cases,
      db.acceptedSources,
      db.requirementSourceDecisions,
    ],
    async () => {
      await db.results.delete(caseId);
      await db.analyses.delete(caseId);
      await db.acceptedSources.where('caseId').equals(caseId).delete();
      await db.requirementSourceDecisions
        .where('caseId')
        .equals(caseId)
        .modify({ acceptedSourceId: null, updatedAt: timestamp });
      if (group && manualInstances.length) {
        await db.employmentGroups.put({
          ...group,
          instances: manualInstances,
          additionalDetectedEmployers: [],
          findings: [],
          coverage: calculateEmploymentGroupCoverage(manualInstances),
          updatedAt: timestamp,
        });
      } else if (group) {
        await db.employmentGroups.delete(group.id);
      }
      await db.navigationStates.put({
        caseId,
        lastStage: 'fuente',
        lastView: 'cargar',
        recommendedStage: 'fuente',
        completedViews: (navigation?.completedViews ?? []).filter(
          (view) => !view.startsWith('extraccion/') && !view.startsWith('conciliacion/'),
        ),
        manualMode: navigation?.manualMode ?? false,
        updatedAt: timestamp,
      });
      await db.cases.update(caseId, {
        status: navigation?.manualMode ? 'collecting_documents' : 'new',
        taxpayer: { documentType: null, documentMasked: null, displayName: null },
        updatedAt: timestamp,
      });
    },
  );
}

export async function getTaxCaseWorkspace(caseId: string) {
  const [
    taxCase,
    result,
    analysis,
    documents,
    products,
    coverages,
    facts,
    reconciliations,
    localBytes,
    filingInputs,
    employmentGroup,
    navigation,
    storedResult,
    acceptedSources,
    requirementSourceDecisions,
  ] = await Promise.all([
    getCase(caseId),
    getResult(caseId),
    getCaseAnalysis(caseId),
    listDocuments(caseId),
    listProducts(caseId),
    listCoverages(caseId),
    listDocumentFacts(caseId),
    listReconciliations(caseId),
    getLocalStorageUsage(caseId),
    getFilingInputs(caseId),
    getEmploymentIncomeGroup(caseId),
    getCaseNavigationState(caseId),
    getStoredResult(caseId),
    listAcceptedExogenousValues(caseId),
    listRequirementSourceDecisions(caseId),
  ]);
  return {
    taxCase,
    result,
    analysis,
    documents,
    products,
    coverages,
    facts,
    reconciliations,
    localBytes,
    filingInputs,
    employmentGroup,
    navigation,
    acceptedSources,
    requirementSourceDecisions,
    sourceInfo: storedResult
      ? {
          sha256: storedResult.sourceSha256 ?? null,
          loadedAt: storedResult.sourceLoadedAt ?? storedResult.updatedAt,
        }
      : undefined,
  };
}
