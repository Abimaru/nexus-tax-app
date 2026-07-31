/// <reference lib="webworker" />
import {
  inspectWorkbookSheets,
  readWorkbookFile,
  processSheet,
  type ReadWorkbookResult,
  type SheetInspection,
} from '@nexus-tax/exogenous-parser';
import { PROCESSING_LIMITS } from '@nexus-tax/config';
import type {
  ExogenousReportStructure,
  ProcessingProgress,
  ProcessingResult,
  WorkbookMetadata,
} from '@nexus-tax/domain';

/**
 * Web Worker del parser (§13): mantiene el hilo principal libre.
 * Conserva en memoria el último libro leído para reprocesar con distintas
 * opciones (hoja, encabezado, mapeo) sin volver a transferir el archivo.
 */

export type WorkerRequest =
  | {
      type: 'inspect';
      buffer: ArrayBuffer;
      fileName: string;
      size: number;
      previewRowLimit: number;
    }
  | {
      type: 'process';
      sheetName?: string;
      headerRowIndex?: number;
      columnMapping?: Record<string, string>;
      structure?: ExogenousReportStructure;
    }
  | { type: 'reset' };

export type WorkerResponse =
  | { type: 'inspected'; metadata: WorkbookMetadata; previews: SheetInspection[] }
  | { type: 'progress'; progress: ProcessingProgress }
  | { type: 'processed'; result: ProcessingResult }
  | { type: 'error'; message: string };

let lastRead: ReadWorkbookResult | null = null;

const ctx = self as unknown as DedicatedWorkerGlobalScope;

ctx.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const message = event.data;
  try {
    if (message.type === 'reset') {
      lastRead = null;
      return;
    }

    if (message.type === 'inspect') {
      lastRead = readWorkbookFile(message.buffer, message.fileName, message.size);
      const response: WorkerResponse = {
        type: 'inspected',
        metadata: lastRead.metadata,
        previews: inspectWorkbookSheets(
          lastRead,
          message.previewRowLimit,
          PROCESSING_LIMITS.maxHeaderScanRows,
        ),
      };
      ctx.postMessage(response);
      return;
    }

    if (message.type === 'process') {
      if (!lastRead) {
        ctx.postMessage({ type: 'error', message: 'No hay un libro leído para procesar.' });
        return;
      }
      const result = processSheet(lastRead, {
        sheetName: message.sheetName,
        headerRowIndex: message.headerRowIndex,
        columnMapping: message.columnMapping,
        structure: message.structure,
        onProgress: (progress) => ctx.postMessage({ type: 'progress', progress }),
      });
      ctx.postMessage({ type: 'processed', result });
    }
  } catch (error) {
    const messageText = error instanceof Error ? error.message : 'Error desconocido en el parser.';
    ctx.postMessage({ type: 'error', message: messageText });
  }
};
