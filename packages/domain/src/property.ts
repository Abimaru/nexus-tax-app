import { z } from 'zod';
import { IsoTimestampSchema, TaxYearSchema } from './primitives';

/**
 * Inmuebles, renta inmobiliaria y administración de propiedad horizontal
 * (Sprint 2.4, Fase G).
 *
 * Principio inviolable de esta fase (§2 del prompt):
 *
 *   `propiedad del inmueble != gasto deducible`
 *
 * Nunca se sugiere una deducción de administración, predial, reparaciones,
 * seguros o intereses únicamente porque el usuario sea propietario. Primero
 * debe existir contexto tributario compatible (uso del inmueble, actividad
 * de arrendamiento, período, soporte) — ver `evaluatePropertyExpenseEligibility`
 * en `packages/aegis-rules`. El flujo completo es:
 *
 *   hecho → contexto → elegibilidad potencial → soporte → decisión humana
 *   → impacto tributario trazable.
 *
 * Esta fase NO cablea ningún gasto al Formulario 210 (§25): `TaxProperty`/
 * `PropertyExpense` son candidatos, nunca un hecho tributario aplicado. Ver
 * `docs/PROPERTY_INCOME_EXPENSES_2025.md`.
 */

export const PropertyTypeSchema = z.enum([
  'apartment',
  'house',
  'parking',
  'storage',
  'commercial',
  'land',
  'other',
]);
export type PropertyType = z.infer<typeof PropertyTypeSchema>;

/**
 * Uso del inmueble durante el año gravable (§3/§20 del prompt). Determina
 * qué preguntas y qué elegibilidad potencial de gastos aplican — nunca se
 * infiere de otros datos (p. ej. de que existan ingresos exógenos).
 */
export const PropertyUseSchema = z.enum([
  'personal_residence',
  'rented',
  'business_use',
  'mixed',
  'vacant',
  'other',
  'unknown',
]);
export type PropertyUse = z.infer<typeof PropertyUseSchema>;

/**
 * `TaxProperty` — inmueble de una persona natural (§3 del prompt). No
 * guarda dirección completa (§30, privacidad): usa una etiqueta humana
 * (`label`, p. ej. "Apartamento principal") y, si el analista decide
 * conservar una referencia de ubicación, `locationMasked` debe ser una
 * versión ya enmascarada, nunca la dirección exacta.
 */
export const TaxPropertySchema = z.object({
  id: z.string().min(1),
  caseId: z.string().min(1),
  label: z.string().min(1),
  propertyType: PropertyTypeSchema,
  use: PropertyUseSchema,
  /** Porcentaje de propiedad del declarante (0-100]. */
  ownershipPercentage: z.number().min(0).max(100),
  ownedFrom: z.string().nullable(),
  ownedUntil: z.string().nullable(),
  taxYear: TaxYearSchema,
  cadastralValue: z.number().nullable().optional(),
  fiscalValue: z.number().nullable().optional(),
  acquisitionValue: z.number().nullable().optional(),
  /** Referencia de ubicación ya enmascarada por el analista; nunca la dirección exacta (§30). */
  locationMasked: z.string().nullable().optional(),
  /** Documentos de la biblioteca existente asociados como evidencia de este inmueble (§16/§17). */
  sourceDocumentIds: z.array(z.string()),
  createdAt: IsoTimestampSchema,
  updatedAt: IsoTimestampSchema,
});
export type TaxProperty = z.infer<typeof TaxPropertySchema>;

/**
 * `RentalActivity` — período de arrendamiento de un inmueble (§4/§13 del
 * prompt). Separado del inmueble para no asumir automáticamente que
 * `property.use === 'rented'` implica los 12 meses del año: el período
 * real puede ser parcial.
 */
export const RentalActivitySchema = z.object({
  id: z.string().min(1),
  caseId: z.string().min(1),
  propertyId: z.string().min(1),
  from: z.string(),
  to: z.string(),
  /** Meses cubiertos por esta actividad, derivado o confirmado manualmente (0-12). */
  monthsCovered: z.number().int().min(0).max(12),
  notes: z.string().optional(),
  createdAt: IsoTimestampSchema,
  updatedAt: IsoTimestampSchema,
});
export type RentalActivity = z.infer<typeof RentalActivitySchema>;

/**
 * Origen de un ingreso por arrendamiento asociado (§5 del prompt). Nunca
 * duplica el dato: si el ingreso ya está en la exógena o en un hecho
 * documental, `RentalIncome` es un ENLACE hacia esa fuente
 * (`sourceKind`/`sourceId`), reutilizando la infraestructura de
 * conciliación existente en vez de crear un segundo libro de ingresos.
 * Solo `manual` almacena un valor propio.
 */
export const RentalIncomeSourceKindSchema = z.enum(['exogenous_record', 'document_fact', 'manual']);
export type RentalIncomeSourceKind = z.infer<typeof RentalIncomeSourceKindSchema>;

