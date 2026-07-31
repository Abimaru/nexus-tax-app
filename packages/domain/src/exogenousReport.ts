import { z } from 'zod';
import { CellValueSchema } from './primitives';
import { NormalizedExogenousRecordSchema } from './records';
import { DataQualityFindingSchema } from './findings';
import { TaxpayerIdentitySchema } from './taxpayer';

/** Una fila previa al encabezado conservada como metadato, sin interpretarla. */
export const ExogenousMetadataRowSchema = z.object({
  row: z.number().int().positive(),
  values: z.array(CellValueSchema),
});
export type ExogenousMetadataRow = z.infer<typeof ExogenousMetadataRowSchema>;

/** Metadatos visibles del reporte y su ubicación original. */
export const ExogenousReportMetadataSchema = z.object({
  sheet: z.string(),
  rows: z.array(ExogenousMetadataRowSchema),
});
export type ExogenousReportMetadata = z.infer<typeof ExogenousReportMetadataSchema>;

/**
 * Límites de las secciones, expresados como filas 1-based del Excel.
 * Los topes son opcionales porque también se admiten tablas planas.
 */
export const ExogenousReportStructureSchema = z
  .object({
    headerRow: z.number().int().positive(),
    thresholdsStartRow: z.number().int().positive().optional(),
    thresholdsEndRow: z.number().int().positive().optional(),
    detailsStartRow: z.number().int().positive(),
  })
  .superRefine((structure, context) => {
    if (structure.detailsStartRow <= structure.headerRow) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['detailsStartRow'],
        message: 'El detalle debe comenzar después del encabezado.',
      });
    }
    if (
      (structure.thresholdsStartRow === undefined) !==
      (structure.thresholdsEndRow === undefined)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['thresholdsStartRow'],
        message: 'El inicio y fin de topes deben definirse juntos.',
      });
    }
    if (
      structure.thresholdsStartRow !== undefined &&
      structure.thresholdsEndRow !== undefined &&
      (structure.thresholdsStartRow <= structure.headerRow ||
        structure.thresholdsEndRow < structure.thresholdsStartRow ||
        structure.thresholdsEndRow >= structure.detailsStartRow)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['thresholdsEndRow'],
        message: 'El rango de topes debe estar entre el encabezado y el detalle.',
      });
    }
  });
export type ExogenousReportStructure = z.infer<typeof ExogenousReportStructureSchema>;

/** Tope informativo reportado por la fuente, separado de los terceros. */
export const ExogenousThresholdSchema = z.object({
  number: z.number().int().nonnegative().optional(),
  label: z.string().min(1),
  normalizedLabel: z.string().min(1),
  value: z.number(),
  source: z.object({
    sheet: z.string(),
    row: z.number().int().positive(),
    detailColumn: z.number().int().positive(),
    valueColumn: z.number().int().positive(),
  }),
});
export type ExogenousThreshold = z.infer<typeof ExogenousThresholdSchema>;

/** Vista semántica del reporte de exógena. */
export const ExogenousReportSchema = z.object({
  metadata: ExogenousReportMetadataSchema,
  taxpayer: TaxpayerIdentitySchema,
  structure: ExogenousReportStructureSchema,
  thresholds: z.array(ExogenousThresholdSchema),
  records: z.array(NormalizedExogenousRecordSchema),
  findings: z.array(DataQualityFindingSchema),
});
export type ExogenousReport = z.infer<typeof ExogenousReportSchema>;
