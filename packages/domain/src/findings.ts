import { z } from 'zod';

/**
 * DataQualityFinding — hallazgo de calidad de datos.
 * Cada hallazgo se clasifica por severidad y, cuando existe, adjunta evidencia
 * concreta (hoja, fila, columna y valor original) para la revisión humana.
 */

export const FindingSeveritySchema = z.enum(['info', 'warning', 'error']);
export type FindingSeverity = z.infer<typeof FindingSeveritySchema>;

/** Códigos estables de hallazgo. Estables porque la UI y las pruebas dependen de ellos. */
export const FINDING_CODES = [
  'empty_row',
  'duplicate_header',
  'unnamed_column',
  'record_without_entity',
  'record_without_concept',
  'record_without_value',
  'non_numeric_value',
  'possible_exact_duplicate',
  'possibly_truncated_identifier',
  'empty_sheet',
  'unknown_format',
  'reported_person_mismatch',
  'possible_column_mapping_error',
  'unclassified_tax_record',
  'ambiguous_suggested_use',
  'real_tax_ambiguity',
  'contradictory_classification_evidence',
  'possible_unresolved_double_count',
  'missing_required_relationship',
  'reconciliation_difference',
] as const;
export const FindingCodeSchema = z.enum(FINDING_CODES);
export type FindingCode = z.infer<typeof FindingCodeSchema>;

/** Evidencia asociada al hallazgo. Todos los campos son opcionales según el caso. */
export const FindingEvidenceSchema = z.object({
  sheet: z.string().optional(),
  row: z.number().int().positive().optional(),
  column: z.string().optional(),
  /** Valor original tal como aparecía, serializado para mostrarlo sin interpretar. */
  value: z.string().optional(),
  expectedMasked: z.string().optional(),
  foundMasked: z.string().optional(),
});
export type FindingEvidence = z.infer<typeof FindingEvidenceSchema>;

export const DataQualityFindingSchema = z.object({
  id: z.string().min(1),
  code: FindingCodeSchema,
  severity: FindingSeveritySchema,
  title: z.string(),
  message: z.string(),
  /** Acción sugerida y accionable para el analista. */
  suggestedAction: z.string().optional(),
  evidence: FindingEvidenceSchema.nullable(),
  /** id del registro normalizado afectado, para navegación desde la UI. */
  relatedRecordId: z.string().nullable(),
});
export type DataQualityFinding = z.infer<typeof DataQualityFindingSchema>;
