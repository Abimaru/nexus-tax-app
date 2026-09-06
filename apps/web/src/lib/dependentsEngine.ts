import type {
  DependentBenefitCandidateKind,
  DependentEligibilityStatus,
  DependentRelationship,
  DependentSupportType,
  TaxDependent,
} from '@nexus-tax/domain';
import {
  evaluateDependentEligibility,
  resolveDependentBenefitCoexistence,
  type DependentCoexistenceInput,
  type DependentEligibilityInput,
  type EmploymentIncomeNature,
} from '@nexus-tax/aegis-rules';
import type {
  DependentDeclaration,
  DependentsAdditionalDeductionCandidate,
} from '@nexus-tax/aegis-rules';

/**
 * Orquestación pura (sin Dexie, sin React) entre el modelo de dominio
 * `TaxDependent` y los motores puros de `@nexus-tax/aegis-rules` (Sprint
 * 2.4, Fase C). No decide elegibilidad ni coexistencia por sí misma: solo
 * traduce datos almacenados al shape que cada motor espera y viceversa.
 */

export const DEPENDENTS_ENGINE_VERSION = 'nexustax.dependents.2025.v1';

/** Mapa de relación de dominio → `DependentKind` del motor art. 387 (solo etiqueta, no afecta el cálculo). */
const RELATIONSHIP_TO_ARTICLE_387_KIND: Record<DependentRelationship, DependentDeclaration['kind']> = {
  child_minor: 'child_minor',
  child_student: 'child_studying_18_23',
  child_disabled: 'child_disabled',
  spouse_or_partner: 'spouse_no_income',
  parent: 'parent_or_sibling_low_income',
  sibling: 'parent_or_sibling_low_income',
  foster_family: 'foster_family',
  other_review: 'other_review',
};

/** Soportes ya asociados a un dependiente (por tipo), derivados de `DependentSupport[]`. */
export function supportTypesFor(
  dependentId: string,
  supports: readonly { dependentId: string; type: DependentSupportType }[],
): DependentSupportType[] {
  return supports.filter((support) => support.dependentId === dependentId).map((support) => support.type);
}

/** Calcula la edad al cierre del año gravable (31 de diciembre) a partir de la fecha de nacimiento ISO. */
export function ageAtYearEnd(dateOfBirth: string | null | undefined, taxYear: number): number | null {
  if (!dateOfBirth) return null;
  const birth = new Date(dateOfBirth);
  if (Number.isNaN(birth.getTime())) return null;
  const yearEnd = new Date(Date.UTC(taxYear, 11, 31));
  let age = yearEnd.getUTCFullYear() - birth.getUTCFullYear();
  const birthdayPassed =
    yearEnd.getUTCMonth() > birth.getUTCMonth() ||
    (yearEnd.getUTCMonth() === birth.getUTCMonth() && yearEnd.getUTCDate() >= birth.getUTCDate());
  if (!birthdayPassed) age -= 1;
  return age;
}

export interface DependentEligibilityComputation {
  dependentId: string;
  status: DependentEligibilityStatus;
  reasons: readonly string[];
  missingSupportTypes: readonly DependentSupportType[];
}

/** Evalúa la elegibilidad base de un dependiente (Sección 8, Fase C). */
export function computeDependentEligibility(
  taxYear: number,
  dependent: TaxDependent,
  providedSupportTypes: readonly DependentSupportType[],
): DependentEligibilityComputation {
  const input: DependentEligibilityInput = {
    taxYear,
    relationship: dependent.relationship,
    ageAtYearEnd: ageAtYearEnd(dependent.dateOfBirth, taxYear),
    studentStatus: dependent.studentStatus,
    annualIncomeCop: dependent.annualIncomeCop ?? null,
    disabilityOrDependencyCondition: dependent.disabilityOrDependencyCondition ?? null,
    monthsClaimed: dependent.monthsClaimed,
    providedSupportTypes,
  };
  const result = evaluateDependentEligibility(input);
  return {
    dependentId: dependent.id,
    status: result.status,
    reasons: result.reasons,
    missingSupportTypes: result.missingSupportTypes as DependentSupportType[],
  };
}

export interface DependentCoexistenceComputation {
  dependentId: string;
  candidateBenefits: readonly DependentBenefitCandidateKind[];
  requiresChoice: boolean;
  reason: string;
}

