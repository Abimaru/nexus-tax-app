import type {
  PropertyAllocationMethod,
  PropertyExpenseDecisionStatus,
  PropertyExpenseEligibilityStatus,
  PropertyExpenseType,
  PropertySupportStatus,
  PropertyType,
  PropertyUse,
} from '@nexus-tax/domain';

/**
 * Catálogos en español para los enums de inmuebles (Sprint 2.4, Fase G).
 * La interfaz nunca interpola un valor de enum crudo (regla §17 de
 * `CLAUDE.md`): un valor no reconocido siempre muestra "Estado no
 * reconocido" en vez de romper o mostrar el identificador técnico.
 */

export const PROPERTY_TYPE_LABEL: Record<PropertyType, string> = {
  apartment: 'Apartamento',
  house: 'Casa',
  parking: 'Parqueadero',
  storage: 'Depósito',
  commercial: 'Local comercial',
  land: 'Lote / terreno',
  other: 'Otro',
};

export const PROPERTY_USE_LABEL: Record<PropertyUse, string> = {
  personal_residence: 'Vivienda personal',
  rented: 'Arrendado',
  business_use: 'Uso para actividad económica',
  mixed: 'Uso mixto',
  vacant: 'Vacante / desocupado',
  other: 'Otro uso',
  unknown: 'Por definir',
};

export const PROPERTY_EXPENSE_TYPE_LABEL: Record<PropertyExpenseType, string> = {
  administration_fee: 'Cuota de administración',
  property_tax: 'Impuesto predial',
  maintenance: 'Mantenimiento',
  repair: 'Reparación',
  insurance: 'Seguro',
  utilities: 'Servicios públicos',
  mortgage_interest: 'Intereses de crédito hipotecario',
  other: 'Otro gasto',
};

export const PROPERTY_SUPPORT_STATUS_LABEL: Record<PropertySupportStatus, string> = {
  sufficient: 'Soporte suficiente',
  partially_supported: 'Soporte parcial',
  missing: 'Sin soporte',
  requires_review: 'Soporte requiere revisión',
};

export const PROPERTY_ALLOCATION_METHOD_LABEL: Record<PropertyAllocationMethod, string> = {
  percentage: 'Por porcentaje de área/uso',
  period: 'Por período del año',
  both: 'Por porcentaje y período',
  unknown: 'Sin definir',
};

export const PROPERTY_EXPENSE_ELIGIBILITY_LABEL: Record<PropertyExpenseEligibilityStatus, string> = {
  potentially_deductible: 'Potencialmente deducible',
  not_applicable: 'No aplica',
  requires_context: 'Falta contexto',
  requires_support: 'Falta soporte',
  requires_allocation: 'Falta asignación',
  requires_review: 'Requiere revisión',
};

export const PROPERTY_EXPENSE_ELIGIBILITY_TONE: Record<
  PropertyExpenseEligibilityStatus,
  'emerald' | 'amber' | 'rose' | 'neutral' | 'cyan'
> = {
  potentially_deductible: 'emerald',
  not_applicable: 'neutral',
  requires_context: 'cyan',
  requires_support: 'amber',
  requires_allocation: 'amber',
  requires_review: 'rose',
};

export const PROPERTY_EXPENSE_DECISION_LABEL: Record<PropertyExpenseDecisionStatus, string> = {
  pending: 'Pendiente de decisión',
  confirmed: 'Confirmado por el analista',
  rejected: 'Descartado por el analista',
};

export const PROPERTY_USE_TONE: Record<PropertyUse, 'emerald' | 'amber' | 'rose' | 'neutral' | 'cyan'> = {
  personal_residence: 'neutral',
  rented: 'emerald',
  business_use: 'cyan',
  mixed: 'amber',
  vacant: 'neutral',
  other: 'neutral',
  unknown: 'neutral',
};

/** Soportes idóneos para administración de PH (nunca "factura", §7/§8). */
export const ADMINISTRATION_SUPPORT_TYPE_LABEL: Record<string, string> = {
  administration_account_statement: 'Cuenta de cobro',
  copropiedad_certificate: 'Certificado de la copropiedad',
  receipt: 'Recibo',
  payment_proof: 'Comprobante / extracto de pago',
};

/** Muestra una etiqueta en español para cualquier valor de enum; nunca interpola el valor crudo. */
export function labelOrFallback<T extends string>(
  map: Record<string, string>,
  value: T | null | undefined,
): string {
  if (!value) return 'Sin definir';
  return map[value] ?? 'Estado no reconocido';
}
