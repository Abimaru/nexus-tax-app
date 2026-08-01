'use client';

import {
  ArrowRight,
  CalendarDays,
  Download,
  FileSpreadsheet,
  ShieldCheck,
  Sparkles,
  Trash2,
} from 'lucide-react';
import type {
  CaseProgress,
  ProcessingResult,
  TaxCase,
  WorkflowStageId,
  WorkflowViewId,
} from '@nexus-tax/domain';
import { Badge, Button, GlassPanel, ProgressBar } from '@nexus-tax/ui';
import type { RecommendedAction, WorkflowStageState } from '@/lib/workflow';

export function WorkflowGuidancePanel({
  action,
  activeStage,
  stages,
  progress,
  onNavigate,
}: {
  action: RecommendedAction;
  activeStage: WorkflowStageId;
  stages: readonly WorkflowStageState[];
  progress: CaseProgress;
  onNavigate: (stage: WorkflowStageId, view: WorkflowViewId) => void;
}) {
  const current = stages.find((stage) => stage.id === activeStage);
  return (
    <GlassPanel className="mt-4 overflow-hidden p-5">
      <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={action.priority === 'high' ? 'amber' : 'cyan'}>
              Siguiente paso recomendado
            </Badge>
            <span className="text-xs text-content-subtle">
              Etapa {current?.number}: {current?.name}
            </span>
          </div>
          <h2 className="mt-3 text-lg font-semibold text-content-strong">{action.label}</h2>
          <p className="mt-1 text-sm text-content-muted">{action.reason}</p>
          <Button
            className="mt-4"
            leadingIcon={<ArrowRight className="h-4 w-4" />}
            onClick={() => onNavigate(action.stage, action.view)}
          >
            Ir al siguiente paso
            {action.pendingCount ? ` · ${action.pendingCount} pendiente(s)` : ''}
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <Dimension
            label="Extracción"
            value={stages.find((item) => item.id === 'extraccion')?.progress ?? 0}
          />
          <Dimension label="Cobertura documental" value={progress.documentCoverage} />
          <Dimension label="Conciliación" value={progress.reconciliation} />
          <Dimension
            label="Revisión"
            value={Math.round((progress.findings + progress.matrixPreparation) / 2)}
          />
        </div>
      </div>
    </GlassPanel>
  );
}

function Dimension({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-overlay/8 bg-overlay/[0.02] p-3">
      <ProgressBar ratio={value / 100} label={label} />
    </div>
  );
}

export function EmptySourceIntro({ onManual }: { onManual: () => void }) {
  return (
    <GlassPanel className="border-accent-cyan/20 p-7 text-center">
      <FileSpreadsheet className="mx-auto h-10 w-10 text-tone-cyan" aria-hidden />
      <h2 className="mt-4 text-xl font-semibold text-content-strong">
        Comienza cargando la información exógena
      </h2>
      <p className="mx-auto mt-2 max-w-2xl text-sm text-content-muted">
        NexusTax utilizará esta fuente para detectar entidades, topes, conceptos y documentos
        recomendados. El archivo se procesa únicamente en este navegador.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <label
          htmlFor="exogenous-file-input"
          className="inline-flex min-h-10 cursor-pointer items-center rounded-lg bg-gradient-to-r from-accent-cyan to-accent-blue px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-accent-blue/20 hover:brightness-110"
        >
          Cargar información exógena
        </label>
        <Button variant="ghost" onClick={onManual}>
          Continuar sin exógena
        </Button>
      </div>
      <p className="mt-3 text-xs text-content-subtle">
        El modo manual es limitado y no habilita extracción, matriz ni obligación automática.
      </p>
    </GlassPanel>
  );
}

export function SourceSummaryPanel({
  result,
  sourceInfo,
  onExtraction,
  onReplace,
  onRemove,
}: {
  result: ProcessingResult;
  sourceInfo?: { sha256: string | null; loadedAt: string };
  onExtraction: () => void;
  onReplace: () => void;
  onRemove: () => void;
}) {
  const safeName = result.workbook.fileName.split(/[\\/]/).pop() ?? 'fuente.xlsx';
  return (
    <GlassPanel className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Badge tone="emerald">Fuente procesada</Badge>
          <h2 className="mt-3 text-lg font-semibold text-content-strong">{safeName}</h2>
          <p className="text-sm text-content-muted">
            Cargada{' '}
            {sourceInfo ? new Date(sourceInfo.loadedAt).toLocaleString('es-CO') : 'localmente'}
          </p>
        </div>
        <ShieldCheck className="h-7 w-7 text-tone-emerald" aria-label="Procesamiento local" />
      </div>
      <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SourceMetric
          label="Año detectado"
          value={result.report.taxpayer.taxYear ?? 'Sin detectar'}
        />
        <SourceMetric label="Hojas" value={result.workbook.sheetCount} />
        <SourceMetric label="Registros" value={result.normalizedRecords.length} />
        <SourceMetric label="Topes" value={result.report.thresholds.length} />
      </dl>
      <p className="mt-4 break-all rounded-lg border border-overlay/8 bg-overlay/[0.02] p-3 font-mono text-xs text-content-muted">
        SHA-256:{' '}
        {sourceInfo?.sha256 ?? 'No disponible para fuentes procesadas antes de Sprint 2.0.2'}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={onExtraction}>Ver extracción</Button>
        <Button variant="secondary" onClick={onReplace}>
          Reemplazar fuente
        </Button>
        <Button variant="danger" leadingIcon={<Trash2 className="h-4 w-4" />} onClick={onRemove}>
          Eliminar fuente
        </Button>
      </div>
    </GlassPanel>
  );
}

function SourceMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-overlay/8 bg-overlay/[0.02] p-4">
      <dt className="text-xs text-content-subtle">{label}</dt>
      <dd className="mt-1 text-lg font-semibold text-content-strong">{value}</dd>
    </div>
  );
}

export function BasicCaseDataPanel({ taxCase }: { taxCase: TaxCase }) {
  return (
    <GlassPanel className="p-6">
      <h2 className="text-lg font-semibold text-content-strong">Datos básicos del expediente</h2>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <SourceMetric label="Alias" value={taxCase.alias} />
        <SourceMetric label="Año gravable" value={taxCase.taxYear} />
        <SourceMetric label="Año de presentación" value={taxCase.filingYear} />
        <SourceMetric
          label="Contribuyente"
          value={taxCase.taxpayer.displayName ?? 'Por identificar'}
        />
      </dl>
    </GlassPanel>
  );
}

export function ExtractionSummaryPanel({
  result,
  section,
}: {
  result: ProcessingResult;
  section: 'estructura' | 'topes' | 'calidad';
}) {
  if (section === 'topes') {
    return (
      <GlassPanel className="p-6">
        <h2 className="text-lg font-semibold text-content-strong">Topes detectados</h2>
        <ul className="mt-4 space-y-2 text-sm text-content-muted">
          {result.report.thresholds.map((threshold) => (
            <li
              key={`${threshold.source.sheet}:${threshold.source.row}`}
              className="rounded-lg border border-overlay/8 p-3"
            >
              {threshold.label} · ${threshold.value.toLocaleString('es-CO')} · fila{' '}
              {threshold.source.row}
            </li>
          ))}
        </ul>
      </GlassPanel>
    );
  }
  if (section === 'calidad') {
    const quality = result.metrics.qualityDimensions.extraction;
    return (
      <GlassPanel className="p-6">
        <h2 className="text-lg font-semibold text-content-strong">Calidad de extracción</h2>
        <div className="mt-4 max-w-xl">
          <ProgressBar ratio={quality.score / 100} label={`${quality.score}%`} />
        </div>
        <p className="mt-3 text-sm text-content-muted">{quality.explanation}</p>
        <p className="mt-2 text-xs text-content-subtle">
          {quality.issueCount} incidencia(s) de extracción.
        </p>
      </GlassPanel>
    );
  }
  const structure = result.report.structure;
  return (
    <GlassPanel className="p-6">
      <h2 className="text-lg font-semibold text-content-strong">Estructura confirmada</h2>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SourceMetric label="Hoja" value={result.selectedSheet} />
        <SourceMetric label="Encabezado" value={`Fila ${structure.headerRow}`} />
        <SourceMetric
          label="Topes"
          value={
            structure.thresholdsStartRow
              ? `Filas ${structure.thresholdsStartRow}–${structure.thresholdsEndRow}`
              : 'No aplica'
          }
        />
        <SourceMetric label="Detalle" value={`Desde fila ${structure.detailsStartRow}`} />
      </dl>
    </GlassPanel>
  );
}

export function FutureCapabilityPanel({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <GlassPanel className="p-7 text-center">
      <Sparkles className="mx-auto h-8 w-8 text-tone-violet" aria-hidden />
      <Badge className="mt-3" tone="violet">
        Capacidad futura
      </Badge>
      <h2 className="mt-3 text-lg font-semibold text-content-strong">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm text-content-muted">{description}</p>
    </GlassPanel>
  );
}

export function ExportWorkflowPanel({
  taxCase,
  progress,
  onExport,
}: {
  taxCase: TaxCase;
  progress: CaseProgress;
  onExport: () => void;
}) {
  const incomplete =
    progress.pendingRequirements + progress.openFindings + progress.pendingMatrixGroups > 0;
  return (
    <GlassPanel className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Badge tone={incomplete ? 'amber' : 'emerald'}>
            {incomplete ? 'Expediente incompleto' : 'Preparado para revisión'}
          </Badge>
          <h2 className="mt-3 text-lg font-semibold text-content-strong">Exportar expediente</h2>
          <p className="mt-1 text-sm text-content-muted">
            El manifiesto conserva el estado de “{taxCase.alias}”, su trazabilidad y decisiones, sin
            incluir archivos binarios.
          </p>
        </div>
        <Download className="h-7 w-7 text-tone-cyan" aria-hidden />
      </div>
      {incomplete ? (
        <p className="mt-4 rounded-lg border border-amber-400/20 bg-amber-400/5 p-3 text-sm text-tone-amber">
          La exportación representa un corte parcial: {progress.pendingRequirements} requisito(s),{' '}
          {progress.openFindings} hallazgo(s) y {progress.pendingMatrixGroups} grupo(s) pendientes.
        </p>
      ) : null}
      <Button className="mt-5" leadingIcon={<Download className="h-4 w-4" />} onClick={onExport}>
        Exportar manifiesto JSON
      </Button>
    </GlassPanel>
  );
}

export function CalendarCapabilityPanel() {
  return (
    <GlassPanel className="p-6">
      <CalendarDays className="h-7 w-7 text-tone-cyan" aria-hidden />
      <h2 className="mt-3 text-lg font-semibold text-content-strong">Calendario tributario</h2>
      <p className="mt-2 text-sm text-content-muted">
        La fecha aplicable se muestra dentro de Obligación de declarar y se calcula localmente con
        las reglas versionadas del año gravable.
      </p>
    </GlassPanel>
  );
}

export function HistoryFuturePanel() {
  return (
    <FutureCapabilityPanel
      title="Historial exportable"
      description="Una línea de tiempo consolidada del expediente se incorporará en un incremento futuro. Las decisiones actuales ya conservan sus marcas de tiempo e historial local."
    />
  );
}
