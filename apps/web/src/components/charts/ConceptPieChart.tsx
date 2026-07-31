'use client';

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { ReportedConcept } from '@nexus-tax/domain';
import { formatCurrencyCOP } from '@nexus-tax/ui';
import { CHART_COLORS, truncateLabel } from './chartTheme';

/** Composición por concepto (agrupa la cola en "Otros"). */
export function ConceptPieChart({
  concepts,
  topN = 6,
}: {
  concepts: ReportedConcept[];
  topN?: number;
}) {
  const positive = concepts.filter((c) => c.totalReported > 0);
  if (positive.length === 0) {
    return <p className="text-sm text-slate-500">Sin conceptos con valor para graficar.</p>;
  }

  const head = positive.slice(0, topN);
  const tail = positive.slice(topN);
  const tailTotal = tail.reduce((sum, c) => sum + c.totalReported, 0);
  const data = [
    ...head.map((c) => ({ name: c.label, value: c.totalReported })),
    ...(tailTotal > 0 ? [{ name: 'Otros', value: tailTotal }] : []),
  ];

  return (
    <div>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={95}
            paddingAngle={2}
          >
            {data.map((_, index) => (
              <Cell
                key={index}
                fill={CHART_COLORS[index % CHART_COLORS.length]}
                stroke="transparent"
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: '#0d1424',
              border: '1px solid rgba(148,163,184,0.2)',
              borderRadius: 12,
              color: '#e2e8f0',
            }}
            formatter={(value: number, name: string) => [formatCurrencyCOP(value), name]}
          />
          <Legend
            formatter={(value: string) => (
              <span className="text-xs text-slate-400">{truncateLabel(value, 22)}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
