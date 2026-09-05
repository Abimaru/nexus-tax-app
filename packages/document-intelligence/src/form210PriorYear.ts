import type { PriorYearReturnStatus } from '@nexus-tax/domain';
import type { DocumentRepresentation, DocumentPageRepresentation } from './contracts';
import { parseMoneyAmount } from './money';

/**
 * Extracción de casillas de una declaración de renta anterior (Formulario
 * 210) a partir de su representación PDF ya leída (Sprint 2.4, Fase B).
 *
 * Reutiliza el mismo lector/diagnóstico de PDF del resto del motor
 * documental (`readPdfText`, `diagnosePdfDocument`) — este módulo NO lee el
 * PDF por sí mismo, solo interpreta la `DocumentRepresentation` ya
 * calculada. El orden de lectura completo (texto nativo → geometría →
 * estructura conocida del F-210 → OCR de respaldo → resolución manual) lo
 * orquesta `apps/web`: cuando `readConfidence` de una página es
 * `insufficient`/`low`, este módulo lo señala en `warnings` para que la web
 * decida si ofrece OCR, en vez de intentarlo aquí (este paquete nunca corre
 * OCR ni accede al navegador).
 *
 * Es un adaptador determinista basado en patrones de número de casilla +
 * etiqueta + valor monetario al final de línea. NO asume coordenadas ni
 * layout de un PDF único: cualquier línea que combine un número de casilla
 * plausible (1-141) con un valor monetario reconocible se considera
 * candidata, sin importar en qué posición del documento aparezca.
 */

export const FORM_210_PRIOR_YEAR_PARSER_VERSION = 'form210-prior-year-1.0.0';

export type PriorYearBoxExtractionMethod = 'native_text' | 'geometry' | 'ocr' | 'manual';

export interface ExtractedPriorYearBox {
  boxNumber: number;
  rawValue: string | null;
  normalizedValueCop: number | null;
  extractionMethod: PriorYearBoxExtractionMethod;
  confidence: 'high' | 'medium' | 'low' | 'insufficient';
  page: number | null;
  evidence: string | null;
}

export interface Form210PriorYearDetection {
  isForm210: boolean;
  taxYear: number | null;
  filingYear: number | null;
  formNumber: string | null;
  /** Número del formulario que esta declaración corrige, cuando el texto lo indica. */
  previousFormNumber: string | null;
  /** Identificación del contribuyente YA enmascarada (nunca se conserva completa). */
  taxpayerIdentityMasked: string | null;
  submittedAt: string | null;
  statusGuess: PriorYearReturnStatus;
  supportingSignals: string[];
  confidence: 'high' | 'medium' | 'low' | 'insufficient';
}

export interface Form210PriorYearExtraction {
  detection: Form210PriorYearDetection;
  boxes: ExtractedPriorYearBox[];
  warnings: string[];
}

/** Enmascara un número de identificación conservando solo los últimos 4 dígitos. */
function maskIdentityNumber(rawDigits: string): string {
  const visible = rawDigits.slice(-4);
  const hiddenLength = Math.max(4, rawDigits.length - visible.length);
  return `${'•'.repeat(hiddenLength)}${visible}`;
}

const FORM_210_SIGNAL = /formulario\s*210\b/i;
const TAX_YEAR_SIGNAL = /a[ñn]o\s+gravable[:\s]*([12]\d{3})/i;
const FILING_YEAR_SIGNAL = /a[ñn]o\s+de\s+presentaci[oó]n[:\s]*([12]\d{3})/i;
const FORM_NUMBER_SIGNAL = /n[uú]mero\s+de\s+formulario[:\s]*([0-9]{6,20})/i;
const CORRECTION_SIGNAL =
  /corrige\s+(?:el\s+)?formulario\s+n[oO]\.?\s*([0-9]{6,20})|declaraci[oó]n\s+de\s+correcci[oó]n/i;
const SUBMITTED_AT_SIGNAL =
  /(?:presentad[ao]|fecha\s+de\s+presentaci[oó]n)[:\s]*el?\s*([12]\d{3}-\d{2}-\d{2})/i;
const DRAFT_SIGNAL = /\bborrador\b/i;
const IDENTITY_SIGNAL = /\b(?:NIT|C\.?C\.?|documento)[:\s]*([0-9][0-9.-]{5,17}[0-9])\b/i;

/** Rango plausible de número de casilla para el Formulario 210 (Fase B0). */
const BOX_NUMBER_RANGE: readonly [number, number] = [1, 141];

/**
 * Detecta un token de casilla + etiqueta + valor monetario al final de la
 * línea. Ejemplo esperado: "133 Anticipo renta año gravable siguiente 79.000".
 */
const BOX_LINE_PATTERN = /^\s*(\d{1,3})\s+(.+?)\s+(\(?-?[\d][\d.,]*\)?)\s*$/;

