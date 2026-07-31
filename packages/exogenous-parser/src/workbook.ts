import * as XLSX from 'xlsx';
import type { CellValue, WorkbookMetadata, SheetMetadata } from '@nexus-tax/domain';
import { looksLikeIdentifier } from './value';

/**
 * Lectura de bajo nivel del libro Excel.
 * - Acepta `.xlsx` y `.xls` (formato detectado por xlsx).
 * - `bookVBA: false` evita procesar macros/contenido activo.
 * - Preserva identificadores largos leyendo el texto formateado de la celda.
 */

/** Valor de celda en bruto, incluye `Date` (aún no serializado a dominio). */
export type RawCell = string | number | boolean | Date | null;

export interface ReadWorkbookResult {
  metadata: WorkbookMetadata;
  /** Todas las filas reales por hoja. Es la única fuente para el procesamiento. */
  fullRows: Record<string, RawCell[][]>;
}

/** Proyección acotada para UI. Nunca se usa como entrada del parser. */
export interface SheetPreview {
  name: string;
  previewRows: CellValue[][];
}

function cellToRawValue(cell: XLSX.CellObject | undefined): RawCell {
  if (!cell || cell.v === undefined || cell.v === null) return null;
  switch (cell.t) {
    case 'n': {
      // Preserva identificadores largos sin perder dígitos ni caer en notación
      // científica. Para enteros seguros, `String(v)` es exacto; el texto
      // formateado de Excel (`.w`) puede venir en notación científica (lossy),
      // por eso solo se usa como respaldo cuando no hay entero seguro.
      const value = typeof cell.v === 'number' ? cell.v : Number(cell.v);
      const isSafeInteger = Number.isInteger(value) && Number.isSafeInteger(value);
      const preferred = isSafeInteger
        ? String(value)
        : typeof cell.w === 'string'
          ? cell.w
          : String(value);
      const identifierLike =
        looksLikeIdentifier(preferred) ||
        (typeof cell.w === 'string' && looksLikeIdentifier(cell.w));
      if (identifierLike) return preferred.trim();
      return value;
    }
    case 'd':
      return cell.v instanceof Date ? cell.v : new Date(String(cell.v));
    case 'b':
      return Boolean(cell.v);
    case 'e':
      return null; // celda de error -> nulo
    default:
      return String(cell.v);
  }
}

/** Elimina filas finales completamente vacías para no inflar dimensiones. */
function trimTrailingEmptyRows(rows: RawCell[][]): RawCell[][] {
  let end = rows.length;
  while (end > 0) {
    const row = rows[end - 1];
    const hasData = row?.some((c) => c !== null && String(c).trim() !== '');
    if (hasData) break;
    end -= 1;
  }
  return rows.slice(0, end);
}

interface WorksheetCell {
  row: number;
  column: number;
  cell: XLSX.CellObject;
}

/**
 * Obtiene las celdas efectivamente presentes en la hoja. No confía en `!ref`:
 * algunos productores generan un rango declarado que termina antes que los
 * datos reales y SheetJS conserva esas celdas fuera de la dimensión declarada.
 */
function worksheetCells(sheet: XLSX.WorkSheet): WorksheetCell[] {
  const cells: WorksheetCell[] = [];
  for (const address of Object.keys(sheet)) {
    if (address.startsWith('!') || !/^[A-Z]+\d+$/i.test(address)) continue;
    const cell = sheet[address] as XLSX.CellObject | undefined;
    if (!cell || (cell.v === undefined && cell.f === undefined)) continue;
    const position = XLSX.utils.decode_cell(address);
    cells.push({ row: position.r, column: position.c, cell });
  }
  return cells;
}

function readFullRows(sheet: XLSX.WorkSheet): RawCell[][] {
  const cells = worksheetCells(sheet);
  if (cells.length === 0) return [];

  const lastRow = cells.reduce((max, item) => Math.max(max, item.row), 0);
  // Se parte siempre de A1 para que el índice de matriz conserve la fila real
  // del Excel incluso si `!ref` declara otro inicio. Las filas son dispersas
  // para no reservar un rectángulo gigante por una celda aislada muy lejana.
  const rows = Array.from({ length: lastRow + 1 }, () => [] as RawCell[]);
  for (const { row, column, cell } of cells) {
    rows[row]![column] = cellToRawValue(cell);
  }
  return trimTrailingEmptyRows(rows);
}

export function readWorkbook(
  data: ArrayBuffer,
  fileName: string,
  fileSizeBytes: number,
): ReadWorkbookResult {
  const workbook = XLSX.read(new Uint8Array(data), {
    type: 'array',
    cellDates: true,
    cellText: true,
    cellNF: false,
    bookVBA: false,
    dense: false,
  });

  const fullRows: Record<string, RawCell[][]> = {};
  const sheetMetas: SheetMetadata[] = [];

  workbook.SheetNames.forEach((name, index) => {
    const ws = workbook.Sheets[name];
    if (!ws) {
      fullRows[name] = [];
      sheetMetas.push({ name, index, rowCount: 0, columnCount: 0, isEmpty: true });
      return;
    }

    const rows = readFullRows(ws);
    const columnCount = rows.reduce((max, row) => Math.max(max, row.length), 0);
    const isEmpty = rows.every((row) => row.every((c) => c === null || String(c).trim() === ''));

    fullRows[name] = rows;
    sheetMetas.push({
      name,
      index,
      rowCount: rows.length,
      columnCount,
      isEmpty,
    });
  });

  const metadata: WorkbookMetadata = {
    fileName,
    fileSizeBytes,
    sheetCount: workbook.SheetNames.length,
    sheets: sheetMetas,
  };

  return { metadata, fullRows };
}

/** Serializa una celda cruda al tipo `CellValue` del dominio (Date -> ISO). */
export function toDomainCell(value: RawCell): string | number | boolean | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }
  return value;
}

export function buildWorkbookPreviews(
  read: ReadWorkbookResult,
  previewRowLimit: number,
): SheetPreview[] {
  const limit = Math.max(0, Math.trunc(previewRowLimit));
  return read.metadata.sheets.map((sheet) => ({
    name: sheet.name,
    previewRows: (read.fullRows[sheet.name] ?? [])
      .slice(0, limit)
      .map((row) => Array.from(row, (cell) => toDomainCell(cell ?? null))),
  }));
}
