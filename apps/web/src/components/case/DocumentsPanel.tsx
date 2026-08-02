'use client';

import { useMemo, useRef, useState } from 'react';
import {
  Download,
  FileArchive,
  FileSearch,
  HardDrive,
  Library,
  ShieldCheck,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  DOCUMENT_CATALOG,
  DocumentKindSchema,
  type CaseProduct,
  type DocumentaryRequirement,
  type ProcessingResult,
  type RequirementCoverage,
  type UploadedDocument,
} from '@nexus-tax/domain';
import { Badge, Button, EmptyState, GlassPanel, formatBytes } from '@nexus-tax/ui';
import { DOCUMENT_KIND_LABEL } from '@/lib/dossierPresentation';
import {
  DOCUMENT_STATUS_PRESENTATION,
  DOCUMENT_STORAGE_PRESENTATION,
} from '@/lib/presentationCatalogs';
import { documentIcon, entityVisual, TONE_BOX_CLASS } from '@/lib/entityVisuals';
import { FileDropzone } from '@/components/FileDropzone';
import { processDocumentLocally } from '@/lib/documentProcessor';
import type { DocumentProgressEvent } from '@nexus-tax/document-intelligence';
import {
  addCaseDocument,
  deleteDocumentPermanently,
  getDocumentBinary,
  markDocumentObsolete,
  removeDocumentBinary,
} from '@/lib/repository';

