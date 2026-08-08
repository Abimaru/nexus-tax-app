const SPANISH_COLLATOR = new Intl.Collator('es-CO', {
  sensitivity: 'base',
  numeric: true,
  ignorePunctuation: true,
});

export function compareSpanishText(
  left: string | null | undefined,
  right: string | null | undefined,
) {
  return SPANISH_COLLATOR.compare((left ?? '').trim(), (right ?? '').trim());
}

/** Devuelve una copia ordenada; nunca muta arreglos procedentes del dominio. */
export function sortBySpanishLabel<T>(
  items: readonly T[],
  label: (item: T) => string | null | undefined,
): T[] {
  return [...items].sort((left, right) => {
    const byLabel = compareSpanishText(label(left), label(right));
    return byLabel || compareSpanishText(String(left), String(right));
  });
}
