import { describe, expect, it } from 'vitest';
import { UVT_2025 } from '../src/colombia/individual-income-tax/2025/filing-obligation';
import {
  AFC_FVP_AVC_LIMIT_RULE_2025,
  HOUSING_INTEREST_LIMIT_RULE_2025,
  INDIVIDUAL_DEDUCTION_LIMIT_RULES_2025,
  PREPAID_MEDICINE_LIMIT_RULE_2025,
  applyIndividualDeductionLimit,
  getIndividualDeductionLimitRule,
} from '../src/colombia/individual-income-tax/2025/individual-deductions';

describe('límites individuales de deducciones/rentas exentas AG 2025', () => {
  it('declara las tres reglas y sus fuentes', () => {
    expect(INDIVIDUAL_DEDUCTION_LIMIT_RULES_2025).toHaveLength(3);
    expect(getIndividualDeductionLimitRule('afc-fvp-avc-2025').targetBoxNumber).toBe(35);
    expect(getIndividualDeductionLimitRule('housing-interest-2025').targetBoxNumber).toBe(38);
    expect(getIndividualDeductionLimitRule('prepaid-medicine-2025').targetBoxNumber).toBe(39);
    expect(AFC_FVP_AVC_LIMIT_RULE_2025.legalSourceIds).toEqual(['et-art-126-1', 'et-art-126-4']);
    expect(HOUSING_INTEREST_LIMIT_RULE_2025.legalSourceIds).toEqual(['et-art-119']);
    expect(PREPAID_MEDICINE_LIMIT_RULE_2025.legalSourceIds).toEqual(['et-art-387']);
  });

  describe('AFC / FVP / AVC', () => {
    it('aplica el declarado cuando queda por debajo del 30 % y del tope', () => {
      // Ingreso 100M → 30 % = 30M. Tope 3.800 UVT ≈ 189.2M. Declarado 5M.
      const result = applyIndividualDeductionLimit(AFC_FVP_AVC_LIMIT_RULE_2025, {
        taxYear: 2025,
        declaredCop: 5_000_000,
        baseIncomeCop: 100_000_000,
      });
      expect(result.appliedCop).toBe(5_000_000);
      expect(result.bindingCandidate).toBe('declared');
      expect(result.percentageCandidateCop).toBe(30_000_000);
    });

    it('recorta al 30 % del ingreso cuando lo excede', () => {
      // Ingreso 50M → 30 % = 15M. Declarado 20M ⇒ aplicado = 15M.
      const result = applyIndividualDeductionLimit(AFC_FVP_AVC_LIMIT_RULE_2025, {
        taxYear: 2025,
        declaredCop: 20_000_000,
        baseIncomeCop: 50_000_000,
      });
      expect(result.appliedCop).toBe(15_000_000);
      expect(result.bindingCandidate).toBe('percentage');
    });

    it('recorta al tope de 3.800 UVT cuando el 30 % y el declarado lo exceden', () => {
      // Ingreso 1.000M → 30 % = 300M. Declarado 300M. Tope 3.800 UVT ≈ 189.2M.
      const result = applyIndividualDeductionLimit(AFC_FVP_AVC_LIMIT_RULE_2025, {
        taxYear: 2025,
        declaredCop: 300_000_000,
        baseIncomeCop: 1_000_000_000,
      });
      expect(result.appliedCop).toBe(Math.round(3_800 * UVT_2025));
      expect(result.bindingCandidate).toBe('uvt_cap');
    });

    it('sin base de ingreso el porcentaje se computa como cero y limita', () => {
      // Sin base, el 30 % es 0, así que el declarado se recorta a 0.
      const result = applyIndividualDeductionLimit(AFC_FVP_AVC_LIMIT_RULE_2025, {
        taxYear: 2025,
        declaredCop: 5_000_000,
        baseIncomeCop: null,
      });
      expect(result.appliedCop).toBe(0);
      expect(result.bindingCandidate).toBe('percentage');
    });
  });

  describe('intereses de vivienda', () => {
    it('aplica el declarado cuando queda por debajo del tope de 1.200 UVT', () => {
      // Tope 1.200 UVT ≈ 59.7M. Declarado 30M ⇒ aplicado = 30M.
      const result = applyIndividualDeductionLimit(HOUSING_INTEREST_LIMIT_RULE_2025, {
        taxYear: 2025,
        declaredCop: 30_000_000,
      });
      expect(result.appliedCop).toBe(30_000_000);
      expect(result.bindingCandidate).toBe('declared');
    });

    it('recorta al tope de 1.200 UVT cuando el declarado lo excede', () => {
      const result = applyIndividualDeductionLimit(HOUSING_INTEREST_LIMIT_RULE_2025, {
        taxYear: 2025,
        declaredCop: 200_000_000,
      });
      expect(result.appliedCop).toBe(Math.round(1_200 * UVT_2025));
      expect(result.bindingCandidate).toBe('uvt_cap');
    });

    it('no exige base de ingreso ni porcentaje', () => {
      const result = applyIndividualDeductionLimit(HOUSING_INTEREST_LIMIT_RULE_2025, {
        taxYear: 2025,
        declaredCop: 10_000_000,
      });
      expect(result.percentageCandidateCop).toBeNull();
      expect(result.baseIncomeCop).toBeNull();
    });
  });

  describe('medicina prepagada', () => {
    it('respeta el tope de 192 UVT', () => {
      // Tope 192 UVT ≈ 9.56M. Declarado 15M ⇒ recorta.
      const result = applyIndividualDeductionLimit(PREPAID_MEDICINE_LIMIT_RULE_2025, {
        taxYear: 2025,
        declaredCop: 15_000_000,
      });
      expect(result.appliedCop).toBe(Math.round(192 * UVT_2025));
      expect(result.bindingCandidate).toBe('uvt_cap');
    });
  });

  it('normaliza declarados negativos a cero', () => {
    const result = applyIndividualDeductionLimit(HOUSING_INTEREST_LIMIT_RULE_2025, {
      taxYear: 2025,
      declaredCop: -5_000_000,
    });
    expect(result.appliedCop).toBe(0);
    expect(result.bindingCandidate).toBe('declared');
  });

  it('rechaza años no modelados', () => {
    expect(() =>
      applyIndividualDeductionLimit(HOUSING_INTEREST_LIMIT_RULE_2025, {
        taxYear: 2024,
        declaredCop: 1_000_000,
      }),
    ).toThrow(/no modela/i);
  });
});
