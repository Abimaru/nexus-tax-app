'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowLeft } from 'lucide-react';
import {
  WorkflowStageIdSchema,
  WorkflowViewIdSchema,
  type CaseAnalysis,
  type ProcessingResult,
  type WorkflowStageId,
  type WorkflowViewId,
} from '@nexus-tax/domain';
import { Badge } from '@nexus-tax/ui';
import {
  deleteCase,
  enableManualCase,
  getTaxCaseWorkspace,
  markWorkflowViewCompleted,
  removeExogenousSource,
  saveCaseNavigation,
  saveResult,
  updateCaseStatus,
} from '@/lib/repository';
import {
  buildEntitySummaries,
  buildTaxCaseManifest,
  calculateCaseProgress,
  suggestReconciliations,
} from '@/lib/taxCaseAnalysis';
import { downloadTextFile, safeBaseName } from '@/lib/download';
import {
  availableViews,
  defaultWorkflowDestination,
  deriveWorkflowStages,
  isWorkflowDestinationValid,
  recommendedWorkflowAction,
  workflowPath,
  WORKFLOW_STAGES,
  type WorkflowContext,
} from '@/lib/workflow';
import { useWorkbenchStore } from '@/lib/workbenchStore';
import { UploadPanel } from './UploadPanel';
import { InspectPanel } from './InspectPanel';
import { SummaryPanel } from './SummaryPanel';
import { RecordsPanel } from './RecordsPanel';
import { FindingsPanel } from './FindingsPanel';
import { TaxpayerIdentityPanel } from './TaxpayerIdentityPanel';
import { FilingObligationPanel } from './FilingObligationPanel';
import { MatrixPanel } from './MatrixPanel';
import { ResolutionDrawer } from './ResolutionDrawer';
import { CaseOverviewPanel } from './CaseOverviewPanel';
import { DocumentsPanel } from './DocumentsPanel';
import { EntitiesPanel } from './EntitiesPanel';
import { FactsPanel } from './FactsPanel';
import { ReconciliationsPanel } from './ReconciliationsPanel';
import { RequirementsPanel } from './RequirementsPanel';
import { ContextualNavigation, WorkflowStepper } from './WorkflowNavigation';
import {
  BasicCaseDataPanel,
  CalendarCapabilityPanel,
  EmptySourceIntro,
  ExportWorkflowPanel,
  ExtractionSummaryPanel,
  FutureCapabilityPanel,
  HistoryFuturePanel,
  SourceSummaryPanel,
  WorkflowGuidancePanel,
} from './WorkflowPanels';

