/** Genera un identificador único para entidades persistidas (expedientes, docs). */
export function newId(prefix: string): string {
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36);
  return `${prefix}_${random}`;
}

/** Marca de tiempo ISO actual (UTC). */
export function nowIso(): string {
  return new Date().toISOString();
}
