'use client';

import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  HelpCircle,
  Info,
  Scale,
  ShieldCheck,
} from 'lucide-react';
import {
  FILING_RULE_SOURCES_2025,
  UVT_2025,
  VERIFIED_AT,
  assessFilingObligation,
  type FilingCriterionResult,
} from '@nexus-tax/aegis-rules';
import type { ProcessingResult } from '@nexus-tax/domain';
import { Badge, GlassPanel, formatCurrencyCOP } from '@nexus-tax/ui';
import { getFilingInputs, saveVatResponsibility } from '@/lib/repository';

/**
 * Los criterios DIAN son OR: basta cumplir uno para quedar obligado a declarar.
 * Este panel privilegia el veredicto textual y evita mostrar cualquier %
 * que insinúe un "avance" hacia la obligación.
 */

type Verdict = {
  tone: 'amber' | 'emerald' | 'cyan';
  title: string;
  subtitle: string;
  icon: typeof CheckCircle2;
};

function verdictFor(
  status: 'required' | 'not_required' | 'pending_information',
  metCriterion: FilingCriterionResult | undefined,
): Verdict {
  if (status === 'required' && metCriterion) {
    return {
      tone: 'amber',
      icon: AlertCircle,
      title: 'Debes declarar renta AG 2025',
      subtitle: `Se cumple el criterio “${metCriterion.label}”. Basta uno para quedar obligado.`,
    };
  }
  if (status === 'not_required') {
    return {
      tone: 'emerald',
      icon: CheckCircle2,
      title: 'Por ahora, no se activa ningún criterio para declarar',
      subtitle:
        'Resultado orientativo con la información evaluada. Verifica que los cinco topes y la respuesta de IVA estén completos.',
    };
  }
  return {
    tone: 'cyan',
    icon: HelpCircle,
    title: 'Aún no es posible evaluarlo',
    subtitle:
      'Falta información para aplicar todos los criterios. Los datos ausentes no equivalen a criterios incumplidos.',
  };
}

