import { z } from 'zod';
import { IsoTimestampSchema, SourceLocationSchema } from './primitives';
import {
  ClassificationEvidenceSchema,
  TaxCategorySchema,
  TaxConfidenceSchema,
  TaxNatureSchema,
  TaxTreatmentSchema,
} from './taxClassification';

export const RecordRelationTypeSchema = z.enum([
  'subset_of',
  'component_of',
  'summary_of',
  'related_movement',
  'informational_basis_of',
  'possible_duplicate_of',
]);
export type RecordRelationType = z.infer<typeof RecordRelationTypeSchema>;

export const RelationReviewStatusSchema = z.enum([
  'automatically_resolved',
  'pending_review',
  'confirmed',
  'rejected',
]);
export type RelationReviewStatus = z.infer<typeof RelationReviewStatusSchema>;

export const RecordRelationSchema = z.object({
  id: z.string().min(1),
  sourceRecordId: z.string().min(1),
  targetRecordId: z.string().min(1),
  type: RecordRelationTypeSchema,
  confidence: TaxConfidenceSchema,
  evidence: z.array(
    z.object({
      kind: z.enum([
        'detail_similarity',
        'entity_match',
        'value_containment',
        'classification',
        'suggested_use',
        'analyst_decision',
      ]),
      description: z.string(),
    }),
  ),
  ruleId: z.string(),
  ruleVersion: z.string(),
  reviewStatus: RelationReviewStatusSchema,
});
export type RecordRelation = z.infer<typeof RecordRelationSchema>;

export const ClassificationSnapshotSchema = z.object({
  category: TaxCategorySchema,
  nature: TaxNatureSchema,
  treatment: TaxTreatmentSchema,
  confidence: TaxConfidenceSchema,
  evidence: z.array(ClassificationEvidenceSchema),
});
export type ClassificationSnapshot = z.infer<typeof ClassificationSnapshotSchema>;

export const ResolutionStatusSchema = z.enum([
  'automatically_resolved',
  'analyst_confirmed',
  'analyst_modified',
  'pending_review',
  'excluded_justified',
  'ignored_justified',
]);
export type ResolutionStatus = z.infer<typeof ResolutionStatusSchema>;

export const ResolutionOriginSchema = z.enum(['automatic', 'manual']);
export type ResolutionOrigin = z.infer<typeof ResolutionOriginSchema>;

export const ResolutionDecisionSchema = z.object({
  id: z.string().min(1),
  status: ResolutionStatusSchema,
  classification: ClassificationSnapshotSchema,
  observation: z.string(),
  justification: z.string(),
  decidedAt: IsoTimestampSchema,
  ruleVersion: z.string(),
  origin: ResolutionOriginSchema,
});
export type ResolutionDecision = z.infer<typeof ResolutionDecisionSchema>;

export const RecordResolutionSchema = z.object({
  recordId: z.string().min(1),
  status: ResolutionStatusSchema,
  automaticClassification: ClassificationSnapshotSchema,
  finalClassification: ClassificationSnapshotSchema,
  observation: z.string(),
  justification: z.string(),
  resolvedAt: IsoTimestampSchema.nullable(),
  ruleVersion: z.string(),
  origin: ResolutionOriginSchema,
  affectedRecordIds: z.array(z.string()),
  affectedRelationIds: z.array(z.string()),
  isObsolete: z.boolean(),
  obsoleteReason: z.string().nullable(),
  history: z.array(ResolutionDecisionSchema),
});
export type RecordResolution = z.infer<typeof RecordResolutionSchema>;

export const MatrixGroupIdSchema = z.enum([
  'employment_income',
  'gross_income_total',
  'financial_income',
  'other_income',
  'occasional_gains',
  'assets',
  'liabilities',
  'withholdings',
  'financial_movements',
  'card_consumption',
  'invoiced_purchases',
  'electronic_invoice_benefit_base',
  'informational_records',
  'pending_records',
]);
export type MatrixGroupId = z.infer<typeof MatrixGroupIdSchema>;

