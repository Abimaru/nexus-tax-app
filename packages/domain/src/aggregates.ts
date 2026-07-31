import { z } from 'zod';

/**
 * Agregados de presentación: entidades y conceptos.
 * Son proyecciones derivadas de los registros normalizados. No contienen
 * lógica; solo el resultado de agrupar y sumar.
 */

/** Categoría inferida de la entidad reportante — orienta el checklist. */
export const EntityCategorySchema = z.enum([
  'employer',
  'bank',
  'pension',
  'housing',
  'other',
  'unknown',
]);
export type EntityCategory = z.infer<typeof EntityCategorySchema>;

/** ReportingEntity — tercero que reporta información exógena. */
export const ReportingEntitySchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  taxId: z.string().nullable(),
  category: EntityCategorySchema,
  recordCount: z.number().int().nonnegative(),
  totalReported: z.number(),
});
export type ReportingEntity = z.infer<typeof ReportingEntitySchema>;

/** ReportedConcept — concepto tributario agregado. */
export const ReportedConceptSchema = z.object({
  id: z.string().min(1),
  code: z.string().nullable(),
  label: z.string(),
  recordCount: z.number().int().nonnegative(),
  totalReported: z.number(),
});
export type ReportedConcept = z.infer<typeof ReportedConceptSchema>;
