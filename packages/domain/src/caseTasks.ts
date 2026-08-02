import { z } from 'zod';
import { IsoTimestampSchema } from './primitives';
import { WorkflowStageIdSchema, WorkflowViewIdSchema } from './navigation';

export const CaseTaskTypeSchema = z.enum([
  'upload_document',
  'review_extraction',
  'confirm_candidate',
  'resolve_contradiction',
  'associate_entity',
  'identify_product',
  'cover_requirement',
  'review_fact',
  'reconcile_value',
  'accept_exogenous_provisionally',
  'mark_document_unavailable',
  'review_occasional_gain',
  'resolve_matrix_group',
  'confirm_vat',
  'review_filing_obligation',
]);
export type CaseTaskType = z.infer<typeof CaseTaskTypeSchema>;

export const CaseTaskStatusSchema = z.enum([
  'pending',
  'in_progress',
  'resolved',
  'discarded',
  'blocked',
]);

export const CaseTaskSchema = z.object({
  id: z.string().min(1),
  caseId: z.string().min(1),
  type: CaseTaskTypeSchema,
  title: z.string().min(1),
  explanation: z.string().min(1),
  source: z.enum(['document', 'candidate', 'requirement', 'finding', 'matrix', 'filing', 'system']),
  stage: WorkflowStageIdSchema,
  view: WorkflowViewIdSchema,
  entityId: z.string().nullable(),
  documentId: z.string().nullable(),
  requirementId: z.string().nullable(),
  candidateId: z.string().nullable(),
  reconciliationId: z.string().nullable(),
  matrixGroupId: z.string().nullable(),
  priority: z.enum(['high', 'medium', 'low']),
  blocking: z.boolean(),
  status: CaseTaskStatusSchema,
  recommendedAction: z.string().min(1),
  ruleId: z.string().min(1),
  evidence: z.array(z.string()),
  createdAt: IsoTimestampSchema,
  updatedAt: IsoTimestampSchema,
});
export type CaseTask = z.infer<typeof CaseTaskSchema>;

export const CASE_TASK_SCHEMA_VERSION = '2.1.1';
