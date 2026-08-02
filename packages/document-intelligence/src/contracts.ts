import type {
  DocumentFactCandidate,
  DocumentKind,
  ProductType,
  TaxCategory,
  TaxNature,
  TaxTreatment,
} from '@nexus-tax/domain';

export interface DocumentTextBlock {
  index?: number;
  text: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  fontName?: string;
}

export interface DocumentTextLine {
  id: string;
  text: string;
  y: number;
  blockIndexes: number[];
  columnCount: number;
}

export interface DocumentSection {
  id: string;
  label: string;
  kind:
    | 'balances'
    | 'debts'
    | 'investments'
    | 'income'
    | 'withholdings'
    | 'accounts'
    | 'cards'
    | 'credits'
    | 'products'
    | 'totals'
    | 'observations'
    | 'other';
  startLine: number;
  endLine: number;
}

export interface DocumentSimpleTable {
  id: string;
  sectionId: string | null;
  headerLineId: string | null;
  rowLineIds: string[];
  columnX: number[];
}

export interface DocumentPageRepresentation {
  pageNumber: number;
  normalizedText: string;
  blocks: DocumentTextBlock[];
  lines?: DocumentTextLine[];
  sections?: DocumentSection[];
  tables?: DocumentSimpleTable[];
  width?: number;
  height?: number;
  errors: string[];
  readConfidence: 'high' | 'medium' | 'low' | 'insufficient';
}

export interface DocumentRepresentation {
  pageCount: number;
  pages: DocumentPageRepresentation[];
  metadata: { title?: string; author?: string; subject?: string };
  encrypted: boolean;
  warnings: string[];
}

export interface PdfReadLimits {
  maxBytes: number;
  maxPages: number;
  timeoutMs: number;
  maxCandidates: number;
  maxEvidenceLength: number;
  verticalLineTolerance: number;
}

export const DEFAULT_PDF_LIMITS: PdfReadLimits = {
  maxBytes: 25 * 1024 * 1024,
  maxPages: 250,
  timeoutMs: 45_000,
  maxCandidates: 500,
  maxEvidenceLength: 220,
  verticalLineTolerance: 4,
};

export type DocumentProgressPhase = 'reading' | 'classifying' | 'extracting';

export interface DocumentProgressEvent {
  phase: DocumentProgressPhase;
  completed: number;
  total: number;
  message: string;
}

export interface PdfReadOptions {
  password?: string;
  signal?: AbortSignal;
  limits?: Partial<PdfReadLimits>;
  workerSrc?: string;
  /** URL local del módulo de PDF.js cuando el empaquetador no debe transformarlo. */
  browserModuleUrl?: string;
  onProgress?: (progress: DocumentProgressEvent) => void;
}

export interface AdapterRule {
  id: string;
  labels: readonly RegExp[];
  category: TaxCategory;
  nature: TaxNature;
  treatment: TaxTreatment;
  productType: ProductType;
}

export interface DocumentAdapter {
  id: string;
  version: string;
  documentKinds: readonly DocumentKind[];
  compatibleEntities: readonly string[];
  activationSignals: readonly RegExp[];
  extractableFields: readonly string[];
  rules: readonly AdapterRule[];
  limitations: readonly string[];
  confidence: 'high' | 'medium' | 'low';
}

export interface CandidateBuildContext {
  caseId: string;
  documentId: string;
  sessionId: string;
  timestamp: string;
  entityId?: string | null;
  entityName?: string | null;
  requirementIds?: readonly string[];
}

export interface ExtractionResult {
  adapter: DocumentAdapter;
  candidates: DocumentFactCandidate[];
  warnings: string[];
  generatedCandidateCount: number;
  pendingCandidateCount: number;
}

export interface DocumentEnrichmentProvider {
  readonly id: string;
  readonly version: string;
  enrich(input: {
    limitedText: string;
    documentKind: DocumentKind;
    allowedSchema: Readonly<Record<string, unknown>>;
    deterministicCandidates: readonly DocumentFactCandidate[];
    question: string;
  }): Promise<{
    proposals: readonly Record<string, unknown>[];
    evidence: readonly string[];
    confidence: 'high' | 'medium' | 'low' | 'insufficient';
    warnings: readonly string[];
  }>;
}
