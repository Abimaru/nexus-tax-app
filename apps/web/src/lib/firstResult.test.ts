import { describe, expect, it } from 'vitest';
import { assessFilingObligation } from '@nexus-tax/aegis-rules';
import type { ExogenousThreshold } from '@nexus-tax/domain';
import { buildFirstResult, describeDeadline } from './firstResult';

function threshold(number: number, label: string, value: number): ExogenousThreshold {
  return {
    number,
    label,
    normalizedLabel: label.toLowerCase(),
    value,
    source: { sheet: 'Hoja', row: number + 5, detailColumn: 1, valueColumn: 2 },
  };
}

const ALL_LOW = [
  threshold(1, 'Ingresos brutos', 1_000_000),
  threshold(2, 'Patrimonio bruto', 1_000_000),
  threshold(3, 'Consumos con tarjeta de crédito', 1_000_000),
  threshold(4, 'Consignaciones, depósitos e inversiones', 1_000_000),
  threshold(5, 'Compras y consumos', 1_000_000),
];

function assess(thresholds: ExogenousThreshold[], vat: boolean | null) {
  return assessFilingObligation({
    thresholds,
    isVatResponsibleAtYearEnd: vat,
    document: '1234567890',
    documentType: 'CC',
    evaluatedAt: '2026-01-01T00:00:00.000Z',
  });
}

describe('buildFirstResult', () => {
  it('indica que probablemente debe declarar si se supera un límite', () => {
    const high = ALL_LOW.map((item) => (item.number === 1 ? { ...item, value: 80_000_000 } : item));
    const view = buildFirstResult(assess(high, null));
    expect(view.headline.tone).toBe('amber');
    expect(view.headline.title).toContain('probablemente debes declarar');
    expect(view.exceededCount).toBe(1);
    expect(view.needsVatAnswer).toBe(false);
  });

  it('pide la respuesta de IVA cuando nada se supera y falta ese dato', () => {
    const view = buildFirstResult(assess(ALL_LOW, null));
    expect(view.headline.tone).toBe('cyan');
    expect(view.needsVatAnswer).toBe(true);
  });

  it('concluye "probablemente no" solo con todos los datos confirmados', () => {
    const view = buildFirstResult(assess(ALL_LOW, false));
    expect(view.headline.tone).toBe('emerald');
    expect(view.needsVatAnswer).toBe(false);
  });

  it('nunca afirma una obligación legal', () => {
    const high = ALL_LOW.map((item) => ({ ...item, value: 900_000_000 }));
    const text = JSON.stringify(buildFirstResult(assess(high, null)).headline).toLowerCase();
    expect(text).toContain('probablemente');
    expect(text).toContain('no un concepto legal');
  });

  it('acota la proporción de la barra entre 0 y 1', () => {
    const high = ALL_LOW.map((item) => ({ ...item, value: 900_000_000 }));
    for (const item of buildFirstResult(assess(high, null)).criteria) {
      if (item.ratio !== null) expect(item.ratio).toBeLessThanOrEqual(1);
    }
  });
});

describe('describeDeadline', () => {
  it('distingue una fecha vencida de una futura', () => {
    const past = describeDeadline('2026-09-03', '2026-10-12');
    expect(past.expired).toBe(true);
    expect(past.lead).toContain('venció');
    expect(past.note).toContain('extemporaneidad');
    const future = describeDeadline('2026-10-22', '2026-10-12');
    expect(future.expired).toBe(false);
    expect(future.note).toBeNull();
  });
});
