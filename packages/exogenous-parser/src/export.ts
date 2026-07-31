import type { ProcessingResult } from '@nexus-tax/domain';
import { PARSER_VERSION } from './version';

/**
 * Exportación del resultado normalizado a JSON.
 * Estructura estable y versionada para que consumidores externos puedan
 * depender de ella. No incluye el archivo original (privacidad, §12).
 */

export interface NormalizedExport {
  schema: 'nexustax.exogenous.normalized';
  schemaVersion: string;
  parserVersion: string;
  generatedAt: string;
  source: {
    fileName: string;
    selectedSheet: string;
    headerRowIndex: number;
    columnMapping: ProcessingResult['columnMapping'];
    structure: ProcessingResult['report']['structure'];
  };
  metadata: ProcessingResult['report']['metadata'];
  taxpayer: ProcessingResult['report']['taxpayer'];
  thresholds: ProcessingResult['report']['thresholds'];
  metrics: ProcessingResult['metrics'];
  entities: ProcessingResult['entities'];
  concepts: ProcessingResult['concepts'];
  records: ProcessingResult['normalizedRecords'];
  findings: ProcessingResult['findings'];
  requirements: ProcessingResult['requirements'];
  relationships: ProcessingResult['relationships'];
  matrix: ProcessingResult['matrix'];
}

export function toNormalizedExport(result: ProcessingResult): NormalizedExport {
  return {
    schema: 'nexustax.exogenous.normalized',
    schemaVersion: '4',
    parserVersion: PARSER_VERSION,
    generatedAt: result.generatedAt,
    source: {
      fileName: result.workbook.fileName,
      selectedSheet: result.selectedSheet,
      headerRowIndex: result.headerRowIndex,
      columnMapping: result.columnMapping,
      structure: result.report.structure,
    },
    metadata: result.report.metadata,
    taxpayer: result.report.taxpayer,
    thresholds: result.report.thresholds,
    metrics: result.metrics,
    entities: result.entities,
    concepts: result.concepts,
    records: result.normalizedRecords,
    findings: result.findings,
    requirements: result.requirements,
    relationships: result.relationships,
    matrix: result.matrix,
  };
}

/** Serializa el resultado normalizado a una cadena JSON (indentada). */
export function toNormalizedJson(result: ProcessingResult): string {
  return JSON.stringify(toNormalizedExport(result), null, 2);
}
