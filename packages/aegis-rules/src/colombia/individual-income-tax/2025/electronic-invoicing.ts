import type { ElectronicInvoicingDeductionComputation } from '../../../types';
import { getTaxUnit } from './tax-unit';

/**
 * Deducción especial por compras de bienes y/o servicios soportadas con
 * factura electrónica y pagadas con medios electrónicos.
 *
 * CORRECCIÓN NORMATIVA (Sprint 2.4, revisión puntual): el fundamento legal
 * correcto es el **numeral 5 del artículo 336 del Estatuto Tributario**
 * (texto introducido por el art. 7 de la Ley 2277 de 2022, que sustituyó
 * el artículo 336 completo) — NO el "artículo 336-1 ET". El artículo 336-1
 * ET (adicionado por el art. 60 de la misma ley) es una norma DISTINTA:
 * estimación de costos y gastos deducibles (tope indicativo del 60 % de
 * los ingresos brutos de rentas de trabajo), ajena a este beneficio.
 * Verificado con múltiples fuentes independientes (Estatuto.co, Gerencie,
 * Consultor Contable) — ver `docs/ELECTRONIC_INVOICE_REPORT_2025.md`.
 *
 * La persona natural residente que declare ingresos en la cédula general
 * puede tomar como **deducción** el 1 % del valor de las adquisiciones de
 * bienes y/o servicios que cumplan simultáneamente los siguientes
 * requisitos:
 *
 *   1. Están soportadas con **factura electrónica de venta**.
 *   2. Se pagaron con **tarjetas débito, crédito, u otros medios
 *      electrónicos** (transferencia, PSE, etc.).
 *   3. La factura contiene el **NIT o número de identificación** del
 *      contribuyente que solicita la deducción.
 *
 * Tope: la deducción no puede exceder de **240 UVT anuales**. El propio
 * numeral 5 establece que esta deducción **no está sujeta al límite del
 * 40 %/1.340 UVT** del numeral 3 del mismo artículo (el que gobierna las
 * casillas 41/65/82), por lo que nunca debe participar de esa fórmula de
 * consolidación cedular. Este motor NO verifica los requisitos (soporte de
 * la factura, medio de pago, titularidad): esa clasificación es del
 * analista y se conserva por trazabilidad.
 */
export const ELECTRONIC_INVOICING_SOURCE_ID = 'et-art-336-num-5';
export const ELECTRONIC_INVOICING_PERCENTAGE = 0.01;
export const ELECTRONIC_INVOICING_ANNUAL_CAP_UVT = 240;

export interface ElectronicInvoicingDeductionInput {
  taxYear: number;
  /**
   * Valor total de compras con factura electrónica calificadas (en pesos).
   * Valores negativos se tratan como cero.
   */
  purchasesWithElectronicInvoiceCop: number;
}

/**
 * Calcula la deducción orientativa por facturas electrónicas para el año
 * 2025. Devuelve el detalle con los dos candidatos (porcentaje, tope UVT)
 * para que la UI muestre cuál limita el beneficio.
 */
export function computeElectronicInvoicingDeduction(
  input: ElectronicInvoicingDeductionInput,
): ElectronicInvoicingDeductionComputation {
  if (input.taxYear !== 2025) {
    throw new Error(
      `ELECTRONIC_INVOICING_DEDUCTION aún no modela el año ${input.taxYear}. Añade el ruleset correspondiente.`,
    );
  }
  const uvt = getTaxUnit(input.taxYear).valueCop;
  const purchasesBase = Math.max(0, input.purchasesWithElectronicInvoiceCop);
  const percentageCandidateCop = Math.round(purchasesBase * ELECTRONIC_INVOICING_PERCENTAGE);
  const uvtCapCandidateCop = Math.round(ELECTRONIC_INVOICING_ANNUAL_CAP_UVT * uvt);
  const appliedDeductionCop = Math.min(percentageCandidateCop, uvtCapCandidateCop);
  const bindingCandidate: ElectronicInvoicingDeductionComputation['bindingCandidate'] =
    percentageCandidateCop <= uvtCapCandidateCop ? 'percentage' : 'uvt_cap';
  const formula = `min(${(ELECTRONIC_INVOICING_PERCENTAGE * 100).toFixed(0)} % × compras_con_FE, ${ELECTRONIC_INVOICING_ANNUAL_CAP_UVT} UVT) — art. 336 num. 5 ET`;
  return {
    taxYear: input.taxYear,
    purchasesBaseCop: purchasesBase,
    percentageRate: ELECTRONIC_INVOICING_PERCENTAGE,
    percentageCandidateCop,
    uvtCapUvt: ELECTRONIC_INVOICING_ANNUAL_CAP_UVT,
    uvtCapCandidateCop,
    appliedDeductionCop,
    bindingCandidate,
    formula,
    ruleSourceId: ELECTRONIC_INVOICING_SOURCE_ID,
  };
}
