'use client';

import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
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

const STATUS_COPY = {
  required: {
    badge: 'Criterio activado',
    title: 'Se detecta al menos un criterio que activa la obligación',
    description: 'Resultado orientativo: revisa la evidencia y tu situación jurídica completa.',
    tone: 'amber' as const,
  },
  not_required: {
    badge: 'Sin criterio activado',
    title: 'No se detectan criterios que activen la obligación',
    description:
      'Este resultado depende de que los cinco topes y la respuesta de IVA estén completos.',
    tone: 'emerald' as const,
  },
  pending_information: {
    badge: 'Información pendiente',
    title: 'Evaluación pendiente de información',
    description: 'Faltan datos que no deben interpretarse como criterios incumplidos.',
    tone: 'cyan' as const,
  },
};

function operatorText(reason: FilingCriterionResult): string {
  if (reason.operator === 'eq') return 'Condición booleana';
  return reason.operator === 'gte' ? 'Igual o superior a' : 'Superior a';
}

function resultBadge(reason: FilingCriterionResult) {
  if (reason.result === 'met') return <Badge tone="amber">Cumple criterio</Badge>;
  if (reason.result === 'not_met') return <Badge tone="emerald">No cumple criterio</Badge>;
  return <Badge tone="cyan">No evaluable</Badge>;
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`));
}

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

  const statusCopy = STATUS_COPY[assessment.status];
  const thresholdReasons = assessment.reasons.filter(
    (reason) => reason.criterionId !== 'vat_responsible_at_year_end',
  );
  const metThresholdCount = thresholdReasons.filter((reason) => reason.result === 'met').length;
  const evaluableThresholdCount = thresholdReasons.filter(
    (reason) => reason.result !== 'not_evaluable',
  ).length;
  return (
    <div className="flex flex-col gap-5">
      <GlassPanel className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-content-strong">Obligación de declarar</h2>
            <p className="mt-1 text-sm text-content-muted">
              Evaluación local para año gravable 2025 · presentación 2026 · UVT{' '}
              {formatCurrencyCOP(UVT_2025)}
            </p>
          </div>
          <Badge tone={statusCopy.tone}>{statusCopy.badge}</Badge>
        </div>

        {assessment.missingInputs.length > 0 ? (
          <div className="mt-4 text-sm text-tone-amber">
            <span className="font-medium">Datos pendientes:</span>{' '}
            {assessment.missingInputs.join(', ')}.
          </div>
        ) : null}

        <div className="mt-5 rounded-xl border border-overlay/10 bg-overlay/[0.025] p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-content-subtle">
            Resultado legal orientativo
          </p>
          <p className="font-medium text-content-strong">{statusCopy.title}</p>
          <p className="mt-1 text-sm text-content-muted">{statusCopy.description}</p>
          <p className="mt-2 text-sm text-content">
            Cumple {metThresholdCount} de 5 topes; se evaluaron {evaluableThresholdCount} de 5.
            Basta activar un solo criterio, incluido IVA, para que el resultado sea requerido.
          </p>
        </div>

        <label className="mt-5 block rounded-xl border border-accent-cyan/20 bg-accent-cyan/5 p-4">
          <span className="block text-sm font-medium text-content-strong">
            ¿Era responsable de IVA al 31 de diciembre de 2025?
          </span>
          <span className="mt-1 block text-xs text-content-muted">
            Esta condición no se puede inferir de la información exógena.
          </span>
          <select
            aria-label="Responsabilidad de IVA al cierre de 2025"
            value={vatValue === null ? '' : String(vatValue)}
            onChange={(event) => {
              const value = event.target.value;
              void saveVatResponsibility(caseId, value === '' ? null : value === 'true');
            }}
            className="mt-3 rounded-lg border border-overlay/12 bg-surface-raised px-3 py-2 text-sm text-content-strong"
          >
            <option value="">Pendiente de confirmar</option>
            <option value="true">Sí</option>
            <option value="false">No</option>
          </select>
        </label>
      </GlassPanel>

      <GlassPanel className="p-6">
        <h3 className="text-sm font-medium text-content-strong">Preparacion de la declaracion</h3>
        <p className="mt-2 text-sm text-content-muted">
          Este avance operativo es independiente del resultado legal. Completar datos y soportes no
          cambia por si mismo la obligacion de declarar.
        </p>
        <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          <li className="rounded-lg border border-overlay/8 p-3">
            Topes disponibles: {evaluableThresholdCount}/5
          </li>
          <li className="rounded-lg border border-overlay/8 p-3">
            Responsabilidad de IVA: {vatValue === null ? 'pendiente' : 'confirmada'}
          </li>
          <li className="rounded-lg border border-overlay/8 p-3">
            Documento para calendario:{' '}
            {assessment.deadline.lastTwoDigits ? 'disponible' : 'pendiente'}
          </li>
          <li className="rounded-lg border border-overlay/8 p-3">
            Evidencia de topes: {thresholdReasons.filter((reason) => reason.evidence).length}/5
          </li>
        </ul>
      </GlassPanel>

      <GlassPanel className="p-6">
        <h3 className="text-sm font-medium text-content-strong">Evaluación por criterio</h3>
        <div className="mt-4 space-y-3">
          {assessment.reasons.map((reason) => (
            <article key={reason.criterionId} className="rounded-xl border border-overlay/8 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h4 className="text-sm font-medium text-content">{reason.label}</h4>
                  <p className="mt-1 text-xs text-content-subtle">{operatorText(reason)}</p>
                </div>
                {resultBadge(reason)}
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
                  {formatCurrencyCOP(reason.exactAmount)}; comparación con valor oficial redondeado.
                </p>
              ) : null}
              <p className="mt-2 text-xs text-content-muted">{reason.explanation}</p>
              {reason.evidence && 'source' in reason.evidence ? (
                <p className="mt-2 text-xs text-content-subtle">
                  Evidencia: “{reason.evidence.originalLabel}” · hoja {reason.evidence.source.sheet}
                  , fila {reason.evidence.source.row}.
                </p>
              ) : null}
            </article>
          ))}
        </div>
      </GlassPanel>

      <GlassPanel className="p-6">
        <h3 className="text-sm font-medium text-content-strong">Fecha límite estimada</h3>
        {assessment.deadline.dueDate ? (
          <>
            <p className="mt-2 text-xl font-semibold text-tone-cyan">
              {formatDate(assessment.deadline.dueDate)}
            </p>
            <p className="mt-1 text-xs text-content-muted">
              Según los últimos dos dígitos detectados: {assessment.deadline.lastTwoDigits}.
              Verifica que correspondan a los usados por la DIAN.
            </p>
          </>
        ) : (
          <p className="mt-2 text-sm text-tone-amber">{assessment.deadline.explanation}</p>
        )}
      </GlassPanel>

      <GlassPanel className="p-6">
        <h3 className="text-sm font-medium text-content-strong">Regla y fuentes</h3>
        <p className="mt-2 text-xs text-content-muted">
          Versión {assessment.ruleVersion} · fuentes verificadas el {VERIFIED_AT} · funcionamiento
          completamente offline durante la evaluación.
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
