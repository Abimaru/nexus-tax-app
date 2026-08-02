import { describe, expect, it } from 'vitest';
import { compareTextSources, nativeTokensFromBlocks, ocrTokensFromRaw } from '../src';

describe('representación unificada de tokens', () => {
  it('normaliza bloques nativos con confianza técnica máxima', () => {
    const tokens = nativeTokensFromBlocks(3, [
      { index: 5, text: 'Total', x: 10, y: 20, width: 40, height: 12 },
      { text: 'sin posición' },
    ]);
    expect(tokens).toEqual([
      { method: 'native', page: 3, text: 'Total', x: 10, y: 20, width: 40, height: 12, confidence: 100, blockIndex: 5 },
      { method: 'native', page: 3, text: 'sin posición', x: 0, y: 0, width: 0, height: 0, confidence: 100, blockIndex: 1 },
    ]);
  });

  it('normaliza tokens OCR crudos conservando su confianza', () => {
    const tokens = ocrTokensFromRaw(2, [
      { text: 'palabra', confidence: 87.5, x: 1, y: 2, width: 3, height: 4 },
    ]);
    expect(tokens).toEqual([
      { method: 'ocr', page: 2, text: 'palabra', x: 1, y: 2, width: 3, height: 4, confidence: 87.5 },
    ]);
  });
});

describe('comparación de fuentes textuales', () => {
  it('marca coincidencia cuando el texto nativo y el OCR son iguales tras normalizar', () => {
    const result = compareTextSources(1, 'Saldo Final: $100', 'saldo final: $100');
    expect(result.status).toBe('agree');
    expect(result.primaryMethod).toBe('native');
  });

  it('marca OCR más completo cuando el texto nativo está vacío', () => {
    const result = compareTextSources(1, '', 'Certificado de saldos');
    expect(result.status).toBe('ocr_more_complete');
    expect(result.primaryMethod).toBe('ocr');
  });

  it('marca texto nativo más confiable cuando el OCR no produce nada', () => {
    const result = compareTextSources(1, 'Certificado de saldos', '');
    expect(result.status).toBe('native_more_reliable');
    expect(result.primaryMethod).toBe('native');
  });

  it('requiere revisión cuando ninguna fuente produce texto', () => {
    const result = compareTextSources(1, '', '');
    expect(result.status).toBe('requires_review');
  });

  it('marca OCR complementa cuando el OCR incluye todo el nativo y más', () => {
    const result = compareTextSources(1, 'Saldo final', 'Saldo final al 31 de diciembre de 2025');
    expect(result.status).toBe('ocr_complements');
  });

  it('marca texto nativo más confiable cuando el nativo incluye todo el OCR y más', () => {
    const result = compareTextSources(1, 'Saldo final al 31 de diciembre de 2025', 'Saldo final');
    expect(result.status).toBe('native_more_reliable');
  });

  it('marca contradicción cuando los textos difieren sustancialmente', () => {
    const result = compareTextSources(
      1,
      'Certificado de saldos bancarios año 2025',
      'Factura electrónica número 998877 impuestos',
    );
    expect(result.status).toBe('contradiction');
  });

  it('nunca fusiona los valores: siempre conserva ambos textos originales', () => {
    const result = compareTextSources(1, 'valor nativo', 'valor ocr distinto');
    expect(result.nativeText).toBe('valor nativo');
    expect(result.ocrText).toBe('valor ocr distinto');
  });
});
