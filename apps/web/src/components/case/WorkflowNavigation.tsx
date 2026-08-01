'use client';

import {
  Archive,
  Building2,
  Check,
  CircleAlert,
  FileSearch,
  LockKeyhole,
  Scale,
  Upload,
} from 'lucide-react';
import type { WorkflowStageId, WorkflowViewId } from '@nexus-tax/domain';
import { Badge } from '@nexus-tax/ui';
import type { WorkflowStageState, WorkflowViewDefinition } from '@/lib/workflow';

const ICONS = {
  fuente: Upload,
  extraccion: FileSearch,
  organizacion: Building2,
  conciliacion: CircleAlert,
  declaracion: Scale,
  exportacion: Archive,
} as const;

const STATUS_LABEL = {
  locked: 'Bloqueada',
  available: 'Disponible',
  active: 'Activa',
  incomplete: 'Incompleta',
  completed: 'Completada',
  requires_attention: 'Requiere atención',
} as const;

export function WorkflowStepper({
  stages,
  activeStage,
  onSelect,
}: {
  stages: readonly WorkflowStageState[];
  activeStage: WorkflowStageId;
  onSelect: (stage: WorkflowStageId) => void;
}) {
  return (
    <nav aria-label="Etapas del expediente" className="mt-5">
      <div className="md:hidden">
        <label className="block text-xs font-medium text-content-muted" htmlFor="stage-selector">
          Etapa actual
        </label>
        <select
          id="stage-selector"
          value={activeStage}
          onChange={(event) => onSelect(event.target.value as WorkflowStageId)}
          className="mt-1 min-h-11 w-full rounded-xl border border-overlay/12 bg-surface-raised px-3 py-2 text-sm text-content-strong"
        >
          {stages.map((stage) => (
            <option key={stage.id} value={stage.id} disabled={stage.status === 'locked'}>
              {stage.number}. {stage.name} · {STATUS_LABEL[stage.status]}
            </option>
          ))}
        </select>
        <p className="mt-2 text-xs text-content-muted">
          {stages.find((stage) => stage.id === activeStage)?.description}
        </p>
      </div>

      <ol className="hidden gap-2 md:grid md:grid-cols-3 xl:grid-cols-6">
        {stages.map((stage) => {
          const Icon = ICONS[stage.id];
          const locked = stage.status === 'locked';
          const active = stage.id === activeStage;
          const descriptionId = `stage-description-${stage.id}`;
          return (
            <li key={stage.id} className="relative min-w-0">
              <button
                type="button"
                disabled={locked}
                aria-current={active ? 'step' : undefined}
                aria-describedby={descriptionId}
                title={locked ? (stage.blockedReason ?? stage.description) : stage.description}
                onClick={() => onSelect(stage.id)}
                className={`group min-h-28 w-full rounded-xl border p-3 text-left transition motion-reduce:transition-none ${
                  active
                    ? 'border-accent-cyan/50 bg-accent-cyan/8 shadow-lg shadow-accent-cyan/5'
                    : locked
                      ? 'cursor-not-allowed border-overlay/6 bg-overlay/[0.015] opacity-55'
                      : 'border-overlay/10 bg-surface-glass hover:border-overlay/20 hover:bg-overlay/[0.03]'
                }`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-overlay/10 bg-overlay/5 text-xs font-semibold text-content">
                    {stage.number}
                  </span>
                  {locked ? (
                    <LockKeyhole className="h-4 w-4 text-content-subtle" aria-hidden />
                  ) : stage.status === 'completed' ? (
                    <Check className="h-4 w-4 text-tone-emerald" aria-hidden />
                  ) : (
                    <Icon className="h-4 w-4 text-tone-cyan" aria-hidden />
                  )}
                </span>
                <span className="mt-2 block truncate text-sm font-medium text-content-strong">
                  {stage.name}
                </span>
                <span className="mt-1 block text-[11px] text-content-subtle">
                  {STATUS_LABEL[stage.status]} · {stage.progress}%
                </span>
                <span className="mt-2 block h-1 overflow-hidden rounded-full bg-overlay/8">
                  <span
                    className="block h-full rounded-full bg-gradient-to-r from-accent-cyan to-accent-blue transition-[width] motion-reduce:transition-none"
                    style={{ width: `${stage.progress}%` }}
                  />
                </span>
              </button>
              <span id={descriptionId} className="sr-only">
                {stage.description}. {locked ? stage.blockedReason : STATUS_LABEL[stage.status]}.
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function ContextualNavigation({
  views,
  activeView,
  onSelect,
}: {
  views: readonly WorkflowViewDefinition[];
  activeView: WorkflowViewId;
  onSelect: (view: WorkflowViewId) => void;
}) {
  return (
    <nav aria-label="Vistas de la etapa" className="mt-4 border-b border-overlay/8 pb-3">
      <div className="sm:hidden">
        <label htmlFor="view-selector" className="sr-only">
          Vista actual
        </label>
        <select
          id="view-selector"
          value={activeView}
          onChange={(event) => onSelect(event.target.value as WorkflowViewId)}
          className="min-h-11 w-full rounded-xl border border-overlay/12 bg-surface-raised px-3 py-2 text-sm text-content-strong"
        >
          {views.map((view) => (
            <option key={view.id} value={view.id} disabled={view.future}>
              {view.label}
              {view.future ? ' · Próximamente' : ''}
            </option>
          ))}
        </select>
      </div>
      <div className="hidden flex-wrap gap-2 sm:flex">
        {views.map((view) => (
          <button
            key={view.id}
            type="button"
            disabled={view.future}
            aria-current={activeView === view.id ? 'page' : undefined}
            onClick={() => onSelect(view.id)}
            className={`min-h-10 rounded-lg border px-3 py-2 text-sm transition-colors motion-reduce:transition-none ${
              activeView === view.id
                ? 'border-accent-cyan/40 bg-accent-cyan/8 text-content-strong'
                : view.future
                  ? 'cursor-not-allowed border-overlay/6 text-content-subtle opacity-60'
                  : 'border-overlay/10 text-content-muted hover:bg-overlay/5 hover:text-content'
            }`}
          >
            {view.label}
            {view.future ? (
              <Badge className="ml-2" tone="neutral">
                Futuro
              </Badge>
            ) : null}
          </button>
        ))}
      </div>
    </nav>
  );
}
