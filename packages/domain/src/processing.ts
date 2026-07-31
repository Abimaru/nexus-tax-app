import { z } from 'zod';
import { ColumnMappingSchema, IsoTimestampSchema } from './primitives';
import { WorkbookMetadataSchema } from './workbook';
import { RawExogenousRecordSchema, NormalizedExogenousRecordSchema } from './records';
import { ReportingEntitySchema, ReportedConceptSchema } from './aggregates';
import { DataQualityFindingSchema } from './findings';
import { DocumentaryRequirementSchema } from './checklist';
import { ExogenousReportSchema } from './exogenousReport';
import { QualityDimensionsSchema, RecordRelationSchema, TaxMatrixSchema } from './analysis';

/**
 * Métricas agregadas del procesamiento. Datos numéricos listos para la UI,
 * separados de la presentación y de los datos crudos.
 */
export const ProcessingMetricsSchema = z.object({
  recordCount: z.number().int().nonnegative(),
  entityCount: z.number().int().nonnegative(),
  conceptCount: z.number().int().nonnegative(),
  totalReported: z.number(),
  /** Nombre semántico del total bruto; `totalReported` se conserva por compatibilidad. */
  grossUnconsolidatedSum: z.number(),
  totalWithholding: z.number(),
  homogeneousTotals: z.object({
    detectedIncome: z.number(),
    detectedAssets: z.number(),
    detectedLiabilities: z.number(),
    detectedWithholdings: z.number(),
    financialMovements: z.number(),
    cardConsumption: z.number(),
    purchases: z.number(),
    unclassifiedRecordCount: z.number().int().nonnegative(),
  }),
  findingCounts: z.object({
    info: z.number().int().nonnegative(),
    warning: z.number().int().nonnegative(),
    error: z.number().int().nonnegative(),
  }),
  /** Puntaje de calidad 0..100 derivado de los hallazgos (heurístico). */
  qualityScore: z.number().min(0).max(100),
  qualityDimensions: QualityDimensionsSchema,
});
export type ProcessingMetrics = z.infer<typeof ProcessingMetricsSchema>;

/**
 * ProcessingResult — resultado completo y determinista de procesar un archivo.
 * Es el objeto que se persiste en IndexedDB y se exporta a JSON.
 */
export const ProcessingResultSchema = z.object({
  /** Versión del parser que produjo el resultado (para reproducibilidad). */
  parserVersion: z.string(),
  generatedAt: IsoTimestampSchema,

  workbook: WorkbookMetadataSchema,
  selectedSheet: z.string(),
  /** Índice 0-based de la fila usada como encabezado dentro de la hoja. */
  headerRowIndex: z.number().int().nonnegative(),
  columnMapping: ColumnMappingSchema,

  /** Secciones semánticas detectadas y revisadas antes de normalizar. */
  report: ExogenousReportSchema,

  rawRecords: z.array(RawExogenousRecordSchema),
  normalizedRecords: z.array(NormalizedExogenousRecordSchema),

  entities: z.array(ReportingEntitySchema),
  concepts: z.array(ReportedConceptSchema),
  findings: z.array(DataQualityFindingSchema),
  requirements: z.array(DocumentaryRequirementSchema),
  relationships: z.array(RecordRelationSchema),
  matrix: TaxMatrixSchema,

  metrics: ProcessingMetricsSchema,
});
export type ProcessingResult = z.infer<typeof ProcessingResultSchema>;

/** Fases del pipeline de procesamiento, para reportar progreso real (§ carga). */
export const PROCESSING_PHASES = [
  'reading',
  'inspecting',
  'detecting_headers',
  'normalizing',
  'aggregating',
  'analyzing_quality',
  'building_checklist',
  'done',
] as const;
export const ProcessingPhaseSchema = z.enum(PROCESSING_PHASES);
export type ProcessingPhase = z.infer<typeof ProcessingPhaseSchema>;

export const ProcessingProgressSchema = z.object({
  phase: ProcessingPhaseSchema,
  /** Progreso 0..1 dentro del pipeline global. */
  ratio: z.number().min(0).max(1),
  message: z.string(),
});
export type ProcessingProgress = z.infer<typeof ProcessingProgressSchema>;
