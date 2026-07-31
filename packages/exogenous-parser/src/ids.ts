/**
 * Generación de identificadores DETERMINISTAS.
 * El mismo contenido produce siempre el mismo id, condición necesaria para que
 * el resultado del parser sea reproducible (§6) y comparable entre corridas.
 */

/** Hash FNV-1a de 32 bits -> string base36. Estable y sin dependencias. */
export function stableHash(parts: readonly (string | number)[]): string {
  const input = parts.join('␟'); // separador improbable en datos reales
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    // multiplicación FNV con desbordamiento de 32 bits
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(36);
}

/** id con prefijo semántico, ej. `raw_1a2b3c`. */
export function prefixedId(prefix: string, parts: readonly (string | number)[]): string {
  return `${prefix}_${stableHash(parts)}`;
}
