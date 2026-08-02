import { z } from 'zod';
import { DocumentKindSchema } from './documents';
import { IsoTimestampSchema } from './primitives';
import { ProductTypeSchema } from './taxDossier';
import { TaxCategorySchema, TaxNatureSchema, TaxTreatmentSchema } from './taxClassification';

export const DocumentExtractionStatusSchema = z.enum([
  'pending',
  'reading',
  'password_required',
  'classifying',
  'extracting',
  'ready_for_review',
  'partially_read',
  'unsupported',
  'failed',
  'cancelled',
  'confirmed',
]);
export type DocumentExtractionStatus = z.infer<typeof DocumentExtractionStatusSchema>;

export const DocumentConfidenceLevelSchema = z.enum(['high', 'medium', 'low', 'insufficient']);
export type DocumentConfidenceLevel = z.infer<typeof DocumentConfidenceLevelSchema>;

export const DocumentCandidateStatusSchema = z.enum([
  'pending',
  'confirmed',
  'corrected',
  'rejected',
  'duplicate',
  'informational',
  'requires_review',
  'obsolete',
]);
export type DocumentCandidateStatus = z.infer<typeof DocumentCandidateStatusSchema>;

export const DocumentFindingCategorySchema = z.enum([
  'technical_limitation',
  'pending_data',
  'contradiction',
  'double_counting_risk',
  'review_required',
]);

export const DocumentExtractionFindingSchema = z.object({
  code: z.enum([
    'document_unrecognized',
    'text_not_extractable',
    'password_required',
    'low_confidence_classification',
    'ambiguous_value',
    'multiple_entities',
    'possible_contradiction',
    'missing_cutoff_date',
    'incompatible_period',
    'duplicate_candidate',
    'partial_extraction',
    'adapter_unavailable',
    'limit_exceeded',
  ]),
  category: DocumentFindingCategorySchema,
  message: z.string(),
  page: z.number().int().positive().nullable(),
  suggestedAction: z.string(),
});
export type DocumentExtractionFinding = z.infer<typeof DocumentExtractionFindingSchema>;

export const DocumentClassificationSchema = z.object({
  proposedKind: DocumentKindSchema,
  confidence: DocumentConfidenceLevelSchema,
  alternatives: z.array(
    z.object({ kind: DocumentKindSchema, confidence: DocumentConfidenceLevelSchema }),
  ),
  supportingSignals: z.array(z.string()),
  opposingSignals: z.array(z.string()),
  requiresReview: z.boolean(),
  correctedKind: DocumentKindSchema.nullable(),
});
export type DocumentClassification = z.infer<typeof DocumentClassificationSchema>;

export const CandidateExogenousMatchSchema = z.object({
  recordId: z.string(),
  status: z.enum([
    'strong_match',
    'probable_match',
    'multiple_candidates',
    'no_match',
    'possible_contradiction',
  ]),
  reasons: z.array(z.string()),
});

export const CandidateDecisionSchema = z.object({
  id: z.string(),
  action: z.enum(['confirmed', 'corrected', 'rejected', 'duplicate', 'informational', 'restored']),
  previousStatus: DocumentCandidateStatusSchema,
  nextStatus: DocumentCandidateStatusSchema,
  previousValue: z.number().nullable(),
  nextValue: z.number().nullable(),
  observation: z.string(),
  decidedAt: IsoTimestampSchema,
  author: z.string(),
});

export const DocumentFactCandidateSchema = z.object({
  id: z.string().min(1),
  caseId: z.string().min(1),
  documentId: z.string().min(1),
  extractionSessionId: z.string().min(1),
  page: z.number().int().positive(),
  proposedEntityId: z.string().nullable(),
  entityName: z.string().nullable(),
  proposedProductId: z.string().nullable(),
  productType: ProductTypeSchema,
  productLabel: z.string().nullable(),
  originalConcept: z.string().min(1),
  normalizedConcept: z.string(),
  proposedCategory: TaxCategorySchema,
  proposedNature: TaxNatureSchema,
  proposedTreatment: TaxTreatmentSchema,
  correctedCategory: TaxCategorySchema.nullable(),
  correctedNature: TaxNatureSchema.nullable(),
  correctedTreatment: TaxTreatmentSchema.nullable(),
  extractedValue: z.number(),
  correctedValue: z.number().nullable(),
  finalValue: z.number().nullable(),
  currency: z.string().length(3),
  period: z.string().nullable(),
  cutoffDate: z.string().nullable(),
  evidence: z.object({
    page: z.number().int().positive(),
    excerpt: z.string().max(240),
    detectedLabel: z.string().max(160),
    detectedValue: z.string().max(80),
    location: z.string(),
  }),
  adapterId: z.string(),
  adapterVersion: z.string(),
  ruleId: z.string(),
  confidence: z.object({
    level: DocumentConfidenceLevelSchema,
    score: z.number().min(0).max(100),
    reasons: z.array(z.string()),
  }),
  warnings: z.array(z.string()),
  status: DocumentCandidateStatusSchema,
  possibleDuplicateIds: z.array(z.string()),
  suggestedRequirementIds: z.array(z.string()),
  suggestedExogenousMatches: z.array(CandidateExogenousMatchSchema),
  observation: z.string(),
  factId: z.string().nullable(),
  decisions: z.array(CandidateDecisionSchema),
  createdAt: IsoTimestampSchema,
  updatedAt: IsoTimestampSchema,
});
export type DocumentFactCandidate = z.infer<typeof DocumentFactCandidateSchema>;

export const DocumentExtractionSessionSchema = z.object({
  id: z.string().min(1),
  caseId: z.string().min(1),
  documentId: z.string().min(1),
  runNumber: z.number().int().positive(),
  status: DocumentExtractionStatusSchema,
  phase: z.enum(['pending', 'reading', 'classifying', 'extracting', 'review', 'complete']),
  completedPhases: z.array(z.string()),
  pageCount: z.number().int().nonnegative(),
  readablePageCount: z.number().int().nonnegative(),
  candidateIds: z.array(z.string()),
  classification: DocumentClassificationSchema.nullable(),
  adapterId: z.string().nullable(),
  adapterVersion: z.string().nullable(),
  findings: z.array(DocumentExtractionFindingSchema),
  textPersisted: z.literal(false),
  errorCode: z.string().nullable(),
  errorMessage: z.string().nullable(),
  supersedesSessionId: z.string().nullable(),
  obsoleteCandidateIds: z.array(z.string()),
  startedAt: IsoTimestampSchema,
  finishedAt: IsoTimestampSchema.nullable(),
  updatedAt: IsoTimestampSchema,
});
export type DocumentExtractionSession = z.infer<typeof DocumentExtractionSessionSchema>;

export const DOCUMENT_EXTRACTION_SCHEMA_VERSION = '2.1.0';
