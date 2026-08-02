import { z } from 'zod';
import { EntityCategorySchema } from './aggregates';
import { ConfidenceLevelSchema } from './checklist';
import { IsoTimestampSchema } from './primitives';
import { TaxCategorySchema, TaxNatureSchema, TaxTreatmentSchema } from './taxClassification';

export const ProductTypeSchema = z.enum([
  'checking_account',
  'savings_account',
  'credit_card',
  'mortgage_loan',
  'consumer_loan',
  'cdt',
  'investment_fund',
  'employee_fund',
  'severance',
  'property',
  'employment_income',
  'prize',
  'other',
  'unidentified',
]);
export type ProductType = z.infer<typeof ProductTypeSchema>;

export const CaseProductSchema = z.object({
  id: z.string().min(1),
  caseId: z.string().min(1),
  entityId: z.string().nullable(),
  type: ProductTypeSchema,
  label: z.string(),
  status: z.enum(['active', 'unidentified', 'obsolete']),
  notes: z.string(),
  createdAt: IsoTimestampSchema,
  updatedAt: IsoTimestampSchema,
});
export type CaseProduct = z.infer<typeof CaseProductSchema>;

export const CoverageStatusSchema = z.enum([
  'not_evaluated',
  'partial',
  'covered',
  'not_applicable',
  'requires_review',
]);
export type CoverageStatus = z.infer<typeof CoverageStatusSchema>;

export const FactRequirementRelationSchema = z.enum([
  'covers',
  'partially_covers',
  'provides_evidence',
  'contradicts',
  'requires_support',
]);
export type FactRequirementRelation = z.infer<typeof FactRequirementRelationSchema>;

export const RequirementCoverageSchema = z.object({
  id: z.string().min(1),
  caseId: z.string().min(1),
  requirementId: z.string().min(1),
  documentId: z.string().nullable(),
  factId: z.string().nullable(),
  entityId: z.string().nullable(),
  status: CoverageStatusSchema,
  relation: FactRequirementRelationSchema,
  notes: z.string(),
  updatedAt: IsoTimestampSchema,
});
export type RequirementCoverage = z.infer<typeof RequirementCoverageSchema>;

export const FactCaptureMethodSchema = z.enum(['manual', 'automatic', 'assisted', 'imported']);
export type FactCaptureMethod = z.infer<typeof FactCaptureMethodSchema>;
export const FactReviewStatusSchema = z.enum(['pending', 'reviewed', 'confirmed', 'rejected']);
export type FactReviewStatus = z.infer<typeof FactReviewStatusSchema>;

export const DocumentFactHistorySchema = z.object({
  id: z.string(),
  changedAt: IsoTimestampSchema,
  author: z.string(),
  action: z.string(),
  previousValue: z.number().nullable(),
  nextValue: z.number().nullable(),
  observation: z.string(),
});
export type DocumentFactHistory = z.infer<typeof DocumentFactHistorySchema>;

export const DocumentFactSchema = z.object({
  id: z.string().min(1),
  caseId: z.string().min(1),
  documentId: z.string().nullable(),
  entityId: z.string().nullable(),
  productId: z.string().nullable(),
  originalConcept: z.string().min(1),
  category: TaxCategorySchema,
  nature: TaxNatureSchema,
  treatment: TaxTreatmentSchema,
  value: z.number(),
  currency: z.string().length(3),
  cutoffDate: z.string().nullable(),
  period: z.string(),
  pageOrSection: z.string(),
  evidence: z.string(),
  captureMethod: FactCaptureMethodSchema,
  confidence: ConfidenceLevelSchema,
  reviewStatus: FactReviewStatusSchema,
  requirementIds: z.array(z.string()),
  author: z.string(),
  createdAt: IsoTimestampSchema,
  updatedAt: IsoTimestampSchema,
  history: z.array(DocumentFactHistorySchema),
  extractionCandidateId: z.string().nullable().optional(),
  extractedValue: z.number().nullable().optional(),
  correctedValue: z.number().nullable().optional(),
  adapterId: z.string().nullable().optional(),
  adapterVersion: z.string().nullable().optional(),
  finalConfidence: z.enum(['high', 'medium', 'low', 'insufficient']).optional(),
  analystDecision: z.string().optional(),
});
export type DocumentFact = z.infer<typeof DocumentFactSchema>;

export const PreliminaryReconciliationStatusSchema = z.enum([
  'pending',
  'suggested',
  'reconciled',
  'minor_difference',
  'relevant_difference',
  'not_comparable',
  'other_product',
  'exogenous_data_questioned',
]);
export type PreliminaryReconciliationStatus = z.infer<typeof PreliminaryReconciliationStatusSchema>;

export const PreliminaryReconciliationSchema = z.object({
  id: z.string().min(1),
  caseId: z.string().min(1),
  factIds: z.array(z.string()).min(1),
  exogenousRecordIds: z.array(z.string()).min(1),
  status: PreliminaryReconciliationStatusSchema,
  exogenousValue: z.number(),
  documentaryValue: z.number(),
  difference: z.number(),
  differencePercentage: z.number().nullable(),
  productId: z.string().nullable(),
  explanation: z.string(),
  analystDecision: z.string(),
  suggestionScore: z.number().min(0).max(100).nullable(),
  suggestionSignals: z.array(z.string()),
  confirmedByHuman: z.boolean(),
  createdAt: IsoTimestampSchema,
  updatedAt: IsoTimestampSchema,
});
export type PreliminaryReconciliation = z.infer<typeof PreliminaryReconciliationSchema>;

export const ReconciliationSuggestionSchema = z.object({
  id: z.string(),
  factId: z.string(),
  exogenousRecordId: z.string(),
  score: z.number().min(0).max(100),
  signals: z.array(z.string()),
  exogenousValue: z.number(),
  documentaryValue: z.number(),
  difference: z.number(),
  differencePercentage: z.number().nullable(),
});
export type ReconciliationSuggestion = z.infer<typeof ReconciliationSuggestionSchema>;

export const CaseProgressSchema = z.object({
  documentCoverage: z.number().min(0).max(100),
  reviewedFacts: z.number().min(0).max(100),
  reconciliation: z.number().min(0).max(100),
  findings: z.number().min(0).max(100),
  matrixPreparation: z.number().min(0).max(100),
  documentCount: z.number().int().nonnegative(),
  pendingRequirements: z.number().int().nonnegative(),
  openFindings: z.number().int().nonnegative(),
  pendingMatrixGroups: z.number().int().nonnegative(),
  explanation: z.array(z.string()),
});
export type CaseProgress = z.infer<typeof CaseProgressSchema>;

export const CaseEntitySummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  legalName: z.string().optional(),
  brandName: z.string().nullable().optional(),
  groupName: z.string().nullable().optional(),
  taxIdMasked: z.string().nullable(),
  category: EntityCategorySchema,
  exogenousRecordCount: z.number(),
  documentCount: z.number(),
  requirementCount: z.number(),
  coveredRequirementCount: z.number(),
  factCount: z.number(),
  reconciliationCount: z.number(),
  openFindingCount: z.number(),
  coveragePercentage: z.number(),
  inferredProducts: z.array(z.string()),
  status: z.string(),
});
export type CaseEntitySummary = z.infer<typeof CaseEntitySummarySchema>;

export const TAX_CASE_EXPORT_SCHEMA_VERSION = '2.3.0';
