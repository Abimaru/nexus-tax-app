import type { DocumentClassification } from '@nexus-tax/domain';
import type { DocumentRepresentation } from './contracts';
import { comparableText } from './normalize';

/**
 * Routing documental explícito (Sprint 2.4, Fase F.3 — Unified
 * Reconciliation & Coverage Hardening, §13-§15 del prompt).
 *
 * El benchmark real (Fase F.1) encontró dos tipos de documento que NUNCA
 * deberían pasar por el pipeline genérico de candidatos tributarios
 * (`extractCandidates`):
 *
 *   A. Declaraciones de un año anterior (Formulario 210 histórico): usan
 *      un layout de grilla posicional denso, sin pares etiqueta↔valor
 *      adyacentes que el extractor genérico pueda reconocer. Ya existe
 *      un parser dedicado (`extractPriorYearForm210`,
 *      `packages/document-intelligence/src/form210PriorYear.ts`) — el
 *      pipeline genérico simplemente produce 0 candidatos útiles pese a
 *      decenas de valores monetarios detectados.
 *   B. Extractos bancarios transaccionales: no son certificados
 *      tributarios; tratarlos como tal genera decenas de candidatos de
 *      baja calidad (confirmado en el benchmark: un extracto real generó
 *      80 candidatos de un solo documento, la mayoría ruido).
 *
 * Esta función es la decisión de routing PURA: no ejecuta ningún parser,
 * solo determina qué ruta corresponde. `analyzePdfDocument`
 * (`pipeline.ts`) la consulta después de clasificar y, si la ruta no es
 * `generic_pipeline`, omite `extractCandidates` y expone un
 * `DocumentExtractionFinding` explicando el motivo — el documento sigue
 * disponible en biblioteca/evidencia/modo avanzado/historial (§14): esto
 * nunca borra ni rechaza el archivo, solo evita el extractor equivocado.
 */

export type DocumentRoutingRoute =
  | 'generic_pipeline'
  | 'prior_year_form_210'
  | 'unsupported_transactional_statement';

export interface DocumentRoutingDecision {
  route: DocumentRoutingRoute;
  /** Copy humano, listo para mostrar (§15): nunca jerga técnica. */
  reason: string | null;
}

/** Mínimo de fechas de movimiento para sospechar un extracto transaccional (§13.B). */
const TRANSACTIONAL_DATE_THRESHOLD = 20;
/** Mínimo de palabras clave de movimiento bancario para confirmar la sospecha. */
const TRANSACTIONAL_KEYWORD_THRESHOLD = 5;

const DATE_LIKE_PATTERN = /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g;
const TRANSACTIONAL_KEYWORDS_PATTERN =
  /\b(?:extracto|movimiento(?:s)?|transaccion(?:es)?|transferencia(?:s)?|consignacion(?:es)?|retiro(?:s)?)\b/g;

/**
 * Detecta estructuralmente un extracto bancario transaccional: MUCHAS
 * fechas de movimiento (una por línea de transacción) junto con
 * vocabulario de movimientos — muy por encima de las 1-3 fechas
 * (corte/emisión) de un certificado tributario típico. Nunca usa nombre
 * de banco, NIT ni contenido específico de un documento real.
 */
function looksLikeTransactionalStatement(representation: DocumentRepresentation): boolean {
  // Las fechas se buscan en el texto ORIGINAL (los separadores "/"/"-" se
  // conservan): `comparableText` los elimina, por lo que nunca deben
  // evaluarse sobre el texto ya normalizado. El vocabulario de
  // movimientos sí se busca sobre el texto normalizado (insensible a
  // tildes/mayúsculas/puntuación).
  const rawText = representation.pages.map((page) => page.normalizedText).join('\n');
  const normalizedText = comparableText(rawText);
  const dateMatches = rawText.match(DATE_LIKE_PATTERN)?.length ?? 0;
  const keywordMatches = normalizedText.match(TRANSACTIONAL_KEYWORDS_PATTERN)?.length ?? 0;
  return dateMatches >= TRANSACTIONAL_DATE_THRESHOLD && keywordMatches >= TRANSACTIONAL_KEYWORD_THRESHOLD;
}

export function decideDocumentRouting(
  representation: DocumentRepresentation,
  classification: DocumentClassification,
): DocumentRoutingDecision {
  const effectiveKind = classification.correctedKind ?? classification.proposedKind;
  if (effectiveKind === 'prior_year_return') {
    return {
      route: 'prior_year_form_210',
      reason:
        'Reconocimos una declaración de un año anterior. La analizaremos como declaración previa, no como certificado.',
    };
  }
  if (looksLikeTransactionalStatement(representation)) {
    return {
      route: 'unsupported_transactional_statement',
      reason:
        'Este archivo parece ser un extracto de movimientos, no un certificado tributario. Lo conservamos como soporte, pero no intentaremos convertir cada movimiento en un dato para la declaración.',
    };
  }
  return { route: 'generic_pipeline', reason: null };
}
