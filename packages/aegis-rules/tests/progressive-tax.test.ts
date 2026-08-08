import { describe, expect, it } from 'vitest';
import {
  PROGRESSIVE_TAX_BRACKETS_2025,
  PROGRESSIVE_TAX_TABLE_2025,
  UVT_2025,
  computeProgressiveIncomeTax,
  findBracket,
} from '../src';

/**
 * Casos manuales verificados contra el artículo 241 del Estatuto Tributario.
 * La aritmética de cada caso se documenta en el comentario para que sea
 * reproducible sin ejecutar el código.
 */
describe('tarifa progresiva de renta (art. 241 ET, AG 2025)', () => {
  it('la tabla cubre 7 rangos contiguos y el último es abierto', () => {
    expect(PROGRESSIVE_TAX_BRACKETS_2025).toHaveLength(7);
    // Cada `toUvt` debe coincidir con el `fromUvt` del siguiente rango.
    for (let i = 0; i < PROGRESSIVE_TAX_BRACKETS_2025.length - 1; i += 1) {
      const current = PROGRESSIVE_TAX_BRACKETS_2025[i]!;
      const next = PROGRESSIVE_TAX_BRACKETS_2025[i + 1]!;
      expect(current.toUvt).toBe(next.fromUvt);
    }
    // El último rango no tiene techo.
    expect(PROGRESSIVE_TAX_BRACKETS_2025[6]?.toUvt).toBeUndefined();
  });

  it('impuesto = 0 cuando la base es 0 o cae en el rango exento (0–1.090 UVT)', () => {
    // Base 0.
    const zero = computeProgressiveIncomeTax(0);
    expect(zero.totalTaxUvt).toBe(0);
    expect(zero.totalTaxCopRounded).toBe(0);
    // Base 500 UVT (dentro del rango exento).
    const inExemptRange = computeProgressiveIncomeTax(500 * UVT_2025);
    expect(inExemptRange.bracket.fromUvt).toBe(0);
    expect(inExemptRange.totalTaxUvt).toBe(0);
    expect(inExemptRange.totalTaxCopRounded).toBe(0);
  });

  it('rango 19% (1.090–1.700): base = 1.500 UVT → impuesto = 77,9 UVT', () => {
    // (1500 - 1090) × 0,19 + 0 = 77,9 UVT.
    const result = computeProgressiveIncomeTax(1_500 * UVT_2025);
    expect(result.bracket.fromUvt).toBe(1_090);
    expect(result.bracket.marginalRate).toBe(0.19);
    expect(result.excessUvt).toBeCloseTo(410, 6);
    expect(result.totalTaxUvt).toBeCloseTo(77.9, 6);
    expect(result.totalTaxCopRounded).toBe(Math.round(77.9 * UVT_2025));
  });

  it('rango 28% (1.700–4.100): base = 2.000 UVT → impuesto = 200 UVT', () => {
    // (2000 - 1700) × 0,28 + 116 = 84 + 116 = 200 UVT.
    const result = computeProgressiveIncomeTax(2_000 * UVT_2025);
    expect(result.bracket.fromUvt).toBe(1_700);
    expect(result.totalTaxUvt).toBeCloseTo(200, 6);
    expect(result.totalTaxCopRounded).toBe(200 * UVT_2025);
  });

  it('rango 35% (8.670–18.970): base = 10.000 UVT → impuesto = 2.761,5 UVT', () => {
    // (10000 - 8670) × 0,35 + 2296 = 465,5 + 2296 = 2761,5 UVT.
    const result = computeProgressiveIncomeTax(10_000 * UVT_2025);
    expect(result.bracket.fromUvt).toBe(8_670);
    expect(result.totalTaxUvt).toBeCloseTo(2_761.5, 6);
    expect(result.totalTaxCopRounded).toBe(Math.round(2_761.5 * UVT_2025));
  });

  it('rango 39% (>31.000): base = 40.000 UVT → impuesto = 13.862 UVT', () => {
    // (40000 - 31000) × 0,39 + 10352 = 3510 + 10352 = 13862 UVT.
    const result = computeProgressiveIncomeTax(40_000 * UVT_2025);
    expect(result.bracket.fromUvt).toBe(31_000);
    expect(result.bracket.toUvt).toBeUndefined();
    expect(result.totalTaxUvt).toBeCloseTo(13_862, 6);
    expect(result.totalTaxCopRounded).toBe(13_862 * UVT_2025);
  });

  it('rechaza años gravables no modelados', () => {
    expect(() => computeProgressiveIncomeTax(100_000_000, 2024)).toThrow(/año 2024/);
  });

  it('la fórmula descrita refleja la aritmética aplicada', () => {
    const r = computeProgressiveIncomeTax(1_500 * UVT_2025);
    expect(r.formula).toBe('(base − 1090 UVT) × 19% + 0 UVT');
    const exempt = computeProgressiveIncomeTax(500 * UVT_2025);
    expect(exempt.formula).toBe('0 (rango exento)');
  });

  it('findBracket localiza el rango correcto en los bordes', () => {
    expect(findBracket(0)).toBe(PROGRESSIVE_TAX_TABLE_2025.brackets[0]);
    expect(findBracket(1_090)).toBe(PROGRESSIVE_TAX_TABLE_2025.brackets[1]);
    expect(findBracket(31_000)).toBe(PROGRESSIVE_TAX_TABLE_2025.brackets[6]);
    expect(findBracket(-5)).toBe(PROGRESSIVE_TAX_TABLE_2025.brackets[0]);
  });
});
