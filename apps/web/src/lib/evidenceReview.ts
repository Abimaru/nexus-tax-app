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
 * Categorías de la exógena que NUNCA deben convertirse en una expectativa
 * de evidencia documental (Sprint 2.4, Fase F.3, §16): son informativas,
 * de movimiento del período (no un saldo final que un certificado
 * reporte), o se resuelven por una fuente estructurada distinta que ya
 * tiene su propia reconciliación dedicada.
 *
 * - `card_consumption`: señal de umbral de consumo (UVT), no un hecho
 *   documental discreto que una tarjeta de crédito certifique.
 * - `bank_movement` / `investment_movement`: movimientos del período, no
 *   el saldo final que sí certifica un producto financiero (ese saldo
 *   vive bajo `asset`, que SÍ genera expectativa).
 * - `electronic_invoicing_total` / `electronic_invoicing_benefit_base`:
 *   se reconcilian exclusivamente contra el reporte DIAN de facturación
 *   electrónica (Sprint 2.4, Fase D), nunca contra un certificado PDF
 *   genérico — crear una expectativa aquí solo produciría un falso
 *   `unresolved` permanente.
 */
const CATEGORIES_WITHOUT_DOCUMENT_EXPECTATION = new Set<string>([
  'card_consumption',
  'bank_movement',
  'investment_movement',
  'electronic_invoicing_total',
  'electronic_invoicing_benefit_base',
]);

/**
 * Construye "qué espera encontrar el expediente" a partir de la exógena
 * (§13-§14 de docs/EVIDENCE_MATCHING.md). El contrato es genérico
 * (`sourceKind`), pero hoy solo se deriva de `NormalizedExogenousRecord`
 * con valor reportado no nulo, EXCLUYENDO las categorías que Fase F.3
 * (§16) identificó como falsos `unresolved` estructurales.
 */
export function buildExpectedTaxEvidence(input: {
  caseId: string;
  result?: ProcessingResult;
}): ExpectedTaxEvidence[] {
  if (!input.result) return [];
  return input.result.normalizedRecords
    .filter(
      (record) =>
        record.reportedValue !== null && !CATEGORIES_WITHOUT_DOCUMENT_EXPECTATION.has(record.category),
    )
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
  // Sprint 2.4, Fase F.3 (§16): las categorías excluidas de
  // `buildExpectedTaxEvidence` no generan `ExpectedTaxEvidence`, pero un
  // candidato cuya ÚNICA coincidencia apunte a uno de esos registros
  // excluidos NUNCA debe desaparecer silenciosamente (§28) — se calcula
  // el conjunto de `sourceId` realmente presentes en `expectedEvidence`
  // para que esos matches sigan contando como "sin relación útil" y el
  // candidato caiga en el flujo de "posible valor nuevo" más abajo.
  const expectedSourceIds = new Set(input.expectedEvidence.map((item) => item.sourceId));

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
      (match) =>
        MATCH_STATUS_TO_SUGGESTION_STATUS[match.status] !== null &&
        expectedSourceIds.has(match.recordId),
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

/**
 * Human Review Burden (Sprint 2.4, Fase F.3, §1/§19): métrica local de
 * benchmark que aproxima "decisiones humanas necesarias para cerrar el
 * expediente" con más granularidad que solo contar candidatos. Nunca se
 * persiste ni se envía como telemetría (§1/§19 del prompt) — es una
 * función PURA calculable en tests/benchmark local sobre el resultado ya
 * producido por `buildEvidenceReviewSuggestions`.
 *
 * - `bulkConfirmable`: sugerencias marcadas `safeForBulkConfirm` — cero
 *   esfuerzo real, un solo clic masivo.
 * - `meaningfulHumanReview`: sugerencias con relación candidato↔registro
 *   que SÍ requieren criterio humano (coincidencia probable, ambigüedad,
 *   contradicción, o un exact/rounding que quedó fuera del bloque por
 *   alguna anomalía) — la revisión "con sentido" del expediente.
 * - `manualGuidedCapture`: expectativas sin ningún candidato — exigen
 *   captura manual guiada.
 * - `irrelevantCandidateReview`: candidatos sin relación con la exógena
 *   (`new_relevant_value`) — un humano debe mirarlos al menos una vez
 *   para decidir si son relevantes o descartables; en la práctica suelen
 *   incluir tanto evidencia legítima (p. ej. vivienda) como ruido.
 * - `unresolvedAfterAllDocuments`: lo que sigue sin resolver incluso
 *   después de haber cargado todos los documentos disponibles — hoy
 *   coincide exactamente con `manualGuidedCapture` (ninguna expectativa
 *   sin candidato se resuelve por sí sola con más documentos ya
 *   cargados); se reporta con su propio nombre para alinear con el
 *   vocabulario del benchmark de Fase F.1.
 */
export interface HumanReviewBurden {
  bulkConfirmable: number;
  meaningfulHumanReview: number;
  manualGuidedCapture: number;
  irrelevantCandidateReview: number;
  unresolvedAfterAllDocuments: number;
  total: number;
}

export function computeHumanReviewBurden(
  suggestions: readonly Pick<EvidenceReviewSuggestion, 'status' | 'safeForBulkConfirm'>[],
): HumanReviewBurden {
  const bulkConfirmable = suggestions.filter((item) => item.safeForBulkConfirm).length;
  const meaningfulHumanReview = suggestions.filter(
    (item) =>
      !item.safeForBulkConfirm &&
      (item.status === 'matched' || item.status === 'likely_match' || item.status === 'needs_review'),
  ).length;
  const manualGuidedCapture = suggestions.filter((item) => item.status === 'unresolved').length;
  const irrelevantCandidateReview = suggestions.filter(
    (item) => item.status === 'new_relevant_value',
  ).length;
  return {
    bulkConfirmable,
    meaningfulHumanReview,
    manualGuidedCapture,
    irrelevantCandidateReview,
    unresolvedAfterAllDocuments: manualGuidedCapture,
    total: suggestions.length,
  };
}
