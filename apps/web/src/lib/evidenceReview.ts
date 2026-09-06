import type {
  CandidateExogenousMatchStatus,
  DocumentFactCandidate,
  EvidenceReviewAction,
  EvidenceReviewSuggestion,
  EvidenceReviewSuggestionStatus,
  ExpectedTaxEvidence,
  ProcessingResult,
} from '@nexus-tax/domain';
import { entityForRecord } from './taxCaseAnalysis';

/**
 * Guided Review — orquestación (Sprint 2.4, Fase E).
 *
 * Este módulo es la capa que traduce el matcher (candidato↔registro
 * exógeno) y la exógena (qué se espera encontrar) en un puñado de
 * decisiones humanas legibles, en vez de exponer todos los candidatos en
 * bruto. NO calcula un score nuevo: reutiliza `DocumentFactCandidate.
 * suggestedExogenousMatches`, ya producido por
 * `suggestExogenousMatches` en `@nexus-tax/document-intelligence`
 * (`packages/document-intelligence/src/matching.ts`). Este archivo solo
 * decide, para cada par candidato/expectativa, qué acción humana ofrecer.
 *
 * Es una función PURA (sin Dexie, sin red): la web la invoca con datos ya
 * cargados y persiste la decisión humana a través de
 * `confirmEvidenceMatch`/`createGuidedManualCapture` en `repository.ts`.
 */

const MATCH_STATUS_TO_SUGGESTION_STATUS: Record<
  CandidateExogenousMatchStatus,
  EvidenceReviewSuggestionStatus | null
> = {
  exact_match: 'matched',
  rounding_match: 'matched',
  minor_difference: 'likely_match',
  possible_match: 'likely_match',
  ambiguous: 'needs_review',
  contradiction: 'needs_review',
  // `no_match` no debe generar una sugerencia de comparación: el candidato
  // simplemente no tiene relación suficiente con esa expectativa.
  no_match: null,
};

/**
 * Construye "qué espera encontrar el expediente" a partir de la exógena
 * (§13-§14 de docs/EVIDENCE_MATCHING.md). El contrato es genérico
 * (`sourceKind`), pero hoy solo se deriva de `NormalizedExogenousRecord`
 * con valor reportado no nulo.
 */
export function buildExpectedTaxEvidence(input: {
  caseId: string;
  result?: ProcessingResult;
}): ExpectedTaxEvidence[] {
  if (!input.result) return [];
  return input.result.normalizedRecords
    .filter((record) => record.reportedValue !== null)
    .map((record) => ({
      id: `expected:${record.id}`,
      caseId: input.caseId,
      sourceKind: 'exogenous_record' as const,
      sourceId: record.id,
      entityId: entityForRecord(record, input.result!.entities)?.id ?? null,
      entityName: record.entityName,
      conceptLabel: record.conceptLabel ?? 'Concepto sin etiqueta',
      category: record.category,
      nature: record.nature,
      treatment: record.treatment,
      expectedValueCop: record.reportedValue,
      period: null,
    }));
}

function isCandidateOpen(candidate: DocumentFactCandidate): boolean {
  return !candidate.factId && (candidate.status === 'pending' || candidate.status === 'requires_review');
}

function candidateDocumentValue(candidate: DocumentFactCandidate): number {
  return candidate.amount?.decimalValue ?? candidate.extractedValue;
}

/**
 * Construye las sugerencias de Guided Review (§15-§18): para cada
 * expectativa sin resolver, agrupa los candidatos que el matcher ya
 * relacionó con ella (por `recordId`) en una única decisión humana. Los
 * candidatos que no coinciden con NINGUNA expectativa (`no_match` en
 * todos sus registros sugeridos, o sin sugerencias) se muestran como
 * "posible valor nuevo" en vez de desaparecer silenciosamente (§28: nunca
 * ocultar dinero sin decisión humana).
 */
