import type {
  CaseAnalysis,
  CaseNavigationState,
  CaseProgress,
  CaseTask,
  DocumentFact,
  DocumentFactCandidate,
  PreliminaryReconciliation,
  ProcessingResult,
  TaxCase,
  UploadedDocument,
  WorkflowStageId,
  WorkflowStageStatus,
  WorkflowViewId,
} from '@nexus-tax/domain';
import { compareCaseTasks } from './caseTaskPriority';

export interface WorkflowViewDefinition {
  id: WorkflowViewId;
  label: string;
  future?: boolean;
}

export interface WorkflowStageDefinition {
  id: WorkflowStageId;
  number: number;
  name: string;
  shortName: string;
  description: string;
  defaultView: WorkflowViewId;
  views: readonly WorkflowViewDefinition[];
}

export const WORKFLOW_STAGES: readonly WorkflowStageDefinition[] = [
  {
    id: 'fuente',
    number: 1,
    name: 'Fuente',
    shortName: 'Fuente',
    description: 'Incorpora la información exógena o define un expediente manual limitado.',
    defaultView: 'cargar',
    views: [
      { id: 'cargar', label: 'Cargar exógena' },
      { id: 'estado-fuente', label: 'Fuente cargada' },
      { id: 'reemplazar', label: 'Reemplazar fuente' },
      { id: 'datos-basicos', label: 'Datos básicos' },
    ],
  },
  {
    id: 'extraccion',
    number: 2,
    name: 'Extracción',
    shortName: 'Extracción',
    description: 'Confirma estructura, columnas, topes, registros y calidad de lectura.',
    defaultView: 'inspeccion',
    views: [
      { id: 'inspeccion', label: 'Inspección' },
      { id: 'estructura', label: 'Estructura' },
      { id: 'mapeo', label: 'Mapeo' },
      { id: 'topes', label: 'Topes' },
      { id: 'registros', label: 'Registros' },
      { id: 'calidad', label: 'Calidad' },
    ],
  },
  {
    id: 'organizacion',
    number: 3,
    name: 'Organización',
    shortName: 'Organiza',
    description: 'Ordena entidades, documentos, requisitos y hechos documentales.',
    defaultView: 'resumen',
    views: [
      { id: 'resumen', label: 'Resumen' },
      { id: 'entidades', label: 'Entidades' },
      { id: 'documentos', label: 'Documentos' },
      { id: 'revision-documental', label: 'Revisión de extracción' },
      { id: 'laboratorio', label: 'Laboratorio documental' },
      { id: 'pendientes', label: 'Pendientes' },
      { id: 'requisitos', label: 'Requisitos' },
      { id: 'hechos', label: 'Hechos' },
    ],
  },
  {
    id: 'conciliacion',
    number: 4,
    name: 'Conciliación',
    shortName: 'Concilia',
    description: 'Contrasta fuentes, revisa la matriz y resuelve diferencias.',
    defaultView: 'conciliaciones',
    views: [
      { id: 'conciliaciones', label: 'Conciliaciones' },
      { id: 'matriz', label: 'Matriz' },
      { id: 'hallazgos', label: 'Hallazgos' },
      { id: 'resoluciones', label: 'Centro de resolución' },
    ],
  },
  {
    id: 'declaracion',
    number: 5,
    name: 'Declaración',
    shortName: 'Declara',
    description: 'Revisa obligación, calendario y capacidades futuras de declaración.',
    defaultView: 'obligacion',
    views: [
      { id: 'obligacion', label: 'Obligación' },
      { id: 'calendario', label: 'Calendario' },
      { id: 'formulario-210', label: 'Borrador Formulario 210' },
    ],
  },
  {
    id: 'exportacion',
    number: 6,
    name: 'Exportación',
    shortName: 'Exporta',
    description: 'Genera un manifiesto local e identifica información pendiente.',
    defaultView: 'resumen-final',
    views: [
      { id: 'resumen-final', label: 'Resumen final' },
      { id: 'exportar', label: 'Exportar expediente' },
      { id: 'manifiesto', label: 'Manifiesto' },
      { id: 'historial', label: 'Historial', future: true },
    ],
  },
];

export interface WorkflowContext {
  taxCase?: TaxCase;
  result?: ProcessingResult;
  analysis?: CaseAnalysis;
  documents: readonly UploadedDocument[];
  facts: readonly DocumentFact[];
  documentCandidates?: readonly DocumentFactCandidate[];
  reconciliations: readonly PreliminaryReconciliation[];
  progress: CaseProgress;
  manualMode: boolean;
  extractionPending: boolean;
  vatResponsibility: boolean | null;
  completedViews?: readonly string[];
  tasks?: readonly CaseTask[];
}

export interface WorkflowStageState extends WorkflowStageDefinition {
  status: WorkflowStageStatus;
  progress: number;
  blockedReason: string | null;
  progressLabel?: string;
}

export interface RecommendedAction {
  id: string;
  label: string;
  reason: string;
  stage: WorkflowStageId;
  view: WorkflowViewId;
  priority: 'high' | 'medium' | 'low';
  pendingCount: number;
  targetTaskId?: string;
}