export function CaseWorkbench({
  caseId,
  initialStage,
  initialView,
}: {
  caseId: string;
  initialStage?: WorkflowStageId;
  initialView?: WorkflowViewId;
}) {
  const router = useRouter();
  const workspace = useLiveQuery(() => getTaxCaseWorkspace(caseId), [caseId]);
  const taxCase = workspace?.taxCase;
  const result = workspace?.result;
  const analysis = workspace?.analysis;
  const [stage, setStage] = useState<WorkflowStageId>(initialStage ?? 'fuente');
  const [view, setView] = useState<WorkflowViewId>(initialView ?? 'cargar');
  const [focusRecordId, setFocusRecordId] = useState<string | null>(null);
  const [reviewRecordId, setReviewRecordId] = useState<string | null>(null);
  const initialized = useRef(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const phase = useWorkbenchStore((state) => state.phase);
  const sessionResult = useWorkbenchStore((state) => state.result);
  const fileHash = useWorkbenchStore((state) => state.fileHash);
  const fileLoadedAt = useWorkbenchStore((state) => state.fileLoadedAt);
  const resetWorkbench = useWorkbenchStore((state) => state.reset);

  const progress = useMemo(
    () =>
      calculateCaseProgress({
        result,
        analysis,
        documents: workspace?.documents ?? [],
        coverages: workspace?.coverages ?? [],
        facts: workspace?.facts ?? [],
        reconciliations: workspace?.reconciliations ?? [],
        employmentGroup: workspace?.employmentGroup,
      }),
    [result, analysis, workspace],
  );
  const entities = useMemo(
    () =>
      buildEntitySummaries({
        result,
        documents: workspace?.documents ?? [],
        coverages: workspace?.coverages ?? [],
        facts: workspace?.facts ?? [],
        reconciliations: workspace?.reconciliations ?? [],
      }),
    [result, workspace],
  );
  const suggestions = useMemo(
    () =>
      suggestReconciliations({
        facts: workspace?.facts ?? [],
        result,
        products: workspace?.products ?? [],
      }),
    [workspace?.facts, workspace?.products, result],
  );
  const workflowContext = useMemo<WorkflowContext>(
    () => ({
      taxCase,
      result,
      analysis,
      documents: workspace?.documents ?? [],
      facts: workspace?.facts ?? [],
      reconciliations: workspace?.reconciliations ?? [],
      progress,
      manualMode: workspace?.navigation?.manualMode ?? false,
      extractionPending: ['inspecting', 'inspected', 'processing'].includes(phase),
      vatResponsibility: workspace?.filingInputs?.isVatResponsibleAtYearEnd ?? null,
      completedViews: workspace?.navigation?.completedViews ?? [],
    }),
    [taxCase, result, analysis, workspace, progress, phase],
  );
  const stages = useMemo(
    () => deriveWorkflowStages(workflowContext, stage),
    [workflowContext, stage],
  );
  const recommendation = useMemo(
    () => recommendedWorkflowAction(workflowContext),
    [workflowContext],
  );
  const stageDefinition = WORKFLOW_STAGES.find((item) => item.id === stage)!;
  const visibleViews = availableViews(stageDefinition, workflowContext);
  const viewDefinition = stageDefinition.views.find((item) => item.id === view);

  function focusContent() {
    // `preventScroll` evita el salto de scroll al mover el foco al contenido.
    window.setTimeout(() => contentRef.current?.focus({ preventScroll: true }), 0);
  }

  function applyDestination(nextStage: WorkflowStageId, nextView: WorkflowViewId, replace = false) {
    setStage(nextStage);
    setView(nextView);
    const path = workflowPath(caseId, nextStage, nextView);
    // El contenido se renderiza desde el estado local `stage`/`view`, así que la
    // URL se actualiza de forma SUPERFICIAL con la History API (soportada por
    // Next 14.2): sin navegación RSC, sin remonta ni salto de scroll. Esto evita
    // el parpadeo al cambiar de paso y la URL sigue sirviendo para recarga y
    // deep-link (la ruta profunda la resuelve el servidor en un reload).
    if (typeof window !== 'undefined' && window.location.pathname !== path) {
      if (replace) window.history.replaceState(null, '', path);
      else window.history.pushState(null, '', path);
    }
    void saveCaseNavigation({
      caseId,
      stage: nextStage,
      view: nextView,
      recommendedStage: recommendation.stage,
    });
    focusContent();
  }

  useEffect(() => {
    if (!workspace || initialized.current) return;
    initialized.current = true;
    const requested =
      initialStage &&
      initialView &&
      isWorkflowDestinationValid(initialStage, initialView, workflowContext)
        ? { stage: initialStage, view: initialView }
        : undefined;
    const persisted =
      workspace.navigation &&
      isWorkflowDestinationValid(
        workspace.navigation.lastStage,
        workspace.navigation.lastView,
        workflowContext,
      )
        ? { stage: workspace.navigation.lastStage, view: workspace.navigation.lastView }
        : undefined;
    const destination = requested ?? persisted ?? defaultWorkflowDestination(workflowContext);
    applyDestination(destination.stage, destination.view, true);
    // La inicialización debe ejecutarse una sola vez por montaje.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspace]);

  useEffect(() => {
    if (!initialized.current || phase !== 'inspected') return;
    applyDestination('extraccion', 'inspeccion');
    // Solo reacciona al cambio de fase del worker.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useEffect(() => {
    if (!sessionResult) return;
    let active = true;
    void (async () => {
      await saveResult(caseId, sessionResult, {
        sha256: fileHash,
        loadedAt: fileLoadedAt ?? undefined,
      });
      if (active) {
        resetWorkbench();
        applyDestination('organizacion', 'resumen', true);
      }
    })();
    return () => {
      active = false;
    };
    // El resultado es el único disparador; hash y fecha pertenecen a la misma sesión.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionResult]);

  // Atrás/adelante del navegador: como la URL se actualiza con la History API,
  // sincronizamos el estado local leyendo la ruta al recibir `popstate`.
  useEffect(() => {
    function onPopState() {
      const segments = window.location.pathname.split('/').filter(Boolean);
      const parsedStage = WorkflowStageIdSchema.safeParse(segments[2]);
      const parsedView = WorkflowViewIdSchema.safeParse(segments[3]);
      if (parsedStage.success) setStage(parsedStage.data);
      if (parsedView.success) setView(parsedView.data);
    }
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  function selectStage(nextStage: WorkflowStageId) {
    const selected = stages.find((item) => item.id === nextStage);
    if (!selected || selected.status === 'locked') return;
    const views = availableViews(selected, workflowContext);
    const nextView = views.find((item) => !item.future)?.id ?? selected.defaultView;
    applyDestination(nextStage, nextView);
  }

  function selectView(nextView: WorkflowViewId) {
    const selected = visibleViews.find((item) => item.id === nextView);
    if (!selected || selected.future) return;
    applyDestination(stage, nextView);
  }

  function navigateToRecord(recordId: string) {
    setFocusRecordId(recordId);
    applyDestination('extraccion', 'registros');
  }

  function exportManifest() {
    if (!taxCase || !workspace) return;
    const manifest = buildTaxCaseManifest({
      taxCase,
      result,
      analysis,
      documents: workspace.documents,
      products: workspace.products,
      coverages: workspace.coverages,
      facts: workspace.facts,
      reconciliations: workspace.reconciliations,
      employmentGroup: workspace.employmentGroup,
      navigation: workspace.navigation,
    });
    downloadTextFile(
      `${safeBaseName(taxCase.alias)}-manifiesto.json`,
      JSON.stringify(manifest, null, 2),
    );
    void markWorkflowViewCompleted(caseId, 'exportacion', 'manifiesto');
  }

  async function continueManually() {
    if (
      !window.confirm(
        'El modo manual es limitado: no habilita extracción, matriz ni obligación automática. ¿Deseas continuar?',
      )
    )
      return;
    await enableManualCase(caseId);
    applyDestination('organizacion', 'documentos', true);
  }

  function replaceSource() {
    if (
      !window.confirm(
        'Reemplazar la fuente puede invalidar análisis y resoluciones. Las decisiones compatibles se conservarán y las afectadas se marcarán obsoletas. ¿Continuar?',
      )
    )
      return;
    resetWorkbench();
    applyDestination('fuente', 'reemplazar');
  }

  async function removeSource() {
    if (
      !window.confirm(
        'Se eliminarán la exógena normalizada y su análisis. Los documentos y hechos manuales permanecerán. ¿Continuar?',
      )
    )
      return;
    await removeExogenousSource(caseId);
    resetWorkbench();
    applyDestination('fuente', 'cargar', true);
  }

  async function removeCase() {
    if (
      !taxCase ||
      !window.confirm(`¿Eliminar localmente el expediente “${taxCase.alias}” y todos sus datos?`)
    )
      return;
    await deleteCase(caseId);
    router.push('/');
  }

  if (!workspace || !taxCase) {
    return (
      <p className="py-12 text-center text-sm text-content-muted">Cargando expediente local…</p>
    );
  }

  return (
    <div className="pt-2">
      <nav
        aria-label="Ruta del expediente"
        className="flex flex-wrap items-center gap-1 text-xs text-content-muted"
      >
        <Link href="/" className="inline-flex items-center gap-1 hover:text-content">
          <ArrowLeft className="h-3.5 w-3.5" /> Expedientes
        </Link>
        <span aria-hidden>/</span>
        <span>{taxCase.alias}</span>
        <span aria-hidden>/</span>
        <span>AG {taxCase.taxYear}</span>
        <span aria-hidden>/</span>
        <span>{stageDefinition.name}</span>
        <span aria-hidden>/</span>
        <span aria-current="page">{viewDefinition?.label ?? view}</span>
      </nav>

      <header className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-content-strong">
            {taxCase.alias}
          </h1>
          <p className="mt-0.5 text-sm text-content-muted">
            {taxCase.taxpayer.displayName ?? 'Contribuyente por identificar'} ·{' '}
            {taxCase.taxpayer.documentMasked ?? 'documento pendiente'} · año gravable{' '}
            {taxCase.taxYear}
          </p>
        </div>
        <Badge tone={result ? 'emerald' : workflowContext.manualMode ? 'amber' : 'cyan'}>
          {result
            ? 'Fuente procesada'
            : workflowContext.manualMode
              ? 'Modo manual limitado'
              : 'Sin fuente'}
        </Badge>
      </header>

      <WorkflowStepper stages={stages} activeStage={stage} onSelect={selectStage} />
      <ContextualNavigation views={visibleViews} activeView={view} onSelect={selectView} />
      <WorkflowGuidancePanel
        action={recommendation}
        activeStage={stage}
        stages={stages}
        progress={progress}
        onNavigate={applyDestination}
      />

      <div ref={contentRef} tabIndex={-1} className="mt-6 focus:outline-none">
        {stage === 'fuente' && view === 'cargar' ? (
          <div className="space-y-4">
            <EmptySourceIntro onManual={() => void continueManually()} />
            <UploadPanel />
          </div>
        ) : null}
        {stage === 'fuente' && view === 'reemplazar' ? <UploadPanel /> : null}
        {stage === 'fuente' && view === 'estado-fuente' && result ? (
          <SourceSummaryPanel
            result={result}
            sourceInfo={workspace.sourceInfo}
            onExtraction={() => applyDestination('extraccion', 'estructura')}
            onReplace={replaceSource}
            onRemove={() => void removeSource()}
          />
        ) : null}
        {stage === 'fuente' && view === 'datos-basicos' ? (
          <BasicCaseDataPanel taxCase={taxCase} />
        ) : null}

        {stage === 'extraccion' && ['inspeccion', 'mapeo'].includes(view) ? <InspectPanel /> : null}
        {stage === 'extraccion' && ['estructura', 'topes', 'calidad'].includes(view) && result ? (
          <ExtractionSummaryPanel
            result={result}
            section={view as 'estructura' | 'topes' | 'calidad'}
          />
        ) : null}
        {stage === 'extraccion' && view === 'registros' ? (
          <ResultGate result={result}>
            {(current) => (
              <RecordsPanel
                result={current}
                analysis={analysis}
                focusRecordId={focusRecordId}
                onFocusHandled={() => setFocusRecordId(null)}
              />
            )}
          </ResultGate>
        ) : null}

        {stage === 'organizacion' && view === 'resumen' ? (
          <div className="space-y-6">
            <CaseOverviewPanel
              taxCase={taxCase}
              result={result}
              analysis={analysis}
              progress={progress}
              vatResponsibility={workspace.filingInputs?.isVatResponsibleAtYearEnd ?? null}
              onNavigate={(section) =>
                applyDestination(
                  section === 'matriz' || section === 'hallazgos' ? 'conciliacion' : 'organizacion',
                  section,
                )
              }
              onExport={exportManifest}
              onDelete={() => void removeCase()}
              onStatusChange={(status) => void updateCaseStatus(caseId, status)}
            />
            {result?.report.taxpayer ? (
              <TaxpayerIdentityPanel taxpayer={result.report.taxpayer} />
            ) : null}
            {result ? <SummaryPanel result={result} analysis={analysis} /> : null}
          </div>
        ) : null}
        {stage === 'organizacion' && view === 'entidades' ? (
          <EntitiesPanel
            caseId={caseId}
            entities={entities}
            products={workspace.products}
            employmentGroup={workspace.employmentGroup}
            documents={workspace.documents}
          />
        ) : null}
        {stage === 'organizacion' && view === 'documentos' ? (
          <DocumentsPanel
            caseId={caseId}
            taxYear={taxCase.taxYear}
            result={result}
            documents={workspace.documents}
            products={workspace.products}
            coverages={workspace.coverages}
            localBytes={workspace.localBytes}
          />
        ) : null}
        {stage === 'organizacion' && view === 'requisitos' ? (
          <RequirementsPanel
            caseId={caseId}
            result={result}
            documents={workspace.documents}
            coverages={workspace.coverages}
            employmentGroup={workspace.employmentGroup}
          />
        ) : null}
        {stage === 'organizacion' && view === 'hechos' ? (
          <FactsPanel
            caseId={caseId}
            result={result}
            documents={workspace.documents}
            products={workspace.products}
            facts={workspace.facts}
          />
        ) : null}

        {stage === 'conciliacion' && view === 'conciliaciones' ? (
          <ReconciliationsPanel
            caseId={caseId}
            result={result}
            facts={workspace.facts}
            suggestions={suggestions}
            reconciliations={workspace.reconciliations}
          />
        ) : null}
        {stage === 'conciliacion' && view === 'matriz' ? (
          <AnalysisGate result={result} analysis={analysis}>
            {(currentResult, currentAnalysis) => (
              <MatrixPanel caseId={caseId} result={currentResult} analysis={currentAnalysis} />
            )}
          </AnalysisGate>
        ) : null}
        {stage === 'conciliacion' && ['hallazgos', 'resoluciones'].includes(view) ? (
          <ResultGate result={result}>
            {(current) => (
              <FindingsPanel
                result={current}
                analysis={analysis}
                onNavigateToRecord={navigateToRecord}
                onReviewRecord={setReviewRecordId}
              />
            )}
          </ResultGate>
        ) : null}

        {stage === 'declaracion' && view === 'obligacion' ? (
          <ResultGate result={result}>
            {(current) => (
              <FilingObligationPanel result={current} caseId={caseId} taxYear={taxCase.taxYear} />
            )}
          </ResultGate>
        ) : null}
        {stage === 'declaracion' && view === 'calendario' ? <CalendarCapabilityPanel /> : null}
        {stage === 'declaracion' && view === 'formulario-210' ? (
          <FutureCapabilityPanel
            title="Formulario 210"
            description="El constructor definitivo del formulario no está disponible en este sprint. Esta etapa permanecerá explicable y sujeta a revisión humana."
          />
        ) : null}

        {stage === 'exportacion' && ['resumen-final', 'exportar', 'manifiesto'].includes(view) ? (
          <ExportWorkflowPanel taxCase={taxCase} progress={progress} onExport={exportManifest} />
        ) : null}
        {stage === 'exportacion' && view === 'historial' ? <HistoryFuturePanel /> : null}
      </div>

      {reviewRecordId && result && analysis ? (
        <ResolutionDrawer
          caseId={caseId}
          recordId={reviewRecordId}
          result={result}
          analysis={analysis}
          onClose={() => setReviewRecordId(null)}
        />
      ) : null}
    </div>
  );
}

function AnalysisGate({
  result,
  analysis,
  children,
}: {
  result?: ProcessingResult;
  analysis?: CaseAnalysis;
  children: (result: ProcessingResult, analysis: CaseAnalysis) => React.ReactNode;
}) {
  if (!result || !analysis)
    return <BlockedMessage>Procesa la exógena para construir la matriz.</BlockedMessage>;
  return <>{children(result, analysis)}</>;
}

function ResultGate({
  result,
  children,
}: {
  result?: ProcessingResult;
  children: (result: ProcessingResult) => React.ReactNode;
}) {
  if (!result)
    return (
      <BlockedMessage>Carga y procesa una fuente exógena para ver esta sección.</BlockedMessage>
    );
  return <>{children(result)}</>;
}

function BlockedMessage({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-overlay/10 bg-overlay/[0.02] p-6 text-sm text-content-muted">
      {children}
    </p>
  );
}
