'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  FlaskConical,
  Loader2,
  ScanText,
  Sparkles,
  XCircle,
} from 'lucide-react';
import {
  TaxCategorySchema,
  TaxNatureSchema,
  TaxTreatmentSchema,
  type DocumentExtractionSession,
  type DocumentFactCandidate,
  type PdfDocumentDiagnosis,
  type PdfPageType,
  type UploadedDocument,
} from '@nexus-tax/domain';
import {
  adjustContrast,
  compareTextSources,
  diagnosePdfDocument,
  ocrTokensFromRaw,
  parseColombianAmount,
  readPdfText,
  recommendOcrPages,
  toGrayscale,
  type DocumentRepresentation,
  type OcrEffortEstimate,
  type TextSourceComparison,
  type TextSourceComparisonStatus,
  type UnifiedTextToken,
} from '@nexus-tax/document-intelligence';
import { Badge, Button, EmptyState, GlassPanel, Spinner } from '@nexus-tax/ui';
import { CATEGORY_LABEL, NATURE_LABEL, TREATMENT_LABEL } from '@/lib/analysisPresentation';
import {
  MANUAL_CANDIDATE_FIELDS,
  MANUAL_CANDIDATE_FIELD_LABEL,
  createManualDocumentCandidate,
  getDocumentBinary,
  type ManualCandidateField,
} from '@/lib/repository';
import { OcrClient, type OcrProgressEvent } from '@/lib/ocrClient';
import { renderPdfPage } from '@/lib/pdfPageRenderer';
import { rawImageToBlob } from '@/lib/canvasImage';
import { pdfBlockToImageRect } from '@/lib/labGeometry';

const PDFJS_URLS = {
  browserModuleUrl: '/vendor/pdfjs/pdf.mjs',
  workerSrc: '/vendor/pdfjs/pdf.worker.mjs',
};

const PAGE_TYPE_LABEL: Record<PdfPageType, string> = {
  textual: 'Textual',
  scanned: 'Escaneada',
  insufficient_text: 'Texto insuficiente',
  damaged: 'Dañada',
};

const PAGE_TYPE_TONE: Record<PdfPageType, 'emerald' | 'amber' | 'rose'> = {
  textual: 'emerald',
  scanned: 'amber',
  insufficient_text: 'amber',
  damaged: 'rose',
};

const EFFORT_LABEL: Record<OcrEffortEstimate, string> = {
  fast: 'Rápida',
  moderate: 'Moderada',
  intensive: 'Intensiva',
};

const COMPARISON_LABEL: Record<TextSourceComparisonStatus, string> = {
  agree: 'Coinciden',
  ocr_complements: 'El OCR complementa el texto nativo',
  native_more_reliable: 'El texto nativo es más confiable',
  ocr_more_complete: 'El OCR es más completo',
  contradiction: 'Contradicción: requiere revisión',
  requires_review: 'Requiere revisión',
};

const COMPARISON_TONE: Record<TextSourceComparisonStatus, 'emerald' | 'cyan' | 'amber' | 'rose'> = {
  agree: 'emerald',
  ocr_complements: 'cyan',
  native_more_reliable: 'cyan',
  ocr_more_complete: 'cyan',
  contradiction: 'rose',
  requires_review: 'amber',
};

interface PageOcrState {
  status: 'idle' | 'rendering' | 'recognizing' | 'done' | 'error' | 'cancelled';
  progress?: OcrProgressEvent;
  ocrText?: string;
  ocrTokens?: UnifiedTextToken[];
  comparison?: TextSourceComparison;
  imageUrl?: string;
  imageWidth?: number;
  imageHeight?: number;
  errorMessage?: string;
}

