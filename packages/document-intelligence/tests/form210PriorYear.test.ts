import { describe, expect, it } from 'vitest';
import { extractPriorYearForm210 } from '../src/form210PriorYear';
import { documentFromPages, representation } from './fixtures';

/**
 * Oráculo anonimizado del Formulario 210 AG2024 (Sprint 2.4, adenda Fase B,
 * punto 17). Los valores se anonimizaron y provienen de una declaración real
 * usada como referencia de diseño. Se usan EXCLUSIVAMENTE para comprobar que
 * el parser extrae correctamente las casillas de un texto con esta forma —
 * nunca se convierten en reglas productivas ni alimentan el ruleset 2025.
 */
const AG2024_ORACLE_TEXT = [
  'Declaración de Renta y Complementarios — Formulario 210',
  'Año gravable 2024',
  'NIT 900123456-7',
  'Número de formulario 1102345678901',
  'Fecha de presentación el 2025-05-10',
  '29 Patrimonio bruto 148.984.000',
  '30 Deudas 152.521.000',
  '31 Patrimonio líquido 0',
  '32 Ingresos brutos de rentas de trabajo 119.012.000',
  '33 Ingresos no constitutivos de renta de trabajo 7.071.000',
  '36 Otras rentas exentas 29.551.000',
  '37 Total rentas exentas 29.551.000',
  '39 Otras deducciones imputables 14.501.000',
  '40 Total deducciones 14.501.000',
  '42 Renta líquida ordinaria de rentas de trabajo 67.889.000',
  '58 Ingresos brutos de rentas de capital 1.265.000',
  '59 Ingresos no constitutivos de renta de capital 643.000',
  '61 Renta líquida de rentas de capital 622.000',
  '89 Renta líquida gravable cédula general 76.778.000',
  '126 Impuesto de renta líquida gravable 4.840.000',
  '129 Total impuesto a cargo 4.840.000',
  '130 Anticipo de renta liquidado el año anterior 1.839.000',
  '131 Saldo a favor del año anterior sin devolución o compensación 0',
  '132 Retenciones del año gravable 3.080.000',
  '133 Anticipo de renta por el año gravable siguiente 79.000',
  '137 Saldo a favor 0',
  '138 Número de dependientes económicos 0',
  '139 Adición por dependientes 0',
].join('\n');

