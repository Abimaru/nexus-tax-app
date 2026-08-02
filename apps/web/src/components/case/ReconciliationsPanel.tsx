'use client';

import { useState } from 'react';
import { ChevronDown, GitCompareArrows, Wrench } from 'lucide-react';
import type {
  AcceptedExogenousValue,
  DocumentFact,
  PreliminaryReconciliation,
  PreliminaryReconciliationStatus,
  ProcessingResult,
  ReconciliationSuggestion,
} from '@nexus-tax/domain';
import { Badge, Button, EmptyState, GlassPanel, formatCurrencyCOP } from '@nexus-tax/ui';
import { savePreliminaryReconciliation, saveTaxResolutionDecision } from '@/lib/repository';
import { evaluateReconciliationDifference } from '@nexus-tax/exogenous-parser';
import { PRELIMINARY_RECONCILIATION_PRESENTATION } from '@/lib/presentationCatalogs';
import { AcceptedSourceAction } from './AcceptedSourceAction';

/** Estados finales que el analista puede elegir al resolver manualmente. */
const MANUAL_STATUSES: readonly PreliminaryReconciliationStatus[] = [
  'reconciled',
  'minor_difference',
  'relevant_difference',
  'not_comparable',
  'other_product',
  'exogenous_data_questioned',
];

