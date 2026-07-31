/**
 * @nexus-tax/config
 * ------------------
 * Constantes compartidas y sin dependencias del proyecto NexusTax.
 * No contiene lógica de negocio ni parsing. Solo configuración estable.
 */

/** Identidad de producto. Centralizada para evitar cadenas mágicas en la UI. */
export const APP_IDENTITY = {
  name: 'NexusTax',
  subtitle: 'Estación personal de análisis tributario',
  futureEngine: 'Aegis Engine',
  country: 'Colombia',
  locale: 'es-CO',
  currency: 'COP',
} as const;

/**
 * Límites de procesamiento configurables (Sprint 1).
 * El tamaño de archivo se controla en la capa de carga para evitar
 * bloquear el navegador con libros excesivamente grandes.
 */
export const PROCESSING_LIMITS = {
  /** Tamaño máximo del archivo Excel admitido (bytes). 25 MB por defecto. */
  maxFileSizeBytes: 25 * 1024 * 1024,
  /** Número máximo de filas que se renderizan sin virtualización directa. */
  maxRenderRows: 200,
  /** Filas máximas inspeccionadas al detectar la fila de encabezados. */
  maxHeaderScanRows: 25,
  /** Filas de vista previa mostradas en la inspección del libro. */
  previewRowCount: 20,
  /** Umbral de dígitos a partir del cual un número se trata como identificador. */
  identifierDigitThreshold: 12,
  /** Tiempo máximo (ms) antes de considerar el procesamiento como bloqueado. */
  processingTimeoutMs: 60_000,
  /** Intervalo (ms) para emitir señales de actividad en procesos largos. */
  heartbeatIntervalMs: 30_000,
} as const;

/** Formatos de archivo admitidos por el parser de exógena. */
export const SUPPORTED_FILE_EXTENSIONS = ['.xlsx', '.xls'] as const;
export const SUPPORTED_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
] as const;

/**
 * Tokens de marca. Se consumen desde Tailwind/CSS. Se declaran aquí para que
 * documentación y componentes compartan una sola fuente de verdad.
 */
export const BRAND_TOKENS = {
  accents: {
    cyan: '#22d3ee',
    electricBlue: '#3b82f6',
    violet: '#8b5cf6',
  },
  surfaces: {
    base: '#070b16',
    raised: '#0d1424',
    glass: 'rgba(19, 27, 46, 0.55)',
  },
} as const;

/** Años gravables razonables para el selector. Rango deliberadamente acotado. */
export const TAX_YEAR_RANGE = {
  min: 2018,
  max: 2035,
} as const;

export type AppIdentity = typeof APP_IDENTITY;
export type ProcessingLimits = typeof PROCESSING_LIMITS;