function extractionHasBlockingErrors(result?: ProcessingResult): boolean {
  return Boolean(result?.findings.some((finding) => finding.severity === 'error'));
}

export function deriveWorkflowStages(
  context: WorkflowContext,
  activeStage?: WorkflowStageId,
): WorkflowStageState[] {
  const hasResult = Boolean(context.result);
  const sourceComplete = hasResult || context.manualMode;
  const extractionErrors = extractionHasBlockingErrors(context.result);
  const hasEvidence = context.documents.length > 0 || context.facts.length > 0;
  const organizationProgress = hasResult
    ? Math.round((context.progress.documentCoverage + context.progress.reviewedFacts) / 2)
    : context.manualMode && context.documents.length
      ? 50
      : 0;
  const reconciliationProgress = Math.round(
    (context.progress.reconciliation +
      context.progress.matrixPreparation +
      context.progress.findings) /
      3,
  );
  const exported = context.completedViews?.some((view) => view.startsWith('exportacion/')) ?? false;

  return WORKFLOW_STAGES.map((definition) => {
    let status: WorkflowStageStatus = 'locked';
    let progress = 0;
    let blockedReason: string | null = null;
    switch (definition.id) {
      case 'fuente':
        progress = sourceComplete ? 100 : context.extractionPending ? 60 : 0;
        status = sourceComplete
          ? 'completed'
          : context.extractionPending
            ? 'incomplete'
            : 'available';
        break;
      case 'extraccion':
        progress = hasResult
          ? (context.result?.metrics.qualityDimensions.extraction.score ?? 0)
          : context.extractionPending
            ? 50
            : 0;
        status = hasResult
          ? extractionErrors
            ? 'requires_attention'
            : 'completed'
          : context.extractionPending
            ? 'incomplete'
            : 'locked';
        blockedReason =
          status === 'locked' ? 'Carga una fuente para habilitar la extracción.' : null;
        break;
      case 'organizacion':
        progress = organizationProgress;
        status = hasResult
          ? context.progress.pendingRequirements === 0 && organizationProgress > 0
            ? 'completed'
            : 'incomplete'
          : context.manualMode
            ? 'incomplete'
            : 'locked';
        blockedReason =
          status === 'locked' ? 'Confirma la extracción o continúa en modo manual.' : null;
        break;
      case 'conciliacion':
        progress = reconciliationProgress;
        status = hasResult
          ? hasEvidence
            ? reconciliationProgress === 100
              ? 'completed'
              : 'incomplete'
            : 'available'
          : 'locked';
        blockedReason = status === 'locked' ? 'Procesa una fuente para construir la matriz.' : null;
        break;
      case 'declaracion':
        progress = hasResult
          ? Math.round(
              ((context.vatResponsibility === null ? 0 : 1) +
                ((context.result?.report.thresholds.length ?? 0) >= 5 ? 1 : 0)) *
                50,
            )
          : 0;
        status = hasResult ? 'incomplete' : 'locked';
        blockedReason =
          status === 'locked' ? 'La evaluación automática requiere una fuente procesada.' : null;
        break;
      case 'exportacion':
        progress = exported ? 100 : 25;
        status = exported ? 'completed' : 'available';
        break;
    }
    return {
      ...definition,
      status: activeStage === definition.id && status !== 'locked' ? 'active' : status,
      progress,
      blockedReason,
      progressLabel: definition.id === 'declaracion' ? `Preparación: ${progress}%` : undefined,
    };
  });
}

export function availableViews(
  stage: WorkflowStageDefinition,
  context: WorkflowContext,
): readonly WorkflowViewDefinition[] {
  if (stage.id === 'fuente') {
    if (context.result) return stage.views.filter((view) => view.id !== 'cargar');
    return stage.views.filter((view) => ['cargar', 'datos-basicos'].includes(view.id));
  }
  if (stage.id === 'extraccion') {
    if (context.extractionPending) return stage.views;
    if (context.result)
      return stage.views.filter((view) => !['inspeccion', 'mapeo'].includes(view.id));
    return [];
  }
  if (stage.id === 'organizacion' && context.manualMode && !context.result) {
    return stage.views.filter((view) => ['documentos', 'hechos'].includes(view.id));
  }
  return stage.views;
}

export function isWorkflowDestinationValid(
  stageId: WorkflowStageId,
  viewId: WorkflowViewId,
  context: WorkflowContext,
): boolean {
  const stage = deriveWorkflowStages(context).find((item) => item.id === stageId);
  if (!stage || stage.status === 'locked') return false;
  return availableViews(stage, context).some((view) => view.id === viewId && !view.future);
}

export function defaultWorkflowDestination(context: WorkflowContext): {
  stage: WorkflowStageId;
  view: WorkflowViewId;
} {
  if (!context.result && !context.manualMode) {
    return context.extractionPending
      ? { stage: 'extraccion', view: 'inspeccion' }
      : { stage: 'fuente', view: 'cargar' };
  }
  return {
    stage: 'organizacion',
    view: context.manualMode && !context.result ? 'documentos' : 'resumen',
  };
}

