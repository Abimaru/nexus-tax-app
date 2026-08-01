'use client';

import { AlertTriangle, FilePlus2, Grid3X3, ListChecks, PlusCircle, Trash2 } from 'lucide-react';
import { assessFilingObligation } from '@nexus-tax/aegis-rules';
import {
  TaxCaseStatusSchema,
  type CaseAnalysis,
  type CaseProgress,
  type ProcessingResult,
  type TaxCase,
} from '@nexus-tax/domain';
import { Badge, Button, GlassPanel, ProgressBar } from '@nexus-tax/ui';
import { CASE_STATUS_LABEL } from '@/lib/dossierPresentation';

export function CaseOverviewPanel({
  taxCase,
  result,
  analysis,
  progress,
  vatResponsibility,
  onNavigate,
  onExport,
  onDelete,
  onStatusChange,
}: {
  taxCase: TaxCase;
  result?: ProcessingResult;
  analysis?: CaseAnalysis;
  progress: CaseProgress;
  vatResponsibility: boolean | null;
  onNavigate: (section: 'documentos' | 'hechos' | 'requisitos' | 'matriz' | 'hallazgos') => void;
  onExport: () => void;
  onDelete: () => void;
  onStatusChange: (status: TaxCase['status']) => void;
}) {
  const assessment =
    result && (result.report.taxpayer.taxYear ?? taxCase.taxYear) === 2025
      ? assessFilingObligation({
          thresholds: result.report.thresholds,
          isVatResponsibleAtYearEnd: vatResponsibility,
          document: result.report.taxpayer.documentRaw,
          documentType: result.report.taxpayer.documentType,
          evaluatedAt: new Date().toISOString(),
        })
      : null;
  return (
    <div className="space-y-5">
      <GlassPanel className="overflow-hidden p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold text-content-strong">Panel del expediente</h2>
              <Badge tone="cyan">{CASE_STATUS_LABEL[taxCase.status]}</Badge>
            </div>
            <p className="mt-1 text-sm text-content-muted">
              Año gravable {taxCase.taxYear} · presentación {taxCase.filingYear}
            </p>
          </div>
          <Button variant="secondary" onClick={onExport}>
            Exportar expediente
          </Button>
        </div>
        <label className="mt-4 block max-w-sm text-xs text-content-muted">
          Estado del expediente
          <select
            value={taxCase.status}
            onChange={(event) => onStatusChange(event.target.value as TaxCase['status'])}
            className="mt-1 w-full rounded-lg border border-overlay/12 bg-overlay/5 px-3 py-2 text-sm text-content-strong"
          >
            {TaxCaseStatusSchema.options.map((status) => (
              <option className="bg-surface-raised" key={status} value={status}>
                {CASE_STATUS_LABEL[status]}
              </option>
            ))}
          </select>
        </label>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <OverviewStat
            label="Obligación"
            value={
              assessment?.status === 'required'
                ? 'Criterio activado'
                : assessment?.status === 'not_required'
                  ? 'Sin criterio activado'
                  : 'Pendiente'
            }
          />
          <OverviewStat
            label="Vencimiento"
            value={assessment?.deadline.dueDate ?? 'Por determinar'}
          />
          <OverviewStat label="Documentos" value={progress.documentCount} />
          <OverviewStat label="Hallazgos abiertos" value={progress.openFindings} />
        </div>
      </GlassPanel>

      <div className="grid gap-4 lg:grid-cols-2">
        <GlassPanel className="p-5">
          <h3 className="font-medium text-content-strong">Progreso por dimensión</h3>
          <div className="mt-4 space-y-4">
            <ProgressBar ratio={progress.documentCoverage / 100} label="Cobertura documental" />
            <ProgressBar ratio={progress.reviewedFacts / 100} label="Hechos revisados" />
            <ProgressBar ratio={progress.reconciliation / 100} label="Conciliación documental" />
            <ProgressBar ratio={progress.findings / 100} label="Hallazgos resueltos" />
            <ProgressBar ratio={progress.matrixPreparation / 100} label="Preparación de matriz" />
          </div>
        </GlassPanel>
        <GlassPanel className="p-5">
          <h3 className="font-medium text-content-strong">Qué falta</h3>
          <ul className="mt-3 space-y-2 text-sm text-content-muted">
            {progress.explanation.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-content-subtle">Requisitos pendientes</dt>
              <dd className="text-lg text-content-strong">{progress.pendingRequirements}</dd>
            </div>
            <div>
              <dt className="text-content-subtle">Grupos pendientes</dt>
              <dd className="text-lg text-content-strong">{progress.pendingMatrixGroups}</dd>
            </div>
          </dl>
        </GlassPanel>
      </div>

      <GlassPanel className="p-5">
        <h3 className="font-medium text-content-strong">Acciones rápidas</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            leadingIcon={<FilePlus2 className="h-4 w-4" />}
            onClick={() => onNavigate('documentos')}
          >
            Cargar documento
          </Button>
          <Button
            variant="secondary"
            leadingIcon={<PlusCircle className="h-4 w-4" />}
            onClick={() => onNavigate('hechos')}
          >
            Registrar valores manualmente
          </Button>
          <Button
            variant="secondary"
            leadingIcon={<ListChecks className="h-4 w-4" />}
            onClick={() => onNavigate('requisitos')}
          >
            Revisar pendientes
          </Button>
          <Button
            variant="secondary"
            leadingIcon={<Grid3X3 className="h-4 w-4" />}
            onClick={() => onNavigate('matriz')}
          >
            Abrir matriz
          </Button>
          <Button
            variant="ghost"
            leadingIcon={<AlertTriangle className="h-4 w-4" />}
            onClick={() => onNavigate('hallazgos')}
          >
            Hallazgos
          </Button>
          <Button variant="danger" leadingIcon={<Trash2 className="h-4 w-4" />} onClick={onDelete}>
            Eliminar expediente
          </Button>
        </div>
        {!result || !analysis ? (
          <p className="mt-3 text-xs text-tone-amber">
            La exógena sigue siendo una fuente opcional: carga y procesa una para habilitar matriz y
            hallazgos.
          </p>
        ) : null}
      </GlassPanel>
    </div>
  );
}

function OverviewStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-overlay/8 bg-overlay/[0.02] p-4">
      <p className="text-xs text-content-subtle">{label}</p>
      <p className="mt-1 text-lg font-semibold text-content-strong">{value}</p>
    </div>
  );
}