export function buildEvidenceReviewSuggestions(input: {
  caseId: string;
  candidates: readonly DocumentFactCandidate[];
  expectedEvidence: readonly ExpectedTaxEvidence[];
  /**
   * Ids de registros exógenos que ya tienen una `PreliminaryReconciliation`
   * registrada (Sprint 2.4, Fase E.1, §18): sus expectativas se excluyen
   * por completo de la revisión guiada — ni "matched" ni "unresolved" — en
   * vez de volver a aparecer como pendientes solo porque su candidato ya
   * fue consumido (`factId`) al confirmarlas. Evita el doble conteo y una
   * regresión visual ("lo que ya confirmé vuelve a pedirse").
   */
  reconciledExogenousRecordIds?: ReadonlySet<string>;
  now?: string;
}): EvidenceReviewSuggestion[] {
  const createdAt = input.now ?? new Date().toISOString();
  const openCandidates = input.candidates.filter(isCandidateOpen);
  const suggestions: EvidenceReviewSuggestion[] = [];
  const consumedCandidateIds = new Set<string>();

  for (const expectation of input.expectedEvidence) {
    if (input.reconciledExogenousRecordIds?.has(expectation.sourceId)) continue;
    const related = openCandidates
      .flatMap((candidate) =>
        candidate.suggestedExogenousMatches
          .filter((match) => match.recordId === expectation.sourceId)
          .map((match) => ({ candidate, match })),
      )
      .filter(({ match }) => MATCH_STATUS_TO_SUGGESTION_STATUS[match.status] !== null);

    if (!related.length) {
      suggestions.push({
        id: `evidence-suggestion:expected:${expectation.id}`,
        caseId: input.caseId,
        expectedEvidenceId: expectation.id,
        candidateId: null,
        alternativeCandidateIds: [],
        status: 'unresolved',
        matchStatus: null,
        reasons: [
          `No se encontró ningún valor documental para "${expectation.conceptLabel}" reportado por la exógena.`,
        ],
        documentValueCop: null,
        expectedValueCop: expectation.expectedValueCop,
        differenceCop: null,
        differencePercentage: null,
        safeForBulkConfirm: false,
        allowedActions: ['capture_manually', 'dismiss'],
        createdAt,
      });
      continue;
    }

    // Prioriza exact_match/rounding_match > minor_difference/possible_match
    // > ambiguous/contradiction, y dentro de cada nivel el de menor
    // diferencia absoluta.
    const rank = (status: CandidateExogenousMatchStatus): number =>
      status === 'exact_match'
        ? 0
        : status === 'rounding_match'
          ? 1
          : status === 'minor_difference'
            ? 2
            : status === 'possible_match'
              ? 3
              : status === 'ambiguous'
                ? 4
                : 5;
    const sorted = [...related].sort(
      (a, b) =>
        rank(a.match.status) - rank(b.match.status) ||
        (a.match.difference ?? 0) - (b.match.difference ?? 0) ||
        a.candidate.id.localeCompare(b.candidate.id),
    );
    const best = sorted[0]!;
    for (const item of sorted) consumedCandidateIds.add(item.candidate.id);
    const status = MATCH_STATUS_TO_SUGGESTION_STATUS[best.match.status]!;
    const safeForBulkConfirm =
      (best.match.status === 'exact_match' || best.match.status === 'rounding_match') &&
      !(best.match.anomalyCodes ?? []).length &&
      sorted.length === 1;
    const allowedActions: EvidenceReviewAction[] =
      status === 'matched'
        ? ['confirm', 'correct_value', 'choose_alternative', 'dismiss']
        : status === 'needs_review' && best.match.status === 'ambiguous'
          ? // La ambigüedad se resuelve con el mismo mecanismo de confirmación
            // (§12/§17 de docs/EVIDENCE_MATCHING.md): al elegir esta
            // expectativa como la correcta, el candidato queda consumido
            // (factId) y la otra expectativa en pugna deja de encontrarlo
            // como candidato abierto en la siguiente recomputación —
            // volviendo automáticamente a `unresolved` sin un mecanismo
            // paralelo de "elegir entre alternativas".
            ['confirm', 'choose_alternative', 'capture_manually', 'dismiss']
          : ['confirm', 'correct_value', 'choose_alternative', 'capture_manually', 'dismiss'];
    suggestions.push({
      id: `evidence-suggestion:expected:${expectation.id}`,
      caseId: input.caseId,
      expectedEvidenceId: expectation.id,
      candidateId: best.candidate.id,
      alternativeCandidateIds: sorted
        .slice(1)
        .map((item) => item.candidate.id)
        .filter((id) => id !== best.candidate.id),
      status,
      matchStatus: best.match.status,
      reasons: best.match.reasons,
      documentValueCop: candidateDocumentValue(best.candidate),
      expectedValueCop: expectation.expectedValueCop,
      differenceCop: best.match.difference ?? null,
      differencePercentage: best.match.differencePercentage ?? null,
      safeForBulkConfirm,
      allowedActions,
      createdAt,
    });
  }

  // Candidatos sin relación con ninguna expectativa: posible valor nuevo
  // relevante, nunca se descartan silenciosamente.
  for (const candidate of openCandidates) {
    if (consumedCandidateIds.has(candidate.id)) continue;
    const hasAnyUsableMatch = candidate.suggestedExogenousMatches.some(
      (match) => MATCH_STATUS_TO_SUGGESTION_STATUS[match.status] !== null,
    );
    if (hasAnyUsableMatch) continue;
    // Sprint 2.4, Fase F.2, §15: la deducción de intereses de vivienda
    // nunca se reporta como información exógena — la ausencia de
    // coincidencia NO implica un error. Copy distinto y tranquilizador,
    // nunca "No aparece en exógena" como si fuera un problema.
    const isHousingInterest = candidate.proposedCategory === 'housing_interest';
    suggestions.push({
      id: `evidence-suggestion:candidate:${candidate.id}`,
      caseId: input.caseId,
      expectedEvidenceId: null,
      candidateId: candidate.id,
      alternativeCandidateIds: [],
      status: 'new_relevant_value',
      matchStatus: null,
      reasons: isHousingInterest
        ? [
            'Este beneficio normalmente se sustenta con el certificado de la entidad. No necesitamos una coincidencia en exógena para conservarlo como evidencia.',
          ]
        : [
            'Este valor documental no coincide con ningún registro de la exógena: podría ser información nueva.',
          ],
      documentValueCop: candidateDocumentValue(candidate),
      expectedValueCop: null,
      differenceCop: null,
      differencePercentage: null,
      safeForBulkConfirm: false,
      allowedActions: ['mark_new_value', 'capture_manually', 'dismiss'],
      createdAt,
    });
  }

  return suggestions;
}
