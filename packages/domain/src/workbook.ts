import { z } from 'zod';

/**
 * Metadatos del libro Excel y de sus hojas.
 * Describen la estructura leída SIN interpretarla. La interpretación
 * (encabezados, mapeo) vive en el resultado de procesamiento.
 */

export const SheetMetadataSchema = z.object({
  name: z.string(),
  /** Índice 0-based de la hoja dentro del libro. */
  index: z.number().int().nonnegative(),
  /** Número de filas detectadas (incluye posibles encabezados). */
  rowCount: z.number().int().nonnegative(),
  /** Número de columnas detectadas. */
  columnCount: z.number().int().nonnegative(),
  /** Verdadero si la hoja no contiene celdas con datos. */
  isEmpty: z.boolean(),
});
export type SheetMetadata = z.infer<typeof SheetMetadataSchema>;

export const WorkbookMetadataSchema = z.object({
  fileName: z.string().min(1),
  fileSizeBytes: z.number().int().nonnegative(),
  sheetCount: z.number().int().nonnegative(),
  sheets: z.array(SheetMetadataSchema),
});
export type WorkbookMetadata = z.infer<typeof WorkbookMetadataSchema>;
