'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  FileSearch,
  Info,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import {
  DocumentKindSchema,
  CandidateRejectionReasonSchema,
  TaxCategorySchema,
  type CaseProduct,
  type CandidateRejectionReason,
  type DocumentExtractionSession,
  type DocumentFactCandidate,
  type ProcessingResult,
  type UploadedDocument,
} from '@nexus-tax/domain';
import { Badge, Button, EmptyState, GlassPanel, formatCurrencyCOP } from '@nexus-tax/ui';
import { CATEGORY_LABEL } from '@/lib/analysisPresentation';
import { DOCUMENT_KIND_LABEL, PRODUCT_LABEL } from '@/lib/dossierPresentation';
import { processDocumentLocally } from '@/lib/documentProcessor';
import {
  correctExtractionClassification,
  associateDocumentCandidatesBulk,
  getDocumentBinary,
  restoreDocumentCandidate,
  restoreDocumentCandidatesBulk,
  reviewDocumentCandidate,
  reviewDocumentCandidatesBulk,
} from '@/lib/repository';

const STATUS_LABEL: Record<DocumentExtractionSession['status'], string> = {
  pending: 'Pendiente',
  reading: 'Leyendo',
  password_required: 'Requiere contraseña',
  classifying: 'Clasificando',
  extracting: 'Extrayendo',
  ready_for_review: 'Lista para revisar',
  partially_read: 'Lectura parcial',
  unsupported: 'No compatible',
  failed: 'Fallida',
  cancelled: 'Cancelada',
  confirmed: 'Confirmada',
};

const CONFIDENCE_LABEL = {
  high: 'Alta',
  medium: 'Media',
  low: 'Baja',
  insufficient: 'Insuficiente',
} as const;

const DISCARDED_STATUS = ['rejected', 'duplicate', 'informational', 'obsolete'] as const;

const DISCARDED_LABEL: Record<(typeof DISCARDED_STATUS)[number], string> = {
  rejected: 'Rechazado',
  duplicate: 'Duplicado',
  informational: 'Solo informativo',
  obsolete: 'Obsoleto',
};

const REJECTION_REASON_LABEL: Record<CandidateRejectionReason, string> = {
  not_tax_value: 'No es un valor tributario',
  header_as_value: 'Encabezado interpretado como dato',
  incorrect_value: 'Valor incorrecto',
  incorrect_concept: 'Concepto incorrecto',
  other_product: 'Pertenece a otro producto',
  incorrect_period: 'Periodo incorrecto',
  duplicate: 'Duplicado',
  informational: 'Solo informativo',
  represented_by_other: 'Ya está representado por otro candidato',
  other: 'Otro motivo',
};

function isDiscardedStatus(
  status: DocumentFactCandidate['status'],
): status is (typeof DISCARDED_STATUS)[number] {
  return DISCARDED_STATUS.some((discardedStatus) => discardedStatus === status);
}

