import type {
  PdfDocumentDiagnosis,
  PdfDocumentType,
  PdfPageDiagnosis,
  PdfPageReadMethod,
  PdfPageType,
} from '@nexus-tax/domain';
import type { DocumentPageRepresentation, DocumentRepresentation } from './contracts';

// Estimación aproximada de cuánto texto trae una página densamente escrita;
// no mide cobertura real de área ni sustituye una inspección visual.
const EXPECTED_DENSE_PAGE_CHARACTERS = 1200;
const ABNORMAL_REPETITION_PATTERN = /(.)\1{29,}/;
const MIN_EXPECTED_DIMENSION = 100;

function pageType(page: DocumentPageRepresentation): PdfPageType {
  if (page.errors.length > 0) return 'damaged';
  if (page.readConfidence === 'insufficient') return 'scanned';
  if (page.readConfidence === 'low') return 'insufficient_text';
  return 'textual';
}

function recommendedMethodFor(type: PdfPageType): PdfPageReadMethod {
  switch (type) {
    case 'textual':
      return 'native_text';
    case 'scanned':
      return 'ocr';
    case 'insufficient_text':
      return 'hybrid';
    case 'damaged':
      return 'manual_review';
  }
}

function orientationFor(
  width: number | undefined,
  height: number | undefined,
): PdfPageDiagnosis['orientation'] {
  if (!width || !height) return 'unknown';
  return width > height ? 'landscape' : 'portrait';
}

function pageWarnings(page: DocumentPageRepresentation): string[] {
  const warnings = [...page.errors];
  if (ABNORMAL_REPETITION_PATTERN.test(page.normalizedText)) {
    warnings.push('Se detectó repetición anómala de caracteres; el texto podría estar dañado.');
  }
  if (
    page.width !== undefined &&
    page.height !== undefined &&
    (page.width < MIN_EXPECTED_DIMENSION || page.height < MIN_EXPECTED_DIMENSION)
  ) {
    warnings.push('Dimensiones de página inusualmente pequeñas.');
  }
  return warnings;
}

function diagnosePage(page: DocumentPageRepresentation): PdfPageDiagnosis {
  const type = pageType(page);
  const characterCount = page.normalizedText.length;
  return {
    pageNumber: page.pageNumber,
    type,
    characterCount,
    tokenCount: page.normalizedText.split(/\s+/).filter(Boolean).length,
    textCoverage: Math.min(1, characterCount / EXPECTED_DENSE_PAGE_CHARACTERS),
    orientation: orientationFor(page.width, page.height),
    width: page.width ?? null,
    height: page.height ?? null,
    warnings: pageWarnings(page),
    recommendedMethod: recommendedMethodFor(type),
  };
}

function documentType(pages: readonly PdfPageDiagnosis[]): PdfDocumentType {
  const pageCount = pages.length;
  if (pageCount === 0) return 'insufficient_text';
  const damagedRatio = pages.filter((page) => page.type === 'damaged').length / pageCount;
  const scannedRatio = pages.filter((page) => page.type === 'scanned').length / pageCount;
  const textualRatio = pages.filter((page) => page.type === 'textual').length / pageCount;
  if (damagedRatio >= 0.5) return 'damaged';
  if (scannedRatio >= 0.8) return 'scanned';
  if (scannedRatio > 0 && textualRatio > 0) return 'hybrid';
  if (textualRatio >= 0.5) return 'textual';
  return 'insufficient_text';
}

function documentSignals(pages: readonly PdfPageDiagnosis[]): string[] {
  const pageCount = pages.length;
  const scannedCount = pages.filter((page) => page.type === 'scanned').length;
  const damagedCount = pages.filter((page) => page.type === 'damaged').length;
  const insufficientCount = pages.filter((page) => page.type === 'insufficient_text').length;
  const signals: string[] = [];
  if (scannedCount > 0) {
    signals.push(`${scannedCount} de ${pageCount} página(s) sin texto extraíble (posible escaneo).`);
  }
  if (damagedCount > 0) {
    signals.push(`${damagedCount} de ${pageCount} página(s) no se pudieron leer.`);
  }
  if (insufficientCount > 0) {
    signals.push(`${insufficientCount} de ${pageCount} página(s) con muy poco texto extraído.`);
  }
  if (signals.length === 0) {
    signals.push(`${pageCount} de ${pageCount} página(s) con texto extraído de forma nativa.`);
  }
  return signals;
}

export function diagnosePdfDocument(
  representation: DocumentRepresentation,
): PdfDocumentDiagnosis {
  const pages = representation.pages.map(diagnosePage);
  return {
    type: documentType(pages),
    pages,
    textualPageCount: pages.filter((page) => page.type === 'textual').length,
    scannedPageCount: pages.filter((page) => page.type === 'scanned').length,
    insufficientPageCount: pages.filter((page) => page.type === 'insufficient_text').length,
    damagedPageCount: pages.filter((page) => page.type === 'damaged').length,
    signals: documentSignals(pages),
  };
}
