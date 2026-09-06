import type { PriorYearCarryForwardCandidate, PriorYearTaxReturn } from '@nexus-tax/domain';
import { detectMonetaryAnomalies, parseMoneyAmount, type MonetaryAnomaly } from '@nexus-tax/document-intelligence';

/**
 * Arrastres entre años, comparación de evolución tributaria y detección de
 * anomalías de escala histórica (Sprint 2.4, Fase B).
 *
 * Todo lo que produce este módulo es un CANDIDATO trazable, nunca un valor
 * aplicado automáticamente: la confirmación humana vive en
 * `PriorYearCarryForwardCandidate.decision`, que siempre inicia en
 * `pending`. Este módulo es puro (sin Dexie, sin React) — la persistencia y
 * la UI viven en `apps/web`.
 */

const CARRY_FORWARD_PARSER_VERSION = 'form210-prior-year-1.0.0';

function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Deriva los candidatos de arrastre "suficientemente definidos" para la
 * Fase B (adenda Sprint 2.4, punto 13): anticipo (R133 → R130) y saldo a
 * favor (R137 → R131, sujeto a la pregunta de devolución/compensación).
 * Ningún otro concepto (patrimonio, deudas, ingresos, deducciones, rentas
 * exentas, retenciones, ganancias ocasionales, dependientes, saldos
 * bancarios) se arrastra: esos valores solo sirven de contexto histórico.
 *
 * Si la identidad de la declaración anterior no coincide con el expediente
 * (`identityMatch !== 'match'`), NO se generan candidatos: es un hallazgo
 * bloqueante que debe resolverse antes (ver `apps/web`, tarea
 * `review_prior_year_identity_mismatch`).
 */
