import { describe, expect, it } from 'vitest';
import {
  MONEY_PARSER_VERSION,
  detectMonetaryAnomalies,
  parseMoneyAmount,
  roundDocumentAmountToTaxPeso,
} from '../src';

describe('parser monetario colombiano v2', () => {
  it.each([
    ['364.741,49', 364_741.49, 'es_CO'],
    ['28.522,88', 28_522.88, 'es_CO'],
    ['1.234.567,00', 1_234_567, 'es_CO'],
    ['$ 7.764.000', 7_764_000, 'es_CO'],
    ['$7.764.000,00', 7_764_000, 'es_CO'],
    ['364,741.49', 364_741.49, 'en_US'],
    ['28,522.88', 28_522.88, 'en_US'],
    ['1,234,567.00', 1_234_567, 'en_US'],
    ['364741', 364_741, 'integer'],
    ['7764000', 7_764_000, 'integer'],
  ] as const)('interpreta %s sin absorber decimales', (raw, expected, locale) => {
    const amount = parseMoneyAmount(raw);
    expect(amount.parsedValue).toBe(expected);
    expect(amount.decimalValue).toBe(expected);
    expect(amount.detectedLocale).toBe(locale);
    expect(amount.rawText).toBe(raw);
    expect(amount.originalEvidence).toBe(raw);
    expect(amount.parserVersion).toBe(MONEY_PARSER_VERSION);
  });

  it('separa el decimal documental del peso fiscal redondeado', () => {
    const down = parseMoneyAmount('$364.741,49');
    const up = parseMoneyAmount('$364.741,50');
    expect(down.roundedTaxValue).toBe(364_741);
    expect(up.roundedTaxValue).toBe(364_742);
    expect(roundDocumentAmountToTaxPeso(-10.5)).toBe(-11);
  });

  it('marca un separador único de tres dígitos como ambiguo sin cambiar la escala', () => {
    const amount = parseMoneyAmount('1.234');
    expect(amount.parsedValue).toBe(1_234);
    expect(amount.detectedLocale).toBe('ambiguous');
    expect(amount.warnings).toContain('decimal_separator_ambiguous');
    expect(detectMonetaryAnomalies(amount).map((item) => item.code)).toContain(
      'decimal_separator_ambiguous',
    );
  });

  it('detecta una diferencia de escala x100 frente a una fuente comparable', () => {
    const amount = parseMoneyAmount('28.522,88');
    const anomalies = detectMonetaryAnomalies(amount, 2_852_288);
    expect(anomalies).toContainEqual(
      expect.objectContaining({ code: 'amount_scale_suspected', possibleScaleFactor: 100 }),
    );
  });

  it('conserva documento, página, geometría, método y evidencia', () => {
    const amount = parseMoneyAmount('$ 28.522,88', {
      sourceDocumentId: 'document:1',
      page: 2,
      boundingBox: { x: 10, y: 20, width: 30, height: 8 },
      extractionMethod: 'ocr',
      originalEvidence: 'Intereses: $ 28.522,88',
    });
    expect(amount).toMatchObject({
      sourceDocumentId: 'document:1',
      page: 2,
      boundingBox: { x: 10, y: 20, width: 30, height: 8 },
      extractionMethod: 'ocr',
      originalEvidence: 'Intereses: $ 28.522,88',
    });
  });
});

