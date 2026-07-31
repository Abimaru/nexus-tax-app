import { describe, expect, it } from 'vitest';
import type { ExogenousThreshold } from '@nexus-tax/domain';
import {
  FILING_CRITERIA_2025,
  FILING_RULE_SOURCES_2025,
  INDIVIDUAL_INCOME_TAX_2025_RULE_VERSION,
  UVT_2025,
  assessFilingObligation,
  calculateFilingDeadline,
  mapExogenousThreshold,
} from '../src';

function threshold(
  number: number,
  label: string,
  value: number,
  row = number + 14,
): ExogenousThreshold {
  return {
    number,
    label,
    normalizedLabel: label.toLowerCase(),
    value,
    source: {
      sheet: 'Reporte sintético',
      row,
      detailColumn: 5,
      valueColumn: 6,
    },
  };
}

const allBelow = [
  threshold(1, 'Tope 1 - Ingresos', 60_000_000),
  threshold(2, 'Tope 2 - Patrimonio', 200_000_000),
  threshold(3, 'Tope 3 - Consumo TC', 60_000_000),
  threshold(4, 'Tope 4 - Movimiento', 60_000_000),
  threshold(5, 'Tope 5 - Compras', 60_000_000),
];

function assess(thresholds: ExogenousThreshold[], isVatResponsibleAtYearEnd: boolean | null) {
  return assessFilingObligation({
    thresholds,
    isVatResponsibleAtYearEnd,
    document: '1.234.567.890',
    evaluatedAt: '2026-07-31T12:00:00.000Z',
  });
}

describe('reglas de obligación de declarar AG 2025', () => {
  it('conserva UVT, operadores y montos exactos y oficiales', () => {
    expect(UVT_2025).toBe(49_799);
    expect(INDIVIDUAL_INCOME_TAX_2025_RULE_VERSION).toBe('co-renta-pn-2025.1.0.0');
    expect(FILING_CRITERIA_2025).toMatchObject([
      {
        id: 'gross_income',
        operator: 'gte',
        exactAmount: 69_718_600,
        officialRoundedAmount: 69_719_000,
      },
      {
        id: 'gross_assets',
        operator: 'gt',
        exactAmount: 224_095_500,
        officialRoundedAmount: 224_096_000,
      },
      { id: 'credit_card_consumption', operator: 'gt' },
      { id: 'deposits_and_investments', operator: 'gt' },
      { id: 'purchases_and_consumption', operator: 'gt' },
      { id: 'vat_responsible_at_year_end', operator: 'eq' },
    ]);
  });

  it.each([
    ['TÓPE 1   INGRESOS BRUTOS', 'gross_income'],
    ['tope 2 patrimonio bruto', 'gross_assets'],
    ['Tope 3 Consumo T.C.', 'credit_card_consumption'],
    ['TOPE 4 Movimientos bancarios', 'deposits_and_investments'],
    ['Consignaciones, depósitos e inversiones', 'deposits_and_investments'],
    ['Tope 5 - Compras y consumos', 'purchases_and_consumption'],
  ] as const)('tolera variantes en “%s”', (label, expected) => {
    expect(mapExogenousThreshold(threshold(0, label, 1))?.criterionId).toBe(expected);
  });

  it('prioriza el significado de la etiqueta sobre un número inconsistente', () => {
    expect(mapExogenousThreshold(threshold(1, 'Patrimonio bruto', 1))?.criterionId).toBe(
      'gross_assets',
    );
  });

  it('respeta >= para ingresos y > para patrimonio', () => {
    const result = assess(
      [
        ...allBelow.filter((item) => ![1, 2].includes(item.number ?? 0)),
        threshold(1, 'Ingresos', 69_719_000),
        threshold(2, 'Patrimonio', 224_096_000),
      ],
      false,
    );
    expect(result.reasons.find((item) => item.criterionId === 'gross_income')?.result).toBe('met');
    expect(result.reasons.find((item) => item.criterionId === 'gross_assets')?.result).toBe(
      'not_met',
    );
  });

  it('activa patrimonio únicamente al superar el valor oficial redondeado', () => {
    const result = assess(
      [...allBelow.filter((item) => item.number !== 2), threshold(2, 'Patrimonio', 224_096_001)],
      false,
    );
    expect(result.status).toBe('required');
  });

  it('la responsabilidad de IVA por sí sola activa la evaluación', () => {
    const result = assess(allBelow, true);
    expect(result.status).toBe('required');
    expect(result.reasons.at(-1)?.result).toBe('met');
  });

  it('un tope faltante queda no evaluable y produce información pendiente', () => {
    const result = assess(allBelow.slice(0, 4), false);
    const purchases = result.reasons.find(
      (item) => item.criterionId === 'purchases_and_consumption',
    );
    expect(purchases?.result).toBe('not_evaluable');
    expect(purchases?.observedValue).toBeNull();
    expect(result.status).toBe('pending_information');
    expect(result.missingInputs).toContain('Compras y consumos');
  });

  it('solo concluye no requerido cuando todos los criterios están evaluados', () => {
    expect(assess(allBelow, false).status).toBe('not_required');
    expect(assess(allBelow, null).status).toBe('pending_information');
  });

  it('conserva fila y etiqueta original como evidencia', () => {
    const result = assess(allBelow, false);
    expect(result.reasons[0]?.evidence).toMatchObject({
      originalLabel: 'Tope 1 - Ingresos',
      source: { sheet: 'Reporte sintético', row: 15 },
    });
  });

  it('incluye fuentes DIAN y fecha de verificación', () => {
    expect(FILING_RULE_SOURCES_2025).toHaveLength(3);
    expect(FILING_RULE_SOURCES_2025.every((source) => source.authority === 'DIAN')).toBe(true);
    expect(FILING_RULE_SOURCES_2025.every((source) => source.verifiedAt === '2026-07-31')).toBe(
      true,
    );
  });
});

describe('calendario tributario 2026', () => {
  it.each([
    ['01', '2026-08-12'],
    ['26', '2026-08-31'],
    ['27', '2026-09-01'],
    ['66', '2026-09-28'],
    ['67', '2026-10-01'],
    ['98', '2026-10-23'],
    ['99', '2026-10-26'],
    ['00', '2026-10-26'],
  ])('asigna %s a %s', (digits, dueDate) => {
    expect(calculateFilingDeadline(`1234${digits}`).dueDate).toBe(dueDate);
  });

  it('cubre determinísticamente las 100 terminaciones', () => {
    for (let value = 0; value <= 99; value += 1) {
      const digits = value.toString().padStart(2, '0');
      const deadline = calculateFilingDeadline(digits);
      expect(deadline.status).toBe('available');
      expect(deadline.lastTwoDigits).toBe(digits);
      expect(deadline.dueDate).toMatch(/^2026-(08|09|10)-\d{2}$/);
    }
  });

  it('marca documento ausente sin inventar fecha', () => {
    expect(calculateFilingDeadline(null)).toMatchObject({
      status: 'missing_document',
      lastTwoDigits: null,
      dueDate: null,
    });
  });

  it('excluye un dígito de verificación de NIT separado por guion', () => {
    expect(calculateFilingDeadline('900.123.456-7', 'NIT')).toMatchObject({
      lastTwoDigits: '56',
      dueDate: '2026-09-21',
    });
    expect(calculateFilingDeadline('900.123.456-7', 'CC').lastTwoDigits).toBe('67');
  });
});
