import { z } from 'zod';

/**
 * Primitivas compartidas del dominio NexusTax.
 * Aquí viven los tipos de valor de bajo nivel reutilizados por todos los
 * esquemas. Nada de lógica de parsing: solo definiciones de forma.
 */

/** Valor de celda tal como puede aparecer en una hoja de cálculo. */
export const CellValueSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);
export type CellValue = z.infer<typeof CellValueSchema>;

/** Identificador de fila/hoja de origen — trazabilidad de la evidencia. */
export const SourceLocationSchema = z.object({
  /** Nombre de la hoja de la que proviene el dato. */
  sheet: z.string(),
  /** Fila 1-based dentro de la hoja original (incluye encabezado). */
  row: z.number().int().positive(),
});
export type SourceLocation = z.infer<typeof SourceLocationSchema>;

/** Año gravable admitido. El rango se acota deliberadamente. */
export const TaxYearSchema = z
  .number()
  .int()
  .min(2018, 'Año gravable fuera de rango')
  .max(2035, 'Año gravable fuera de rango');
export type TaxYear = z.infer<typeof TaxYearSchema>;

/** ISO 8601 en UTC para marcas de tiempo persistidas. */
export const IsoTimestampSchema = z.string().datetime();
export type IsoTimestamp = z.infer<typeof IsoTimestampSchema>;

/** Campos canónicos a los que se puede mapear una columna del archivo. */
export const CANONICAL_FIELDS = [
  'entityName',
  'reportingEntityDocument',
  'reportedPersonDocument',
  'conceptCode',
  'conceptLabel',
  'reportedValue',
  'withholding',
  'suggestedUse',
  'additionalInformation',
] as const;

export const CanonicalFieldSchema = z.enum(CANONICAL_FIELDS);
export type CanonicalField = z.infer<typeof CanonicalFieldSchema>;

/**
 * Mapeo de campo canónico -> clave jerárquica de columna. En formatos planos
 * coincide con el nombre original; con grupos usa "Grupo > Encabezado".
 */
export const ColumnMappingSchema = z.record(CanonicalFieldSchema, z.string());
export type ColumnMapping = z.infer<typeof ColumnMappingSchema>;
