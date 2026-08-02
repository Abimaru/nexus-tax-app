'use client';

import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import {
  TaxCategorySchema,
  TaxConfidenceSchema,
  TaxNatureSchema,
  TaxTreatmentSchema,
  type CaseAnalysis,
  type ClassificationSnapshot,
  type ProcessingResult,
} from '@nexus-tax/domain';
import { maskDocument } from '@nexus-tax/exogenous-parser';
import { Badge, Button, formatCurrencyCOP } from '@nexus-tax/ui';
import {
  restoreAutomaticClassification,
  saveRecordResolution,
  type SaveRecordResolutionInput,
} from '@/lib/repository';
import {
  CATEGORY_LABEL,
  NATURE_LABEL,
  RELATION_LABEL,
  RESOLUTION_LABEL,
  TREATMENT_LABEL,
} from '@/lib/analysisPresentation';

export function ResolutionDrawer({
  caseId,
  recordId,
  result,
  analysis,
  onClose,
}: {
  caseId: string;
  recordId: string;
  result: ProcessingResult;
  analysis: CaseAnalysis;
  onClose: () => void;
}) {
  const record = result.normalizedRecords.find((item) => item.id === recordId);
  const raw = result.rawRecords.find((item) => item.id === record?.rawId);
  const resolution = analysis.resolutions.find((item) => item.recordId === recordId);
  const automatic = useMemo<ClassificationSnapshot | null>(
    () =>
      record
        ? {
            category: record.category,
            nature: record.nature,
            treatment: record.treatment,
            confidence: record.confidence,
            evidence: record.classificationEvidence,
          }
        : null,
    [record],
  );
  const [classification, setClassification] = useState<ClassificationSnapshot | null>(
    resolution?.finalClassification ?? automatic,
  );
  const [observation, setObservation] = useState(resolution?.observation ?? '');
  const [justification, setJustification] = useState(resolution?.justification ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  useEffect(() => {
    setClassification(resolution?.finalClassification ?? automatic);
    setObservation(resolution?.observation ?? '');
    setJustification(resolution?.justification ?? '');
  }, [resolution, automatic]);

  if (!record || !automatic || !classification) return null;

  const related = analysis.relationships.filter(
    (item) => item.sourceRecordId === recordId || item.targetRecordId === recordId,
  );
  const originalValueKey = result.columnMapping.reportedValue;
  const originalValue = originalValueKey ? raw?.cells[originalValueKey] : record.reportedValue;

  async function apply(input: SaveRecordResolutionInput) {
    setSaving(true);
    setError(null);
    try {
      await saveRecordResolution(caseId, recordId, input);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo guardar la decisión.');
    } finally {
      setSaving(false);
    }
  }

  const common = { observation, justification };
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-surface-base/80" role="presentation">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Cerrar revisión"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="resolution-title"
        className="relative z-10 h-full w-full max-w-2xl overflow-y-auto border-l border-overlay/10 bg-surface-raised p-5 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="resolution-title" className="text-lg font-semibold text-content-strong">
              Resolver clasificación
            </h2>
            <p className="text-xs text-content-subtle">
              {record.source.sheet} · fila {record.source.row} · regla{' '}
              {record.classificationVersion}
            </p>
          </div>
          <Button variant="ghost" onClick={onClose} aria-label="Cerrar panel de resolución">
            <X className="h-4 w-4" aria-hidden />
          </Button>
        </div>

        {resolution?.isObsolete ? (
          <div className="mt-4 rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-tone-amber">
            {resolution.obsoleteReason}
          </div>
        ) : null}

        <section className="mt-5 rounded-xl border border-overlay/8 p-4">
          <h3 className="text-sm font-medium text-content-strong">
            Evidencia original — solo lectura
          </h3>
          <dl className="mt-3 grid gap-3 text-xs sm:grid-cols-2">
            <Data label="Entidad reportante" value={record.entityName ?? '—'} />
            <Data label="Identificación" value={maskDocument(record.reportingEntityDocument)} />
            <Data
              label="Detalle original"
              value={record.conceptLabel ?? record.conceptCode ?? '—'}
            />
            <Data
              label="Valor original"
              value={`${originalValue === null || originalValue === undefined ? '—' : String(originalValue)} (${record.reportedValue === null ? 'no numérico' : formatCurrencyCOP(record.reportedValue)})`}
            />
            <Data
              label="Uso sugerido original"
              value={record.suggestedUse?.originalText ?? 'No disponible'}
            />
            <Data label="Coincidencia de identidad" value={record.identityMatch} />
          </dl>
        </section>

        <section className="mt-4 rounded-xl border border-overlay/8 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-medium text-content-strong">Clasificación</h3>
            <Badge tone={record.confidence === 'low' ? 'amber' : 'cyan'}>
              Confianza automática: {record.confidence}
            </Badge>
          </div>
          <p className="mt-2 text-xs text-content-subtle">
            Automática: {CATEGORY_LABEL[automatic.category]} · {NATURE_LABEL[automatic.nature]} ·{' '}
            {TREATMENT_LABEL[automatic.treatment]}
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Select
              label="Categoría final"
              value={classification.category}
              options={TaxCategorySchema.options.map((value) => ({
                value,
                label: CATEGORY_LABEL[value],
              }))}
              onChange={(value) =>
                setClassification({
                  ...classification,
                  category: value as ClassificationSnapshot['category'],
                })
              }
            />
            <Select
              label="Naturaleza final"
              value={classification.nature}
              options={TaxNatureSchema.options.map((value) => ({
                value,
                label: NATURE_LABEL[value],
              }))}
              onChange={(value) =>
                setClassification({
                  ...classification,
                  nature: value as ClassificationSnapshot['nature'],
                })
              }
            />
            <Select
              label="Tratamiento final"
              value={classification.treatment}
              options={TaxTreatmentSchema.options.map((value) => ({
                value,
                label: TREATMENT_LABEL[value],
              }))}
              onChange={(value) =>
                setClassification({
                  ...classification,
                  treatment: value as ClassificationSnapshot['treatment'],
                })
              }
            />
            <Select
              label="Confianza final"
              value={classification.confidence}
              options={TaxConfidenceSchema.options.map((value) => ({ value, label: value }))}
              onChange={(value) =>
                setClassification({
                  ...classification,
                  confidence: value as ClassificationSnapshot['confidence'],
                })
              }
            />
          </div>
          <div className="mt-3 text-xs text-content-subtle">
            Evidencias utilizadas:{' '}
            {automatic.evidence.length
              ? automatic.evidence.map((item) => `${item.kind}: ${item.value}`).join(' · ')
              : 'ninguna evidencia concluyente'}
          </div>
        </section>

        <section className="mt-4 rounded-xl border border-overlay/8 p-4">
          <h3 className="text-sm font-medium text-content-strong">Relaciones</h3>
          {related.length ? (
            <ul className="mt-2 space-y-2 text-xs text-content-muted">
              {related.map((item) => {
                const otherId =
                  item.sourceRecordId === recordId ? item.targetRecordId : item.sourceRecordId;
                const other = result.normalizedRecords.find(
                  (candidate) => candidate.id === otherId,
                );
                return (
                  <li key={item.id} className="rounded-lg border border-overlay/5 p-2">
                    {RELATION_LABEL[item.type]} · fila {other?.source.row ?? '—'} · confianza{' '}
                    {item.confidence} ·{' '}
                    {item.evidence.map((evidence) => evidence.description).join(' ')}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-content-subtle">Sin relaciones detectadas.</p>
          )}
        </section>

        <section className="mt-4 space-y-3 rounded-xl border border-overlay/8 p-4">
          <label className="block text-xs text-content-muted">
            Observación
            <textarea
              value={observation}
              onChange={(event) => setObservation(event.target.value)}
              className="mt-1 min-h-20 w-full rounded-lg border border-overlay/12 bg-overlay/5 p-2 text-sm text-content-strong"
            />
          </label>
          <label className="block text-xs text-content-muted">
            Justificación
            <textarea
              value={justification}
              onChange={(event) => setJustification(event.target.value)}
              className="mt-1 min-h-20 w-full rounded-lg border border-overlay/12 bg-overlay/5 p-2 text-sm text-content-strong"
            />
          </label>
          {error ? (
            <p role="alert" className="text-sm text-tone-rose">
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={saving}
              onClick={() =>
                void apply({
                  status: 'analyst_confirmed',
                  finalClassification: automatic,
                  ...common,
                })
              }
            >
              Confirmar propuesta
            </Button>
            <Button
              disabled={saving}
              variant="secondary"
              onClick={() =>
                void apply({
                  status: 'analyst_modified',
                  finalClassification: classification,
                  ...common,
                })
              }
            >
              Guardar clasificación
            </Button>
            <Button
              disabled={saving}
              variant="secondary"
              onClick={() =>
                void apply({
                  status: 'pending_review',
                  finalClassification: classification,
                  ...common,
                })
              }
            >
              Marcar pendiente
            </Button>
            <Button
              disabled={saving}
              variant="secondary"
              onClick={() =>
                void apply({
                  status: 'analyst_modified',
                  finalClassification: {
                    category: 'informational',
                    nature: 'informational',
                    treatment: 'do_not_aggregate',
                    confidence: 'high',
                    evidence: classification.evidence,
                  },
                  ...common,
                })
              }
            >
              Marcar informativo
            </Button>
            <Button
              disabled={saving}
              variant="secondary"
              onClick={() =>
                void apply({
                  status: 'excluded_justified',
                  finalClassification: classification,
                  ...common,
                })
              }
            >
              Excluir del consolidado
            </Button>
            <Button
              disabled={saving}
              variant="ghost"
              onClick={() =>
                void apply({
                  status: 'ignored_justified',
                  finalClassification: classification,
                  ...common,
                })
              }
            >
              Ignorar hallazgo
            </Button>
            <Button
              disabled={saving}
              variant="ghost"
              onClick={async () => {
                setSaving(true);
                setError(null);
                try {
                  await restoreAutomaticClassification(caseId, recordId, observation);
                } catch (caught) {
                  setError(caught instanceof Error ? caught.message : 'No se pudo restaurar.');
                } finally {
                  setSaving(false);
                }
              }}
            >
              Restaurar automática
            </Button>
          </div>
        </section>

        <section className="mt-4 rounded-xl border border-overlay/8 p-4">
          <h3 className="text-sm font-medium text-content-strong">Historial de decisiones</h3>
          {resolution?.history.length ? (
            <ol className="mt-2 space-y-2 text-xs text-content-muted">
              {[...resolution.history].reverse().map((decision) => (
                <li key={decision.id} className="border-l border-accent-cyan/30 pl-3">
                  <span className="text-content">{RESOLUTION_LABEL[decision.status]}</span> ·{' '}
                  {new Date(decision.decidedAt).toLocaleString('es-CO')}
                  {decision.justification ? (
                    <span className="block">{decision.justification}</span>
                  ) : null}
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-2 text-xs text-content-subtle">Sin decisiones manuales previas.</p>
          )}
        </section>
      </aside>
    </div>
  );
}

function Data({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-content-subtle">{label}</dt>
      <dd className="mt-1 break-words text-content">{value}</dd>
    </div>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="text-xs text-content-muted">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-lg border border-overlay/12 bg-surface-raised px-2 py-2 text-sm text-content-strong"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
