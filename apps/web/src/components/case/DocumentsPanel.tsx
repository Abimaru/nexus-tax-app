'use client';

import { useState } from 'react';
import { Download, FileArchive, HardDrive, ShieldCheck, Trash2, Upload } from 'lucide-react';
import {
  DOCUMENT_CATALOG,
  DocumentKindSchema,
  type CaseProduct,
  type ProcessingResult,
  type RequirementCoverage,
  type UploadedDocument,
} from '@nexus-tax/domain';
import { Badge, Button, EmptyState, GlassPanel, formatBytes } from '@nexus-tax/ui';
import { DOCUMENT_KIND_LABEL } from '@/lib/dossierPresentation';
import {
  addCaseDocument,
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
}: {
  caseId: string;
  taxYear: number;
  result?: ProcessingResult;
  documents: UploadedDocument[];
  products: CaseProduct[];
  coverages: RequirementCoverage[];
  localBytes: number;
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
  const [replacesDocumentId, setReplacesDocumentId] = useState('');
  const [covered, setCovered] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const catalog = DOCUMENT_CATALOG.find((entry) => entry.kind === kind)!;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!file) return setError('Selecciona un archivo.');
    setSaving(true);
    setError(null);
    try {
      await addCaseDocument(caseId, file, {
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
      setFile(null);
      setNotes('');
      setCovered([]);
      const input = document.getElementById('case-document-file') as HTMLInputElement | null;
      if (input) input.value = '';
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No fue posible registrar el documento.');
    } finally {
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
          <div>
            <h2 className="text-lg font-semibold text-content-strong">
              Biblioteca documental local
            </h2>
            <p className="mt-1 text-sm text-content-muted">
              {documents.length} documentos · {formatBytes(localBytes)} conservados localmente
            </p>
          </div>
          <Badge tone="emerald">
            <ShieldCheck className="h-3.5 w-3.5" /> Sin envíos de red
          </Badge>
        </div>
        <div className="mt-4 rounded-xl border border-accent-cyan/25 bg-accent-cyan/5 p-3 text-xs text-content-muted">
          Tú decides si conservar el binario en IndexedDB. La contraseña nunca se guarda y las
          exportaciones excluyen archivos por defecto.
        </div>
        <form onSubmit={submit} className="mt-5 grid gap-3 lg:grid-cols-2">
          <Field label="Archivo">
            <input
              id="case-document-file"
              type="file"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className="block w-full text-sm text-content file:mr-3 file:rounded-lg file:border-0 file:bg-overlay/10 file:px-3 file:py-2 file:text-content-strong"
            />
          </Field>
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
          <Field label="Notas">
            <input
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className={inputClass}
              placeholder={catalog.description}
            />
          </Field>
          <div className="lg:col-span-2">
            <p className="text-xs font-medium text-content">Requisitos que cubre</p>
            <div className="mt-2 grid gap-2 md:grid-cols-2">
              {result?.requirements.map((requirement) => (
                <label
                  key={requirement.id}
                  className="flex items-start gap-2 rounded-lg border border-overlay/8 p-2 text-xs text-content-muted"
                >
                  <input
                    type="checkbox"
                    checked={covered.includes(requirement.id)}
                    onChange={(event) =>
                      setCovered(
                        event.target.checked
                          ? [...covered, requirement.id]
                          : covered.filter((id) => id !== requirement.id),
                      )
                    }
                  />
                  <span>
                    {requirement.entityName} · {requirement.documentName}
                  </span>
                </label>
              )) ?? (
                <span className="text-xs text-content-subtle">
                  Procesa una exógena para obtener recomendaciones.
                </span>
              )}
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs text-content-muted">
            <input
              type="checkbox"
              checked={requiresPassword}
              onChange={(event) => setRequiresPassword(event.target.checked)}
            />{' '}
            El archivo requiere contraseña (la contraseña no se solicita ni persiste)
          </label>
          <div className="flex justify-end">
            <Button type="submit" disabled={saving} leadingIcon={<Upload className="h-4 w-4" />}>
              {saving ? 'Registrando…' : 'Registrar documento'}
            </Button>
          </div>
          {error ? (
            <p role="alert" className="lg:col-span-2 text-sm text-tone-rose">
              {error}
            </p>
          ) : null}
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
            return (
              <GlassPanel key={item.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-medium text-content-strong">{item.fileName}</h3>
                    <p className="text-xs text-content-subtle">
                      {DOCUMENT_KIND_LABEL[item.kind]} · v{item.version} ·{' '}
                      {formatBytes(item.fileSizeBytes)}
                    </p>
                  </div>
                  <Badge tone={item.status === 'active' ? 'emerald' : 'neutral'}>
                    {item.status}
                  </Badge>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <Info label="Hash" value={`${item.sha256.slice(0, 12)}…`} />
                  <Info label="Persistencia" value={item.storageMode} />
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
                </div>
              </GlassPanel>
            );
          })}
        </div>
      )}
    </div>
  );
}

const inputClass =
  'w-full rounded-lg border border-overlay/12 bg-overlay/5 px-3 py-2 text-sm text-content-strong';
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="text-xs text-content-muted">
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
