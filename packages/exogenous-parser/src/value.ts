import type { CellValue } from '@nexus-tax/domain';

/**
 * Coerción cuidadosa de valores (§6).
 * - No convierte identificadores largos a notación científica.
 * - Interpreta números en formato colombiano (1.234.567,89).
 * - Transforma fechas a ISO (yyyy-mm-dd) de forma predecible.
 */

/** Umbral de dígitos a partir del cual un número se preserva como identificador. */
const IDENTIFIER_DIGIT_THRESHOLD = 12;

/**
 * Decide si un valor debe conservarse como identificador de texto en lugar de
 * número, para evitar pérdida de precisión o notación científica.
 */
export function looksLikeIdentifier(raw: string): boolean {
  const digits = raw.replace(/\D/g, '');
  if (digits.length >= IDENTIFIER_DIGIT_THRESHOLD) return true;
  // Notación científica explícita proveniente de Excel (ej. "9,001E+11").
  return /e\+?\d+/i.test(raw);
}

/**
 * Convierte un valor de celda a número. Devuelve `null` si no es convertible.
 * Soporta separadores colombianos y símbolos de moneda.
 */
export function coerceNumber(value: CellValue): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'boolean') return null;

  let text = value.trim();
  if (text === '') return null;

  // Elimina símbolo de moneda y espacios (\s ya cubre el NBSP en JS).
  text = text.replace(/[$\s]/g, '');
  // Paréntesis contables -> negativo: (1.000) => -1000
  let negative = false;
  if (/^\(.*\)$/.test(text)) {
    negative = true;
    text = text.slice(1, -1);
  }

  const hasComma = text.includes(',');
  const hasDot = text.includes('.');

  if (hasComma && hasDot) {
    // El último separador es el decimal; el otro son miles.
    if (text.lastIndexOf(',') > text.lastIndexOf('.')) {
      text = text.replace(/\./g, '').replace(',', '.'); // formato CO
    } else {
      text = text.replace(/,/g, ''); // formato US
    }
  } else if (hasComma) {
    // Solo coma: se asume decimal colombiano.
    text = text.replace(',', '.');
  } else if (hasDot) {
    // Solo puntos: si hay varios o agrupan de a 3, son miles.
    const dotCount = (text.match(/\./g) ?? []).length;
    if (dotCount > 1 || /^\d{1,3}(\.\d{3})+$/.test(text)) {
      text = text.replace(/\./g, '');
    }
  }

  const parsed = Number(text);
  if (!Number.isFinite(parsed)) return null;
  return negative ? -parsed : parsed;
}

/** Convierte una fecha (Date de Excel) a ISO yyyy-mm-dd, o devuelve el texto. */
export function coerceDate(value: CellValue | Date): string | null {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return value.toISOString().slice(0, 10);
  }
  return null;
}

/** Convierte cualquier valor de celda a texto conservando identificadores. */
export function coerceText(value: CellValue | Date): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const text = String(value).trim();
  return text === '' ? null : text;
}
