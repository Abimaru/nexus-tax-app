'use client';

import { useState } from 'react';
import { ArrowRight, RotateCcw } from 'lucide-react';
import type {
  AcceptedExogenousValue,
  CaseAnalysis,
  CaseTask,
  ProcessingResult,
} from '@nexus-tax/domain';
import { Badge, Button, GlassPanel, formatCurrencyCOP, formatNumber } from '@nexus-tax/ui';
import { restoreAutomaticAnalysis, saveTaxResolutionDecision } from '@/lib/repository';
import {
  CATEGORY_LABEL,
  CONFIDENCE_LABEL,
  DISPOSITION_LABEL,
  RECONCILIATION_LABEL,
  RELATION_LABEL,
  RESOLUTION_LABEL,
} from '@/lib/analysisPresentation';
import { ACCEPTED_SOURCE_STATUS_PRESENTATION } from '@/lib/presentationCatalogs';
import { AcceptedSourceAction } from './AcceptedSourceAction';

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
  acceptedSources,
  tasks,
  onOpenTasks,
  onNavigateToRecord,
  onNavigateToFindings,
}: {
  caseId: string;
  result: ProcessingResult;
  analysis: CaseAnalysis;
  acceptedSources: AcceptedExogenousValue[];
  tasks: readonly CaseTask[];
  onOpenTasks: () => void;
  /** Salta a Registros enfocando un registro concreto (para resolver un pendiente). */
  onNavigateToRecord?: (recordId: string) => void;
  /** Salta a Hallazgos, donde el analista puede confirmar/modificar/excluir. */
  onNavigateToFindings?: () => void;
}) {
  const invoice = analysis.matrix.electronicInvoicing;
  const [resolvingGroup, setResolvingGroup] = useState<string | null>(null);
  const [resolutionReason, setResolutionReason] = useState('');
  async function resolveGroup(
    groupId: string,
    type: 'accept_rounding_difference' | 'declare_not_comparable' | 'leave_pending',
    previousState: string,
  ) {
    await saveTaxResolutionDecision(caseId, {
      type,
      objectType: 'matrix_group',
      objectId: groupId,
      previousState,
      finalState: type === 'leave_pending' ? 'pending' : 'resolved',
      selectedAlternative:
        type === 'accept_rounding_difference'
          ? 'Aceptar diferencia por redondeo'
          : type === 'declare_not_comparable'
            ? 'Declarar no comparable'
            : 'Dejar pendiente',
      reason: resolutionReason,
      evidence: [
        { kind: 'rule', referenceId: groupId, description: `Estado previo: ${previousState}` },
      ],
    });
    setResolvingGroup(null);
    setResolutionReason('');
  }
  return (
    <div className="flex flex-col gap-5">
      <GlassPanel className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-content-strong">
              Matriz tributaria preliminar
            </h2>
            <p className="mt-1 text-sm text-content-muted">
              Consolidados explicables, relaciones y conciliación contra los topes detectados.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <AcceptedSourceAction
              caseId={caseId}
              result={result}
              acceptedSources={acceptedSources}
              compact
            />
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
        <div
          className="mt-4 flex flex-wrap gap-2 text-xs"
          aria-label="Fuentes y estados de la matriz"
        >
          <Badge tone="emerald">Documentado</Badge>
          <Badge tone="amber">Aceptado desde exógena</Badge>
          <Badge tone="violet">Registro manual</Badge>
          <Badge tone="cyan">Cálculo con reglas locales</Badge>
          <Badge tone="neutral">Pendiente</Badge>
          <Badge tone="rose">Contradicho</Badge>
        </div>
      </GlassPanel>

      <GlassPanel className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-medium text-content-strong">
              Facturación electrónica DIAN
            </h3>
            <p className="text-xs text-content-subtle">
              Indicadores de compras, soporte y conciliación; no son gastos deducibles definitivos.
            </p>
          </div>
          <Badge tone="violet">Reportado por la DIAN</Badge>
        </div>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <InvoiceMetric label="Total neto facturado" value={invoice.totalNetInvoiced} />
          <InvoiceMetric label="Base susceptible" value={invoice.eligibleBenefitBase} />
          <InvoiceMetric label="Diferencia" value={invoice.difference} />
          <div className="rounded-lg border border-overlay/8 p-3">
            <dt className="text-xs text-content-subtle">Porcentaje susceptible</dt>
            <dd className="mt-1 text-sm font-medium text-content-strong">
              {invoice.eligiblePercentage === null
                ? '—'
                : `${invoice.eligiblePercentage.toFixed(2)} %`}
            </dd>
          </div>
          <InvoiceMetric label="Beneficio preliminar 1 %" value={invoice.preliminaryBenefit} />
        </dl>
        <div className="mt-4 rounded-lg border border-amber-400/20 bg-amber-400/5 p-3 text-xs text-tone-amber">
          La base susceptible es un subconjunto del total neto facturado y no se suma nuevamente a
          las compras. El 1 % es una estimación orientativa: no confirma procedencia ni aplica todos
          los límites legales.
        </div>
        <p className="mt-3 text-xs text-content-subtle">
          Estado:{' '}
          {invoice.reviewStatus === 'reviewed'
            ? 'Revisado'
            : invoice.reviewStatus === 'pending'
              ? 'Pendiente de revisión'
              : 'No disponible'}{' '}
          · registros totales: {invoice.totalRecordIds.length} · bases susceptibles:{' '}
          {invoice.benefitBaseRecordIds.length} · relaciones de subconjunto:{' '}
          {invoice.relationIds.length}.
        </p>
      </GlassPanel>

      <div className="space-y-3">
        {analysis.matrix.groups.map((group) => {
          const task = tasks.find(
            (item) => item.matrixGroupId === group.id && item.status === 'pending',
          );
          return (
            <details
              key={group.id}
              className="group rounded-xl border border-overlay/8 bg-overlay/[0.02]"
            >
              <summary className="cursor-pointer list-none p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/50">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-medium text-content-strong">{group.label}</h3>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-content-subtle">
                      <span>{group.includedCount} incluidos</span>
                      <span aria-hidden>·</span>
                      <span>{group.excludedCount} excluidos</span>
                      <span aria-hidden>·</span>
                      {group.pendingCount > 0 && onNavigateToRecord ? (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            const first = group.entries.find(
                              (entry) => entry.disposition === 'pending',
                            );
                            if (first) onNavigateToRecord(first.recordId);
                          }}
                          className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 font-medium text-tone-amber hover:bg-amber-400/20"
                          aria-label={`Ir al primer pendiente de ${group.label}`}
                        >
                          {group.pendingCount} pendiente(s)
                          <ArrowRight className="h-3 w-3" aria-hidden />
                        </button>
                      ) : (
                        <span>{group.pendingCount} pendientes</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-content-strong">
                      {formatCurrencyCOP(group.consolidatedValue)}
                    </span>
                    <Badge tone={statusTone(group.reconciliationStatus)}>
                      {RECONCILIATION_LABEL[group.reconciliationStatus]}
                    </Badge>
                  </div>
                </div>
              </summary>
              <div className="border-t border-overlay/8 p-4">
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
                  <Data label="Confianza" value={CONFIDENCE_LABEL[group.confidence]} />
                </dl>
                {group.warnings.map((warning) => (
                  <p key={warning} className="mt-3 text-xs text-tone-amber">
                    {warning}
                  </p>
                ))}
                <p className="mt-2 text-xs text-tone-cyan">Acción: {group.recommendedAction}</p>
                {!['reconciled', 'not_comparable'].includes(group.reconciliationStatus) ? (
                  resolvingGroup === group.id ? (
                    <div className="mt-3 space-y-3 rounded-xl border border-accent-cyan/20 bg-accent-cyan/5 p-3">
                      <label className="block text-xs text-content-muted">
                        Motivo de la decisión
                        <textarea
                          value={resolutionReason}
                          onChange={(event) => setResolutionReason(event.target.value)}
                          className="mt-1 min-h-16 w-full rounded-lg border border-overlay/12 bg-surface-raised p-2 text-sm text-content-strong"
                        />
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {group.reconciliationStatus === 'rounding_difference' ? (
                          <Button
                            disabled={!resolutionReason.trim()}
                            onClick={() =>
                              void resolveGroup(
                                group.id,
                                'accept_rounding_difference',
                                group.reconciliationStatus,
                              )
                            }
                          >
                            Aceptar redondeo
                          </Button>
                        ) : null}
                        {[
                          'relevant_difference',
                          'incomplete',
                          'pending_documents',
                          'contradicted',
                        ].includes(group.reconciliationStatus) ? (
                          <Button
                            disabled={!resolutionReason.trim()}
                            variant="secondary"
                            onClick={() =>
                              void resolveGroup(
                                group.id,
                                'declare_not_comparable',
                                group.reconciliationStatus,
                              )
                            }
                          >
                            Marcar no comparable
                          </Button>
                        ) : null}
                        <Button
                          disabled={!resolutionReason.trim()}
                          variant="ghost"
                          onClick={() =>
                            void resolveGroup(group.id, 'leave_pending', group.reconciliationStatus)
                          }
                        >
                          Dejar pendiente
                        </Button>
                        <Button variant="ghost" onClick={() => setResolvingGroup(null)}>
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      className="mt-3"
                      variant="secondary"
                      onClick={() => setResolvingGroup(group.id)}
                    >
                      Resolver grupo aquí
                    </Button>
                  )
                ) : null}
                {group.pendingCount > 0 || task ? (
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    {group.pendingCount > 0 && onNavigateToRecord ? (
                      <Button
                        variant="secondary"
                        className="px-3 py-1.5 text-xs"
                        leadingIcon={<ArrowRight className="h-3.5 w-3.5" aria-hidden />}
                        onClick={() => {
                          const first = group.entries.find(
                            (entry) => entry.disposition === 'pending',
                          );
                          if (first) onNavigateToRecord(first.recordId);
                        }}
                      >
                        Resolver primer pendiente
                      </Button>
                    ) : null}
                    {group.pendingCount > 0 && onNavigateToFindings ? (
                      <Button
                        variant="ghost"
                        className="px-3 py-1.5 text-xs"
                        onClick={onNavigateToFindings}
                      >
                        Abrir en Hallazgos
                      </Button>
                    ) : null}
                    {task ? (
                      <Button variant="ghost" className="px-3 py-1.5 text-xs" onClick={onOpenTasks}>
                        Ver tarea relacionada
                      </Button>
                    ) : null}
                  </div>
                ) : null}
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-left text-xs">
                    <thead className="text-content-subtle">
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
                        const accepted = acceptedSources.find(
                          (item) => item.exogenousRecordId === entry.recordId,
                        );
                        const isPending = entry.disposition === 'pending';
                        return (
                          <tr
                            key={entry.recordId}
                            className={`border-t border-overlay/5 text-content ${
                              onNavigateToRecord ? 'cursor-pointer hover:bg-overlay/[0.03]' : ''
                            } ${isPending ? 'bg-amber-400/[0.03]' : ''}`}
                            onClick={
                              onNavigateToRecord
                                ? () => onNavigateToRecord(entry.recordId)
                                : undefined
                            }
                            title={
                              onNavigateToRecord ? 'Abrir este registro en Registros' : undefined
                            }
                          >
                            <td className="px-2 py-2">
                              {record?.source.sheet} · {record?.source.row}
                              <span className="block text-content-subtle">
                                {record?.conceptLabel ?? 'Sin detalle'}
                              </span>
                            </td>
                            <td className="px-2 py-2">
                              {CATEGORY_LABEL[entry.effectiveClassification.category]}
                              <span className="block text-content-subtle">
                                {RESOLUTION_LABEL[entry.resolutionStatus]}
                              </span>
                            </td>
                            <td className="px-2 py-2">
                              {DISPOSITION_LABEL[entry.disposition]}
                              {accepted ? (
                                <Badge
                                  tone={
                                    accepted.status === 'contradicted_by_document'
                                      ? 'rose'
                                      : accepted.documentId
                                        ? 'emerald'
                                        : 'amber'
                                  }
                                >
                                  {ACCEPTED_SOURCE_STATUS_PRESENTATION[accepted.status].label}
                                </Badge>
                              ) : null}
                              <span className="block max-w-72 text-content-subtle">
                                {entry.reason}
                              </span>
                            </td>
                            <td className="px-2 py-2">
                              {relations.length
                                ? relations
                                    .map((relation) => RELATION_LABEL[relation.type])
                                    .join(', ')
                                : '—'}
                            </td>
                            <td className="px-2 py-2 text-right">
                              {formatCurrencyCOP(entry.value)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </details>
          );
        })}
      </div>
      <p className="text-xs text-content-subtle">
        Matriz {analysis.matrix.ruleVersion} · {formatNumber(analysis.relationships.length)}{' '}
        relaciones trazables · cálculo completamente local.
      </p>
    </div>
  );
}

function QualityCard({ label, score, detail }: { label: string; score: number; detail: string }) {
  return (
    <div className="rounded-xl border border-overlay/8 p-4">
      <span className="text-xs text-content-subtle">{label}</span>
      <p className="mt-1 text-2xl font-semibold text-content-strong">{score}/100</p>
      <p className="mt-2 text-xs text-content-subtle">{detail}</p>
    </div>
  );
}

function InvoiceMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-overlay/8 p-3">
      <dt className="text-xs text-content-subtle">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-content-strong">{formatCurrencyCOP(value)}</dd>
    </div>
  );
}

function Data({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-content-subtle">{label}</dt>
      <dd className="mt-1 text-content">{value}</dd>
    </div>
  );
}
