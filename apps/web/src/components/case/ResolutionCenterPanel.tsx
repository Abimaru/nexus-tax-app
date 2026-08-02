'use client';

import { useMemo, useState } from 'react';
import { ArrowRight, History, ShieldCheck } from 'lucide-react';
import type {
  CaseTask,
  TaxResolutionDecision,
  TaxResolutionDecisionType,
  TaxResolutionObjectType,
  WorkflowStageId,
  WorkflowViewId,
} from '@nexus-tax/domain';
import { Badge, Button, EmptyState, GlassPanel } from '@nexus-tax/ui';
import { revertTaxResolutionDecision, saveTaxResolutionDecision } from '@/lib/repository';
import { compareCaseTasks } from '@/lib/caseTaskPriority';

const TASK_SOURCE: Record<CaseTask['source'], string> = {
  document: 'Documento',
  candidate: 'Candidato documental',
  requirement: 'Requisito',
  finding: 'Hallazgo',
  matrix: 'Matriz',
  filing: 'Declaración',
  ocr: 'OCR local',
  profile: 'Perfil documental',
  system: 'Sistema',
};

function target(task: CaseTask): { objectType: TaxResolutionObjectType; objectId: string } | null {
  if (task.formBoxNumber) return { objectType: 'form_box', objectId: String(task.formBoxNumber) };
  if (task.matrixGroupId) return { objectType: 'matrix_group', objectId: task.matrixGroupId };
  if (task.reconciliationId)
    return { objectType: 'reconciliation', objectId: task.reconciliationId };
  if (task.candidateId) return { objectType: 'candidate', objectId: task.candidateId };
  if (task.requirementId) return { objectType: 'requirement', objectId: task.requirementId };
  return null;
}

function alternatives(task: CaseTask): { type: TaxResolutionDecisionType; label: string }[] {
  if (task.type === 'resolve_matrix_group')
    return [
      { type: 'accept_rounding_difference', label: 'Aceptar diferencia por redondeo' },
      { type: 'declare_not_comparable', label: 'Declarar no comparable' },
      { type: 'leave_pending', label: 'Dejar pendiente' },
    ];
  if (task.type === 'confirm_candidate')
    return [
      { type: 'accept_document_value', label: 'Aceptar valor documental' },
      { type: 'reject_suggestion', label: 'Rechazar sugerencia' },
      { type: 'leave_pending', label: 'Dejar pendiente' },
    ];
  if (task.type === 'cover_requirement' || task.type === 'upload_document')
    return [
      { type: 'request_document', label: 'Solicitar documento' },
      { type: 'mark_document_unavailable', label: 'Indicar documento no emitido' },
      { type: 'leave_pending', label: 'Dejar pendiente' },
    ];
  if (task.type === 'reconcile_value')
    return [
      { type: 'confirm_reconciliation', label: 'Confirmar conciliación' },
      { type: 'reject_suggestion', label: 'Rechazar sugerencia' },
      { type: 'declare_not_comparable', label: 'Declarar no comparable' },
    ];
  return [
    { type: 'confirm_classification', label: 'Confirmar propuesta' },
    { type: 'mark_informational', label: 'Marcar informativo' },
    { type: 'leave_pending', label: 'Dejar pendiente' },
  ];
}

