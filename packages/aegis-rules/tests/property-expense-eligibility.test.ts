import { describe, expect, it } from 'vitest';
import {
  ADMINISTRATION_FEE_SUFFICIENT_SUPPORT_TYPES,
  evaluatePropertyExpenseEligibility,
  type PropertyExpenseEligibilityInput,
} from '../src/colombia/individual-income-tax/2025/property-expense-eligibility';

/**
 * Sprint 2.4, Fase G — Inmuebles, renta inmobiliaria y administración de
 * propiedad horizontal (§27 del prompt).
 *
 * Cubre la matriz obligatoria de tests unitarios (A-J), en lo que aplica al
 * motor puro de elegibilidad (`evaluatePropertyExpenseEligibility`). Los
 * casos H (predial: asset evidence separado de expense candidate), I
 * (ingreso exógena + documento: no double count) y J (interés de vivienda
 * ya confirmado: no duplicar) se cubren a nivel de integración/repositorio,
 * no en este motor puro — ver `apps/web/src/lib/repository.test.ts` /
 * `taxCaseAnalysis.test.ts`.
 */

function baseInput(
  overrides: Partial<PropertyExpenseEligibilityInput> = {},
): PropertyExpenseEligibilityInput {
  return {
    taxYear: 2025,
    propertyUse: 'rented',
    expenseType: 'administration_fee',
    hasCompatibleRentalIncome: true,
    hasRentalPeriodDefined: true,
    supportStatus: 'sufficient',
    supportTypes: [...ADMINISTRATION_FEE_SUFFICIENT_SUPPORT_TYPES],
    allocationMethod: 'unknown',
    allocationPercentage: null,
    isExtraordinary: false,
    hasPossibleDuplicate: false,
    ...overrides,
  };
}

