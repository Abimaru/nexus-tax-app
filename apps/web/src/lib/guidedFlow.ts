import type { WorkflowStageId, WorkflowViewId } from '@nexus-tax/domain';
import type { WorkflowContext } from './workflow';

/**
 * Asistente lineal de cinco pasos que resume el recorrido de un expediente para quien
 * solo quiere preparar su declaración. Es presentación pura sobre el mismo estado del
 * flujo por etapas: no cambia reglas ni rutas, solo agrupa vistas existentes en pasos.
 * El modo experto sigue mostrando las seis etapas y todas las vistas.
 */

export type GuidedStepId = 'cargar' | 'resultado' | 'documentos' | 'revisar' | 'borrador';

export interface GuidedStep {
  id: GuidedStepId;
  number: number;
  label: string;
  description: string;
  destination: { stage: WorkflowStageId; view: WorkflowViewId };
  /** `current` marca dónde está la persona; `complete` indica si el paso ya cumplió su objetivo. */
  status: 'current' | 'done' | 'upcoming' | 'locked';
  complete: boolean;
  detail: string;
}

export interface GuidedContext extends WorkflowContext {
  hasInvoiceReport?: boolean;
}

const STEP_ORDER: readonly GuidedStepId[] = [
  'cargar',
  'resultado',
  'documentos',
  'revisar',
  'borrador',
];

/** Paso que corresponde a un destino del flujo por etapas (para resaltar el actual). */
export function guidedStepForDestination(
  stage: WorkflowStageId,
  view: WorkflowViewId,
  hasResult: boolean,
): GuidedStepId {
  if (!hasResult) return 'cargar';
  if (stage === 'fuente' || stage === 'extraccion') return 'cargar';
  if (stage === 'exportacion') return 'borrador';
  if (stage === 'organizacion') {
    if (view === 'tu-resultado' || view === 'resumen') return 'resultado';
    if (view === 'mis-documentos' || view === 'documentos' || view === 'laboratorio') {
      return 'documentos';
    }
    return 'revisar';
  }
  if (stage === 'conciliacion') return 'revisar';
  // declaracion
  if (view === 'obligacion') return 'resultado';
  if (
    [
      'formulario-210',
      'liquidacion-preliminar',
      'estados',
      'revision-final',
      'calendario',
    ].includes(view)
  ) {
    return 'borrador';
  }
  return 'revisar';
}

function openTasks(context: GuidedContext) {
  return (context.tasks ?? []).filter((task) =>
    ['pending', 'in_progress', 'blocked'].includes(task.status),
  );
}

export function buildGuidedSteps(
  context: GuidedContext,
  current: { stage: WorkflowStageId; view: WorkflowViewId },
): GuidedStep[] {
  const hasResult = Boolean(context.result);
  const currentId = guidedStepForDestination(current.stage, current.view, hasResult);
  const currentIndex = STEP_ORDER.indexOf(currentId);
  const documentCount = context.documents.filter((document) => document.status === 'active').length;
  const hasInvoices = Boolean(context.hasInvoiceReport);
  const pendingCandidates = (context.documentCandidates ?? []).filter(
    (candidate) => candidate.status === 'pending',
  ).length;
  const open = openTasks(context);
  const blocking = open.filter((task) => task.blocking).length;
  const hasSupport = documentCount > 0 || hasInvoices;

  const complete: Record<GuidedStepId, boolean> = {
    cargar: hasResult,
    resultado: hasResult && (currentIndex > 1 || hasSupport),
    documentos: hasResult && hasSupport,
    revisar: hasResult && hasSupport && pendingCandidates === 0 && blocking === 0,
    borrador: false,
  };

  const reviewDestination: GuidedStep['destination'] =
    pendingCandidates > 0
      ? { stage: 'organizacion', view: 'revision-documental' }
      : { stage: 'organizacion', view: 'pendientes' };

  const base: Record<
    GuidedStepId,
    Pick<GuidedStep, 'label' | 'description' | 'destination' | 'detail'>
  > = {
    cargar: {
      label: 'Tu exógena',
      description: 'Carga el archivo de información exógena que descargas de la DIAN.',
      destination: hasResult
        ? { stage: 'fuente', view: 'estado-fuente' }
        : { stage: 'fuente', view: 'cargar' },
      detail: hasResult ? 'Exógena cargada' : 'Sube tu archivo de la DIAN',
    },
    resultado: {
      label: 'Tu resultado',
      description: 'Te decimos, en palabras simples, si probablemente debes declarar y por qué.',
      destination: { stage: 'organizacion', view: 'tu-resultado' },
      detail: hasResult ? 'Resultado listo' : 'Disponible al cargar la exógena',
    },
    documentos: {
      label: 'Tus documentos',
      description: 'Suma certificados y el reporte de facturas; reconocemos cada uno solos.',
      destination: { stage: 'organizacion', view: 'mis-documentos' },
      detail: hasSupport
        ? `${documentCount} documento${documentCount === 1 ? '' : 's'}${hasInvoices ? ' y facturas' : ''}`
        : 'Aún sin documentos',
    },
    revisar: {
      label: 'Revisar y completar',
      description: 'Confirma lo que encontramos y resuelve lo que falte.',
      destination: reviewDestination,
      detail:
        pendingCandidates === 0 && open.length === 0
          ? 'Todo al día'
          : `${pendingCandidates} por revisar · ${open.length} pendiente${open.length === 1 ? '' : 's'}`,
    },
    borrador: {
      label: 'Tu borrador',
      description: 'Revisa el borrador del Formulario 210 con cada casilla explicada.',
      destination: { stage: 'declaracion', view: 'formulario-210' },
      detail: 'Borrador preliminar, no es la declaración',
    },
  };

  return STEP_ORDER.map((id, index) => {
    const locked = !hasResult && index >= 1;
    const status: GuidedStep['status'] = locked
      ? 'locked'
      : id === currentId
        ? 'current'
        : complete[id]
          ? 'done'
          : 'upcoming';
    return { id, number: index + 1, status, complete: complete[id], ...base[id] };
  });
}

/**
 * Paso al que invitar a continuar: el primero pendiente DESPUÉS del actual; si no hay,
 * el primer pendiente anterior; si todo está cumplido, el mismo paso actual.
 */
export function nextGuidedStep(steps: readonly GuidedStep[]): GuidedStep {
  const currentIndex = Math.max(
    steps.findIndex((step) => step.status === 'current'),
    0,
  );
  const open = (step: GuidedStep) => step.status !== 'locked' && !step.complete;
  return (
    steps.slice(currentIndex + 1).find(open) ??
    steps.slice(0, currentIndex).find(open) ??
    steps[currentIndex]!
  );
}