export const MatrixEntryDispositionSchema = z.enum([
  'included',
  'excluded',
  'informational',
  'pending',
]);
export type MatrixEntryDisposition = z.infer<typeof MatrixEntryDispositionSchema>;

export const ReconciliationStatusSchema = z.enum([
  'reconciled',
  'rounding_difference',
  'relevant_difference',
  'incomplete',
  'not_comparable',
  'pending_documents',
]);
export type ReconciliationStatus = z.infer<typeof ReconciliationStatusSchema>;

export const MatrixRecordEntrySchema = z.object({
  recordId: z.string().min(1),
  disposition: MatrixEntryDispositionSchema,
  reason: z.string(),
  value: z.number(),
  effectiveClassification: ClassificationSnapshotSchema,
  relationIds: z.array(z.string()),
  resolutionStatus: ResolutionStatusSchema,
});
export type MatrixRecordEntry = z.infer<typeof MatrixRecordEntrySchema>;

export const MatrixGroupSchema = z.object({
  id: MatrixGroupIdSchema,
  label: z.string(),
  consolidatedValue: z.number(),
  includedCount: z.number().int().nonnegative(),
  excludedCount: z.number().int().nonnegative(),
  pendingCount: z.number().int().nonnegative(),
  thresholdNumber: z.number().int().positive().nullable(),
  thresholdValue: z.number().nullable(),
  differenceAbsolute: z.number().nullable(),
  differencePercentage: z.number().nullable(),
  reconciliationStatus: ReconciliationStatusSchema,
  confidence: TaxConfidenceSchema,
  warnings: z.array(z.string()),
  recommendedAction: z.string(),
  sourceEvidence: z.array(SourceLocationSchema),
  entries: z.array(MatrixRecordEntrySchema),
});
export type MatrixGroup = z.infer<typeof MatrixGroupSchema>;

export const ElectronicInvoicingSummarySchema = z.object({
  totalNetInvoiced: z.number(),
  eligibleBenefitBase: z.number(),
  eligiblePercentage: z.number().nullable(),
  preliminaryBenefit: z.number(),
  difference: z.number(),
  totalRecordIds: z.array(z.string()),
  benefitBaseRecordIds: z.array(z.string()),
  relationIds: z.array(z.string()),
  reviewStatus: z.enum(['reviewed', 'pending', 'not_available']),
});
export type ElectronicInvoicingSummary = z.infer<typeof ElectronicInvoicingSummarySchema>;

export const QualityDimensionsSchema = z.object({
  extraction: z.object({
    score: z.number().min(0).max(100),
    issueCount: z.number().int().nonnegative(),
    explanation: z.string(),
  }),
  classification: z.object({
    score: z.number().min(0).max(100),
    pendingCount: z.number().int().nonnegative(),
    explanation: z.string(),
  }),
  reconciliation: z.object({
    score: z.number().min(0).max(100),
    unresolvedGroupCount: z.number().int().nonnegative(),
    explanation: z.string(),
  }),
});
export type QualityDimensions = z.infer<typeof QualityDimensionsSchema>;

export const TaxMatrixSchema = z.object({
  ruleVersion: z.string(),
  generatedAt: IsoTimestampSchema,
  groups: z.array(MatrixGroupSchema),
  electronicInvoicing: ElectronicInvoicingSummarySchema,
  quality: QualityDimensionsSchema,
});
export type TaxMatrix = z.infer<typeof TaxMatrixSchema>;

export const CaseAnalysisSchema = z.object({
  caseId: z.string().min(1),
  relationships: z.array(RecordRelationSchema),
  resolutions: z.array(RecordResolutionSchema),
  matrix: TaxMatrixSchema,
  ruleVersion: z.string(),
  sourceParserVersion: z.string(),
  updatedAt: IsoTimestampSchema,
});
export type CaseAnalysis = z.infer<typeof CaseAnalysisSchema>;
