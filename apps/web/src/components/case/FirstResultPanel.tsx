'use client';

import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { AlertCircle, ArrowRight, CalendarClock, CheckCircle2, HelpCircle } from 'lucide-react';
import { assessFilingObligation } from '@nexus-tax/aegis-rules';
import type { ProcessingResult } from '@nexus-tax/domain';
import { Badge, Button, GlassPanel, formatCurrencyCOP } from '@nexus-tax/ui';
import { buildFirstResult, describeDeadline, type FirstResultTone } from '@/lib/firstResult';
import { getFilingInputs, saveVatResponsibility } from '@/lib/repository';

const TONE_BOX: Record<FirstResultTone, string> = {
  amber: 'bg-amber-400/10 text-tone-amber',
  emerald: 'bg-emerald-500/10 text-tone-emerald',
  cyan: 'bg-accent-cyan/10 text-tone-cyan',
};
const TONE_TEXT: Record<FirstResultTone, string> = {
  amber: 'text-tone-amber',
  emerald: 'text-tone-emerald',
  cyan: 'text-tone-cyan',
};
const TONE_ICON = { amber: AlertCircle, emerald: CheckCircle2, cyan: HelpCircle } as const;

/**
 * Primera pantalla tras cargar la exógena: responde en lenguaje llano si
 * probablemente toca declarar, por qué, cuándo vence y qué sigue.
 * Todo viene de las reglas Aegis existentes; aquí solo se presenta.
 */
