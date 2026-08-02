import type { DocumentTextBlock, RawOcrToken, UnifiedTextToken } from './contracts';

// La extracción nativa de PDF.js es determinista (no probabilística): se
// documenta con confianza técnica máxima para que quede en el mismo rango
// 0-100 que la confianza de OCR, no porque sea una medida de precisión.
const NATIVE_TOKEN_CONFIDENCE = 100;

export function nativeTokensFromBlocks(
  page: number,
  blocks: readonly DocumentTextBlock[],
): UnifiedTextToken[] {
  return blocks.map((block, index) => ({
    method: 'native',
    page,
    text: block.text,
    x: block.x ?? 0,
    y: block.y ?? 0,
    width: block.width ?? 0,
    height: block.height ?? 0,
    confidence: NATIVE_TOKEN_CONFIDENCE,
    blockIndex: block.index ?? index,
  }));
}

export function ocrTokensFromRaw(
  page: number,
  tokens: readonly RawOcrToken[],
): UnifiedTextToken[] {
  return tokens.map((token) => ({
    method: 'ocr',
    page,
    text: token.text,
    x: token.x,
    y: token.y,
    width: token.width,
    height: token.height,
    confidence: token.confidence,
  }));
}
