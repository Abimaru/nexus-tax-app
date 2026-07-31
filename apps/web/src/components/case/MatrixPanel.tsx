'use client';

import { RotateCcw } from 'lucide-react';
import type { CaseAnalysis, ProcessingResult } from '@nexus-tax/domain';
import { Badge, Button, GlassPanel, formatCurrencyCOP, formatNumber } from '@nexus-tax/ui';
import { restoreAutomaticAnalysis } from '@/lib/repository';
import {
  CATEGORY_LABEL,
  DISPOSITION_LABEL,
  RECONCILIATION_LABEL,
  RELATION_LABEL,
  RESOLUTION_LABEL,
} from '@/lib/analysisPresentation';

function statusTone(status: string) {
  if (status === 'reconciled' || status === 'rounding_difference') return 'emerald' as const;
  if (status === 'relevant_difference') return 'rose' as const;
  if (status === 'incomplete' || status === 'pending_documents') return 'amber' as const;
  return 'neutral' as const;
}

export function MatrixPanel({
  caseId,
  result,
  analysis,
}: {
  caseId: string;
  result: ProcessingResult;
  analysis: CaseAnalysis;
}) {
  const invoice = analysis.matrix.electronicInvoicing;
  return (
    <div className="flex flex-col gap-5">
      <GlassPanel className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">Matriz tributaria preliminar</h2>
            <p className="mt-1 text-sm text-slate-400">
              Consolidados explicables, relaciones y conciliación contra los topes detectados.
            </p>
          </div>
          <Button
            variant="secondary"
            leadingIcon={<RotateCcw className="h-4 w-4" aria-hidden />}
            onClick={() => {
              if (
                window.confirm(
                  '¿Restaurar completamente el análisis automático? El historial manual se eliminará.',
                )
              ) {
                void restoreAutomaticAnalysis(caseId);
              }
            }}
          >
            Restaurar análisis automático
          </Button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <QualityCard
            label="Calidad de extracción"
            score={analysis.matrix.quality.extraction.score}
            detail={analysis.matrix.quality.extraction.explanation}
          />
          <QualityCard
            label="Calidad de clasificación"
            score={analysis.matrix.quality.classification.score}
            detail={analysis.matrix.quality.classification.explanation}
          />
          <QualityCard
            label="Nivel de conciliación"
            score={analysis.matrix.quality.reconciliation.score}
            detail={analysis.matrix.quality.reconciliation.explanation}
          />
        </div>
      </GlassPanel>

      <GlassPanel className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-medium text-slate-100">Facturación electrónica DIAN</h3>
            <p className="text-xs text-slate-500">
              Indicadores de compras, soporte y conciliación; no son gastos deducibles definitivos.
            </p>
          </div>
          <Badge tone="violet">Reportado por la DIAN</Badge>
        </div>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <InvoiceMetric label="Total neto facturado" value={invoice.totalNetInvoiced} />
          <InvoiceMetric label="Base susceptible" value={invoice.eligibleBenefitBase} />
          <InvoiceMetric label="Diferencia" value={invoice.difference} />
          <div className="rounded-lg border border-white/8 p-3">
            <dt className="text-xs text-slate-500">Porcentaje susceptible</dt>
            <dd className="mt-1 text-sm font-medium text-slate-100">
              {invoice.eligiblePercentage === null
                ? '—'
                : `${invoice.eligiblePercentage.toFixed(2)} %`}
            </dd>
          </div>
          <InvoiceMetric label="Beneficio preliminar 1 %" value={invoice.preliminaryBenefit} />
        </dl>
        <div className="mt-4 rounded-lg border border-amber-400/20 bg-amber-400/5 p-3 text-xs text-amber-100">
          La base susceptible es un subconjunto del total neto facturado y no se suma nuevamente a
          las compras. El 1 % es una estimación orientativa: no confirma procedencia ni aplica todos
          los límites legales.
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Estado: {invoice.reviewStatus} · registros totales: {invoice.totalRecordIds.length} ·
          bases susceptibles: {invoice.benefitBaseRecordIds.length} · relaciones de subconjunto:{' '}
          {invoice.relationIds.length}.
        </p>
      </GlassPanel>

      <div className="space-y-3">
        {analysis.matrix.groups.map((group) => (
          <details
            key={group.id}
            className="group rounded-xl border border-white/8 bg-white/[0.02]"
          >
            <summary className="cursor-pointer list-none p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/50">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-medium text-slate-100">{group.label}</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    {group.includedCount} incluidos · {group.excludedCount} excluidos ·{' '}
                    {group.pendingCount} pendientes
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-slate-100">
                    {formatCurrencyCOP(group.consolidatedValue)}
                  </span>
                  <Badge tone={statusTone(group.reconciliationStatus)}>
                    {RECONCILIATION_LABEL[group.reconciliationStatus]}
                  </Badge>
                </div>
              </div>
            </summary>
            <div className="border-t border-white/8 p-4">
              <dl className="grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
                <Data
                  label="Tope DIAN"
                  value={
                    group.thresholdValue === null
                      ? 'No disponible'
                      : formatCurrencyCOP(group.thresholdValue)
                  }
                />
                <Data
                  label="Diferencia absoluta"
                  value={
                    group.differenceAbsolute === null
                      ? '—'
                      : formatCurrencyCOP(group.differenceAbsolute)
                  }
                />
                <Data
                  label="Diferencia porcentual"
                  value={
                    group.differencePercentage === null
                      ? '—'
                      : `${group.differencePercentage.toFixed(2)} %`
                  }
                />
                <Data label="Confianza" value={group.confidence} />
              </dl>
              {group.warnings.map((warning) => (
                <p key={warning} className="mt-3 text-xs text-amber-200">
                  {warning}
                </p>
              ))}
              <p className="mt-2 text-xs text-accent-cyan">Acción: {group.recommendedAction}</p>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-left text-xs">
                  <thead className="text-slate-500">
                    <tr>
                      <th className="px-2 py-2">Fila / detalle</th>
                      <th className="px-2 py-2">Clasificación</th>
                      <th className="px-2 py-2">Disposición</th>
                      <th className="px-2 py-2">Relaciones</th>
                      <th className="px-2 py-2 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.entries.map((entry) => {
                      const record = result.normalizedRecords.find(
                        (item) => item.id === entry.recordId,
                      );
                      const relations = analysis.relationships.filter((item) =>
                        entry.relationIds.includes(item.id),
                      );
                      return (
                        <tr key={entry.recordId} className="border-t border-white/5 text-slate-300">
                          <td className="px-2 py-2">
                            {record?.source.sheet} · {record?.source.row}
                            <span className="block text-slate-500">
                              {record?.conceptLabel ?? 'Sin detalle'}
                            </span>
                          </td>
                          <td className="px-2 py-2">
                            {CATEGORY_LABEL[entry.effectiveClassification.category]}
                            <span className="block text-slate-500">
                              {RESOLUTION_LABEL[entry.resolutionStatus]}
                            </span>
                          </td>
                          <td className="px-2 py-2">
                            {DISPOSITION_LABEL[entry.disposition]}
                            <span className="block max-w-72 text-slate-500">{entry.reason}</span>
                          </td>
                          <td className="px-2 py-2">
                            {relations.length
                              ? relations
                                  .map((relation) => RELATION_LABEL[relation.type])
                                  .join(', ')
                              : '—'}
                          </td>
                          <td className="px-2 py-2 text-right">{formatCurrencyCOP(entry.value)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </details>
        ))}
      </div>
      <p className="text-xs text-slate-500">
        Matriz {analysis.matrix.ruleVersion} · {formatNumber(analysis.relationships.length)}{' '}
        relaciones trazables · cálculo completamente local.
      </p>
    </div>
  );
}

function QualityCard({ label, score, detail }: { label: string; score: number; detail: string }) {
  return (
    <div className="rounded-xl border border-white/8 p-4">
      <span className="text-xs text-slate-500">{label}</span>
      <p className="mt-1 text-2xl font-semibold text-slate-100">{score}/100</p>
      <p className="mt-2 text-xs text-slate-500">{detail}</p>
    </div>
  );
}

function InvoiceMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-white/8 p-3">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-slate-100">{formatCurrencyCOP(value)}</dd>
    </div>
  );
}

function Data({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-slate-500">{label}</dt>
      <dd className="mt-1 text-slate-200">{value}</dd>
    </div>
  );
}
