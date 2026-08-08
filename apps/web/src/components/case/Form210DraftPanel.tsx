'use client';

import { useState } from 'react';
import { Download, FileSpreadsheet, RotateCcw } from 'lucide-react';
import type { TaxResolutionDecision } from '@nexus-tax/domain';
import {
  FORM_210_RULESET_2025,
  buildForm210ExportBundle,
  serializeForm210ExportBundle,
  type Form210BoxStatus,
  type Form210Draft,
  type Form210Section,
} from '@nexus-tax/form-210';
import { Badge, Button, EmptyState, GlassPanel, formatCurrencyCOP } from '@nexus-tax/ui';
import { downloadTextFile } from '@/lib/download';
import {
  rebuildForm210Draft,
  revertTaxResolutionDecision,
  saveTaxResolutionDecision,
} from '@/lib/repository';

const SECTION: Record<Form210Section, string> = {
  patrimony: 'Patrimonio',
  employment_income: 'Rentas de trabajo',
  capital_income: 'Rentas de capital',
  non_labor_income: 'Rentas no laborales',
  pensions: 'Pensiones',
  dividends: 'Dividendos',
  occasional_gains: 'Ganancias ocasionales',
  private_settlement: 'Liquidación privada preliminar',
};
const STATUS: Record<Form210BoxStatus, string> = {
  no_data: 'Sin datos',
  suggested: 'Sugerida',
  incomplete: 'Incompleta',
  requires_decision: 'Requiere decisión',
  confirmed: 'Confirmada',
  calculated: 'Calculada',
  contradicted: 'Contradicha',
  not_applicable: 'No aplica',
};

