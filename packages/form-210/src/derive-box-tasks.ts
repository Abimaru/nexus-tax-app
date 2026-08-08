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
  currentValue: number | null;
  expectedSource: string | null;
  destinationLabel: string;
  resolutionOptions: {
    type:
      | 'confirm_proposal'
      | 'correct_value'
      | 'exclude_from_calculation'
      | 'register_manual_value'
      | 'mark_not_applicable'
      | 'confirm_zero'
      | 'review_document';
    label: string;
    effect: string;
  }[];
}

const PRIORITY_BY_STATUS: Record<Form210BoxStatus, 'high' | 'medium' | 'low' | null> = {
  no_data: 'low',
  suggested: null,
  incomplete: 'high',
  requires_decision: 'high',
  confirmed: null,
  calculated: null,
  contradicted: 'high',
  not_applicable: null,
  provisional: 'high',
  requires_review: 'high',
  confirmed_zero: null,
  blocked: 'high',
};

const BLOCKING_STATUSES: readonly Form210BoxStatus[] = ['contradicted', 'requires_decision'];

const STATUS_TEXT: Record<Form210BoxStatus, string> = {
  no_data: 'sin datos suficientes',
  suggested: 'sugerida',
  incomplete: 'incompleta',
  requires_decision: 'requiere decisión',
  confirmed: 'confirmada',
  calculated: 'calculada',
  contradicted: 'contradicha',
  not_applicable: 'no aplica',
  provisional: 'provisional',
  requires_review: 'requiere revisión',
  confirmed_zero: 'cero confirmado',
  blocked: 'bloqueada',
};

function expectedSource(boxNumber: number): string {
  if (boxNumber === 38) return 'Certificado de intereses de vivienda';
  if ([99, 100, 101, 102, 103].includes(boxNumber)) return 'Certificado de pensión, si aplica';
  if (boxNumber === 104) return 'Certificado de dividendos, si aplica';
  if ([112, 113, 114, 115].includes(boxNumber)) return 'Soporte de ganancia ocasional, si aplica';
  return 'Fuente documental, exógena o registro manual trazable';
}

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
          ? `Confirma si aplica. Si aplica, revisa ${expectedSource(box.number).toLocaleLowerCase('es')} o registra el valor.`
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
      currentValue: box.confirmedValue ?? box.suggestedValue,
      expectedSource: expectedSource(box.number),
      destinationLabel: `Declaración → Borrador Formulario 210 → casilla ${box.number}`,
      resolutionOptions: [
        ...(box.sources.length
          ? [
              {
                type: 'confirm_proposal' as const,
                label: 'Confirmar propuesta',
                effect: 'Conserva las fuentes actuales y registra la revisión humana.',
              },
              {
                type: 'review_document' as const,
                label: 'Revisar documento',
                effect: 'Abre la evidencia documental relacionada antes de decidir.',
              },
              {
                type: 'exclude_from_calculation' as const,
                label: 'Excluir del cálculo',
                effect: 'Mantiene la fuente en trazabilidad, pero la retira del valor sugerido.',
              },
            ]
          : []),
        {
          type: 'correct_value',
          label: 'Corregir valor',
          effect: 'Crea un ajuste trazable sin modificar las fuentes originales.',
        },
        {
          type: 'register_manual_value',
          label: 'Registrar valor manual',
          effect: 'Añade un valor sustentado por motivo y evidencia del analista.',
        },
        {
          type: 'mark_not_applicable',
          label: 'Marcar no aplica',
          effect: 'Cierra la casilla sin exigir una fuente inexistente y conserva la decisión.',
        },
        {
          type: 'confirm_zero',
          label: 'Confirmar cero',
          effect: 'Registra que la casilla aplica y fue revisada con valor cero.',
        },
      ],
    });
  }
  return templates;
}
