import { z } from 'zod';
import { IsoTimestampSchema } from './primitives';

/**
 * Dependientes económicos (Sprint 2.4, Fase C).
 *
 * `TaxDependent` conserva el dato completo del dependiente (nombre,
 * documento, relación) para trazabilidad local; la UI aplica masking en
 * tarjetas generales y el export "safe summary" nunca incluye el documento
 * completo (ver `docs/DEPENDENTS_BENEFITS_2025.md`).
 *
 * El expediente puede almacenar más de cuatro dependientes: el límite de
 * cuatro es exclusivo del beneficio adicional de 72 UVT (art. 336 num. 3
 * ET) y se aplica en el motor puro (`packages/aegis-rules`), nunca en este
 * contrato ni en la UI.
 */

export const DependentDocumentTypeSchema = z.enum(['CC', 'TI', 'RC', 'CE', 'other']);
export type DependentDocumentType = z.infer<typeof DependentDocumentTypeSchema>;

/**
 * Tipos de relación soportados. Coinciden con las categorías del parágrafo 2
 * del art. 387 ET (compartidas también por el art. 336 num. 3 ET — ver
 * `docs/DEPENDENTS_BENEFITS_2025.md`).
 */
export const DependentRelationshipSchema = z.enum([
  'child_minor',
  'child_student',
  'child_disabled',
  'spouse_or_partner',
  'parent',
  'sibling',
  'foster_family',
  'other_review',
]);
export type DependentRelationship = z.infer<typeof DependentRelationshipSchema>;

/** Condición de dependencia económica declarada para cónyuge/padres/hermanos. */
export const DependencyConditionSchema = z.enum([
  'not_applicable',
  'no_income_or_low_income',
  'physical_or_psychological',
  'unknown',
]);
export type DependencyCondition = z.infer<typeof DependencyConditionSchema>;

export const DependentStudentStatusSchema = z.enum([
  'not_applicable',
  'studying',
  'not_studying',
  'unknown',
]);
export type DependentStudentStatus = z.infer<typeof DependentStudentStatusSchema>;

/** Beneficio preferido cuando el contribuyente es independiente y debe elegir uno solo por dependiente. */
export const DependentPreferredBenefitSchema = z.enum(['article_387', 'article_336']);
export type DependentPreferredBenefit = z.infer<typeof DependentPreferredBenefitSchema>;

export const DependentRecordStatusSchema = z.enum(['active', 'archived']);
export type DependentRecordStatus = z.infer<typeof DependentRecordStatusSchema>;

export const TaxDependentSchema = z.object({
  id: z.string().min(1),
  caseId: z.string().min(1),
  fullName: z.string().min(1),
  documentType: DependentDocumentTypeSchema.nullable(),
  documentNumber: z.string().nullable(),
  relationship: DependentRelationshipSchema,
  dateOfBirth: z.string().nullable().optional(),
  dependencyType: DependencyConditionSchema,
  annualIncomeCop: z.number().nullable().optional(),
  studentStatus: DependentStudentStatusSchema,
  educationalInstitution: z.string().nullable().optional(),
  disabilityOrDependencyCondition: z.boolean().nullable().optional(),
  monthsClaimed: z.number().int().min(0).max(12),
  /** Elección explícita cuando el contribuyente es independiente (ver coexistencia). `null` si no aplica o no se ha elegido. */
  preferredBenefit: DependentPreferredBenefitSchema.nullable(),
  notes: z.string().optional(),
  status: DependentRecordStatusSchema,
  createdAt: IsoTimestampSchema,
  updatedAt: IsoTimestampSchema,
});
export type TaxDependent = z.infer<typeof TaxDependentSchema>;

export const DEPENDENT_SUPPORT_TYPES = [
  'civil_registry',
  'identity_document',
  'education_certificate',
  'income_or_no_income_certificate',
  'accountant_certificate',
  'medical_certificate',
  'dependency_declaration',
  'economic_support_receipts',
  'other',
] as const;
export const DependentSupportTypeSchema = z.enum(DEPENDENT_SUPPORT_TYPES);
export type DependentSupportType = z.infer<typeof DependentSupportTypeSchema>;

/**
 * Soporte asociado a un dependiente. `documentId` referencia la biblioteca
 * documental existente (`UploadedDocument`); este contrato NO almacena
 * binarios propios (§9 del prompt de Fase C — reutilizar biblioteca
 * documental existente, no crear almacenamiento paralelo de PDFs).
 */
export const DependentSupportSchema = z.object({
  id: z.string().min(1),
  dependentId: z.string().min(1),
  caseId: z.string().min(1),
  type: DependentSupportTypeSchema,
  documentId: z.string().nullable(),
  notes: z.string().optional(),
  createdAt: IsoTimestampSchema,
});
export type DependentSupport = z.infer<typeof DependentSupportSchema>;

export const DependentEligibilityStatusSchema = z.enum([
  'eligible',
  'possibly_eligible',
  'requires_support',
  'not_eligible',
  'pending_review',
]);
export type DependentEligibilityStatus = z.infer<typeof DependentEligibilityStatusSchema>;

export const DependentBenefitCandidateSchema = z.enum(['article_387', 'article_336']);
export type DependentBenefitCandidateKind = z.infer<typeof DependentBenefitCandidateSchema>;

/**
 * Resultado persistido de evaluar un dependiente (elegibilidad +
 * coexistencia). Se recalcula en cascada ante cualquier cambio relevante
 * (Sección 26); `staleDueToRuleChange` se activa cuando el motor cambia de
 * versión y existía una decisión humana confirmada previa (Sección 24), sin
 * recalcular silenciosamente esa decisión.
 */
export const DependentEvaluationSchema = z.object({
  id: z.string().min(1),
  dependentId: z.string().min(1),
  caseId: z.string().min(1),
  status: DependentEligibilityStatusSchema,
  /** "Por qué podría aplicar" en lenguaje humano. */
  reasons: z.array(z.string()),
  /** "Qué soporte falta" en lenguaje humano. */
  missingSupportTypes: z.array(DependentSupportTypeSchema),
  candidateBenefits: z.array(DependentBenefitCandidateSchema),
  requiresCoexistenceChoice: z.boolean(),
  ruleVersion: z.string().min(1),
  /** `true` cuando el analista ya confirmó esta evaluación como decisión (no se recalcula silenciosamente). */
  confirmedByAnalyst: z.boolean(),
  staleDueToRuleChange: z.boolean(),
  previousRuleVersion: z.string().nullable().optional(),
  evaluatedAt: IsoTimestampSchema,
  updatedAt: IsoTimestampSchema,
});
export type DependentEvaluation = z.infer<typeof DependentEvaluationSchema>;

export const DEPENDENTS_SCHEMA_VERSION = '2.4.0';
