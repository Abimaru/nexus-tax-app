import type { DependentEligibilityStatus, DependentRelationship } from '@nexus-tax/domain';
import { getTaxUnit } from './tax-unit';

/**
 * Evaluador de elegibilidad de dependientes económicos (Sprint 2.4, Fase C).
 *
 * Verifica, para cada categoría del parágrafo 2 del art. 387 ET (compartido
 * con el art. 336 num. 3 ET), los requisitos normativos mínimos. Nunca
 * concluye `not_eligible` por un dato faltante: usa `pending_review` cuando
 * falta información crítica para decidir (Sección 8 del prompt de Fase C).
 *
 * CORRECCIÓN NORMATIVA (Ley 2411 de 2024): el rango de edad para "hijo
 * estudiante" se amplió de 18-23 a **18-25 años**, vigente para el año
 * gravable 2025 (declaración 2026). Se usa aquí `CHILD_STUDENT_MAX_AGE = 25`.
 *
 * Este motor es puro: no accede a la biblioteca documental ni a Dexie. Los
 * soportes disponibles se reciben ya resueltos (`providedSupportTypes`).
 */
export const DEPENDENT_ELIGIBILITY_SOURCE_ID = 'et-art-387-par-2';
export const DEPENDENTS_INCOME_THRESHOLD_UVT = 260;
export const CHILD_MINOR_MAX_AGE = 18;
export const CHILD_STUDENT_MIN_AGE = 18;
/** Ampliado de 23 a 25 años por la Ley 2411 de 2024, vigente para AG2025. */
export const CHILD_STUDENT_MAX_AGE = 25;

export interface DependentEligibilityInput {
  taxYear: number;
  relationship: DependentRelationship;
  /** Edad exacta al cierre del año gravable (calculada por el llamador a partir de la fecha de nacimiento). `null` si no se conoce. */
  ageAtYearEnd: number | null;
  studentStatus: 'not_applicable' | 'studying' | 'not_studying' | 'unknown';
  annualIncomeCop: number | null;
  /** `true`/`false` si está certificado; `null` si no se ha determinado. */
  disabilityOrDependencyCondition: boolean | null;
  monthsClaimed: number;
  /** Tipos de soporte ya asociados al dependiente. */
  providedSupportTypes: readonly string[];
}

export interface DependentEligibilityResult {
  status: DependentEligibilityStatus;
  reasons: readonly string[];
  missingSupportTypes: readonly string[];
  ruleSourceId: string;
}

function hasSupport(provided: readonly string[], type: string): boolean {
  return provided.includes(type);
}

/**
 * Evalúa la elegibilidad de un dependiente para el año gravable 2025. El
 * resultado es orientativo: la certificación final (Medicina Legal,
 * contador público, registro civil) siempre requiere revisión humana.
 */
export function evaluateDependentEligibility(
  input: DependentEligibilityInput,
): DependentEligibilityResult {
  if (input.taxYear !== 2025) {
    throw new Error(
      `DEPENDENT_ELIGIBILITY aún no modela el año ${input.taxYear}. Añade el ruleset correspondiente.`,
    );
  }
  if (input.monthsClaimed <= 0) {
    return {
      status: 'pending_review',
      reasons: ['No se han declarado meses de dependencia para este año.'],
      missingSupportTypes: [],
      ruleSourceId: DEPENDENT_ELIGIBILITY_SOURCE_ID,
    };
  }

  switch (input.relationship) {
    case 'child_minor':
      return evaluateChildMinor(input);
    case 'child_student':
      return evaluateChildStudent(input);
    case 'child_disabled':
      return evaluateChildDisabled(input);
    case 'spouse_or_partner':
      return evaluateIncomeOrConditionDependent(input, 'civil_registry');
    case 'parent':
    case 'sibling':
      return evaluateIncomeOrConditionDependent(input, 'civil_registry');
    case 'foster_family':
      return {
        status: 'requires_support',
        reasons: [
          'Los familiares de crianza no están expresamente en el parágrafo 2 del art. 387 ET; requieren evaluación caso a caso con soporte legal.',
        ],
        missingSupportTypes: ['dependency_declaration'],
        ruleSourceId: DEPENDENT_ELIGIBILITY_SOURCE_ID,
      };
    case 'other_review':
    default:
      return {
        status: 'pending_review',
        reasons: ['Relación marcada explícitamente para revisión manual.'],
        missingSupportTypes: [],
        ruleSourceId: DEPENDENT_ELIGIBILITY_SOURCE_ID,
      };
  }
}

