'use client';

import { CheckCircle2, Circle, GitBranch } from 'lucide-react';
import type { FilingObligationAssessment } from '@nexus-tax/aegis-rules';
import type { Form210Draft } from '@nexus-tax/form-210';
import { composeForm210FilingStates } from '@nexus-tax/form-210';
import { Badge, GlassPanel } from '@nexus-tax/ui';

export function FilingStatesPanel({
  obligation,
  draft,
}: {
  obligation?: FilingObligationAssessment | null;
  draft?: Form210Draft | null;
}) {
  const states = composeForm210FilingStates({ obligation, draft });
  return (
    <div className="space-y-5">
      <GlassPanel className="overflow-hidden">
        <div className="bg-gradient-to-r from-accent-cyan/15 via-accent-blue/10 to-transparent p-6">
          <p className="text-xs font-medium uppercase tracking-wider text-tone-cyan">
            Pipeline tributario · AG 2025
          </p>
          <h2 className="mt-1 flex items-center gap-2 text-xl font-semibold text-content-strong">
            <GitBranch className="h-5 w-5" aria-hidden />
            Estados separados
          </h2>
          <p className="mt-2 text-sm text-content-muted">
            Cada etapa se mantiene independiente: obligación, borrador,
            liquidación y presentación. NexusTax nunca presenta ante la DIAN;
            el estado de "Presentación" está fuera de alcance por diseño.
          </p>
        </div>
      </GlassPanel>

      <ol className="grid gap-3">
        {states.stages.map((stage, index) => {
          const isPresentation = stage.id === 'presentation';
          return (
            <li key={stage.id}>
              <GlassPanel className="flex items-start gap-4 p-4">
                <div
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${
                    stage.tone === 'emerald'
                      ? 'bg-emerald-400/10 text-tone-emerald'
                      : stage.tone === 'amber'
                        ? 'bg-amber-400/10 text-tone-amber'
                        : stage.tone === 'rose'
                          ? 'bg-rose-400/10 text-tone-rose'
                          : 'bg-accent-blue/10 text-tone-blue'
                  }`}
                >
                  {stage.tone === 'emerald' ? (
                    <CheckCircle2 className="h-5 w-5" aria-hidden />
                  ) : (
                    <Circle className="h-5 w-5" aria-hidden />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-medium uppercase tracking-wide text-content-subtle">
                      {index + 1} · {stage.label}
                    </p>
                    <Badge tone={stage.tone}>{stage.statusLabel}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-content">{stage.description}</p>
                  {isPresentation ? (
                    <p className="mt-2 text-xs text-content-subtle">
                      Estado fijo <code>out_of_scope</code>. Es un contrato explícito
                      del proyecto.
                    </p>
                  ) : null}
                </div>
              </GlassPanel>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
