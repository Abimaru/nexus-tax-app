'use client';

import { ArrowRight, CheckCircle2, ClipboardList } from 'lucide-react';
import type { CaseTask, WorkflowStageId, WorkflowViewId } from '@nexus-tax/domain';
import { Badge, Button, EmptyState, GlassPanel } from '@nexus-tax/ui';

const PRIORITY_COPY = {
  high: { label: 'Prioridad alta', tone: 'amber' as const },
  medium: { label: 'Prioridad media', tone: 'cyan' as const },
  low: { label: 'Prioridad baja', tone: 'neutral' as const },
};

export function CaseTasksPanel({
  tasks,
  onNavigate,
}: {
  tasks: readonly CaseTask[];
  onNavigate: (stage: WorkflowStageId, view: WorkflowViewId, taskId: string) => void;
}) {
  const active = tasks.filter((task) =>
    ['pending', 'in_progress', 'blocked'].includes(task.status),
  );
  if (!active.length) {
    return (
      <EmptyState
        icon={<CheckCircle2 className="h-8 w-8" />}
        title="Sin pendientes accionables"
        description="No hay tareas abiertas derivadas del expediente. Las resueltas conservan su trazabilidad local."
      />
    );
  }
  return (
    <div className="space-y-4">
      <GlassPanel className="p-5">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent-violet/10 text-tone-violet">
            <ClipboardList className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-content-strong">Pendientes del expediente</h2>
            <p className="mt-1 text-sm text-content-muted">
              {active.length} tarea(s) con destino concreto, ordenadas por impacto y prioridad.
            </p>
          </div>
        </div>
      </GlassPanel>
      {(['high', 'medium', 'low'] as const).map((priority) => {
        const priorityTasks = active.filter((task) => task.priority === priority);
        if (!priorityTasks.length) return null;
        return (
          <section key={priority} aria-labelledby={`tasks-${priority}`}>
            <div className="mb-2 flex items-center gap-2">
              <h3 id={`tasks-${priority}`} className="text-sm font-medium text-content-strong">
                {PRIORITY_COPY[priority].label}
              </h3>
              <Badge tone={PRIORITY_COPY[priority].tone}>{priorityTasks.length}</Badge>
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              {priorityTasks.map((task) => (
                <GlassPanel key={task.id} className="flex h-full flex-col p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h4 className="font-medium text-content-strong">{task.title}</h4>
                    <Badge tone={task.blocking ? 'amber' : 'neutral'}>
                      {task.blocking ? 'Bloquea avance' : 'No bloqueante'}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-content-muted">{task.explanation}</p>
                  {task.evidence.length ? (
                    <p className="mt-2 line-clamp-2 text-xs text-content-subtle">
                      Dato afectado: {task.evidence[0]}
                    </p>
                  ) : null}
                  <div className="mt-auto pt-4">
                    <p className="mb-2 text-xs text-content-muted">
                      Cómo resolverlo: {task.recommendedAction}
                    </p>
                    <Button
                      variant="secondary"
                      leadingIcon={<ArrowRight className="h-4 w-4" aria-hidden />}
                      onClick={() => onNavigate(task.stage, task.view, task.id)}
                    >
                      {task.recommendedAction}
                    </Button>
                  </div>
                </GlassPanel>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
