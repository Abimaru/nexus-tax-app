import { describe, expect, it } from 'vitest';
import { UVT_2025 } from '../src/colombia/individual-income-tax/2025/filing-obligation';
import {
  DEPENDENTS_ADDITIONAL_DEDUCTION_SOURCE_ID,
  DEPENDENTS_ADDITIONAL_MAX_ELIGIBLE,
  DEPENDENTS_ADDITIONAL_UVT_PER_DEPENDENT,
  computeDependentsAdditionalDeduction,
} from '../src/colombia/individual-income-tax/2025/dependents-additional-336';
import type { DependentsAdditionalDeductionCandidate } from '../src/types';

function candidate(id: string, eligible = true): DependentsAdditionalDeductionCandidate {
  return { id, eligible };
}

describe('adición por dependientes — art. 336 num. 3 ET (72 UVT) — AG 2025', () => {
  it('respeta las constantes normativas', () => {
    expect(DEPENDENTS_ADDITIONAL_DEDUCTION_SOURCE_ID).toBe('et-art-336-num-3');
    expect(DEPENDENTS_ADDITIONAL_UVT_PER_DEPENDENT).toBe(72);
    expect(DEPENDENTS_ADDITIONAL_MAX_ELIGIBLE).toBe(4);
  });

  it('0 dependientes: sin beneficio', () => {
    const result = computeDependentsAdditionalDeduction({ taxYear: 2025, dependents: [] });
    expect(result.dependentsProvidedCount).toBe(0);
    expect(result.dependentsAppliedCount).toBe(0);
    expect(result.totalUvt).toBe(0);
    expect(result.totalCop).toBe(0);
    expect(result.excludedDependents).toHaveLength(0);
  });

  it('1 dependiente elegible: 72 UVT en pesos, sin hardcodear el valor', () => {
    const result = computeDependentsAdditionalDeduction({
      taxYear: 2025,
      dependents: [candidate('d1')],
    });
    expect(result.dependentsAppliedCount).toBe(1);
    expect(result.totalUvt).toBe(72);
    expect(result.totalCop).toBe(Math.round(72 * UVT_2025));
    expect(result.formula).toContain('336');
  });

  it('2 dependientes elegibles: 144 UVT', () => {
    const result = computeDependentsAdditionalDeduction({
      taxYear: 2025,
      dependents: [candidate('d1'), candidate('d2')],
    });
    expect(result.dependentsAppliedCount).toBe(2);
    expect(result.totalUvt).toBe(144);
    expect(result.totalCop).toBe(Math.round(144 * UVT_2025));
  });

  it('4 dependientes elegibles: máximo aplicado, 288 UVT', () => {
    const result = computeDependentsAdditionalDeduction({
      taxYear: 2025,
      dependents: [candidate('d1'), candidate('d2'), candidate('d3'), candidate('d4')],
    });
    expect(result.dependentsAppliedCount).toBe(4);
    expect(result.totalUvt).toBe(288);
    expect(result.excludedDependents).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });

  it('5 dependientes elegibles: solo 4 se aplican, el quinto se excluye con motivo y advertencia', () => {
    const result = computeDependentsAdditionalDeduction({
      taxYear: 2025,
      dependents: [
        candidate('d1'),
        candidate('d2'),
        candidate('d3'),
        candidate('d4'),
        candidate('d5'),
      ],
    });
    expect(result.dependentsProvidedCount).toBe(5);
    expect(result.dependentsEligibleCount).toBe(5);
    expect(result.dependentsAppliedCount).toBe(4);
    expect(result.totalUvt).toBe(288);
    expect(result.excludedDependents).toEqual([{ id: 'd5', reason: 'exceeds_max_four' }]);
    expect(result.warnings[0]).toMatch(/primeros 4/);
  });

  it('dependiente no elegible: se excluye con motivo not_eligible y no cuenta para el máximo', () => {
    const result = computeDependentsAdditionalDeduction({
      taxYear: 2025,
      dependents: [candidate('d1'), candidate('d2', false)],
    });
    expect(result.dependentsProvidedCount).toBe(2);
    expect(result.dependentsEligibleCount).toBe(1);
    expect(result.dependentsAppliedCount).toBe(1);
    expect(result.excludedDependents).toContainEqual({ id: 'd2', reason: 'not_eligible' });
  });

  it('dependiente pendiente (no elegible) no genera beneficio pero se conserva en el reporte', () => {
    const result = computeDependentsAdditionalDeduction({
      taxYear: 2025,
      dependents: [candidate('d1', false)],
    });
    expect(result.dependentsProvidedCount).toBe(1);
    expect(result.dependentsAppliedCount).toBe(0);
    expect(result.excludedDependents).toHaveLength(1);
  });

  it('usa la UVT central: cambia si UVT_2025 cambia (no hardcodea pesos)', () => {
    const result = computeDependentsAdditionalDeduction({
      taxYear: 2025,
      dependents: [candidate('d1')],
    });
    expect(result.totalCop).toBe(Math.round(DEPENDENTS_ADDITIONAL_UVT_PER_DEPENDENT * UVT_2025));
  });

  it('redondea el total al peso más cercano', () => {
    const result = computeDependentsAdditionalDeduction({
      taxYear: 2025,
      dependents: [candidate('d1'), candidate('d2'), candidate('d3')],
    });
    expect(Number.isInteger(result.totalCop)).toBe(true);
  });

  it('rechaza años no modelados', () => {
    expect(() =>
      computeDependentsAdditionalDeduction({ taxYear: 2024, dependents: [candidate('d1')] }),
    ).toThrow(/no modela/i);
  });
});