export function recommendedWorkflowAction(context: WorkflowContext): RecommendedAction {
  const topTask = [...(context.tasks ?? [])]
    .filter((task) => ['pending', 'in_progress', 'blocked'].includes(task.status))
    .sort(compareCaseTasks)[0];
  if (topTask) {
    return {
      id: topTask.id,
      label: topTask.title,
      reason: topTask.explanation,
      stage: topTask.stage,
      view: topTask.view,
      priority: topTask.priority,
      pendingCount: (context.tasks ?? []).filter((task) => task.status === 'pending').length,
      targetTaskId: topTask.id,
    };
  }
  if (!context.result && !context.manualMode && !context.extractionPending) {
    return {
      id: 'load-source',
      label: 'Cargar información exógena',
      reason: 'Es la fuente recomendada para detectar entidades, topes y conceptos.',
      stage: 'fuente',
      view: 'cargar',
      priority: 'high',
      pendingCount: 1,
    };
  }
  if (context.extractionPending && !context.result) {
    return {
      id: 'confirm-structure',
      label: 'Confirmar estructura detectada',
      reason: 'Revisa secciones y columnas antes de procesar la hoja completa.',
      stage: 'extraccion',
      view: 'inspeccion',
      priority: 'high',
      pendingCount: 1,
    };
  }
  if (context.manualMode && !context.result && context.documents.length === 0) {
    return {
      id: 'add-manual-document',
      label: 'Agregar documentos básicos',
      reason: 'El expediente manual está limitado hasta incorporar evidencia.',
      stage: 'organizacion',
      view: 'documentos',
      priority: 'high',
      pendingCount: 1,
    };
  }
  if ((context.result?.entities.length ?? 0) > 0 && context.documents.length === 0) {
    return {
      id: 'review-entities',
      label: 'Revisar entidades y asociar documentos',
      reason: 'La extracción está lista y aún no existen soportes documentales.',
      stage: 'organizacion',
      view: 'entidades',
      priority: 'high',
      pendingCount: context.result?.entities.length ?? 0,
    };
  }
  const pendingCandidates = (context.documentCandidates ?? []).filter((candidate) =>
    ['pending', 'requires_review'].includes(candidate.status),
  ).length;
  if (pendingCandidates) {
    return {
      id: 'review-document-extraction',
      label: 'Revisar valores extraídos',
      reason: 'Los candidatos documentales no modifican la matriz hasta que los confirmes.',
      stage: 'organizacion',
      view: 'revision-documental',
      priority: 'high',
      pendingCount: pendingCandidates,
    };
  }
  if (context.progress.pendingRequirements > 0) {
    return {
      id: 'cover-requirements',
      label: 'Asociar documentos pendientes',
      reason: 'Existen requisitos recomendados sin cobertura suficiente.',
      stage: 'organizacion',
      view: 'requisitos',
      priority: 'high',
      pendingCount: context.progress.pendingRequirements,
    };
  }
  const pendingReconciliations = context.reconciliations.filter(
    (item) => !item.confirmedByHuman || !['reconciled', 'minor_difference'].includes(item.status),
  ).length;
  if (pendingReconciliations || context.progress.pendingMatrixGroups) {
    return {
      id: 'resolve-differences',
      label: 'Resolver diferencias',
      reason: 'La conciliación o la matriz todavía requiere revisión humana.',
      stage: 'conciliacion',
      view: pendingReconciliations ? 'conciliaciones' : 'matriz',
      priority: 'medium',
      pendingCount: pendingReconciliations + context.progress.pendingMatrixGroups,
    };
  }
  if (context.result && context.vatResponsibility === null) {
    return {
      id: 'review-obligation',
      label: 'Revisar obligación de declarar',
      reason: 'Falta confirmar la condición de IVA para completar la evaluación.',
      stage: 'declaracion',
      view: 'obligacion',
      priority: 'medium',
      pendingCount: 1,
    };
  }
  return {
    id: 'export-case',
    label: 'Exportar expediente',
    reason: 'El manifiesto local permite conservar una copia trazable del estado actual.',
    stage: 'exportacion',
    view: 'manifiesto',
    priority: 'low',
    pendingCount: 0,
  };
}

export function workflowPath(caseId: string, stage: WorkflowStageId, view: WorkflowViewId): string {
  return `/expedientes/${encodeURIComponent(caseId)}/${stage}/${view}`;
}

export function navigationStateFor(
  caseId: string,
  destination: { stage: WorkflowStageId; view: WorkflowViewId },
  recommendation: RecommendedAction,
  prior?: CaseNavigationState,
  now = new Date().toISOString(),
): CaseNavigationState {
  return {
    caseId,
    lastStage: destination.stage,
    lastView: destination.view,
    recommendedStage: recommendation.stage,
    completedViews: prior?.completedViews ?? [],
    manualMode: prior?.manualMode ?? false,
    updatedAt: now,
  };
}
