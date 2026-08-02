'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  AlertTriangle,
  FlaskConical,
  Layers,
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
  type DocumentKind,
  type DocumentProfile,
  type DocumentProfileZone,
  type ExtractionFeedbackApplicability,
  type PdfDocumentDiagnosis,
  type PdfPageType,
  type UploadedDocument,
} from '@nexus-tax/domain';
import {
  adjustContrast,
  compareTextSources,
  computeDocumentProfileSignals,
  diagnosePdfDocument,
  matchDocumentProfiles,
  ocrTokensFromRaw,
  parseColombianAmount,
  PdfReadError,
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
  createDocumentProfile,
  createManualDocumentCandidate,
  getDocumentBinary,
  listDocumentProfiles,
  recordExtractionFeedback,
  recordOcrPageOutcome,
  updateDocumentProfileStatus,
  type ManualCandidateField,
} from '@/lib/repository';
import { OcrClient, OcrError, type OcrProgressEvent } from '@/lib/ocrClient';
import { renderPdfPage } from '@/lib/pdfPageRenderer';
import { rawImageToBlob } from '@/lib/canvasImage';
import { normalizeImageSelection, pdfBlockToImageRect, type ImageRect } from '@/lib/labGeometry';

const MATCH_CONFIDENCE_LABEL: Record<'high' | 'medium' | 'low', string> = {
  high: 'Alta',
  medium: 'Media',
  low: 'Baja',
};

const PROFILE_STATUS_LABEL: Record<DocumentProfile['status'], string> = {
  draft: 'Borrador',
  tested: 'Probado',
  active: 'Activo',
  obsolete: 'Obsoleto',
};

const FEEDBACK_APPLICABILITY_LABEL: Record<ExtractionFeedbackApplicability, string> = {
  this_document_only: 'Solo para este documento',
  similar_documents: 'Sugerencia para documentos similares',
  profile_update: 'Actualización de perfil',
};

const EMPTY_PROFILES: DocumentProfile[] = [];

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
  targetDocumentId,
  targetPage,
}: {
  caseId: string;
  documents: UploadedDocument[];
  sessions: DocumentExtractionSession[];
  candidates: DocumentFactCandidate[];
  targetDocumentId?: string | null;
  targetPage?: number | null;
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
    targetDocumentId ?? latestSessions[0]?.documentId ?? null,
  );

  useEffect(() => {
    if (targetDocumentId && latestSessions.some((item) => item.documentId === targetDocumentId)) {
      setSelectedDocumentId(targetDocumentId);
    }
  }, [latestSessions, targetDocumentId]);

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
                Inspecciona cada página del PDF, ejecuta OCR local bajo demanda y propone
                candidatos de hechos que <span className="font-medium">solo alimentan la matriz</span>{' '}
                si tú los confirmas. Aquí no se toma ninguna decisión automática.
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

        {/* Onboarding: 3 pasos guía para que se entienda el flujo del laboratorio. */}
        <ol className="mt-5 grid gap-3 sm:grid-cols-3">
          <li className="rounded-xl border border-overlay/10 bg-overlay/[0.02] p-3">
            <div className="flex items-center gap-2 text-tone-cyan">
              <span className="grid h-6 w-6 place-items-center rounded-full border border-accent-cyan/30 text-xs font-semibold">
                1
              </span>
              <ScanText className="h-4 w-4" aria-hidden />
              <span className="text-xs font-semibold uppercase tracking-wide">Diagnóstico</span>
            </div>
            <p className="mt-2 text-xs text-content-muted">
              Revisa qué páginas son textuales, escaneadas o dañadas. Ejecuta OCR local solo cuando
              haga falta.
            </p>
          </li>
          <li className="rounded-xl border border-overlay/10 bg-overlay/[0.02] p-3">
            <div className="flex items-center gap-2 text-tone-violet">
              <span className="grid h-6 w-6 place-items-center rounded-full border border-accent-violet/30 text-xs font-semibold">
                2
              </span>
              <Layers className="h-4 w-4" aria-hidden />
              <span className="text-xs font-semibold uppercase tracking-wide">Revisar tokens</span>
            </div>
            <p className="mt-2 text-xs text-content-muted">
              Contrasta el texto nativo con el OCR y con los candidatos. Nunca se fusionan
              automáticamente: aquí sale a la luz cualquier contradicción.
            </p>
          </li>
          <li className="rounded-xl border border-overlay/10 bg-overlay/[0.02] p-3">
            <div className="flex items-center gap-2 text-tone-emerald">
              <span className="grid h-6 w-6 place-items-center rounded-full border border-emerald-500/30 text-xs font-semibold">
                3
              </span>
              <Sparkles className="h-4 w-4" aria-hidden />
              <span className="text-xs font-semibold uppercase tracking-wide">
                Confirmar candidatos
              </span>
            </div>
            <p className="mt-2 text-xs text-content-muted">
              Cada valor propuesto pasa por revisión humana. Solo tras confirmar se crea un hecho{' '}
              <code className="rounded bg-overlay/10 px-1">assisted</code> visible para conciliación.
            </p>
          </li>
        </ol>
      </GlassPanel>

      <DocumentLabWorkspace
        key={session.id}
        caseId={caseId}
        session={session}
        document={document}
        candidates={sessionCandidates}
        targetPage={targetPage}
      />
    </div>
  );
}

