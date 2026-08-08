import type { Form210BoxStatus, Form210Draft } from './types';

/**
 * Tarea derivada por casilla del F-210. Se emite como plantilla sin
 * `id`, `caseId`, `createdAt` ni `updatedAt`: esos campos los añade el
 * consumidor (típicamente `apps/web/src/lib/repository.ts`) al persistir.
 */
export interface Form210BoxTaskTemplate {
  type: 'resolve_form_box';
  title: string;
  explanation: string;
  recommendedAction: string;
  formBoxNumber: number;
  priority: 'high' | 'medium' | 'low';
  blocking: boolean;
  source: 'filing';
  stage: 'declaracion';
  view: 'formulario-210';
  ruleId: string;
}

const PRIORITY_BY_STATUS: Record<Form210BoxStatus, 'high' | 'medium' | 'low' | null> = {
  no_data: 'medium',
  suggested: null,
  incomplete: 'high',
  requires_decision: 'high',
  confirmed: null,
  calculated: null,
  contradicted: 'high',
  not_applicable: null,
};

const BLOCKING_STATUSES: readonly Form210BoxStatus[] = [
  'contradicted',
  'requires_decision',
];

const STATUS_TEXT: Record<Form210BoxStatus, string> = {
  no_data: 'sin datos suficientes',
  suggested: 'sugerida',
  incomplete: 'incompleta',
  requires_decision: 'requiere decisión',
  confirmed: 'confirmada',
  calculated: 'calculada',
  contradicted: 'contradicha',
  not_applicable: 'no aplica',
};

/**
 * Genera plantillas de tarea para las casillas del borrador que
 * necesitan atención. El motor es puro: no crea ids ni escribe nada.
 *
 * Filtra silenciosamente casillas `confirmed`, `calculated`,
 * `suggested` y `not_applicable` porque no requieren acción.
 */
export function deriveForm210BoxTasks(draft: Form210Draft): Form210BoxTaskTemplate[] {
  const templates: Form210BoxTaskTemplate[] = [];
  for (const box of draft.boxes) {
    const priority = PRIORITY_BY_STATUS[box.status];
    if (!priority) continue;
    templates.push({
      type: 'resolve_form_box',
      title: `Casilla ${box.number}: ${box.name}`,
      explanation:
        box.status === 'no_data'
          ? `La casilla ${box.number} (${box.name}) todavía no tiene datos suficientes para calcularse.`
          : box.status === 'incomplete'
            ? `La casilla ${box.number} (${box.name}) está incompleta: falta que el ruleset la calcule o que el analista confirme un valor manual.`
            : box.status === 'contradicted'
              ? `La casilla ${box.number} (${box.name}) tiene fuentes contradichas y bloquea el borrador.`
              : `La casilla ${box.number} (${box.name}) requiere una decisión del analista (${STATUS_TEXT[box.status]}).`,
      recommendedAction:
        box.status === 'no_data'
          ? 'Carga la fuente correspondiente o registra un valor manual trazable.'
          : box.status === 'contradicted'
            ? 'Resuelve la contradicción confirmando o excluyendo las fuentes en conflicto.'
            : 'Revisa las fuentes disponibles y confirma un valor con motivo.',
      formBoxNumber: box.number,
      priority,
      blocking: BLOCKING_STATUSES.includes(box.status),
      source: 'filing',
      stage: 'declaracion',
      view: 'formulario-210',
      ruleId: `form-210:box:${box.number}`,
    });
  }
  return templates;
}
