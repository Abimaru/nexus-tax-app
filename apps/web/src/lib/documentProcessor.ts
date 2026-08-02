import type {
  CaseProduct,
  DocumentKind,
  ProcessingResult,
  UploadedDocument,
} from '@nexus-tax/domain';
import {
  PdfReadError,
  analyzePdfDocument,
  extractionFailureFinding,
  type DocumentProgressEvent,
} from '@nexus-tax/document-intelligence';
import {
  completeExtractionSession,
  createExtractionSession,
  failExtractionSession,
  getDocumentBinary,
} from './repository';

export async function processDocumentLocally(input: {
  document: UploadedDocument;
  file?: { arrayBuffer: () => Promise<ArrayBuffer> };
  password?: string;
  forcedKind?: DocumentKind;
  result?: ProcessingResult;
  products?: readonly CaseProduct[];
  signal?: AbortSignal;
  onProgress?: (event: DocumentProgressEvent) => void;
}) {
  const session = await createExtractionSession(input.document.caseId, input.document.id);
  try {
    const stored = input.file ? undefined : await getDocumentBinary(input.document.id);
    const bytes = input.file ? await input.file.arrayBuffer() : stored?.bytes;
    if (!bytes) {
      throw new PdfReadError(
        'invalid_pdf',
        'El archivo no se conservó. Vuelve a seleccionarlo para reprocesar; los resultados anteriores permanecen.',
      );
    }
    const entity = input.result?.entities.find((item) =>
      input.document.entityIds.includes(item.id),
    );
    const analysis = await analyzePdfDocument({
      caseId: input.document.caseId,
      documentId: input.document.id,
      sessionId: session.id,
      timestamp: session.startedAt,
      bytes,
      password: input.password,
      forcedKind: input.forcedKind ?? input.document.kind,
      browserModuleUrl: '/vendor/pdfjs/pdf.mjs',
      workerSrc: '/vendor/pdfjs/pdf.worker.mjs',
      signal: input.signal,
      entities: input.result?.entities,
      requirements: input.result?.requirements,
      exogenousRecords: input.result?.normalizedRecords,
      products: input.products,
      documentEntityIds: input.document.entityIds,
      entityId: entity?.id ?? input.document.entityIds[0] ?? null,
      entityName: entity?.name ?? null,
      requirementIds: input.document.coveredRequirementIds,
      onProgress: input.onProgress,
    });
    await completeExtractionSession({
      sessionId: session.id,
      pageCount: analysis.representation.pageCount,
      readablePageCount: analysis.representation.pages.filter((page) => page.normalizedText).length,
      metrics: analysis.metrics,
      classification: analysis.classification,
      adapterId: analysis.adapter.id,
      adapterVersion: analysis.adapter.version,
      findings: analysis.findings,
      candidates: analysis.candidates,
    });
    return session.id;
  } catch (error) {
    const finding = extractionFailureFinding(error);
    const code = error instanceof PdfReadError ? error.code : 'invalid_pdf';
    await failExtractionSession(session.id, {
      status:
        code === 'password_required' || code === 'incorrect_password'
          ? 'password_required'
          : code === 'no_text'
            ? 'unsupported'
            : code === 'cancelled'
              ? 'cancelled'
              : 'failed',
      errorCode: code,
      errorMessage: finding.message,
      finding,
    });
    throw error;
  }
}
