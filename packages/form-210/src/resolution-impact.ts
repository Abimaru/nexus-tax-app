import type { Form210Draft, Form210PreliminaryLiquidation } from './types';

/**
 * Foto comparable de una liquidación para efectos de impacto. Solo
 * conserva los campos clave que el analista suele monitorear.
 */
export interface ResolutionImpactSnapshot {
  netBalanceCop: number;
  status: Form210PreliminaryLiquidation['status'];
  totalTaxDueCop: number;
  incomeTaxCop: number;
  occasionalGainsTaxCop: number;
  withholdingsCop: number;
  priorYearAdvanceCop: number;
  priorYearBalanceCop: number;
  nextYearAdvanceCop: number;
  warningsCount: number;
}

/** Cambio en una casilla individual, para el detalle del impacto. */
export interface ResolutionImpactBoxChange {
  boxNumber: number;
  name: string;
  beforeCop: number | null;
  afterCop: number | null;
  deltaCop: number;
}

/**
 * Delta y detalle explicable del impacto de una decisión (o de un lote
 * de decisiones) sobre la liquidación preliminar del F-210. El delta
 * es siempre `after - before`.
 */
export interface ResolutionImpact {
  before: ResolutionImpactSnapshot;
  after: ResolutionImpactSnapshot;
  deltas: {
    netBalanceCop: number;
    totalTaxDueCop: number;
    incomeTaxCop: number;
    occasionalGainsTaxCop: number;
    withholdingsCop: number;
    priorYearAdvanceCop: number;
    priorYearBalanceCop: number;
    nextYearAdvanceCop: number;
    warningsCount: number;
  };
  statusChanged: boolean;
  changedBoxes: readonly ResolutionImpactBoxChange[];
  newWarnings: readonly string[];
  resolvedWarnings: readonly string[];
  summary: string;
}

function snapshotOf(draft: Form210Draft): ResolutionImpactSnapshot {
  const liq = draft.preliminaryLiquidation;
  if (!liq) {
    return {
      netBalanceCop: 0,
      status: 'insufficient_data',
      totalTaxDueCop: 0,
      incomeTaxCop: 0,
      occasionalGainsTaxCop: 0,
      withholdingsCop: 0,
      priorYearAdvanceCop: 0,
      priorYearBalanceCop: 0,
      nextYearAdvanceCop: 0,
      warningsCount: 0,
    };
  }
  return {
    netBalanceCop: liq.netBalanceCop,
    status: liq.status,
    totalTaxDueCop: liq.totalTaxDueCop,
    incomeTaxCop: liq.incomeTax?.totalTaxCopRounded ?? 0,
    occasionalGainsTaxCop: liq.occasionalGainsTax?.totalTaxCop ?? 0,
    withholdingsCop: liq.withholdingsCop,
    priorYearAdvanceCop: liq.priorYearAdvanceCop,
    priorYearBalanceCop: liq.priorYearBalanceCop,
    nextYearAdvanceCop: liq.nextYearAdvance?.netAdvanceCop ?? 0,
    warningsCount: liq.warnings.length,
  };
}

function effectiveValue(draft: Form210Draft, boxNumber: number): number | null {
  const box = draft.boxes.find((entry) => entry.number === boxNumber);
  return box?.confirmedValue ?? box?.suggestedValue ?? null;
}

function humanNetChange(deltaCop: number): string {
  if (deltaCop === 0) return 'el saldo neto no cambia';
  const abs = Math.abs(deltaCop);
  const sign = deltaCop > 0 ? 'aumenta' : 'disminuye';
  return `el saldo neto ${sign} en ${abs.toLocaleString('es-CO')} pesos`;
}

/**
 * Calcula el impacto puro entre dos borradores. `before` y `after` deben
 * ser resultados de `buildForm210Draft`; no se recomputa nada aquí.
 *
 * `changedBoxes` incluye las casillas cuyo valor efectivo (confirmed o
 * suggested) cambió, sin importar la fuente del cambio.
 */
export function computeResolutionImpact(
  before: Form210Draft,
  after: Form210Draft,
): ResolutionImpact {
  const beforeSnapshot = snapshotOf(before);
  const afterSnapshot = snapshotOf(after);

  const beforeBoxes = new Map(before.boxes.map((box) => [box.number, box]));
  const afterBoxes = new Map(after.boxes.map((box) => [box.number, box]));
  const allNumbers = new Set<number>([
    ...beforeBoxes.keys(),
    ...afterBoxes.keys(),
  ]);
  const changedBoxes: ResolutionImpactBoxChange[] = [];
  for (const number of Array.from(allNumbers).sort((a, b) => a - b)) {
    const beforeValue = effectiveValue(before, number);
    const afterValue = effectiveValue(after, number);
    if (beforeValue === afterValue) continue;
    const delta = (afterValue ?? 0) - (beforeValue ?? 0);
    const name = afterBoxes.get(number)?.name ?? beforeBoxes.get(number)?.name ?? '';
    changedBoxes.push({
      boxNumber: number,
      name,
      beforeCop: beforeValue,
      afterCop: afterValue,
      deltaCop: delta,
    });
  }

  const beforeWarnings = new Set(before.preliminaryLiquidation?.warnings ?? []);
  const afterWarnings = new Set(after.preliminaryLiquidation?.warnings ?? []);
  const newWarnings = [...afterWarnings].filter((warning) => !beforeWarnings.has(warning));
  const resolvedWarnings = [...beforeWarnings].filter((warning) => !afterWarnings.has(warning));

  const deltas = {
    netBalanceCop: afterSnapshot.netBalanceCop - beforeSnapshot.netBalanceCop,
    totalTaxDueCop: afterSnapshot.totalTaxDueCop - beforeSnapshot.totalTaxDueCop,
    incomeTaxCop: afterSnapshot.incomeTaxCop - beforeSnapshot.incomeTaxCop,
    occasionalGainsTaxCop:
      afterSnapshot.occasionalGainsTaxCop - beforeSnapshot.occasionalGainsTaxCop,
    withholdingsCop: afterSnapshot.withholdingsCop - beforeSnapshot.withholdingsCop,
    priorYearAdvanceCop:
      afterSnapshot.priorYearAdvanceCop - beforeSnapshot.priorYearAdvanceCop,
    priorYearBalanceCop:
      afterSnapshot.priorYearBalanceCop - beforeSnapshot.priorYearBalanceCop,
    nextYearAdvanceCop:
      afterSnapshot.nextYearAdvanceCop - beforeSnapshot.nextYearAdvanceCop,
    warningsCount: afterSnapshot.warningsCount - beforeSnapshot.warningsCount,
  };
  const statusChanged = beforeSnapshot.status !== afterSnapshot.status;

  const parts: string[] = [humanNetChange(deltas.netBalanceCop)];
  if (statusChanged) parts.push(`estado pasa de ${beforeSnapshot.status} a ${afterSnapshot.status}`);
  if (changedBoxes.length > 0) parts.push(`${changedBoxes.length} casilla(s) afectada(s)`);
  if (newWarnings.length > 0) parts.push(`${newWarnings.length} advertencia(s) nueva(s)`);
  if (resolvedWarnings.length > 0)
    parts.push(`${resolvedWarnings.length} advertencia(s) resuelta(s)`);
  const summary = parts.join('; ') + '.';

  return {
    before: beforeSnapshot,
    after: afterSnapshot,
    deltas,
    statusChanged,
    changedBoxes,
    newWarnings,
    resolvedWarnings,
    summary,
  };
}
