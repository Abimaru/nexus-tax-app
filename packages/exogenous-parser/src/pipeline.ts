import {
  ExogenousReportStructureSchema,
  type ColumnMapping,
  type ExogenousReportStructure,
  type ProcessingProgress,
  type ProcessingResult,
  type SheetMetadata,
} from '@nexus-tax/domain';
import { PROCESSING_LIMITS } from '@nexus-tax/config';
import { readWorkbook, type ReadWorkbookResult, type RawCell } from './workbook';
import { detectHeaderRow } from './headers';
import { buildColumns } from './columns';
import { guessColumnMapping } from './mapping';
import { normalizeRecords } from './normalize';
import { buildConcepts, buildEntities, computeMetrics } from './aggregate';
import { detectFindings } from './quality';
import { buildChecklist } from './checklist';
import { PARSER_VERSION } from './version';
import { detectReportSections, extractReportMetadata, extractThresholds } from './sections';
import { extractTaxpayerIdentity, maskDocument } from './taxpayer';
import { buildRecordRelationships, buildTaxMatrix } from './analysis';

/** Opciones de procesamiento. Todo es inyectable para pruebas deterministas. */
export interface ProcessOptions {
  /** Hoja a procesar. Por defecto, la primera hoja con datos. */
  sheetName?: string;
  /** Índice 0-based de la fila de encabezados. Por defecto, se detecta. */
  headerRowIndex?: number;
  /** Mapeo manual de columnas. Por defecto, se infiere. */
  columnMapping?: ColumnMapping;
  /** Límites 1-based revisados por el usuario. Por defecto, se detectan. */
  structure?: ExogenousReportStructure;
  maxHeaderScanRows?: number;
  /** Marca de tiempo inyectable para reproducibilidad. */
  now?: () => string;
  onProgress?: (progress: ProcessingProgress) => void;
}

const PHASE_RATIOS = {
  inspecting: 0.15,
  detecting_headers: 0.3,
  normalizing: 0.6,
  aggregating: 0.75,
  analyzing_quality: 0.9,
  building_checklist: 0.97,
  done: 1,
} as const;

function pickDefaultSheet(sheets: SheetMetadata[]): SheetMetadata | undefined {
  return sheets.find((s) => !s.isEmpty) ?? sheets[0];
}

/** Lee el archivo y devuelve solo metadatos (paso de inspección del libro). */
export function readWorkbookFile(
  data: ArrayBuffer,
  fileName: string,
  fileSizeBytes: number,
): ReadWorkbookResult {
  return readWorkbook(data, fileName, fileSizeBytes);
}

function columnsWithDataFrom(matrix: RawCell[][], startRowIndex: number): Set<number> {
  const set = new Set<number>();
  for (let r = startRowIndex; r < matrix.length; r += 1) {
    const row = matrix[r] ?? [];
    for (let c = 0; c < row.length; c += 1) {
      const cell = row[c];
      if (cell !== null && cell !== undefined && String(cell).trim() !== '') set.add(c);
    }
  }
  return set;
}