function operatorText(reason: FilingCriterionResult): string {
  if (reason.operator === 'eq') return 'Condición booleana';
  return reason.operator === 'gte' ? 'Igual o superior a' : 'Superior a';
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`));
}

const TONE_TITLE: Record<Verdict['tone'], string> = {
  amber: 'text-tone-amber',
  emerald: 'text-tone-emerald',
  cyan: 'text-tone-cyan',
};

const TONE_ICON_BOX: Record<Verdict['tone'], string> = {
  amber: 'bg-amber-400/10 text-tone-amber',
  emerald: 'bg-emerald-500/10 text-tone-emerald',
  cyan: 'bg-accent-cyan/10 text-tone-cyan',
};

export function FilingObligationPanel({
  caseId,
  taxYear,
  result,
}: {
  caseId: string;
  taxYear: number;
  result: ProcessingResult;
}) {
  const storedInputs = useLiveQuery(() => getFilingInputs(caseId), [caseId]);
  const [evaluationTimestamp] = useState(() => new Date().toISOString());
  const [showOthers, setShowOthers] = useState(false);
  const detectedTaxYear = result.report.taxpayer.taxYear ?? taxYear;
  const vatValue = storedInputs?.isVatResponsibleAtYearEnd ?? null;
  const assessment = useMemo(
    () =>
      assessFilingObligation({
        thresholds: result.report.thresholds,
        isVatResponsibleAtYearEnd: vatValue,
        document: result.report.taxpayer.documentRaw,
        documentType: result.report.taxpayer.documentType,
        evaluatedAt: storedInputs?.updatedAt ?? evaluationTimestamp,
      }),
    [result, storedInputs?.updatedAt, vatValue, evaluationTimestamp],
  );

  if (detectedTaxYear !== 2025) {
    return (
      <GlassPanel className="p-6">
        <h2 className="text-lg font-semibold text-content-strong">Obligación de declarar</h2>
        <p className="mt-2 text-sm text-tone-amber">
          Las reglas locales disponibles corresponden al año gravable 2025. Este expediente indica
          el año {detectedTaxYear}; no se aplicará una regla de otro período.
        </p>
      </GlassPanel>
    );
  }

  const metCriteria = assessment.reasons.filter((reason) => reason.result === 'met');
  const notMetCriteria = assessment.reasons.filter((reason) => reason.result === 'not_met');
  const notEvaluable = assessment.reasons.filter((reason) => reason.result === 'not_evaluable');
  const verdict = verdictFor(assessment.status, metCriteria[0]);
  const VerdictIcon = verdict.icon;

  return (
    <div className="flex flex-col gap-5">
      {/* VEREDICTO PRINCIPAL — el mensaje que el analista quiere leer primero */}
      <GlassPanel className="p-6">
        <div className="flex items-start gap-4">
          <span
            className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${TONE_ICON_BOX[verdict.tone]}`}
          >
            <VerdictIcon className="h-6 w-6" aria-hidden />
          </span>
          <div className="flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-content-subtle">
              Resultado orientativo · AG 2025
            </p>
            <h2 className={`mt-1 text-xl font-semibold ${TONE_TITLE[verdict.tone]}`}>
              {verdict.title}
            </h2>
            <p className="mt-2 text-sm text-content-muted">{verdict.subtitle}</p>
          </div>
          <Badge tone={verdict.tone}>
            {assessment.status === 'required'
              ? 'Obligación activada'
              : assessment.status === 'not_required'
                ? 'Sin criterio activo'
                : 'Información pendiente'}
          </Badge>
        </div>

        {/* Criterios cumplidos — evidencia visible */}
        {metCriteria.length > 0 ? (
          <div className="mt-5 space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-content-subtle">
              Criterios que activan la obligación
            </p>
            {metCriteria.map((reason) => (
              <div
                key={reason.criterionId}
                className="rounded-xl border border-amber-400/25 bg-amber-400/5 p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-content-strong">{reason.label}</p>
                    {typeof reason.observedValue === 'number' ? (
                      <p className="mt-1 text-sm text-content">
                        Detectado:{' '}
                        <span className="font-semibold text-tone-amber">
                          {formatCurrencyCOP(reason.observedValue)}
                        </span>
                        {reason.officialRoundedAmount ? (
                          <>
                            {' '}
                            · límite oficial: {formatCurrencyCOP(reason.officialRoundedAmount)}
                          </>
                        ) : null}
                      </p>
                    ) : reason.criterionId === 'vat_responsible_at_year_end' &&
                      reason.observedValue === true ? (
                      <p className="mt-1 text-sm text-content">
                        Confirmaste responsabilidad de IVA a 31/dic/2025.
                      </p>
                    ) : null}
                    {reason.evidence && 'source' in reason.evidence ? (
                      <p className="mt-1 text-xs text-content-subtle">
                        Evidencia: “{reason.evidence.originalLabel}” · hoja{' '}
                        {reason.evidence.source.sheet}, fila {reason.evidence.source.row}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {/* Info datos pendientes cuando aplique */}
        {assessment.missingInputs.length > 0 ? (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-accent-cyan/25 bg-accent-cyan/5 p-3 text-sm">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-tone-cyan" aria-hidden />
            <div>
              <p className="font-medium text-content-strong">Datos pendientes de confirmar</p>
              <p className="mt-0.5 text-xs text-content-muted">
                {assessment.missingInputs.join(', ')}. Los datos ausentes no cuentan como criterios
                incumplidos.
              </p>
            </div>
          </div>
        ) : null}
      </GlassPanel>

      {/* PREGUNTA DE IVA — destacada, cerca del veredicto porque puede activarlo */}
      <GlassPanel className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent-violet/10 text-tone-violet">
              <Scale className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-medium text-content-strong">
                ¿Fuiste responsable de IVA al 31 de diciembre de 2025?
              </p>
              <p className="mt-1 text-xs text-content-muted">
                Esta condición no se puede inferir de la exógena. Responder “Sí” activa la
                obligación por sí sola.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <VatOption
              value="true"
              current={vatValue}
              label="Sí"
              onSelect={(next) => void saveVatResponsibility(caseId, next)}
            />
            <VatOption
              value="false"
              current={vatValue}
              label="No"
              onSelect={(next) => void saveVatResponsibility(caseId, next)}
            />
            <VatOption
              value={null}
              current={vatValue}
              label="Pendiente"
              onSelect={(next) => void saveVatResponsibility(caseId, next)}
            />
          </div>
        </div>
      </GlassPanel>

      {/* FECHA LÍMITE */}
      {assessment.deadline.dueDate ? (
        <GlassPanel className="p-6">
          <p className="text-xs font-medium uppercase tracking-wide text-content-subtle">
            Fecha límite estimada
          </p>
          <p className="mt-1 text-xl font-semibold text-tone-cyan">
            {formatDate(assessment.deadline.dueDate)}
          </p>
          <p className="mt-1 text-xs text-content-muted">
            Según los últimos dos dígitos detectados: {assessment.deadline.lastTwoDigits}. Verifica
            que correspondan a los usados por la DIAN.
          </p>
        </GlassPanel>
      ) : (
        <GlassPanel className="p-6">
          <p className="text-xs font-medium uppercase tracking-wide text-content-subtle">
            Fecha límite estimada
          </p>
          <p className="mt-1 text-sm text-tone-amber">{assessment.deadline.explanation}</p>
        </GlassPanel>
      )}

      {/* DETALLE COMPLETO — colapsable para no distraer del veredicto */}
      <GlassPanel className="p-0">
        <button
          type="button"
          onClick={() => setShowOthers((open) => !open)}
          aria-expanded={showOthers}
          className="flex w-full items-center gap-2 p-5 text-left"
        >
          <span className="text-sm font-medium text-content-strong">
            Ver evaluación por criterio ({metCriteria.length} cumplidos · {notMetCriteria.length}{' '}
            no cumplidos · {notEvaluable.length} no evaluables)
          </span>
          <ChevronDown
            className={`ml-auto h-4 w-4 text-content-muted transition-transform motion-reduce:transition-none ${
              showOthers ? 'rotate-180' : ''
            }`}
            aria-hidden
          />
        </button>
        {showOthers ? (
          <div className="space-y-3 border-t border-overlay/8 p-5">
            {assessment.reasons.map((reason) => {
              const tone: 'amber' | 'emerald' | 'cyan' =
                reason.result === 'met'
                  ? 'amber'
                  : reason.result === 'not_met'
                    ? 'emerald'
                    : 'cyan';
              const label =
                reason.result === 'met'
                  ? 'Activa la obligación'
                  : reason.result === 'not_met'
                    ? 'No activa'
                    : 'No evaluable';
              return (
                <article
                  key={reason.criterionId}
                  className="rounded-xl border border-overlay/8 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-medium text-content">{reason.label}</h4>
                      <p className="mt-1 text-xs text-content-subtle">{operatorText(reason)}</p>
                    </div>
                    <Badge tone={tone}>{label}</Badge>
                  </div>
                  {typeof reason.observedValue === 'number' ? (
                    <p className="mt-3 text-sm text-content">
                      Detectado: {formatCurrencyCOP(reason.observedValue)} · límite oficial:{' '}
                      {formatCurrencyCOP(reason.officialRoundedAmount ?? 0)}
                    </p>
                  ) : null}
                  {reason.exactAmount !== undefined ? (
                    <p className="mt-1 text-xs text-content-subtle">
                      {reason.uvtAmount?.toLocaleString('es-CO')} UVT ={' '}
                      {formatCurrencyCOP(reason.exactAmount)}; comparación con valor oficial
                      redondeado.
                    </p>
                  ) : null}
                  <p className="mt-2 text-xs text-content-muted">{reason.explanation}</p>
                  {reason.evidence && 'source' in reason.evidence ? (
                    <p className="mt-2 text-xs text-content-subtle">
                      Evidencia: “{reason.evidence.originalLabel}” · hoja{' '}
                      {reason.evidence.source.sheet}, fila {reason.evidence.source.row}
                    </p>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : null}
      </GlassPanel>

      {/* REGLA + FUENTES */}
      <GlassPanel className="p-6">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-tone-emerald" aria-hidden />
          <h3 className="text-sm font-medium text-content-strong">Regla y fuentes DIAN</h3>
        </div>
        <p className="mt-2 text-xs text-content-muted">
          Versión {assessment.ruleVersion} · UVT {formatCurrencyCOP(UVT_2025)} · fuentes verificadas
          el {VERIFIED_AT} · evaluación 100% offline.
        </p>
        <ul className="mt-3 space-y-2 text-sm">
          {FILING_RULE_SOURCES_2025.map((source) => (
            <li key={source.id}>
              <a
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="text-tone-cyan underline-offset-2 hover:underline"
              >
                {source.title}
              </a>
            </li>
          ))}
        </ul>
      </GlassPanel>
    </div>
  );
}

function VatOption({
  value,
  current,
  label,
  onSelect,
}: {
  value: 'true' | 'false' | null;
  current: boolean | null;
  label: string;
  onSelect: (next: boolean | null) => void;
}) {
  const isActive =
    (value === null && current === null) ||
    (value === 'true' && current === true) ||
    (value === 'false' && current === false);
  return (
    <button
      type="button"
      onClick={() => onSelect(value === null ? null : value === 'true')}
      aria-pressed={isActive}
      className={`min-h-10 rounded-lg border px-4 py-2 text-sm transition-colors motion-reduce:transition-none ${
        isActive
          ? 'border-accent-cyan/50 bg-accent-cyan/10 text-content-strong'
          : 'border-overlay/12 text-content-muted hover:bg-overlay/5'
      }`}
    >
      {label}
    </button>
  );
}
