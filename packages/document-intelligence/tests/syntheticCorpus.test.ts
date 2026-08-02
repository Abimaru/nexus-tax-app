import { describe, expect, it } from 'vitest';
import { computeDocumentProfileSignals, diagnosePdfDocument } from '../src';
import { diagnosisPage, documentFromPages } from './fixtures';

describe('corpus documental sintético de cierre 2.2', () => {
  it.each([
    {
      name: 'escaneado',
      expected: 'scanned',
      pages: [diagnosisPage({ pageNumber: 1 }), diagnosisPage({ pageNumber: 2 })],
    },
    {
      name: 'híbrido',
      expected: 'hybrid',
      pages: [
        diagnosisPage({ pageNumber: 1, normalizedText: 'a'.repeat(180), readConfidence: 'high' }),
        diagnosisPage({ pageNumber: 2 }),
      ],
    },
    {
      name: 'rotado horizontal',
      expected: 'textual',
      pages: [
        diagnosisPage({
          pageNumber: 1,
          normalizedText: 'certificado sintetico '.repeat(12),
          readConfidence: 'high',
          width: 1000,
          height: 600,
        }),
      ],
    },
    {
      name: 'dos columnas',
      expected: 'textual',
      pages: [
        diagnosisPage({
          pageNumber: 1,
          normalizedText: `${'columna izquierda '.repeat(8)} ${'columna derecha '.repeat(8)}`,
          readConfidence: 'high',
          blocks: [
            { text: 'columna izquierda', x: 40, y: 700, width: 220, height: 20 },
            { text: 'columna derecha', x: 330, y: 700, width: 220, height: 20 },
          ],
        }),
      ],
    },
  ])('clasifica la variante $name sin datos reales', ({ expected, pages }) => {
    expect(diagnosePdfDocument(documentFromPages(pages)).type).toBe(expected);
  });

  it('conserva señales estructurales del fixture de dos columnas para perfiles', () => {
    const document = documentFromPages([
      diagnosisPage({
        pageNumber: 1,
        normalizedText: 'CERTIFICADO DE SALDOS\nPRODUCTO VALOR\nCuenta sintética 100',
        readConfidence: 'high',
        blocks: [
          { text: 'PRODUCTO', x: 40, y: 700, width: 220, height: 20 },
          { text: 'VALOR', x: 330, y: 700, width: 220, height: 20 },
        ],
      }),
    ]);
    const signals = computeDocumentProfileSignals(document);
    expect(signals.pageCount).toBe(1);
    expect(signals.headerKeywords.join(' ')).toContain('certificado');
  });
});
