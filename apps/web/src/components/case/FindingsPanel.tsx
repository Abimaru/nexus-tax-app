'use client';

import { useMemo, useState } from 'react';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import type {
  CaseAnalysis,
  DataQualityFinding,
  FindingSeverity,
  ProcessingResult,
} from '@nexus-tax/domain';
import { Button, EmptyState, GlassPanel, SeverityBadge } from '@nexus-tax/ui';

const SEVERITY_ORDER: FindingSeverity[] = ['error', 'warning', 'info'];

interface FindingsPanelProps {
  result: ProcessingResult;
  analysis?: CaseAnalysis;
  onNavigateToRecord: (recordId: string) => void;
  onReviewRecord: (recordId: string) => void;
}

/** Pantalla "Hallazgos" (§10). Severidad, evidencia y navegación al registro. */
export function FindingsPanel({
  result,
  analysis,
  onNavigateToRecord,
  onReviewRecord,
}: FindingsPanelProps) {
  const [severityFilter, setSeverityFilter] = useState<FindingSeverity | 'all'>('all');

  const filtered = useMemo(
    () =>
      severityFilter === 'all'
        ? result.findings
        : result.findings.filter((f) => f.severity === severityFilter),
    [result.findings, severityFilter],
  );
  const activeCounts = useMemo(() => {
    const counts = { error: 0, warning: 0, info: 0 };
    for (const finding of result.findings) {
      const resolution = finding.relatedRecordId
        ? analysis?.resolutions.find((item) => item.recordId === finding.relatedRecordId)
        : undefined;
      const resolved =
        resolution && !resolution.isObsolete && resolution.status !== 'pending_review';
      if (!resolved) counts[finding.severity] += 1;
    }
    return counts;
  }, [result.findings, analysis]);

  if (result.findings.length === 0) {
    return (
      <EmptyState
        icon={<ShieldCheck className="h-8 w-8" aria-hidden />}
        title="Sin hallazgos"
        description="No se detectaron problemas básicos de calidad en esta extracción."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <FilterChip
          label="Todos"
          active={severityFilter === 'all'}
          onClick={() => setSeverityFilter('all')}
        />
        {SEVERITY_ORDER.map((sev) => {
          const count = activeCounts[sev];
          return (
            <FilterChip
              key={sev}
              label={`${sev === 'error' ? 'Errores' : sev === 'warning' ? 'Advertencias' : 'Info'} (${count})`}
              active={severityFilter === sev}
              onClick={() => setSeverityFilter(sev)}
            />
          );
        })}
      </div>

      <ul className="flex flex-col gap-3">
        {filtered.map((finding) => (
          <FindingCard
            key={finding.id}
            finding={finding}
            resolution={
              finding.relatedRecordId
                ? analysis?.resolutions.find((item) => item.recordId === finding.relatedRecordId)
                : undefined
            }
            onNavigateToRecord={onNavigateToRecord}
            onReviewRecord={onReviewRecord}
          />
        ))}
      </ul>
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        'rounded-full border px-3 py-1 text-xs transition-colors',
        active
          ? 'border-accent-cyan/50 bg-accent-cyan/10 text-content-strong'
          : 'border-overlay/10 text-content-muted hover:text-content',
      ].join(' ')}
    >
      {label}
    </button>
  );
}

function FindingCard({
  finding,
  resolution,
  onNavigateToRecord,
  onReviewRecord,
}: {
  finding: DataQualityFinding;
  resolution?: CaseAnalysis['resolutions'][number];
  onNavigateToRecord: (recordId: string) => void;
  onReviewRecord: (recordId: string) => void;
}) {
  const ev = finding.evidence;
  return (
    <li>
      <GlassPanel className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <SeverityBadge severity={finding.severity} />
            <h3 className="text-sm font-medium text-content-strong">{finding.title}</h3>
          </div>
          <code className="text-[11px] text-content-subtle">{finding.code}</code>
        </div>
        <p className="mt-2 text-sm text-content-muted">{finding.message}</p>
        {resolution && !resolution.isObsolete && resolution.status !== 'pending_review' ? (
          <p className="mt-2 text-xs text-tone-emerald">
            Resuelto: {resolution.status.replaceAll('_', ' ')}.
          </p>
        ) : null}

        {ev ? (
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-content-subtle">
            {ev.sheet ? <span>Hoja: {ev.sheet}</span> : null}
            {ev.row ? <span>Fila: {ev.row}</span> : null}
            {ev.column ? <span>Columna: {ev.column}</span> : null}
            {ev.value ? (
              <span>
                Valor: <span className="text-content">{ev.value}</span>
              </span>
            ) : null}
            {ev.expectedMasked ? <span>Esperado: {ev.expectedMasked}</span> : null}
            {ev.foundMasked ? <span>Encontrado: {ev.foundMasked}</span> : null}
          </div>
        ) : null}

        {finding.suggestedAction ? (
          <p className="mt-2 text-xs text-tone-cyan/90">
            Acción sugerida: {finding.suggestedAction}
          </p>
        ) : null}

        {finding.relatedRecordId ? (
          <div className="mt-3">
            <Button
              variant="ghost"
              onClick={() => onReviewRecord(finding.relatedRecordId!)}
              leadingIcon={<ArrowRight className="h-4 w-4" aria-hidden />}
            >
              Ver registro afectado
            </Button>
            <Button variant="ghost" onClick={() => onNavigateToRecord(finding.relatedRecordId!)}>
              Ver en tabla
            </Button>
          </div>
        ) : null}
      </GlassPanel>
    </li>
  );
}