export function ResolutionCenterPanel({
  caseId,
  tasks,
  decisions,
  onNavigate,
}: {
  caseId: string;
  tasks: readonly CaseTask[];
  decisions: readonly TaxResolutionDecision[];
  onNavigate: (stage: WorkflowStageId, view: WorkflowViewId, taskId: string) => void;
}) {
  const active = useMemo(
    () =>
      tasks
        .filter((task) => ['pending', 'in_progress', 'blocked'].includes(task.status))
        .sort(compareCaseTasks),
    [tasks],
  );
  const [selected, setSelected] = useState<Record<string, TaxResolutionDecisionType>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const replacedDecisionIds = useMemo(
    () =>
      new Set(
        decisions
          .map((decision) => decision.replacesDecisionId)
          .filter((id): id is string => Boolean(id)),
      ),
    [decisions],
  );

  async function decide(task: CaseTask) {
    const affected = target(task);
    const choice = selected[task.id];
    if (!affected || !choice) return;
    setSaving(task.id);
    setError(null);
    try {
      const option = alternatives(task).find((item) => item.type === choice)!;
      await saveTaxResolutionDecision(caseId, {
        type: choice,
        ...affected,
        previousState: task.status,
        finalState: choice === 'leave_pending' ? 'pending' : 'resolved',
        selectedAlternative: option.label,
        reason: notes[task.id] ?? '',
        proposedBox: task.formBoxNumber ?? null,
        evidence: task.evidence.map((description) => ({
          kind: 'rule' as const,
          referenceId: task.ruleId,
          description,
        })),
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo registrar la decisión.');
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="space-y-5">
      <GlassPanel className="overflow-hidden">
        <div className="bg-gradient-to-r from-accent-violet/15 via-accent-blue/10 to-transparent p-6">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent-violet/15 text-tone-violet">
              <ShieldCheck className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h2 className="text-xl font-semibold text-content-strong">Centro de resolución</h2>
              <p className="mt-1 text-sm text-content-muted">
                Decide pendientes desde un solo lugar. Cada cambio conserva motivo, evidencia e
                historial reversible.
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge tone="amber">Bloqueos {active.filter((task) => task.blocking).length}</Badge>
            <Badge tone="cyan">Abiertas {active.length}</Badge>
            <Badge tone="violet">Decisiones {decisions.length}</Badge>
          </div>
        </div>
      </GlassPanel>

      {error ? (
        <p
          role="alert"
          className="rounded-xl border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-tone-rose"
        >
          {error}
        </p>
      ) : null}
      {!active.length ? (
        <EmptyState
          icon={<ShieldCheck className="h-8 w-8" />}
          title="Sin decisiones pendientes"
          description="Las decisiones anteriores siguen disponibles en el historial local."
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {active.map((task) => {
            const options = alternatives(task);
            const affected = target(task);
            return (
              <GlassPanel key={task.id} className="flex flex-col p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-tone-cyan">
                      {TASK_SOURCE[task.source]}
                    </p>
                    <h3 className="mt-1 font-semibold text-content-strong">{task.title}</h3>
                  </div>
                  <Badge tone={task.blocking ? 'amber' : 'neutral'}>
                    {task.blocking ? 'Bloquea avance' : 'No bloqueante'}
                  </Badge>
                </div>
                <p className="mt-3 text-sm text-content-muted">{task.explanation}</p>
                <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                  <div>
                    <dt className="text-content-subtle">Impacto</dt>
                    <dd className="text-content">
                      {task.blocking
                        ? 'Impide cerrar la revisión del borrador.'
                        : 'Reduce la completitud o confianza.'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-content-subtle">Valor o evidencia</dt>
                    <dd className="text-content">
                      {task.evidence[0] ?? 'Sin valor cuantitativo asociado'}
                    </dd>
                  </div>
                </dl>
                {affected ? (
                  <div className="mt-4 space-y-3 rounded-xl border border-overlay/8 bg-overlay/[0.02] p-3">
                    <label className="block text-xs text-content-muted">
                      Decisión
                      <select
                        value={selected[task.id] ?? ''}
                        onChange={(event) =>
                          setSelected((current) => ({
                            ...current,
                            [task.id]: event.target.value as TaxResolutionDecisionType,
                          }))
                        }
                        className="mt-1 w-full rounded-lg border border-overlay/12 bg-surface-raised px-3 py-2 text-sm text-content-strong"
                      >
                        <option value="">Selecciona una alternativa</option>
                        {options.map((option) => (
                          <option key={option.type} value={option.type}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block text-xs text-content-muted">
                      Motivo obligatorio
                      <textarea
                        value={notes[task.id] ?? ''}
                        onChange={(event) =>
                          setNotes((current) => ({ ...current, [task.id]: event.target.value }))
                        }
                        className="mt-1 min-h-20 w-full rounded-lg border border-overlay/12 bg-surface-raised p-2 text-sm text-content-strong"
                      />
                    </label>
                  </div>
                ) : null}
                <div className="mt-auto flex flex-wrap gap-2 pt-4">
                  {affected ? (
                    <Button
                      disabled={!selected[task.id] || saving === task.id}
                      onClick={() => void decide(task)}
                    >
                      Registrar decisión
                    </Button>
                  ) : null}
                  <Button
                    variant="secondary"
                    leadingIcon={<ArrowRight className="h-4 w-4" aria-hidden />}
                    onClick={() => onNavigate(task.stage, task.view, task.id)}
                  >
                    Abrir evidencia
                  </Button>
                </div>
              </GlassPanel>
            );
          })}
        </div>
      )}

      {decisions.length ? (
        <GlassPanel className="p-5">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-tone-violet" aria-hidden />
            <h3 className="font-semibold text-content-strong">Historial de decisiones</h3>
          </div>
          <ol className="mt-3 space-y-3">
            {[...decisions]
              .reverse()
              .slice(0, 20)
              .map((decision) => (
                <li
                  key={decision.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-overlay/8 p-3"
                >
                  <div>
                    <p className="text-sm text-content-strong">{decision.selectedAlternative}</p>
                    <p className="text-xs text-content-subtle">
                      {decision.reason} · {new Date(decision.decidedAt).toLocaleString('es-CO')}
                    </p>
                  </div>
                  {decision.reversible && !replacedDecisionIds.has(decision.id) ? (
                    <Button
                      variant="ghost"
                      className="text-xs"
                      onClick={() =>
                        void revertTaxResolutionDecision(
                          caseId,
                          decision.id,
                          'Reversión solicitada desde el centro de resolución.',
                        )
                      }
                    >
                      Revertir
                    </Button>
                  ) : decision.type === 'revert_decision' ||
                    decision.type === 'restore_automatic_value' ? (
                    <Badge tone="neutral">Reversión</Badge>
                  ) : (
                    <Badge tone="neutral">Reemplazada</Badge>
                  )}
                </li>
              ))}
          </ol>
        </GlassPanel>
      ) : null}
    </div>
  );
}
