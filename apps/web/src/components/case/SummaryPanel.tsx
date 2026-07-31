'use client';

import { AlertTriangle, Building2, Coins, Layers, ListChecks } from 'lucide-react';
import type { CaseAnalysis, ProcessingResult } from '@nexus-tax/domain';
import { GlassPanel, StatCard, formatCurrencyCOP, formatNumber } from '@nexus-tax/ui';
import { EntityBarChart } from '@/components/charts/EntityBarChart';
import { ConceptPieChart } from '@/components/charts/ConceptPieChart';
import { QualityGauge } from '@/components/charts/QualityGauge';

/** Pantalla "Resumen" (§10). Tarjetas de métricas + gráficas. */
export function SummaryPanel({
  result,
  analysis,
}: {
  result: ProcessingResult;
  analysis?: CaseAnalysis;
}) {
  const { metrics } = result;
  const homogeneous = metrics.homogeneousTotals;
  const totalFindings =
    metrics.findingCounts.info + metrics.findingCounts.warning + metrics.findingCounts.error;
  const quality = analysis?.matrix.quality ?? metrics.qualityDimensions;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label="Registros"
          value={metrics.recordCount}
          format={formatNumber}
          icon={<ListChecks className="h-5 w-5" aria-hidden />}
          accent="cyan"
          delay={0}
        />
        <StatCard
          label="Entidades"
          value={metrics.entityCount}
          format={formatNumber}
          icon={<Building2 className="h-5 w-5" aria-hidden />}
          accent="blue"
          delay={0.05}
        />
        <StatCard
          label="Conceptos"
          value={metrics.conceptCount}
          format={formatNumber}
          icon={<Layers className="h-5 w-5" aria-hidden />}
          accent="violet"
          delay={0.1}
        />
        <StatCard
          label="Suma bruta no consolidada"
          value={metrics.grossUnconsolidatedSum}
          format={formatCurrencyCOP}
          icon={<Coins className="h-5 w-5" aria-hidden />}
          accent="emerald"
          delay={0.15}
        />
        <StatCard
          label="Hallazgos"
          value={totalFindings}
          format={formatNumber}
          icon={<AlertTriangle className="h-5 w-5" aria-hidden />}
          accent="amber"
          delay={0.2}
        />
      </div>

      <p className="-mt-3 text-xs text-slate-500">
        Suma aritmética de registros heterogéneos. No representa ingresos, patrimonio, gastos ni
        impuesto total.
      </p>

      <GlassPanel className="p-5">
        <h3 className="text-sm font-medium text-slate-200">Agrupaciones tributarias iniciales</h3>
        <p className="mb-4 text-xs text-slate-500">
          Clasificación orientativa y determinista; no constituye el cálculo del Formulario 210.
        </p>
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Ingresos detectados" value={homogeneous.detectedIncome} />
          <Metric label="Activos detectados" value={homogeneous.detectedAssets} />
          <Metric label="Deudas detectadas" value={homogeneous.detectedLiabilities} />
          <Metric label="Retenciones detectadas" value={homogeneous.detectedWithholdings} />
          <Metric label="Movimientos financieros" value={homogeneous.financialMovements} />
          <Metric label="Consumos" value={homogeneous.cardConsumption} />
          <Metric label="Compras" value={homogeneous.purchases} />
          <div className="rounded-lg border border-white/8 bg-white/[0.02] p-3">
            <dt className="text-xs text-slate-500">Registros sin clasificar</dt>
            <dd className="mt-1 text-lg font-medium text-slate-100">
              {formatNumber(homogeneous.unclassifiedRecordCount)}
            </dd>
          </div>
        </dl>
      </GlassPanel>

      <div className="grid gap-4 lg:grid-cols-2">
        <GlassPanel className="p-5">
          <h3 className="mb-3 text-sm font-medium text-slate-200">
            Valores reportados por entidad
          </h3>
          <EntityBarChart entities={result.entities} />
        </GlassPanel>
        <GlassPanel className="p-5">
          <h3 className="mb-3 text-sm font-medium text-slate-200">Distribución por concepto</h3>
          <ConceptPieChart concepts={result.concepts} />
        </GlassPanel>
      </div>

      {result.report?.thresholds.length ? (
        <GlassPanel className="p-5">
          <h3 className="text-sm font-medium text-slate-200">Resumen de topes detectado</h3>
          <p className="mb-3 text-xs text-slate-500">
            Se muestra como contexto del reporte y no se incluye entre los registros de terceros.
          </p>
          <dl className="grid gap-2 sm:grid-cols-2">
            {result.report.thresholds.map((threshold) => (
              <div
                key={`${threshold.source.sheet}-${threshold.source.row}`}
                className="flex items-start justify-between gap-4 rounded-lg border border-white/8 bg-white/[0.02] p-3"
              >
                <div>
                  <dt className="text-sm text-slate-300">
                    {threshold.number !== undefined ? `${threshold.number}. ` : ''}
                    {threshold.label}
                  </dt>
                  <dd className="text-xs text-slate-500">
                    {threshold.source.sheet} · fila {threshold.source.row}
                  </dd>
                </div>
                <dd className="shrink-0 text-sm font-medium text-slate-100">
                  {formatCurrencyCOP(threshold.value)}
                </dd>
              </div>
            ))}
          </dl>
        </GlassPanel>
      ) : null}

      <GlassPanel className="p-5">
        <h3 className="mb-3 text-sm font-medium text-slate-200">Calidad del análisis</h3>
        <div className="grid items-center gap-4 sm:grid-cols-[220px_1fr]">
          <QualityGauge metrics={metrics} />
          <p className="text-sm text-slate-400">
            El indicador circular conserva la compatibilidad histórica y representa principalmente
            la extracción. La clasificación y la conciliación se muestran por separado para no
            producir una interpretación engañosa.
          </p>
        </div>
        <dl className="mt-5 grid gap-3 sm:grid-cols-3">
          <QualityMetric
            label="Extracción"
            score={quality.extraction.score}
            detail={quality.extraction.explanation}
          />
          <QualityMetric
            label="Clasificación"
            score={quality.classification.score}
            detail={quality.classification.explanation}
          />
          <QualityMetric
            label="Conciliación"
            score={quality.reconciliation.score}
            detail={quality.reconciliation.explanation}
          />
        </dl>
      </GlassPanel>
    </div>
  );
}

function QualityMetric({ label, score, detail }: { label: string; score: number; detail: string }) {
  return (
    <div className="rounded-lg border border-white/8 p-3">
      <dt className="text-xs text-slate-500">Calidad de {label.toLowerCase()}</dt>
      <dd className="mt-1 text-lg font-medium text-slate-100">{score}/100</dd>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-white/8 bg-white/[0.02] p-3">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-slate-100">{formatCurrencyCOP(value)}</dd>
    </div>
  );
}
