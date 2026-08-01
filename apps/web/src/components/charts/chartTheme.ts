import type { CSSProperties } from 'react';

/** Paleta y utilidades compartidas por las gráficas (§11). */
export const CHART_COLORS = [
  '#22d3ee',
  '#3b82f6',
  '#8b5cf6',
  '#38bdf8',
  '#a78bfa',
  '#2dd4bf',
  '#60a5fa',
  '#c084fc',
];

export const AXIS_COLOR = 'rgba(148, 163, 184, 0.6)';
export const GRID_COLOR = 'rgba(148, 163, 184, 0.12)';

/** Estilo de tooltip de gráficas, tema-consciente vía variables CSS. */
export const TOOLTIP_STYLE: CSSProperties = {
  background: 'var(--chart-tooltip-bg)',
  border: '1px solid var(--chart-tooltip-border)',
  borderRadius: 12,
  color: 'var(--chart-tooltip-fg)',
};

/** Acorta etiquetas largas para ejes sin perder legibilidad. */
export function truncateLabel(label: string, max = 18): string {
  return label.length > max ? `${label.slice(0, max - 1)}…` : label;
}