export function DocumentLabPanel({
  caseId,
  documents,
  sessions,
  candidates,
}: {
  caseId: string;
  documents: UploadedDocument[];
  sessions: DocumentExtractionSession[];
  candidates: DocumentFactCandidate[];
}) {
  const latestSessions = useMemo(() => {
    const byDocument = new Map<string, DocumentExtractionSession>();
    for (const session of sessions) {
      const current = byDocument.get(session.documentId);
      if (!current || session.runNumber > current.runNumber) {
        byDocument.set(session.documentId, session);
      }
    }
    return [...byDocument.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [sessions]);

  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(
    latestSessions[0]?.documentId ?? null,
  );

  useEffect(() => {
    if (selectedDocumentId && latestSessions.some((s) => s.documentId === selectedDocumentId)) {
      return;
    }
    setSelectedDocumentId(latestSessions[0]?.documentId ?? null);
    // Solo reacciona cuando cambia el conjunto de sesiones disponibles.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestSessions]);

  if (!latestSessions.length) {
    return (
      <EmptyState
        icon={<FlaskConical className="h-8 w-8" />}
        title="Sin documentos para calibrar"
        description="Analiza un PDF desde Documentos para poder inspeccionar sus páginas, ejecutar OCR bajo demanda y calibrar candidatos aquí."
      />
    );
  }

  const session =
    latestSessions.find((item) => item.documentId === selectedDocumentId) ?? latestSessions[0]!;
  const document = documents.find((item) => item.id === session.documentId);
  const sessionCandidates = candidates.filter(
    (candidate) => candidate.extractionSessionId === session.id,
  );

  return (
    <div className="space-y-5">
      <GlassPanel className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent-cyan/10 text-tone-cyan">
              <FlaskConical className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-content-strong">Laboratorio documental</h2>
              <p className="mt-0.5 text-sm text-content-muted">
                Inspecciona cada página, ejecuta OCR local bajo demanda y crea candidatos manuales
                asistidos. Nada de esto alimenta la matriz por sí solo.
              </p>
            </div>
          </div>
          <label className="text-xs text-content-muted">
            Documento
            <select
              className="mt-1 block min-h-10 rounded-lg border border-overlay/12 bg-overlay/5 px-3 py-2 text-sm text-content-strong"
              value={session.documentId}
              onChange={(event) => setSelectedDocumentId(event.target.value)}
            >
              {latestSessions.map((item) => (
                <option key={item.documentId} value={item.documentId}>
                  {documents.find((doc) => doc.id === item.documentId)?.fileName ?? item.documentId}
                </option>
              ))}
            </select>
          </label>
        </div>
      </GlassPanel>

      <DocumentLabWorkspace
        key={session.id}
        caseId={caseId}
        session={session}
        document={document}
        candidates={sessionCandidates}
      />
    </div>
  );
}

function DocumentLabWorkspace({
  caseId,
  session,
  document,
  candidates,
}: {
  caseId: string;
  session: DocumentExtractionSession;
  document?: UploadedDocument;
  candidates: DocumentFactCandidate[];
}) {
  const [mode, setMode] = useState<'basic' | 'advanced'>('basic');
  const [bytes, setBytes] = useState<ArrayBuffer | null | undefined>(undefined);
  const [representation, setRepresentation] = useState<DocumentRepresentation | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedPage, setSelectedPage] = useState(1);
  const [pageStates, setPageStates] = useState<Record<number, PageOcrState>>({});
  const [layers, setLayers] = useState({ native: true, ocr: true, candidates: true });
  const [improveContrast, setImproveContrast] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let cancelled = false;
    setBytes(undefined);
    setRepresentation(null);
    setLoadError(null);
    void getDocumentBinary(document?.id ?? session.documentId).then((stored) => {
      if (cancelled) return;
      setBytes(stored?.bytes ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [document?.id, session.documentId]);

  useEffect(() => {
    if (!bytes) return;
    let cancelled = false;
    readPdfText(bytes, PDFJS_URLS)
      .then((result) => {
        if (!cancelled) setRepresentation(result);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLoadError(
            error instanceof Error ? error.message : 'No fue posible leer el PDF localmente.',
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [bytes]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const diagnosis: PdfDocumentDiagnosis | null = useMemo(
    () => (representation ? diagnosePdfDocument(representation) : null),
    [representation],
  );
  const recommendation = useMemo(
    () => (diagnosis ? recommendOcrPages(diagnosis) : null),
    [diagnosis],
  );
  const pageDiagnosis = diagnosis?.pages.find((page) => page.pageNumber === selectedPage) ?? null;
  const pageData = representation?.pages.find((page) => page.pageNumber === selectedPage) ?? null;
  const pageState = pageStates[selectedPage] ?? { status: 'idle' };
  const pageCandidates = candidates.filter((candidate) => candidate.page === selectedPage);

  function updatePageState(page: number, patch: Partial<PageOcrState>) {
    setPageStates((current) => ({
      ...current,
      [page]: { ...(current[page] ?? { status: 'idle' }), ...patch },
    }));
  }

  async function runOcrOnPage(page: number) {
    if (!bytes) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    updatePageState(page, { status: 'rendering', errorMessage: undefined });
    try {
      const rendered = await renderPdfPage(bytes, page, { scale: 1.6, signal: controller.signal });
      const displayBlob = await rawImageToBlob(rendered);
      const imageUrl = URL.createObjectURL(displayBlob);
      updatePageState(page, {
        status: 'recognizing',
        imageUrl,
        imageWidth: rendered.width,
        imageHeight: rendered.height,
      });
      const ocrInput = improveContrast ? adjustContrast(toGrayscale(rendered), 1.3) : rendered;
      const ocrBlob = await rawImageToBlob(ocrInput);
      const client = new OcrClient();
      const result = await client.recognizePage(ocrBlob, {
        signal: controller.signal,
        onProgress: (progress) => updatePageState(page, { progress }),
      });
      await client.dispose();
      const nativeText = pageData?.normalizedText ?? '';
      const comparison = compareTextSources(page, nativeText, result.text);
      updatePageState(page, {
        status: 'done',
        ocrText: result.text,
        ocrTokens: ocrTokensFromRaw(page, result.tokens),
        comparison,
      });
    } catch (error) {
      if (controller.signal.aborted) {
        updatePageState(page, { status: 'cancelled' });
        return;
      }
      updatePageState(page, {
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'No fue posible ejecutar el OCR.',
      });
    }
  }

  function cancelOcr() {
    abortRef.current?.abort();
  }

  if (bytes === undefined) {
    return (
      <GlassPanel className="flex items-center gap-3 p-6 text-sm text-content-muted">
        <Spinner className="h-4 w-4" /> Cargando el documento local…
      </GlassPanel>
    );
  }
  if (bytes === null) {
    return (
      <EmptyState
        icon={<AlertTriangle className="h-8 w-8" />}
        title="Este documento no conservó su binario local"
        description="El laboratorio necesita el archivo original para renderizar páginas y ejecutar OCR. Vuelve a registrarlo con la opción de conservar el binario si necesitas calibrarlo."
      />
    );
  }
  if (loadError) {
    return (
      <GlassPanel className="p-6 text-sm text-tone-rose">
        No fue posible leer el PDF localmente: {loadError}
      </GlassPanel>
    );
  }
  if (!representation) {
    return (
      <GlassPanel className="flex items-center gap-3 p-6 text-sm text-content-muted">
        <Spinner className="h-4 w-4" /> Leyendo el documento localmente…
      </GlassPanel>
    );
  }

  return (
    <div className="space-y-5">
      <GlassPanel className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={diagnosis ? PAGE_TYPE_TONE[diagnosis.type as PdfPageType] ?? 'amber' : 'neutral'}>
              Documento: {diagnosis ? diagnosisTypeLabel(diagnosis.type) : 'Sin diagnóstico'}
            </Badge>
            {recommendation?.recommended ? (
              <Badge tone="amber">
                OCR recomendado en {recommendation.pages.length} página(s) · esfuerzo{' '}
                {EFFORT_LABEL[recommendation.effort]}
              </Badge>
            ) : (
              <Badge tone="emerald">No se detectan páginas que requieran OCR</Badge>
            )}
          </div>
          <div className="flex gap-1 rounded-lg border border-overlay/12 p-1">
            <Button
              variant={mode === 'basic' ? 'secondary' : 'ghost'}
              onClick={() => setMode('basic')}
            >
              Básico
            </Button>
            <Button
              variant={mode === 'advanced' ? 'secondary' : 'ghost'}
              onClick={() => setMode('advanced')}
            >
              Avanzado
            </Button>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <label className="text-xs text-content-muted" htmlFor="lab-page-select">
            Página
          </label>
          <select
            id="lab-page-select"
            className="min-h-9 rounded-lg border border-overlay/12 bg-overlay/5 px-2 py-1 text-sm text-content-strong"
            value={selectedPage}
            onChange={(event) => setSelectedPage(Number(event.target.value))}
          >
            {representation.pages.map((page) => (
              <option key={page.pageNumber} value={page.pageNumber}>
                Página {page.pageNumber}
              </option>
            ))}
          </select>
          {pageDiagnosis ? (
            <Badge tone={PAGE_TYPE_TONE[pageDiagnosis.type]}>
              {PAGE_TYPE_LABEL[pageDiagnosis.type]}
            </Badge>
          ) : null}
        </div>
      </GlassPanel>

      <GlassPanel className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-content-strong">OCR local bajo demanda</h3>
            <p className="mt-1 text-xs text-content-muted">
              No se ejecuta automáticamente. El reconocimiento corre en tu navegador; no se envía
              nada por red.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {mode === 'advanced' ? (
              <label className="flex items-center gap-2 text-xs text-content-muted">
                <input
                  type="checkbox"
                  checked={improveContrast}
                  onChange={(event) => setImproveContrast(event.target.checked)}
                />
                Mejorar contraste antes de OCR
              </label>
            ) : null}
            {pageState.status === 'rendering' || pageState.status === 'recognizing' ? (
              <Button variant="ghost" onClick={cancelOcr} leadingIcon={<XCircle className="h-4 w-4" />}>
                Cancelar
              </Button>
            ) : (
              <Button
                variant="secondary"
                leadingIcon={<ScanText className="h-4 w-4" />}
                onClick={() => void runOcrOnPage(selectedPage)}
              >
                Ejecutar OCR en esta página
              </Button>
            )}
          </div>
        </div>
        <OcrStatus state={pageState} />
      </GlassPanel>

      {pageState.imageUrl && mode === 'advanced' ? (
        <LabOverlay
          imageUrl={pageState.imageUrl}
          imageWidth={pageState.imageWidth ?? 1}
          imageHeight={pageState.imageHeight ?? 1}
          pageHeightPdf={pageData?.height ?? 0}
          renderScale={1.6}
          nativeBlocks={pageData?.blocks ?? []}
          ocrTokens={pageState.ocrTokens ?? []}
          candidates={pageCandidates}
          layers={layers}
          onToggleLayer={(layer) => setLayers((current) => ({ ...current, [layer]: !current[layer] }))}
        />
      ) : null}

      <ManualCandidatePanel
        caseId={caseId}
        session={session}
        page={selectedPage}
        nativeText={pageData?.normalizedText ?? ''}
        ocrText={pageState.ocrText}
      />

      {mode === 'advanced' ? (
        <GlassPanel className="p-5">
          <h3 className="text-sm font-semibold text-content-strong">Detalle técnico de la página</h3>
          <dl className="mt-3 grid gap-3 text-xs sm:grid-cols-3">
            <div>
              <dt className="text-content-subtle">Caracteres nativos</dt>
              <dd className="mt-1 text-content">{pageDiagnosis?.characterCount ?? 0}</dd>
            </div>
            <div>
              <dt className="text-content-subtle">Cobertura textual</dt>
              <dd className="mt-1 text-content">
                {Math.round((pageDiagnosis?.textCoverage ?? 0) * 100)}%
              </dd>
            </div>
            <div>
              <dt className="text-content-subtle">Método recomendado</dt>
              <dd className="mt-1 text-content">
                {pageDiagnosis ? readMethodLabel(pageDiagnosis.recommendedMethod) : '—'}
              </dd>
            </div>
          </dl>
          {pageDiagnosis?.warnings.length ? (
            <ul className="mt-3 space-y-1 text-xs text-tone-amber">
              {pageDiagnosis.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : null}
        </GlassPanel>
      ) : null}
    </div>
  );
}

function diagnosisTypeLabel(type: PdfDocumentDiagnosis['type']): string {
  const labels: Record<PdfDocumentDiagnosis['type'], string> = {
    textual: 'Textual',
    scanned: 'Escaneado',
    hybrid: 'Híbrido',
    insufficient_text: 'Texto insuficiente',
    password_protected: 'Protegido',
    damaged: 'Dañado',
    unsupported: 'No compatible',
  };
  return labels[type];
}

function readMethodLabel(method: string): string {
  const labels: Record<string, string> = {
    native_text: 'Texto nativo',
    ocr: 'OCR',
    hybrid: 'Híbrido (nativo + OCR)',
    manual_review: 'Revisión manual',
  };
  return labels[method] ?? method;
}

function OcrStatus({ state }: { state: PageOcrState }) {
  if (state.status === 'idle') return null;
  if (state.status === 'rendering') {
    return (
      <p className="mt-3 flex items-center gap-2 text-xs text-content-muted">
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Renderizando la página…
      </p>
    );
  }
  if (state.status === 'recognizing') {
    return (
      <p className="mt-3 flex items-center gap-2 text-xs text-content-muted">
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        {state.progress
          ? `${state.progress.status} · ${Math.round(state.progress.progress * 100)}%`
          : 'Iniciando el motor de OCR…'}
      </p>
    );
  }
  if (state.status === 'cancelled') {
    return <p className="mt-3 text-xs text-content-muted">OCR cancelado.</p>;
  }
  if (state.status === 'error') {
    return <p className="mt-3 text-xs text-tone-rose">{state.errorMessage}</p>;
  }
  if (state.status === 'done' && state.comparison) {
    return (
      <div className="mt-3 space-y-2">
        <Badge tone={COMPARISON_TONE[state.comparison.status]}>
          {COMPARISON_LABEL[state.comparison.status]}
        </Badge>
        <p className="text-xs text-content-subtle">{state.comparison.reasons[0]}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-overlay/10 bg-overlay/5 p-3">
            <p className="text-xs font-medium text-content-subtle">Texto nativo</p>
            <p className="mt-1 max-h-24 overflow-y-auto text-xs text-content">
              {state.comparison.nativeText || 'Sin texto nativo.'}
            </p>
          </div>
          <div className="rounded-lg border border-overlay/10 bg-overlay/5 p-3">
            <p className="text-xs font-medium text-content-subtle">Texto OCR</p>
            <p className="mt-1 max-h-24 overflow-y-auto text-xs text-content">
              {state.comparison.ocrText || 'Sin texto OCR.'}
            </p>
          </div>
        </div>
      </div>
    );
  }
  return null;
}

function LabOverlay({
  imageUrl,
  imageWidth,
  imageHeight,
  pageHeightPdf,
  renderScale,
  nativeBlocks,
  ocrTokens,
  candidates,
  layers,
  onToggleLayer,
}: {
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  pageHeightPdf: number;
  renderScale: number;
  nativeBlocks: readonly { x?: number; y?: number; width?: number; height?: number; text: string }[];
  ocrTokens: readonly UnifiedTextToken[];
  candidates: readonly DocumentFactCandidate[];
  layers: { native: boolean; ocr: boolean; candidates: boolean };
  onToggleLayer: (layer: 'native' | 'ocr' | 'candidates') => void;
}) {
  return (
    <GlassPanel className="p-5">
      <div className="mb-3 flex flex-wrap gap-3 text-xs text-content-muted">
        <label className="flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={layers.native}
            onChange={() => onToggleLayer('native')}
          />
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-tone-cyan" /> Tokens nativos
        </label>
        <label className="flex items-center gap-1.5">
          <input type="checkbox" checked={layers.ocr} onChange={() => onToggleLayer('ocr')} />
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-tone-violet" /> Tokens OCR
        </label>
        <label className="flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={layers.candidates}
            onChange={() => onToggleLayer('candidates')}
          />
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-tone-amber" /> Candidatos
        </label>
      </div>
      <div className="max-h-[70vh] w-full max-w-2xl overflow-auto rounded-lg border border-overlay/10">
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt="Vista previa de la página renderizada"
            className="block w-full"
          />
          <svg
            viewBox={`0 0 ${imageWidth} ${imageHeight}`}
            className="pointer-events-none absolute inset-0 h-full w-full"
            role="img"
            aria-label="Superposición de capas del laboratorio"
          >
          {layers.native
            ? nativeBlocks
                .filter((block) => block.x !== undefined && block.y !== undefined)
                .map((block, index) => {
                  const rect = pdfBlockToImageRect(
                    {
                      x: block.x ?? 0,
                      y: block.y ?? 0,
                      width: block.width ?? 0,
                      height: block.height ?? 0,
                    },
                    pageHeightPdf,
                    renderScale,
                  );
                  return (
                    <rect
                      key={`native-${index}`}
                      x={rect.x}
                      y={rect.y}
                      width={Math.max(rect.width, 2)}
                      height={Math.max(rect.height, 2)}
                      fill="none"
                      stroke="rgb(34 211 238)"
                      strokeWidth={1}
                    />
                  );
                })
            : null}
          {layers.ocr
            ? ocrTokens.map((token, index) => (
                <rect
                  key={`ocr-${index}`}
                  x={token.x}
                  y={token.y}
                  width={Math.max(token.width, 2)}
                  height={Math.max(token.height, 2)}
                  fill="none"
                  stroke="rgb(139 92 246)"
                  strokeWidth={1}
                  strokeDasharray="3 2"
                />
              ))
            : null}
          {layers.candidates
            ? candidates
                .filter((candidate) => candidate.evidence.x != null && candidate.evidence.y != null)
                .map((candidate) => {
                  const point = pdfBlockToImageRect(
                    {
                      x: candidate.evidence.x ?? 0,
                      y: candidate.evidence.y ?? 0,
                      width: 4,
                      height: 4,
                    },
                    pageHeightPdf,
                    renderScale,
                  );
                  return (
                    <circle
                      key={candidate.id}
                      cx={point.x}
                      cy={point.y}
                      r={5}
                      fill="rgb(245 158 11)"
                      opacity={0.8}
                    >
                      <title>{candidate.originalConcept}</title>
                    </circle>
                  );
                })
            : null}
        </svg>
        </div>
      </div>
      <p className="mt-2 text-xs text-content-subtle">
        Las capas muestran posición aproximada; no dependen únicamente del color (bordes sólidos =
        nativo, punteados = OCR, círculos = candidatos). Desplázate dentro de la vista previa para
        ver el resto de la página.
      </p>
    </GlassPanel>
  );
}

function ManualCandidatePanel({
  caseId,
  session,
  page,
  nativeText,
  ocrText,
}: {
  caseId: string;
  session: DocumentExtractionSession;
  page: number;
  nativeText: string;
  ocrText?: string;
}) {
  const [field, setField] = useState<ManualCandidateField>('value');
  const [concept, setConcept] = useState('');
  const [value, setValue] = useState('');
  const [source, setSource] = useState<'native' | 'ocr'>('native');
  const [category, setCategory] = useState<(typeof TaxCategorySchema.options)[number]>('unclassified');
  const [nature, setNature] = useState<(typeof TaxNatureSchema.options)[number]>('unclassified');
  const [treatment, setTreatment] =
    useState<(typeof TaxTreatmentSchema.options)[number]>('requires_review');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const excerpt = source === 'ocr' ? (ocrText ?? '') : nativeText;

  function prefillFromExcerpt() {
    setConcept(excerpt.slice(0, 120));
    const parsed = parseColombianAmount(excerpt);
    if (parsed !== null) setValue(String(parsed));
  }

  async function handleCreate() {
    setSaving(true);
    setSaved(false);
    try {
      await createManualDocumentCandidate({
        caseId,
        documentId: session.documentId,
        extractionSessionId: session.id,
        page,
        field,
        originalConcept: concept || MANUAL_CANDIDATE_FIELD_LABEL[field],
        extractedValue: Number(value) || 0,
        category,
        nature,
        treatment,
        excerpt: excerpt.slice(0, 240),
        x: null,
        y: null,
        method: source,
      });
      setSaved(true);
      setConcept('');
      setValue('');
    } finally {
      setSaving(false);
    }
  }

  return (
    <GlassPanel className="p-5">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-tone-violet" aria-hidden />
        <h3 className="text-sm font-semibold text-content-strong">Selección manual de campo</h3>
      </div>
      <p className="mt-1 text-xs text-content-muted">
        Crea un candidato asistido a partir del texto nativo o del OCR de esta página. Pasa por la
        revisión normal; no alimenta la matriz directamente.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-content-muted">
          Fuente del texto
          <select
            className="mt-1 block min-h-10 w-full rounded-lg border border-overlay/12 bg-overlay/5 px-3 py-2 text-sm text-content-strong"
            value={source}
            onChange={(event) => setSource(event.target.value as 'native' | 'ocr')}
          >
            <option value="native">Texto nativo de la página</option>
            <option value="ocr" disabled={!ocrText}>
              Texto OCR {ocrText ? '' : '(ejecuta OCR primero)'}
            </option>
          </select>
        </label>
        <label className="text-xs text-content-muted">
          Campo
          <select
            className="mt-1 block min-h-10 w-full rounded-lg border border-overlay/12 bg-overlay/5 px-3 py-2 text-sm text-content-strong"
            value={field}
            onChange={(event) => setField(event.target.value as ManualCandidateField)}
          >
            {MANUAL_CANDIDATE_FIELDS.map((option) => (
              <option key={option} value={option}>
                {MANUAL_CANDIDATE_FIELD_LABEL[option]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <Button variant="ghost" className="mt-2" onClick={prefillFromExcerpt} disabled={!excerpt}>
        Usar el texto de la página como punto de partida
      </Button>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-content-muted">
          Concepto
          <input
            className="mt-1 block min-h-10 w-full rounded-lg border border-overlay/12 bg-overlay/5 px-3 py-2 text-sm text-content-strong"
            value={concept}
            onChange={(event) => setConcept(event.target.value)}
            placeholder="Ej. Saldo cuenta bancaria"
          />
        </label>
        <label className="text-xs text-content-muted">
          Valor
          <input
            type="number"
            className="mt-1 block min-h-10 w-full rounded-lg border border-overlay/12 bg-overlay/5 px-3 py-2 text-sm text-content-strong"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="0"
          />
        </label>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <label className="text-xs text-content-muted">
          Categoría
          <select
            className="mt-1 block min-h-10 w-full rounded-lg border border-overlay/12 bg-overlay/5 px-3 py-2 text-sm text-content-strong"
            value={category}
            onChange={(event) =>
              setCategory(event.target.value as (typeof TaxCategorySchema.options)[number])
            }
          >
            {TaxCategorySchema.options.map((option) => (
              <option key={option} value={option}>
                {CATEGORY_LABEL[option]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-content-muted">
          Naturaleza
          <select
            className="mt-1 block min-h-10 w-full rounded-lg border border-overlay/12 bg-overlay/5 px-3 py-2 text-sm text-content-strong"
            value={nature}
            onChange={(event) =>
              setNature(event.target.value as (typeof TaxNatureSchema.options)[number])
            }
          >
            {TaxNatureSchema.options.map((option) => (
              <option key={option} value={option}>
                {NATURE_LABEL[option]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-content-muted">
          Tratamiento
          <select
            className="mt-1 block min-h-10 w-full rounded-lg border border-overlay/12 bg-overlay/5 px-3 py-2 text-sm text-content-strong"
            value={treatment}
            onChange={(event) =>
              setTreatment(event.target.value as (typeof TaxTreatmentSchema.options)[number])
            }
          >
            {TaxTreatmentSchema.options.map((option) => (
              <option key={option} value={option}>
                {TREATMENT_LABEL[option]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <Button
          variant="secondary"
          onClick={() => void handleCreate()}
          disabled={saving || !concept}
        >
          {saving ? 'Creando…' : 'Crear candidato manual asistido'}
        </Button>
        {saved ? <span className="text-xs text-tone-emerald">Candidato creado y listo para revisar.</span> : null}
      </div>
    </GlassPanel>
  );
}
