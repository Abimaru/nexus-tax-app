import type { PriorYearBoxRole } from '@nexus-tax/domain';

/**
 * Catálogos puros para declaraciones anteriores (Sprint 2.4, Fase B1).
 * Sin dependencias del navegador: se puede importar tanto desde el
 * orquestador de carga (`priorYearReturns.ts`) como desde la derivación de
 * tareas (`taxCaseAnalysis.ts`), que también se ejecuta en pruebas Node.
 */

/** Casillas que la Fase B modela como candidatas de arrastre explícito. */
const CARRY_FORWARD_BOX_NUMBERS = new Set([133, 137]);
/** Casillas usadas por `compareTaxEvolution` (Fase B) para la evolución tributaria. */
const COMPARISON_BOX_NUMBERS = new Set([29, 30, 31, 32, 58, 74, 89, 115, 129, 130, 132, 137]);

export function roleForPriorYearBox(boxNumber: number): PriorYearBoxRole {
  if (CARRY_FORWARD_BOX_NUMBERS.has(boxNumber)) return 'carry_forward_candidate';
  if (COMPARISON_BOX_NUMBERS.has(boxNumber)) return 'comparison_only';
  return 'historical_reference';
}

/** Etiquetas humanas para las casillas más relevantes. Nunca se muestra un número crudo sin descripción. */
export const PRIOR_YEAR_BOX_LABELS: Record<number, string> = {
  29: 'Patrimonio bruto',
  30: 'Deudas',
  31: 'Patrimonio líquido',
  32: 'Ingresos brutos de rentas de trabajo',
  33: 'Ingresos no constitutivos de renta de trabajo',
  58: 'Ingresos brutos de rentas de capital',
  74: 'Ingresos brutos de rentas no laborales',
  89: 'Renta líquida gravable (cédula general)',
  112: 'Ingresos por ganancias ocasionales',
  115: 'Ganancias ocasionales gravables',
  126: 'Impuesto de renta líquida gravable',
  129: 'Total impuesto a cargo',
  130: 'Anticipo de renta liquidado el año anterior',
  131: 'Saldo a favor del año anterior',
  132: 'Retenciones del año gravable',
  133: 'Anticipo de renta año gravable siguiente',
  137: 'Saldo a favor',
  138: 'Número de dependientes económicos',
  139: 'Adición por dependientes (72 UVT)',
};

export function priorYearBoxLabel(boxNumber: number): string {
  return PRIOR_YEAR_BOX_LABELS[boxNumber] ?? `Casilla ${boxNumber} (concepto no catalogado)`;
}