/**
 * Resuelve la coexistencia para todos los dependientes activos del
 * expediente. `baseEligible` se deriva de `status === 'eligible'`: los
 * demás estados (posiblemente elegible, requiere soporte, pendiente, no
 * elegible) NO habilitan ningún beneficio todavía — la UI los muestra igual,
 * pero el motor no los cuenta hasta que el estado sea `eligible`.
 */
export function computeDependentsCoexistence(
  employmentIncomeNature: EmploymentIncomeNature,
  dependents: readonly TaxDependent[],
  eligibility: readonly DependentEligibilityComputation[],
): DependentCoexistenceComputation[] {
  const eligibilityById = new Map(eligibility.map((item) => [item.dependentId, item]));
  const inputs: DependentCoexistenceInput[] = dependents.map((dependent) => ({
    id: dependent.id,
    baseEligible: eligibilityById.get(dependent.id)?.status === 'eligible',
    preferredBenefit: dependent.preferredBenefit,
  }));
  const results = resolveDependentBenefitCoexistence(employmentIncomeNature, inputs);
  return results.map((result) => ({
    dependentId: result.id,
    candidateBenefits: result.candidateBenefits,
    requiresChoice: result.requiresChoice,
    reason: result.reason,
  }));
}

/** Construye el input `dependents` (art. 387) para `buildForm210Draft` a partir de los candidatos resueltos. */
export function buildArticle387Input(
  dependents: readonly TaxDependent[],
  coexistence: readonly DependentCoexistenceComputation[],
): DependentDeclaration[] {
  const coexistenceById = new Map(coexistence.map((item) => [item.dependentId, item]));
  return dependents
    .filter((dependent) => dependent.status === 'active')
    .filter((dependent) => coexistenceById.get(dependent.id)?.candidateBenefits.includes('article_387'))
    .map((dependent) => ({
      id: dependent.id,
      kind: RELATIONSHIP_TO_ARTICLE_387_KIND[dependent.relationship],
      monthsClaimed: dependent.monthsClaimed,
      notes: dependent.notes,
    }));
}

/** Construye el input `dependentsAdditional` (art. 336, 72 UVT) para `buildForm210Draft`. */
export function buildArticle336Input(
  dependents: readonly TaxDependent[],
  coexistence: readonly DependentCoexistenceComputation[],
): DependentsAdditionalDeductionCandidate[] {
  const coexistenceById = new Map(coexistence.map((item) => [item.dependentId, item]));
  return dependents
    .filter((dependent) => dependent.status === 'active')
    .map((dependent) => ({
      id: dependent.id,
      eligible: coexistenceById.get(dependent.id)?.candidateBenefits.includes('article_336') ?? false,
    }));
}

/** Etiquetas humanas para el estado de elegibilidad. Nunca se muestra el enum crudo en la UI. */
export const DEPENDENT_ELIGIBILITY_LABEL: Record<DependentEligibilityStatus, string> = {
  eligible: 'Elegible',
  possibly_eligible: 'Posiblemente elegible',
  requires_support: 'Requiere soporte',
  not_eligible: 'No elegible',
  pending_review: 'Pendiente de revisión',
};

export const DEPENDENT_RELATIONSHIP_LABEL: Record<DependentRelationship, string> = {
  child_minor: 'Hijo(a) menor de edad',
  child_student: 'Hijo(a) estudiante',
  child_disabled: 'Hijo(a) con dependencia física o psicológica',
  spouse_or_partner: 'Cónyuge o compañero(a) permanente',
  parent: 'Padre o madre',
  sibling: 'Hermano(a)',
  foster_family: 'Familiar de crianza',
  other_review: 'Otro (sujeto a revisión)',
};

export const DEPENDENT_SUPPORT_TYPE_LABEL: Record<DependentSupportType, string> = {
  civil_registry: 'Registro civil',
  identity_document: 'Documento de identidad',
  education_certificate: 'Certificado de estudios',
  income_or_no_income_certificate: 'Certificación de ingresos / no ingresos',
  accountant_certificate: 'Certificación de contador público',
  medical_certificate: 'Certificación médica',
  dependency_declaration: 'Declaración de dependencia',
  economic_support_receipts: 'Comprobantes de apoyo económico',
  other: 'Otro soporte',
};
