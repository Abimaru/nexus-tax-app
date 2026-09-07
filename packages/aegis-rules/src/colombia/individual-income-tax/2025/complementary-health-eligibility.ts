/**
 * Evaluador de elegibilidad potencial de pagos de salud complementaria
 * (Sprint 2.4, Fase H — Salud complementaria y medicina prepagada).
 *
 * Principio inviolable (§0/§9/§10 del prompt de Fase H):
 *
 *   `complementary_health_payment != mandatory_health_contribution`
 *   `complementary_health_payment != direct_medical_expense`
 *
 * Este motor es puro y conservador: nunca produce un booleano
 * `deductible = true/false`. Siempre devuelve uno de los estados de
 * `ComplementaryHealthEligibilityStatus` (`@nexus-tax/domain`), con
 * razones explicables. Este motor SOLO decide si un pago pasa las
 * validaciones INDIVIDUALES necesarias para participar del agregado
 * mensual (beneficiario definido, mes conocido, soporte suficiente, no es
 * un aporte obligatorio ni un gasto médico directo) — el tope mensual
 * agregado de 16 UVT (art. 387 ET) se aplica DESPUÉS, en
 * `evaluateComplementaryHealthMonthlyCap`, sobre el conjunto de pagos que
 * ya pasaron esta validación individual.
 *
 * Fundamento normativo: `et-art-387-par-2-salud` (texto verbatim del
 * art. 387 ET, ver `official-sources.ts`).
 */
import type {
  ComplementaryHealthBeneficiary,
  ComplementaryHealthEligibilityStatus,
  ComplementaryHealthProductType,
  ComplementaryHealthSupportStatus,
} from '@nexus-tax/domain';

export const COMPLEMENTARY_HEALTH_ELIGIBILITY_SOURCE_IDS = ['et-art-387-par-2-salud'] as const;
export const COMPLEMENTARY_HEALTH_ENGINE_VERSION = 'co.complementary-health.eligibility.2025.v1';

export interface ComplementaryHealthPaymentEligibilityInput {
  taxYear: number;
  productType: ComplementaryHealthProductType;
  beneficiary: ComplementaryHealthBeneficiary;
  /** `true` cuando `beneficiary === 'dependent'` y ya está vinculado a un `TaxDependent` existente (§4/§14). */
  beneficiaryDependentLinked: boolean;
  /** `null` cuando no hay mes conocido (certificado anual sin detalle, §7/§8). */
  month: number | null;
  supportStatus: ComplementaryHealthSupportStatus;
  supportTypes: readonly string[];
  /** Aporte obligatorio a EPS (§9): nunca se trata como esta deducción. */
  isMandatoryEpsContribution: boolean;
  /** Gasto médico pagado directamente — consulta, odontología, medicamentos, hospital, cirugía (§10). */
  isDirectMedicalExpense: boolean;
  /** `true` cuando el motor detectó un posible duplicado con otro pago ya registrado. */
  hasPossibleDuplicate: boolean;
}

export interface ComplementaryHealthPaymentEligibilityResult {
  status: ComplementaryHealthEligibilityStatus;
  reasons: readonly string[];
  ruleSourceIds: readonly string[];
  ruleVersion: string;
}

function result(
  status: ComplementaryHealthEligibilityStatus,
  reasons: readonly string[],
): ComplementaryHealthPaymentEligibilityResult {
  return {
    status,
    reasons,
    ruleSourceIds: COMPLEMENTARY_HEALTH_ELIGIBILITY_SOURCE_IDS,
    ruleVersion: COMPLEMENTARY_HEALTH_ENGINE_VERSION,
  };
}

