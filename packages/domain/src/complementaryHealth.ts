import { z } from 'zod';
import { IsoTimestampSchema } from './primitives';

/**
 * Salud complementaria y medicina prepagada (Sprint 2.4, Fase H).
 *
 * Principio normativo (art. 387 ET, texto vigente):
 *
 *   "los pagos por salud, siempre que el valor a disminuir mensualmente
 *   [...] no supere dieciséis (16) UVT mensuales"
 *
 * El límite es MENSUAL y AGREGADO para el contribuyente (nunca por
 * proveedor, por póliza ni por beneficiario — literal (b) del art. 387 ET
 * usa expresamente "la misma limitación del literal anterior", es decir,
 * un único tope de 16 UVT compartido entre medicina prepagada y seguros de
 * salud del mismo mes). El equivalente anual de 192 UVT (16 × 12) NUNCA es
 * la regla primaria: es la equivalencia matemática de acumular 12 meses
 * completos del tope mensual — ver `evaluateComplementaryHealthMonthlyCap`
 * en `packages/aegis-rules`.
 *
 * Separación obligatoria (§9/§10 del prompt de Fase H):
 *
 *   `complementary_health_payment != mandatory_health_contribution`
 *   `complementary_health_payment != direct_medical_expense`
 *
 * Un aporte obligatorio a EPS o un gasto médico pagado directamente
 * (consulta, odontología, medicamentos, hospital, cirugía) NUNCA se trata
 * como esta deducción, aunque el proveedor sea una entidad de salud.
 */

export const ComplementaryHealthProductTypeSchema = z.enum([
  'prepaid_medicine',
  'health_insurance',
  'additional_health_plan',
  'other',
  'unknown',
]);
export type ComplementaryHealthProductType = z.infer<typeof ComplementaryHealthProductTypeSchema>;

/**
 * Beneficiario del pago (§4 del prompt). Nunca se asume elegibilidad
 * únicamente por la relación textual — cuando `beneficiary === 'dependent'`,
 * `beneficiaryDependentId` debe apuntar a un `TaxDependent` YA existente
 * (reutiliza el dominio de dependientes de Fase C; nunca crea un segundo
 * registro de personas).
 */
export const ComplementaryHealthBeneficiarySchema = z.enum([
  'taxpayer',
  'spouse_or_partner',
  'child',
  'dependent',
  'unknown',
]);
export type ComplementaryHealthBeneficiary = z.infer<typeof ComplementaryHealthBeneficiarySchema>;

/** Estado de soporte probatorio. Certificados de medicina prepagada/aseguradora bastan; nunca se exige factura electrónica (§11). */
export const ComplementaryHealthSupportStatusSchema = z.enum([
  'sufficient',
  'partially_supported',
  'missing',
  'requires_review',
]);
export type ComplementaryHealthSupportStatus = z.infer<
  typeof ComplementaryHealthSupportStatusSchema
>;

/**
 * Elegibilidad potencial de un pago de salud complementaria (§13 del
 * prompt). Nunca es un booleano: el motor puro
 * (`evaluateComplementaryHealthPaymentEligibility`, `@nexus-tax/aegis-rules`)
 * siempre produce uno de estos estados explicables.
 *
 * - `eligible`: pasó todas las validaciones individuales y el tope mensual
 *   agregado no recortó su valor.
 * - `partially_eligible` / `cap_applied`: el tope mensual agregado
 *   (16 UVT) recortó el valor considerado de este pago (§5/§6).
 * - `requires_beneficiary_review`: beneficiario desconocido o, si es
 *   `dependent`, sin vincular a un `TaxDependent` existente (§4/§14).
 * - `requires_monthly_breakdown`: no hay mes conocido (certificado anual
 *   sin detalle mensual, §7/§8) — nunca se asume `total / 12`.
 * - `requires_support`: soporte insuficiente o parcial (§11).
 * - `not_applicable`: aporte obligatorio a EPS o gasto médico directo
 *   (§9/§10) — nunca se trata como esta deducción.
 * - `requires_review`: posible duplicado u otro caso que exige revisión
 *   humana antes de continuar.
 */
export const ComplementaryHealthEligibilityStatusSchema = z.enum([
  'eligible',
  'partially_eligible',
  'cap_applied',
  'requires_beneficiary_review',
  'requires_monthly_breakdown',
  'requires_support',
  'not_applicable',
  'requires_review',
]);
export type ComplementaryHealthEligibilityStatus = z.infer<
  typeof ComplementaryHealthEligibilityStatusSchema
