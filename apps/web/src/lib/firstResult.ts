import type { FilingCriterionResult, FilingObligationAssessment } from '@nexus-tax/aegis-rules';

/**
 * Traducción a lenguaje cotidiano del resultado de obligación de declarar.
 * Es presentación pura: no evalúa reglas, solo redacta lo que ya calculó Aegis.
 * El tono es siempre orientativo; nunca afirma una obligación legal.
 */

export type FirstResultTone = 'amber' | 'emerald' | 'cyan';

export interface FirstResultHeadline {
  tone: FirstResultTone;
  title: string;
  summary: string;
}

export interface PlainCriterion {
  id: string;
  /** Nombre corto y comprensible. */
  name: string;
  /** Qué significa este criterio, en una frase. */
  help: string;
  state: 'exceeds' | 'within' | 'unknown';
  stateLabel: string;
  observedValue: number | null;
  limit: number | null;
  /** Proporción observado/límite acotada a 0–1 para la barra; null si no aplica. */
  ratio: number | null;
}

const PLAIN: Record<string, { name: string; help: string }> = {
  gross_income: {
    name: 'Lo que ganaste en el año',
    help: 'Suma de los ingresos que terceros reportaron a tu nombre.',
  },
  gross_assets: {
    name: 'Lo que tenías a 31 de diciembre',
    help: 'Cuentas, inversiones, inmuebles y demás bienes reportados.',
  },
  credit_card_consumption: {
    name: 'Gastos con tarjeta de crédito',
    help: 'Total consumido con tus tarjetas de crédito durante el año.',
  },
  deposits_and_investments: {
    name: 'Dinero que entró a tus cuentas',
    help: 'Consignaciones, depósitos e inversiones que reportó el sistema financiero.',
  },
  purchases_and_consumption: {
    name: 'Compras y consumos',
    help: 'Compras de bienes y servicios reportadas a tu nombre.',
  },
  vat_responsible_at_year_end: {
    name: 'Responsable de IVA',
    help: 'Aplica solo si tenías esa calidad ante la DIAN a 31 de diciembre.',
  },
};

function plainCriterion(reason: FilingCriterionResult): PlainCriterion {
  const text = PLAIN[reason.criterionId] ?? { name: reason.label, help: reason.explanation };
  const observed = typeof reason.observedValue === 'number' ? reason.observedValue : null;
  const limit = reason.officialRoundedAmount ?? null;
  const state =
    reason.result === 'met' ? 'exceeds' : reason.result === 'not_met' ? 'within' : 'unknown';
  return {
    id: reason.criterionId,
    name: text.name,
    help: text.help,
    state,
    stateLabel:
      state === 'exceeds'
        ? 'Supera el límite'
        : state === 'within'
          ? 'Dentro del límite'
          : 'Falta confirmar',
    observedValue: observed,
    limit,
    ratio: observed !== null && limit ? Math.max(0, Math.min(1, observed / limit)) : null,
  };
}

export function buildFirstResult(assessment: FilingObligationAssessment): {
  headline: FirstResultHeadline;
  criteria: PlainCriterion[];
  exceededCount: number;
  needsVatAnswer: boolean;
} {
  const criteria = assessment.reasons.map(plainCriterion);
  const exceeded = criteria.filter((item) => item.state === 'exceeds');
  const vat = criteria.find((item) => item.id === 'vat_responsible_at_year_end');
  // Si ya se supera otro límite, la respuesta de IVA no cambia el resultado: no se pregunta.
  const needsVatAnswer = vat?.state === 'unknown' && assessment.status !== 'required';

  let headline: FirstResultHeadline;
  if (assessment.status === 'required') {
    const first = exceeded.find((item) => item.id !== 'vat_responsible_at_year_end') ?? exceeded[0];
    headline = {
      tone: 'amber',
      title: 'Según tu información, probablemente debes declarar renta',
      summary: first
        ? `Basta con superar uno de los límites de la DIAN, y en tu caso se supera: «${first.name.toLowerCase()}». Es una orientación, no un concepto legal.`
        : 'Se supera al menos un límite de la DIAN. Es una orientación, no un concepto legal.',
    };
  } else if (assessment.status === 'not_required') {
    headline = {
      tone: 'emerald',
      title: 'Según tu información, probablemente no estás obligado a declarar',
      summary:
        'Ninguno de los límites de la DIAN se supera con lo que reporta tu exógena. Es una orientación; conviene revisarla si tienes ingresos que no aparecen aquí.',
    };
  } else {
    headline = {
      tone: 'cyan',
      title: 'Aún no podemos decirte si debes declarar',
      summary:
        'Ningún límite se supera por ahora, pero falta confirmar un dato que tu exógena no incluye.',
    };
  }
  return { headline, criteria, exceededCount: exceeded.length, needsVatAnswer };
}

/** Fecha larga en español a partir de una fecha ISO (sin zona horaria local). */
export function formatLongDate(iso: string): string {
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'long', timeZone: 'UTC' }).format(
    new Date(`${iso}T00:00:00Z`),
  );
}

/** Redacta la fecha límite según haya vencido o no; `today` es una fecha ISO (AAAA-MM-DD). */
export function describeDeadline(
  dueDate: string,
  today: string,
): { expired: boolean; lead: string; date: string; note: string | null } {
  const expired = dueDate < today;
  return {
    expired,
    lead: expired
      ? 'Si te toca declarar, la fecha límite venció el'
      : 'Si te toca declarar, tu fecha límite sería el',
    date: formatLongDate(dueDate),
    note: expired
      ? 'Declarar después de la fecha puede generar sanción por extemporaneidad; conviene hacerlo cuanto antes.'
      : null,
  };
}
