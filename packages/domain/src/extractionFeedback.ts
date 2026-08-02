import { z } from 'zod';
import { IsoTimestampSchema } from './primitives';

// Registro determinista de una decisión de calibración humana (§16-17). No
// promueve nada automáticamente: `applicability` refleja lo que el analista
// eligió explícitamente, nunca una inferencia del sistema.
export const ExtractionFeedbackDecisionSchema = z.enum([
  'category_corrected',
  'product_corrected',
  'value_corrected',
  'rejected_false_positive',
  'zone_marked_ignored',
  'field_selected',
]);
export type ExtractionFeedbackDecision = z.infer<typeof ExtractionFeedbackDecisionSchema>;

export const ExtractionFeedbackApplicabilitySchema = z.enum([
  'this_document_only',
  'similar_documents',
  'profile_update',
]);
export type ExtractionFeedbackApplicability = z.infer<typeof ExtractionFeedbackApplicabilitySchema>;

export const ExtractionFeedbackMethodSchema = z.enum(['native', 'ocr']);
export type ExtractionFeedbackMethod = z.infer<typeof ExtractionFeedbackMethodSchema>;

export const ExtractionFeedbackSchema = z.object({
  id: z.string().min(1),
  documentId: z.string().min(1),
  extractionSessionId: z.string().min(1),
  candidateId: z.string().nullable(),
  decision: ExtractionFeedbackDecisionSchema,
  reason: z.string().max(240),
  method: ExtractionFeedbackMethodSchema.nullable(),
  adapterId: z.string().nullable(),
  profileId: z.string().nullable(),
  beforeValue: z.string().max(160).nullable(),
  afterValue: z.string().max(160).nullable(),
  page: z.number().int().positive().nullable(),
  zoneId: z.string().nullable(),
  applicability: ExtractionFeedbackApplicabilitySchema,
  createdAt: IsoTimestampSchema,
});
export type ExtractionFeedback = z.infer<typeof ExtractionFeedbackSchema>;

export const EXTRACTION_FEEDBACK_SCHEMA_VERSION = '1.0.0';
