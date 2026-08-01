'use client';

import { useState } from 'react';
import { BriefcaseBusiness, Plus, Trash2 } from 'lucide-react';
import type { EmploymentIncomeGroup, ProcessingResult, UploadedDocument } from '@nexus-tax/domain';
import { Badge, Button, GlassPanel, ProgressBar } from '@nexus-tax/ui';
import {
  addEmployerInstance,
  associateEmployerDocument,
  removeEmployerInstance,
  setEmployerInstanceStatus,
  updateEmployerInstance,
} from '@/lib/repository';

const STATUS_LABEL = {
  pending: 'Pendiente',
  partially_covered: 'Parcialmente cubierto',
  covered: 'Cubierto',
  not_applicable: 'No aplica',
  requires_review: 'Requiere revision',
} as const;

export function EmploymentIncomeGroupPanel({
  caseId,
  group,
  documents,
  result,
}: {
  caseId: string;
  group?: EmploymentIncomeGroup;
  documents: UploadedDocument[];
  result?: ProcessingResult;
}) {
  const [primaryByInstance, setPrimaryByInstance] = useState<Record<string, string>>({});
  const [complementByInstance, setComplementByInstance] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const activeDocuments = documents.filter((document) => document.status === 'active');

  async function run(action: () => Promise<unknown>) {
    setMessage('');
    try {
      await action();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No fue posible actualizar el grupo.');
    }
  }

  if (!group) {
    return (
      <GlassPanel className="border-accent-cyan/20 p-5">
        <div className="flex items-start gap-3">
          <BriefcaseBusiness className="mt-0.5 h-5 w-5 text-tone-cyan" />
          <div className="flex-1">
            <h2 className="font-semibold text-content-strong">Ingresos laborales y empleadores</h2>
            <p className="mt-1 text-sm text-content-muted">
              No se detectaron ingresos laborales. Si recibiste este tipo de ingreso, crea la
              primera instancia para iniciar la conciliacion.
            </p>
            <Button
              className="mt-4"
              leadingIcon={<Plus className="h-4 w-4" />}
              onClick={() => void run(() => addEmployerInstance(caseId))}
            >
              Indicar que recibi ingresos laborales
            </Button>
          </div>
        </div>
      </GlassPanel>
    );
  }

  const activeInstances = group.instances.filter((item) => item.status !== 'not_applicable');
  const coveredWeight = activeInstances.reduce(
    (sum, item) =>
      sum + (item.status === 'covered' ? 1 : item.status === 'partially_covered' ? 0.5 : 0),
    0,
  );
  return (
    <GlassPanel className="border-accent-cyan/20 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-semibold text-content-strong">
            <BriefcaseBusiness className="h-5 w-5 text-tone-cyan" /> {group.title}
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-content-muted">
            La primera instancia es requerida para completar la conciliacion de ingresos laborales
            del expediente. Las adicionales solo existen cuando se detectan o las agregas.
          </p>
        </div>
        <Badge
          tone={
            group.coverage === 'covered'
              ? 'emerald'
              : group.coverage === 'requires_review'
                ? 'rose'
                : 'amber'
          }
        >
          {group.coverage === 'covered'
            ? 'Grupo cubierto'
            : group.coverage === 'requires_review'
              ? 'En revision'
              : group.coverage === 'partial'
                ? 'Cobertura parcial'
                : 'Pendiente'}
        </Badge>
      </div>
      <div className="mt-4 max-w-md">
        <ProgressBar
          ratio={activeInstances.length ? coveredWeight / activeInstances.length : 0}
          label={`${activeInstances.length} empleador(es) activo(s)`}
        />
      </div>
      {group.findings.map((finding) => (
        <p
          key={finding.id}
          className="mt-3 rounded-lg border border-accent-blue/20 bg-accent-blue/5 p-3 text-sm text-content"
        >
          {finding.message}
        </p>
      ))}
      {message ? (
        <p role="alert" className="mt-3 text-sm text-tone-rose">
          {message}
        </p>
      ) : null}

      <div className="mt-5 space-y-4">
        {group.instances.map((instance, index) => {
          const primaryId = primaryByInstance[instance.id] ?? instance.form220DocumentId ?? '';
          const primaryDocument = documents.find((document) => document.id === primaryId);
          return (
            <section key={instance.id} className="rounded-xl border border-overlay/10 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="font-medium text-content-strong">
                    Empleador {index + 1}
                    {index === 0 ? ' · instancia principal' : ''}
                  </h3>
                  <p className="text-xs text-content-subtle">
                    {instance.source === 'detected'
                      ? 'Detectado en la exogena'
                      : 'Agregado manualmente'}
                    {instance.taxIdMasked ? ` · ${instance.taxIdMasked}` : ''}
                  </p>
                </div>
                <Badge
                  tone={
                    instance.status === 'covered'
                      ? 'emerald'
                      : instance.status === 'requires_review'
                        ? 'rose'
                        : 'amber'
                  }
                >
                  {STATUS_LABEL[instance.status]}
                </Badge>
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                <Field label="Nombre del empleador">
                  <input
                    defaultValue={instance.employerName}
                    onBlur={(event) =>
                      void run(() =>
                        updateEmployerInstance(caseId, instance.id, {
                          employerName: event.target.value.trim(),
                        }),
                      )
                    }
                    className={inputClass}
                  />
                </Field>
                <Field label="Periodo trabajado">
                  <input
                    defaultValue={instance.workedPeriod}
                    placeholder="Ej. enero a diciembre"
                    onBlur={(event) =>
                      void run(() =>
                        updateEmployerInstance(caseId, instance.id, {
                          workedPeriod: event.target.value.trim(),
                        }),
                      )
                    }
                    className={inputClass}
                  />
                </Field>
                <Field label="Entidad exogena asociada" className="md:col-span-2">
                  <select
                    value={instance.entityId ?? ''}
                    onChange={(event) => {
                      const entity = result?.entities.find(
                        (item) => item.id === event.target.value,
                      );
                      void run(() =>
                        updateEmployerInstance(caseId, instance.id, {
                          entityId: entity?.id ?? null,
                          employerName: entity?.name ?? instance.employerName,
                          manualMatchConfirmed: Boolean(entity),
                        }),
                      );
                    }}
                    className={inputClass}
                  >
                    <option className="bg-surface-raised" value="">
                      Sin asociar
                    </option>
                    {result?.entities.map((entity) => (
                      <option className="bg-surface-raised" key={entity.id} value={entity.id}>
                        {entity.name}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="mt-4 grid gap-2 md:grid-cols-[1fr_auto]">
                <select
                  aria-label={`Formulario 220 para empleador ${index + 1}`}
                  value={primaryId}
                  onChange={(event) =>
                    setPrimaryByInstance((current) => ({
                      ...current,
                      [instance.id]: event.target.value,
                    }))
                  }
                  className={inputClass}
                >
                  <option className="bg-surface-raised" value="">
                    Selecciona Formulario 220
                  </option>
                  {activeDocuments
                    .filter((document) =>
                      ['form_220', 'consolidated_tax_certificate'].includes(document.kind),
                    )
                    .map((document) => (
                      <option className="bg-surface-raised" key={document.id} value={document.id}>
                        {document.fileName}
                      </option>
                    ))}
                </select>
                <Button
                  variant="secondary"
                  disabled={!primaryId}
                  onClick={() => {
                    const consolidated = primaryDocument?.kind === 'consolidated_tax_certificate';
                    if (
                      consolidated &&
                      !window.confirm(
                        'Este certificado no reemplaza automaticamente el Formulario 220. ¿Confirmas la decision expresa del analista?',
                      )
                    )
                      return;
                    void run(() =>
                      associateEmployerDocument(caseId, instance.id, primaryId, {
                        allowConsolidatedAsPrimary: consolidated,
                      }),
                    );
                  }}
                >
                  Asociar principal
                </Button>
              </div>
              <p className="mt-1 text-xs text-tone-amber">
                Un certificado consolidado solo puede sustituir el Formulario 220 por decision
                expresa del analista.
              </p>

              <div className="mt-3 grid gap-2 md:grid-cols-[1fr_auto]">
                <select
                  aria-label={`Documento complementario para empleador ${index + 1}`}
                  value={complementByInstance[instance.id] ?? ''}
                  onChange={(event) =>
                    setComplementByInstance((current) => ({
                      ...current,
                      [instance.id]: event.target.value,
                    }))
                  }
                  className={inputClass}
                >
                  <option className="bg-surface-raised" value="">
                    Documento complementario
                  </option>
                  {activeDocuments
                    .filter((document) => document.kind !== 'form_220')
                    .map((document) => (
                      <option className="bg-surface-raised" key={document.id} value={document.id}>
                        {document.fileName}
                      </option>
                    ))}
                </select>
                <Button
                  variant="ghost"
                  disabled={!complementByInstance[instance.id]}
                  onClick={() =>
                    void run(() =>
                      associateEmployerDocument(
                        caseId,
                        instance.id,
                        complementByInstance[instance.id]!,
                        { complementary: true },
                      ),
                    )
                  }
                >
                  Agregar complemento
                </Button>
              </div>
              <p className="mt-2 text-xs text-content-subtle">
                Principal:{' '}
                {documents.find((item) => item.id === instance.form220DocumentId)?.fileName ??
                  'pendiente'}{' '}
                · Complementarios: {instance.complementaryDocumentIds.length}
              </p>
              <Field label="Observaciones" className="mt-3 block">
                <textarea
                  defaultValue={instance.observations}
                  rows={2}
                  onBlur={(event) =>
                    void run(() =>
                      updateEmployerInstance(caseId, instance.id, {
                        observations: event.target.value.trim(),
                      }),
                    )
                  }
                  className={inputClass}
                />
              </Field>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  variant="ghost"
                  onClick={() =>
                    void run(() => setEmployerInstanceStatus(caseId, instance.id, 'not_applicable'))
                  }
                >
                  Marcar no aplica
                </Button>
                <Button
                  variant="danger"
                  leadingIcon={<Trash2 className="h-4 w-4" />}
                  onClick={() => void run(() => removeEmployerInstance(caseId, instance.id))}
                >
                  Eliminar
                </Button>
              </div>
            </section>
          );
        })}
      </div>
      <Button
        className="mt-4"
        variant="secondary"
        disabled={group.instances.length >= 3}
        leadingIcon={<Plus className="h-4 w-4" />}
        onClick={() => void run(() => addEmployerInstance(caseId))}
      >
        Agregar otro empleador ({group.instances.length}/3)
      </Button>
    </GlassPanel>
  );
}

function Field({
  label,
  className = '',
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`text-xs text-content-muted ${className}`}>
      {label}
      {children}
    </label>
  );
}

const inputClass =
  'mt-1 w-full rounded-lg border border-overlay/12 bg-overlay/5 px-3 py-2 text-sm text-content-strong';
