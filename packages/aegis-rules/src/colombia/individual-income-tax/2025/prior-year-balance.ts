import type {
  PriorYearBalanceEvaluation,
  PriorYearBalanceStatus,
} from '../../../types';

/**
 * Evaluación del saldo a favor del año anterior aplicable al F-210. El
 * sustento normativo es el art. 850 del Estatuto Tributario: el saldo a
 * favor puede compensarse o solicitarse en devolución. Una vez usado en
 * cualquiera de esas dos vías, no puede volver a aplicarse en la
 * declaración del período siguiente.
 *
 * NexusTax no consulta la DIAN ni conoce las declaraciones previas del
 * contribuyente. Por eso el descuento del saldo a favor **siempre** exige
 * confirmación explícita del analista: sin ella, el motor no lo aplica y
 * el estado queda como `pending_confirmation` para que la UI lo revele.
 */
export const PRIOR_YEAR_BALANCE_SOURCE_ID = 'et-art-850';

export interface PriorYearBalanceInput {
  taxYear: number;
  /**
   * Monto en pesos que el analista dice tener como saldo a favor del año
   * inmediatamente anterior. Valores negativos se tratan como cero.
   */
  declaredCop: number;
  /**
   * Confirmación humana explícita de que el saldo proviene de una
   * declaración previa efectivamente aceptada por la DIAN y sigue
   * disponible.
   */
  confirmedByAnalyst: boolean;
  /**
   * `true` si el contribuyente ya solicitó devolución o compensación de
   * ese saldo; en ese caso NO puede volver a aplicarse (art. 850 ET).
   */
  hasPendingCompensationOrRefundRequest: boolean;
  /** Fecha (ISO) de la declaración previa que originó el saldo. Opcional. */
  priorYearFilingDate?: string | null;
  /** Nota libre del analista con evidencia adicional. */
  evidence?: string | null;
}

/**
 * Evalúa la aplicabilidad del saldo a favor del año anterior. El resultado
 * incluye el estado, la razón legible y el importe aplicado. Nunca devuelve
 * un aplicado negativo.
 */
export function evaluatePriorYearBalance(
  input: PriorYearBalanceInput,
): PriorYearBalanceEvaluation {
  if (input.taxYear !== 2025) {
    throw new Error(
      `PRIOR_YEAR_BALANCE aún no modela el año ${input.taxYear}. Añade el ruleset correspondiente.`,
    );
  }
  const declared = Math.max(0, input.declaredCop);
  let status: PriorYearBalanceStatus;
  let appliedCop = 0;
  let reason: string;

  if (declared === 0) {
    status = 'no_declared';
    reason = 'El analista no declaró saldo a favor del año anterior.';
  } else if (!input.confirmedByAnalyst) {
    status = 'pending_confirmation';
    reason =
      'El saldo a favor requiere confirmación humana explícita para aplicarse; sin ella no se descuenta.';
  } else if (input.hasPendingCompensationOrRefundRequest) {
    status = 'blocked_by_pending_request';
    reason =
      'El analista declaró una solicitud de devolución o compensación pendiente sobre este saldo (art. 850 ET); no se puede volver a aplicar aquí.';
  } else {
    status = 'applied';
    appliedCop = declared;
    reason =
      'Confirmado por el analista y sin solicitud de devolución/compensación pendiente: se descuenta del saldo del año actual.';
  }

  return {
    taxYear: input.taxYear,
    declaredCop: declared,
    appliedCop,
    status,
    reason,
    ruleSourceId: PRIOR_YEAR_BALANCE_SOURCE_ID,
    priorYearFilingDate: input.priorYearFilingDate ?? null,
    evidence: input.evidence ?? null,
    confirmedByAnalyst: input.confirmedByAnalyst,
    hasPendingCompensationOrRefundRequest: input.hasPendingCompensationOrRefundRequest,
  };
}
