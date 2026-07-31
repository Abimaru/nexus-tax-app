import type {
  ColumnMapping,
  ExogenousReportMetadata,
  ExogenousReportStructure,
  ExogenousThreshold,
} from '@nexus-tax/domain';
import type { ColumnDescriptor } from './columns';
import type { RawCell } from './workbook';
import { toDomainCell } from './workbook';
import { resolveColumn } from './mapping';
import { normalizeForCompare } from './text';
import { coerceNumber, coerceText } from './value';

export interface ReportSectionDetection {
  structure: ExogenousReportStructure;
  /** Confianza heurística 0..1 sobre la separación entre topes y detalle. */
  confidence: number;
}

interface ThresholdCandidate {
  number?: number;
  label: string;
  value: number;
  detailColumnIndex: number;
  valueColumnIndex: number;
}

function hasValue(value: RawCell | undefined): boolean {
  return value !== null && value !== undefined && String(value).trim() !== '';
}

function mappedCell(
  row: RawCell[],
  columns: ColumnDescriptor[],
  mapping: ColumnMapping,
  field: Parameters<typeof resolveColumn>[2],
): RawCell {
  const column = resolveColumn(columns, mapping, field);
  return column ? (row[column.index] ?? null) : null;
}

/**
 * Los registros de detalle suelen tener identidad de tercero y concepto.
 * Se usan señales semánticas, no una fila ni una cantidad de topes fija.
 */
function looksLikeDetailRow(
  row: RawCell[],
  columns: ColumnDescriptor[],
  mapping: ColumnMapping,
): boolean {
  const entityName = coerceText(toDomainCell(mappedCell(row, columns, mapping, 'entityName')));
  const entityTaxId = coerceText(
    toDomainCell(mappedCell(row, columns, mapping, 'reportingEntityDocument')),
  );
  const concept =
    coerceText(toDomainCell(mappedCell(row, columns, mapping, 'conceptCode'))) ??
    coerceText(toDomainCell(mappedCell(row, columns, mapping, 'conceptLabel')));
  const reportedValue = coerceNumber(
    toDomainCell(mappedCell(row, columns, mapping, 'reportedValue')),
  );
  const identifierSignal = entityTaxId !== null && entityTaxId.replace(/\W/g, '').length >= 5;

  return (
    (identifierSignal && (entityName !== null || concept !== null || reportedValue !== null)) ||
    (entityName !== null && concept !== null && reportedValue !== null)
  );
}

function thresholdCandidate(row: RawCell[]): ThresholdCandidate | null {
  const occupied = row
    .map((value, index) => ({ value, index }))
    .filter(({ value }) => hasValue(value));
  if (occupied.length < 2) return null;

  const numeric = occupied
    .map(({ value, index }) => ({ value: coerceNumber(toDomainCell(value)), index }))
    .filter((item): item is { value: number; index: number } => item.value !== null);
  const text = occupied
    .map(({ value, index }) => ({ value: coerceText(toDomainCell(value)), index }))
    .filter(
      (item): item is { value: string; index: number } =>
        item.value !== null && coerceNumber(item.value) === null,
    );
  if (numeric.length === 0 || text.length === 0) return null;

  // El valor monetario suele ser el último número; la descripción más larga
  // evita escoger etiquetas auxiliares cortas de la sección.
  const valueCell = numeric[numeric.length - 1]!;
  const detailCell = text.reduce((best, item) =>
    item.value.length > best.value.length ? item : best,
  );

  const ordinalFromLabel = detailCell.value.match(/^\s*(\d+)\s*[.)\-:]/)?.[1];
  const separateOrdinal = numeric.find(
    (item) => item.index !== valueCell.index && Number.isInteger(item.value) && item.value >= 0,
  );
  const numberText =
    ordinalFromLabel ?? (separateOrdinal ? String(separateOrdinal.value) : undefined);

  return {
    ...(numberText === undefined ? {} : { number: Number(numberText) }),
    label: detailCell.value.replace(/^\s*\d+\s*[.)\-:]\s*/, '').trim(),
    value: valueCell.value,
    detailColumnIndex: detailCell.index,
    valueColumnIndex: valueCell.index,
  };
}

/** Detecta metadatos, encabezado, topes y comienzo del detalle. */
export function detectReportSections(
  matrix: RawCell[][],
  headerRowIndex: number,
  columns: ColumnDescriptor[],
  mapping: ColumnMapping,
): ReportSectionDetection {
  const fallback: ExogenousReportStructure = {
    headerRow: headerRowIndex + 1,
    detailsStartRow: headerRowIndex + 2,
  };

  let detailRowIndex = -1;
  for (let index = headerRowIndex + 1; index < matrix.length; index += 1) {
    if (looksLikeDetailRow(matrix[index] ?? [], columns, mapping)) {
      detailRowIndex = index;
      break;
    }
  }
  if (detailRowIndex < 0) return { structure: fallback, confidence: 0 };

  const candidates: { rowIndex: number; threshold: ThresholdCandidate }[] = [];
  for (let index = headerRowIndex + 1; index < detailRowIndex; index += 1) {
    const candidate = thresholdCandidate(matrix[index] ?? []);
    if (candidate) candidates.push({ rowIndex: index, threshold: candidate });
  }
  if (candidates.length === 0) {
    return {
      structure: { headerRow: headerRowIndex + 1, detailsStartRow: detailRowIndex + 1 },
      confidence: detailRowIndex === headerRowIndex + 1 ? 1 : 0.5,
    };
  }

  return {
    structure: {
      headerRow: headerRowIndex + 1,
      thresholdsStartRow: candidates[0]!.rowIndex + 1,
      thresholdsEndRow: candidates[candidates.length - 1]!.rowIndex + 1,
      detailsStartRow: detailRowIndex + 1,
    },
    confidence: Math.min(1, 0.65 + candidates.length * 0.07),
  };
}

export function extractReportMetadata(
  sheetName: string,
  matrix: RawCell[][],
  headerRow: number,
): ExogenousReportMetadata {
  const rows = matrix.slice(0, Math.max(0, headerRow - 1)).flatMap((row, index) => {
    if (!row.some(hasValue)) return [];
    let end = row.length;
    while (end > 0 && !hasValue(row[end - 1])) end -= 1;
    return [
      {
        row: index + 1,
        values: Array.from(row.slice(0, end), (value) => toDomainCell(value ?? null)),
      },
    ];
  });
  return { sheet: sheetName, rows };
}

export function extractThresholds(
  sheetName: string,
  matrix: RawCell[][],
  structure: ExogenousReportStructure,
): ExogenousThreshold[] {
  if (structure.thresholdsStartRow === undefined || structure.thresholdsEndRow === undefined) {
    return [];
  }

  const thresholds: ExogenousThreshold[] = [];
  for (
    let rowNumber = structure.thresholdsStartRow;
    rowNumber <= structure.thresholdsEndRow;
    rowNumber += 1
  ) {
    const candidate = thresholdCandidate(matrix[rowNumber - 1] ?? []);
    if (!candidate || candidate.label === '') continue;
    thresholds.push({
      ...(candidate.number === undefined ? {} : { number: candidate.number }),
      label: candidate.label,
      normalizedLabel: normalizeForCompare(candidate.label),
      value: candidate.value,
      source: {
        sheet: sheetName,
        row: rowNumber,
        detailColumn: candidate.detailColumnIndex + 1,
        valueColumn: candidate.valueColumnIndex + 1,
      },
    });
  }
  return thresholds;
}