function DocumentLabWorkspace({
  caseId,
  session,
  document,
  candidates,
  targetPage,
}: {
  caseId: string;
  session: DocumentExtractionSession;
  document?: UploadedDocument;
  candidates: DocumentFactCandidate[];
  targetPage?: number | null;
}) {
  const [mode, setMode] = useState<'basic' | 'advanced'>('basic');
  const [bytes, setBytes] = useState<ArrayBuffer | null | undefined>(undefined);
  const [representation, setRepresentation] = useState<DocumentRepresentation | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedPage, setSelectedPage] = useState(targetPage ?? 1);
  const [pageStates, setPageStates] = useState<Record<number, PageOcrState>>({});
  const [layers, setLayers] = useState({ native: true, ocr: true, candidates: true });
  const [improveContrast, setImproveContrast] = useState(false);
  const [selectedZone, setSelectedZone] = useState<DocumentProfileZone | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  /**
   * Contraseña temporal del PDF: se conserva solo en memoria mientras dura la
   * sesión del laboratorio. Nunca se persiste (política de privacidad).
   */
  const [pdfPassword, setPdfPassword] = useState<string | null>(null);
  /** true si necesitamos que el usuario introduzca la contraseña para leer/OCR. */
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [passwordDraft, setPasswordDraft] = useState('');
  const [passwordIncorrect, setPasswordIncorrect] = useState(false);

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

  // Si el documento fue registrado con contraseña, exige que la persona la
  // introduzca antes incluso de intentar la primera lectura. La contraseña
  // no se persiste; solo se guarda en memoria del componente.
  useEffect(() => {
    if (document?.requiresPassword && !pdfPassword && !passwordRequired) {
      setPasswordRequired(true);
    }
  }, [document?.requiresPassword, pdfPassword, passwordRequired]);

  useEffect(() => {
    if (!bytes || passwordRequired) return;
    let cancelled = false;
    readPdfText(bytes, { ...PDFJS_URLS, password: pdfPassword ?? undefined })
      .then((result) => {
        if (cancelled) return;
        setRepresentation(result);
        setPasswordIncorrect(false);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        // Distinguimos error de contraseña para no ocultarlo tras un texto genérico.
        const code = error instanceof PdfReadError ? error.code : null;
        if (code === 'password_required' || code === 'incorrect_password') {
          setPasswordIncorrect(code === 'incorrect_password');
          setPasswordRequired(true);
          setPdfPassword(null);
          return;
        }
        setLoadError(
          error instanceof Error ? error.message : 'No fue posible leer el PDF localmente.',
        );
      });
    return () => {
      cancelled = true;
    };
  }, [bytes, pdfPassword, passwordRequired]);

  useEffect(() => {
    if (targetPage && targetPage <= (session.pageCount || Number.MAX_SAFE_INTEGER)) {
      setSelectedPage(targetPage);
    }
  }, [session.pageCount, targetPage]);

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

  async function runOcrOnPage(page: number, renderScale = 1.6) {
    if (!bytes) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    updatePageState(page, { status: 'rendering', errorMessage: undefined });
    try {
      const rendered = await renderPdfPage(bytes, page, {
        scale: renderScale,
        signal: controller.signal,
        password: pdfPassword ?? undefined,
      });
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
      await recordOcrPageOutcome(session.id, {
        page,
        status: 'completed',
        comparisonStatus: comparison.status,
        confidence: result.confidence,
        errorCode: null,
      });
      updatePageState(page, {
        status: 'done',
        ocrText: result.text,
        ocrTokens: ocrTokensFromRaw(page, result.tokens),
        comparison,
      });
    } catch (error) {
      if (controller.signal.aborted) {
        await recordOcrPageOutcome(session.id, {
          page,
          status: 'cancelled',
          comparisonStatus: null,
          confidence: null,
          errorCode: 'cancelled',
        });
        updatePageState(page, { status: 'cancelled' });
        return;
      }
      await recordOcrPageOutcome(session.id, {
        page,
        status: 'failed',
        comparisonStatus: null,
        confidence: null,
        errorCode: error instanceof OcrError ? error.code : 'unknown',
      });
      updatePageState(page, {
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'No fue posible ejecutar el OCR.',
      });
    }
  }

  function cancelOcr() {
    abortRef.current?.abort();
  }

  async function continueWithNativeText(page: number) {
    const nativeText = pageData?.normalizedText ?? '';
    const comparison = compareTextSources(page, nativeText, '');
    await recordOcrPageOutcome(session.id, {
      page,
      status: 'completed',
      comparisonStatus: comparison.status,
      confidence: null,
      errorCode: null,
    });
    updatePageState(page, { status: 'done', ocrText: '', ocrTokens: [], comparison });
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
  // Gate de contraseña: se muestra antes de intentar cualquier lectura u OCR,
  // ya sea porque el documento fue registrado con requiresPassword=true o porque
  // el intento anterior devolvió password_required / incorrect_password.
  if (passwordRequired) {
    return (
      <GlassPanel className="p-6">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-400/10 text-tone-amber">
            <AlertTriangle className="h-5 w-5" aria-hidden />
          </span>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-content-strong">
              Este PDF requiere contraseña
            </h3>
            <p className="mt-1 text-xs text-content-muted">
              La contraseña se usa solo para abrir el documento en esta sesión y{' '}
              <span className="font-medium">nunca se guarda</span>. Sin ella no es posible leer el
              texto ni ejecutar OCR local.
            </p>
            {passwordIncorrect ? (
              <p role="alert" className="mt-2 text-xs text-tone-rose">
                La contraseña anterior no era correcta. Intenta de nuevo.
              </p>
            ) : null}
            <form
              className="mt-3 flex flex-wrap gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                if (!passwordDraft) return;
                setPdfPassword(passwordDraft);
                setPasswordDraft('');
                setPasswordRequired(false);
              }}
            >
              <input
                type="password"
                autoComplete="off"
                value={passwordDraft}
                onChange={(event) => setPasswordDraft(event.target.value)}
                placeholder="Contraseña del PDF"
                aria-label="Contraseña del PDF"
                className="min-h-10 flex-1 min-w-[220px] rounded-lg border border-overlay/12 bg-overlay/5 px-3 py-2 text-sm text-content-strong"
              />
              <Button type="submit" disabled={!passwordDraft}>
                Desbloquear
              </Button>
            </form>
          </div>
        </div>
      </GlassPanel>
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
            <Badge
              tone={
                diagnosis ? (PAGE_TYPE_TONE[diagnosis.type as PdfPageType] ?? 'amber') : 'neutral'
              }
            >
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

      <ProfileSuggestions
        representation={representation}
        session={session}
        selectedZone={selectedZone}
        documentKind={
          session.classification?.correctedKind ?? session.classification?.proposedKind ?? 'other'
        }
      />

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
              <Button
                variant="ghost"
                onClick={cancelOcr}
                leadingIcon={<XCircle className="h-4 w-4" />}
              >
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
        <OcrStatus
          state={pageState}
          hasNativeText={Boolean(pageData?.normalizedText.trim())}
          onRetry={() => void runOcrOnPage(selectedPage)}
          onRetryLight={() => void runOcrOnPage(selectedPage, 1.1)}
          onContinueNative={() => void continueWithNativeText(selectedPage)}
        />
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
          selection={selectedZone}
          onSelection={(rect) =>
            setSelectedZone({
              id: `zone:${crypto.randomUUID()}`,
              purpose: 'totals',
              page: selectedPage,
              relativeX: rect.x,
              relativeY: rect.y,
              relativeWidth: rect.width,
              relativeHeight: rect.height,
              field: 'value',
              adapterId: null,
              version: '1.0.0',
              evidence: `Zona marcada manualmente en la página ${selectedPage}.`,
              createdBy: 'analyst',
            })
          }
          onClearSelection={() => setSelectedZone(null)}
          onToggleLayer={(layer) =>
            setLayers((current) => ({ ...current, [layer]: !current[layer] }))
          }
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
          <h3 className="text-sm font-semibold text-content-strong">
            Detalle técnico de la página
          </h3>
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

function OcrStatus({
  state,
  hasNativeText,
  onRetry,
  onRetryLight,
  onContinueNative,
}: {
  state: PageOcrState;
  hasNativeText: boolean;
  onRetry: () => void;
  onRetryLight: () => void;
  onContinueNative: () => void;
}) {
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
    return (
      <div role="alert" className="mt-3 rounded-lg border border-tone-rose/30 bg-tone-rose/5 p-3">
        <p className="text-xs text-tone-rose">{state.errorMessage}</p>
        <p className="mt-1 text-xs text-content-muted">
          Puedes reintentar, reducir la resolución para usar menos memoria o continuar con la
          evidencia nativa disponible.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="secondary" onClick={onRetry}>
            Reintentar
          </Button>
          <Button variant="ghost" onClick={onRetryLight}>
            Reintentar con menos resolución
          </Button>
          {hasNativeText ? (
            <Button variant="ghost" onClick={onContinueNative}>
              Continuar con texto nativo
            </Button>
          ) : null}
        </div>
      </div>
    );
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
  selection,
  onSelection,
  onClearSelection,
  onToggleLayer,
}: {
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  pageHeightPdf: number;
  renderScale: number;
  nativeBlocks: readonly {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    text: string;
  }[];
  ocrTokens: readonly UnifiedTextToken[];
  candidates: readonly DocumentFactCandidate[];
  layers: { native: boolean; ocr: boolean; candidates: boolean };
  selection: DocumentProfileZone | null;
  onSelection: (rect: ImageRect) => void;
  onClearSelection: () => void;
  onToggleLayer: (layer: 'native' | 'ocr' | 'candidates') => void;
}) {
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);

  function imagePoint(event: ReactPointerEvent<SVGSVGElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - bounds.left) / bounds.width) * imageWidth,
      y: ((event.clientY - bounds.top) / bounds.height) * imageHeight,
    };
  }

  function finishSelection(event: ReactPointerEvent<SVGSVGElement>) {
    if (!dragStart) return;
    const rect = normalizeImageSelection(dragStart, imagePoint(event), imageWidth, imageHeight);
    setDragStart(null);
    if (rect.width >= 0.01 && rect.height >= 0.01) onSelection(rect);
  }

  return (
    <GlassPanel className="p-5">
      <div className="mb-3 flex flex-wrap gap-3 text-xs text-content-muted">
        <label className="flex items-center gap-1.5">
          <input type="checkbox" checked={layers.native} onChange={() => onToggleLayer('native')} />
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
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Button variant="ghost" onClick={() => onSelection({ x: 0, y: 0, width: 1, height: 1 })}>
          Usar página completa como zona
        </Button>
        {selection ? (
          <Button variant="ghost" onClick={onClearSelection}>
            Quitar zona marcada
          </Button>
        ) : null}
        <span className="text-xs text-content-subtle">
          Arrastra sobre la vista para definir una zona de valor reutilizable en el perfil.
        </span>
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
            className="absolute inset-0 h-full w-full touch-none cursor-crosshair"
            role="img"
            aria-label="Superposición de capas y editor de zona del laboratorio"
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              setDragStart(imagePoint(event));
            }}
            onPointerUp={finishSelection}
            onPointerCancel={() => setDragStart(null)}
          >
            {selection ? (
              <rect
                x={selection.relativeX * imageWidth}
                y={selection.relativeY * imageHeight}
                width={selection.relativeWidth * imageWidth}
                height={selection.relativeHeight * imageHeight}
                fill="rgb(34 211 238 / 0.12)"
                stroke="rgb(34 211 238)"
                strokeWidth={2}
                strokeDasharray="6 3"
              >
                <title>Zona de valor seleccionada por el analista</title>
              </rect>
            ) : null}
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
                  .filter(
                    (candidate) => candidate.evidence.x != null && candidate.evidence.y != null,
                  )
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