/** Procesa una hoja del libro ya leído y produce el resultado completo. */
export function processSheet(
  read: ReadWorkbookResult,
  options: ProcessOptions = {},
): ProcessingResult {
  const report = (progress: ProcessingProgress) => options.onProgress?.(progress);
  const now = options.now ?? (() => new Date().toISOString());
  const generatedAt = now();

  report({
    phase: 'inspecting',
    ratio: PHASE_RATIOS.inspecting,
    message: 'Inspeccionando el libro',
  });

  const sheetMeta =
    (options.sheetName && read.metadata.sheets.find((s) => s.name === options.sheetName)) ||
    pickDefaultSheet(read.metadata.sheets);

  const selectedSheet = sheetMeta?.name ?? '';
  const matrix = read.fullRows[selectedSheet] ?? [];
  const columnCount = Math.max(
    sheetMeta?.columnCount ?? 0,
    matrix.reduce((max, row) => Math.max(max, row.length), 0),
  );

  report({
    phase: 'detecting_headers',
    ratio: PHASE_RATIOS.detecting_headers,
    message: 'Detectando encabezados',
  });

  const headerRowIndex =
    (options.structure ? options.structure.headerRow - 1 : options.headerRowIndex) ??
    detectHeaderRow(matrix, options.maxHeaderScanRows ?? PROCESSING_LIMITS.maxHeaderScanRows)
      .headerRowIndex;

  const headerRow = matrix[headerRowIndex] ?? [];
  const columns = buildColumns(headerRow, columnCount, matrix[headerRowIndex - 1] ?? []);
  const columnMapping = options.columnMapping ?? guessColumnMapping(columns);
  const structure = ExogenousReportStructureSchema.parse(
    options.structure ??
      detectReportSections(matrix, headerRowIndex, columns, columnMapping).structure,
  );
  const metadata = extractReportMetadata(selectedSheet, matrix, structure.headerRow);
  const taxpayer = extractTaxpayerIdentity(selectedSheet, matrix, structure.headerRow);
  const thresholds = extractThresholds(selectedSheet, matrix, structure);

  report({
    phase: 'normalizing',
    ratio: PHASE_RATIOS.normalizing,
    message: 'Normalizando registros',
  });

  const normalization = normalizeRecords(
    selectedSheet,
    matrix,
    headerRowIndex,
    columns,
    columnMapping,
    structure.detailsStartRow - 1,
    taxpayer.documentNormalized,
  );

  report({
    phase: 'aggregating',
    ratio: PHASE_RATIOS.aggregating,
    message: 'Agrupando por entidad y concepto',
  });

  const entities = buildEntities(normalization.normalizedRecords);
  const concepts = buildConcepts(normalization.normalizedRecords);
  const relationships = buildRecordRelationships(normalization.normalizedRecords);

  report({
    phase: 'analyzing_quality',
    ratio: PHASE_RATIOS.analyzing_quality,
    message: 'Analizando calidad de datos',
  });

  const findings = detectFindings({
    sheetName: selectedSheet,
    sheetIsEmpty: sheetMeta?.isEmpty ?? true,
    columns,
    columnsWithData: columnsWithDataFrom(matrix, structure.detailsStartRow - 1),
    mapping: columnMapping,
    normalizedRecords: normalization.normalizedRecords,
    emptyRowNumbers: normalization.emptyRowNumbers,
    nonNumericCells: normalization.nonNumericCells,
    taxpayerDocumentMasked: taxpayer.documentNormalized
      ? maskDocument(taxpayer.documentNormalized)
      : undefined,
    relationships,
  });
  const taxMatrix = buildTaxMatrix({
    records: normalization.normalizedRecords,
    thresholds,
    relationships,
    findings,
    generatedAt,
  });

  const metrics = computeMetrics(
    normalization.normalizedRecords,
    entities,
    concepts,
    findings,
    taxMatrix.quality,
  );

  report({
    phase: 'building_checklist',
    ratio: PHASE_RATIOS.building_checklist,
    message: 'Generando checklist documental',
  });

  const requirements = buildChecklist(entities, normalization.normalizedRecords);

  report({ phase: 'done', ratio: PHASE_RATIOS.done, message: 'Procesamiento completado' });

  return {
    parserVersion: PARSER_VERSION,
    generatedAt,
    workbook: read.metadata,
    selectedSheet,
    headerRowIndex,
    columnMapping,
    report: {
      metadata,
      taxpayer,
      structure,
      thresholds,
      records: normalization.normalizedRecords,
      findings,
    },
    rawRecords: normalization.rawRecords,
    normalizedRecords: normalization.normalizedRecords,
    entities,
    concepts,
    findings,
    requirements,
    relationships,
    matrix: taxMatrix,
    metrics,
  };
}

/** Atajo: lee el archivo y procesa en un solo paso. */
export function processWorkbookFile(
  data: ArrayBuffer,
  fileName: string,
  fileSizeBytes: number,
  options: ProcessOptions = {},
): ProcessingResult {
  options.onProgress?.({ phase: 'reading', ratio: 0.05, message: 'Leyendo archivo' });
  const read = readWorkbook(data, fileName, fileSizeBytes);
  return processSheet(read, options);
}
