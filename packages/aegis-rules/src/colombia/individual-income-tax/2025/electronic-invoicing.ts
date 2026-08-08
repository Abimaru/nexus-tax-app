import type { ElectronicInvoicingDeductionComputation } from '../../../types';
import { getTaxUnit } from './tax-unit';

/**
 * Deducción por facturas electrónicas soportadas con medios de pago
 * electrónicos (art. 336-1 del Estatuto Tributario, incorporado por el
 * art. 61 de la Ley 2277 de 2022).
 *
 * La persona natural residente puede tomar como **deducción imputable a la
 * cédula general** el 1 % del valor de las adquisiciones de bienes y/o
 * servicios que cumplan simultáneamente los siguientes requisitos:
 *
 *   1. Están soportadas con **factura electrónica de venta**.
 *   2. Se pagaron con **tarjetas débito, crédito, u otros medios
 *      electrónicos** (transferencia, PSE, etc.).
 *   3. La factura contiene el **NIT o número de identificación** del
 *      contribuyente que solicita la deducción.
 *
 * Tope: la deducción no puede exceder de **240 UVT anuales**. Este motor
 * NO verifica los requisitos (soporte de la factura, medio de pago,
 * titularidad): esa clasificación es del analista y se conserva por
 * trazabilidad.
 */
export const ELECTRONIC_INVOICING_SOURCE_ID = 'et-art-336-1';
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
  const formula = `min(${(ELECTRONIC_INVOICING_PERCENTAGE * 100).toFixed(0)} % × compras_con_FE, ${ELECTRONIC_INVOICING_ANNUAL_CAP_UVT} UVT) — art. 336-1 ET`;
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
