export function normalizeDocumentText(value: string): string {
  const withoutControls = Array.from(value, (character) => {
    const code = character.charCodeAt(0);
    return code < 32 && code !== 9 && code !== 10 && code !== 13 ? '' : character;
  }).join('');
  return withoutControls
    .normalize('NFKC')
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
  return parseMoneyAmount(value).parsedValue;
}

export function stableDocumentId(...parts: readonly string[]): string {
  let hash = 2166136261;
  for (const char of parts.join('|')) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}
import { parseMoneyAmount } from './money';
