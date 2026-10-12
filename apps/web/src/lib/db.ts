import Dexie, { type Table } from 'dexie';
import type { FilingObligationInputs } from '@nexus-tax/aegis-rules';
import type { Form210Draft } from '@nexus-tax/form-210';
import type {
  CaseAnalysis,
  CaseTask,
  AcceptedExogenousValue,
  CaseNavigationState,
  CaseProduct,
  DependentEvaluation,
  DependentSupport,
  DocumentFact,
  DocumentFactCandidate,
  DocumentExtractionSession,
  DocumentProfile,
  ElectronicInvoicePurchase,
  ElectronicInvoiceReport,
  EmploymentIncomeGroup,
  ExtractionFeedback,
  PreliminaryReconciliation,
  PriorYearCarryForwardCandidate,
  PriorYearTaxReturn,
  ProcessingResult,
  RequirementCoverage,
  RequirementSourceDecision,
  TaxCase,
  TaxDependent,
  TaxProperty,
  RentalActivity,
  RentalIncome,
  PropertyExpense,
  ComplementaryHealthPayment,
  UploadedDocument,
  TaxResolutionDecision,
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

/**
 * Contexto del expediente para el beneficio de dependientes (Sprint 2.4,
 * Fase C). `employmentIncomeNature` es un hecho humano (nunca inferido) que
 * alimenta `resolveDependentBenefitCoexistence`. `noDependentsDeclared` es
 * la decisión explícita "No tengo dependientes": cierra tareas y deja
 * R138/R139 en un estado coherente sin crear dependientes ficticios.
 */
export interface DependentsCaseContext {
  caseId: string;
  employmentIncomeNature: 'labor_relation' | 'independent' | 'unknown';
  noDependentsDeclared: boolean;
  updatedAt: string;
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
  extractionSessions!: Table<DocumentExtractionSession, string>;
  documentCandidates!: Table<DocumentFactCandidate, string>;
  caseTasks!: Table<CaseTask, string>;
  documentProfiles!: Table<DocumentProfile, string>;
  extractionFeedback!: Table<ExtractionFeedback, string>;
  resolutionDecisions!: Table<TaxResolutionDecision, string>;
  form210Drafts!: Table<Form210Draft, string>;
  priorYearReturns!: Table<PriorYearTaxReturn, string>;
  priorYearCarryForwardCandidates!: Table<PriorYearCarryForwardCandidate, string>;
  taxDependents!: Table<TaxDependent, string>;
  dependentSupports!: Table<DependentSupport, string>;
  dependentEvaluations!: Table<DependentEvaluation, string>;
  dependentsCaseContext!: Table<DependentsCaseContext, string>;
  electronicInvoiceReports!: Table<ElectronicInvoiceReport, string>;
  electronicInvoicePurchases!: Table<ElectronicInvoicePurchase, string>;
  taxProperties!: Table<TaxProperty, string>;
  rentalActivities!: Table<RentalActivity, string>;
  rentalIncomes!: Table<RentalIncome, string>;
  propertyExpenses!: Table<PropertyExpense, string>;
  complementaryHealthPayments!: Table<ComplementaryHealthPayment, string>;

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
    this.version(8).stores({
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
      extractionSessions: 'id, caseId, documentId, status, updatedAt',
      documentCandidates: 'id, caseId, documentId, extractionSessionId, status, updatedAt',
    });
    this.version(9).stores({
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
      extractionSessions: 'id, caseId, documentId, status, updatedAt',
      documentCandidates: 'id, caseId, documentId, extractionSessionId, status, updatedAt',
      caseTasks: 'id, caseId, status, priority, stage, type, updatedAt',
    });
    // Los perfiles y el feedback viven a nivel de instalación, no de
    // expediente (§14-15): reconocen el mismo formato entre años distintos.
    this.version(10).stores({
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
      extractionSessions: 'id, caseId, documentId, status, updatedAt',
      documentCandidates: 'id, caseId, documentId, extractionSessionId, status, updatedAt',
      caseTasks: 'id, caseId, status, priority, stage, type, updatedAt',
      documentProfiles: 'id, documentKind, status, updatedAt',
      extractionFeedback:
        'id, documentId, extractionSessionId, candidateId, applicability, createdAt',
    });
    this.version(11).stores({
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
      extractionSessions: 'id, caseId, documentId, status, updatedAt',
      documentCandidates: 'id, caseId, documentId, extractionSessionId, status, updatedAt',
      caseTasks: 'id, caseId, status, priority, stage, type, updatedAt',
      documentProfiles: 'id, documentKind, status, updatedAt',
      extractionFeedback:
        'id, documentId, extractionSessionId, candidateId, applicability, createdAt',
      resolutionDecisions: 'id, caseId, objectType, objectId, type, decidedAt',
      form210Drafts: 'id, caseId, taxYear, generatedAt',
    });
    this.version(12)
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
        employmentGroups: 'id, caseId, coverage, updatedAt',
        navigationStates: 'caseId, lastStage, recommendedStage, updatedAt',
        acceptedSources: 'id, caseId, exogenousRecordId, requirementId, status, updatedAt',
        requirementSourceDecisions: 'id, caseId, requirementId, status, updatedAt',
        extractionSessions: 'id, caseId, documentId, status, updatedAt',
        documentCandidates:
          'id, caseId, documentId, extractionSessionId, status, moneyParserVersion, updatedAt',
        caseTasks: 'id, caseId, status, priority, stage, type, updatedAt',
        documentProfiles: 'id, documentKind, status, updatedAt',
        extractionFeedback:
          'id, documentId, extractionSessionId, candidateId, applicability, createdAt',
        resolutionDecisions: 'id, caseId, objectType, objectId, type, decidedAt',
        form210Drafts: 'id, caseId, taxYear, generatedAt',
      })
      .upgrade(async (transaction) => {
        await transaction
          .table('documentCandidates')
          .toCollection()
          .modify((candidate: Record<string, unknown>) => {
            if (candidate.moneyParserVersion) return;
            candidate.moneyParserVersion = 'legacy';
            candidate.requiresMoneyReanalysis = true;
            candidate.previousParsedValue =
              typeof candidate.extractedValue === 'number' ? candidate.extractedValue : null;
          });
      });
    // Sprint 2.4 (Fase B): declaraciones de años anteriores como fuente
    // estructurada independiente y sus candidatos de arrastre (art. 807 y
    // 850 ET). Ninguna tabla ni dato previo se modifica; solo se agregan
    // dos tablas nuevas.
    this.version(13).stores({
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
      extractionSessions: 'id, caseId, documentId, status, updatedAt',
      documentCandidates:
        'id, caseId, documentId, extractionSessionId, status, moneyParserVersion, updatedAt',
      caseTasks: 'id, caseId, status, priority, stage, type, updatedAt',
      documentProfiles: 'id, documentKind, status, updatedAt',
      extractionFeedback:
        'id, documentId, extractionSessionId, candidateId, applicability, createdAt',
      resolutionDecisions: 'id, caseId, objectType, objectId, type, decidedAt',
      form210Drafts: 'id, caseId, taxYear, generatedAt',
      priorYearReturns: 'id, caseId, taxYear, status, identityMatch, isCurrentVersion, updatedAt',
      priorYearCarryForwardCandidates:
        'id, caseId, priorYearReturnId, sourceBoxNumber, targetBoxNumber, decision, updatedAt',
    });
    // Sprint 2.4 (Fase C): dependientes económicos, sus soportes y
    // evaluaciones de elegibilidad/coexistencia, y el contexto del
    // expediente (naturaleza de la renta de trabajo, "no tengo
    // dependientes"). Aditivo; ninguna tabla previa se modifica.
    this.version(14).stores({
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
      extractionSessions: 'id, caseId, documentId, status, updatedAt',
      documentCandidates:
        'id, caseId, documentId, extractionSessionId, status, moneyParserVersion, updatedAt',
      caseTasks: 'id, caseId, status, priority, stage, type, updatedAt',
      documentProfiles: 'id, documentKind, status, updatedAt',
      extractionFeedback:
        'id, documentId, extractionSessionId, candidateId, applicability, createdAt',
      resolutionDecisions: 'id, caseId, objectType, objectId, type, decidedAt',
      form210Drafts: 'id, caseId, taxYear, generatedAt',
      priorYearReturns: 'id, caseId, taxYear, status, identityMatch, isCurrentVersion, updatedAt',
      priorYearCarryForwardCandidates:
        'id, caseId, priorYearReturnId, sourceBoxNumber, targetBoxNumber, decision, updatedAt',
      taxDependents: 'id, caseId, status, relationship, updatedAt',
      dependentSupports: 'id, caseId, dependentId, type, createdAt',
      dependentEvaluations: 'id, caseId, dependentId, status, staleDueToRuleChange, evaluatedAt',
      dependentsCaseContext: 'caseId, updatedAt',
    });
    // Sprint 2.4 (Fase D): reporte DIAN de facturación electrónica y sus
    // facturas individuales. Aditivo; ninguna tabla previa se modifica. Las
    // decisiones tributarias por factura (§25/§29 del prompt) reutilizan la
    // tabla existente `resolutionDecisions` (objectType
    // `electronic_invoice_purchase`/`electronic_invoice_report`) en vez de
    // crear una tercera tabla — el dominio ya lo permite (append-only,
    // reversible, con motivo y evidencia).
    this.version(15).stores({
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
      extractionSessions: 'id, caseId, documentId, status, updatedAt',
      documentCandidates:
        'id, caseId, documentId, extractionSessionId, status, moneyParserVersion, updatedAt',
      caseTasks: 'id, caseId, status, priority, stage, type, updatedAt',
      documentProfiles: 'id, documentKind, status, updatedAt',
      extractionFeedback:
        'id, documentId, extractionSessionId, candidateId, applicability, createdAt',
      resolutionDecisions: 'id, caseId, objectType, objectId, type, decidedAt',
      form210Drafts: 'id, caseId, taxYear, generatedAt',
      priorYearReturns: 'id, caseId, taxYear, status, identityMatch, isCurrentVersion, updatedAt',
      priorYearCarryForwardCandidates:
        'id, caseId, priorYearReturnId, sourceBoxNumber, targetBoxNumber, decision, updatedAt',
      taxDependents: 'id, caseId, status, relationship, updatedAt',
      dependentSupports: 'id, caseId, dependentId, type, createdAt',
      dependentEvaluations: 'id, caseId, dependentId, status, staleDueToRuleChange, evaluatedAt',
      dependentsCaseContext: 'caseId, updatedAt',
      electronicInvoiceReports: 'id, caseId, taxYear, processingStatus, importedAt',
      electronicInvoicePurchases:
        'id, reportId, caseId, normalizedCufe, cufeStatus, paymentMethodCategory, benefitDecision, createdAt',
    });
    // Sprint 2.4 (Fase G): inmuebles, actividad de arrendamiento, ingresos
    // vinculados y gastos candidatos. Aditivo; ninguna tabla previa se
    // modifica. `rentalIncomes` NUNCA duplica el valor de un registro
    // exógeno o hecho documental — es un enlace de lectura hacia esas
    // fuentes (§5 del prompt); la fuente de verdad y cualquier suma
    // agregada siguen viviendo en `results`/`facts`.
    this.version(16).stores({
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
      extractionSessions: 'id, caseId, documentId, status, updatedAt',
      documentCandidates:
        'id, caseId, documentId, extractionSessionId, status, moneyParserVersion, updatedAt',
      caseTasks: 'id, caseId, status, priority, stage, type, updatedAt',
      documentProfiles: 'id, documentKind, status, updatedAt',
      extractionFeedback:
        'id, documentId, extractionSessionId, candidateId, applicability, createdAt',
      resolutionDecisions: 'id, caseId, objectType, objectId, type, decidedAt',
      form210Drafts: 'id, caseId, taxYear, generatedAt',
      priorYearReturns: 'id, caseId, taxYear, status, identityMatch, isCurrentVersion, updatedAt',
      priorYearCarryForwardCandidates:
        'id, caseId, priorYearReturnId, sourceBoxNumber, targetBoxNumber, decision, updatedAt',
      taxDependents: 'id, caseId, status, relationship, updatedAt',
      dependentSupports: 'id, caseId, dependentId, type, createdAt',
      dependentEvaluations: 'id, caseId, dependentId, status, staleDueToRuleChange, evaluatedAt',
      dependentsCaseContext: 'caseId, updatedAt',
      electronicInvoiceReports: 'id, caseId, taxYear, processingStatus, importedAt',
      electronicInvoicePurchases:
        'id, reportId, caseId, normalizedCufe, cufeStatus, paymentMethodCategory, benefitDecision, createdAt',
      taxProperties: 'id, caseId, use, taxYear, updatedAt',
      rentalActivities: 'id, caseId, propertyId, updatedAt',
      rentalIncomes: 'id, caseId, propertyId, rentalActivityId, sourceKind, updatedAt',
      propertyExpenses:
        'id, caseId, propertyId, expenseType, eligibilityStatus, decisionStatus, updatedAt',
    });
    // Sprint 2.4 (Fase H): pagos de salud complementaria y medicina
    // prepagada. Aditivo; ninguna tabla previa se modifica. El tope
    // mensual agregado (16 UVT, art. 387 ET) se calcula en
    // `evaluateComplementaryHealthMonthlyCap` a partir de los pagos
    // persistidos aquí — esta tabla nunca guarda un total ya limitado.
    this.version(17).stores({
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
      extractionSessions: 'id, caseId, documentId, status, updatedAt',
      documentCandidates:
        'id, caseId, documentId, extractionSessionId, status, moneyParserVersion, updatedAt',
      caseTasks: 'id, caseId, status, priority, stage, type, updatedAt',
      documentProfiles: 'id, documentKind, status, updatedAt',
      extractionFeedback:
        'id, documentId, extractionSessionId, candidateId, applicability, createdAt',
      resolutionDecisions: 'id, caseId, objectType, objectId, type, decidedAt',
      form210Drafts: 'id, caseId, taxYear, generatedAt',
      priorYearReturns: 'id, caseId, taxYear, status, identityMatch, isCurrentVersion, updatedAt',
      priorYearCarryForwardCandidates:
        'id, caseId, priorYearReturnId, sourceBoxNumber, targetBoxNumber, decision, updatedAt',
      taxDependents: 'id, caseId, status, relationship, updatedAt',
      dependentSupports: 'id, caseId, dependentId, type, createdAt',
      dependentEvaluations: 'id, caseId, dependentId, status, staleDueToRuleChange, evaluatedAt',
      dependentsCaseContext: 'caseId, updatedAt',
      electronicInvoiceReports: 'id, caseId, taxYear, processingStatus, importedAt',
      electronicInvoicePurchases:
        'id, reportId, caseId, normalizedCufe, cufeStatus, paymentMethodCategory, benefitDecision, createdAt',
      taxProperties: 'id, caseId, use, taxYear, updatedAt',
      rentalActivities: 'id, caseId, propertyId, updatedAt',
      rentalIncomes: 'id, caseId, propertyId, rentalActivityId, sourceKind, updatedAt',
      propertyExpenses:
        'id, caseId, propertyId, expenseType, eligibilityStatus, decisionStatus, updatedAt',
      complementaryHealthPayments:
        'id, caseId, beneficiary, beneficiaryDependentId, month, taxYear, eligibilityStatus, decisionStatus, updatedAt',
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