function evaluateChildMinor(input: DependentEligibilityInput): DependentEligibilityResult {
  const missing: string[] = [];
  if (!hasSupport(input.providedSupportTypes, 'civil_registry')) missing.push('civil_registry');
  if (input.ageAtYearEnd === null) {
    return {
      status: missing.length ? 'requires_support' : 'possibly_eligible',
      reasons: ['Falta confirmar la fecha de nacimiento para verificar que tenga hasta 18 años.'],
      missingSupportTypes: missing,
      ruleSourceId: DEPENDENT_ELIGIBILITY_SOURCE_ID,
    };
  }
  if (input.ageAtYearEnd > CHILD_MINOR_MAX_AGE) {
    return {
      status: 'not_eligible',
      reasons: [`Tiene ${input.ageAtYearEnd} años; el hijo menor debe tener hasta ${CHILD_MINOR_MAX_AGE} años.`],
      missingSupportTypes: [],
      ruleSourceId: DEPENDENT_ELIGIBILITY_SOURCE_ID,
    };
  }
  return {
    status: missing.length ? 'requires_support' : 'eligible',
    reasons: [`Tiene ${input.ageAtYearEnd} años (hasta ${CHILD_MINOR_MAX_AGE}).`],
    missingSupportTypes: missing,
    ruleSourceId: DEPENDENT_ELIGIBILITY_SOURCE_ID,
  };
}

function evaluateChildStudent(input: DependentEligibilityInput): DependentEligibilityResult {
  const missing: string[] = [];
  if (!hasSupport(input.providedSupportTypes, 'civil_registry')) missing.push('civil_registry');
  if (!hasSupport(input.providedSupportTypes, 'education_certificate'))
    missing.push('education_certificate');
  if (input.ageAtYearEnd === null) {
    return {
      status: 'pending_review',
      reasons: [
        `Falta confirmar la fecha de nacimiento para verificar el rango ${CHILD_STUDENT_MIN_AGE}-${CHILD_STUDENT_MAX_AGE} años.`,
      ],
      missingSupportTypes: missing,
      ruleSourceId: DEPENDENT_ELIGIBILITY_SOURCE_ID,
    };
  }
  if (input.ageAtYearEnd < CHILD_STUDENT_MIN_AGE || input.ageAtYearEnd > CHILD_STUDENT_MAX_AGE) {
    return {
      status: 'not_eligible',
      reasons: [
        `Tiene ${input.ageAtYearEnd} años; el hijo estudiante debe tener entre ${CHILD_STUDENT_MIN_AGE} y ${CHILD_STUDENT_MAX_AGE} años (Ley 2411 de 2024).`,
      ],
      missingSupportTypes: [],
      ruleSourceId: DEPENDENT_ELIGIBILITY_SOURCE_ID,
    };
  }
  if (input.studentStatus === 'unknown') {
    return {
      status: 'pending_review',
      reasons: ['Falta confirmar si el contribuyente está financiando la educación formal del hijo.'],
      missingSupportTypes: missing,
      ruleSourceId: DEPENDENT_ELIGIBILITY_SOURCE_ID,
    };
  }
  if (input.studentStatus !== 'studying') {
    return {
      status: 'not_eligible',
      reasons: ['El hijo entre 18 y 25 años no está estudiando o el contribuyente no financia su educación.'],
      missingSupportTypes: [],
      ruleSourceId: DEPENDENT_ELIGIBILITY_SOURCE_ID,
    };
  }
  return {
    status: missing.length ? 'requires_support' : 'eligible',
    reasons: [`Tiene ${input.ageAtYearEnd} años y está estudiando (rango ${CHILD_STUDENT_MIN_AGE}-${CHILD_STUDENT_MAX_AGE}).`],
    missingSupportTypes: missing,
    ruleSourceId: DEPENDENT_ELIGIBILITY_SOURCE_ID,
  };
}