export function DocumentsPanel({
  caseId,
  taxYear,
  result,
  documents,
  products,
  coverages,
  localBytes,
  onExtractionReady,
}: {
  caseId: string;
  taxYear: number;
  result?: ProcessingResult;
  documents: UploadedDocument[];
  products: CaseProduct[];
  coverages: RequirementCoverage[];
  localBytes: number;
  onExtractionReady?: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [kind, setKind] = useState<(typeof DocumentKindSchema.options)[number]>(
    'consolidated_tax_certificate',
  );
  const [storageMode, setStorageMode] = useState<'metadata_only' | 'store_locally' | 'do_not_keep'>(
    'metadata_only',
  );
  const [entityId, setEntityId] = useState('');
  const [productId, setProductId] = useState('');
  const [cutoffDate, setCutoffDate] = useState('');
  const [notes, setNotes] = useState('');
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [analyzePdf, setAnalyzePdf] = useState(true);
  const [progress, setProgress] = useState<DocumentProgressEvent | null>(null);
  const [pendingDocument, setPendingDocument] = useState<UploadedDocument | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [replacesDocumentId, setReplacesDocumentId] = useState('');
  const [covered, setCovered] = useState<string[]>([]);
  const [showCoveredRequirements, setShowCoveredRequirements] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletionError, setDeletionError] = useState<Record<string, string>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const catalog = DOCUMENT_CATALOG.find((entry) => entry.kind === kind)!;

  // Agrupa los requisitos por entidad para evitar la repetición del prefijo.
  const requirementGroups = useMemo(() => {
    const map = new Map<string, DocumentaryRequirement[]>();
    for (const requirement of result?.requirements ?? []) {
      const coveredByOther = coverages.some(
        (coverage) => coverage.requirementId === requirement.id && coverage.status === 'covered',
      );
      if (coveredByOther && !showCoveredRequirements && !covered.includes(requirement.id)) continue;
      const list = map.get(requirement.entityName) ?? [];
      list.push(requirement);
      map.set(requirement.entityName, list);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0], 'es'));
  }, [result?.requirements, coverages, covered, showCoveredRequirements]);
  const coveredByOtherCount = (result?.requirements ?? []).filter((requirement) =>
    coverages.some(
      (coverage) => coverage.requirementId === requirement.id && coverage.status === 'covered',
    ),
  ).length;
  const totalRequirementCount = result?.requirements.length ?? 0;
  const pendingRequirementCount = Math.max(totalRequirementCount - coveredByOtherCount, 0);

  function toggleRequirement(id: string, checked: boolean) {
    setCovered((current) => (checked ? [...current, id] : current.filter((item) => item !== id)));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!file) return setError('Selecciona un archivo.');
    setSaving(true);
    setError(null);
    let document = pendingDocument;
    try {
      document ??= await addCaseDocument(caseId, file, {
        kind,
        storageMode,
        entityIds: entityId ? [entityId] : [],
        productIds: productId ? [productId] : [],
        taxYear,
        cutoffDate,
        notes,
        requiresPassword,
        replacesDocumentId: replacesDocumentId || undefined,
        coveredRequirementIds: covered,
      });
      if (analyzePdf && document.extension === 'pdf') {
        abortRef.current = new AbortController();
        await processDocumentLocally({
          document,
          file,
          password,
          forcedKind: kind,
          result,
          products,
          signal: abortRef.current.signal,
          onProgress: setProgress,
        });
        onExtractionReady?.();
      }
      setFile(null);
      setNotes('');
      setCovered([]);
      setPassword('');
      setProgress(null);
      setPendingDocument(null);
    } catch (caught) {
      if (document) setPendingDocument(document);
      setError(caught instanceof Error ? caught.message : 'No fue posible registrar el documento.');
    } finally {
      abortRef.current = null;
      setSaving(false);
    }
  }

  async function download(documentId: string) {
    const stored = await getDocumentBinary(documentId);
    if (!stored) return;
    const url = URL.createObjectURL(new Blob([stored.bytes], { type: stored.mimeType }));
    const anchor = window.document.createElement('a');
    anchor.href = url;
    anchor.download = stored.fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <GlassPanel className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent-violet/10 text-tone-violet">
              <Library className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-content-strong">
                Biblioteca documental local
              </h2>
              <p className="mt-0.5 text-sm text-content-muted">
                {documents.length} documento(s) · {formatBytes(localBytes)} conservados localmente
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {totalRequirementCount > 0 ? (
              <Badge tone={pendingRequirementCount === 0 ? 'emerald' : 'amber'}>
                {pendingRequirementCount === 0
                  ? `Todos los ${totalRequirementCount} requisitos cubiertos`
                  : `${pendingRequirementCount} de ${totalRequirementCount} requisitos por cubrir`}
              </Badge>
            ) : null}
            <Badge tone="emerald">
              <ShieldCheck className="h-3.5 w-3.5" /> Sin envíos de red
            </Badge>
          </div>
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-xl border border-accent-cyan/25 bg-accent-cyan/5 p-3 text-xs text-content-muted">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-tone-cyan" aria-hidden />
          <span>
            Tú decides si conservar el binario en IndexedDB. La contraseña nunca se guarda y las
            exportaciones excluyen archivos por defecto.
          </span>
        </div>

        <form onSubmit={submit} className="mt-5 space-y-4">
          <FileDropzone
            id="case-document-file"
            variant="document"
            file={file}
            onSelect={(selected) => {
              setFile(selected);
              setPendingDocument(null);
            }}
            onRemove={() => {
              setFile(null);
              setPendingDocument(null);
            }}
            allowedExtensions={catalog.acceptedExtensions}
            accept={catalog.acceptedExtensions.map((extension) => `.${extension}`).join(',')}
            maxSizeBytes={25 * 1024 * 1024}
            busy={saving}
            error={error}
          />

          {/* Metadatos */}
          <div className="grid gap-3 lg:grid-cols-2">
            <Field label="Tipo documental">
              <select
                value={kind}
                onChange={(event) => setKind(event.target.value as typeof kind)}
                className={inputClass}
              >
                {DocumentKindSchema.options.map((option) => (
                  <option className="bg-surface-raised" key={option} value={option}>
                    {DOCUMENT_KIND_LABEL[option]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Decisión de persistencia">
              <select
                aria-label="Decisión de persistencia"
                value={storageMode}
                onChange={(event) => setStorageMode(event.target.value as typeof storageMode)}
                className={inputClass}
              >
                <option className="bg-surface-raised" value="metadata_only">
                  Guardar solo metadatos
                </option>
                <option className="bg-surface-raised" value="store_locally">
                  Conservar archivo en este navegador
                </option>
                <option className="bg-surface-raised" value="do_not_keep">
                  No conservar el archivo
                </option>
              </select>
            </Field>
            <Field label="Entidad">
              <select
                value={entityId}
                onChange={(event) => setEntityId(event.target.value)}
                className={inputClass}
              >
                <option className="bg-surface-raised" value="">
                  Sin asociar
                </option>
                {result?.entities
                  .filter((entity) => catalog.compatibleEntityCategories.includes(entity.category))
                  .map((entity) => (
                    <option className="bg-surface-raised" key={entity.id} value={entity.id}>
                      {entity.name}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="Producto">
              <select
                value={productId}
                onChange={(event) => setProductId(event.target.value)}
                className={inputClass}
              >
                <option className="bg-surface-raised" value="">
                  Producto por identificar
                </option>
                {products.map((product) => (
                  <option className="bg-surface-raised" key={product.id} value={product.id}>
                    {product.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Fecha de corte">
              <input
                type="date"
                value={cutoffDate}
                onChange={(event) => setCutoffDate(event.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Reemplaza una versión">
              <select
                value={replacesDocumentId}
                onChange={(event) => setReplacesDocumentId(event.target.value)}
                className={inputClass}
              >
                <option className="bg-surface-raised" value="">
                  No reemplaza
                </option>
                {documents
                  .filter((item) => item.status === 'active')
                  .map((item) => (
                    <option className="bg-surface-raised" key={item.id} value={item.id}>
                      {item.fileName} · v{item.version}
                    </option>
                  ))}
              </select>
            </Field>
            <div className="lg:col-span-2">
              <Field label="Notas">
                <input
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  className={inputClass}
                  placeholder={catalog.description}
                />
              </Field>
            </div>
          </div>

          {/* Requisitos que cubre — agrupados por entidad */}
          <div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-content">Requisitos que cubre</p>
                <p className="mt-0.5 text-xs text-content-subtle">
                  Pendientes y parciales permanecen visibles. Los cubiertos por otros documentos se
                  ocultan por defecto.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {covered.length ? (
                  <Badge tone="cyan">{covered.length} seleccionado(s)</Badge>
                ) : null}
                {coveredByOtherCount ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="px-2 py-1 text-xs"
                    onClick={() => setShowCoveredRequirements((current) => !current)}
                  >
                    {showCoveredRequirements
                      ? 'Ocultar cubiertos'
                      : `Mostrar cubiertos (${coveredByOtherCount})`}
                  </Button>
                ) : null}
              </div>
            </div>
            {requirementGroups.length ? (
              <div className="mt-2 space-y-2">
                {requirementGroups.map(([entityName, entityRequirements]) => {
                  const visual = entityVisual(entityRequirements[0]!.entityCategory);
                  const Icon = visual.icon;
                  const selectedInGroup = entityRequirements.filter((requirement) =>
                    covered.includes(requirement.id),
                  ).length;
                  return (
                    <fieldset
                      key={entityName}
                      className="rounded-xl border border-overlay/8 bg-overlay/[0.015] p-3"
                    >
                      <legend className="flex w-full items-center gap-2 px-1">
                        <span
                          className={`grid h-7 w-7 place-items-center rounded-lg ${TONE_BOX_CLASS[visual.tone]}`}
                        >
                          <Icon className="h-4 w-4" aria-hidden />
                        </span>
                        <span className="text-sm font-medium text-content-strong">
                          {entityName}
                        </span>
                        <span className="ml-auto text-[11px] text-content-subtle">
                          {selectedInGroup}/{entityRequirements.length}
                        </span>
                      </legend>
                      <div className="mt-2 grid gap-1.5 md:grid-cols-2">
                        {entityRequirements.map((requirement) => {
                          const active = covered.includes(requirement.id);
                          const statuses = coverages
                            .filter((coverage) => coverage.requirementId === requirement.id)
                            .map((coverage) => coverage.status);
                          const coveredElsewhere = statuses.includes('covered') && !active;
                          const partial = statuses.includes('partial');
                          return (
                            <label
                              key={requirement.id}
                              className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs transition-colors motion-reduce:transition-none ${
                                active
                                  ? 'border-accent-cyan/40 bg-accent-cyan/8 text-content-strong'
                                  : coveredElsewhere
                                    ? 'cursor-not-allowed border-overlay/6 text-content-subtle opacity-70'
                                    : 'border-overlay/8 text-content-muted hover:bg-overlay/5'
                              }`}
                            >
                              <input
                                type="checkbox"
                                className="accent-accent-cyan"
                                checked={active}
                                disabled={coveredElsewhere}
                                onChange={(event) =>
                                  toggleRequirement(requirement.id, event.target.checked)
                                }
                              />
                              <span>{requirement.documentName}</span>
                              <Badge
                                className="ml-auto"
                                tone={
                                  active
                                    ? 'cyan'
                                    : coveredElsewhere
                                      ? 'emerald'
                                      : partial
                                        ? 'amber'
                                        : 'neutral'
                                }
                              >
                                {active
                                  ? 'Cubierto por este documento'
                                  : coveredElsewhere
                                    ? 'Cubierto por otro documento'
                                    : partial
                                      ? 'Parcial'
                                      : 'Pendiente'}
                              </Badge>
                            </label>
                          );
                        })}
                      </div>
                    </fieldset>
                  );
                })}
              </div>
            ) : (
              <p className="mt-2 text-xs text-content-subtle">
                Procesa una exógena para obtener recomendaciones.
              </p>
            )}
          </div>

          <label className="flex items-center gap-2 text-xs text-content-muted">
            <input
              type="checkbox"
              className="accent-accent-cyan"
              checked={requiresPassword}
              onChange={(event) => setRequiresPassword(event.target.checked)}
            />{' '}
            El archivo requiere contraseña
          </label>

          {file?.name.toLowerCase().endsWith('.pdf') ? (
            <div className="space-y-3 rounded-xl border border-accent-violet/20 bg-accent-violet/5 p-4">
              <label className="flex items-start gap-2 text-sm text-content">
                <input
                  type="checkbox"
                  className="mt-0.5 accent-accent-violet"
                  checked={analyzePdf}
                  onChange={(event) => setAnalyzePdf(event.target.checked)}
                />
                <span>
                  Analizar PDF después de registrarlo
                  <span className="mt-0.5 block text-xs text-content-muted">
                    El PDF se leerá únicamente en este navegador. Revisarás cada valor antes de
                    crear hechos.
                  </span>
                </span>
              </label>
              {requiresPassword && analyzePdf ? (
                <Field label="Contraseña temporal">
                  <input
                    type="password"
                    autoComplete="off"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className={inputClass}
                  />
                  <span className="mt-1 block text-[11px] text-content-subtle">
                    Solo vive en memoria durante este intento; no entra en IndexedDB ni en la
                    exportación.
                  </span>
                </Field>
              ) : null}
              {progress ? (
                <p
                  role="status"
                  className="inline-flex items-center gap-2 text-xs text-content-muted"
                >
                  <FileSearch className="h-4 w-4 text-tone-violet" aria-hidden />
                  {progress.message}
                </p>
              ) : null}
            </div>
          ) : null}

          {error ? (
            <p role="alert" className="text-sm text-tone-rose">
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap justify-end gap-2">
            {saving && abortRef.current ? (
              <Button type="button" variant="ghost" onClick={() => abortRef.current?.abort()}>
                Cancelar lectura
              </Button>
            ) : null}
            <Button
              type="submit"
              disabled={saving || !file}
              leadingIcon={<Upload className="h-4 w-4" />}
            >
              {saving
                ? progress
                  ? 'Analizando localmente…'
                  : 'Registrando…'
                : analyzePdf && file?.name.toLowerCase().endsWith('.pdf')
                  ? 'Registrar y analizar'
                  : 'Registrar documento'}
            </Button>
          </div>
        </form>
      </GlassPanel>

      {!documents.length ? (
        <EmptyState
          icon={<FileArchive className="h-8 w-8" />}
          title="Biblioteca vacía"
          description="Carga un soporte y decide explícitamente si conservas el archivo o solo sus metadatos."
        />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {documents.map((item) => {
            const relatedCoverage = coverages.filter((coverage) => coverage.documentId === item.id);
            const DocIcon = documentIcon(DOCUMENT_KIND_LABEL[item.kind]);
            return (
              <article key={item.id} aria-labelledby={`${item.id}-document-title`}>
                <GlassPanel className="h-full p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-overlay/10 bg-overlay/5 text-content-muted">
                        <DocIcon className="h-4 w-4" aria-hidden />
                      </span>
                      <div className="min-w-0">
                        <h3
                          id={`${item.id}-document-title`}
                          className="truncate font-medium text-content-strong"
                        >
                          {item.fileName}
                        </h3>
                        <p className="text-xs text-content-subtle">
                          {DOCUMENT_KIND_LABEL[item.kind]} · v{item.version} ·{' '}
                          {formatBytes(item.fileSizeBytes)}
                        </p>
                      </div>
                    </div>
                    <Badge tone={item.status === 'active' ? 'emerald' : 'neutral'}>
                      {DOCUMENT_STATUS_PRESENTATION[item.status].label}
                    </Badge>
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <Info label="Hash" value={`${item.sha256.slice(0, 12)}…`} />
                    <Info
                      label="Persistencia"
                      value={DOCUMENT_STORAGE_PRESENTATION[item.storageMode].label}
                    />
                    <Info
                      label="Coberturas"
                      value={`${relatedCoverage.filter((value) => value.status === 'covered').length} completas · ${relatedCoverage.filter((value) => value.status === 'partial').length} parciales`}
                    />
                    <Info label="Corte" value={item.cutoffDate ?? 'No informado'} />
                  </dl>
                  {item.requiresPassword ? (
                    <p className="mt-2 text-xs text-tone-amber">
                      Requiere contraseña; no fue almacenada.
                    </p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.storageMode === 'store_locally' ? (
                      <>
                        <Button
                          variant="secondary"
                          className="px-3 py-1.5 text-xs"
                          leadingIcon={<Download className="h-3.5 w-3.5" />}
                          onClick={() => void download(item.id)}
                        >
                          Descargar local
                        </Button>
                        <Button
                          variant="ghost"
                          className="px-3 py-1.5 text-xs"
                          leadingIcon={<Trash2 className="h-3.5 w-3.5" />}
                          onClick={() => void removeDocumentBinary(item.id)}
                        >
                          Eliminar archivo
                        </Button>
                      </>
                    ) : null}
                    <Button
                      variant="ghost"
                      className="px-3 py-1.5 text-xs"
                      leadingIcon={<HardDrive className="h-3.5 w-3.5" />}
                      onClick={() => void markDocumentObsolete(item.id)}
                    >
                      Marcar obsoleto
                    </Button>
                    <Button
                      variant="danger"
                      className="px-3 py-1.5 text-xs"
                      disabled={deletingId === item.id}
                      leadingIcon={<Trash2 className="h-3.5 w-3.5" />}
                      onClick={async () => {
                        if (
                          !window.confirm(
                            `Vas a eliminar definitivamente "${item.fileName}" y todo lo asociado (blob, candidatos, sesiones, coberturas). Los hechos manuales del analista se conservan pero pierden la referencia al documento. Esta acción es irreversible. ¿Continuar?`,
                          )
                        )
                          return;
                        setDeletingId(item.id);
                        setDeletionError((current) => {
                          const next = { ...current };
                          delete next[item.id];
                          return next;
                        });
                        try {
                          await deleteDocumentPermanently(item.id);
                        } catch (caught) {
                          const message =
                            caught instanceof Error
                              ? caught.message
                              : 'No fue posible eliminar el documento.';
                          console.error('deleteDocumentPermanently failed', caught);
                          setDeletionError((current) => ({ ...current, [item.id]: message }));
                        } finally {
                          setDeletingId((current) => (current === item.id ? null : current));
                        }
                      }}
                    >
                      {deletingId === item.id ? 'Eliminando…' : 'Eliminar definitivamente'}
                    </Button>
                  </div>
                  {deletionError[item.id] ? (
                    <p role="alert" className="mt-2 text-xs text-tone-rose">
                      {deletionError[item.id]}
                    </p>
                  ) : null}
                </GlassPanel>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

const inputClass =
  'w-full min-h-10 rounded-lg border border-overlay/12 bg-overlay/5 px-3 py-2 text-sm text-content-strong';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs text-content-muted">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-content-subtle">{label}</dt>
      <dd className="text-content">{value}</dd>
    </div>
  );
}
