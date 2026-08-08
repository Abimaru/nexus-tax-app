import type { FilingObligationAssessment } from '@nexus-tax/aegis-rules';
import type { Form210Draft, Form210PreliminaryLiquidation } from './types';

/**
 * Snapshot unificado de los cuatro estados que atraviesa un expediente
 * tributario en NexusTax. Fase O del Sprint 2.3.1.
 *
 * Cada estado se conserva puro (sin transformación) para que la UI pueda
 * decidir cómo pintarlos; el motor solo lo empaqueta con etiquetas y un
 * tono sugerido para el badge.
 *
 * `presentation` siempre queda en `out_of_scope`: NexusTax no presenta
 * declaraciones ante la DIAN por diseño.
 */
export type FilingStageId = 'obligation' | 'draft' | 'liquidation' | 'presentation';

export type FilingStateTone = 'neutral' | 'emerald' | 'amber' | 'rose';

export interface FilingStageSnapshot {
  id: FilingStageId;
  label: string;
  status: string;
  statusLabel: string;
  tone: FilingStateTone;
  description: string;
}

export interface Form210FilingStates {
  stages: readonly FilingStageSnapshot[];
}

const OBLIGATION_LABEL: Record<
  FilingObligationAssessment['status'] | 'unevaluated',
  { text: string; tone: FilingStateTone; description: string }
> = {
  required: {
    text: 'Obligado a declarar',
    tone: 'amber',
    description:
      'Se cumple al menos un criterio de la AG 2025; el contribuyente debe declarar.',
  },
  not_required: {
    text: 'No obligado',
    tone: 'emerald',
    description: 'Ningún criterio del ruleset AG 2025 se cumple con la información disponible.',
  },
  pending_information: {
    text: 'Pendiente información',
    tone: 'neutral',
    description:
      'Falta confirmar datos (por ejemplo, condición de IVA) para completar la evaluación.',
  },
  unevaluated: {
    text: 'Sin evaluar',
    tone: 'neutral',
    description: 'Aún no se ha ejecutado la evaluación de obligación de declarar.',
  },
};

const DRAFT_LABEL: Record<
  Form210Draft['status']['status'],
  { text: string; tone: FilingStateTone; description: string }
> = {
  not_started: {
    text: 'Sin iniciar',
    tone: 'neutral',
    description: 'Aún no se han cargado fuentes al borrador.',
  },
  building: {
    text: 'En construcción',
    tone: 'neutral',
    description: 'Casillas alimentándose desde la exógena y otras fuentes.',
  },
  with_pending_items: {
    text: 'Con pendientes',
    tone: 'amber',
    description: 'Hay casillas sin datos, incompletas o con decisiones pendientes.',
  },
  ready_for_review: {
    text: 'Listo para revisión',
    tone: 'emerald',
    description: 'Todas las casillas están sugeridas, calculadas o confirmadas.',
  },
  reviewed: {
    text: 'Revisado',
    tone: 'emerald',
    description: 'El analista marcó el borrador como revisado.',
  },
};

const LIQUIDATION_LABEL: Record<
  Form210PreliminaryLiquidation['status'] | 'unavailable',
  { text: string; tone: FilingStateTone; description: string }
> = {
  insufficient_data: {
    text: 'Datos insuficientes',
    tone: 'neutral',
    description: 'No hay renta líquida cedular suficiente para calcular el impuesto.',
  },
  zero: {
    text: 'Saldo cero',
    tone: 'neutral',
    description: 'El saldo neto es exactamente cero.',
  },
  refund: {
    text: 'Saldo a favor',
    tone: 'emerald',
    description: 'Las retenciones y créditos superan el impuesto a cargo.',
  },
  to_pay: {
    text: 'Saldo a pagar',
    tone: 'amber',
    description: 'El impuesto a cargo supera los créditos y retenciones.',
  },
  unavailable: {
    text: 'No disponible',
    tone: 'neutral',
    description: 'El borrador se generó sin liquidación preliminar.',
  },
};

/**
 * Compone el snapshot unificado de estados. Cualquier entrada faltante
 * se sustituye por una etiqueta neutra ("Sin evaluar" / "No disponible").
 */
export function composeForm210FilingStates(input: {
  obligation?: FilingObligationAssessment | null;
  draft?: Form210Draft | null;
}): Form210FilingStates {
  const obligationStatus = input.obligation?.status ?? 'unevaluated';
  const obligation = OBLIGATION_LABEL[obligationStatus];
  const draftStatus = input.draft?.status.status ?? 'not_started';
  const draft = DRAFT_LABEL[draftStatus];
  const liquidationStatus =
    input.draft?.preliminaryLiquidation?.status ?? 'unavailable';
  const liquidation = LIQUIDATION_LABEL[liquidationStatus];

  const stages: FilingStageSnapshot[] = [
    {
      id: 'obligation',
      label: 'Obligación',
      status: obligationStatus,
      statusLabel: obligation.text,
      tone: obligation.tone,
      description: obligation.description,
    },
    {
      id: 'draft',
      label: 'Borrador',
      status: draftStatus,
      statusLabel: draft.text,
      tone: draft.tone,
      description: draft.description,
    },
    {
      id: 'liquidation',
      label: 'Liquidación preliminar',
      status: liquidationStatus,
      statusLabel: liquidation.text,
      tone: liquidation.tone,
      description: liquidation.description,
    },
    {
      id: 'presentation',
      label: 'Presentación',
      status: 'out_of_scope',
      statusLabel: 'Fuera de alcance',
      tone: 'neutral',
      description:
        'NexusTax no presenta ante la DIAN por diseño; el analista debe hacerlo por su cuenta.',
    },
  ];
  return { stages };
}
