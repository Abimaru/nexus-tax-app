export function normalizeDocumentText(value: string): string {
  return value
    .normalize('NFKC')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim();
}

export function comparableText(value: string): string {
  return normalizeDocumentText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseColombianAmount(value: string): number | null {
  const cleaned = value
    .replace(/(?:cop|\$)/gi, '')
    .replace(/\s/g, '')
    .replace(/[^\d,.-]/g, '');
  if (!cleaned || !/\d/.test(cleaned)) return null;
  const negative = cleaned.startsWith('-') || /^\(.*\)$/.test(value.trim());
  const unsigned = cleaned.replace(/-/g, '');
  const lastComma = unsigned.lastIndexOf(',');
  const lastDot = unsigned.lastIndexOf('.');
  let normalized = unsigned;
  if (lastComma > lastDot && unsigned.length - lastComma - 1 <= 2) {
    normalized = unsigned.replace(/\./g, '').replace(',', '.');
  } else if (lastDot > lastComma && unsigned.length - lastDot - 1 <= 2) {
    normalized = unsigned.replace(/,/g, '');
  } else {
    normalized = unsigned.replace(/[.,]/g, '');
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? (negative ? -parsed : parsed) : null;
}

export function stableDocumentId(...parts: readonly string[]): string {
  let hash = 2166136261;
  for (const char of parts.join('|')) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}
