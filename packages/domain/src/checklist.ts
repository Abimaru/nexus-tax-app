import { z } from 'zod';
import { EntityCategorySchema } from './aggregates';

/**
 * DocumentaryRequirement — requisito documental preliminar.
 *
 * IMPORTANTE (§8): NexusTax NO afirma que un documento sea legalmente
 * obligatorio. Cada requisito es una RECOMENDACIÓN de soporte con su nivel de
 * confianza y el origen de la recomendación. El campo `isLegallyRequired`
 * existe para dejar explícito que, en el Sprint 1, siempre es `false`.
 */

export const RequirementStatusSchema = z.enum([
  'pending',
  'available',
  'received',
  'not_applicable',
]);
export type RequirementStatus = z.infer<typeof RequirementStatusSchema>;

export const ConfidenceLevelSchema = z.enum(['low', 'medium', 'high']);
export type ConfidenceLevel = z.infer<typeof ConfidenceLevelSchema>;

export const RequirementAttachmentSchema = z.object({
  id: z.string().min(1),
  fileName: z.string().min(1),
  fileSizeBytes: z.number().int().nonnegative(),
  mimeType: z.literal('application/pdf'),
  attachedAt: z.string().datetime(),
});
export type RequirementAttachment = z.infer<typeof RequirementAttachmentSchema>;

export const DocumentaryRequirementSchema = z.object({
  id: z.string().min(1),
  /** Entidad para la que aplica el requisito. */
  entityName: z.string(),
  entityCategory: EntityCategorySchema,
  /** Nombre del documento recomendado (ej. "Certificado tributario"). */
  documentName: z.string(),
  /** Categoría del documento (agrupa varios requisitos afines). */
  documentCategory: z.string(),
  /** Motivo legible de por qué se recomienda. */
  reason: z.string(),
  status: RequirementStatusSchema,
  /** Origen de la recomendación: id de la regla que la generó. */
  recommendationSource: z.string(),
  confidence: ConfidenceLevelSchema,
  /** Siempre false en Sprint 1: no se afirma obligatoriedad legal. */
  isLegallyRequired: z.literal(false),
  /** Solo metadatos locales; el binario PDF no se persiste. */
  attachment: RequirementAttachmentSchema.nullable().default(null),
});
export type DocumentaryRequirement = z.infer<typeof DocumentaryRequirementSchema>;
