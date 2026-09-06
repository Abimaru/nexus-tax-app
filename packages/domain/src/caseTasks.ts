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
  'run_page_ocr',
  'review_ocr_contradiction',
  'recover_document_extraction',
  'test_document_profile',
  'resolve_form_box',
  'review_resolution',
  /** La declaración anterior cargada no coincide con la identidad del expediente (Fase B). */
  'review_prior_year_identity_mismatch',
  /** Confirmar, corregir o rechazar un candidato de arrastre (R133→R130, R137→R131). */
  'confirm_prior_year_carry_forward',
  /** Comparación de evolución sugiere un posible error de escala ×10/×100/×1000. */
  'review_historical_scale_anomaly',
  /** Existen dos declaraciones para el mismo año que no se han conciliado (original/corrección). */
  'resolve_prior_year_conflict',
  /** El parser no pudo identificar una casilla requerida en la declaración anterior. */
  'resolve_prior_year_extraction_gap',
  /** Dependiente sin documento de identidad registrado (Sprint 2.4, Fase C). */
  'dependent_missing_document',
  /** Falta certificado de estudios para un dependiente hijo estudiante. */
  'dependent_missing_education_certificate',
  /** Falta definir los ingresos anuales del dependiente para evaluar elegibilidad. */
  'dependent_missing_income_info',
  /** Falta soporte de dependencia económica/condición física o psicológica. */
  'dependent_missing_dependency_support',
  /** Un dependiente aparenta no ser elegible según la evaluación puro. */
  'dependent_possibly_not_eligible',
  /** El quinto dependiente (o siguiente) queda fuera del límite de la adición de 72 UVT. */
  'dependent_exceeds_additional_max',
  /** La elegibilidad de un dependiente quedó `stale_due_to_rule_change` tras actualizar el motor. */
  'dependent_stale_rule_change',
  /** El contribuyente es independiente y debe elegir un único beneficio para este dependiente. */
  'dependent_requires_coexistence_choice',
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
  source: z.enum([
    'document',
    'candidate',
    'requirement',
    'finding',
    'matrix',
    'filing',
    'ocr',
    'profile',
    'system',
    'prior_year_return',
    'dependent',
  ]),
  stage: WorkflowStageIdSchema,
  view: WorkflowViewIdSchema,
  entityId: z.string().nullable(),
  documentId: z.string().nullable(),
  requirementId: z.string().nullable(),
  candidateId: z.string().nullable(),
  reconciliationId: z.string().nullable(),
  matrixGroupId: z.string().nullable(),
  extractionSessionId: z.string().nullable(),
  profileId: z.string().nullable(),
  page: z.number().int().positive().nullable(),
  formBoxNumber: z.number().int().positive().nullable().optional(),
  resolutionDecisionId: z.string().nullable().optional(),
  /** Dependiente concreto al que deep-linkea la tarea (Sprint 2.4, Fase C). */
  dependentId: z.string().nullable().optional(),
  priority: z.enum(['high', 'medium', 'low']),
  blocking: z.boolean(),
  status: CaseTaskStatusSchema,
  recommendedAction: z.string().min(1),
  currentValue: z.number().nullable().optional(),
  expectedSource: z.string().nullable().optional(),
  destinationLabel: z.string().optional(),
  resolutionOptions: z
    .array(
      z.object({
        type: z.enum([
          'confirm_proposal',
          'correct_value',
          'choose_source',
          'replace_source',
          'exclude_from_calculation',
          'accept_exogenous_provisionally',
          'use_document',
          'register_manual_value',
          'mark_not_applicable',
          'confirm_zero',
          'request_document',
          'review_document',
          'reject_suggestion',
          'restore_automatic',
        ]),
        label: z.string(),
        effect: z.string(),
      }),
    )
    .optional(),
  ruleId: z.string().min(1),
  evidence: z.array(z.string()),
  createdAt: IsoTimestampSchema,
  updatedAt: IsoTimestampSchema,
});
export type CaseTask = z.infer<typeof CaseTaskSchema>;

export const CASE_TASK_SCHEMA_VERSION = '2.4.1';