function evaluateChildDisabled(input: DependentEligibilityInput): DependentEligibilityResult {
  const missing: string[] = [];
  if (!hasSupport(input.providedSupportTypes, 'civil_registry')) missing.push('civil_registry');
  if (!hasSupport(input.providedSupportTypes, 'medical_certificate'))
    missing.push('medical_certificate');
  if (input.disabilityOrDependencyCondition === null) {
    return {
      status: 'pending_review',
      reasons: ['Falta confirmar la certificación médica de la condición física o psicológica.'],
      missingSupportTypes: missing,
      ruleSourceId: DEPENDENT_ELIGIBILITY_SOURCE_ID,
    };
  }
  if (!input.disabilityOrDependencyCondition) {
    return {
      status: 'not_eligible',
      reasons: ['No hay condición física o psicológica certificada.'],
      missingSupportTypes: [],
      ruleSourceId: DEPENDENT_ELIGIBILITY_SOURCE_ID,
    };
  }
  return {
    status: missing.length ? 'requires_support' : 'eligible',
    reasons: ['Condición física o psicológica certificada.'],
    missingSupportTypes: missing,
    ruleSourceId: DEPENDENT_ELIGIBILITY_SOURCE_ID,
  };
}

/** Cónyuge/compañero, padres y hermanos comparten el mismo criterio: ausencia de ingresos o ingresos < 260 UVT, o condición física/psicológica. */
function evaluateIncomeOrConditionDependent(
  input: DependentEligibilityInput,
  relationshipSupport: string,
): DependentEligibilityResult {
  const missing: string[] = [];
  if (!hasSupport(input.providedSupportTypes, relationshipSupport)) missing.push(relationshipSupport);

  const hasConditionInfo = input.disabilityOrDependencyCondition !== null;
  const hasIncomeInfo = input.annualIncomeCop !== null;
  if (!hasConditionInfo && !hasIncomeInfo) {
    return {
      status: 'pending_review',
      reasons: ['Falta indicar ingresos anuales o condición física/psicológica certificada.'],
      missingSupportTypes: missing,
      ruleSourceId: DEPENDENT_ELIGIBILITY_SOURCE_ID,
    };
  }
  if (input.disabilityOrDependencyCondition) {
    if (!hasSupport(input.providedSupportTypes, 'medical_certificate'))
      missing.push('medical_certificate');
    return {
      status: missing.length ? 'requires_support' : 'eligible',
      reasons: ['Condición física o psicológica certificada.'],
      missingSupportTypes: missing,
      ruleSourceId: DEPENDENT_ELIGIBILITY_SOURCE_ID,
    };
  }
  if (hasIncomeInfo) {
    const uvt = getTaxUnit(input.taxYear).valueCop;
    const incomeUvt = (input.annualIncomeCop ?? 0) / uvt;
    if (incomeUvt >= DEPENDENTS_INCOME_THRESHOLD_UVT) {
      return {
        status: 'not_eligible',
        reasons: [
          `Ingresos anuales (${incomeUvt.toFixed(1)} UVT) superan el umbral de ${DEPENDENTS_INCOME_THRESHOLD_UVT} UVT.`,
        ],
        missingSupportTypes: [],
        ruleSourceId: DEPENDENT_ELIGIBILITY_SOURCE_ID,
      };
    }
    if (!hasSupport(input.providedSupportTypes, 'accountant_certificate'))
      missing.push('accountant_certificate');
    return {
      status: missing.length ? 'requires_support' : 'eligible',
      reasons: [`Ingresos anuales (${incomeUvt.toFixed(1)} UVT) por debajo del umbral de ${DEPENDENTS_INCOME_THRESHOLD_UVT} UVT.`],
      missingSupportTypes: missing,
      ruleSourceId: DEPENDENT_ELIGIBILITY_SOURCE_ID,
    };
  }
  return {
    status: 'pending_review',
    reasons: ['Falta confirmar si la condición física/psicológica certificada aplica.'],
    missingSupportTypes: missing,
    ruleSourceId: DEPENDENT_ELIGIBILITY_SOURCE_ID,
  };
}
