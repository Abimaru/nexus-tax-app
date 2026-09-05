'use client';

import type { DocumentStorageMode, PriorYearTaxReturn, TaxCase } from '@nexus-tax/domain';
import {
  PdfReadError,
  extractPriorYearForm210,
  readPdfText,
  type Form210PriorYearExtraction,
} from '@nexus-tax/document-intelligence';
import { addCaseDocument } from './repository';
import { newId, nowIso } from './id';
import { roleForPriorYearBox } from './priorYearBoxLabels';

export { priorYearBoxLabel, PRIOR_YEAR_BOX_LABELS } from './priorYearBoxLabels';

/**
 * Orquestación de la carga de declaraciones anteriores (Sprint 2.4, Fase B1).
 *
 * Reutiliza el mismo lector PDF local (`readPdfText`) y el parser puro
 * `extractPriorYearForm210` ya probados en `@nexus-tax/document-intelligence`
 * y `packages/document-intelligence/tests/form210PriorYear.test.ts`. No se
 * crea un segundo parser en React: este módulo solo orquesta lectura →
 * extracción → construcción del contrato de dominio, todo en el navegador.
 */

const PARSER_VERSION = 'form210-prior-year-1.0.0';

export interface PriorYearUploadResult {
  documentId: string;
  extraction: Form210PriorYearExtraction;
  /** `DocumentPageRepresentation.readConfidence` mínimo entre las páginas leídas. */
  lowestReadConfidence: 'high' | 'medium' | 'low' | 'insufficient';
}

export class PriorYearUploadError extends Error {
  constructor(
    message: string,
    readonly code: 'password_required' | 'incorrect_password' | 'invalid_pdf' | 'cancelled',
  ) {
    super(message);
  }
}

/**
 * Lee un PDF de declaración anterior localmente, lo registra como documento
 * (`DocumentKind = 'prior_year_return'`) y extrae sus casillas. NO guarda
 * todavía la `PriorYearTaxReturn`: eso requiere confirmación humana del año
 * y la identidad (`buildPriorYearReturnFromExtraction` + `savePriorYearReturn`).
 */
export async function processPriorYearReturnUpload(input: {
  caseId: string;
  file: File;
  password?: string;
  storageMode: DocumentStorageMode;
  /** Año usado para registrar el documento cuando el parser no detecta el año gravable. */
  fallbackTaxYear: number;
  signal?: AbortSignal;
}): Promise<PriorYearUploadResult> {
  const bytes = await input.file.arrayBuffer();
  let representation;
  try {
    representation = await readPdfText(bytes, {
      password: input.password,
      browserModuleUrl: '/vendor/pdfjs/pdf.mjs',
      workerSrc: '/vendor/pdfjs/pdf.worker.mjs',
      signal: input.signal,
    });
  } catch (error) {
    if (error instanceof PdfReadError) {
      throw new PriorYearUploadError(error.message, error.code as PriorYearUploadError['code']);
    }
    throw new PriorYearUploadError('No fue posible leer el archivo localmente.', 'invalid_pdf');
  }
  const extraction = extractPriorYearForm210(representation);
  const document = await addCaseDocument(input.caseId, input.file, {
    kind: 'prior_year_return',
    storageMode: input.storageMode,
    taxYear: extraction.detection.taxYear ?? input.fallbackTaxYear,
    notes: 'Declaración de años anteriores (Sprint 2.4).',
  });
  const confidenceRank = { high: 3, medium: 2, low: 1, insufficient: 0 } as const;
  const lowestReadConfidence = representation.pages.reduce<
    'high' | 'medium' | 'low' | 'insufficient'
  >(
    (lowest, page) => (confidenceRank[page.readConfidence] < confidenceRank[lowest] ? page.readConfidence : lowest),
    'high',
  );
  return { documentId: document.id, extraction, lowestReadConfidence };
}

/** Compara la identidad detectada en el PDF contra la del expediente actual. */
export function checkPriorYearIdentity(
  taxCase: Pick<TaxCase, 'taxpayer'>,
  detection: Form210PriorYearExtraction['detection'],
): 'match' | 'mismatch' | 'unknown' {
  const caseIdentity = taxCase.taxpayer.documentMasked;
  const priorIdentity = detection.taxpayerIdentityMasked;
  if (!caseIdentity || !priorIdentity) return 'unknown';
  // Ambos ya están enmascarados con el mismo patrón (••••NNNN): comparamos
  // los últimos dígitos visibles, la única evidencia disponible sin
  // rehidratar el documento completo.
  const caseVisible = caseIdentity.replace(/[^0-9]/g, '');
  const priorVisible = priorIdentity.replace(/[^0-9]/g, '');
  if (!caseVisible || !priorVisible) return 'unknown';
  return caseVisible === priorVisible ? 'match' : 'mismatch';
}

/**
 * Construye el contrato `PriorYearTaxReturn` a partir de la extracción y la
 * confirmación humana de año/identidad. `replaces` se usa cuando el
 * analista indica explícitamente que esta declaración corrige otra ya
 * cargada (nunca se infiere automáticamente).
 */
export function buildPriorYearReturnFromExtraction(input: {
  caseId: string;
  documentId: string;
  extraction: Form210PriorYearExtraction;
  identityMatch: 'match' | 'mismatch' | 'unknown';
  confirmedTaxYear: number;
  replaces?: string | null;
}): PriorYearTaxReturn {
  const timestamp = nowIso();
  const { detection, boxes } = input.extraction;
  const boxesRecord: PriorYearTaxReturn['boxes'] = {};
  for (const box of boxes) {
    boxesRecord[String(box.boxNumber)] = {
      boxNumber: box.boxNumber,
      rawValue: box.rawValue,
      normalizedValueCop: box.normalizedValueCop,
      extractionMethod: box.extractionMethod,
      confidence: box.confidence,
      role: roleForPriorYearBox(box.boxNumber),
      page: box.page,
      evidence: box.evidence,
    };
  }
  const overallConfidence: PriorYearTaxReturn['extractionConfidence'] =
    boxes.length === 0
      ? 'insufficient'
      : boxes.every((box) => box.confidence === 'high')
        ? 'high'
        : boxes.some((box) => box.confidence === 'insufficient')
          ? 'low'
          : 'medium';
  return {
    id: newId('prior-return'),
    caseId: input.caseId,
    taxYear: input.confirmedTaxYear,
    filingYear: detection.filingYear,
    formType: '210',
    formNumber: detection.formNumber,
    previousFormNumber: detection.previousFormNumber,
    taxpayerIdentityMasked: detection.taxpayerIdentityMasked,
    submittedAt: detection.submittedAt,
    sourceDocumentId: input.documentId,
    status: detection.statusGuess,
    identityMatch: input.identityMatch,
    replaces: input.replaces ?? null,
    replacedBy: null,
    isCurrentVersion: true,
    boxes: boxesRecord,
    extractionConfidence: overallConfidence,
    parserVersion: PARSER_VERSION,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}
