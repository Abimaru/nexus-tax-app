'use client';

import { PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer } from 'recharts';
import type { ProcessingMetrics } from '@nexus-tax/domain';

/** Indicador de calidad de datos (§11). Donut + desglose de hallazgos. */
export function QualityGauge({ metrics }: { metrics: ProcessingMetrics }) {
  const score = metrics.qualityScore;
  const color = score >= 80 ? '#2dd4bf' : score >= 55 ? '#f59e0b' : '#f43f5e';
  const data = [{ name: 'calidad', value: score, fill: color }];

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-[180px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            innerRadius="72%"
            outerRadius="100%"
            data={data}
            startAngle={220}
            endAngle={-40}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
            <RadialBar
              dataKey="value"
              background={{ fill: 'rgba(148,163,184,0.12)' }}
              cornerRadius={12}
            />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-semibold text-slate-50">{score}</span>
          <span className="text-xs text-slate-400">de 100</span>
        </div>
      </div>

      <dl className="mt-2 grid w-full grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-lg bg-white/5 py-2">
          <dt className="text-slate-400">Errores</dt>
          <dd className="text-base font-medium text-rose-300">{metrics.findingCounts.error}</dd>
        </div>
        <div className="rounded-lg bg-white/5 py-2">
          <dt className="text-slate-400">Advertencias</dt>
          <dd className="text-base font-medium text-amber-300">{metrics.findingCounts.warning}</dd>
        </div>
        <div className="rounded-lg bg-white/5 py-2">
          <dt className="text-slate-400">Info</dt>
          <dd className="text-base font-medium text-accent-cyan">{metrics.findingCounts.info}</dd>
        </div>
      </dl>
    </div>
  );
}