describe('evaluatePropertyExpenseEligibility — AG 2025 (Fase G)', () => {
  it('A. residencia personal + administración → not_applicable (nunca auto-deducción)', () => {
    const result = evaluatePropertyExpenseEligibility(
      baseInput({ propertyUse: 'personal_residence' }),
    );
    expect(result.status).toBe('not_applicable');
    expect(result.reasons.join(' ')).toMatch(/vivienda personal/i);
  });

  it('B. inmueble arrendado 12 meses + administración soportada → potentially_deductible', () => {
    const result = evaluatePropertyExpenseEligibility(baseInput());
    expect(result.status).toBe('potentially_deductible');
  });

  it('C. arrendado 6 meses (período definido, aunque parcial) → sigue evaluándose sin asumir 12 meses', () => {
    // El motor no calcula proporcionalidad de período por sí mismo (eso es
    // responsabilidad del llamador al construir `RentalActivity.monthsCovered`);
    // aquí solo verifica que, con el período definido explícitamente, el
    // gasto avanza a evaluación normal en vez de bloquear por falta de
    // contexto.
    const result = evaluatePropertyExpenseEligibility(
      baseInput({ hasRentalPeriodDefined: true }),
    );
    expect(result.status).toBe('potentially_deductible');
  });

  it('C (bis). arrendado SIN período definido → requires_context (nunca asume 12 meses)', () => {
    const result = evaluatePropertyExpenseEligibility(
      baseInput({ hasRentalPeriodDefined: false }),
    );
    expect(result.status).toBe('requires_context');
    expect(result.reasons.join(' ')).toMatch(/per[ií]odo/i);
  });

  it('D. uso mixto sin asignación → requires_allocation', () => {
    const result = evaluatePropertyExpenseEligibility(
      baseInput({ propertyUse: 'mixed', allocationMethod: 'unknown', allocationPercentage: null }),
    );
    expect(result.status).toBe('requires_allocation');
  });

  it('D (bis). uso mixto CON asignación resuelta → continúa la evaluación normal', () => {
    const result = evaluatePropertyExpenseEligibility(
      baseInput({ propertyUse: 'mixed', allocationMethod: 'percentage', allocationPercentage: 40 }),
    );
    expect(result.status).toBe('potentially_deductible');
  });

  it('E. sin soporte → requires_support', () => {
    const result = evaluatePropertyExpenseEligibility(
      baseInput({ supportStatus: 'missing', supportTypes: [] }),
    );
    expect(result.status).toBe('requires_support');
  });

  it('F. administración sin factura pero con certificado/pago → NO se marca inválida por ausencia de factura', () => {
    // El propio input nunca modela "factura" como tipo de soporte para
    // administración: basta con supportStatus='sufficient' derivado de
    // certificado/cuenta de cobro/pago para llegar a potentially_deductible.
    const result = evaluatePropertyExpenseEligibility(
      baseInput({
        expenseType: 'administration_fee',
        supportStatus: 'sufficient',
        supportTypes: ['copropiedad_certificate', 'payment_proof'],
      }),
    );
    expect(result.status).toBe('potentially_deductible');
    expect(result.reasons.join(' ')).not.toMatch(/factura/i);
  });

  it('F (bis). administración SIN soporte → el mensaje aclara que no necesariamente exige factura', () => {
    const result = evaluatePropertyExpenseEligibility(
      baseInput({ expenseType: 'administration_fee', supportStatus: 'missing', supportTypes: [] }),
    );
    expect(result.status).toBe('requires_support');
    expect(result.reasons.join(' ')).toMatch(/no necesariamente.*factura/i);
  });

  it('G. cuota extraordinaria → requires_review (nunca el mismo tratamiento que la ordinaria)', () => {
    const result = evaluatePropertyExpenseEligibility(
      baseInput({ expenseType: 'administration_fee', isExtraordinary: true }),
    );
    expect(result.status).toBe('requires_review');
  });

  it('posible duplicado → requires_review antes que cualquier otro criterio', () => {
    const result = evaluatePropertyExpenseEligibility(
      baseInput({ hasPossibleDuplicate: true, propertyUse: 'personal_residence' }),
    );
    // Incluso con residencia personal (que normalmente daría not_applicable),
    // el duplicado se revisa primero.
    expect(result.status).toBe('requires_review');
  });

  it('sin ingreso de arrendamiento conciliado → requires_context (relación de causalidad no confirmada)', () => {
    const result = evaluatePropertyExpenseEligibility(
      baseInput({ hasCompatibleRentalIncome: false }),
    );
    expect(result.status).toBe('requires_context');
  });

  it('uso vacante/otro/desconocido → requires_context', () => {
    for (const use of ['vacant', 'other', 'unknown'] as const) {
      const result = evaluatePropertyExpenseEligibility(baseInput({ propertyUse: use }));
      expect(result.status).toBe('requires_context');
    }
  });

  it('actividad económica (business_use) con contexto completo → potentially_deductible', () => {
    const result = evaluatePropertyExpenseEligibility(baseInput({ propertyUse: 'business_use' }));
    expect(result.status).toBe('potentially_deductible');
  });

  it('rechaza años distintos de 2025', () => {
    expect(() => evaluatePropertyExpenseEligibility(baseInput({ taxYear: 2024 }))).toThrow();
  });

  it('nunca produce un booleano deductible=true/false: el resultado siempre es uno de los 6 estados', () => {
    const validStatuses = [
      'potentially_deductible',
      'not_applicable',
      'requires_context',
      'requires_support',
      'requires_allocation',
      'requires_review',
    ];
    const scenarios: Partial<PropertyExpenseEligibilityInput>[] = [
      { propertyUse: 'personal_residence' },
      { propertyUse: 'rented' },
      { propertyUse: 'mixed' },
      { propertyUse: 'vacant' },
      { supportStatus: 'missing' },
      { isExtraordinary: true },
      { hasPossibleDuplicate: true },
    ];
    for (const scenario of scenarios) {
      const result = evaluatePropertyExpenseEligibility(baseInput(scenario));
      expect(validStatuses).toContain(result.status);
    }
  });
});
