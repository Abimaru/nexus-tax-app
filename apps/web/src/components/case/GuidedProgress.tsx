'use client';

import { ArrowRight, Check, Lock } from 'lucide-react';
import { Button, GlassPanel } from '@nexus-tax/ui';
import { nextGuidedStep, type GuidedStep } from '@/lib/guidedFlow';

/**
 * Cinco pasos en lugar de seis etapas: «dónde estoy, qué sigue». Los pasos bloqueados
 * explican por qué; el color nunca es la única señal (número, marca de hecho y texto).
 */
export function GuidedProgress({
  steps,
  onSelect,
}: {
  steps: readonly GuidedStep[];
  onSelect: (step: GuidedStep) => void;
}) {
  const current = steps.find((step) => step.status === 'current') ?? steps[0]!;
  const next = nextGuidedStep(steps);
  const showNext = next.id !== current.id;

  return (
    <nav aria-label="Tu camino" className="mt-5">
      <GlassPanel className="p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-content-subtle">
              Paso {current.number} de {steps.length}
            </p>
            <h2 className="mt-0.5 text-lg font-semibold text-content-strong">{current.label}</h2>
            <p className="mt-0.5 text-sm text-content-muted">{current.description}</p>
          </div>
          {showNext ? (
            <Button
              onClick={() => onSelect(next)}
              leadingIcon={<ArrowRight className="h-4 w-4" aria-hidden />}
            >
              Siguiente: {next.label}
            </Button>
          ) : null}
        </div>

        <ol className="mt-4 grid grid-cols-5 gap-1.5 sm:gap-2">
          {steps.map((step) => {
            const locked = step.status === 'locked';
            const active = step.status === 'current';
            return (
              <li key={step.id} className="min-w-0">
                <button
                  type="button"
                  disabled={locked}
                  aria-current={active ? 'step' : undefined}
                  onClick={() => onSelect(step)}
                  className={`flex h-full w-full flex-col items-center gap-1.5 rounded-xl border p-2 text-center transition-colors motion-reduce:transition-none sm:items-start sm:p-3 sm:text-left ${
                    active
                      ? 'border-accent-cyan/50 bg-accent-cyan/10'
                      : 'border-overlay/10 hover:bg-overlay/5'
                  } ${locked ? 'cursor-not-allowed opacity-50' : ''}`}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border text-xs font-medium ${
                        step.complete
                          ? 'border-emerald-500/40 bg-emerald-500/15 text-tone-emerald'
                          : active
                            ? 'border-accent-cyan/50 text-tone-cyan'
                            : 'border-overlay/20 text-content-muted'
                      }`}
                    >
                      {locked ? (
                        <Lock className="h-3 w-3" aria-hidden />
                      ) : step.complete ? (
                        <Check className="h-3.5 w-3.5" aria-hidden />
                      ) : (
                        step.number
                      )}
                    </span>
                    <span className="hidden text-sm font-medium text-content-strong sm:inline">
                      {step.label}
                    </span>
                  </span>
                  <span className="sr-only sm:hidden">{step.label}</span>
                  <span className="hidden text-xs text-content-muted sm:block">
                    {locked ? 'Primero carga tu exógena' : step.detail}
                    {step.complete ? <span className="sr-only"> (completado)</span> : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
        <p className="mt-3 text-xs text-content-muted sm:hidden">{current.detail}</p>
      </GlassPanel>
    </nav>
  );
}
