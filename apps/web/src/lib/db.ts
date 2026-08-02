import Dexie, { type Table } from 'dexie';
import type { FilingObligationInputs } from '@nexus-tax/aegis-rules';
import type {
  CaseAnalysis,
  AcceptedExogenousValue,
  CaseNavigationState,
  CaseProduct,
  DocumentFact,
  EmploymentIncomeGroup,
  PreliminaryReconciliation,
  ProcessingResult,
  RequirementCoverage,
  RequirementSourceDecision,
  TaxCase,
  UploadedDocument,
} from '@nexus-tax/domain';

/**
 * Persistencia local en IndexedDB mediante Dexie (§12, §14 del alcance).
 * Todo permanece en el navegador. Nunca se envía a un servidor.
 *
 * IMPORTANTE (privacidad): NO se persiste el archivo original. Solo metadatos
 * del documento y el resultado normalizado derivado.
 */

export interface StoredResult {
  /** Un resultado por expediente (clave primaria). */
  caseId: string;
  result: ProcessingResult;
  updatedAt: string;
  sourceSha256?: string | null;
  sourceLoadedAt?: string;
}

export interface StoredFilingInputs {
  caseId: string;
  isVatResponsibleAtYearEnd: FilingObligationInputs['isVatResponsibleAtYearEnd'];
  updatedAt: string;
}

export type StoredAnalysis = CaseAnalysis;

export interface StoredDocumentBlob {
  documentId: string;
  caseId: string;
  bytes: ArrayBuffer;
  mimeType: string;
  storedAt: string;
}

class NexusTaxDatabase extends Dexie {
  cases!: Table<TaxCase, string>;
  documents!: Table<UploadedDocument, string>;
  results!: Table<StoredResult, string>;
  filingInputs!: Table<StoredFilingInputs, string>;
  analyses!: Table<StoredAnalysis, string>;
  documentBlobs!: Table<StoredDocumentBlob, string>;
  products!: Table<CaseProduct, string>;
  coverages!: Table<RequirementCoverage, string>;
  facts!: Table<DocumentFact, string>;
  reconciliations!: Table<PreliminaryReconciliation, string>;
  employmentGroups!: Table<EmploymentIncomeGroup, string>;
  navigationStates!: Table<CaseNavigationState, string>;
  acceptedSources!: Table<AcceptedExogenousValue, string>;
  requirementSourceDecisions!: Table<RequirementSourceDecision, string>;

  constructor() {
    super('nexustax');
    this.version(1).stores({
      cases: 'id, updatedAt, taxYear, status',
      documents: 'id, caseId, uploadedAt',
      results: 'caseId, updatedAt',
    });
    this.version(2).stores({
      cases: 'id, updatedAt, taxYear, status',
      documents: 'id, caseId, uploadedAt',
      results: 'caseId, updatedAt',
      filingInputs: 'caseId, updatedAt',
    });
    this.version(3).stores({
      cases: 'id, updatedAt, taxYear, status',
      documents: 'id, caseId, uploadedAt',
      results: 'caseId, updatedAt',
      filingInputs: 'caseId, updatedAt',
      analyses: 'caseId, updatedAt, ruleVersion',
    });
    this.version(4)
      .stores({
        cases: 'id, updatedAt, taxYear, status',
        documents: 'id, caseId, uploadedAt, sha256, status, kind, *entityIds',
        results: 'caseId, updatedAt',
        filingInputs: 'caseId, updatedAt',
        analyses: 'caseId, updatedAt, ruleVersion',
        documentBlobs: 'documentId, caseId, storedAt',
        products: 'id, caseId, entityId, type, status',
        coverages: 'id, caseId, requirementId, documentId, factId, entityId, status',
        facts: 'id, caseId, documentId, entityId, productId, category, reviewStatus, updatedAt',
        reconciliations: 'id, caseId, status, *factIds, *exogenousRecordIds, updatedAt',
      })
      .upgrade(async (transaction) => {
        await transaction
          .table('cases')
          .toCollection()
          .modify((taxCase: Record<string, unknown>) => {
            const taxYear = typeof taxCase.taxYear === 'number' ? taxCase.taxYear : 2025;
            const legacyStatus = String(taxCase.status ?? 'draft');
            taxCase.filingYear = taxYear + 1;
            taxCase.taxpayer = { documentType: null, documentMasked: null, displayName: null };
            taxCase.status =
              legacyStatus === 'archived'
                ? 'closed'
                : legacyStatus === 'processing'
                  ? 'under_analysis'
                  : legacyStatus === 'ready'
                    ? 'ready_for_review'
                    : 'new';
          });
      });
    this.version(5).stores({
      cases: 'id, updatedAt, taxYear, status',
      documents: 'id, caseId, uploadedAt, sha256, status, kind, *entityIds',
      results: 'caseId, updatedAt',
      filingInputs: 'caseId, updatedAt',
      analyses: 'caseId, updatedAt, ruleVersion',
      documentBlobs: 'documentId, caseId, storedAt',
      products: 'id, caseId, entityId, type, status',
      coverages: 'id, caseId, requirementId, documentId, factId, entityId, status',
      facts: 'id, caseId, documentId, entityId, productId, category, reviewStatus, updatedAt',
      reconciliations: 'id, caseId, status, *factIds, *exogenousRecordIds, updatedAt',
      employmentGroups: 'id, caseId, coverage, updatedAt',
    });
    this.version(6).stores({
      cases: 'id, updatedAt, taxYear, status',
      documents: 'id, caseId, uploadedAt, sha256, status, kind, *entityIds',
      results: 'caseId, updatedAt',
      filingInputs: 'caseId, updatedAt',
      analyses: 'caseId, updatedAt, ruleVersion',
      documentBlobs: 'documentId, caseId, storedAt',
      products: 'id, caseId, entityId, type, status',
      coverages: 'id, caseId, requirementId, documentId, factId, entityId, status',
      facts: 'id, caseId, documentId, entityId, productId, category, reviewStatus, updatedAt',
      reconciliations: 'id, caseId, status, *factIds, *exogenousRecordIds, updatedAt',
      employmentGroups: 'id, caseId, coverage, updatedAt',
      navigationStates: 'caseId, lastStage, recommendedStage, updatedAt',
    });
    this.version(7).stores({
      cases: 'id, updatedAt, taxYear, status',
      documents: 'id, caseId, uploadedAt, sha256, status, kind, *entityIds',
      results: 'caseId, updatedAt',
      filingInputs: 'caseId, updatedAt',
      analyses: 'caseId, updatedAt, ruleVersion',
      documentBlobs: 'documentId, caseId, storedAt',
      products: 'id, caseId, entityId, type, status',
      coverages: 'id, caseId, requirementId, documentId, factId, entityId, status',
      facts: 'id, caseId, documentId, entityId, productId, category, reviewStatus, updatedAt',
      reconciliations: 'id, caseId, status, *factIds, *exogenousRecordIds, updatedAt',
      employmentGroups: 'id, caseId, coverage, updatedAt',
      navigationStates: 'caseId, lastStage, recommendedStage, updatedAt',
      acceptedSources: 'id, caseId, exogenousRecordId, requirementId, status, updatedAt',
      requirementSourceDecisions: 'id, caseId, requirementId, status, updatedAt',
    });
  }
}

/** Instancia perezosa; solo se crea en el navegador. */
let dbInstance: NexusTaxDatabase | null = null;

export function getDb(): NexusTaxDatabase {
  if (typeof window === 'undefined') {
    throw new Error('IndexedDB solo está disponible en el navegador.');
  }
  if (!dbInstance) dbInstance = new NexusTaxDatabase();
  return dbInstance;
}
