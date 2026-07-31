import type {
  CellValue,
  ColumnMapping,
  NormalizedExogenousRecord,
  RawExogenousRecord,
} from '@nexus-tax/domain';
import type { RawCell } from './workbook';
import type { ColumnDescriptor } from './columns';
import { toDomainCell } from './workbook';
import { coerceNumber, coerceText } from './value';
import { resolveColumn } from './mapping';
import { prefixedId } from './ids';
import { parseSuggestedUse } from './suggestedUse';
import { classifyTaxRecord } from './classification';
import { inferEntityCategory } from './category';
import { normalizeDocument } from './taxpayer';

/** Celda no numérica detectada donde se esperaba número (para hallazgos). */
export interface NonNumericCell {
  row: number;
  column: string;
  value: string;
}

export interface NormalizationResult {
  rawRecords: RawExogenousRecord[];
  normalizedRecords: NormalizedExogenousRecord[];
  /** Filas 1-based de la hoja que estaban completamente vacías en la zona de datos. */
  emptyRowNumbers: number[];
  nonNumericCells: NonNumericCell[];
}

function isRowEmpty(row: RawCell[]): boolean {
  return row.every((c) => c === null || String(c).trim() === '');
}

/** Convierte los campos canónicos en registros normalizados y crudos. */
export function normalizeRecords(
  sheetName: string,
  matrix: RawCell[][],
  headerRowIndex: number,
  columns: ColumnDescriptor[],
  mapping: ColumnMapping,
  detailsStartRowIndex = headerRowIndex + 1,
  taxpayerDocumentNormalized: string | null = null,
): NormalizationResult {
  const rawRecords: RawExogenousRecord[] = [];
  const normalizedRecords: NormalizedExogenousRecord[] = [];
  const emptyRowNumbers: number[] = [];
  const nonNumericCells: NonNumericCell[] = [];

  const valueColumn = resolveColumn(columns, mapping, 'reportedValue');
  const withholdingColumn = resolveColumn(columns, mapping, 'withholding');
  const usedColumnKeys = new Set(Object.values(mapping));

  const getField = (row: RawCell[], field: Parameters<typeof resolveColumn>[2]): CellValue => {
    const col = resolveColumn(columns, mapping, field);
    if (!col) return null;
    return toDomainCell(row[col.index] ?? null);
  };

  for (let r = detailsStartRowIndex; r < matrix.length; r += 1) {
    const row = matrix[r] ?? [];
    const sourceRow = r + 1; // hoja 1-based

    if (isRowEmpty(row)) {
      emptyRowNumbers.push(sourceRow);
      continue;
    }

    // --- Registro CRUDO (nunca se muta) ---
    const cells: Record<string, CellValue> = {};
    for (const col of columns) {
      cells[col.key] = toDomainCell(row[col.index] ?? null);
    }
    const rawId = prefixedId('raw', [sheetName, sourceRow]);
    rawRecords.push({ id: rawId, source: { sheet: sheetName, row: sourceRow }, cells });

    // --- Registro NORMALIZADO ---
    const entityName = coerceText(getField(row, 'entityName'));
    const reportingEntityDocument = coerceText(getField(row, 'reportingEntityDocument'));
    const reportedPersonDocument = coerceText(getField(row, 'reportedPersonDocument'));
    const reportedPersonDocumentNormalized = normalizeDocument(reportedPersonDocument);
    const conceptCode = coerceText(getField(row, 'conceptCode'));
    const conceptLabel = coerceText(getField(row, 'conceptLabel'));
    const suggestedUse = parseSuggestedUse(coerceText(getField(row, 'suggestedUse')));
    const identityMatch =
      taxpayerDocumentNormalized === null || reportedPersonDocumentNormalized === null
        ? 'unavailable'
        : taxpayerDocumentNormalized === reportedPersonDocumentNormalized
          ? 'matched'
          : 'mismatched';
    const rawValue = valueColumn ? toDomainCell(row[valueColumn.index] ?? null) : null;
    const reportedValue = coerceNumber(rawValue);
    if (
      valueColumn &&
      rawValue !== null &&
      String(rawValue).trim() !== '' &&
      reportedValue === null
    ) {
      nonNumericCells.push({
        row: sourceRow,
        column: valueColumn.path,
        value: String(rawValue),
      });
    }

    const entityCategory = inferEntityCategory(entityName, [conceptLabel ?? conceptCode]);
    const classification = classifyTaxRecord({
      conceptCode,
      detail: conceptLabel,
      suggestedUse,
      entityCategory,
      originalValueHasExplicitNegative:
        typeof rawValue === 'number' ? rawValue < 0 : /^\s*-/.test(String(rawValue ?? '')),
    });

    const rawWithholding = withholdingColumn
      ? toDomainCell(row[withholdingColumn.index] ?? null)
      : null;
    const withholding = coerceNumber(rawWithholding);

    // Columnas no canónicas se preservan íntegras en `extra`.
    const extra: Record<string, CellValue> = {};
    for (const col of columns) {
      if (col.isUnnamed) continue;
      if (usedColumnKeys.has(col.key)) continue;
      extra[col.key] = toDomainCell(row[col.index] ?? null);
    }

    normalizedRecords.push({
      id: prefixedId('norm', [sheetName, sourceRow]),
      rawId,
      source: { sheet: sheetName, row: sourceRow },
      entityName,
      entityTaxId: reportingEntityDocument,
      reportingEntityDocument,
      reportedPersonDocument,
      reportedPersonDocumentNormalized,
      identityMatch,
      conceptCode,
      conceptLabel,
      reportedValue,
      withholding,
      currency: 'COP',
      suggestedUse,
      ...classification,
      extra,
    });
  }

  return { rawRecords, normalizedRecords, emptyRowNumbers, nonNumericCells };
}
