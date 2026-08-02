import type { DocumentKind, DocumentProfile, DocumentProfileSignals } from '@nexus-tax/domain';
import type { DocumentRepresentation } from './contracts';
import { comparableText } from './normalize';

const DIMENSION_TOLERANCE_PT = 5;

export function computeDocumentProfileSignals(
  representation: DocumentRepresentation,
): DocumentProfileSignals {
  const firstPage = representation.pages[0];
  const sectionLabels = new Set<string>();
  for (const page of representation.pages) {
    for (const section of page.sections ?? []) sectionLabels.add(section.label);
  }
  const headerKeywords = (firstPage?.normalizedText ?? '')
    .split('\n')
    .slice(0, 3)
    .map((line) => comparableText(line))
    .filter(Boolean);
  return {
    pageWidth: firstPage?.width ?? null,
    pageHeight: firstPage?.height ?? null,
    pageCount: representation.pageCount,
    sectionLabels: [...sectionLabels],
    headerKeywords,
  };
}

export interface DocumentProfileMatch {
  profileId: string;
  score: number;
  confidence: 'high' | 'medium' | 'low';
  reasons: string[];
}

function overlapRatio(a: readonly string[], b: readonly string[]): number {
  if (a.length === 0 && b.length === 0) return 0;
  const setA = new Set(a);
  const setB = new Set(b);
  let shared = 0;
  for (const value of setA) if (setB.has(value)) shared += 1;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : shared / union;
}

function confidenceFor(score: number): DocumentProfileMatch['confidence'] {
  if (score >= 0.75) return 'high';
  if (score >= 0.5) return 'medium';
  return 'low';
}

// No asocia nunca solo por nombre de archivo (§15): compara únicamente
// dimensiones de página, número de páginas, secciones detectadas y palabras
// del encabezado, con pesos fijos y explicables.
export function matchDocumentProfiles(
  signals: DocumentProfileSignals,
  documentKind: DocumentKind,
  profiles: readonly DocumentProfile[],
): DocumentProfileMatch[] {
  const candidates = profiles.filter(
    (profile) => profile.documentKind === documentKind && profile.status !== 'obsolete',
  );

  return candidates
    .map((profile) => {
      let score = 0;
      const reasons: string[] = [];

      if (signals.pageCount !== null && profile.signals.pageCount !== null) {
        if (signals.pageCount === profile.signals.pageCount) {
          score += 0.25;
          reasons.push(`Coincide el número de páginas (${signals.pageCount}).`);
        }
      }

      if (
        signals.pageWidth !== null &&
        signals.pageHeight !== null &&
        profile.signals.pageWidth !== null &&
        profile.signals.pageHeight !== null &&
        Math.abs(signals.pageWidth - profile.signals.pageWidth) <= DIMENSION_TOLERANCE_PT &&
        Math.abs(signals.pageHeight - profile.signals.pageHeight) <= DIMENSION_TOLERANCE_PT
      ) {
        score += 0.25;
        reasons.push('Coinciden las dimensiones de página.');
      }

      const sectionOverlap = overlapRatio(signals.sectionLabels, profile.signals.sectionLabels);
      if (sectionOverlap > 0) {
        score += 0.25 * sectionOverlap;
        reasons.push(`Comparte ${Math.round(sectionOverlap * 100)}% de las secciones detectadas.`);
      }

      const headerOverlap = overlapRatio(signals.headerKeywords, profile.signals.headerKeywords);
      if (headerOverlap > 0) {
        score += 0.25 * headerOverlap;
        reasons.push(`Comparte ${Math.round(headerOverlap * 100)}% del encabezado.`);
      }

      return {
        profileId: profile.id,
        score,
        confidence: confidenceFor(score),
        reasons,
      };
    })
    .filter((match) => match.score > 0)
    .sort((a, b) => b.score - a.score);
}
