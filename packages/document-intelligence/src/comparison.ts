import type { TextSourceComparison, TextSourceComparisonStatus } from './contracts';
import { comparableText } from './normalize';

// Bajo este umbral de solapamiento de palabras, dos textos que no coinciden ni
// son subconjunto uno del otro se consideran una contradicción real; por
// encima, una diferencia parcial que amerita revisión humana (ninguna se
// fusiona nunca de forma silenciosa).
const REVIEW_OVERLAP_THRESHOLD = 0.5;

function wordSet(text: string): Set<string> {
  return new Set(text.split(' ').filter(Boolean));
}

function overlapRatio(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let shared = 0;
  for (const word of a) {
    if (b.has(word)) shared += 1;
  }
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 1 : shared / union;
}

export function compareTextSources(
  page: number,
  nativeText: string,
  ocrText: string,
): TextSourceComparison {
  const nativeNorm = comparableText(nativeText);
  const ocrNorm = comparableText(ocrText);

  const build = (
    status: TextSourceComparisonStatus,
    primaryMethod: TextSourceComparison['primaryMethod'],
    reason: string,
  ): TextSourceComparison => ({
    page,
    status,
    primaryMethod,
    nativeText,
    ocrText,
    reasons: [reason],
  });

  if (!nativeNorm && !ocrNorm) {
    return build('requires_review', 'native', 'Ninguna fuente produjo texto en esta página.');
  }
  if (!nativeNorm) {
    return build(
      'ocr_more_complete',
      'ocr',
      'El texto nativo está vacío; el OCR es la única fuente disponible.',
    );
  }
  if (!ocrNorm) {
    return build(
      'native_more_reliable',
      'native',
      'El OCR no produjo texto; se conserva el texto nativo.',
    );
  }
  if (nativeNorm === ocrNorm) {
    return build('agree', 'native', 'El texto nativo y el OCR coinciden tras normalizar.');
  }
  if (ocrNorm.includes(nativeNorm)) {
    return build(
      'ocr_complements',
      'native',
      'El OCR incluye texto adicional no presente en la capa nativa.',
    );
  }
  if (nativeNorm.includes(ocrNorm)) {
    return build(
      'native_more_reliable',
      'native',
      'El texto nativo incluye todo lo detectado por OCR y contenido adicional.',
    );
  }

  const overlap = overlapRatio(wordSet(nativeNorm), wordSet(ocrNorm));
  if (overlap >= REVIEW_OVERLAP_THRESHOLD) {
    return build(
      'requires_review',
      'native',
      'El texto nativo y el OCR difieren parcialmente; requieren revisión manual.',
    );
  }
  return build(
    'contradiction',
    'native',
    'El texto nativo y el OCR difieren de forma sustancial.',
  );
}
