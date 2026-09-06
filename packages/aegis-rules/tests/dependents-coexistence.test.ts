import { describe, expect, it } from 'vitest';
import {
  DEPENDENTS_COEXISTENCE_SOURCE_ID,
  resolveDependentBenefitCoexistence,
  type DependentCoexistenceInput,
} from '../src/colombia/individual-income-tax/2025/dependents-coexistence';

function dependent(
  id: string,
  overrides: Partial<DependentCoexistenceInput> = {},
): DependentCoexistenceInput {
  return { id, baseEligible: true, preferredBenefit: null, ...overrides };
}

describe('coexistencia de beneficios de dependientes (art. 387 y art. 336) — AG 2025', () => {
  it('expone el id de fuente normativa', () => {
    expect(DEPENDENTS_COEXISTENCE_SOURCE_ID).toBeTruthy();
  });

  it('dependiente no base-elegible queda sin candidatos', () => {
    const [result] = resolveDependentBenefitCoexistence('labor_relation', [
      dependent('d1', { baseEligible: false }),
    ]);
    expect(result!.candidateBenefits).toEqual([]);
    expect(result!.requiresChoice).toBe(false);
  });

  it('relación laboral: ambos beneficios coexisten para el mismo dependiente', () => {
    const [result] = resolveDependentBenefitCoexistence('labor_relation', [dependent('d1')]);
    expect(result!.candidateBenefits).toEqual(['article_387', 'article_336']);
    expect(result!.requiresChoice).toBe(false);
  });

  it('independiente sin elección: requiere elegir, no cuenta para ningún motor', () => {
    const [result] = resolveDependentBenefitCoexistence('independent', [dependent('d1')]);
    expect(result!.candidateBenefits).toEqual([]);
    expect(result!.requiresChoice).toBe(true);
  });

  it('independiente con elección explícita art. 387: solo ese beneficio', () => {
    const [result] = resolveDependentBenefitCoexistence('independent', [
      dependent('d1', { preferredBenefit: 'article_387' }),
    ]);
    expect(result!.candidateBenefits).toEqual(['article_387']);
    expect(result!.requiresChoice).toBe(false);
  });

  it('independiente con elección explícita art. 336: solo ese beneficio (incompatibilidad respetada)', () => {
    const [result] = resolveDependentBenefitCoexistence('independent', [
      dependent('d1', { preferredBenefit: 'article_336' }),
    ]);
    expect(result!.candidateBenefits).toEqual(['article_336']);
  });

  it('naturaleza de renta desconocida: información insuficiente, requiere revisión (no se resuelve como falso)', () => {
    const [result] = resolveDependentBenefitCoexistence('unknown', [dependent('d1')]);
    expect(result!.candidateBenefits).toEqual([]);
    expect(result!.requiresChoice).toBe(true);
    expect(result!.reason).toMatch(/naturaleza de la renta/i);
  });

  it('procesa múltiples dependientes de forma independiente', () => {
    const results = resolveDependentBenefitCoexistence('independent', [
      dependent('d1', { preferredBenefit: 'article_387' }),
      dependent('d2', { preferredBenefit: 'article_336' }),
      dependent('d3'),
    ]);
    expect(results[0]!.candidateBenefits).toEqual(['article_387']);
    expect(results[1]!.candidateBenefits).toEqual(['article_336']);
    expect(results[2]!.requiresChoice).toBe(true);
  });
});