export function Form210DraftPanel({
  caseId,
  alias,
  draft,
  decisions,
  focusBoxNumber,
}: {
  caseId: string;
  alias: string;
  draft?: Form210Draft;
  decisions: readonly TaxResolutionDecision[];
  focusBoxNumber?: number | null;
}) {
  const [editing, setEditing] = useState<number | null>(focusBoxNumber ?? null);
  const [value, setValue] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  if (!draft)
    return (
      <EmptyState
        icon={<FileSpreadsheet className="h-8 w-8" />}
        title="Borrador aún no generado"
        description="Genera la hoja de trabajo local a partir de las fuentes revisadas."
        action={<Button onClick={() => void rebuildForm210Draft(caseId)}>Generar borrador</Button>}
      />
    );
  const currentDraft = draft;
  const sections = [...new Set(draft.boxes.map((box) => box.section))];
  async function adjust(number: number) {
    const parsed = Number(value.replace(/[^0-9.-]/g, ''));
    if (!Number.isFinite(parsed) || parsed < 0) {
      setError('Ingresa un valor numérico igual o mayor que cero.');
      return;
    }
    const box = currentDraft.boxes.find((item) => item.number === number)!;
    setError(null);
    try {
      await saveTaxResolutionDecision(caseId, {
        type: 'adjust_form_box',
        objectType: 'form_box',
        objectId: String(number),
        previousState: box.status,
        finalState: 'confirmed',
        selectedAlternative: 'Ajustar casilla con fuente manual',
        originalValue: box.confirmedValue ?? box.suggestedValue,
        finalValue: parsed,
        proposedBox: number,
        reason,
        evidence: [{ kind: 'manual_note', referenceId: null, description: reason }],
      });
      setEditing(null);
      setValue('');
      setReason('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo guardar el ajuste.');
    }
  }
  return (
    <div className="space-y-5">
      <GlassPanel className="overflow-hidden">
        <div className="bg-gradient-to-r from-accent-blue/15 via-accent-cyan/10 to-transparent p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-tone-cyan">
                Año gravable 2025 · presentación 2026
              </p>
              <h2 className="mt-1 text-xl font-semibold text-content-strong">
                Borrador Formulario 210
              </h2>
              <p className="mt-2 font-medium text-tone-amber">{draft.notice}</p>
              <p className="mt-1 max-w-3xl text-sm text-content-muted">
                Hoja de trabajo explicable. No firma, presenta ni envía información a la DIAN.
              </p>
            </div>
            <Button
              variant="secondary"
              leadingIcon={<Download className="h-4 w-4" aria-hidden />}
              onClick={() =>
                downloadTextFile(
                  `${alias.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-borrador-210.json`,
                  serializeForm210ExportBundle(buildForm210ExportBundle(draft)),
                )
              }
            >
              Exportar bundle
            </Button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge tone="emerald">Confirmadas {draft.status.confirmedBoxes}</Badge>
            <Badge tone="cyan">Calculadas {draft.status.calculatedBoxes}</Badge>
            <Badge tone="amber">Pendientes {draft.status.pendingBoxes}</Badge>
            <Badge tone={draft.status.blockers ? 'rose' : 'neutral'}>
              Bloqueos {draft.status.blockers}
            </Badge>
          </div>
        </div>
      </GlassPanel>
      {draft.findings.length ? (
        <GlassPanel className="p-5">
          <h3 className="font-semibold text-content-strong">Validaciones del borrador</h3>
          <ul className="mt-3 space-y-2">
            {draft.findings.map((finding) => (
              <li
                key={finding.id}
                className="rounded-lg border border-overlay/8 p-3 text-sm text-content-muted"
              >
                <Badge
                  tone={
                    finding.severity === 'error'
                      ? 'rose'
                      : finding.severity === 'warning'
                        ? 'amber'
                        : 'cyan'
                  }
                >
                  {finding.severity === 'error'
                    ? 'Error'
                    : finding.severity === 'warning'
                      ? 'Advertencia'
                      : 'Información'}
                </Badge>
                <span className="ml-2">{finding.message}</span>
              </li>
            ))}
          </ul>
        </GlassPanel>
      ) : null}
      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-tone-rose"
        >
          {error}
        </p>
      ) : null}
      {sections.map((section) => (
        <section key={section} aria-labelledby={`form210-${section}`}>
          <h3 id={`form210-${section}`} className="mb-3 text-lg font-semibold text-content-strong">
            {SECTION[section]}
          </h3>
          <div className="space-y-3">
            {draft.boxes
              .filter((box) => box.section === section)
              .map((box) => {
                const shown = box.confirmedValue ?? box.suggestedValue;
                const resolution = decisions.find((item) => item.id === box.resolutionId);
                return (
                  <GlassPanel
                    key={box.number}
                    id={`form210-box-${box.number}`}
                    className={`p-4 ${focusBoxNumber === box.number ? 'ring-2 ring-accent-cyan/50' : ''}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex gap-3">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-accent-blue/10 font-semibold text-tone-blue">
                          {box.number}
                        </span>
                        <div>
                          <h4 className="font-medium text-content-strong">{box.name}</h4>
                          <p className="mt-1 text-xs text-content-subtle">
                            {box.formula
                              ? `Fórmula: ${box.formula}`
                              : 'Valor derivado de fuentes revisadas'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold text-content-strong">
                          {shown === null ? '—' : formatCurrencyCOP(shown)}
                        </p>
                        <Badge
                          tone={
                            box.status === 'confirmed' || box.status === 'calculated'
                              ? 'emerald'
                              : box.status === 'contradicted'
                                ? 'rose'
                                : box.status === 'incomplete'
                                  ? 'amber'
                                  : 'neutral'
                          }
                        >
                          {STATUS[box.status]}
                        </Badge>
                      </div>
                    </div>
                    <details className="mt-3 rounded-lg border border-overlay/8 p-3">
                      <summary className="cursor-pointer text-sm text-tone-cyan">
                        Ver procedencia ({box.sources.length})
                      </summary>
                      {box.sources.length ? (
                        <ul className="mt-3 space-y-2">
                          {box.sources.map((source) => (
                            <li key={source.sourceId} className="text-xs text-content-muted">
                              <span className="font-medium text-content">{source.label}</span> ·{' '}
                              {formatCurrencyCOP(source.value)}
                              <span className="block text-content-subtle">{source.evidence}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 text-xs text-content-subtle">
                          Sin una fuente aceptada para esta casilla.
                        </p>
                      )}
                    </details>
                    {editing === box.number ? (
                      <div className="mt-3 grid gap-3 rounded-xl border border-accent-cyan/20 bg-accent-cyan/5 p-3 sm:grid-cols-2">
                        <label className="text-xs text-content-muted">
                          Valor ajustado
                          <input
                            inputMode="decimal"
                            value={value}
                            onChange={(event) => setValue(event.target.value)}
                            className="mt-1 w-full rounded-lg border border-overlay/12 bg-surface-raised px-3 py-2 text-sm text-content-strong"
                          />
                        </label>
                        <label className="text-xs text-content-muted">
                          Motivo obligatorio
                          <input
                            value={reason}
                            onChange={(event) => setReason(event.target.value)}
                            className="mt-1 w-full rounded-lg border border-overlay/12 bg-surface-raised px-3 py-2 text-sm text-content-strong"
                          />
                        </label>
                        <div className="flex gap-2 sm:col-span-2">
                          <Button onClick={() => void adjust(box.number)}>Confirmar ajuste</Button>
                          <Button variant="ghost" onClick={() => setEditing(null)}>
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setEditing(box.number);
                            setValue(String(shown ?? ''));
                          }}
                        >
                          Crear ajuste trazable
                        </Button>
                        {resolution?.reversible ? (
                          <Button
                            variant="ghost"
                            leadingIcon={<RotateCcw className="h-4 w-4" aria-hidden />}
                            onClick={() =>
                              void revertTaxResolutionDecision(
                                caseId,
                                resolution.id,
                                `Restaurar cálculo de la casilla ${box.number}.`,
                              )
                            }
                          >
                            Restaurar cálculo
                          </Button>
                        ) : null}
                      </div>
                    )}
                  </GlassPanel>
                );
              })}
          </div>
        </section>
      ))}
      <p className="text-xs text-content-subtle">
        Reglas {draft.ruleVersion} · verificadas {FORM_210_RULESET_2025.verifiedAt} · todo permanece
        en este navegador.
      </p>
    </div>
  );
}