export function DocumentExtractionReviewPanel({
  result,
  documents,
  products,
  sessions,
  candidates,
  onOpenReconciliations,
}: {
  result?: ProcessingResult;
  documents: UploadedDocument[];
  products: CaseProduct[];
  sessions: DocumentExtractionSession[];
  candidates: DocumentFactCandidate[];
  onOpenReconciliations: () => void;
}) {
  const [showHistory, setShowHistory] = useState(false);
  const latestSessions = useMemo(() => {
    const byDocument = new Map<string, DocumentExtractionSession>();
    for (const session of sessions) {
      const current = byDocument.get(session.documentId);
      if (!current || session.runNumber > current.runNumber)
        byDocument.set(session.documentId, session);
    }
    return [...byDocument.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [sessions]);
  const displayedSessions = showHistory
    ? [...sessions].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    : latestSessions;
  const historicalCount = Math.max(0, sessions.length - latestSessions.length);

  if (!latestSessions.length) {
    return (
      <EmptyState
        icon={<FileSearch className="h-8 w-8" />}
        title="Sin extracciones documentales"
        description="Carga un PDF textual desde Documentos y elige analizarlo localmente. Los candidatos aparecerán aquí antes de crear hechos."
      />
    );
  }

  return (
    <div className="space-y-5">
      <GlassPanel className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent-violet/10 text-tone-violet">
              <FileSearch className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-content-strong">Revisión de extracción</h2>
              <p className="mt-0.5 text-sm text-content-muted">
                Confirma, corrige o descarta cada propuesta antes de crear hechos documentales.
              </p>
            </div>
          </div>
          <Badge tone="emerald">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> Revisión humana obligatoria
          </Badge>
        </div>
        <p className="mt-4 rounded-xl border border-accent-cyan/20 bg-accent-cyan/5 p-3 text-xs text-content-muted">
          El texto completo, la contraseña y los buffers no se guardan. Un candidato por sí solo no
          alimenta la matriz.
        </p>
        {historicalCount ? (
          <Button
            className="mt-3"
            variant="ghost"
            onClick={() => setShowHistory((current) => !current)}
          >
            {showHistory
              ? 'Ocultar ejecuciones anteriores'
              : `Ver ejecuciones anteriores (${historicalCount})`}
          </Button>
        ) : null}
      </GlassPanel>

      {displayedSessions.map((session) => {
        const document = documents.find((item) => item.id === session.documentId);
        const currentCandidates = candidates.filter(
          (candidate) => candidate.extractionSessionId === session.id,
        );
        return (
          <ExtractionSessionCard
            key={session.id}
            session={session}
            document={document}
            candidates={currentCandidates}
            result={result}
            products={products}
            onOpenReconciliations={onOpenReconciliations}
          />
        );
      })}
    </div>
  );
}

function ExtractionSessionCard({
  session,
  document,
  candidates,
  result,
  products,
  onOpenReconciliations,
}: {
  session: DocumentExtractionSession;
  document?: UploadedDocument;
  candidates: DocumentFactCandidate[];
  result?: ProcessingResult;
  products: CaseProduct[];
  onOpenReconciliations: () => void;
}) {
  const proposedKind =
    session.classification?.correctedKind ?? session.classification?.proposedKind ?? 'other';
  const [kind, setKind] = useState(proposedKind);
  const [password, setPassword] = useState('');
  const [reprocessing, setReprocessing] = useState(false);
  const [showDiscarded, setShowDiscarded] = useState(false);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [pageFilter, setPageFilter] = useState('all');
  const [productFilter, setProductFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState('reject');
  const [bulkReason, setBulkReason] = useState<CandidateRejectionReason>('not_tax_value');
  const [bulkObservation, setBulkObservation] = useState('');
  const [bulkEntityId, setBulkEntityId] = useState('');
  const [bulkProductId, setBulkProductId] = useState('');
  const [bulkSaving, setBulkSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confirmed = candidates.filter((candidate) => candidate.factId).length;
  const discardedCandidates = candidates.filter((candidate) => isDiscardedStatus(candidate.status));
  const discarded = discardedCandidates.length;
  const filteredCandidates = candidates.filter((candidate) => {
    const statusMatches =
      statusFilter === 'all' ||
      (statusFilter === 'pending'
        ? ['pending', 'requires_review'].includes(candidate.status)
        : statusFilter === 'low_confidence'
          ? ['low', 'insufficient'].includes(candidate.confidence.level)
          : candidate.status === statusFilter);
    return (
      statusMatches &&
      (pageFilter === 'all' || candidate.page === Number(pageFilter)) &&
      (productFilter === 'all' || (candidate.productLabel ?? 'unidentified') === productFilter) &&
      (categoryFilter === 'all' || candidate.proposedCategory === categoryFilter)
    );
  });
  const pageCount = Math.max(1, Math.ceil(filteredCandidates.length / pageSize));
  const safePage = Math.min(currentPage, pageCount);
  const pageCandidates = filteredCandidates.slice((safePage - 1) * pageSize, safePage * pageSize);
  const detectedProducts = Array.from(
    new Set(candidates.map((candidate) => candidate.productLabel).filter(Boolean)),
  ) as string[];

  useEffect(() => setKind(proposedKind), [proposedKind]);
  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds([]);
  }, [statusFilter, pageFilter, productFilter, categoryFilter, pageSize]);

  async function applyBulkAction() {
    if (!selectedIds.length) return;
    if (bulkAction === 'reject' && bulkReason === 'other' && !bulkObservation.trim()) {
      setError('Explica el motivo cuando seleccionas Otro motivo.');
      return;
    }
    if (
      !window.confirm(
        `Se aplicará la acción a ${selectedIds.length} candidato(s). Las decisiones quedarán trazadas. ¿Continuar?`,
      )
    )
      return;
    setBulkSaving(true);
    setError(null);
    try {
      if (bulkAction === 'restore') await restoreDocumentCandidatesBulk(selectedIds);
      else if (bulkAction === 'associate_entity')
        await associateDocumentCandidatesBulk(selectedIds, { entityId: bulkEntityId || null });
      else if (bulkAction === 'associate_product')
        await associateDocumentCandidatesBulk(selectedIds, { productId: bulkProductId || null });
      else
        await reviewDocumentCandidatesBulk(selectedIds, {
          action:
            bulkAction === 'informational'
              ? 'informational'
              : bulkAction === 'duplicate'
                ? 'duplicate'
                : 'reject',
          rejectionReason: bulkAction === 'reject' ? bulkReason : null,
          observation: bulkObservation,
        });
      setSelectedIds([]);
      setBulkObservation('');
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'No fue posible aplicar la acción múltiple.',
      );
    } finally {
      setBulkSaving(false);
    }
  }

  async function saveKind() {
    await correctExtractionClassification(session.id, kind);
  }

  async function reprocess() {
    if (!document) return;
    setReprocessing(true);
    setError(null);
    try {
      await processDocumentLocally({ document, password, forcedKind: kind, result, products });
      setPassword('');
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'No fue posible reprocesar el documento.',
      );
    } finally {
      setReprocessing(false);
    }
  }

  return (
    <GlassPanel className="overflow-hidden p-0">
      <header className="border-b border-overlay/8 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-content-strong">
              {document?.fileName ?? 'Documento eliminado'}
            </h3>
            <p className="mt-1 text-xs text-content-muted">
              Ejecución {session.runNumber} · {session.pageCount} página(s) · {confirmed}/
              {candidates.length} candidatos convertidos en hechos
            </p>
          </div>
          <Badge
            tone={
              session.status === 'ready_for_review'
                ? 'cyan'
                : session.status === 'unsupported'
                  ? 'amber'
                  : 'neutral'
            }
          >
            {STATUS_LABEL[session.status]}
          </Badge>
        </div>

        {session.classification ? (
          <div className="mt-4 grid gap-3 rounded-xl border border-overlay/8 bg-overlay/[0.02] p-3 md:grid-cols-[1fr_auto]">
            <label className="text-xs text-content-muted">
              Tipo documental propuesto
              <select
                className={inputClass}
                value={kind}
                onChange={(event) => setKind(event.target.value as typeof kind)}
              >
                {DocumentKindSchema.options.map((option) => (
                  <option className="bg-surface-raised" key={option} value={option}>
                    {DOCUMENT_KIND_LABEL[option]}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-wrap items-end gap-2">
              <Button variant="secondary" onClick={() => void saveKind()}>
                Guardar tipo
              </Button>
              {document?.storageMode === 'store_locally' ? (
                <Button
                  onClick={() => void reprocess()}
                  disabled={reprocessing}
                  leadingIcon={<RefreshCw className="h-4 w-4" aria-hidden />}
                >
                  {reprocessing ? 'Reprocesando…' : 'Reprocesar'}
                </Button>
              ) : null}
            </div>
            <p className="text-xs text-content-subtle md:col-span-2">
              Confianza {CONFIDENCE_LABEL[session.classification.confidence].toLowerCase()}.{' '}
              {session.classification.supportingSignals[0] ?? 'Sin señales suficientes.'}
            </p>
          </div>
        ) : null}

        {detectedProducts.length ? (
          <div className="mt-3 rounded-xl border border-accent-cyan/15 bg-accent-cyan/[0.04] p-3">
            <p className="text-xs font-medium text-content">Productos detectados</p>
            <ul className="mt-2 flex flex-wrap gap-2" aria-label="Productos detectados">
              {detectedProducts.map((label) => (
                <li key={label}>
                  <Badge tone="cyan">{label}</Badge>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {session.status === 'password_required' ? (
          <label className="mt-3 block text-xs text-content-muted">
            Contraseña temporal
            <input
              type="password"
              autoComplete="off"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={inputClass}
            />
            <span className="mt-1 block text-content-subtle">
              Se usa solo para este intento y nunca se guarda.
            </span>
          </label>
        ) : null}
        {error ? (
          <p role="alert" className="mt-3 text-sm text-tone-rose">
            {error}
          </p>
        ) : null}
      </header>

      {session.metrics ? (
        <section
          className="border-b border-overlay/8 p-4 sm:p-5"
          aria-labelledby={`${session.id}-coverage`}
        >
          <h4 id={`${session.id}-coverage`} className="text-sm font-medium text-content-strong">
            Cobertura técnica del documento
          </h4>
          <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-5">
            <Data
              label="Páginas leídas"
              value={`${session.metrics.pagesProcessed}/${session.metrics.pagesTotal}`}
            />
            <Data label="Páginas con texto" value={String(session.metrics.pagesWithText)} />
            <Data label="Bloques detectados" value={String(session.metrics.blocksDetected)} />
            <Data
              label="Candidatos generados"
              value={String(session.metrics.candidatesGenerated)}
            />
            <Data
              label="Candidatos persistidos"
              value={String(session.metrics.candidatesPersisted)}
            />
          </dl>
          <p className="mt-2 text-xs text-content-subtle">
            {session.metrics.pagesWithCandidates} página(s) contienen candidatos ·{' '}
            {session.metrics.pagesWithoutCandidates} sin candidatos ·{' '}
            {session.metrics.sectionsDetected.length} sección(es) detectada(s). No es un porcentaje
            de precisión.
          </p>
        </section>
      ) : null}

      <section className="border-b border-overlay/8 p-4 sm:p-5" aria-label="Filtros de candidatos">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <Field label="Estado">
            <select
              className={inputClass}
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">Todos</option>
              <option value="pending">Pendientes</option>
              <option value="confirmed">Confirmados</option>
              <option value="corrected">Corregidos</option>
              <option value="rejected">Rechazados</option>
              <option value="duplicate">Duplicados</option>
              <option value="informational">Informativos</option>
              <option value="obsolete">Obsoletos</option>
              <option value="low_confidence">Baja confianza</option>
            </select>
          </Field>
          <Field label="Página PDF">
            <select
              className={inputClass}
              value={pageFilter}
              onChange={(event) => setPageFilter(event.target.value)}
            >
              <option value="all">Todas</option>
              {Array.from(new Set(candidates.map((candidate) => candidate.page)))
                .sort((a, b) => a - b)
                .map((page) => (
                  <option key={page} value={page}>
                    Página {page}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="Producto">
            <select
              className={inputClass}
              value={productFilter}
              onChange={(event) => setProductFilter(event.target.value)}
            >
              <option value="all">Todos</option>
              <option value="unidentified">Por identificar</option>
              {detectedProducts.map((product) => (
                <option key={product} value={product}>
                  {product}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Categoría">
            <select
              className={inputClass}
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
            >
              <option value="all">Todas</option>
              {TaxCategorySchema.options.map((category) => (
                <option key={category} value={category}>
                  {CATEGORY_LABEL[category]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Por página">
            <select
              className={inputClass}
              value={pageSize}
              onChange={(event) => setPageSize(Number(event.target.value))}
            >
              {[10, 20, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <Badge tone="neutral">Detectados {candidates.length}</Badge>
          <Badge tone="cyan">
            Pendientes{' '}
            {
              candidates.filter((candidate) =>
                ['pending', 'requires_review'].includes(candidate.status),
              ).length
            }
          </Badge>
          <Badge tone="emerald">Confirmados {confirmed}</Badge>
          <Badge tone="amber">Descartados {discarded}</Badge>
          <Badge tone="violet">
            Informativos{' '}
            {candidates.filter((candidate) => candidate.status === 'informational').length}
          </Badge>
        </div>
      </section>

      {session.findings.length ? (
        <ul className="space-y-2 border-b border-overlay/8 p-4 sm:p-5">
          {session.findings.map((finding, index) => (
            <li key={`${finding.code}:${index}`} className="flex gap-2 text-xs text-content-muted">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-tone-amber" aria-hidden />
              <span>
                {finding.message}{' '}
                <span className="text-content-subtle">{finding.suggestedAction}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {filteredCandidates.length ? (
        <section className="border-b border-overlay/8 p-4 sm:p-5" aria-label="Acciones masivas">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="inline-flex items-center gap-2 text-xs text-content-muted">
              <input
                type="checkbox"
                className="accent-accent-cyan"
                checked={
                  pageCandidates.length > 0 &&
                  pageCandidates.every((candidate) => selectedIds.includes(candidate.id))
                }
                onChange={(event) =>
                  setSelectedIds((current) => {
                    const pageIds = pageCandidates.map((candidate) => candidate.id);
                    return event.target.checked
                      ? Array.from(new Set([...current, ...pageIds]))
                      : current.filter((id) => !pageIds.includes(id));
                  })
                }
              />
              Seleccionar pagina visible ({pageCandidates.length})
            </label>
            <span className="text-xs text-content-subtle">{selectedIds.length} seleccionados</span>
          </div>
          {selectedIds.length ? (
            <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
              <Field label="Accion">
                <select
                  className={inputClass}
                  value={bulkAction}
                  onChange={(event) => setBulkAction(event.target.value)}
                >
                  <option value="reject">Rechazar</option>
                  <option value="informational">Solo informativo</option>
                  <option value="duplicate">Marcar duplicados</option>
                  <option value="associate_entity">Asociar entidad</option>
                  <option value="associate_product">Asociar producto</option>
                  <option value="restore">Restaurar</option>
                </select>
              </Field>
              {bulkAction === 'reject' ? (
                <Field label="Motivo">
                  <select
                    className={inputClass}
                    value={bulkReason}
                    onChange={(event) =>
                      setBulkReason(event.target.value as CandidateRejectionReason)
                    }
                  >
                    {CandidateRejectionReasonSchema.options.map((reason) => (
                      <option key={reason} value={reason}>
                        {REJECTION_REASON_LABEL[reason]}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : null}
              {bulkAction === 'associate_entity' ? (
                <Field label="Entidad">
                  <select
                    className={inputClass}
                    value={bulkEntityId}
                    onChange={(event) => setBulkEntityId(event.target.value)}
                  >
                    <option value="">Sin asociar</option>
                    {result?.entities.map((entity) => (
                      <option key={entity.id} value={entity.id}>
                        {entity.name}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : null}
              {bulkAction === 'associate_product' ? (
                <Field label="Producto">
                  <select
                    className={inputClass}
                    value={bulkProductId}
                    onChange={(event) => setBulkProductId(event.target.value)}
                  >
                    <option value="">Por identificar</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.label}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : null}
              <Field label="Observacion">
                <input
                  className={inputClass}
                  value={bulkObservation}
                  onChange={(event) => setBulkObservation(event.target.value)}
                />
              </Field>
              <div className="flex items-end">
                <Button disabled={bulkSaving} onClick={() => void applyBulkAction()}>
                  {bulkSaving ? 'Aplicando...' : 'Aplicar a seleccionados'}
                </Button>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {!filteredCandidates.length ? (
        <div className="p-5">
          <EmptyState
            icon={
              candidates.length ? (
                <CheckCircle2 className="h-7 w-7" />
              ) : (
                <Info className="h-7 w-7" />
              )
            }
            title={
              candidates.length ? 'No quedan candidatos por revisar' : 'Sin valores candidatos'
            }
            description={
              candidates.length
                ? 'Las propuestas descartadas se ocultaron de la revisión activa, pero su decisión permanece trazable.'
                : 'Corrige el tipo documental, vuelve a intentar con el archivo o registra los valores manualmente desde Hechos.'
            }
          />
        </div>
      ) : (
        <ul className="divide-y divide-overlay/8">
          {pageCandidates.map((candidate) => (
            <li key={candidate.id} className="p-4 sm:p-5">
              <label className="mb-3 inline-flex items-center gap-2 text-xs text-content-muted">
                <input
                  type="checkbox"
                  className="accent-accent-cyan"
                  checked={selectedIds.includes(candidate.id)}
                  onChange={(event) =>
                    setSelectedIds((current) =>
                      event.target.checked
                        ? [...current, candidate.id]
                        : current.filter((id) => id !== candidate.id),
                    )
                  }
                />
                Seleccionar candidato
              </label>
              {isDiscardedStatus(candidate.status) ? (
                <DiscardedCandidate candidate={candidate} />
              ) : (
                <CandidateReviewCard
                  candidate={candidate}
                  document={document}
                  result={result}
                  products={products}
                  onOpenReconciliations={onOpenReconciliations}
                />
              )}
            </li>
          ))}
        </ul>
      )}

      {filteredCandidates.length ? (
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-overlay/8 p-4 sm:p-5">
          <span className="text-xs text-content-muted">
            Pagina {safePage} de {pageCount} · {filteredCandidates.length} resultado(s)
          </span>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              disabled={safePage <= 1}
              onClick={() => setCurrentPage(safePage - 1)}
            >
              Anterior
            </Button>
            <Button
              variant="secondary"
              disabled={safePage >= pageCount}
              onClick={() => setCurrentPage(safePage + 1)}
            >
              Siguiente
            </Button>
          </div>
        </footer>
      ) : null}

      {discardedCandidates.length ? (
        <div className="border-t border-overlay/8 p-4 sm:p-5">
          <Button variant="ghost" onClick={() => setShowDiscarded((current) => !current)}>
            {showDiscarded
              ? 'Ocultar descartados'
              : `Ver descartados (${discardedCandidates.length})`}
          </Button>
          {showDiscarded ? (
            <ul className="mt-3 space-y-2" aria-label="Candidatos descartados">
              {discardedCandidates.map((candidate) => (
                <li
                  key={candidate.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-overlay/8 bg-overlay/[0.02] p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-content">{candidate.originalConcept}</p>
                    <p className="mt-0.5 text-xs text-content-subtle">
                      {isDiscardedStatus(candidate.status)
                        ? DISCARDED_LABEL[candidate.status]
                        : 'Descartado'}{' '}
                      · {formatCurrencyCOP(candidate.extractedValue)} · página {candidate.page}
                    </p>
                  </div>
                  {candidate.status !== 'obsolete' ? (
                    <Button
                      variant="ghost"
                      onClick={() => void restoreDocumentCandidate(candidate.id)}
                      leadingIcon={<RotateCcw className="h-4 w-4" aria-hidden />}
                    >
                      Restaurar
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </GlassPanel>
  );
}

function DiscardedCandidate({ candidate }: { candidate: DocumentFactCandidate }) {
  return (
    <article className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h4 className="font-medium text-content-strong">{candidate.originalConcept}</h4>
        <p className="mt-1 text-xs text-content-subtle">
          {isDiscardedStatus(candidate.status)
            ? DISCARDED_LABEL[candidate.status]
            : candidate.status}
          {' · '}
          {formatCurrencyCOP(candidate.extractedValue)}
          {' · pagina '}
          {candidate.page}
        </p>
        {candidate.rejectionReason ? (
          <p className="mt-1 text-xs text-content-muted">
            Motivo: {REJECTION_REASON_LABEL[candidate.rejectionReason]}
            {candidate.observation ? ` · ${candidate.observation}` : ''}
          </p>
        ) : null}
      </div>
      {candidate.status !== 'obsolete' ? (
        <Button
          variant="ghost"
          onClick={() => void restoreDocumentCandidate(candidate.id)}
          leadingIcon={<RotateCcw className="h-4 w-4" aria-hidden />}
        >
          Restaurar
        </Button>
      ) : null}
    </article>
  );
}

function CandidateReviewCard({
  candidate,
  document,
  result,
  products,
  onOpenReconciliations,
}: {
  candidate: DocumentFactCandidate;
  document?: UploadedDocument;
  result?: ProcessingResult;
  products: CaseProduct[];
  onOpenReconciliations: () => void;
}) {
  const [value, setValue] = useState(String(candidate.correctedValue ?? candidate.extractedValue));
  const [category, setCategory] = useState(
    candidate.correctedCategory ?? candidate.proposedCategory,
  );
  const [entityId, setEntityId] = useState(candidate.proposedEntityId ?? '');
  const [productId, setProductId] = useState(candidate.proposedProductId ?? '');
  const [requirementId, setRequirementId] = useState(candidate.suggestedRequirementIds[0] ?? '');
  const [exogenousRecordId, setExogenousRecordId] = useState(
    candidate.selectedExogenousRecordId ?? candidate.suggestedExogenousMatches[0]?.recordId ?? '',
  );
  const [observation, setObservation] = useState(candidate.observation);
  const [rejectionReason, setRejectionReason] = useState<CandidateRejectionReason>('not_tax_value');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decide(action: 'confirm' | 'reject' | 'informational' | 'duplicate') {
    setSaving(true);
    setError(null);
    try {
      const parsed = Number(value.replace(/\./g, '').replace(',', '.'));
      if (!Number.isFinite(parsed)) throw new Error('Escribe un valor numérico válido.');
      await reviewDocumentCandidate(candidate.id, {
        action,
        correctedValue: parsed === candidate.extractedValue ? null : parsed,
        category,
        entityId: entityId || null,
        productId: productId || null,
        requirementIds: requirementId ? [requirementId] : [],
        exogenousRecordId: exogenousRecordId || null,
        observation,
        rejectionReason: action === 'reject' ? rejectionReason : null,
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No fue posible guardar la decisión.');
    } finally {
      setSaving(false);
    }
  }

  async function openPage() {
    if (!document) return;
    const stored = await getDocumentBinary(document.id);
    if (!stored) return;
    const url = URL.createObjectURL(new Blob([stored.bytes], { type: stored.mimeType }));
    window.open(`${url}#page=${candidate.page}`, '_blank', 'noopener,noreferrer');
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  return (
    <article aria-labelledby={`${candidate.id}-title`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 id={`${candidate.id}-title`} className="font-medium text-content-strong">
            {candidate.originalConcept}
          </h4>
          <p className="mt-1 text-xs text-content-muted">
            Página {candidate.page} · {candidate.adapterId} v{candidate.adapterVersion} · regla{' '}
            {candidate.ruleId}
          </p>
        </div>
        <Badge
          tone={
            candidate.confidence.level === 'high'
              ? 'emerald'
              : candidate.confidence.level === 'medium'
                ? 'cyan'
                : 'amber'
          }
        >
          Confianza {CONFIDENCE_LABEL[candidate.confidence.level].toLowerCase()}
        </Badge>
      </div>

      <dl className="mt-3 grid gap-3 rounded-xl border border-overlay/8 bg-overlay/[0.02] p-3 sm:grid-cols-2">
        <Data
          label="Valor extraído (inmutable)"
          value={formatCurrencyCOP(candidate.extractedValue)}
        />
        <Data label="Evidencia breve" value={candidate.evidence.excerpt} />
        <Data label="Etiqueta detectada" value={candidate.evidence.detectedLabel} />
        <Data label="Clasificación propuesta" value={CATEGORY_LABEL[candidate.proposedCategory]} />
      </dl>

      {candidate.factId ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-tone-emerald/20 bg-tone-emerald/5 p-3">
          <span className="inline-flex items-center gap-2 text-sm text-content">
            <CheckCircle2 className="h-4 w-4 text-tone-emerald" aria-hidden /> Hecho asistido creado
            y trazado.
          </span>
          <Button variant="ghost" onClick={onOpenReconciliations}>
            Revisar conciliación
          </Button>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Valor final">
              <input
                inputMode="decimal"
                value={value}
                onChange={(event) => setValue(event.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Categoría">
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value as typeof category)}
                className={inputClass}
              >
                {TaxCategorySchema.options.map((option) => (
                  <option className="bg-surface-raised" key={option} value={option}>
                    {CATEGORY_LABEL[option]}
                  </option>
                ))}
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
                {result?.entities.map((entity) => (
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
                  Por identificar
                </option>
                {products.map((product) => (
                  <option className="bg-surface-raised" key={product.id} value={product.id}>
                    {product.label}
                  </option>
                ))}
              </select>
              {candidate.productLabel ? (
                <span className="mt-1 block text-content-subtle">
                  Detectado: {candidate.productLabel} · {PRODUCT_LABEL[candidate.productType]}
                </span>
              ) : null}
            </Field>
            <div className="md:col-span-2">
              <Field label="Requisito sugerido">
                <select
                  value={requirementId}
                  onChange={(event) => setRequirementId(event.target.value)}
                  className={inputClass}
                >
                  <option className="bg-surface-raised" value="">
                    Sin asociar
                  </option>
                  {result?.requirements.map((requirement) => (
                    <option
                      className="bg-surface-raised"
                      key={requirement.id}
                      value={requirement.id}
                    >
                      {requirement.entityName} · {requirement.documentName}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="md:col-span-2">
              <Field label="Observación de la decisión">
                <input
                  value={observation}
                  onChange={(event) => setObservation(event.target.value)}
                  className={inputClass}
                  placeholder="Obligatoria para correcciones sustanciales"
                />
              </Field>
            </div>
            <div className="md:col-span-2">
              <Field label="Registro exógeno relacionado">
                <select
                  value={exogenousRecordId}
                  onChange={(event) => setExogenousRecordId(event.target.value)}
                  className={inputClass}
                >
                  <option className="bg-surface-raised" value="">
                    Sin asociar
                  </option>
                  {result?.normalizedRecords.map((record) => (
                    <option className="bg-surface-raised" key={record.id} value={record.id}>
                      {record.entityName || 'Entidad sin nombre'} ·{' '}
                      {record.conceptLabel || record.conceptCode || 'Concepto sin etiqueta'} ·{' '}
                      {record.reportedValue === null
                        ? 'Valor no numérico'
                        : formatCurrencyCOP(record.reportedValue)}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </div>

          {candidate.suggestedExogenousMatches.length ? (
            <p className="text-xs text-content-muted">
              Coincidencia exógena sugerida:{' '}
              {candidate.suggestedExogenousMatches
                .map((item) => item.reasons.join(' '))
                .join(' · ')}{' '}
              No se conciliará automáticamente.
            </p>
          ) : null}
          {error ? (
            <p role="alert" className="text-sm text-tone-rose">
              {error}
            </p>
          ) : null}
          <div className="max-w-md">
            <Field label="Motivo si rechazas">
              <select
                value={rejectionReason}
                onChange={(event) =>
                  setRejectionReason(event.target.value as CandidateRejectionReason)
                }
                className={inputClass}
              >
                {CandidateRejectionReasonSchema.options.map((reason) => (
                  <option className="bg-surface-raised" key={reason} value={reason}>
                    {REJECTION_REASON_LABEL[reason]}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              disabled={saving}
              onClick={() => void decide('confirm')}
              leadingIcon={<CheckCircle2 className="h-4 w-4" aria-hidden />}
            >
              Confirmar y crear hecho
            </Button>
            <Button
              variant="secondary"
              disabled={saving}
              onClick={() => void decide('informational')}
              leadingIcon={<Info className="h-4 w-4" aria-hidden />}
            >
              Solo informativo
            </Button>
            <Button variant="ghost" disabled={saving} onClick={() => void decide('duplicate')}>
              Marcar duplicado
            </Button>
            <Button
              variant="ghost"
              disabled={saving}
              onClick={() => void decide('reject')}
              leadingIcon={<XCircle className="h-4 w-4" aria-hidden />}
            >
              Rechazar
            </Button>
            {document?.storageMode === 'store_locally' ? (
              <Button
                variant="ghost"
                onClick={() => void openPage()}
                leadingIcon={<Eye className="h-4 w-4" aria-hidden />}
              >
                Abrir página local
              </Button>
            ) : null}
          </div>
        </div>
      )}
    </article>
  );
}

const inputClass =
  'mt-1 min-h-10 w-full rounded-lg border border-overlay/12 bg-overlay/5 px-3 py-2 text-sm text-content-strong';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs text-content-muted">
      {label}
      {children}
    </label>
  );
}

function Data({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-content-subtle">{label}</dt>
      <dd className="mt-1 text-sm text-content">{value}</dd>
    </div>
  );
}
