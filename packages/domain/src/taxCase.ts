import { z } from 'zod';
import { IsoTimestampSchema, TaxYearSchema } from './primitives';

/**
 * TaxCase — expediente tributario local.
 * Es la unidad organizativa raíz: agrupa documentos, extracciones y hallazgos
 * de un contribuyente (identificado por alias, nunca por datos sensibles).
 */

export const TaxCaseStatusSchema = z.enum(['draft', 'processing', 'ready', 'archived']);
export type TaxCaseStatus = z.infer<typeof TaxCaseStatusSchema>;

export const TaxCaseSchema = z.object({
  id: z.string().min(1),
  /** Nombre o alias legible. No requiere ser un nombre legal real. */
  alias: z.string().trim().min(2, 'El alias debe tener al menos 2 caracteres').max(120),
  taxYear: TaxYearSchema,
  notes: z.string().max(2000).optional(),
  status: TaxCaseStatusSchema,
  createdAt: IsoTimestampSchema,
  updatedAt: IsoTimestampSchema,
});
export type TaxCase = z.infer<typeof TaxCaseSchema>;

/** Datos mínimos para crear un expediente (el resto se deriva). */
export const CreateTaxCaseInputSchema = z.object({
  alias: TaxCaseSchema.shape.alias,
  taxYear: TaxYearSchema,
  notes: z.string().max(2000).optional(),
});
export type CreateTaxCaseInput = z.infer<typeof CreateTaxCaseInputSchema>;
