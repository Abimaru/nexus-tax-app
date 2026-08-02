'use client';

import { useState } from 'react';
import {
  AlertTriangle,
  Briefcase,
  BriefcaseBusiness,
  FileCheck2,
  Paperclip,
  Plus,
  Trash2,
} from 'lucide-react';
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
  requires_review: 'Requiere revisión',
} as const;

type StatusTone = 'emerald' | 'rose' | 'amber' | 'neutral';

function statusTone(status: keyof typeof STATUS_LABEL): StatusTone {
  if (status === 'covered') return 'emerald';
  if (status === 'requires_review') return 'rose';
  if (status === 'not_applicable') return 'neutral';
  return 'amber';
}

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
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent-cyan/10 text-tone-cyan">
            <BriefcaseBusiness className="h-5 w-5" aria-hidden />
          </span>
          <div className="flex-1">
            <h2 className="font-semibold text-content-strong">Ingresos laborales y empleadores</h2>
            <p className="mt-1 text-sm text-content-muted">
              No se detectaron ingresos laborales. Si recibiste este tipo de ingreso, crea la
              primera instancia para iniciar la conciliación.
            </p>
            <Button
              className="mt-4"
              leadingIcon={<Plus className="h-4 w-4" />}
              onClick={() => void run(() => addEmployerInstance(caseId))}
            >
              Indicar que recibí ingresos laborales
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
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent-cyan/10 text-tone-cyan">
            <BriefcaseBusiness className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h2 className="font-semibold text-content-strong">{group.title}</h2>
            <p className="mt-1 max-w-3xl text-sm text-content-muted">
              La primera instancia es requerida para completar la conciliación de ingresos
              laborales. Las adicionales solo existen cuando se detectan o las agregas.
            </p>
          </div>
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
              ? 'En revisión'
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
          const currentPrimary = documents.find(
            (item) => item.id === instance.form220DocumentId,
          )?.fileName;
          const complementSelected = complementByInstance[instance.id] ?? '';
          return (
            <section
              key={instance.id}
              className="overflow-hidden rounded-2xl border border-overlay/10 bg-overlay/[0.015]"
            >
              {/* Cabecera de la instancia */}
              <header className="flex flex-wrap items-center justify-between gap-2 border-b border-overlay/8 p-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-lg border border-overlay/10 bg-overlay/5 text-tone-cyan">
                    <Briefcase className="h-4 w-4" aria-hidden />
                  </span>
                  <div>
                    <h3 className="font-medium text-content-strong">
                      Empleador {index + 1}
                      {index === 0 ? ' · instancia principal' : ''}
                    </h3>
                    <p className="text-xs text-content-subtle">
                      {instance.source === 'detected'
                        ? 'Detectado en la exógena'
                        : 'Agregado manualmente'}
                      {instance.taxIdMasked ? ` · ${instance.taxIdMasked}` : ''}
                    </p>
                  </div>
                </div>
                <Badge tone={statusTone(instance.status)}>{STATUS_LABEL[instance.status]}</Badge>
              </header>

              <div className="space-y-5 p-4">
                {/* Datos del empleador */}
                <div>
                  <SubHeader>Datos del empleador</SubHeader>
                  <div className="mt-2 grid gap-3 md:grid-cols-2">
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
                    <Field label="Entidad exógena asociada" className="md:col-span-2">
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
                </div>

                {/* Soporte principal: Formulario 220 */}
                <div>
                  <SubHeader>
                    <FileCheck2 className="h-3.5 w-3.5" aria-hidden /> Formulario 220 (principal)
                  </SubHeader>
                  <div className="mt-2 grid gap-2 md:grid-cols-[1fr_auto]">
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
                          <option
                            className="bg-surface-raised"
                            key={document.id}
                            value={document.id}
                          >
                            {document.fileName}
                          </option>
                        ))}
                    </select>
                    <Button
                      variant="secondary"
                      disabled={!primaryId}
                      leadingIcon={<FileCheck2 className="h-4 w-4" />}
                      onClick={() => {
                        const consolidated =
                          primaryDocument?.kind === 'consolidated_tax_certificate';
                        if (
                          consolidated &&
                          !window.confirm(
                            'Este certificado no reemplaza automáticamente el Formulario 220. ¿Confirmas la decisión expresa del analista?',
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
                  <p className="mt-2 flex items-start gap-1.5 rounded-lg border border-amber-400/20 bg-amber-400/5 px-2.5 py-1.5 text-xs text-tone-amber">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                    Un certificado consolidado solo puede sustituir el Formulario 220 por decisión
                    expresa del analista.
                  </p>
                  <p className="mt-2 text-xs">
                    <span className="text-content-subtle">Principal actual: </span>
                    {currentPrimary ? (
                      <span className="text-tone-emerald">{currentPrimary}</span>
                    ) : (
                      <span className="text-content-muted">pendiente</span>
                    )}
                  </p>
                </div>

                {/* Documentos complementarios */}
                <div>
                  <SubHeader>
                    <Paperclip className="h-3.5 w-3.5" aria-hidden /> Documentos complementarios (
                    {instance.complementaryDocumentIds.length})
                  </SubHeader>
                  <div className="mt-2 grid gap-2 md:grid-cols-[1fr_auto]">
                    <select
                      aria-label={`Documento complementario para empleador ${index + 1}`}
                      value={complementSelected}
                      onChange={(event) =>
                        setComplementByInstance((current) => ({
                          ...current,
                          [instance.id]: event.target.value,
                        }))
                      }
                      className={inputClass}
                    >
                      <option className="bg-surface-raised" value="">
                        Selecciona documento complementario
                      </option>
                      {activeDocuments
                        .filter((document) => document.kind !== 'form_220')
                        .map((document) => (
                          <option
                            className="bg-surface-raised"
                            key={document.id}
                            value={document.id}
                          >
                            {document.fileName}
                          </option>
                        ))}
                    </select>
                    <Button
                      variant="ghost"
                      disabled={!complementSelected}
                      leadingIcon={<Plus className="h-4 w-4" />}
                      onClick={() =>
                        void run(() =>
                          associateEmployerDocument(caseId, instance.id, complementSelected, {
                            complementary: true,
                          }),
                        )
                      }
                    >
                      Agregar
                    </Button>
                  </div>
                </div>

                <Field label="Observaciones" className="block">
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

                <div className="flex flex-wrap justify-end gap-2 border-t border-overlay/8 pt-3">
                  <Button
                    variant="ghost"
                    onClick={() =>
                      void run(() =>
                        setEmployerInstanceStatus(caseId, instance.id, 'not_applicable'),
                      )
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

function SubHeader({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-content-subtle">
      {children}
    </h4>
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
    <label className={`block text-xs text-content-muted ${className}`}>
      {label}
      {children}
    </label>
  );
}

const inputClass =
  'mt-1 w-full min-h-10 rounded-lg border border-overlay/12 bg-overlay/5 px-3 py-2 text-sm text-content-strong';
