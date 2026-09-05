import { AlertTriangle, CheckCircle2, ClipboardCheck } from 'lucide-react';
import type { CaseTask } from '@nexus-tax/domain';
import type { Form210Draft, Form210Section } from '@nexus-tax/form-210';
import { Badge, EmptyState, GlassPanel, formatCurrencyCOP } from '@nexus-tax/ui';

const SECTION_LABELS: Record<Form210Section, string> = {
  patrimony: 'Patrimonio',
  employment_income: 'Rentas de trabajo',
  capital_income: 'Rentas de capital',
  non_labor_income: 'Rentas no laborales',
  pensions: 'Pensiones',
  dividends: 'Dividendos',
  occasional_gains: 'Ganancias ocasionales',
  private_settlement: 'Liquidación preliminar',
  general_income_consolidation: 'Consolidación de la cédula general',
  tax_settlement: 'Liquidación del impuesto',
  informational: 'Información complementaria',
};

export function FinalReviewPanel({
  draft,
  tasks,
}: {
  draft?: Form210Draft;
  tasks: readonly CaseTask[];
}) {
  if (!draft) {
    return (
      <EmptyState
        icon={<ClipboardCheck className="h-8 w-8" />}
        title="Primero genera el borrador"
        description="La revisión final se habilita cuando existe una hoja de trabajo del Formulario 210."
      />
    );
  }
  const pendingTasks = tasks.filter(
    (task) => task.status === 'pending' || task.status === 'blocked',
  );
  const taskGroups = [
    {
      label: 'Bloqueantes',
      description: 'Impiden considerar estable el borrador.',
      tasks: pendingTasks.filter((task) => task.blocking),
      tone: 'rose' as const,
    },
    {
      label: 'Recomendados',
      description: 'Revisiones con una señal o una fuente que necesita decisión.',
      tasks: pendingTasks.filter((task) => !task.blocking && task.priority !== 'low'),
      tone: 'amber' as const,
    },
    {
      label: 'Informativos',
      description: 'Casillas sin señal; confirma cero o no aplica solo si corresponde.',
      tasks: pendingTasks.filter((task) => !task.blocking && task.priority === 'low'),
      tone: 'neutral' as const,
    },
  ];
  const sections = [...new Set(draft.boxes.map((box) => box.section))];
  const ready = draft.status.blockers === 0 && pendingTasks.every((task) => !task.blocking);

  return (
    <div className="space-y-5">
      <GlassPanel className="p-6">
        <div className="flex items-start gap-3">
          {ready ? (
            <CheckCircle2 className="mt-0.5 h-6 w-6 text-tone-emerald" aria-hidden />
          ) : (
            <AlertTriangle className="mt-0.5 h-6 w-6 text-tone-amber" aria-hidden />
          )}
          <div>
            <h2 className="text-xl font-semibold text-content-strong">
              Revisión final del expediente
            </h2>
            <p className="mt-1 text-sm text-content-muted">
              {ready
                ? 'No se detectan bloqueos automáticos. Realiza la validación humana antes de trasladar valores.'
                : 'Aún hay decisiones o soportes pendientes. La aplicación no marca el expediente como listo.'}
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge tone={ready ? 'emerald' : 'amber'}>
            {ready ? 'Listo para revisión humana' : 'Cierre pendiente'}
          </Badge>
          <Badge tone="neutral">{draft.status.blockers} bloqueos</Badge>
          <Badge tone="cyan">{pendingTasks.length} tareas abiertas</Badge>
        </div>
      </GlassPanel>

      <section>
        <h3 className="mb-3 text-lg font-semibold text-content-strong">Resumen por sección</h3>
        <div className="grid gap-3 md:grid-cols-2">
          {sections.map((section) => {
            const boxes = draft.boxes.filter((box) => box.section === section);
            const pending = boxes.filter((box) =>
              ['no_data', 'incomplete', 'requires_decision', 'requires_review', 'blocked'].includes(
                box.status,
              ),
            );
            const value = boxes.reduce(
              (sum, box) => sum + (box.confirmedValue ?? box.suggestedValue ?? 0),
              0,
            );
            return (
              <GlassPanel key={section} className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="font-medium text-content-strong">{SECTION_LABELS[section]}</h4>
                  <Badge tone={pending.length ? 'amber' : 'emerald'}>
                    {pending.length ? `${pending.length} por resolver` : 'Revisada'}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-content-muted">
                  Suma de casillas: {formatCurrencyCOP(value)}
                </p>
              </GlassPanel>
            );
          })}
        </div>
      </section>

      <GlassPanel className="p-5">
        <h3 className="font-semibold text-content-strong">¿Qué me falta?</h3>
        {pendingTasks.length ? (
          <div className="mt-3 space-y-3">
            {taskGroups.map((group) => (
              <details
                key={group.label}
                open={group.label === 'Bloqueantes' && group.tasks.length > 0}
                className="rounded-xl border border-overlay/8 bg-overlay/[0.02]"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/50">
                  <span>
                    <span className="font-medium text-content-strong">{group.label}</span>
                    <span className="ml-2 text-xs text-content-subtle">{group.description}</span>
                  </span>
                  <Badge tone={group.tone}>{group.tasks.length}</Badge>
                </summary>
                <ul className="space-y-2 border-t border-overlay/8 p-3">
                  {group.tasks.length ? (
                    group.tasks.map((task) => (
                      <li key={task.id} className="rounded-lg border border-overlay/8 p-3 text-sm">
                        <p className="font-medium text-content-strong">{task.title}</p>
                        <p className="mt-1 text-content-muted">{task.recommendedAction}</p>
                        {task.destinationLabel ? (
                          <p className="mt-1 text-xs text-tone-cyan">
                            Destino: {task.destinationLabel}
                          </p>
                        ) : null}
                      </li>
                    ))
                  ) : (
                    <li className="text-sm text-content-muted">Sin tareas en este grupo.</li>
                  )}
                </ul>
              </details>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-content-muted">
            No hay tareas abiertas derivadas por el motor local.
          </p>
        )}
        <p className="mt-4 text-xs text-content-subtle">
          Comparación con declaración anterior: no disponible hasta adjuntar o registrar esa fuente.
          No se infieren valores.
        </p>
      </GlassPanel>
    </div>
  );
}
