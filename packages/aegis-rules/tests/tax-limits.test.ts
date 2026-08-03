import { describe, expect, it } from 'vitest';
import {
  TAX_LIMIT_RULES_2025,
  UVT_2025,
  applyLimitRule,
  getLimitRule,
} from '../src';

/**
 * Reglas de límite conjunto de rentas exentas y deducciones (art. 336 ET).
 * Verificación con valores manuales que ejercitan cada candidato limitante.
 * UVT AG 2025 = 49.799. 1.340 UVT = 66.730.660 pesos.
 */
describe('límite conjunto rentas exentas y deducciones (art. 336 ET)', () => {
  const rule = getLimitRule('et-336-employment-cedular-cap');

  it('modela las tres sub-cédulas con el mismo patrón', () => {
    expect(TAX_LIMIT_RULES_2025).toHaveLength(3);
    for (const entry of TAX_LIMIT_RULES_2025) {
      expect(entry.percentageOfBase).toBe(0.4);
      expect(entry.uvtCap).toBe(1_340);
      expect(entry.legalSourceIds).toEqual(['et-art-336']);
    }
    expect(TAX_LIMIT_RULES_2025.map((entry) => entry.targetBoxNumber)).toEqual([41, 65, 82]);
  });

  it('cuando el porcentaje es el limitante (base modesta, componente amplio)', () => {
    // Base 60M → 40% = 24M. Componente 30M. Cap 66,7M. Mínimo: 24M por porcentaje.
    const result = applyLimitRule(rule, { 34: 60_000_000, 37: 20_000_000, 40: 10_000_000 });
    expect(result.appliedValueCop).toBe(24_000_000);
    expect(result.bindingCandidate).toBe('percentage');
    expect(result.percentageCandidateCop).toBe(24_000_000);
  });

  it('cuando el componente detectado es el limitante (usaste menos del máximo)', () => {
    // Base 100M → 40% = 40M. Componente 8M. Mínimo: 8M por componente.
    const result = applyLimitRule(rule, { 34: 100_000_000, 37: 5_000_000, 40: 3_000_000 });
    expect(result.appliedValueCop).toBe(8_000_000);
    expect(result.bindingCandidate).toBe('component');
    expect(result.componentValueCop).toBe(8_000_000);
  });

  it('cuando el tope de 1.340 UVT es el limitante (base muy grande)', () => {
    // Base 500M → 40% = 200M. Componente 300M. Cap 66,7M gana.
    const uvtCapCop = 1_340 * UVT_2025;
    const result = applyLimitRule(rule, {
      34: 500_000_000,
      37: 200_000_000,
      40: 100_000_000,
    });
    expect(result.appliedValueCop).toBe(uvtCapCop);
    expect(result.bindingCandidate).toBe('uvt_cap');
    expect(result.uvtCapValueCop).toBe(uvtCapCop);
  });

  it('base cero produce cero aplicado (porcentaje limitante)', () => {
    const result = applyLimitRule(rule, { 34: 0, 37: 20_000_000, 40: 0 });
    expect(result.appliedValueCop).toBe(0);
    expect(result.bindingCandidate).toBe('percentage');
  });

  it('base negativa se satura a cero y no genera beneficio', () => {
    const result = applyLimitRule(rule, { 34: -5_000_000, 37: 10_000_000, 40: 0 });
    expect(result.baseValueCop).toBe(0);
    expect(result.appliedValueCop).toBe(0);
    expect(result.bindingCandidate).toBe('percentage');
  });

  it('la fórmula documenta las tres candidatas', () => {
    const result = applyLimitRule(rule, { 34: 60_000_000, 37: 10_000_000, 40: 5_000_000 });
    expect(result.formula).toBe('min(40% × casilla 34, 1340 UVT, casilla 37 + casilla 40)');
  });

  it('las reglas de capital y no laboral usan las mismas casillas del F-210', () => {
    const capital = getLimitRule('et-336-capital-cedular-cap');
    expect(capital.baseBoxNumber).toBe(61);
    expect(capital.targetBoxNumber).toBe(65);
    expect(capital.componentBoxNumbers).toEqual([63, 64]);
    const nonLabor = getLimitRule('et-336-non-labor-cedular-cap');
    expect(nonLabor.baseBoxNumber).toBe(78);
    expect(nonLabor.targetBoxNumber).toBe(82);
    expect(nonLabor.componentBoxNumbers).toEqual([80, 81]);
  });
});
