'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  ClipboardList,
  Files,
  Grid3X3,
  LayoutDashboard,
  ReceiptText,
  Scale,
  SearchCheck,
  Table2,
  Upload,
  Waypoints,
} from 'lucide-react';
import type { CaseAnalysis, ProcessingResult } from '@nexus-tax/domain';
import { Badge } from '@nexus-tax/ui';
import { deleteCase, getTaxCaseWorkspace, saveResult, updateCaseStatus } from '@/lib/repository';
import {
  buildEntitySummaries,
  buildTaxCaseManifest,
  calculateCaseProgress,
  suggestReconciliations,
} from '@/lib/taxCaseAnalysis';
import { downloadTextFile, safeBaseName } from '@/lib/download';
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

type TabKey =
  | 'resumen'
  | 'entidades'
  | 'documentos'
  | 'requisitos'
  | 'hechos'
  | 'conciliaciones'
  | 'matriz'
  | 'hallazgos'
  | 'cargar'
  | 'inspeccion'
  | 'registros'
  | 'obligacion';

const TABS: { key: TabKey; label: string; icon: typeof Upload; needsResult: boolean }[] = [
  { key: 'resumen', label: 'Resumen', icon: LayoutDashboard, needsResult: false },
  { key: 'entidades', label: 'Entidades', icon: Building2, needsResult: true },
  { key: 'documentos', label: 'Documentos', icon: Files, needsResult: false },
  { key: 'requisitos', label: 'Requisitos', icon: ClipboardList, needsResult: true },
  { key: 'hechos', label: 'Hechos', icon: ReceiptText, needsResult: false },
  { key: 'conciliaciones', label: 'Conciliaciones', icon: Waypoints, needsResult: false },
  { key: 'matriz', label: 'Matriz', icon: Grid3X3, needsResult: true },
  { key: 'hallazgos', label: 'Hallazgos', icon: AlertTriangle, needsResult: true },
  { key: 'cargar', label: 'Cargar exógena', icon: Upload, needsResult: false },
  { key: 'inspeccion', label: 'Inspección', icon: SearchCheck, needsResult: false },
  { key: 'registros', label: 'Registros', icon: Table2, needsResult: true },
  { key: 'obligacion', label: 'Obligación', icon: Scale, needsResult: true },
];

