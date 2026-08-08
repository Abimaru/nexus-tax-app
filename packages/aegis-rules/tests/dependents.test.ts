import { describe, expect, it } from 'vitest';
import { UVT_2025 } from '../src/colombia/individual-income-tax/2025/filing-obligation';
import {
  ANNUAL_CAP_UVT_PER_DEPENDENT,
  DEPENDENTS_DEDUCTION_SOURCE_ID,
  DEPENDENTS_MAX_ELIGIBLE,
  MONTHLY_CAP_UVT_PER_DEPENDENT,
  computeDependentsDeduction,
} from '../src/colombia/individual-income-tax/2025/dependents';
import type { DependentDeclaration } from '../src/types';

function dependent(
  id: string,
  kind: DependentDeclaration['kind'] = 'child_minor',
  monthsClaimed = 12,
): DependentDeclaration {
  return { id, kind, monthsClaimed };
}

describe('deducción por dependientes (art. 387 ET) — AG 2025', () => {
  it('respeta las constantes normativas', () => {
    expect(DEPENDENTS_DEDUCTION_SOURCE_ID).toBe('et-art-387');
    expect(DEPENDENTS_MAX_ELIGIBLE).toBe(4);
    expect(MONTHLY_CAP_UVT_PER_DEPENDENT).toBe(32);
    expect(ANNUAL_CAP_UVT_PER_DEPENDENT).toBe(384);
  });

  it('no aplica deducción sin dependientes', () => {
    const result = computeDependentsDeduction({
      taxYear: 2025,
      dependents: [],
      grossEmploymentIncomeCop: 100_000_000,
    });
    expect(result.dependentsEligibleCount).toBe(0);
    expect(result.appliedDeductionCop).toBe(0);
    expect(result.dependents).toHaveLength(0);
  });

  it('un dependiente completo: limitante es el 10 % del ingreso si es menor', () => {
    // Ingreso 60M. 10 % = 6M.
    // Tope mensual (12 meses × 32 UVT × 49.799) = 19.122.816.
    // Tope anual (1 × 384 UVT × 49.799) = 19.122.816.
    // Aplicado = min(6M, 19.1M, 19.1M) = 6M ; limitante = percentage.
    const result = computeDependentsDeduction({
      taxYear: 2025,
      dependents: [dependent('d1')],
      grossEmploymentIncomeCop: 60_000_000,
    });
    expect(result.percentageCandidateCop).toBe(6_000_000);
    expect(result.appliedDeductionCop).toBe(6_000_000);
    expect(result.bindingCandidate).toBe('percentage');
  });

  it('ingreso muy alto: el tope mensual y anual (iguales para 12 meses) limitan', () => {
    // Ingreso 500M. 10 % = 50M.
    // Tope mensual = 19.122.816 = tope anual. Aplicado = 19.122.816.
    const result = computeDependentsDeduction({
      taxYear: 2025,
      dependents: [dependent('d1')],
      grossEmploymentIncomeCop: 500_000_000,
    });
    expect(result.percentageCandidateCop).toBe(50_000_000);
    const expectedCap = Math.round(12 * MONTHLY_CAP_UVT_PER_DEPENDENT * UVT_2025);
    expect(result.monthlyCapCandidateCop).toBe(expectedCap);
    expect(result.annualCapCandidateCop).toBe(
      Math.round(ANNUAL_CAP_UVT_PER_DEPENDENT * UVT_2025),
    );
    expect(result.appliedDeductionCop).toBe(expectedCap);
    // Con 12 meses el tope mensual acumulado iguala el anual; el reduce
    // conserva el primero como limitante ⇒ monthly_cap.
    expect(result.bindingCandidate).toBe('monthly_cap');
  });

  it('dependiente parcial (6 meses): el tope mensual baja proporcionalmente', () => {
    // 6 meses × 32 UVT × 49.799 = 9.561.408. 10 % de 200M = 20M. Anual 1 × 384 UVT = 19.122.816.
    // Aplicado = min(20M, 9.5M, 19.1M) = 9.561.408 ; limitante = monthly_cap.
    const result = computeDependentsDeduction({
      taxYear: 2025,
      dependents: [dependent('d1', 'child_minor', 6)],
      grossEmploymentIncomeCop: 200_000_000,
    });
    const expectedMonthly = Math.round(6 * MONTHLY_CAP_UVT_PER_DEPENDENT * UVT_2025);
    expect(result.monthlyCapCandidateCop).toBe(expectedMonthly);
    expect(result.bindingCandidate).toBe('monthly_cap');
    expect(result.appliedDeductionCop).toBe(expectedMonthly);
  });

  it('limita a cuatro dependientes y reporta cuántos vinieron', () => {
    const dependents = [
      dependent('d1'),
      dependent('d2'),
      dependent('d3'),
      dependent('d4'),
      dependent('d5'),
      dependent('d6'),
    ];
    const result = computeDependentsDeduction({
      taxYear: 2025,
      dependents,
      grossEmploymentIncomeCop: 500_000_000,
    });
    expect(result.dependentsProvidedCount).toBe(6);
    expect(result.dependentsEligibleCount).toBe(DEPENDENTS_MAX_ELIGIBLE);
    expect(result.dependents).toHaveLength(DEPENDENTS_MAX_ELIGIBLE);
    // Cuatro dependientes completos: anual = 4 × 384 UVT.
    expect(result.annualCapCandidateCop).toBe(
      Math.round(4 * ANNUAL_CAP_UVT_PER_DEPENDENT * UVT_2025),
    );
  });

  it('clampa monthsClaimed fuera de rango', () => {
    const result = computeDependentsDeduction({
      taxYear: 2025,
      dependents: [
        dependent('d1', 'child_minor', -3),
        dependent('d2', 'child_minor', 20),
      ],
      grossEmploymentIncomeCop: 100_000_000,
    });
    expect(result.dependents[0]!.monthsClaimed).toBe(0);
    expect(result.dependents[1]!.monthsClaimed).toBe(12);
  });

  it('normaliza ingresos negativos a cero', () => {
    const result = computeDependentsDeduction({
      taxYear: 2025,
      dependents: [dependent('d1')],
      grossEmploymentIncomeCop: -100_000_000,
    });
    expect(result.grossEmploymentIncomeCop).toBe(0);
    expect(result.percentageCandidateCop).toBe(0);
    expect(result.appliedDeductionCop).toBe(0);
    expect(result.bindingCandidate).toBe('percentage');
  });

  it('rechaza años no modelados', () => {
    expect(() =>
      computeDependentsDeduction({
        taxYear: 2024,
        dependents: [dependent('d1')],
        grossEmploymentIncomeCop: 10_000_000,
      }),
    ).toThrow(/no modela/i);
  });
});
