import { describe, expect, it } from 'vitest';
import {
  OCCASIONAL_GAIN_RATES_2025,
  computeOccasionalGainsTax,
  getOccasionalGainRate,
} from '../src/colombia/individual-income-tax/2025/occasional-gains';

describe('impuesto de ganancias ocasionales AG 2025', () => {
  it('declara dos tarifas: general 15 % y loterías 20 %', () => {
    expect(OCCASIONAL_GAIN_RATES_2025).toHaveLength(2);
    expect(getOccasionalGainRate('general').rate).toBe(0.15);
    expect(getOccasionalGainRate('lottery').rate).toBe(0.2);
    expect(getOccasionalGainRate('general').officialSourceId).toBe('et-art-314');
    expect(getOccasionalGainRate('lottery').officialSourceId).toBe('et-art-317');
  });

  it('devuelve total cero cuando no hay base', () => {
    const result = computeOccasionalGainsTax({
      taxYear: 2025,
      generalBaseCop: 0,
      lotteryBaseCop: 0,
    });
    expect(result.totalBaseCop).toBe(0);
    expect(result.totalTaxCop).toBe(0);
    expect(result.components).toEqual([]);
    expect(result.ruleSourceIds).toEqual([]);
    expect(result.formula).toBe('0 (sin base gravable)');
  });

  it('aplica 15 % sobre base general', () => {
    // Base 100.000.000 × 15 % = 15.000.000.
    const result = computeOccasionalGainsTax({
      taxYear: 2025,
      generalBaseCop: 100_000_000,
      lotteryBaseCop: 0,
    });
    expect(result.components).toHaveLength(1);
    expect(result.components[0]!.kind).toBe('general');
    expect(result.components[0]!.baseCop).toBe(100_000_000);
    expect(result.components[0]!.rate).toBe(0.15);
    expect(result.components[0]!.taxCop).toBe(15_000_000);
    expect(result.totalTaxCop).toBe(15_000_000);
    expect(result.ruleSourceIds).toEqual(['et-art-314']);
  });

  it('aplica 20 % sobre base de loterías', () => {
    // Base 50.000.000 × 20 % = 10.000.000.
    const result = computeOccasionalGainsTax({
      taxYear: 2025,
      generalBaseCop: 0,
      lotteryBaseCop: 50_000_000,
    });
    expect(result.components).toHaveLength(1);
    expect(result.components[0]!.kind).toBe('lottery');
    expect(result.components[0]!.taxCop).toBe(10_000_000);
    expect(result.totalTaxCop).toBe(10_000_000);
    expect(result.ruleSourceIds).toEqual(['et-art-317']);
  });

  it('suma los dos componentes cuando ambos existen', () => {
    // 40M × 15 % = 6M ; 20M × 20 % = 4M ; total = 10M.
    const result = computeOccasionalGainsTax({
      taxYear: 2025,
      generalBaseCop: 40_000_000,
      lotteryBaseCop: 20_000_000,
    });
    expect(result.components).toHaveLength(2);
    expect(result.totalBaseCop).toBe(60_000_000);
    expect(result.totalTaxCop).toBe(10_000_000);
    expect(result.ruleSourceIds).toEqual(['et-art-314', 'et-art-317']);
    expect(result.formula).toContain('15 %');
    expect(result.formula).toContain('20 %');
  });

  it('trata bases negativas como cero (no genera crédito ficticio)', () => {
    const result = computeOccasionalGainsTax({
      taxYear: 2025,
      generalBaseCop: -25_000_000,
      lotteryBaseCop: -5_000_000,
    });
    expect(result.totalBaseCop).toBe(0);
    expect(result.totalTaxCop).toBe(0);
    expect(result.components).toEqual([]);
  });

  it('redondea cada componente al peso más cercano', () => {
    // 3.333.333 × 15 % = 499.999,95 → 500.000 tras redondeo.
    const result = computeOccasionalGainsTax({
      taxYear: 2025,
      generalBaseCop: 3_333_333,
      lotteryBaseCop: 0,
    });
    expect(result.components[0]!.taxCop).toBe(500_000);
  });

  it('rechaza años no modelados', () => {
    expect(() =>
      computeOccasionalGainsTax({ taxYear: 2024, generalBaseCop: 1_000_000, lotteryBaseCop: 0 }),
    ).toThrow(/no modela/i);
  });
});
