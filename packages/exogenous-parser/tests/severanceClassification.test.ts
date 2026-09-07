import { describe, expect, it } from 'vitest';
import { classifyTaxRecord } from '../src/classification';

/**
 * Sprint 2.4, Fase F.3 — Unified Reconciliation & Coverage Hardening (§8).
 *
 * Verifica que un aporte/consignación patronal a cesantías se clasifique
 * como `severance` (compatible con el adaptador documental
 * `co.severance.generic`), NO como `bank_movement` genérico — la
 * incompatibilidad estructural real encontrada en el benchmark (Fase F.1).
 */
describe('classifyTaxRecord — cesantías (Fase F.3, §8)', () => {
  const baseInput = {
    conceptCode: null,
    suggestedUse: null,
    entityCategory: 'financial' as const,
  };

  it('consignación patronal a cesantías → category="severance", no "bank_movement"', () => {
    const result = classifyTaxRecord({
      ...baseInput,
      detail: 'Consignación patronal cesantías',
    });
    expect(result.category).toBe('severance');
  });

  it('aporte a cesantías → category="severance"', () => {
    const result = classifyTaxRecord({
      ...baseInput,
      detail: 'Aporte cesantías',
    });
    expect(result.category).toBe('severance');
  });

  it('saldo de cesantías (sin consignación) sigue siendo "severance" (comportamiento previo, no regresión)', () => {
    const result = classifyTaxRecord({
      ...baseInput,
      detail: 'Saldo del fondo de cesantías',
    });
    expect(result.category).toBe('severance');
  });

  it('rendimientos de cesantías siguen siendo "financial_income" (comportamiento previo, no regresión)', () => {
    const result = classifyTaxRecord({
      ...baseInput,
      detail: 'Intereses del fondo de cesantías',
    });
    expect(result.category).toBe('financial_income');
  });

  it('una consignación bancaria genérica (sin cesantías) sigue siendo "bank_movement" (no regresión)', () => {
    const result = classifyTaxRecord({
      ...baseInput,
      detail: 'Consignación en cuenta de ahorros',
    });
    expect(result.category).toBe('bank_movement');
  });
});
