'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ReportingEntity } from '@nexus-tax/domain';
import { formatCurrencyCOP, formatCurrencyCompact } from '@nexus-tax/ui';
import { AXIS_COLOR, CHART_COLORS, GRID_COLOR, TOOLTIP_STYLE, truncateLabel } from './chartTheme';

/** Barras de valores reportados por entidad (top N). */
export function EntityBarChart({
  entities,
  topN = 8,
}: {
  entities: ReportingEntity[];
  topN?: number;
}) {
  const data = entities.slice(0, topN).map((e) => ({
    name: e.name,
    short: truncateLabel(e.name),
    value: e.totalReported,
  }));

  if (data.length === 0) {
    return <p className="text-sm text-content-subtle">Sin entidades para graficar.</p>;
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
          <XAxis
            dataKey="short"
            tick={{ fill: AXIS_COLOR, fontSize: 11 }}
            interval={0}
            angle={-25}
            textAnchor="end"
            height={64}
          />
          <YAxis
            tick={{ fill: AXIS_COLOR, fontSize: 11 }}
            tickFormatter={(v: number) => formatCurrencyCompact(v)}
            width={72}
          />
          <Tooltip
            cursor={{ fill: 'rgba(148,163,184,0.08)' }}
            contentStyle={TOOLTIP_STYLE}
            formatter={(value: number) => [formatCurrencyCOP(value), 'Total reportado']}
            labelFormatter={(_label, payload) => payload?.[0]?.payload?.name ?? ''}
          />
          <Bar dataKey="value" radius={[6, 6, 0, 0]}>
            {data.map((_, index) => (
              <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Alternativa textual accesible (§14). */}
      <details className="mt-2 text-xs text-content-subtle">
        <summary className="cursor-pointer">Ver datos en tabla</summary>
        <table className="mt-2 w-full text-left">
          <thead>
            <tr className="text-content-muted">
              <th className="py-1">Entidad</th>
              <th className="py-1 text-right">Total reportado</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.name} className="border-t border-overlay/5">
                <td className="py-1">{d.name}</td>
                <td className="py-1 text-right">{formatCurrencyCOP(d.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