function detectForm210(fullText: string): Form210PriorYearDetection {
  const signals: string[] = [];
  const isForm210 = FORM_210_SIGNAL.test(fullText);
  if (isForm210) signals.push('Se encontró la referencia "Formulario 210" en el texto.');

  const taxYearMatch = fullText.match(TAX_YEAR_SIGNAL);
  const taxYear = taxYearMatch ? Number(taxYearMatch[1]) : null;
  if (taxYear) signals.push(`Año gravable detectado: ${taxYear}.`);

  const filingYearMatch = fullText.match(FILING_YEAR_SIGNAL);
  const filingYear = filingYearMatch ? Number(filingYearMatch[1]) : taxYear ? taxYear + 1 : null;

  const formNumberMatch = fullText.match(FORM_NUMBER_SIGNAL);
  const formNumber = formNumberMatch?.[1] ?? null;
  if (formNumber) signals.push('Número de formulario detectado.');

  const correctionMatch = fullText.match(CORRECTION_SIGNAL);
  const previousFormNumber = correctionMatch?.[1] ?? null;
  if (correctionMatch) signals.push('El texto indica que esta declaración corrige otra anterior.');

  const identityMatch = fullText.match(IDENTITY_SIGNAL);
  const taxpayerIdentityMasked = identityMatch
    ? maskIdentityNumber(identityMatch[1]!.replace(/\D/g, ''))
    : null;
  if (taxpayerIdentityMasked) signals.push('Identificación del contribuyente detectada (enmascarada).');

  const submittedMatch = fullText.match(SUBMITTED_AT_SIGNAL);
  const submittedAt = submittedMatch?.[1] ?? null;

  let statusGuess: PriorYearReturnStatus = 'unknown';
  if (correctionMatch) statusGuess = 'amended';
  else if (submittedAt) statusGuess = 'submitted';
  else if (DRAFT_SIGNAL.test(fullText)) statusGuess = 'draft';
  // Nunca se afirma "presentada" solo porque el documento parece un F-210:
  // `submitted` exige evidencia estructural explícita (fecha de
  // presentación). Sin ella, el estado permanece `unknown` o `draft`.

  const strongSignalCount = [isForm210, Boolean(taxYear), Boolean(formNumber)].filter(
    Boolean,
  ).length;
  const confidence: Form210PriorYearDetection['confidence'] =
    strongSignalCount >= 3
      ? 'high'
      : strongSignalCount === 2
        ? 'medium'
        : strongSignalCount === 1
          ? 'low'
          : 'insufficient';

  return {
    isForm210,
    taxYear,
    filingYear,
    formNumber,
    previousFormNumber,
    taxpayerIdentityMasked,
    submittedAt,
    statusGuess,
    supportingSignals: signals,
    confidence,
  };
}

function extractBoxesFromPage(
  page: DocumentPageRepresentation,
  warnings: string[],
): ExtractedPriorYearBox[] {
  if (page.readConfidence === 'insufficient' || page.readConfidence === 'low') {
    warnings.push(
      `Página ${page.pageNumber}: confianza de lectura ${page.readConfidence}; puede requerir OCR de respaldo antes de extraer sus casillas.`,
    );
  }
  const lines = page.normalizedText.split('\n');
  const boxes: ExtractedPriorYearBox[] = [];
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    const match = line.match(BOX_LINE_PATTERN);
    if (!match) continue;
    const boxNumber = Number(match[1]);
    if (boxNumber < BOX_NUMBER_RANGE[0] || boxNumber > BOX_NUMBER_RANGE[1]) continue;
    const rawValue = match[3] ?? null;
    if (!rawValue) continue;
    const amount = parseMoneyAmount(rawValue, {
      page: page.pageNumber,
      extractionMethod: 'native',
      originalEvidence: line,
    });
    boxes.push({
      boxNumber,
      rawValue,
      normalizedValueCop: amount.roundedTaxValue,
      extractionMethod: 'native_text',
      confidence: amount.confidence,
      page: page.pageNumber,
      evidence: line,
    });
  }
  return boxes;
}

/**
 * Extrae la detección del formulario y sus casillas a partir de una
 * `DocumentRepresentation` ya leída. Nunca afirma "presentada" solo porque
 * el texto se parece al Formulario 210: exige señales estructurales
 * (`supportingSignals`) y dosifica la confianza según cuántas se encuentren.
 * Cuando dos casillas iguales aparecen en páginas distintas (documento con
 * anexos duplicados), se conserva la de mayor confianza y se advierte.
 */
export function extractPriorYearForm210(
  representation: DocumentRepresentation,
): Form210PriorYearExtraction {
  const warnings: string[] = [...representation.warnings];
  const fullText = representation.pages.map((page) => page.normalizedText).join('\n');
  const detection = detectForm210(fullText);

  const byBoxNumber = new Map<number, ExtractedPriorYearBox>();
  for (const page of representation.pages) {
    for (const box of extractBoxesFromPage(page, warnings)) {
      const existing = byBoxNumber.get(box.boxNumber);
      if (!existing) {
        byBoxNumber.set(box.boxNumber, box);
        continue;
      }
      const confidenceRank = { high: 3, medium: 2, low: 1, insufficient: 0 } as const;
      if (confidenceRank[box.confidence] > confidenceRank[existing.confidence]) {
        warnings.push(
          `La casilla ${box.boxNumber} apareció más de una vez; se usó la de mayor confianza (página ${box.page}).`,
        );
        byBoxNumber.set(box.boxNumber, box);
      } else if (existing.normalizedValueCop !== box.normalizedValueCop) {
        warnings.push(
          `La casilla ${box.boxNumber} apareció con valores distintos en más de una página; se conservó la primera detectada (página ${existing.page}).`,
        );
      }
    }
  }
  const boxes = [...byBoxNumber.values()].sort((a, b) => a.boxNumber - b.boxNumber);
  if (!detection.isForm210) {
    warnings.push(
      'No se encontró evidencia estructural suficiente de que el documento sea un Formulario 210.',
    );
  }
  return { detection, boxes, warnings };
}
