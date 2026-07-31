import type { RawCell } from './workbook';
import { normalizeForCompare, toEvidenceText } from './text';

/**
 * Descriptor de columna derivado de la fila de encabezados.
 * Conserva SIEMPRE el nombre original y añade metadatos (columna sin nombre,
 * encabezado duplicado) sin alterar el texto de origen.
 */
export interface ColumnDescriptor {
  index: number;
  /** Nombre original tal cual (puede estar vacío). */
  original: string;
  parent: string | null;
  /** Ruta jerárquica, por ejemplo "Persona que reporta > NIT". */
  path: string;
  /** Clave única para indexar celdas (sintética si el original está vacío/duplicado). */
  key: string;
  /** Forma normalizada, solo para comparación interna. */
  normalized: string;
  isUnnamed: boolean;
  isDuplicate: boolean;
}

/** Construye descriptores de columna a partir de la fila de encabezados. */
export function buildColumns(
  headerRow: RawCell[],
  columnCount: number,
  parentHeaderRow: RawCell[] = [],
): ColumnDescriptor[] {
  const descriptors: ColumnDescriptor[] = [];
  const seenNormalized = new Map<string, number>();
  const usedKeys = new Set<string>();
  const parents: (string | null)[] = [];
  let currentParent: string | null = null;
  for (let index = 0; index < columnCount; index += 1) {
    const candidate = toEvidenceText(parentHeaderRow[index]).trim();
    if (candidate !== '') currentParent = candidate;
    parents.push(currentParent);
  }

  for (let index = 0; index < columnCount; index += 1) {
    const original = toEvidenceText(headerRow[index]).trim();
    const isUnnamed = original === '';
    const parent = parents[index] ?? null;
    const path = parent && !isUnnamed ? `${parent} > ${original}` : original;
    const normalized = isUnnamed ? '' : normalizeForCompare(path);

    const priorCount = normalized ? (seenNormalized.get(normalized) ?? 0) : 0;
    const isDuplicate = !isUnnamed && priorCount > 0;
    if (normalized) seenNormalized.set(normalized, priorCount + 1);

    // Clave única y estable para el mapa de celdas.
    let key = isUnnamed ? `Columna ${index + 1}` : path;
    if (usedKeys.has(key)) key = `${key} (${index + 1})`;
    usedKeys.add(key);

    descriptors.push({ index, original, parent, path, key, normalized, isUnnamed, isDuplicate });
  }

  return descriptors;
}
