/**
 * Utilidades de texto para COMPARACIÓN INTERNA únicamente.
 * Regla (§6): nunca se altera el texto original que se muestra o exporta.
 * Estas funciones solo producen claves de comparación normalizadas.
 */

/** Rango Unicode de marcas diacríticas combinantes (U+0300–U+036F). */
const COMBINING_MARKS = new RegExp('[\\u0300-\\u036f]', 'g');

/**
 * Normaliza para comparar: minúsculas, sin tildes, espacios colapsados.
 * NO se usa para mostrar ni persistir valores; solo para emparejar encabezados
 * y detectar coincidencias.
 */
export function normalizeForCompare(input: string): string {
  return input
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ') // signos -> espacio
    .replace(/\s+/g, ' ')
    .trim();
}

/** Verdadero si el texto normalizado está vacío. */
export function isBlank(input: unknown): boolean {
  return input === null || input === undefined || String(input).trim() === '';
}

/** Convierte un valor de celda a texto legible para evidencia (sin interpretar). */
export function toEvidenceText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  return String(value);
}
