import type {
  AdvancePaymentBracket,
  AdvancePaymentComputation,
} from '../../../types';

/**
 * Reglas del art. 807 ET sobre el anticipo del impuesto de renta que las
 * personas naturales calculan al presentar su declaración. La tarifa depende
 * del número de veces que se ha declarado, contando la declaración que se
 * está preparando:
 *
 *   - 1ª declaración: 25 % de la base.
 *   - 2ª declaración: 50 % de la base.
 *   - 3ª declaración o siguientes: 75 % de la base.
 *
 * La base se calcula con uno de dos métodos permitidos por el ET:
 *
 *   - `current_only`: impuesto neto de renta del año que se declara.
 *   - `average_of_two`: promedio del impuesto neto de los dos últimos años
 *     (año declarado y el inmediatamente anterior). Solo aplicable desde la
 *     segunda declaración y siempre que el impuesto del año anterior sea
 *     conocido.
 *
 * El anticipo neto = anticipo bruto − retenciones del año declarado
 * (art. 807 ET, penúltimo inciso). Nunca es negativo: si las retenciones
 * exceden el anticipo bruto, el anticipo neto es cero (las retenciones que
 * sobran no se convierten en saldo a favor por esta vía).
 *
 * Este motor NO modela la disminución del anticipo por reducción significativa
 * del impuesto (parágrafo del art. 807 ET): esa decisión es del contribuyente
 * y de su asesor.
 */
export const ADVANCE_PAYMENT_BRACKETS_2025: readonly AdvancePaymentBracket[] = [
  {
    filingCountIncludingCurrent: 1,
    rate: 0.25,
    description: 'Primera declaración — 25 % (art. 807 ET).',
  },
  {
    filingCountIncludingCurrent: 2,
    rate: 0.5,
    description: 'Segunda declaración — 50 % (art. 807 ET).',
  },
  {
    filingCountIncludingCurrent: 3,
    rate: 0.75,
    description: 'Tercera declaración o siguientes — 75 % (art. 807 ET).',
  },
] as const;

export const ADVANCE_PAYMENT_SOURCE_ID = 'et-art-807';

export function getAdvancePaymentBracket(
  filingCountIncludingCurrent: 1 | 2 | 3,
): AdvancePaymentBracket {
  const found = ADVANCE_PAYMENT_BRACKETS_2025.find(
    (bracket) => bracket.filingCountIncludingCurrent === filingCountIncludingCurrent,
  );
  if (!found) {
    throw new Error(
      `Conteo de declaraciones fuera de rango para el anticipo: ${filingCountIncludingCurrent}.`,
    );
  }
  return found;
}

export interface AdvancePaymentInput {
  taxYear: number;
  /**
   * Conteo de declaraciones incluida la que se está preparando. Debe ser
   * `1`, `2` o `3` (el 3 cubre "tercera vez o más" — todas comparten tarifa).
   */
  filingCountIncludingCurrent: 1 | 2 | 3;
  /** Impuesto neto de renta del año que se declara, en pesos. */
  currentNetIncomeTaxCop: number;
  /**
   * Impuesto neto de renta del año inmediatamente anterior, en pesos. Puede
   * ser `null` si no está confirmado (primera declaración o histórico
   * incompleto): en ese caso el motor usa `current_only`.
   */
  priorNetIncomeTaxCop?: number | null;
  /**
   * Retenciones del año declarado. Se restan del anticipo bruto para producir
   * el anticipo neto. `0` cuando no se conocen (nunca `null`).
   */
  withholdingsCop: number;
}

/**
 * Calcula el anticipo del impuesto de renta según el art. 807 ET. Cuando se
 * puede aplicar `average_of_two` (segunda declaración en adelante con historial
 * completo), el motor elige el método que produce **la mayor base**: es la
 * lectura conservadora del artículo, favorable al fisco. El resultado explica
 * en `rationale` por qué se eligió cada método.
 */
export function computeAdvancePayment(
  input: AdvancePaymentInput,
): AdvancePaymentComputation {
  if (input.taxYear !== 2025) {
    throw new Error(
      `ADVANCE_PAYMENT_BRACKETS aún no modela el año ${input.taxYear}. Añade el ruleset correspondiente.`,
    );
  }
  const currentNet = Math.max(0, input.currentNetIncomeTaxCop);
  const priorNet =
    input.priorNetIncomeTaxCop === null || input.priorNetIncomeTaxCop === undefined
      ? null
      : Math.max(0, input.priorNetIncomeTaxCop);
  const withholdings = Math.max(0, input.withholdingsCop);
  const bracket = getAdvancePaymentBracket(input.filingCountIncludingCurrent);

  const averageAvailable = input.filingCountIncludingCurrent !== 1 && priorNet !== null;
  const averageBase = averageAvailable ? (currentNet + (priorNet as number)) / 2 : null;

  let baseMethod: AdvancePaymentComputation['baseMethod'] = 'current_only';
  let baseCop = currentNet;
  let rationale = 'Primera declaración: la base solo puede ser el impuesto neto del año actual.';

  if (averageBase !== null) {
    if (averageBase >= currentNet) {
      baseMethod = 'average_of_two';
      baseCop = averageBase;
      rationale =
        'Segunda declaración o siguiente: se toma el promedio del impuesto neto de los dos últimos años por ser mayor o igual que el del año actual (art. 807 ET, base más conservadora).';
    } else {
      baseMethod = 'current_only';
      baseCop = currentNet;
      rationale =
        'Segunda declaración o siguiente: se toma el impuesto neto del año actual por ser mayor que el promedio de los dos últimos años (art. 807 ET, base más conservadora).';
    }
  } else if (input.filingCountIncludingCurrent !== 1) {
    rationale =
      'No se conoce el impuesto neto del año anterior: se usa el impuesto neto del año actual como base.';
  }

  const grossAdvanceCop = Math.round(baseCop * bracket.rate);
  const withholdingsAppliedCop = Math.min(withholdings, grossAdvanceCop);
  const netAdvanceCop = Math.max(0, grossAdvanceCop - withholdings);

  const baseLabel =
    baseMethod === 'average_of_two'
      ? '(impuesto neto año actual + impuesto neto año anterior) / 2'
      : 'impuesto neto año actual';
  const formula = `${baseLabel} × ${(bracket.rate * 100).toFixed(0)} % − retenciones año actual`;

  return {
    taxYear: input.taxYear,
    bracket,
    currentNetIncomeTaxCop: currentNet,
    priorNetIncomeTaxCop: priorNet,
    baseMethod,
    baseCop,
    grossAdvanceCop,
    withholdingsAppliedCop,
    netAdvanceCop,
    formula,
    rationale,
    ruleSourceId: ADVANCE_PAYMENT_SOURCE_ID,
  };
}
