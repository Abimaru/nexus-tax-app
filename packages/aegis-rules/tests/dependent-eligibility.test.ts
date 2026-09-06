import { describe, expect, it } from 'vitest';
import { UVT_2025 } from '../src/colombia/individual-income-tax/2025/filing-obligation';
import {
  CHILD_STUDENT_MAX_AGE,
  DEPENDENTS_INCOME_THRESHOLD_UVT,
  evaluateDependentEligibility,
  type DependentEligibilityInput,
} from '../src/colombia/individual-income-tax/2025/dependent-eligibility';

function baseInput(overrides: Partial<DependentEligibilityInput> = {}): DependentEligibilityInput {
  return {
    taxYear: 2025,
    relationship: 'child_minor',
    ageAtYearEnd: 10,
    studentStatus: 'not_applicable',
    annualIncomeCop: null,
    disabilityOrDependencyCondition: null,
    monthsClaimed: 12,
    providedSupportTypes: ['civil_registry'],
    ...overrides,
  };
}

describe('evaluación de elegibilidad de dependientes — AG 2025', () => {
  it('hijo menor de 18 con soporte: eligible', () => {
    const result = evaluateDependentEligibility(baseInput());
    expect(result.status).toBe('eligible');
  });

  it('hijo menor sin soporte: requires_support (no not_eligible por dato incompleto)', () => {
    const result = evaluateDependentEligibility(baseInput({ providedSupportTypes: [] }));
    expect(result.status).toBe('requires_support');
    expect(result.missingSupportTypes).toContain('civil_registry');
  });

  it('hijo menor sin fecha de nacimiento: pending_review, no not_eligible', () => {
    const result = evaluateDependentEligibility(baseInput({ ageAtYearEnd: null }));
    expect(result.status).not.toBe('not_eligible');
  });

  it('hijo mayor de 18 declarado como menor: not_eligible', () => {
    const result = evaluateDependentEligibility(baseInput({ ageAtYearEnd: 20 }));
    expect(result.status).toBe('not_eligible');
  });

  it('hijo estudiante de 24 años (rango correcto 18-25, Ley 2411/2024): eligible con soporte', () => {
    const result = evaluateDependentEligibility(
      baseInput({
        relationship: 'child_student',
        ageAtYearEnd: 24,
        studentStatus: 'studying',
        providedSupportTypes: ['civil_registry', 'education_certificate'],
      }),
    );
    expect(result.status).toBe('eligible');
    expect(CHILD_STUDENT_MAX_AGE).toBe(25);
  });

  it('hijo estudiante de 26 años: not_eligible (fuera del rango ampliado)', () => {
    const result = evaluateDependentEligibility(
      baseInput({ relationship: 'child_student', ageAtYearEnd: 26, studentStatus: 'studying' }),
    );
    expect(result.status).toBe('not_eligible');
  });

  it('hijo estudiante sin confirmar si estudia: pending_review', () => {
    const result = evaluateDependentEligibility(
      baseInput({ relationship: 'child_student', ageAtYearEnd: 20, studentStatus: 'unknown' }),
    );
    expect(result.status).toBe('pending_review');
  });

  it('hijo con condición física/psicológica certificada: eligible con soportes', () => {
    const result = evaluateDependentEligibility(
      baseInput({
        relationship: 'child_disabled',
        ageAtYearEnd: 30,
        disabilityOrDependencyCondition: true,
        providedSupportTypes: ['civil_registry', 'medical_certificate'],
      }),
    );
    expect(result.status).toBe('eligible');
  });

  it('hijo con condición sin certificar aún: pending_review', () => {
    const result = evaluateDependentEligibility(
      baseInput({
        relationship: 'child_disabled',
        ageAtYearEnd: 30,
        disabilityOrDependencyCondition: null,
      }),
    );
    expect(result.status).toBe('pending_review');
  });

  it('cónyuge con ingresos por debajo de 260 UVT: eligible con soporte de contador', () => {
    const belowThreshold = Math.round((DEPENDENTS_INCOME_THRESHOLD_UVT - 10) * UVT_2025);
    const result = evaluateDependentEligibility(
      baseInput({
        relationship: 'spouse_or_partner',
        annualIncomeCop: belowThreshold,
        providedSupportTypes: ['civil_registry', 'accountant_certificate'],
      }),
    );
    expect(result.status).toBe('eligible');
  });

  it('cónyuge con ingresos por encima de 260 UVT: not_eligible', () => {
    const aboveThreshold = Math.round((DEPENDENTS_INCOME_THRESHOLD_UVT + 10) * UVT_2025);
    const result = evaluateDependentEligibility(
      baseInput({ relationship: 'spouse_or_partner', annualIncomeCop: aboveThreshold }),
    );
    expect(result.status).toBe('not_eligible');
  });

  it('padre sin ingresos ni condición declarada: pending_review (información insuficiente, no false)', () => {
    const result = evaluateDependentEligibility(
      baseInput({ relationship: 'parent', annualIncomeCop: null, disabilityOrDependencyCondition: null }),
    );
    expect(result.status).toBe('pending_review');
  });

  it('hermano con condición física/psicológica: eligible con certificado médico', () => {
    const result = evaluateDependentEligibility(
      baseInput({
        relationship: 'sibling',
        disabilityOrDependencyCondition: true,
        providedSupportTypes: ['civil_registry', 'medical_certificate'],
      }),
    );
    expect(result.status).toBe('eligible');
  });

  it('familiar de crianza: siempre requiere revisión (no está en el parágrafo 2 del art. 387)', () => {
    const result = evaluateDependentEligibility(baseInput({ relationship: 'foster_family' }));
    expect(result.status).toBe('requires_support');
  });

  it('otro sujeto a revisión: pending_review', () => {
    const result = evaluateDependentEligibility(baseInput({ relationship: 'other_review' }));
    expect(result.status).toBe('pending_review');
  });

  it('sin meses declarados: pending_review', () => {
    const result = evaluateDependentEligibility(baseInput({ monthsClaimed: 0 }));
    expect(result.status).toBe('pending_review');
  });

  it('rechaza años no modelados', () => {
    expect(() => evaluateDependentEligibility(baseInput({ taxYear: 2024 }))).toThrow(/no modela/i);
  });
});
