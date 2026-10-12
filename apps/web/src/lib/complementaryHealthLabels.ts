import type {
  ComplementaryHealthBeneficiary,
  ComplementaryHealthDecisionStatus,
  ComplementaryHealthEligibilityStatus,
  ComplementaryHealthProductType,
  ComplementaryHealthSupportStatus,
} from '@nexus-tax/domain';

/**
 * Catálogos en español para los enums de salud complementaria (Sprint
 * 2.4, Fase H). La interfaz nunca interpola un valor de enum crudo
 * (regla §17 de `CLAUDE.md`): un valor no reconocido siempre muestra
 * "Estado no reconocido" en vez de romper o mostrar el identificador
 * técnico.
 */

export const COMPLEMENTARY_HEALTH_PRODUCT_TYPE_LABEL: Record<ComplementaryHealthProductType, string> = {
  prepaid_medicine: 'Medicina prepagada',
  health_insurance: 'Seguro de salud',
  additional_health_plan: 'Plan adicional de salud',
  other: 'Otro',
  unknown: 'Por definir',
};

export const COMPLEMENTARY_HEALTH_BENEFICIARY_LABEL: Record<ComplementaryHealthBeneficiary, string> = {
  taxpayer: 'El contribuyente',
  spouse_or_partner: 'Cónyuge o compañero(a) permanente',
  child: 'Hijo(a)',
  dependent: 'Dependiente registrado',
  unknown: 'Por definir',
};

export const COMPLEMENTARY_HEALTH_SUPPORT_STATUS_LABEL: Record<ComplementaryHealthSupportStatus, string> = {
  sufficient: 'Soporte suficiente',
  partially_supported: 'Soporte parcial',
  missing: 'Sin soporte',
  requires_review: 'Soporte requiere revisión',
};

export const COMPLEMENTARY_HEALTH_ELIGIBILITY_LABEL: Record<ComplementaryHealthEligibilityStatus, string> = {
  eligible: 'Elegible',
  partially_eligible: 'Parcialmente elegible',
  cap_applied: 'Tope mensual aplicado',
  requires_beneficiary_review: 'Falta definir beneficiario',
  requires_monthly_breakdown: 'Falta detalle mensual',
  requires_support: 'Falta soporte',
  not_applicable: 'No aplica',
  requires_review: 'Requiere revisión',
};

export const COMPLEMENTARY_HEALTH_ELIGIBILITY_TONE: Record<
  ComplementaryHealthEligibilityStatus,
  'emerald' | 'amber' | 'rose' | 'neutral' | 'cyan'
> = {
  eligible: 'emerald',
  partially_eligible: 'amber',
  cap_applied: 'amber',
  requires_beneficiary_review: 'cyan',
  requires_monthly_breakdown: 'cyan',
  requires_support: 'amber',
  not_applicable: 'neutral',
  requires_review: 'rose',
};

export const COMPLEMENTARY_HEALTH_DECISION_LABEL: Record<ComplementaryHealthDecisionStatus, string> = {
  pending: 'Pendiente de decisión',
  confirmed: 'Confirmado por el analista',
  rejected: 'Descartado por el analista',
};

/** Soportes idóneos: certificado de la entidad vigilada, nunca factura electrónica (§11). */
export const COMPLEMENTARY_HEALTH_SUPPORT_TYPE_LABEL: Record<string, string> = {
  prepaid_medicine_certificate: 'Certificado de medicina prepagada',
  health_insurance_certificate: 'Certificado de seguro de salud',
  payment_proof: 'Comprobante de pago',
};

export const MONTH_LABEL: Record<number, string> = {
  1: 'Enero',
  2: 'Febrero',
  3: 'Marzo',
  4: 'Abril',
  5: 'Mayo',
  6: 'Junio',
  7: 'Julio',
  8: 'Agosto',
  9: 'Septiembre',
  10: 'Octubre',
  11: 'Noviembre',
  12: 'Diciembre',
};

/** Muestra una etiqueta en español para cualquier valor de enum; nunca interpola el valor crudo. */
export function labelOrFallback<T extends string>(
  map: Record<string, string>,
  value: T | null | undefined,
): string {
  if (!value) return 'Sin definir';
  return map[value] ?? 'Estado no reconocido';
}