export function FirstResultPanel({
  caseId,
  taxYear,
  result,
  onContinue,
  onSeeDetail,
}: {
  caseId: string;
  taxYear: number;
  result: ProcessingResult;
  onContinue: () => void;
  onSeeDetail: () => void;
}) {
  const storedInputs = useLiveQuery(() => getFilingInputs(caseId), [caseId]);
  const [timestamp] = useState(() => new Date().toISOString());
  const vatValue = storedInputs?.isVatResponsibleAtYearEnd ?? null;
  const detectedYear = result.report.taxpayer.taxYear ?? taxYear;
  const taxpayerName = result.report.taxpayer.taxpayerName;

  const assessment = useMemo(
    () =>
      assessFilingObligation({
        thresholds: result.report.thresholds,
        isVatResponsibleAtYearEnd: vatValue,
        document: result.report.taxpayer.documentRaw,
        documentType: result.report.taxpayer.documentType,
        evaluatedAt: storedInputs?.updatedAt ?? timestamp,
      }),
    [result, vatValue, storedInputs?.updatedAt, timestamp],
  );
  const view = useMemo(() => buildFirstResult(assessment), [assessment]);
  const deadline = assessment.deadline.dueDate
    ? describeDeadline(assessment.deadline.dueDate, timestamp.slice(0, 10))
    : null;

  if (detectedYear !== 2025) {
    return (
      <GlassPanel className="p-6">
        <h2 className="text-lg font-semibold text-content-strong">Tu resultado</h2>
        <p className="mt-2 text-sm text-tone-amber">
          Por ahora solo tenemos las reglas del año gravable 2025, y este archivo es del año{' '}
          {detectedYear}. No aplicaremos reglas de otro año.
        </p>
      </GlassPanel>
    );
  }

  const Icon = TONE_ICON[view.headline.tone];

  return (
    <div className="flex flex-col gap-5">
      <GlassPanel className="p-6">
        {taxpayerName ? (
          <p className="text-sm text-content-muted">
            Hola, {taxpayerName.split(' ')[0]}. Esto es lo que vemos en tu exógena:
          </p>
        ) : null}
        <div className="mt-3 flex items-start gap-4">
          <span
            className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${TONE_BOX[view.headline.tone]}`}
          >
            <Icon className="h-6 w-6" aria-hidden />
          </span>
          <div className="flex-1">
            <h2
              className={`text-xl font-semibold leading-snug sm:text-2xl ${TONE_TEXT[view.headline.tone]}`}
            >
              {view.headline.title}
            </h2>
            <p className="mt-2 text-sm text-content-muted">{view.headline.summary}</p>
          </div>
        </div>

        {deadline ? (
          <div className="mt-5 flex items-start gap-3 rounded-xl border border-overlay/8 bg-overlay/[0.02] p-3">
            <CalendarClock className="mt-0.5 h-5 w-5 shrink-0 text-tone-cyan" aria-hidden />
            <p className="text-sm text-content">
              {deadline.lead} <strong className="text-content-strong">{deadline.date}</strong>.
              {deadline.note ? (
                <span className="mt-1 block text-xs text-content-muted">{deadline.note}</span>
              ) : null}
            </p>
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button onClick={onContinue} leadingIcon={<ArrowRight className="h-4 w-4" aria-hidden />}>
            Continuar
          </Button>
          <button
            type="button"
            onClick={onSeeDetail}
            className="text-sm text-tone-cyan underline-offset-2 hover:underline"
          >
            Ver el detalle completo
          </button>
        </div>
      </GlassPanel>

      {view.needsVatAnswer ? (
        <GlassPanel className="p-6">
          <p className="text-sm font-medium text-content-strong">
            Una pregunta rápida: ¿eras responsable de IVA el 31 de diciembre de 2025?
          </p>
          <p className="mt-1 text-xs text-content-muted">
            La exógena no lo dice. Si no tienes un negocio o actividad que cobre IVA, casi seguro la
            respuesta es «No».
          </p>
          <div className="mt-3 flex gap-2">
            {[
              { label: 'No', value: false },
              { label: 'Sí', value: true },
            ].map((option) => (
              <button
                key={option.label}
                type="button"
                onClick={() => void saveVatResponsibility(caseId, option.value)}
                className="min-h-10 rounded-lg border border-overlay/12 px-5 py-2 text-sm text-content hover:bg-overlay/5"
              >
                {option.label}
              </button>
            ))}
          </div>
        </GlassPanel>
      ) : null}

      <section aria-labelledby="como-lo-calculamos">
        <h3 id="como-lo-calculamos" className="mb-1 text-sm font-medium text-content-strong">
          Cómo llegamos a este resultado
        </h3>
        <p className="mb-3 text-xs text-content-muted">
          La DIAN pide declarar si superas <em>cualquiera</em> de estos límites. Comparamos cada uno
          con lo que reporta tu exógena.
        </p>
        <ul className="grid gap-3 sm:grid-cols-2">
          {view.criteria
            .filter((item) => item.id !== 'vat_responsible_at_year_end')
            .map((item) => (
              <li key={item.id}>
                <GlassPanel className="h-full p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-content-strong">{item.name}</p>
                    <Badge
                      tone={
                        item.state === 'exceeds'
                          ? 'amber'
                          : item.state === 'within'
                            ? 'emerald'
                            : 'cyan'
                      }
                    >
                      {item.stateLabel}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-content-muted">{item.help}</p>
                  {item.observedValue !== null && item.limit !== null ? (
                    <>
                      <div
                        className="mt-3 h-2 overflow-hidden rounded-full bg-overlay/10"
                        role="img"
                        aria-label={`${Math.round((item.ratio ?? 0) * 100)} % del límite`}
                      >
                        <div
                          className={`h-full rounded-full ${item.state === 'exceeds' ? 'bg-amber-400' : 'bg-emerald-500'}`}
                          style={{ width: `${Math.round((item.ratio ?? 0) * 100)}%` }}
                        />
                      </div>
                      <p className="mt-2 text-xs text-content">
                        <strong className="text-content-strong">
                          {formatCurrencyCOP(item.observedValue)}
                        </strong>{' '}
                        de un límite de {formatCurrencyCOP(item.limit)}
                      </p>
                    </>
                  ) : null}
                </GlassPanel>
              </li>
            ))}
        </ul>
      </section>

      <p className="text-xs text-content-subtle">
        Este resultado es orientativo y se calcula en tu navegador; ningún dato sale de tu equipo.
        No reemplaza la revisión de un contador ni es un concepto legal.
      </p>
    </div>
  );
}