export function derivePriorYearCarryForwardCandidates(
  priorReturn: PriorYearTaxReturn,
  options: { existingCandidateIds?: ReadonlySet<string> } = {},
): PriorYearCarryForwardCandidate[] {
  if (priorReturn.identityMatch !== 'match') return [];
  const candidates: PriorYearCarryForwardCandidate[] = [];
  const timestamp = nowIso();

  const advanceBox = priorReturn.boxes['133'];
  if (advanceBox && advanceBox.role === 'carry_forward_candidate') {
    const id = `carry:${priorReturn.id}:133-130`;
    if (!options.existingCandidateIds?.has(id)) {
      candidates.push({
        id,
        caseId: priorReturn.caseId,
        priorYearReturnId: priorReturn.id,
        priorYearTaxYear: priorReturn.taxYear,
        sourceBoxNumber: 133,
        targetBoxNumber: 130,
        sourceValueCop: advanceBox.normalizedValueCop,
        refundOrCompensationRequested: null,
        decision: 'pending',
        finalValueCop: null,
        evidence: `Anticipo liquidado en la declaración AG ${priorReturn.taxYear}${
          advanceBox.evidence ? `: "${advanceBox.evidence}"` : ''
        }.`,
        decidedAt: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }
  }

  const refundBox = priorReturn.boxes['137'];
  if (refundBox && refundBox.role === 'carry_forward_candidate') {
    const id = `carry:${priorReturn.id}:137-131`;
    if (!options.existingCandidateIds?.has(id)) {
      candidates.push({
        id,
        caseId: priorReturn.caseId,
        priorYearReturnId: priorReturn.id,
        priorYearTaxYear: priorReturn.taxYear,
        sourceBoxNumber: 137,
        targetBoxNumber: 131,
        sourceValueCop: refundBox.normalizedValueCop,
        // Nunca se asume la respuesta: el analista debe confirmar si el
        // saldo a favor ya fue solicitado en devolución o compensación
        // (art. 850 ET) antes de poder arrastrarlo.
        refundOrCompensationRequested: 'unknown',
        decision: 'pending',
        finalValueCop: null,
        evidence: `Saldo a favor de la declaración AG ${priorReturn.taxYear}${
          refundBox.evidence ? `: "${refundBox.evidence}"` : ''
        }. Requiere confirmar si fue solicitado en devolución o compensación.`,
        decidedAt: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }
  }

  return candidates;
}

/**
 * Resuelve un candidato de arrastre de saldo a favor tras la respuesta del
 * analista a "¿fue solicitado en devolución o compensación?" (punto 13 de
 * la adenda). `no` habilita el candidato; `yes` lo descarta (no se
 * traslada); `unknown` lo deja pendiente de revisión.
 */
export function resolveRefundCarryForwardAnswer(
  candidate: PriorYearCarryForwardCandidate,
  answer: 'yes' | 'no' | 'unknown',
): PriorYearCarryForwardCandidate {
  const timestamp = nowIso();
  if (answer === 'yes') {
    return {
      ...candidate,
      refundOrCompensationRequested: 'yes',
      decision: 'rejected',
      finalValueCop: null,
      decidedAt: timestamp,
      updatedAt: timestamp,
    };
  }
  if (answer === 'unknown') {
    return {
      ...candidate,
      refundOrCompensationRequested: 'unknown',
      decision: 'pending',
      updatedAt: timestamp,
    };
  }
  return {
    ...candidate,
    refundOrCompensationRequested: 'no',
    updatedAt: timestamp,
  };
}

// --- Evolución tributaria (adenda Sprint 2.4, punto 15) ---

export type TaxEvolutionMetricStatus =
  | 'stable'
  | 'increase'
  | 'decrease'
  | 'relevant_variation'
  | 'incomplete'
  | 'not_comparable';

export interface TaxEvolutionMetric {
  key: string;
  label: string;
  priorValueCop: number | null;
  currentValueCop: number | null;
  absoluteDifferenceCop: number | null;
  percentageDifference: number | null;
  status: TaxEvolutionMetricStatus;
}

/** Casillas comparadas por `compareTaxEvolution`, con su etiqueta legible. */
const EVOLUTION_METRICS: readonly { key: string; label: string; boxNumber: number }[] = [
  { key: 'grossPatrimony', label: 'Patrimonio bruto', boxNumber: 29 },
  { key: 'debts', label: 'Deudas', boxNumber: 30 },
  { key: 'netPatrimony', label: 'Patrimonio líquido', boxNumber: 31 },
  { key: 'employmentIncome', label: 'Ingresos laborales', boxNumber: 32 },
  { key: 'capitalIncome', label: 'Rentas de capital', boxNumber: 58 },
  { key: 'nonLaborIncome', label: 'Rentas no laborales', boxNumber: 74 },
  { key: 'generalCedularIncome', label: 'Renta líquida gravable (cédula general)', boxNumber: 89 },
  { key: 'occasionalGains', label: 'Ganancias ocasionales gravables', boxNumber: 115 },
  { key: 'netIncomeTax', label: 'Impuesto neto', boxNumber: 129 },
  { key: 'withholdings', label: 'Retenciones', boxNumber: 132 },
  { key: 'refund', label: 'Saldo a favor', boxNumber: 137 },
  { key: 'advance', label: 'Anticipo', boxNumber: 130 },
];

const RELEVANT_VARIATION_THRESHOLD = 0.2; // 20 %

function classifyVariation(
  priorValueCop: number | null,
  currentValueCop: number | null,
): TaxEvolutionMetric['status'] {
  if (priorValueCop === null || currentValueCop === null) return 'incomplete';
  if (priorValueCop === 0 && currentValueCop === 0) return 'stable';
  if (priorValueCop === 0 || currentValueCop === 0) return 'relevant_variation';
  const ratio = Math.abs(currentValueCop - priorValueCop) / Math.abs(priorValueCop);
  if (ratio <= 0.02) return 'stable';
  if (ratio > RELEVANT_VARIATION_THRESHOLD) return 'relevant_variation';
  return currentValueCop > priorValueCop ? 'increase' : 'decrease';
}

/**
 * Compara los valores del año anterior contra el año actual para las
 * casillas relevantes. Nunca etiqueta una variación como "error": el
 * detector de errores de escala es una función aparte
 * (`detectHistoricalScaleAnomaly`) que el llamador puede combinar con este
 * resultado si quiere generar un hallazgo.
 */
export function compareTaxEvolution(
  priorReturn: Pick<PriorYearTaxReturn, 'boxes'> | null,
  currentBoxValuesCop: Readonly<Record<number, number | null>>,
): TaxEvolutionMetric[] {
  return EVOLUTION_METRICS.map((metric) => {
    const priorBox = priorReturn?.boxes[String(metric.boxNumber)];
    const priorValueCop = priorBox?.normalizedValueCop ?? null;
    const currentValueCop = currentBoxValuesCop[metric.boxNumber] ?? null;
    const absoluteDifferenceCop =
      priorValueCop !== null && currentValueCop !== null ? currentValueCop - priorValueCop : null;
    const percentageDifference =
      priorValueCop !== null && currentValueCop !== null && priorValueCop !== 0
        ? Number((((currentValueCop - priorValueCop) / Math.abs(priorValueCop)) * 100).toFixed(2))
        : null;
    return {
      key: metric.key,
      label: metric.label,
      priorValueCop,
      currentValueCop,
      absoluteDifferenceCop,
      percentageDifference,
      status: !priorReturn ? 'not_comparable' : classifyVariation(priorValueCop, currentValueCop),
    };
  });
}

// --- Detector de errores de escala histórica (adenda Sprint 2.4, punto 16) ---

export interface HistoricalScaleAnomalyResult {
  boxNumber: number;
  label: string;
  priorValueCop: number;
  currentValueCop: number;
  anomalies: readonly MonetaryAnomaly[];
}

/**
 * Reutiliza `detectMonetaryAnomalies` (protecciones monetarias de Sprint
 * 2.3.2) para comparar cada métrica de evolución contra su valor anterior y
 * detectar saltos de escala ×10/×100/×1000. Nunca corrige el valor: solo
 * genera el hallazgo para revisión humana.
 */
export function detectHistoricalScaleAnomalies(
  metrics: readonly TaxEvolutionMetric[],
): HistoricalScaleAnomalyResult[] {
  const results: HistoricalScaleAnomalyResult[] = [];
  for (const metric of metrics) {
    if (metric.priorValueCop === null || metric.currentValueCop === null) continue;
    if (metric.priorValueCop === 0) continue;
    const amount = parseMoneyAmount(String(metric.currentValueCop));
    const anomalies = detectMonetaryAnomalies(amount, metric.priorValueCop).filter(
      (anomaly) => anomaly.code === 'amount_scale_suspected',
    );
    if (anomalies.length) {
      results.push({
        boxNumber: EVOLUTION_METRICS.find((entry) => entry.key === metric.key)?.boxNumber ?? 0,
        label: metric.label,
        priorValueCop: metric.priorValueCop,
        currentValueCop: metric.currentValueCop,
        anomalies,
      });
    }
  }
  return results;
}

export const PRIOR_YEAR_ENGINE_VERSION = CARRY_FORWARD_PARSER_VERSION;
