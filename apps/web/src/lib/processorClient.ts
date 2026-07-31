import type {
  ColumnMapping,
  ExogenousReportStructure,
  ProcessingProgress,
  ProcessingResult,
  WorkbookMetadata,
} from '@nexus-tax/domain';
import { PROCESSING_LIMITS } from '@nexus-tax/config';
import {
  inspectWorkbookSheets,
  readWorkbookFile,
  processSheet,
  type ReadWorkbookResult,
  type SheetInspection,
} from '@nexus-tax/exogenous-parser';
import type { WorkerRequest, WorkerResponse } from '@/workers/parser.worker';

/**
 * Cliente del parser. Usa un Web Worker cuando está disponible (§13) y cae con
 * elegancia a procesamiento en el hilo principal si el worker no puede crearse.
 */

export interface InspectResult {
  metadata: WorkbookMetadata;
  previews: SheetInspection[];
}

export interface ProcessRequestOptions {
  sheetName?: string;
  headerRowIndex?: number;
  columnMapping?: ColumnMapping;
  structure?: ExogenousReportStructure;
}

const PREVIEW_ROWS = PROCESSING_LIMITS.maxHeaderScanRows + PROCESSING_LIMITS.previewRowCount;

export interface ParserClient {
  inspect(file: File): Promise<InspectResult>;
  process(
    options: ProcessRequestOptions,
    onProgress?: (p: ProcessingProgress) => void,
  ): Promise<ProcessingResult>;
  cancel(): void;
  dispose(): void;
  readonly usesWorker: boolean;
}

/* -------------------------------------------------------------------------- */
/*  Implementación con Web Worker                                             */
/* -------------------------------------------------------------------------- */
class WorkerParserClient implements ParserClient {
  readonly usesWorker = true;
  private worker: Worker;
  private onProgress?: (p: ProcessingProgress) => void;
  private pending?: {
    resolve: (value: unknown) => void;
    reject: (reason: Error) => void;
    kind: 'inspect' | 'process';
  };

  constructor() {
    this.worker = this.spawn();
  }

  private spawn(): Worker {
    const worker = new Worker(new URL('../workers/parser.worker.ts', import.meta.url), {
      type: 'module',
    });
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => this.handle(event.data);
    worker.onerror = (event) => {
      this.pending?.reject(new Error(event.message || 'Error en el worker del parser.'));
      this.pending = undefined;
    };
    return worker;
  }

  private handle(message: WorkerResponse): void {
    if (message.type === 'progress') {
      this.onProgress?.(message.progress);
      return;
    }
    const pending = this.pending;
    if (!pending) return;

    if (message.type === 'error') {
      pending.reject(new Error(message.message));
      this.pending = undefined;
      return;
    }
    if (message.type === 'inspected' && pending.kind === 'inspect') {
      pending.resolve({ metadata: message.metadata, previews: message.previews });
      this.pending = undefined;
      return;
    }
    if (message.type === 'processed' && pending.kind === 'process') {
      pending.resolve(message.result);
      this.pending = undefined;
    }
  }

  private post(request: WorkerRequest, transfer?: Transferable[]): void {
    this.worker.postMessage(request, transfer ?? []);
  }

  async inspect(file: File): Promise<InspectResult> {
    const buffer = await file.arrayBuffer();
    return new Promise<InspectResult>((resolve, reject) => {
      this.pending = { resolve: resolve as (v: unknown) => void, reject, kind: 'inspect' };
      this.post(
        {
          type: 'inspect',
          buffer,
          fileName: file.name,
          size: file.size,
          previewRowLimit: PREVIEW_ROWS,
        },
        [buffer],
      );
    });
  }

  process(
    options: ProcessRequestOptions,
    onProgress?: (p: ProcessingProgress) => void,
  ): Promise<ProcessingResult> {
    this.onProgress = onProgress;
    return new Promise<ProcessingResult>((resolve, reject) => {
      this.pending = { resolve: resolve as (v: unknown) => void, reject, kind: 'process' };
      this.post({
        type: 'process',
        sheetName: options.sheetName,
        headerRowIndex: options.headerRowIndex,
        columnMapping: options.columnMapping,
        structure: options.structure,
      });
    });
  }

  cancel(): void {
    this.pending?.reject(new Error('Procesamiento cancelado.'));
    this.pending = undefined;
    this.worker.terminate();
    this.worker = this.spawn();
  }

  dispose(): void {
    this.worker.terminate();
  }
}

/* -------------------------------------------------------------------------- */
/*  Fallback en hilo principal                                                */
/* -------------------------------------------------------------------------- */
class MainThreadParserClient implements ParserClient {
  readonly usesWorker = false;
  private lastRead: ReadWorkbookResult | null = null;
  private cancelled = false;

  async inspect(file: File): Promise<InspectResult> {
    this.cancelled = false;
    const buffer = await file.arrayBuffer();
    const read = readWorkbookFile(buffer, file.name, file.size);
    this.lastRead = read;
    const previews = inspectWorkbookSheets(read, PREVIEW_ROWS, PROCESSING_LIMITS.maxHeaderScanRows);
    return { metadata: read.metadata, previews };
  }

  async process(
    options: ProcessRequestOptions,
    onProgress?: (p: ProcessingProgress) => void,
  ): Promise<ProcessingResult> {
    if (!this.lastRead) throw new Error('No hay un libro leído para procesar.');
    if (this.cancelled) throw new Error('Procesamiento cancelado.');
    // Cede el hilo para permitir que la UI pinte el progreso inicial.
    await new Promise((resolve) => setTimeout(resolve, 0));
    return processSheet(this.lastRead, {
      sheetName: options.sheetName,
      headerRowIndex: options.headerRowIndex,
      columnMapping: options.columnMapping,
      structure: options.structure,
      onProgress,
    });
  }

  cancel(): void {
    this.cancelled = true;
  }

  dispose(): void {
    this.lastRead = null;
  }
}

/** Crea el mejor cliente disponible en el entorno actual. */
export function createParserClient(): ParserClient {
  if (typeof window !== 'undefined' && typeof Worker !== 'undefined') {
    try {
      return new WorkerParserClient();
    } catch {
      // Si el worker no puede crearse, se usa el hilo principal.
    }
  }
  return new MainThreadParserClient();
}