export const RentalIncomeSchema = z.object({
  id: z.string().min(1),
  caseId: z.string().min(1),
  propertyId: z.string().min(1),
  rentalActivityId: z.string().nullable(),
  sourceKind: RentalIncomeSourceKindSchema,
  /** Id del registro exógeno o del `DocumentFact` referenciado; `null` solo cuando `sourceKind === 'manual'`. */
  sourceId: z.string().nullable(),
  /**
   * Valor del ingreso. Para `exogenous_record`/`document_fact` es una
   * COPIA DE LECTURA de la fuente (para presentación sin recalcular);
   * la fuente de verdad sigue siendo el registro/hecho original — nunca
   * se suma dos veces en ningún agregado.
   */
  amountCop: z.number(),
  period: z.string().nullable(),
  notes: z.string().optional(),
  createdAt: IsoTimestampSchema,
  updatedAt: IsoTimestampSchema,
});
export type RentalIncome = z.infer<typeof RentalIncomeSchema>;

/** Tipo de gasto asociado al inmueble (§6 del prompt). */
export const PropertyExpenseTypeSchema = z.enum([
  'administration_fee',
  'property_tax',
  'maintenance',
  'repair',
  'insurance',
  'utilities',
  'mortgage_interest',
  'other',
]);
export type PropertyExpenseType = z.infer<typeof PropertyExpenseTypeSchema>;

/**
 * Método de asignación cuando el uso del inmueble es `mixed` (§12 del
 * prompt). Nunca se asume 50 % ni se calcula sin contexto suficiente —
 * `allocationPercentage`/`allocationReason` deben provenir de una decisión
 * humana explícita.
 */
export const PropertyAllocationMethodSchema = z.enum(['percentage', 'period', 'both', 'unknown']);
export type PropertyAllocationMethod = z.infer<typeof PropertyAllocationMethodSchema>;

/** Estado de soporte probatorio (§8 del prompt). Nunca "factura faltante" para administración de PH. */
export const PropertySupportStatusSchema = z.enum([
  'sufficient',
  'partially_supported',
  'missing',
  'requires_review',
]);
export type PropertySupportStatus = z.infer<typeof PropertySupportStatusSchema>;

/**
 * Elegibilidad potencial de un gasto de inmueble (§9 del prompt). Nunca es
 * un booleano `deductible = true/false`: el motor puro
 * (`evaluatePropertyExpenseEligibility`, `@nexus-tax/aegis-rules`) siempre
 * produce uno de estos estados explicables.
 */
export const PropertyExpenseEligibilityStatusSchema = z.enum([
  'potentially_deductible',
  'not_applicable',
  'requires_context',
  'requires_support',
  'requires_allocation',
  'requires_review',
]);
export type PropertyExpenseEligibilityStatus = z.infer<typeof PropertyExpenseEligibilityStatusSchema>;

/** Decisión humana sobre un gasto de inmueble — nunca se autoconfirma. */
export const PropertyExpenseDecisionStatusSchema = z.enum(['pending', 'confirmed', 'rejected']);
export type PropertyExpenseDecisionStatus = z.infer<typeof PropertyExpenseDecisionStatusSchema>;

/**
 * `PropertyExpense` — gasto candidato asociado a un inmueble (§6 del
 * prompt). `eligibilityStatus`/`eligibilityReasons` son el resultado del
 * motor puro, recalculado ante cualquier cambio relevante (igual que
 * `DependentEvaluation`); `decisionStatus` es la decisión humana explícita
 * y nunca se sobreescribe silenciosamente.
 *
 * Guardarraíles de doble conteo (§26): `possiblyDuplicateOfExpenseId`
 * (otro `PropertyExpense`, p. ej. mensual vs. total anual del mismo
 * concepto) y `relatedFactId` (un `DocumentFact` ya confirmado que podría
 * representar el mismo concepto, p. ej. intereses de vivienda ya
 * modelados por `housing_interest_certificate`) se completan cuando el
 * motor detecta una posible coincidencia; el gasto queda en
 * `requires_review` hasta que un humano lo confirme o lo descarte.
 */
export const PropertyExpenseSchema = z.object({
  id: z.string().min(1),
  propertyId: z.string().min(1),
  caseId: z.string().min(1),
  expenseType: PropertyExpenseTypeSchema,
  rentalActivityId: z.string().nullable(),
  period: z.string().nullable(),
  amountCop: z.number(),
  sourceDocumentId: z.string().nullable(),
  evidenceDescription: z.string().nullable(),
  supportStatus: PropertySupportStatusSchema,
  supportTypes: z.array(z.string()),
  allocationMethod: PropertyAllocationMethodSchema,
  allocationPercentage: z.number().min(0).max(100).nullable(),
  allocationReason: z.string().nullable(),
  eligibilityStatus: PropertyExpenseEligibilityStatusSchema,
  eligibilityReasons: z.array(z.string()),
  ruleVersion: z.string().min(1),
  decisionStatus: PropertyExpenseDecisionStatusSchema,
  reasons: z.array(z.string()),
  /** Cuota extraordinaria: nunca se mezcla automáticamente con administración ordinaria (§19). */
  isExtraordinary: z.boolean(),
  /** Otro `PropertyExpense` con el que podría duplicarse (§26). */
  possiblyDuplicateOfExpenseId: z.string().nullable().optional(),
  /** `DocumentFact` ya confirmado que podría representar el mismo concepto (§26, p. ej. intereses de vivienda). */
  relatedFactId: z.string().nullable().optional(),
  createdAt: IsoTimestampSchema,
  updatedAt: IsoTimestampSchema,
});
export type PropertyExpense = z.infer<typeof PropertyExpenseSchema>;

export const PROPERTY_SCHEMA_VERSION = '2.4.0';