export function CaseWorkbench({ caseId }: { caseId: string }) {
  const router = useRouter();
  const workspace = useLiveQuery(() => getTaxCaseWorkspace(caseId), [caseId]);
  const taxCase = workspace?.taxCase;
  const result = workspace?.result;
  const analysis = workspace?.analysis;
  const [tab, setTab] = useState<TabKey>('resumen');
  const [focusRecordId, setFocusRecordId] = useState<string | null>(null);
  const [reviewRecordId, setReviewRecordId] = useState<string | null>(null);
  const phase = useWorkbenchStore((state) => state.phase);
  const sessionResult = useWorkbenchStore((state) => state.result);
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
      }),
    [
      result,
      analysis,
      workspace?.documents,
      workspace?.coverages,
      workspace?.facts,
      workspace?.reconciliations,
    ],
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
    [
      result,
      workspace?.documents,
      workspace?.coverages,
      workspace?.facts,
      workspace?.reconciliations,
    ],
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

  useEffect(() => {
    if (phase === 'inspected') setTab('inspeccion');
  }, [phase]);
  useEffect(() => {
    if (!sessionResult) return;
    let active = true;
    void (async () => {
      await saveResult(caseId, sessionResult);
      if (active) {
        setTab('resumen');
        resetWorkbench();
      }
    })();
    return () => {
      active = false;
    };
  }, [sessionResult, caseId, resetWorkbench]);

  function navigateToRecord(recordId: string) {
    setFocusRecordId(recordId);
    setTab('registros');
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
    });
    downloadTextFile(
      `${safeBaseName(taxCase.alias)}-manifiesto.json`,
      JSON.stringify(manifest, null, 2),
    );
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

  const hasResult = Boolean(result);
  return (
    <div className="pt-2">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-content-muted hover:text-content"
      >
        <ArrowLeft className="h-4 w-4" /> Expedientes
      </Link>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-content-strong">
            {taxCase?.alias ?? 'Expediente'}
          </h1>
          {taxCase ? (
            <p className="mt-0.5 text-sm text-content-muted">
              Año gravable {taxCase.taxYear} · presentación {taxCase.filingYear}
              {taxCase.notes ? ` · ${taxCase.notes}` : ''}
            </p>
          ) : null}
        </div>
        {hasResult ? (
          <Badge tone="emerald">Fuente exógena disponible</Badge>
        ) : (
          <Badge tone="cyan">Expediente local</Badge>
        )}
      </div>
      {result?.report.taxpayer ? <TaxpayerIdentityPanel taxpayer={result.report.taxpayer} /> : null}
      <nav
        aria-label="Secciones del expediente"
        className="mt-5 overflow-x-auto border-b border-overlay/8"
      >
        <div className="flex min-w-max gap-1">
          {TABS.map(({ key, label, icon: Icon, needsResult }) => {
            const disabled = needsResult && !hasResult;
            const active = tab === key;
            return (
              <button
                key={key}
                type="button"
                disabled={disabled}
                onClick={() => setTab(key)}
                aria-current={active ? 'page' : undefined}
                className={`inline-flex items-center gap-2 rounded-t-lg border-b-2 px-3 py-2 text-sm transition-colors ${active ? 'border-accent-cyan text-content-strong' : 'border-transparent text-content-muted hover:text-content'} ${disabled ? 'cursor-not-allowed opacity-40' : ''}`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            );
          })}
        </div>
      </nav>
      <div className="mt-6">
        {tab === 'resumen' && taxCase ? (
          <div className="space-y-6">
            <CaseOverviewPanel
              taxCase={taxCase}
              result={result}
              analysis={analysis}
              progress={progress}
              vatResponsibility={workspace?.filingInputs?.isVatResponsibleAtYearEnd ?? null}
              onNavigate={(section) => setTab(section)}
              onExport={exportManifest}
              onDelete={() => void removeCase()}
              onStatusChange={(status) => void updateCaseStatus(caseId, status)}
            />
            {result ? <SummaryPanel result={result} analysis={analysis} /> : null}
          </div>
        ) : null}
        {tab === 'entidades' && (
          <EntitiesPanel caseId={caseId} entities={entities} products={workspace?.products ?? []} />
        )}
        {tab === 'documentos' && taxCase ? (
          <DocumentsPanel
            caseId={caseId}
            taxYear={taxCase.taxYear}
            result={result}
            documents={workspace?.documents ?? []}
            products={workspace?.products ?? []}
            coverages={workspace?.coverages ?? []}
            localBytes={workspace?.localBytes ?? 0}
          />
        ) : null}
        {tab === 'requisitos' && (
          <RequirementsPanel
            caseId={caseId}
            result={result}
            documents={workspace?.documents ?? []}
            coverages={workspace?.coverages ?? []}
          />
        )}
        {tab === 'hechos' && (
          <FactsPanel
            caseId={caseId}
            result={result}
            documents={workspace?.documents ?? []}
            products={workspace?.products ?? []}
            facts={workspace?.facts ?? []}
          />
        )}
        {tab === 'conciliaciones' && (
          <ReconciliationsPanel
            caseId={caseId}
            result={result}
            facts={workspace?.facts ?? []}
            suggestions={suggestions}
            reconciliations={workspace?.reconciliations ?? []}
          />
        )}
        {tab === 'cargar' && <UploadPanel />}
        {tab === 'inspeccion' && <InspectPanel />}
        {tab === 'matriz' && (
          <AnalysisGate result={result} analysis={analysis}>
            {(currentResult, currentAnalysis) => (
              <MatrixPanel caseId={caseId} result={currentResult} analysis={currentAnalysis} />
            )}
          </AnalysisGate>
        )}
        {tab === 'registros' && (
          <ResultGate result={result}>
            {(currentResult) => (
              <RecordsPanel
                result={currentResult}
                analysis={analysis}
                focusRecordId={focusRecordId}
                onFocusHandled={() => setFocusRecordId(null)}
              />
            )}
          </ResultGate>
        )}
        {tab === 'obligacion' && taxCase ? (
          <ResultGate result={result}>
            {(currentResult) => (
              <FilingObligationPanel
                result={currentResult}
                caseId={caseId}
                taxYear={taxCase.taxYear}
              />
            )}
          </ResultGate>
        ) : null}
        {tab === 'hallazgos' && (
          <ResultGate result={result}>
            {(currentResult) => (
              <FindingsPanel
                result={currentResult}
                analysis={analysis}
                onNavigateToRecord={navigateToRecord}
                onReviewRecord={setReviewRecordId}
              />
            )}
          </ResultGate>
        )}
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
  result: ProcessingResult | undefined;
  analysis: CaseAnalysis | undefined;
  children: (result: ProcessingResult, analysis: CaseAnalysis) => React.ReactNode;
}) {
  if (!result || !analysis)
    return (
      <p className="rounded-xl border border-overlay/10 bg-overlay/[0.02] p-6 text-sm text-content-muted">
        Procesa la exógena para construir la matriz.
      </p>
    );
  return <>{children(result, analysis)}</>;
}
function ResultGate({
  result,
  children,
}: {
  result: ProcessingResult | undefined;
  children: (result: ProcessingResult) => React.ReactNode;
}) {
  if (!result)
    return (
      <p className="rounded-xl border border-overlay/10 bg-overlay/[0.02] p-6 text-sm text-content-muted">
        Carga y procesa una fuente exógena para ver esta sección.
      </p>
    );
  return <>{children(result)}</>;
}
