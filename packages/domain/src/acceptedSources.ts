import { z } from 'zod';
import { ConfidenceLevelSchema } from './checklist';
import { IsoTimestampSchema, SourceLocationSchema } from './primitives';
import { TaxCategorySchema } from './taxClassification';

export const InformationSourceSchema = z.enum([
  'exogenous_information',
  'document',
  'manual_entry',
  'imported_data',
  'deterministic_calculation',
  'analyst_resolution',
  'ai_assisted_future',
]);
export type InformationSource = z.infer<typeof InformationSourceSchema>;

export const AcceptedSourceStatusSchema = z.enum([
  'pending_review',
  'provisionally_accepted',
  'analyst_confirmed',
  'pending_support',
  'supported_by_document',
  'replaced_by_document',
  'contradicted_by_document',
  'not_comparable',
  'rejected',
  'excluded_justified',
]);
export type AcceptedSourceStatus = z.infer<typeof AcceptedSourceStatusSchema>;

export const ExogenousAcceptanceReasonSchema = z.enum([
  'entity_does_not_issue_certificate',
  'requested_without_response',
  'document_unavailable',
  'document_lost',
  'validated_by_holder',
  'other',
]);
export type ExogenousAcceptanceReason = z.infer<typeof ExogenousAcceptanceReasonSchema>;

export const OccasionalGainRecognitionSchema = z.enum([
  'own_prize',
  'collected_for_third_party',
  'unrecognized',
  'requires_review',
]);
export type OccasionalGainRecognition = z.infer<typeof OccasionalGainRecognitionSchema>;

export const SourceDecisionHistorySchema = z.object({
  id: z.string().min(1),
  changedAt: IsoTimestampSchema,
  author: z.string().min(1),
  action: z.string().min(1),
  previousStatus: AcceptedSourceStatusSchema.nullable(),
  nextStatus: AcceptedSourceStatusSchema,
  observation: z.string(),
});
export type SourceDecisionHistory = z.infer<typeof SourceDecisionHistorySchema>;

export const AcceptedExogenousValueSchema = z.object({
  id: z.string().min(1),
  caseId: z.string().min(1),
  exogenousRecordId: z.string().min(1),
  requirementId: z.string().nullable(),
  entityId: z.string().nullable(),
  primarySource: z.literal('exogenous_information'),
  secondarySources: z.array(InformationSourceSchema),
  captureMethod: z.literal('analyst_resolution'),
  confidence: ConfidenceLevelSchema,
  status: AcceptedSourceStatusSchema,
  reason: ExogenousAcceptanceReasonSchema,
  observation: z.string(),
  originalConcept: z.string(),
  originalValue: z.number(),
  provisionalValue: z.number(),
  category: TaxCategorySchema,
  taxGroup: z.string(),
  source: SourceLocationSchema,
  includedInMatrix: z.boolean(),
  documentId: z.string().nullable(),
  replacementDecisionId: z.string().nullable(),
  occasionalGainRecognition: OccasionalGainRecognitionSchema.nullable(),
  beneficiaryAlias: z.string().nullable(),
  ruleVersion: z.string().min(1),
  author: z.string().min(1),
  createdAt: IsoTimestampSchema,
  updatedAt: IsoTimestampSchema,
  history: z.array(SourceDecisionHistorySchema),
});
export type AcceptedExogenousValue = z.infer<typeof AcceptedExogenousValueSchema>;

export const RequirementManagementChannelSchema = z.enum([
  'email',
  'phone',
  'portal',
  'in_person',
  'not_attempted',
  'other',
]);
export type RequirementManagementChannel = z.infer<typeof RequirementManagementChannelSchema>;

export const RequirementAvailabilityStatusSchema = z.enum([
  'alternative_source_covered',
  'pending_support',
  'requires_review',
  'justified_unavailable',
]);
export type RequirementAvailabilityStatus = z.infer<typeof RequirementAvailabilityStatusSchema>;

export const RequirementSourceDecisionSchema = z.object({
  id: z.string().min(1),
  caseId: z.string().min(1),
  requirementId: z.string().min(1),
  status: RequirementAvailabilityStatusSchema,
  reason: z.string().min(1),
  managedAt: z.string().min(1),
  channel: RequirementManagementChannelSchema,
  observation: z.string(),
  evidenceDocumentId: z.string().nullable(),
  acceptedSourceId: z.string().nullable(),
  author: z.string().min(1),
  createdAt: IsoTimestampSchema,
  updatedAt: IsoTimestampSchema,
});
export type RequirementSourceDecision = z.infer<typeof RequirementSourceDecisionSchema>;

export const ACCEPTED_SOURCE_RULE_VERSION = 'accepted-exogenous-v1';
