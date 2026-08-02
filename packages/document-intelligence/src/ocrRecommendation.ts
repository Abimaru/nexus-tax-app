import type { PdfDocumentDiagnosis } from '@nexus-tax/domain';

// OCR nunca se ejecuta automáticamente: esta función solo recomienda qué
// páginas podrían beneficiarse y da una estimación cualitativa, nunca un
// tiempo exacto (no hay forma honesta de prometerlo sin haber ejecutado OCR).
export type OcrEffortEstimate = 'fast' | 'moderate' | 'intensive';

export interface OcrPageRecommendation {
  pageNumber: number;
  reason: 'scanned' | 'insufficient_text';
}

export interface OcrRecommendation {
  recommended: boolean;
  pages: OcrPageRecommendation[];
  effort: OcrEffortEstimate;
  signals: string[];
}

const FAST_MAX_PAGES = 2;
const MODERATE_MAX_PAGES = 10;

function effortFor(pageCount: number): OcrEffortEstimate {
  if (pageCount <= FAST_MAX_PAGES) return 'fast';
  if (pageCount <= MODERATE_MAX_PAGES) return 'moderate';
  return 'intensive';
}

export function recommendOcrPages(diagnosis: PdfDocumentDiagnosis): OcrRecommendation {
  const pages: OcrPageRecommendation[] = diagnosis.pages
    .filter((page) => page.type === 'scanned' || page.type === 'insufficient_text')
    .map((page) => ({
      pageNumber: page.pageNumber,
      reason: page.type === 'scanned' ? 'scanned' : 'insufficient_text',
    }));
  return {
    recommended: pages.length > 0,
    pages,
    effort: effortFor(pages.length),
    signals: diagnosis.signals,
  };
}
