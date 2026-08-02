/**
 * @nexus-tax/exogenous-parser
 * ---------------------------
 * Motor de análisis de información exógena. PURO y DETERMINISTA:
 * no toca el DOM, no hace red, no contiene componentes visuales.
 *
 * Flujo: validate -> readWorkbookFile -> processSheet -> toNormalizedJson.
 * Los adaptadores (sinónimos, reglas de checklist) son configurables y están
 * preparados para evolucionar al futuro Aegis Engine.
 */
export { PARSER_VERSION } from './version';

// Validación y lectura
export { validateFile, type FileDescriptor, type FileValidation } from './validate';
export {
  buildWorkbookPreviews,
  readWorkbook,
  toDomainCell,
  type RawCell,
  type ReadWorkbookResult,
  type SheetPreview,
} from './workbook';
export { inspectWorkbookSheets, type SheetInspection } from './inspection';

// Detección y mapeo
export { detectHeaderRow, type HeaderDetection } from './headers';
export { buildColumns, type ColumnDescriptor } from './columns';
export {
  detectReportSections,
  extractReportMetadata,
  extractThresholds,
  type ReportSectionDetection,
} from './sections';
export { HEADER_SYNONYMS, guessColumnMapping, resolveColumn } from './mapping';

// Normalización
export { normalizeRecords, type NormalizationResult, type NonNumericCell } from './normalize';
export { coerceNumber, coerceText, coerceDate, looksLikeIdentifier } from './value';
export { normalizeForCompare } from './text';
export { extractTaxpayerIdentity, maskDocument, normalizeDocument } from './taxpayer';
export { parseSuggestedUse } from './suggestedUse';
export {
  classifyTaxRecord,
  CLASSIFICATION_VERSION,
  type TaxClassification,
} from './classification';

// Agregación y calidad
export { buildEntities, buildConcepts, computeMetrics } from './aggregate';
export { resolveEntityIdentity, ENTITY_ALIAS_CATALOG_VERSION } from './entityIdentity';
export {
  ANALYSIS_RULE_VERSION,
  automaticClassificationSnapshot,
  buildRecordRelationships,
  buildTaxMatrix,
} from './analysis';
export { inferEntityCategory } from './category';
export { detectFindings, type QualityInputs } from './quality';

// Checklist
export {
  buildChecklist,
  DEFAULT_CHECKLIST_RULES,
  type ChecklistRule,
  type RequirementTemplate,
} from './checklist';

// Orquestación y exportación
export {
  readWorkbookFile,
  processSheet,
  processWorkbookFile,
  type ProcessOptions,
} from './pipeline';
export { toNormalizedExport, toNormalizedJson, type NormalizedExport } from './export';