>;

/** Decisión humana sobre un pago de salud complementaria — nunca se autoconfirma. */
export const ComplementaryHealthDecisionStatusSchema = z.enum(['pending', 'confirmed', 'rejected']);
export type ComplementaryHealthDecisionStatus = z.infer<
  typeof ComplementaryHealthDecisionStatusSchema
>;

/**
 * `ComplementaryHealthPayment` — pago candidato de medicina prepagada,
 * seguro de salud o plan adicional de salud (§3 del prompt).
 *
 * `month` es `null` únicamente cuando el pago proviene de un certificado
 * anual SIN detalle mensual recuperable (§7/§8): en ese caso el motor
 * puro nunca lo incluye en el agregado mensual y lo marca
 * `requires_monthly_breakdown`, conservando el valor como evidencia.
 *
 * `isMandatoryEpsContribution`/`isDirectMedicalExpense` son marcas
 * explícitas de exclusión (§9/§10): nunca se infieren solo del nombre del
 * proveedor.
 *
 * Guardarraíl de doble conteo: `possiblyDuplicateOfPaymentId` (otro
 * `ComplementaryHealthPayment`, p. ej. el mismo mes capturado dos veces
 * desde un pago mensual y desde el detalle de un certificado anual).
 */
export const ComplementaryHealthPaymentSchema = z.object({
  id: z.string().min(1),
  caseId: z.string().min(1),
  providerName: z.string().min(1),
  /** Documento del proveedor ya enmascarado por el analista; nunca el NIT completo (§30, privacidad). */
  providerTaxIdMasked: z.string().nullable().optional(),
  productType: ComplementaryHealthProductTypeSchema,
  beneficiary: ComplementaryHealthBeneficiarySchema,
  /** `TaxDependent.id` cuando `beneficiary === 'dependent'`; `null` en otro caso. */
  beneficiaryDependentId: z.string().nullable(),
  taxYear: z.number().int(),
  /** Mes del pago (1-12); `null` cuando no hay detalle mensual recuperable (§7/§8). */
  month: z.number().int().min(1).max(12).nullable(),
  /**
   * Descripción textual del período de cobertura declarado por el
   * certificado (p. ej. "Enero-Diciembre 2025"), cuando existe pero no
   * permite derivar el mes exacto (§7/§8). Distinto de `month`: un
   * certificado puede declarar un período de cobertura sin desglose
   * mensual recuperable — en ese caso `month` es `null` pero
   * `coveragePeriodDescription` no lo es. Cuando NINGÚN período es
   * conocido (ni mes ni período de cobertura), ambos son `null`.
   */
  coveragePeriodDescription: z.string().nullable().optional(),
  amountPaidCop: z.number(),
  /** Valor considerado tras aplicar el tope mensual agregado (§5); `null` hasta el primer cálculo. */
  eligibleAmountCop: z.number().nullable(),
  sourceDocumentId: z.string().nullable(),
  evidenceDescription: z.string().nullable(),
  supportStatus: ComplementaryHealthSupportStatusSchema,
  supportTypes: z.array(z.string()),
  /** Aporte obligatorio a EPS (§9): NUNCA se suma al tope de medicina prepagada. */
  isMandatoryEpsContribution: z.boolean(),
  /** Gasto médico pagado directamente (§10): consulta, odontología, medicamentos, hospital, cirugía. */
  isDirectMedicalExpense: z.boolean(),
  eligibilityStatus: ComplementaryHealthEligibilityStatusSchema,
  eligibilityReasons: z.array(z.string()),
  ruleVersion: z.string().min(1),
  decisionStatus: ComplementaryHealthDecisionStatusSchema,
  reasons: z.array(z.string()),
  /** Otro `ComplementaryHealthPayment` con el que podría duplicarse. */
  possiblyDuplicateOfPaymentId: z.string().nullable().optional(),
  createdAt: IsoTimestampSchema,
  updatedAt: IsoTimestampSchema,
});
export type ComplementaryHealthPayment = z.infer<typeof ComplementaryHealthPaymentSchema>;

export const COMPLEMENTARY_HEALTH_SCHEMA_VERSION = '2.4.0';