function ProfileSuggestions({
  representation,
  documentKind,
  session,
  selectedZone,
}: {
  representation: DocumentRepresentation;
  documentKind: DocumentKind;
  session: DocumentExtractionSession;
  selectedZone: DocumentProfileZone | null;
}) {
  const profiles = useLiveQuery(() => listDocumentProfiles(), []) ?? EMPTY_PROFILES;
  const signals = useMemo(() => computeDocumentProfileSignals(representation), [representation]);
  const matches = useMemo(
    () => matchDocumentProfiles(signals, documentKind, profiles),
    [signals, documentKind, profiles],
  );
  const [profileName, setProfileName] = useState('');
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(false);

  async function handleCreateProfile() {
    const name = profileName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const profile = await createDocumentProfile({
        name,
        documentKind,
        entityId: null,
        brandName: null,
        signals,
        expectedPageCount: signals.pageCount,
        zones: selectedZone ? [selectedZone] : [],
        fields: selectedZone?.field ? [selectedZone.field] : [],
        adapterId: null,
        confidence: 'low',
        origin: 'manual',
      });
      await recordExtractionFeedback({
        documentId: session.documentId,
        extractionSessionId: session.id,
        candidateId: null,
        decision: 'field_selected',
        reason: `Perfil ${name} creado en borrador para validación.`,
        method: null,
        adapterId: null,
        profileId: profile.id,
        beforeValue: null,
        afterValue: null,
        page: null,
        zoneId: null,
        applicability: 'profile_update',
      });
      setCreated(true);
      setProfileName('');
    } finally {
      setCreating(false);
    }
  }

  return (
    <GlassPanel className="p-5">
      <div className="flex items-center gap-2">
        <Layers className="h-4 w-4 text-tone-cyan" aria-hidden />
        <h3 className="text-sm font-semibold text-content-strong">Perfiles documentales</h3>
      </div>
      <p className="mt-1 text-xs text-content-muted">
        Un perfil ayuda a reconocer el mismo formato en expedientes de otros años. Nunca se asocia
        solo por el nombre del archivo, y activarlo siempre requiere confirmación.
      </p>
      {matches.length ? (
        <ul className="mt-3 space-y-2">
          {matches.map((match) => {
            const profile = profiles.find((item) => item.id === match.profileId);
            if (!profile) return null;
            return (
              <li
                key={match.profileId}
                className="rounded-lg border border-overlay/10 bg-overlay/5 p-3 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-content-strong">{profile.name}</span>
                  <div className="flex flex-wrap gap-2">
                    <Badge tone={profile.status === 'active' ? 'emerald' : 'neutral'}>
                      {PROFILE_STATUS_LABEL[profile.status]}
                    </Badge>
                    <Badge
                      tone={
                        match.confidence === 'high'
                          ? 'emerald'
                          : match.confidence === 'medium'
                            ? 'amber'
                            : 'neutral'
                      }
                    >
                      Confianza {MATCH_CONFIDENCE_LABEL[match.confidence]}
                    </Badge>
                  </div>
                </div>
                <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-content-subtle">
                  {match.reasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
                <div className="mt-3 flex flex-wrap gap-2">
                  {profile.status === 'draft' ? (
                    <Button
                      variant="ghost"
                      onClick={() => void updateDocumentProfileStatus(profile.id, 'tested')}
                    >
                      Marcar como probado
                    </Button>
                  ) : null}
                  {profile.status === 'tested' ? (
                    <Button
                      variant="ghost"
                      onClick={() => {
                        if (
                          window.confirm('Activar este perfil para futuras sugerencias locales?')
                        ) {
                          void updateDocumentProfileStatus(profile.id, 'active');
                        }
                      }}
                    >
                      Activar perfil
                    </Button>
                  ) : null}
                  {profile.status !== 'obsolete' ? (
                    <Button
                      variant="ghost"
                      onClick={() => {
                        if (
                          window.confirm(
                            'Marcar este perfil como obsoleto? No se eliminará su historial.',
                          )
                        ) {
                          void updateDocumentProfileStatus(profile.id, 'obsolete');
                        }
                      }}
                    >
                      Marcar obsoleto
                    </Button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-3 text-xs text-content-subtle">
          No hay perfiles compatibles todavía para este tipo de documento.
        </p>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input
          className="min-h-9 flex-1 rounded-lg border border-overlay/12 bg-overlay/5 px-3 py-1.5 text-xs text-content-strong"
          placeholder="Nombre del perfil (ej. Certificado de saldos — Mi Banco)"
          value={profileName}
          onChange={(event) => setProfileName(event.target.value)}
        />
        <Button
          variant="ghost"
          disabled={creating || !profileName.trim()}
          onClick={() => void handleCreateProfile()}
        >
          {creating ? 'Creando…' : 'Crear perfil desde este documento'}
        </Button>
      </div>
      {created ? (
        <p className="mt-2 text-xs text-tone-emerald">
          Perfil creado en borrador. Pruébalo con documentos similares antes de activarlo.
        </p>
      ) : null}
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
  const [category, setCategory] =
    useState<(typeof TaxCategorySchema.options)[number]>('unclassified');
  const [nature, setNature] = useState<(typeof TaxNatureSchema.options)[number]>('unclassified');
  const [treatment, setTreatment] =
    useState<(typeof TaxTreatmentSchema.options)[number]>('requires_review');
  const [applicability, setApplicability] =
    useState<ExtractionFeedbackApplicability>('this_document_only');
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
      const candidate = await createManualDocumentCandidate({
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
      await recordExtractionFeedback({
        documentId: session.documentId,
        extractionSessionId: session.id,
        candidateId: candidate.id,
        decision: 'field_selected',
        reason: `Selección manual del campo "${MANUAL_CANDIDATE_FIELD_LABEL[field]}" en el laboratorio.`,
        method: source,
        adapterId: null,
        profileId: null,
        beforeValue: null,
        afterValue: excerpt.slice(0, 160) || null,
        page,
        zoneId: null,
        applicability,
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
      <label className="mt-3 block text-xs text-content-muted">
        ¿Cómo quieres recordar esta decisión?
        <select
          className="mt-1 block min-h-10 w-full max-w-sm rounded-lg border border-overlay/12 bg-overlay/5 px-3 py-2 text-sm text-content-strong"
          value={applicability}
          onChange={(event) =>
            setApplicability(event.target.value as ExtractionFeedbackApplicability)
          }
        >
          {(['this_document_only', 'similar_documents', 'profile_update'] as const).map(
            (option) => (
              <option key={option} value={option}>
                {FEEDBACK_APPLICABILITY_LABEL[option]}
              </option>
            ),
          )}
        </select>
      </label>
      <div className="mt-4 flex items-center gap-3">
        <Button
          variant="secondary"
          onClick={() => void handleCreate()}
          disabled={saving || !concept}
        >
          {saving ? 'Creando…' : 'Crear candidato manual asistido'}
        </Button>
        {saved ? (
          <span className="text-xs text-tone-emerald">Candidato creado y listo para revisar.</span>
        ) : null}
      </div>
    </GlassPanel>
  );
}