export function ReconciliationsPanel({
  caseId,
  result,
  facts,
  suggestions,
  reconciliations,
  acceptedSources,
}: {
  caseId: string;
  result?: ProcessingResult;
  facts: DocumentFact[];
  suggestions: ReconciliationSuggestion[];
  reconciliations: PreliminaryReconciliation[];
  acceptedSources: AcceptedExogenousValue[];
}) {
  const [explanation, setExplanation] = useState(
    'Coincidencia revisada por entidad, categoría, concepto y valor.',
  );
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [manualForm, setManualForm] = useState<{
    suggestionId: string | null;
    status: PreliminaryReconciliationStatus;
    reason: string;
  }>({ suggestionId: null, status: 'reconciled', reason: '' });
  const existingSuggestionIds = new Set(
    reconciliations.flatMap((item) =>
      item.factIds.flatMap((factId) =>
        item.exogenousRecordIds.map((recordId) => `${factId}:${recordId}`),
      ),
    ),
  );
  // Además del par exacto (fact,record), ocultamos cualquier sugerencia cuyo
  // fact o record ya haya sido usado en OTRA conciliación o aceptado como
  // fuente provisional. Esto evita ver 4 sugerencias cuando 2 documentos y 2
  // registros ya están cerrados por otras decisiones.
  const consumedFactIds = new Set(reconciliations.flatMap((item) => item.factIds));
  const consumedRecordIds = new Set([
    ...reconciliations.flatMap((item) => item.exogenousRecordIds),
    ...acceptedSources.map((source) => source.exogenousRecordId),
  ]);
  const pendingSuggestions = suggestions
    .filter(
      (suggestion) =>
        !existingSuggestionIds.has(`${suggestion.factId}:${suggestion.exogenousRecordId}`) &&
        !consumedFactIds.has(suggestion.factId) &&
        !consumedRecordIds.has(suggestion.exogenousRecordId) &&
        !dismissed.includes(suggestion.id),
    )
    .slice(0, 20);
  async function confirm(suggestion: ReconciliationSuggestion) {
    const policy = evaluateReconciliationDifference({
      leftValue: suggestion.documentaryValue,
      rightValue: suggestion.exogenousValue,
      source: 'document',
      roundingUnit: 5,
      groupNature: 'other',
    });
    const status =
      policy.status === 'reconciled'
        ? 'reconciled'
        : policy.status === 'relevant_difference'
          ? 'relevant_difference'
          : 'minor_difference';
    await savePreliminaryReconciliation(caseId, {
      factIds: [suggestion.factId],
      exogenousRecordIds: [suggestion.exogenousRecordId],
      status,
      exogenousValue: suggestion.exogenousValue,
      documentaryValue: suggestion.documentaryValue,
      productId: facts.find((fact) => fact.id === suggestion.factId)?.productId ?? null,
      explanation,
      analystDecision: 'Asociación confirmada manualmente.',
      suggestionScore: suggestion.score,
      suggestionSignals: suggestion.signals,
      confirmedByHuman: true,
    });
  }
  /**
   * Guarda una conciliación con el estado que el analista elige explícitamente.
   * Habilita cerrar sugerencias que la heurística no considera "seguras" pero
   * que la revisión humana justifica (o al revés: dejar constancia de que la
   * diferencia es relevante o de que la exógena está en duda).
   */
  async function resolveManually(suggestion: ReconciliationSuggestion) {
    if (manualForm.suggestionId !== suggestion.id) return;
    if (!manualForm.reason.trim()) return;
    await savePreliminaryReconciliation(caseId, {
      factIds: [suggestion.factId],
      exogenousRecordIds: [suggestion.exogenousRecordId],
      status: manualForm.status,
      exogenousValue: suggestion.exogenousValue,
      documentaryValue: suggestion.documentaryValue,
      productId: facts.find((fact) => fact.id === suggestion.factId)?.productId ?? null,
      explanation,
      analystDecision: manualForm.reason.trim(),
      suggestionScore: suggestion.score,
      suggestionSignals: suggestion.signals,
      confirmedByHuman: true,
    });
    setManualForm({ suggestionId: null, status: 'reconciled', reason: '' });
  }

  async function reject(suggestion: ReconciliationSuggestion) {
    await saveTaxResolutionDecision(caseId, {
      type: 'reject_suggestion',
      objectType: 'reconciliation',
      objectId: suggestion.id,
      previousState: 'suggested',
      finalState: 'rejected',
      selectedAlternative: 'Rechazar sugerencia',
      reason: explanation,
      originalValue: suggestion.exogenousValue,
      finalValue: suggestion.documentaryValue,
      evidence: suggestion.signals.map((description) => ({
        kind: 'rule' as const,
        referenceId: suggestion.id,
        description,
      })),
    });
    setDismissed((current) => [...current, suggestion.id]);
  }
  return (
    <div className="space-y-5">
      <GlassPanel className="p-5">
        <h2 className="text-lg font-semibold text-content-strong">
          Conciliación preliminar contra exógena
        </h2>
        <p className="mt-1 text-sm text-content-muted">
          Las coincidencias son sugerencias deterministas. Igualdad de valor nunca confirma por sí
          sola una conciliación.
        </p>
        <div className="mt-3">
          <AcceptedSourceAction
            caseId={caseId}
            result={result}
            acceptedSources={acceptedSources}
            compact
          />
        </div>
        <label className="mt-4 block text-xs text-content-muted">
          Explicación del analista
          <textarea
            value={explanation}
            onChange={(event) => setExplanation(event.target.value)}
            className="mt-1 min-h-16 w-full rounded-lg border border-overlay/12 bg-overlay/5 p-2 text-sm text-content-strong"
          />
        </label>
      </GlassPanel>
      {!result || !facts.length ? (
        <EmptyState
          icon={<GitCompareArrows className="h-8 w-8" />}
          title="Faltan fuentes para conciliar"
          description="Procesa una exógena y registra al menos un hecho documental."
        />
      ) : (
        <>
          <section>
            <h3 className="mb-3 font-medium text-content-strong">Sugerencias pendientes</h3>
            <div className="space-y-3">
              {pendingSuggestions.map((suggestion) => {
                const fact = facts.find((item) => item.id === suggestion.factId);
                const record = result.normalizedRecords.find(
                  (item) => item.id === suggestion.exogenousRecordId,
                );
                const safeToConfirm =
                  suggestion.score >= 75 &&
                  suggestion.difference <= 5 &&
                  fact?.nature === record?.nature &&
                  fact?.category === record?.category;
                return (
                  <GlassPanel key={suggestion.id} className="p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h4 className="font-medium text-content-strong">
                          {fact?.originalConcept} ↔ {record?.conceptLabel}
                        </h4>
                        <p className="mt-1 text-xs text-content-muted">
                          {suggestion.signals.join(' · ')} · fila {record?.source.row}
                        </p>
                      </div>
                      <Badge tone={suggestion.score >= 75 ? 'emerald' : 'amber'}>
                        {suggestion.score}/100
                      </Badge>
                    </div>
                    <dl className="mt-3 grid grid-cols-3 gap-3 text-xs">
                      <Value label="Exógena" value={formatCurrencyCOP(suggestion.exogenousValue)} />
                      <Value
                        label="Documento"
                        value={formatCurrencyCOP(suggestion.documentaryValue)}
                      />
                      <Value label="Diferencia" value={formatCurrencyCOP(suggestion.difference)} />
                    </dl>
                    {!safeToConfirm ? (
                      <p className="mt-3 text-xs text-tone-amber">
                        La confianza, diferencia o naturaleza no permite recomendar una confirmación
                        directa. Usa <span className="font-medium">Resolver manualmente</span> para
                        registrar tu decisión con justificación.
                      </p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap justify-end gap-2">
                      <Button variant="ghost" onClick={() => void reject(suggestion)}>
                        Rechazar sugerencia
                      </Button>
                      <Button
                        variant="ghost"
                        leadingIcon={<Wrench className="h-4 w-4" aria-hidden />}
                        onClick={() =>
                          setManualForm((current) =>
                            current.suggestionId === suggestion.id
                              ? { suggestionId: null, status: 'reconciled', reason: '' }
                              : { suggestionId: suggestion.id, status: 'reconciled', reason: '' },
                          )
                        }
                        aria-expanded={manualForm.suggestionId === suggestion.id}
                      >
                        Resolver manualmente
                        <ChevronDown
                          className={`ml-1 h-3.5 w-3.5 transition-transform motion-reduce:transition-none ${
                            manualForm.suggestionId === suggestion.id ? 'rotate-180' : ''
                          }`}
                          aria-hidden
                        />
                      </Button>
                      {safeToConfirm ? (
                        <Button variant="secondary" onClick={() => void confirm(suggestion)}>
                          Confirmar asociación
                        </Button>
                      ) : null}
                    </div>

                    {manualForm.suggestionId === suggestion.id ? (
                      <div className="mt-3 rounded-xl border border-overlay/10 bg-overlay/[0.02] p-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-content-subtle">
                          Registrar decisión del analista
                        </p>
                        <div className="mt-2 grid gap-2 md:grid-cols-[220px_1fr]">
                          <label className="block text-xs text-content-muted">
                            Estado final
                            <select
                              value={manualForm.status}
                              onChange={(event) =>
                                setManualForm((current) => ({
                                  ...current,
                                  status: event.target.value as PreliminaryReconciliationStatus,
                                }))
                              }
                              className="mt-1 min-h-10 w-full rounded-lg border border-overlay/12 bg-overlay/5 px-2 py-1.5 text-sm text-content-strong"
                            >
                              {MANUAL_STATUSES.map((status) => (
                                <option
                                  key={status}
                                  value={status}
                                  className="bg-surface-raised"
                                >
                                  {PRELIMINARY_RECONCILIATION_PRESENTATION[status].label}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="block text-xs text-content-muted">
                            Justificación (obligatoria)
                            <textarea
                              value={manualForm.reason}
                              onChange={(event) =>
                                setManualForm((current) => ({
                                  ...current,
                                  reason: event.target.value,
                                }))
                              }
                              placeholder="Explica por qué esta asociación queda en el estado seleccionado (p. ej. la diferencia se explica por una retención adicional del banco)."
                              className="mt-1 min-h-16 w-full rounded-lg border border-overlay/12 bg-overlay/5 p-2 text-sm text-content-strong"
                            />
                          </label>
                        </div>
                        <p className="mt-2 text-xs text-content-subtle">
                          {PRELIMINARY_RECONCILIATION_PRESENTATION[manualForm.status].description}
                        </p>
                        <div className="mt-3 flex justify-end">
                          <Button
                            variant="primary"
                            disabled={!manualForm.reason.trim()}
                            onClick={() => void resolveManually(suggestion)}
                          >
                            Guardar decisión
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </GlassPanel>
                );
              })}
              {pendingSuggestions.length === 0 ? (
                <p className="rounded-xl border border-overlay/8 p-4 text-sm text-content-muted">
                  No hay nuevas sugerencias con evidencia suficiente.
                </p>
              ) : null}
            </div>
          </section>
          <section>
            <h3 className="mb-3 font-medium text-content-strong">Decisiones registradas</h3>
            <div className="space-y-2">
              {reconciliations.map((item) => (
                <GlassPanel
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-3 p-4"
                >
                  <div>
                    <p className="text-sm text-content-strong">{item.explanation}</p>
                    <p className="text-xs text-content-subtle">
                      {item.suggestionSignals.join(' · ')} · decisión humana:{' '}
                      {item.confirmedByHuman ? 'sí' : 'no'}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge
                      tone={
                        item.status === 'reconciled'
                          ? 'emerald'
                          : item.status === 'relevant_difference'
                            ? 'rose'
                            : 'amber'
                      }
                    >
                      {PRELIMINARY_RECONCILIATION_PRESENTATION[item.status].label}
                    </Badge>
                    <p className="mt-1 text-xs text-content-muted">
                      Diferencia {formatCurrencyCOP(item.difference)}
                    </p>
                  </div>
                </GlassPanel>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
function Value({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-content-subtle">{label}</dt>
      <dd className="text-content-strong">{value}</dd>
    </div>
  );
}
