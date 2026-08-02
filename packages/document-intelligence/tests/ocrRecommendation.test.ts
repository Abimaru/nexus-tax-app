import { describe, expect, it } from 'vitest';
import { diagnosePdfDocument, recommendOcrPages } from '../src';
import { diagnosisPage, documentFromPages } from './fixtures';

describe('recomendación de OCR bajo demanda', () => {
  it('no recomienda OCR cuando todas las páginas son textuales', () => {
    const document = documentFromPages([
      diagnosisPage({ pageNumber: 1, normalizedText: 'a'.repeat(200), readConfidence: 'high' }),
    ]);
    const recommendation = recommendOcrPages(diagnosePdfDocument(document));
    expect(recommendation.recommended).toBe(false);
    expect(recommendation.pages).toEqual([]);
  });

  it('recomienda OCR solo para las páginas escaneadas o con texto insuficiente', () => {
    const document = documentFromPages([
      diagnosisPage({ pageNumber: 1, normalizedText: 'a'.repeat(200), readConfidence: 'high' }),
      diagnosisPage({ pageNumber: 2, normalizedText: '', readConfidence: 'insufficient' }),
      diagnosisPage({ pageNumber: 3, normalizedText: 'poco', readConfidence: 'low' }),
      diagnosisPage({ pageNumber: 4, errors: ['No fue posible leer esta página.'] }),
    ]);
    const recommendation = recommendOcrPages(diagnosePdfDocument(document));
    expect(recommendation.recommended).toBe(true);
    expect(recommendation.pages).toEqual([
      { pageNumber: 2, reason: 'scanned' },
      { pageNumber: 3, reason: 'insufficient_text' },
    ]);
  });

  it('no recomienda OCR para páginas dañadas: necesitan registro manual, no OCR', () => {
    const document = documentFromPages([
      diagnosisPage({ pageNumber: 1, errors: ['No fue posible leer esta página.'] }),
    ]);
    const recommendation = recommendOcrPages(diagnosePdfDocument(document));
    expect(recommendation.pages).toEqual([]);
  });

  it('estima el esfuerzo como rápido, moderado o intensivo según el número de páginas', () => {
    const fewPages = documentFromPages(
      Array.from({ length: 2 }, (_, index) =>
        diagnosisPage({ pageNumber: index + 1, normalizedText: '', readConfidence: 'insufficient' }),
      ),
    );
    const manyPages = documentFromPages(
      Array.from({ length: 12 }, (_, index) =>
        diagnosisPage({ pageNumber: index + 1, normalizedText: '', readConfidence: 'insufficient' }),
      ),
    );
    expect(recommendOcrPages(diagnosePdfDocument(fewPages)).effort).toBe('fast');
    expect(recommendOcrPages(diagnosePdfDocument(manyPages)).effort).toBe('intensive');
  });
});
