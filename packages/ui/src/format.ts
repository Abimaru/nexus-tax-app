import { APP_IDENTITY } from '@nexus-tax/config';

/**
 * Utilidades de formato de presentación (es-CO).
 * Solo formatean para mostrar; nunca alteran los datos de dominio.
 */

const currencyFormatter = new Intl.NumberFormat(APP_IDENTITY.locale, {
  style: 'currency',
  currency: APP_IDENTITY.currency,
  maximumFractionDigits: 0,
});

const compactCurrencyFormatter = new Intl.NumberFormat(APP_IDENTITY.locale, {
  style: 'currency',
  currency: APP_IDENTITY.currency,
  notation: 'compact',
  maximumFractionDigits: 1,
});

const numberFormatter = new Intl.NumberFormat(APP_IDENTITY.locale);

/** Formato monetario colombiano completo, ej. "$ 1.234.567". */
export function formatCurrencyCOP(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return currencyFormatter.format(value);
}

/** Formato monetario compacto para ejes de gráficas, ej. "$ 1,2 M". */
export function formatCurrencyCompact(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return compactCurrencyFormatter.format(value);
}

/** Formato de número entero con separadores de miles. */
export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return numberFormatter.format(value);
}

/** Tamaño de archivo legible. */
export function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}
