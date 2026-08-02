import type {
  DocumentExtractionFinding,
  DocumentFactCandidate,
  DocumentaryRequirement,
  NormalizedExogenousRecord,
  ReportingEntity,
} from '@nexus-tax/domain';
import type {
  CandidateBuildContext,
  DocumentProgressEvent,
  PdfReadLimits,
  PdfReadOptions,
} from './contracts';
import { DEFAULT_PDF_LIMITS } from './contracts';
import { classifyDocument } from './classifier';
import { extractCandidates } from './adapters';
import { suggestEntity, suggestExogenousMatches, suggestRequirements } from './matching';
import { PdfReadError, readPdfText } from './reader';

export interface AnalyzePdfInput extends CandidateBuildContext {
  bytes: ArrayBuffer | Uint8Array;
  password?: string;
  workerSrc?: string;
  signal?: AbortSignal;
  limits?: Partial<PdfReadLimits>;
  entities?: readonly ReportingEntity[];
  requirements?: readonly DocumentaryRequirement[];
  exogenousRecords?: readonly NormalizedExogenousRecord[];
  documentEntityIds?: readonly string[];
  onProgress?: (progress: DocumentProgressEvent) => void;
}

export async function analyzePdfDocument(input: AnalyzePdfInput) {
  const readOptions: PdfReadOptions = {
    password: input.password,
    workerSrc: input.workerSrc,
    signal: input.signal,
    limits: input.limits,
    onProgress: input.onProgress,
  };
  const representation = await readPdfText(input.bytes, readOptions);
  input.onProgress?.({
    phase: 'classifying',
    completed: 1,
    total: 1,
    message: 'Clasificando el documento…',
  });
  const classification = classifyDocument(representation);
  input.onProgress?.({
    phase: 'extracting',
    completed: 0,
    total: 1,
    message: 'Buscando valores candidatos…',
  });
  const limits = { ...DEFAULT_PDF_LIMITS, ...input.limits };
  const extraction = extractCandidates(
    representation,
    classification.correctedKind ?? classification.proposedKind,
    input,
    limits,
  );
  const candidates = extraction.candidates.map((candidate) => enrichCandidate(candidate, input));
  input.onProgress?.({
    phase: 'extracting',
    completed: 1,
    total: 1,
    message: 'Extracción lista para revisar.',
  });
  const findings = buildFindings(
    classification.confidence,
    representation.warnings,
    candidates,
    extraction.warnings,
  );
  return { representation, classification, adapter: extraction.adapter, candidates, findings };
}

function enrichCandidate(
  candidate: DocumentFactCandidate,
  input: AnalyzePdfInput,
): DocumentFactCandidate {
  const entity = suggestEntity({
    candidate,
    entities: input.entities ?? [],
    documentEntityIds: input.documentEntityIds,
  });
  const entityName =
    input.entities?.find((item) => item.id === entity.entityId)?.name ?? candidate.entityName;
  const enriched = { ...candidate, proposedEntityId: entity.entityId, entityName };
  return {
    ...enriched,
    suggestedRequirementIds: suggestRequirements(enriched, input.requirements ?? []),
    suggestedExogenousMatches: suggestExogenousMatches(enriched, input.exogenousRecords ?? []),
    warnings: [
      ...enriched.warnings,
      ...(entity.ambiguous ? ['Varias entidades podrían corresponder al documento.'] : []),
    ],
  };
}

function buildFindings(
  confidence: 'high' | 'medium' | 'low' | 'insufficient',
  pageWarnings: readonly string[],
  candidates: readonly DocumentFactCandidate[],
  extractionWarnings: readonly string[],
): DocumentExtractionFinding[] {
  const findings: DocumentExtractionFinding[] = [];
  if (confidence === 'low' || confidence === 'insufficient') {
    findings.push({
      code:
        confidence === 'insufficient' ? 'document_unrecognized' : 'low_confidence_classification',
      category: 'review_required',
      message: 'La clasificación documental necesita confirmación humana.',
      page: null,
      suggestedAction: 'Corrige el tipo documental antes de confirmar candidatos.',
    });
  }
  if (pageWarnings.length || extractionWarnings.length) {
    findings.push({
      code: 'partial_extraction',
      category: 'technical_limitation',
      message: [...pageWarnings, ...extractionWarnings][0] ?? 'La extracción fue parcial.',
      page: null,
      suggestedAction: 'Revisa cada candidato y registra manualmente los valores ausentes.',
    });
  }
  if (!candidates.length) {
    findings.push({
      code: 'adapter_unavailable',
      category: 'pending_data',
      message: 'No se encontraron pares de concepto y valor con las reglas disponibles.',
      page: null,
      suggestedAction: 'Corrige el tipo o registra los valores manualmente.',
    });
  }
  return findings;
}

export function extractionFailureFinding(error: unknown): DocumentExtractionFinding {
  const code = error instanceof PdfReadError ? error.code : 'invalid_pdf';
  const password = code === 'password_required' || code === 'incorrect_password';
  return {
    code: password
      ? 'password_required'
      : code === 'no_text'
        ? 'text_not_extractable'
        : code === 'limit_exceeded'
          ? 'limit_exceeded'
          : 'document_unrecognized',
    category: 'technical_limitation',
    message: error instanceof Error ? error.message : 'No fue posible analizar el PDF.',
    page: error instanceof PdfReadError ? error.page : null,
    suggestedAction: password
      ? 'Ingresa la contraseña nuevamente; se mantendrá solo en memoria.'
      : 'Registra los valores manualmente o conserva el documento para revisarlo después.',
  };
}
