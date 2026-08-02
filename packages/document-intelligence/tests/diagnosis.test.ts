import { describe, expect, it } from 'vitest';
import { diagnosePdfDocument, readPdfText } from '../src';
import { diagnosisPage, documentFromPages, syntheticTextPdf } from './fixtures';

describe('diagnóstico de tipo de PDF', () => {
  it('clasifica un documento totalmente textual', () => {
    const document = documentFromPages([
      diagnosisPage({ pageNumber: 1, normalizedText: 'a'.repeat(200), readConfidence: 'high' }),
      diagnosisPage({ pageNumber: 2, normalizedText: 'b'.repeat(200), readConfidence: 'high' }),
    ]);
    const diagnosis = diagnosePdfDocument(document);
    expect(diagnosis.type).toBe('textual');
    expect(diagnosis.textualPageCount).toBe(2);
    expect(diagnosis.pages[0]?.recommendedMethod).toBe('native_text');
  });

  it('clasifica como escaneado un documento dominado por páginas sin texto', () => {
    const document = documentFromPages([
      diagnosisPage({ pageNumber: 1, normalizedText: '', readConfidence: 'insufficient' }),
      diagnosisPage({ pageNumber: 2, normalizedText: '', readConfidence: 'insufficient' }),
      diagnosisPage({ pageNumber: 3, normalizedText: '', readConfidence: 'insufficient' }),
      diagnosisPage({ pageNumber: 4, normalizedText: '', readConfidence: 'insufficient' }),
      diagnosisPage({ pageNumber: 5, normalizedText: 'texto de portada', readConfidence: 'low' }),
    ]);
    const diagnosis = diagnosePdfDocument(document);
    expect(diagnosis.type).toBe('scanned');
    expect(diagnosis.scannedPageCount).toBe(4);
    expect(diagnosis.pages[0]?.recommendedMethod).toBe('ocr');
  });

  it('clasifica como híbrido una mezcla real de páginas textuales y escaneadas', () => {
    const document = documentFromPages([
      diagnosisPage({ pageNumber: 1, normalizedText: 'a'.repeat(200), readConfidence: 'high' }),
      diagnosisPage({ pageNumber: 2, normalizedText: '', readConfidence: 'insufficient' }),
      diagnosisPage({ pageNumber: 3, normalizedText: 'b'.repeat(200), readConfidence: 'high' }),
    ]);
    const diagnosis = diagnosePdfDocument(document);
    expect(diagnosis.type).toBe('hybrid');
  });

  it('clasifica como dañado un documento con mayoría de páginas ilegibles', () => {
    const document = documentFromPages([
      diagnosisPage({ pageNumber: 1, errors: ['No fue posible leer esta página.'] }),
      diagnosisPage({ pageNumber: 2, errors: ['No fue posible leer esta página.'] }),
      diagnosisPage({ pageNumber: 3, normalizedText: 'a'.repeat(200), readConfidence: 'high' }),
    ]);
    const diagnosis = diagnosePdfDocument(document);
    expect(diagnosis.type).toBe('damaged');
    expect(diagnosis.damagedPageCount).toBe(2);
    expect(diagnosis.pages[0]?.recommendedMethod).toBe('manual_review');
  });

  it('clasifica como texto insuficiente un documento sin páginas claramente textuales ni escaneadas', () => {
    const document = documentFromPages([
      diagnosisPage({ pageNumber: 1, normalizedText: 'poco texto', readConfidence: 'low' }),
      diagnosisPage({ pageNumber: 2, normalizedText: 'otro poco', readConfidence: 'low' }),
    ]);
    const diagnosis = diagnosePdfDocument(document);
    expect(diagnosis.type).toBe('insufficient_text');
    expect(diagnosis.pages[0]?.recommendedMethod).toBe('hybrid');
  });

  it('advierte repetición anómala de caracteres y dimensiones inusuales', () => {
    const document = documentFromPages([
      diagnosisPage({
        pageNumber: 1,
        normalizedText: `encabezado ${'x'.repeat(40)} pie de página`,
        readConfidence: 'high',
        width: 50,
        height: 50,
      }),
    ]);
    const diagnosis = diagnosePdfDocument(document);
    expect(diagnosis.pages[0]?.warnings).toContain(
      'Se detectó repetición anómala de caracteres; el texto podría estar dañado.',
    );
    expect(diagnosis.pages[0]?.warnings).toContain('Dimensiones de página inusualmente pequeñas.');
  });

  it('deriva la orientación a partir del ancho y el alto de la página', () => {
    const document = documentFromPages([
      diagnosisPage({ pageNumber: 1, width: 1000, height: 600, normalizedText: 'texto' }),
      diagnosisPage({ pageNumber: 2, width: 600, height: 1000, normalizedText: 'texto' }),
      diagnosisPage({ pageNumber: 3, width: undefined, height: undefined, normalizedText: 'texto' }),
    ]);
    const diagnosis = diagnosePdfDocument(document);
    expect(diagnosis.pages[0]?.orientation).toBe('landscape');
    expect(diagnosis.pages[1]?.orientation).toBe('portrait');
    expect(diagnosis.pages[2]?.orientation).toBe('unknown');
  });

  it('asigna por fin el nivel medium de readConfidence en la lectura real', async () => {
    const pdf = syntheticTextPdf(['Texto de longitud media entre veinte y cien caracteres.']);
    const result = await readPdfText(pdf);
    expect(result.pages[0]?.readConfidence).toBe('medium');
    const diagnosis = diagnosePdfDocument(result);
    expect(diagnosis.pages[0]?.type).toBe('textual');
  });
});
