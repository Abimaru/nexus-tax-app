'use client';

import { useState } from 'react';
import { GitCompareArrows } from 'lucide-react';
import type {
  DocumentFact,
  PreliminaryReconciliation,
  ProcessingResult,
  ReconciliationSuggestion,
} from '@nexus-tax/domain';
import { Badge, Button, EmptyState, GlassPanel, formatCurrencyCOP } from '@nexus-tax/ui';
import { savePreliminaryReconciliation } from '@/lib/repository';

export function ReconciliationsPanel({
  caseId,
  result,
  facts,
  suggestions,
  reconciliations,
}: {
  caseId: string;
  result?: ProcessingResult;
  facts: DocumentFact[];
  suggestions: ReconciliationSuggestion[];
  reconciliations: PreliminaryReconciliation[];
}) {
  const [explanation, setExplanation] = useState(
    'Coincidencia revisada por entidad, categoría, concepto y valor.',
  );
  const existingSuggestionIds = new Set(
    reconciliations.flatMap((item) =>
      item.factIds.flatMap((factId) =>
        item.exogenousRecordIds.map((recordId) => `${factId}:${recordId}`),
      ),
    ),
  );
  const pendingSuggestions = suggestions
    .filter(
      (suggestion) =>
        !existingSuggestionIds.has(`${suggestion.factId}:${suggestion.exogenousRecordId}`),
    )
    .slice(0, 20);
  async function confirm(suggestion: ReconciliationSuggestion) {
    const status =
      suggestion.difference === 0
        ? 'reconciled'
        : suggestion.difference <= 1
          ? 'minor_difference'
          : 'relevant_difference';
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
                    <div className="mt-3 flex justify-end">
                      <Button variant="secondary" onClick={() => void confirm(suggestion)}>
                        Confirmar asociación
                      </Button>
                    </div>
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
                      {item.status}
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
