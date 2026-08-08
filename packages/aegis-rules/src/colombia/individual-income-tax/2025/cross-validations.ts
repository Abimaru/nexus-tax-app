import type {
  CrossValidationCheckResult,
  CrossValidationEvaluation,
} from '../../../types';

/**
 * Validaciones cruzadas de coherencia sobre el borrador del F-210. Sirven
 * como red de seguridad además de las verificaciones por casilla: cruzan
 * indicadores agregados (retenciones, impuesto, patrimonio, ingresos,
 * base cedular) para detectar desalineaciones que sugieren revisar los
 * datos antes de firmar.
 *
 * Los umbrales son heurísticos y explícitamente conservadores. La
 * decisión final siempre queda del analista humano.
 */
export const CROSS_VALIDATIONS_PATRIMONY_SOURCE_ID = 'et-art-236';

/**
 * Razón sobre la cual se advierte que las retenciones aplicadas
 * sobrepasan al impuesto de renta calculado. `2` significa que las
 * retenciones son ≥ 2× el impuesto.
 */
export const WITHHOLDING_TO_TAX_RATIO_ALERT = 2;

/**
 * Razón entre patrimonio bruto e ingresos brutos totales que activa la
 * alerta de comparación patrimonial. `10` significa que el patrimonio
 * bruto es ≥ 10× los ingresos declarados.
 */
export const PATRIMONY_TO_INCOME_RATIO_ALERT = 10;

/**
 * Tolerancia absoluta (en pesos) al comparar la base cedular reportada
 * contra la recomputada por 42+66+83. `1` cubre diferencias de
 * redondeo entre motores.
 */
export const CEDULAR_SUM_TOLERANCE_COP = 1;

export interface CrossValidationsInput {
  taxYear: number;
  /** Impuesto de renta calculado (art. 241) en pesos redondeados. */
  incomeTaxCop: number;
  /** Retenciones aplicadas al saldo (casilla 132 consolidada). */
  withholdingsAppliedCop: number;
  /** Patrimonio bruto del año (casilla 29). */
  grossPatrimonyCop: number;
  /**
   * Suma bruta de ingresos declarados en el año, sin restar exentos ni
   * deducciones (ingresos + GO brutos + dividendos brutos + pensiones
   * brutas cuando apliquen).
   */
  totalGrossIncomeCop: number;
  /** Base cedular consolidada tal como la reporta la liquidación. */
  reportedCedularTaxableIncomeCop: number;
  /**
   * Base cedular recomputada desde 42+66+83 por el consumidor. Se
   * separa para que el motor sea puro y no dependa del `Form210Draft`.
   */
  computedCedularTaxableIncomeCop: number;
}

function withholdingsExceedCheck(
  input: CrossValidationsInput,
): CrossValidationCheckResult {
  const tax = Math.max(0, input.incomeTaxCop);
  const withholdings = Math.max(0, input.withholdingsAppliedCop);
  if (tax === 0) {
    return {
      code: 'withholdings_exceed_income_tax',
      triggered: false,
      message: 'Sin impuesto de renta calculado, la razón retenciones/impuesto no es evaluable.',
      thresholdRatio: WITHHOLDING_TO_TAX_RATIO_ALERT,
    };
  }
  const ratio = withholdings / tax;
  const triggered = ratio >= WITHHOLDING_TO_TAX_RATIO_ALERT;
  return {
    code: 'withholdings_exceed_income_tax',
    triggered,
    ratio,
    thresholdRatio: WITHHOLDING_TO_TAX_RATIO_ALERT,
    message: triggered
      ? `Las retenciones (${withholdings.toLocaleString('es-CO')}) equivalen a ${ratio.toFixed(2)}× el impuesto de renta calculado (${tax.toLocaleString('es-CO')}). Revisa si están correctamente atribuidas o si el impuesto está subestimado.`
      : `Razón retenciones/impuesto = ${ratio.toFixed(2)} (bajo umbral ${WITHHOLDING_TO_TAX_RATIO_ALERT}).`,
  };
}

function patrimonyDisproportionCheck(
  input: CrossValidationsInput,
): CrossValidationCheckResult {
  const patrimony = Math.max(0, input.grossPatrimonyCop);
  const income = Math.max(0, input.totalGrossIncomeCop);
  if (patrimony === 0 || income === 0) {
    return {
      code: 'patrimony_income_disproportion',
      triggered: false,
      message:
        'No hay patrimonio o ingresos declarados: la comparación patrimonial (art. 236 ET) no es evaluable.',
      thresholdRatio: PATRIMONY_TO_INCOME_RATIO_ALERT,
      ruleSourceId: CROSS_VALIDATIONS_PATRIMONY_SOURCE_ID,
    };
  }
  const ratio = patrimony / income;
  const triggered = ratio >= PATRIMONY_TO_INCOME_RATIO_ALERT;
  return {
    code: 'patrimony_income_disproportion',
    triggered,
    ratio,
    thresholdRatio: PATRIMONY_TO_INCOME_RATIO_ALERT,
    ruleSourceId: CROSS_VALIDATIONS_PATRIMONY_SOURCE_ID,
    message: triggered
      ? `El patrimonio bruto (${patrimony.toLocaleString('es-CO')}) es ${ratio.toFixed(1)}× los ingresos declarados (${income.toLocaleString('es-CO')}). Revisa si el patrimonio anterior lo justifica (art. 236 ET) o si falta declarar ingresos.`
      : `Razón patrimonio/ingresos = ${ratio.toFixed(2)} (bajo umbral ${PATRIMONY_TO_INCOME_RATIO_ALERT}).`,
  };
}

function cedularSumCheck(input: CrossValidationsInput): CrossValidationCheckResult {
  const reported = input.reportedCedularTaxableIncomeCop;
  const computed = input.computedCedularTaxableIncomeCop;
  const differenceCop = reported - computed;
  const triggered = Math.abs(differenceCop) > CEDULAR_SUM_TOLERANCE_COP;
  return {
    code: 'cedular_sum_mismatch',
    triggered,
    differenceCop,
    thresholdCop: CEDULAR_SUM_TOLERANCE_COP,
    message: triggered
      ? `La base cedular reportada (${reported.toLocaleString('es-CO')}) difiere de la suma de 42+66+83 (${computed.toLocaleString('es-CO')}) por ${differenceCop.toLocaleString('es-CO')} pesos.`
      : 'La base cedular consolidada coincide con la suma de rentas líquidas ordinarias.',
  };
}

/**
 * Evalúa todas las validaciones cruzadas en una sola llamada. El motor
 * es puro y determinista: los mismos inputs producen los mismos
 * resultados.
 */
export function evaluateCrossValidations(
  input: CrossValidationsInput,
): CrossValidationEvaluation {
  if (input.taxYear !== 2025) {
    throw new Error(
      `CROSS_VALIDATIONS aún no modela el año ${input.taxYear}. Añade el ruleset correspondiente.`,
    );
  }
  return {
    taxYear: input.taxYear,
    withholdingsExceedIncomeTax: withholdingsExceedCheck(input),
    patrimonyIncomeDisproportion: patrimonyDisproportionCheck(input),
    cedularSumMismatch: cedularSumCheck(input),
  };
}
