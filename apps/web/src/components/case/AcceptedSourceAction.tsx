'use client';

import { useMemo, useState } from 'react';
import { Database, ShieldAlert, X } from 'lucide-react';
import {
  ExogenousAcceptanceReasonSchema,
  OccasionalGainRecognitionSchema,
  type AcceptedExogenousValue,
  type DocumentaryRequirement,
  type ProcessingResult,
} from '@nexus-tax/domain';
import { Badge, Button, GlassPanel, formatCurrencyCOP } from '@nexus-tax/ui';
import { CATEGORY_LABEL } from '@/lib/analysisPresentation';
import {
  ACCEPTANCE_REASON_PRESENTATION,
  ACCEPTED_SOURCE_STATUS_PRESENTATION,
  OCCASIONAL_GAIN_PRESENTATION,
} from '@/lib/presentationCatalogs';
import { acceptExogenousValue, confirmAcceptedExogenousValue } from '@/lib/repository';
import { ModalPortal } from '@/components/ModalPortal';

export function AcceptedSourceAction({
  caseId,
  result,
  acceptedSources,
  requirement,
  compact = false,
}: {
  caseId: string;
  result?: ProcessingResult;
  acceptedSources: AcceptedExogenousValue[];
  requirement?: DocumentaryRequirement;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [recordId, setRecordId] = useState('');
  const [reason, setReason] =
    useState<(typeof ExogenousAcceptanceReasonSchema.options)[number]>('document_unavailable');
  const [observation, setObservation] = useState('');
  const [recognition, setRecognition] = useState<
    (typeof OccasionalGainRecognitionSchema.options)[number] | ''
  >('');
  const [beneficiaryAlias, setBeneficiaryAlias] = useState('');
  const [includeInMatrix, setIncludeInMatrix] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const candidates = useMemo(() => {
    const records = (result?.normalizedRecords ?? []).filter(
      (record) => record.reportedValue !== null,
    );
    if (!requirement) return records;
    const matching = records.filter((record) => record.entityName === requirement.entityName);
    return matching.length ? matching : records;
  }, [result, requirement]);
  const selected = candidates.find((record) => record.id === recordId) ?? candidates[0];
  const entity = result?.entities.find(
    (item) =>
      item.name === selected?.entityName ||
      (item.taxId && item.taxId === selected?.reportingEntityDocument),
  );
  const isOccasionalGain = selected?.category === 'occasional_gain';

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!selected) return setError('Selecciona un registro con valor reportado.');
    setSaving(true);
    setError(null);
    try {
      await acceptExogenousValue(caseId, {
        exogenousRecordId: selected.id,
        requirementId: requirement?.id ?? null,
        entityId: entity?.id ?? null,
        reason,
        observation,
        includedInMatrix: includeInMatrix,
        occasionalGainRecognition: isOccasionalGain ? recognition || 'requires_review' : null,
        beneficiaryAlias:
          recognition === 'collected_for_third_party' ? beneficiaryAlias || null : null,
      });
      setOpen(false);
      setObservation('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No fue posible guardar la decisión.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button
        variant="secondary"
        className={compact ? 'px-3 py-1.5 text-xs' : undefined}
        leadingIcon={<Database className="h-4 w-4" aria-hidden />}
        disabled={!candidates.length}
        onClick={() => {
          setRecordId(candidates[0]?.id ?? '');
          setOpen(true);
        }}
      >
        Usar valor de la exógena provisionalmente
      </Button>

      {open ? (
        <ModalPortal onClose={() => setOpen(false)}>
          <div
            className="fixed inset-0 z-50 grid place-items-center bg-surface-base/80 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="accepted-source-title"
            tabIndex={-1}
            autoFocus
          >
            <GlassPanel className="max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto overscroll-contain p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2
                    id="accepted-source-title"
                    className="text-lg font-semibold text-content-strong"
                  >
                    Aceptar información exógena como fuente provisional
                  </h2>
                  <p className="mt-1 text-sm text-content-muted">
                    La decisión queda trazada y no convierte la conciliación en definitiva.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg p-2 text-content-muted hover:bg-overlay/10"
                  aria-label="Cerrar panel de aceptación"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </div>

              <form onSubmit={submit} className="mt-5 space-y-4">
                <Field label="Registro exógeno">
                  <select
                    value={selected?.id ?? ''}
                    onChange={(event) => setRecordId(event.target.value)}
                    className={inputClass}
                  >
                    {candidates.map((record) => (
                      <option className="bg-surface-raised" key={record.id} value={record.id}>
                        {record.entityName} · {record.conceptLabel ?? 'Concepto sin etiqueta'} ·
                        fila {record.source.row}
                      </option>
                    ))}
                  </select>
                </Field>

                {selected ? (
                  <dl className="grid gap-3 rounded-xl border border-overlay/10 bg-overlay/[0.03] p-4 text-xs sm:grid-cols-2">
                    <Data
                      label="Entidad"
                      value={selected.entityName || 'Entidad sin identificar'}
                    />
                    <Data
                      label="Concepto"
                      value={selected.conceptLabel ?? 'Concepto sin etiqueta'}
                    />
                    <Data label="Valor" value={formatCurrencyCOP(selected.reportedValue ?? 0)} />
                    <Data
                      label="Origen"
                      value={`${selected.source.sheet} · fila ${selected.source.row}`}
                    />
                    <Data label="Categoría" value={CATEGORY_LABEL[selected.category]} />
                    <Data
                      label="Requisito relacionado"
                      value={requirement?.documentName ?? 'Sin requisito asociado'}
                    />
                    <Data
                      label="Estado documental"
                      value={requirement ? 'Sin soporte confirmado' : 'Por revisar'}
                    />
                    <Data
                      label="Impacto en la matriz"
                      value={
                        includeInMatrix
                          ? 'Se conserva una sola vez como provisional'
                          : 'No se incluirá por esta decisión'
                      }
                    />
                  </dl>
                ) : null}

                <Field label="Motivo">
                  <select
                    value={reason}
                    onChange={(event) => setReason(event.target.value as typeof reason)}
                    className={inputClass}
                  >
                    {ExogenousAcceptanceReasonSchema.options.map((option) => (
                      <option className="bg-surface-raised" key={option} value={option}>
                        {ACCEPTANCE_REASON_PRESENTATION[option].label}
                      </option>
                    ))}
                  </select>
                  <Help>{ACCEPTANCE_REASON_PRESENTATION[reason].description}</Help>
                </Field>

                {isOccasionalGain ? (
                  <div className="space-y-3 rounded-xl border border-tone-amber/25 bg-tone-amber/5 p-4">
                    <div>
                      <p className="text-sm font-medium text-content-strong">
                        Premio o ganancia ocasional sin certificado
                      </p>
                      <p className="text-xs text-content-muted">
                        Reconoce la operación sin asumir que todo el valor sea gravable.
                      </p>
                    </div>
                    <Field label="¿Reconoces esta operación?">
                      <select
                        value={recognition}
                        onChange={(event) =>
                          setRecognition(event.target.value as typeof recognition)
                        }
                        className={inputClass}
                        required
                      >
                        <option className="bg-surface-raised" value="">
                          Selecciona una respuesta
                        </option>
                        {OccasionalGainRecognitionSchema.options.map((option) => (
                          <option className="bg-surface-raised" key={option} value={option}>
                            {OCCASIONAL_GAIN_PRESENTATION[option].label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    {recognition === 'collected_for_third_party' ? (
                      <Field label="Alias o relación del beneficiario (opcional)">
                        <input
                          value={beneficiaryAlias}
                          onChange={(event) => setBeneficiaryAlias(event.target.value)}
                          className={inputClass}
                          placeholder="Ej. familiar A"
                        />
                        <Help>
                          No registres datos sensibles adicionales. La operación no se excluirá
                          automáticamente.
                        </Help>
                      </Field>
                    ) : null}
                  </div>
                ) : null}

                <Field label={reason === 'other' ? 'Observación obligatoria' : 'Observación'}>
                  <textarea
                    value={observation}
                    onChange={(event) => setObservation(event.target.value)}
                    className={`${inputClass} min-h-20`}
                    required={reason === 'other' || recognition === 'collected_for_third_party'}
                  />
                </Field>

                <label className="flex items-start gap-2 text-sm text-content-muted">
                  <input
                    type="checkbox"
                    checked={includeInMatrix}
                    onChange={(event) => setIncludeInMatrix(event.target.checked)}
                    className="mt-0.5"
                  />
                  <span>
                    Incluir provisionalmente en la matriz. El registro ya existente se anota; no se
                    suma de nuevo.
                  </span>
                </label>

                <div className="flex gap-2 rounded-xl border border-tone-amber/25 bg-tone-amber/5 p-3 text-xs text-content-muted">
                  <ShieldAlert className="h-4 w-4 shrink-0 text-tone-amber" aria-hidden />
                  La información exógena no reemplaza siempre el soporte. Esta acción no calcula un
                  impuesto definitivo.
                </div>
                {error ? (
                  <p role="alert" className="text-sm text-tone-rose">
                    {error}
                  </p>
                ) : null}
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={saving || !selected}>
                    {saving ? 'Guardando…' : 'Aceptar provisionalmente'}
                  </Button>
                </div>
              </form>
            </GlassPanel>
          </div>
        </ModalPortal>
      ) : null}

      {acceptedSources.length && !compact ? (
        <div className="mt-3 space-y-2">
          {acceptedSources.map((accepted) => (
            <div
              key={accepted.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-overlay/8 p-3 text-xs"
            >
              <span className="text-content">
                {accepted.originalConcept} · {formatCurrencyCOP(accepted.provisionalValue)}
              </span>
              <div className="flex items-center gap-2">
                <Badge tone={accepted.status === 'contradicted_by_document' ? 'rose' : 'amber'}>
                  {ACCEPTED_SOURCE_STATUS_PRESENTATION[accepted.status].label}
                </Badge>
                {accepted.status === 'provisionally_accepted' ? (
                  <Button
                    className="px-2 py-1 text-xs"
                    variant="ghost"
                    onClick={() => void confirmAcceptedExogenousValue(accepted.id)}
                  >
                    Confirmar como analista
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </>
  );
}

const inputClass =
  'mt-1 min-h-10 w-full rounded-lg border border-overlay/12 bg-overlay/5 px-3 py-2 text-sm text-content-strong';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs font-medium text-content-muted">
      {label}
      {children}
    </label>
  );
}

function Help({ children }: { children: React.ReactNode }) {
  return <span className="mt-1 block text-[11px] font-normal text-content-subtle">{children}</span>;
}

function Data({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-content-subtle">{label}</dt>
      <dd className="mt-0.5 text-content">{value}</dd>
    </div>
  );
}
