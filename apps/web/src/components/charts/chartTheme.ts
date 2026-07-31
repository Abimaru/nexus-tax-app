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

/** Acorta etiquetas largas para ejes sin perder legibilidad. */
export function truncateLabel(label: string, max = 18): string {
  return label.length > max ? `${label.slice(0, max - 1)}…` : label;
}
