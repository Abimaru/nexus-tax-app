'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  AlertTriangle,
  ArrowLeft,
  ClipboardList,
  LayoutDashboard,
  Table2,
  Upload,
  SearchCheck,
  Scale,
  Grid3X3,
} from 'lucide-react';
import type { CaseAnalysis, ProcessingResult } from '@nexus-tax/domain';
import { Badge } from '@nexus-tax/ui';
import { getCase, getCaseAnalysis, getResult, saveResult } from '@/lib/repository';
import { useWorkbenchStore } from '@/lib/workbenchStore';
import { UploadPanel } from './UploadPanel';
import { InspectPanel } from './InspectPanel';
import { SummaryPanel } from './SummaryPanel';
import { RecordsPanel } from './RecordsPanel';
import { ChecklistPanel } from './ChecklistPanel';
import { FindingsPanel } from './FindingsPanel';
import { TaxpayerIdentityPanel } from './TaxpayerIdentityPanel';
import { FilingObligationPanel } from './FilingObligationPanel';
import { MatrixPanel } from './MatrixPanel';
import { ResolutionDrawer } from './ResolutionDrawer';

type TabKey =
  | 'cargar'
  | 'inspeccion'
  | 'resumen'
  | 'obligacion'
  | 'matriz'
  | 'registros'
  | 'checklist'
  | 'hallazgos';

const TABS: { key: TabKey; label: string; icon: typeof Upload; needsResult: boolean }[] = [
  { key: 'cargar', label: 'Cargar', icon: Upload, needsResult: false },
  { key: 'inspeccion', label: 'Inspección', icon: SearchCheck, needsResult: false },
  { key: 'resumen', label: 'Resumen', icon: LayoutDashboard, needsResult: true },
  { key: 'obligacion', label: 'Obligación', icon: Scale, needsResult: true },
  { key: 'matriz', label: 'Matriz', icon: Grid3X3, needsResult: true },
  { key: 'registros', label: 'Registros', icon: Table2, needsResult: true },
  { key: 'checklist', label: 'Checklist', icon: ClipboardList, needsResult: true },
  { key: 'hallazgos', label: 'Hallazgos', icon: AlertTriangle, needsResult: true },
];

export function CaseWorkbench({ caseId }: { caseId: string }) {
  const taxCase = useLiveQuery(() => getCase(caseId), [caseId]);
  const result = useLiveQuery(() => getResult(caseId), [caseId]);
  const analysis = useLiveQuery(
    () => (result ? getCaseAnalysis(caseId) : undefined),
    [caseId, result?.parserVersion],
  );

  const [tab, setTab] = useState<TabKey>('cargar');
  const [focusRecordId, setFocusRecordId] = useState<string | null>(null);
  const [reviewRecordId, setReviewRecordId] = useState<string | null>(null);

  const phase = useWorkbenchStore((s) => s.phase);
  const sessionResult = useWorkbenchStore((s) => s.result);
  const resetWorkbench = useWorkbenchStore((s) => s.reset);

  // Al terminar la lectura, avanza a Inspección.
  useEffect(() => {
    if (phase === 'inspected') setTab('inspeccion');
  }, [phase]);

  // Al finalizar el procesamiento, persiste y muestra el resumen.
  useEffect(() => {
    if (!sessionResult) return;
    let active = true;
    void (async () => {
      await saveResult(caseId, sessionResult);
      if (!active) return;
      setTab('resumen');
      resetWorkbench();
    })();
    return () => {
      active = false;
    };
  }, [sessionResult, caseId, resetWorkbench]);

  // Si ya hay resultado persistido y seguimos en la pantalla de carga, muestra resumen.
  useEffect(() => {
    if (result && (tab === 'cargar' || tab === 'inspeccion') && phase === 'idle') {
      setTab('resumen');
    }
    // Solo al montar/llegar resultado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  function navigateToRecord(recordId: string) {
    setFocusRecordId(recordId);
    setTab('registros');
  }

  const hasResult = Boolean(result);

  return (
    <div className="pt-2">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> Expedientes
      </Link>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-50">
            {taxCase?.alias ?? 'Expediente'}
          </h1>
          {taxCase ? (
            <p className="mt-0.5 text-sm text-slate-400">
              Año gravable {taxCase.taxYear}
              {taxCase.notes ? ` · ${taxCase.notes}` : ''}
            </p>
          ) : null}
        </div>
        {hasResult ? <Badge tone="emerald">Extracción disponible</Badge> : null}
      </div>

      {result?.report?.taxpayer ? (
        <TaxpayerIdentityPanel taxpayer={result.report.taxpayer} />
      ) : null}

      <nav
        aria-label="Secciones del expediente"
        className="mt-5 flex flex-wrap gap-1 border-b border-white/8"
      >
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
              className={[
                'inline-flex items-center gap-2 rounded-t-lg px-3 py-2 text-sm transition-colors',
                active
                  ? 'border-b-2 border-accent-cyan text-slate-100'
                  : 'border-b-2 border-transparent text-slate-400 hover:text-slate-200',
                disabled ? 'cursor-not-allowed opacity-40' : '',
              ].join(' ')}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {label}
            </button>
          );
        })}
      </nav>

      <div className="mt-6">
        {tab === 'cargar' && <UploadPanel />}
        {tab === 'inspeccion' && <InspectPanel />}
        {tab === 'resumen' && (
          <ResultGate result={result}>
            {(r) => <SummaryPanel result={r} analysis={analysis} />}
          </ResultGate>
        )}
        {tab === 'matriz' && (
          <AnalysisGate result={result} analysis={analysis}>
            {(r, currentAnalysis) => (
              <MatrixPanel caseId={caseId} result={r} analysis={currentAnalysis} />
            )}
          </AnalysisGate>
        )}
        {tab === 'registros' && (
          <ResultGate result={result}>
            {(r) => (
              <RecordsPanel
                result={r}
                analysis={analysis}
                focusRecordId={focusRecordId}
                onFocusHandled={() => setFocusRecordId(null)}
              />
            )}
          </ResultGate>
        )}
        {tab === 'obligacion' && taxCase ? (
          <ResultGate result={result}>
            {(r) => <FilingObligationPanel result={r} caseId={caseId} taxYear={taxCase.taxYear} />}
          </ResultGate>
        ) : null}
        {tab === 'checklist' && (
          <ResultGate result={result}>
            {(r) => <ChecklistPanel result={r} caseId={caseId} />}
          </ResultGate>
        )}
        {tab === 'hallazgos' && (
          <ResultGate result={result}>
            {(r) => (
              <FindingsPanel
                result={r}
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
  if (!result || !analysis) {
    return (
      <p className="rounded-xl border border-white/10 bg-white/[0.02] p-6 text-sm text-slate-400">
        Procesa el archivo para construir la matriz tributaria local.
      </p>
    );
  }
  return <>{children(result, analysis)}</>;
}

/** Muestra el contenido solo cuando existe un resultado persistido. */
function ResultGate({
  result,
  children,
}: {
  result: ProcessingResult | undefined;
  children: (result: ProcessingResult) => React.ReactNode;
}) {
  if (!result) {
    return (
      <p className="rounded-xl border border-white/10 bg-white/[0.02] p-6 text-sm text-slate-400">
        Carga y procesa un archivo de información exógena para ver esta sección.
      </p>
    );
  }
  return <>{children(result)}</>;
}
