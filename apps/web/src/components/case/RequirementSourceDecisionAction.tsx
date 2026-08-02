'use client';

import { useState } from 'react';
import { Building2, X } from 'lucide-react';
import {
  RequirementAvailabilityStatusSchema,
  RequirementManagementChannelSchema,
  type AcceptedExogenousValue,
  type DocumentaryRequirement,
  type RequirementSourceDecision,
  type UploadedDocument,
} from '@nexus-tax/domain';
import { Badge, Button, GlassPanel } from '@nexus-tax/ui';
import {
  MANAGEMENT_CHANNEL_PRESENTATION,
  REQUIREMENT_AVAILABILITY_PRESENTATION,
} from '@/lib/presentationCatalogs';
import { saveRequirementSourceDecision } from '@/lib/repository';

export function RequirementSourceDecisionAction({
  caseId,
  requirement,
  documents,
  decision,
  acceptedSources,
}: {
  caseId: string;
  requirement: DocumentaryRequirement;
  documents: UploadedDocument[];
  decision?: RequirementSourceDecision;
  acceptedSources: AcceptedExogenousValue[];
}) {
  const [open, setOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [reason, setReason] = useState(
    decision?.reason ?? 'La entidad informó que no expide este soporte.',
  );
  const [managedAt, setManagedAt] = useState(
    decision?.managedAt ?? new Date().toISOString().slice(0, 10),
  );
  const [channel, setChannel] = useState<
    (typeof RequirementManagementChannelSchema.options)[number]
  >(decision?.channel ?? 'not_attempted');
  const [status, setStatus] = useState<
    (typeof RequirementAvailabilityStatusSchema.options)[number]
  >(decision?.status ?? 'justified_unavailable');
  const [observation, setObservation] = useState(decision?.observation ?? '');
  const [evidenceDocumentId, setEvidenceDocumentId] = useState(decision?.evidenceDocumentId ?? '');
  const [acceptedSourceId, setAcceptedSourceId] = useState(decision?.acceptedSourceId ?? '');
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!confirmed)
      return setError('Confirma que el soporte es relevante pero la entidad no lo emite.');
    try {
      await saveRequirementSourceDecision(caseId, {
        requirementId: requirement.id,
        status,
        reason,
        managedAt,
        channel,
        observation,
        evidenceDocumentId: evidenceDocumentId || null,
        acceptedSourceId: acceptedSourceId || null,
      });
      setOpen(false);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No fue posible guardar la gestión.');
    }
  }

  return (
    <>
      {decision ? (
        <Badge tone={decision.status === 'requires_review' ? 'amber' : 'violet'}>
          {REQUIREMENT_AVAILABILITY_PRESENTATION[decision.status].label}
        </Badge>
      ) : null}
      <Button
        variant="ghost"
        className="px-2 py-1 text-xs"
        onClick={() => setOpen(true)}
        leadingIcon={<Building2 className="h-3.5 w-3.5" aria-hidden />}
      >
        La entidad no emite este soporte
      </Button>
      {open ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-surface-base/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`no-document-${requirement.id}`}
        >
          <GlassPanel className="max-h-[92vh] w-full max-w-xl overflow-y-auto p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2
                  id={`no-document-${requirement.id}`}
                  className="text-lg font-semibold text-content-strong"
                >
                  La entidad no emite este soporte
                </h2>
                <p className="mt-1 text-sm text-content-muted">
                  {requirement.entityName} · {requirement.documentName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar gestión del requisito"
                className="rounded-lg p-2 text-content-muted hover:bg-overlay/10"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <form onSubmit={submit} className="mt-5 space-y-3">
              <Field label="Motivo">
                <input
                  className={inputClass}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  required
                />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Fecha de gestión">
                  <input
                    className={inputClass}
                    type="date"
                    value={managedAt}
                    onChange={(event) => setManagedAt(event.target.value)}
                    required
                  />
                </Field>
                <Field label="Canal utilizado">
                  <select
                    className={inputClass}
                    value={channel}
                    onChange={(event) => setChannel(event.target.value as typeof channel)}
                  >
                    {RequirementManagementChannelSchema.options.map((option) => (
                      <option className="bg-surface-raised" key={option} value={option}>
                        {MANAGEMENT_CHANNEL_PRESENTATION[option].label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Resultado para el requisito">
                <select
                  className={inputClass}
                  value={status}
                  onChange={(event) => setStatus(event.target.value as typeof status)}
                >
                  {RequirementAvailabilityStatusSchema.options.map((option) => (
                    <option className="bg-surface-raised" key={option} value={option}>
                      {REQUIREMENT_AVAILABILITY_PRESENTATION[option].label}
                    </option>
                  ))}
                </select>
                <Help>{REQUIREMENT_AVAILABILITY_PRESENTATION[status].description}</Help>
              </Field>
              <Field label="Evidencia opcional de la gestión">
                <select
                  className={inputClass}
                  value={evidenceDocumentId}
                  onChange={(event) => setEvidenceDocumentId(event.target.value)}
                >
                  <option className="bg-surface-raised" value="">
                    Sin documento asociado
                  </option>
                  {documents
                    .filter((item) => item.status === 'active')
                    .map((item) => (
                      <option className="bg-surface-raised" key={item.id} value={item.id}>
                        {item.fileName}
                      </option>
                    ))}
                </select>
              </Field>
              <Field label="Decisión sobre el valor exógeno">
                <select
                  className={inputClass}
                  value={acceptedSourceId}
                  onChange={(event) => setAcceptedSourceId(event.target.value)}
                >
                  <option className="bg-surface-raised" value="">
                    No usar un valor por ahora
                  </option>
                  {acceptedSources.map((item) => (
                    <option className="bg-surface-raised" key={item.id} value={item.id}>
                      {item.originalConcept} · {item.provisionalValue.toLocaleString('es-CO')}
                    </option>
                  ))}
                </select>
                <Help>
                  Vincularlo conserva la aceptación como fuente alternativa, no como documento
                  inexistente.
                </Help>
              </Field>
              <Field label="Observación">
                <textarea
                  className={`${inputClass} min-h-20`}
                  value={observation}
                  onChange={(event) => setObservation(event.target.value)}
                />
              </Field>
              <label className="flex items-start gap-2 text-sm text-content-muted">
                <input
                  className="mt-0.5"
                  type="checkbox"
                  checked={confirmed}
                  onChange={(event) => setConfirmed(event.target.checked)}
                />
                <span>
                  Confirmo que el requisito sí es relevante, pero el documento no existe o la
                  entidad no lo expide. No se marcará como “No aplica”.
                </span>
              </label>
              {error ? (
                <p role="alert" className="text-sm text-tone-rose">
                  {error}
                </p>
              ) : null}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Guardar gestión</Button>
              </div>
            </form>
          </GlassPanel>
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
