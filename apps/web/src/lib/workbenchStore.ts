import { create } from 'zustand';
import type {
  ColumnMapping,
  ExogenousReportStructure,
  ProcessingProgress,
  ProcessingResult,
} from '@nexus-tax/domain';
import { validateFile } from '@nexus-tax/exogenous-parser';
import { createParserClient, type InspectResult, type ParserClient } from './processorClient';

/**
 * Estado del banco de trabajo de carga/inspección/procesamiento.
 * Es efímero (no se persiste): coordina la interacción hasta que el resultado
 * se guarda en IndexedDB. La lógica de parsing vive en el paquete, no aquí.
 */

export type WorkbenchPhase = 'idle' | 'inspecting' | 'inspected' | 'processing' | 'done' | 'error';

interface WorkbenchState {
  client: ParserClient | null;
  phase: WorkbenchPhase;
  fileName: string | null;
  fileSize: number;
  inspect: InspectResult | null;

  selectedSheet: string | null;
  headerRowIndex: number | null;
  columnMapping: ColumnMapping | null;
  structure: ExogenousReportStructure | null;

  progress: ProcessingProgress | null;
  result: ProcessingResult | null;
  error: string | null;

  startInspection: (file: File) => Promise<void>;
  setSheet: (sheetName: string) => void;
  setHeaderRow: (index: number) => void;
  setColumnMapping: (mapping: ColumnMapping) => void;
  setStructure: (structure: ExogenousReportStructure) => void;
  runProcessing: () => Promise<ProcessingResult | null>;
  cancel: () => void;
  reset: () => void;
}

function ensureClient(
  get: () => WorkbenchState,
  set: (partial: Partial<WorkbenchState>) => void,
): ParserClient {
  let client = get().client;
  if (!client) {
    client = createParserClient();
    set({ client });
  }
  return client;
}

export const useWorkbenchStore = create<WorkbenchState>((set, get) => ({
  client: null,
  phase: 'idle',
  fileName: null,
  fileSize: 0,
  inspect: null,
  selectedSheet: null,
  headerRowIndex: null,
  columnMapping: null,
  structure: null,
  progress: null,
  result: null,
  error: null,

  async startInspection(file) {
    const validation = validateFile({ name: file.name, size: file.size, type: file.type });
    if (!validation.ok) {
      set({
        phase: 'error',
        error: validation.errors.join(' '),
        fileName: file.name,
        fileSize: file.size,
      });
      return;
    }

    set({
      phase: 'inspecting',
      error: null,
      fileName: file.name,
      fileSize: file.size,
      inspect: null,
      result: null,
      progress: null,
    });

    try {
      const client = ensureClient(get, set);
      const inspect = await client.inspect(file);
      const firstWithData =
        inspect.metadata.sheets.find((s) => !s.isEmpty) ?? inspect.metadata.sheets[0];
      set({
        phase: 'inspected',
        inspect,
        selectedSheet: firstWithData?.name ?? null,
        headerRowIndex: null,
        columnMapping: null,
        structure: null,
      });
    } catch (error) {
      set({
        phase: 'error',
        error: error instanceof Error ? error.message : 'Error al leer el archivo.',
      });
    }
  },

  setSheet(sheetName) {
    // Cambiar de hoja invalida el mapeo/encabezado manual previos.
    set({ selectedSheet: sheetName, headerRowIndex: null, columnMapping: null, structure: null });
  },

  setHeaderRow(index) {
    set({ headerRowIndex: index, structure: null });
  },

  setColumnMapping(mapping) {
    set({ columnMapping: mapping, structure: null });
  },

  setStructure(structure) {
    set({ structure });
  },

  async runProcessing() {
    const { selectedSheet, headerRowIndex, columnMapping, structure } = get();
    const client = ensureClient(get, set);
    set({ phase: 'processing', error: null, progress: null });
    try {
      const result = await client.process(
        {
          sheetName: selectedSheet ?? undefined,
          headerRowIndex: headerRowIndex ?? undefined,
          columnMapping: columnMapping ?? undefined,
          structure: structure ?? undefined,
        },
        (progress) => set({ progress }),
      );
      set({ phase: 'done', result });
      return result;
    } catch (error) {
      set({ phase: 'error', error: error instanceof Error ? error.message : 'Error al procesar.' });
      return null;
    }
  },

  cancel() {
    get().client?.cancel();
    set({ phase: 'inspected', progress: null });
  },

  reset() {
    get().client?.dispose();
    set({
      client: null,
      phase: 'idle',
      fileName: null,
      fileSize: 0,
      inspect: null,
      selectedSheet: null,
      headerRowIndex: null,
      columnMapping: null,
      structure: null,
      progress: null,
      result: null,
      error: null,
    });
  },
}));
