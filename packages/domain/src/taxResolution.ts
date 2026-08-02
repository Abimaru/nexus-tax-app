import { z } from 'zod';
import { IsoTimestampSchema } from './primitives';
import { TaxCategorySchema } from './taxClassification';

export const TaxResolutionDecisionTypeSchema = z.enum([
  'confirm_classification',
  'change_classification',
  'include_record',
  'exclude_record',
  'mark_informational',
  'accept_document_value',
  'accept_exogenous_provisionally',
  'register_manual_value',
  'correct_manual_value',
  'relate_records',
  'mark_subset',
  'mark_component',
  'mark_duplicate',
  'accept_rounding_difference',
  'declare_not_comparable',
  'request_document',
  'mark_document_unavailable',
  'leave_pending',
  'reject_suggestion',
  'confirm_reconciliation',
  'adjust_form_box',
  'restore_automatic_value',
  'revert_decision',
]);
export type TaxResolutionDecisionType = z.infer<typeof TaxResolutionDecisionTypeSchema>;

export const TaxResolutionObjectTypeSchema = z.enum([
  'record',
  'matrix_group',
  'reconciliation',
  'candidate',
  'requirement',
  'form_box',
]);
export type TaxResolutionObjectType = z.infer<typeof TaxResolutionObjectTypeSchema>;

export const TaxResolutionEvidenceSchema = z.object({
  kind: z.enum(['record', 'document', 'fact', 'threshold', 'rule', 'manual_note']),
  referenceId: z.string().nullable(),
  description: z.string().min(1),
});
export type TaxResolutionEvidence = z.infer<typeof TaxResolutionEvidenceSchema>;

/** Evento inmutable. Una reversión crea otro evento y nunca borra el anterior. */
export const TaxResolutionDecisionSchema = z.object({
  id: z.string().min(1),
  caseId: z.string().min(1),
  type: TaxResolutionDecisionTypeSchema,
  objectType: TaxResolutionObjectTypeSchema,
  objectId: z.string().min(1),
  previousState: z.string().nullable(),
  finalState: z.string().min(1),
  selectedAlternative: z.string().min(1),
  originalValue: z.number().nullable(),
  finalValue: z.number().nullable(),
  originalCategory: TaxCategorySchema.nullable(),
  finalCategory: TaxCategorySchema.nullable(),
  proposedBox: z.number().int().positive().nullable(),
  reason: z.string().min(1),
  note: z.string(),
  evidence: z.array(TaxResolutionEvidenceSchema),
  localAuthor: z.string().min(1),
  decidedAt: IsoTimestampSchema,
  ruleVersion: z.string().min(1),
  reversible: z.boolean(),
  replacesDecisionId: z.string().nullable(),
});
export type TaxResolutionDecision = z.infer<typeof TaxResolutionDecisionSchema>;

export const TAX_RESOLUTION_SCHEMA_VERSION = '2.3.0';