describe('extractPriorYearForm210 — oráculo anonimizado AG2024 (Sprint 2.4, Fase B)', () => {
  it('detecta el Formulario 210, el año gravable y la identidad enmascarada', () => {
    const { detection } = extractPriorYearForm210(representation(AG2024_ORACLE_TEXT));
    expect(detection.isForm210).toBe(true);
    expect(detection.taxYear).toBe(2024);
    expect(detection.formNumber).toBe('1102345678901');
    expect(detection.submittedAt).toBe('2025-05-10');
    expect(detection.statusGuess).toBe('submitted');
    expect(detection.taxpayerIdentityMasked).toMatch(/^•+4567$/);
    expect(detection.taxpayerIdentityMasked).not.toContain('900123456');
    expect(detection.confidence).toBe('high');
  });

  it('extrae exactamente los valores esperados del oráculo, casilla por casilla', () => {
    const { boxes } = extractPriorYearForm210(representation(AG2024_ORACLE_TEXT));
    const byBox = new Map(boxes.map((box) => [box.boxNumber, box.normalizedValueCop]));
    const expected: Record<number, number> = {
      29: 148_984_000,
      30: 152_521_000,
      31: 0,
      32: 119_012_000,
      33: 7_071_000,
      36: 29_551_000,
      37: 29_551_000,
      39: 14_501_000,
      40: 14_501_000,
      42: 67_889_000,
      58: 1_265_000,
      59: 643_000,
      61: 622_000,
      89: 76_778_000,
      126: 4_840_000,
      129: 4_840_000,
      130: 1_839_000,
      131: 0,
      132: 3_080_000,
      133: 79_000,
      137: 0,
      138: 0,
      139: 0,
    };
    for (const [boxNumber, expectedValue] of Object.entries(expected)) {
      expect(byBox.get(Number(boxNumber))).toBe(expectedValue);
    }
    // Los montos con un único separador de miles (p. ej. "643.000") se
    // reutilizan del motor monetario de Sprint 2.3.2, que los marca `medium`
    // por ambigüedad decimal/miles (política ya establecida, no un error de
    // este parser). Ninguna casilla debe caer en `insufficient` o `low`.
    expect(boxes.every((box) => box.confidence === 'high' || box.confidence === 'medium')).toBe(
      true,
    );
  });

  it('no confunde el NIT o el número de formulario con una casilla', () => {
    const { boxes } = extractPriorYearForm210(representation(AG2024_ORACLE_TEXT));
    // El NIT y el número de formulario no encajan en el patrón "número corto
    // + etiqueta + valor" y no deben aparecer como casillas 900/1102345678901.
    expect(boxes.some((box) => box.boxNumber > 141)).toBe(false);
  });

  it('marca como no-Formulario-210 un texto sin señales estructurales suficientes', () => {
    const { detection, warnings } = extractPriorYearForm210(
      representation('Un documento cualquiera sin relación con renta.'),
    );
    expect(detection.isForm210).toBe(false);
    expect(detection.confidence).toBe('insufficient');
    expect(detection.statusGuess).toBe('unknown');
    expect(
      warnings.some((warning) => warning.includes('no se encontró evidencia'.toLocaleUpperCase()) || warning.toLowerCase().includes('no se encontró evidencia')),
    ).toBe(true);
  });

  it('nunca afirma "submitted" sin fecha de presentación, aunque parezca un F-210', () => {
    const text = ['Formulario 210', 'Año gravable 2024', '29 Patrimonio bruto 100.000.000'].join(
      '\n',
    );
    const { detection } = extractPriorYearForm210(representation(text));
    expect(detection.statusGuess).not.toBe('submitted');
  });

  it('detecta una declaración de corrección y conserva el número de formulario anterior', () => {
    const text = [
      'Formulario 210',
      'Año gravable 2024',
      'Corrige formulario No. 1102345678900',
      '29 Patrimonio bruto 100.000.000',
    ].join('\n');
    const { detection } = extractPriorYearForm210(representation(text));
    expect(detection.statusGuess).toBe('amended');
    expect(detection.previousFormNumber).toBe('1102345678900');
  });

  it('advierte cuando una página tiene confianza de lectura insuficiente (candidata a OCR)', () => {
    const doc = documentFromPages([
      {
        pageNumber: 1,
        normalizedText: '',
        blocks: [],
        errors: [],
        readConfidence: 'insufficient',
      },
    ]);
    const { warnings, boxes } = extractPriorYearForm210(doc);
    expect(boxes).toHaveLength(0);
    expect(warnings.some((warning) => warning.includes('OCR de respaldo'))).toBe(true);
  });

  it('conserva la casilla de mayor confianza cuando aparece repetida en dos páginas', () => {
    const doc = documentFromPages([
      {
        pageNumber: 1,
        normalizedText: '29 Patrimonio bruto 100.00.000',
        blocks: [],
        errors: [],
        readConfidence: 'low',
      },
      {
        pageNumber: 2,
        normalizedText: '29 Patrimonio bruto 148.984.000',
        blocks: [],
        errors: [],
        readConfidence: 'high',
      },
    ]);
    const { boxes, warnings } = extractPriorYearForm210(doc);
    const box29 = boxes.find((box) => box.boxNumber === 29);
    expect(box29?.page).toBe(2);
    expect(warnings.some((warning) => warning.includes('apareció más de una vez'))).toBe(true);
  });

  it('interpreta correctamente separadores de miles y valores en cero', () => {
    const text = ['Formulario 210', 'Año gravable 2024', '31 Patrimonio líquido 0'].join('\n');
    const { boxes } = extractPriorYearForm210(representation(text));
    const box31 = boxes.find((box) => box.boxNumber === 31);
    expect(box31?.normalizedValueCop).toBe(0);
  });

  it('ignora líneas vacías sin lanzar error', () => {
    const text = ['Formulario 210', '', '   ', '29 Patrimonio bruto 100.000.000'].join('\n');
    expect(() => extractPriorYearForm210(representation(text))).not.toThrow();
  });
});
