import { z } from 'zod';
import { CellValueSchema, SourceLocationSchema } from './primitives';
import {
  ClassificationEvidenceSchema,
  IdentityMatchStatusSchema,
  SuggestedDeclarationUseSchema,
  TaxCategorySchema,
  TaxConfidenceSchema,
  TaxNatureSchema,
  TaxTreatmentSchema,
  SecondaryTaxUseSchema,
  MultiplicityTypeSchema,
  ConsolidationDispositionSchema,
} from './taxClassification';

/**
 * Registros crudos y normalizados.
 * Regla de oro: los datos CRUDOS nunca se mutan. La normalización produce un
 * nuevo registro que referencia siempre a su origen (hoja + fila).
 */

/**
 * RawExogenousRecord — una fila del archivo tal cual se leyó.
 * Las celdas se indexan por el NOMBRE ORIGINAL de la columna, preservando
 * mayúsculas, tildes y espacios. No se realiza ninguna interpretación.
 */
export const RawExogenousRecordSchema = z.object({
  id: z.string().min(1),
  source: SourceLocationSchema,
  /** Celdas por nombre de columna original -> valor original. */
  cells: z.record(z.string(), CellValueSchema),
});
export type RawExogenousRecord = z.infer<typeof RawExogenousRecordSchema>;

/**
 * NormalizedExogenousRecord — interpretación canónica de una fila.
 * Los campos canónicos pueden ser nulos si la columna no existe o no se mapeó.
 * `extra` conserva el resto de columnas sin pérdida de información.
 */
export const NormalizedExogenousRecordSchema = z.object({
  id: z.string().min(1),
  /** id del RawExogenousRecord del que deriva. */
  rawId: z.string().min(1),
  source: SourceLocationSchema,

  entityName: z.string().nullable(),
  /** Alias legado del documento de la entidad reportante. */
  entityTaxId: z.string().nullable(),
  reportingEntityDocument: z.string().nullable(),
  reportedPersonDocument: z.string().nullable(),
  reportedPersonDocumentNormalized: z.string().nullable(),
  identityMatch: IdentityMatchStatusSchema,
  conceptCode: z.string().nullable(),
  conceptLabel: z.string().nullable(),
  /** Valor reportado en pesos. Nulo si ausente o no numérico. */
  reportedValue: z.number().nullable(),
  /** Retención asociada, cuando la columna existe. */
  withholding: z.number().nullable(),
  currency: z.literal('COP'),

  suggestedUse: SuggestedDeclarationUseSchema.nullable(),
  classificationVersion: z.string(),
  nature: TaxNatureSchema,
  category: TaxCategorySchema,
  treatment: TaxTreatmentSchema,
  confidence: TaxConfidenceSchema,
  classificationEvidence: z.array(ClassificationEvidenceSchema),
  secondaryUses: z.array(SecondaryTaxUseSchema),
  multiplicityType: MultiplicityTypeSchema,
  multiplicityExplanation: z.string().nullable(),
  consolidationDisposition: ConsolidationDispositionSchema,
  consolidationReason: z.string(),

  /** Columnas adicionales preservadas (nombre original -> valor original). */
  extra: z.record(z.string(), CellValueSchema),
});
export type NormalizedExogenousRecord = z.infer<typeof NormalizedExogenousRecordSchema>;