/**
 * Evalúa la elegibilidad potencial individual de un pago de salud
 * complementaria para el año gravable 2025. Orden de evaluación:
 *
 *   1. posible duplicado → siempre requiere revisión antes que nada;
 *   2. aporte obligatorio a EPS (§9) → nunca es esta deducción;
 *   3. gasto médico directo (§10) → nunca es esta deducción salvo que
 *      corresponda a un mecanismo legalmente admitido (este motor es
 *      conservador: siempre `not_applicable`, nunca lo asume deducible);
 *   4. tipo de producto sin definir/otro (§0) → requiere revisión;
 *   5. beneficiario sin definir → requiere revisión de beneficiario;
 *   6. beneficiario = dependiente sin vincular a un TaxDependent (§4/§14)
 *      → requiere revisión de beneficiario;
 *   7. sin mes conocido (§7/§8) → requiere detalle mensual;
 *   8. soporte insuficiente/parcial (§11) → requiere soporte;
 *   9. si todo lo anterior se cumple → elegible para el agregado mensual
 *      (el estado final tras aplicar el tope se decide en
 *      `evaluateComplementaryHealthMonthlyCap`).
 */
export function evaluateComplementaryHealthPaymentEligibility(
  input: ComplementaryHealthPaymentEligibilityInput,
): ComplementaryHealthPaymentEligibilityResult {
  if (input.taxYear !== 2025) {
    throw new Error(
      `COMPLEMENTARY_HEALTH_ELIGIBILITY aún no modela el año ${input.taxYear}. Añade el ruleset correspondiente.`,
    );
  }

  if (input.hasPossibleDuplicate) {
    return result('requires_review', [
      'Este pago podría estar duplicado con otro pago ya registrado (p. ej. el mismo mes capturado dos veces). Revísalo antes de continuar.',
    ]);
  }

  if (input.isMandatoryEpsContribution) {
    return result('not_applicable', [
      'Este pago es un aporte obligatorio a EPS/seguridad social en salud: nunca se trata como medicina prepagada, seguro de salud o plan adicional de salud (art. 387 ET, deducciones distintas).',
    ]);
  }

  if (input.isDirectMedicalExpense) {
    return result('not_applicable', [
      'Este pago es un gasto médico pagado directamente (consulta, odontología, medicamentos, hospital, cirugía): no corresponde a la deducción de medicina prepagada o seguros de salud del art. 387 ET.',
    ]);
  }

  if (input.productType === 'unknown' || input.productType === 'other') {
    return result('requires_review', [
      'Falta confirmar si el producto es medicina prepagada, seguro de salud o un plan adicional de salud reconocido por el art. 387 ET.',
    ]);
  }

  if (input.beneficiary === 'unknown') {
    return result('requires_beneficiary_review', [
      'Falta definir quién estaba cubierto por este pago (el contribuyente, su cónyuge, un hijo o un dependiente).',
    ]);
  }

  if (input.beneficiary === 'dependent' && !input.beneficiaryDependentLinked) {
    return result('requires_beneficiary_review', [
      'El beneficiario está marcado como dependiente pero no está vinculado a un dependiente ya registrado en el expediente. No se asume elegibilidad únicamente por la relación textual.',
    ]);
  }

  if (input.month === null) {
    return result('requires_monthly_breakdown', [
      'No hay un mes conocido para este pago (certificado anual sin detalle mensual recuperable). El límite del art. 387 ET es mensual: nunca se asume dividir el total entre 12.',
    ]);
  }

  if (input.supportStatus === 'missing') {
    return result('requires_support', [
      'Falta soporte idóneo: certificado o comprobante emitido por la empresa de medicina prepagada, la aseguradora o la entidad vigilada correspondiente.',
    ]);
  }
  if (input.supportStatus === 'partially_supported' || input.supportStatus === 'requires_review') {
    return result('requires_support', [
      'El soporte disponible es parcial o requiere revisión antes de considerar este pago.',
    ]);
  }

  return result('eligible', [
    'El pago tiene producto, beneficiario, mes y soporte suficientes. Queda sujeto al tope mensual agregado de 16 UVT (art. 387 ET) y a la decisión humana final.',
  ]);
}
