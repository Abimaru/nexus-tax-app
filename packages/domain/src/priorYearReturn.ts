import { z } from 'zod';
import { TaxConfidenceSchema } from './taxClassification';
import { IsoTimestampSchema } from './primitives';

/**
 * Declaración de renta de un año anterior (Sprint 2.4, Fase B).
 *
 * Es evidencia histórica y fuente de ARRASTRES EXPLÍCITOS confirmados por el
 * analista (art. 807 ET — anticipo; art. 850 ET — saldo a favor); nunca es
 * una plantilla para copiar automáticamente la declaración del año actual.
 * Ningún valor histórico se traslada sin una decisión humana trazable.
 *
 * Todo es orientativo. NexusTax no verifica la exactitud de la declaración
 * anterior cargada por el usuario — solo la lee, la compara con el
 * expediente actual y ofrece candidatos de arrastre cuando corresponde.
 */
export const PriorYearReturnStatusSchema = z.enum([
  'submitted',
  'draft',
  'amended',
  'unknown',
]);
export type PriorYearReturnStatus = z.infer<typeof PriorYearReturnStatusSchema>;

/**
 * Rol de una casilla histórica frente al año actual. Determina si puede
 * ofrecerse como candidato de arrastre o si es solo contexto informativo.
 * Ninguna casilla se copia automáticamente solo por tener un rol asignado:
 * el rol únicamente habilita que la UI la muestre como candidata.
 */
export const PriorYearBoxRoleSchema = z.enum([
  /** Puede ofrecerse como candidato explícito para una casilla del año actual (p. ej. R133 → R130). */
  'carry_forward_candidate',
  /** Alimenta un cálculo del año actual pero no es un arrastre 1:1 de casilla a casilla. */
  'calculation_input',
  /** Solo se muestra como referencia histórica (comparación de evolución). */
  'historical_reference',
  /** Se usa exclusivamente para comparar magnitudes entre años (detección de escala/errores). */
  'comparison_only',
  /** Prellenar un campo de captura manual como sugerencia editable, no como valor confirmado. */
  'context_prefill',
  /** No debe reutilizarse de ninguna forma (p. ej. depende de reglas derogadas). */
  'not_reusable',
]);
export type PriorYearBoxRole = z.infer<typeof PriorYearBoxRoleSchema>;

export const PriorYearBoxExtractionMethodSchema = z.enum([
  'native_text',
  'geometry',
  'ocr',
  'manual',
]);
export type PriorYearBoxExtractionMethod = z.infer<typeof PriorYearBoxExtractionMethodSchema>;

export const PriorYearBoxValueSchema = z.object({
  boxNumber: z.number().int().positive(),
  rawValue: z.string().nullable(),
  normalizedValueCop: z.number().nullable(),
  extractionMethod: PriorYearBoxExtractionMethodSchema,
  confidence: TaxConfidenceSchema.or(z.literal('insufficient')),
  role: PriorYearBoxRoleSchema,
  /** Página del PDF donde se localizó la casilla, cuando aplica. */
  page: z.number().int().positive().nullable(),
  /** Fragmento de texto que respalda el valor (evidencia), nunca el PDF completo. */
  evidence: z.string().nullable(),
});
export type PriorYearBoxValue = z.infer<typeof PriorYearBoxValueSchema>;

export const PriorYearIdentityMatchSchema = z.enum(['match', 'mismatch', 'unknown']);
export type PriorYearIdentityMatch = z.infer<typeof PriorYearIdentityMatchSchema>;

export const PriorYearTaxReturnSchema = z.object({
  id: z.string().min(1),
  caseId: z.string().min(1),
  taxYear: z.number().int(),
  filingYear: z.number().int().nullable(),
  formType: z.literal('210'),
  formNumber: z.string().nullable(),
  /** Número del formulario que esta declaración corrige, si aplica. */
  previousFormNumber: z.string().nullable(),
  /** Documento del contribuyente ENMASCARADO (ver `maskDocumentNumber`); nunca completo. */
  taxpayerIdentityMasked: z.string().nullable(),
  submittedAt: IsoTimestampSchema.nullable(),
  /** Documento fuente en la biblioteca documental (`DocumentKind = 'prior_year_return'`). */
  sourceDocumentId: z.string().min(1),
  status: PriorYearReturnStatusSchema,
  /** Coincidencia de identidad contra el expediente actual. `mismatch` bloquea el uso como arrastre. */
  identityMatch: PriorYearIdentityMatchSchema,
  /**
   * Id de otra `PriorYearTaxReturn` que esta declaración reemplaza (declaración
   * corregida), o `null` si es la primera para ese año. Nunca se borra el
   * historial: ambas versiones se conservan.
   */
  replaces: z.string().nullable(),
  /** Id de la `PriorYearTaxReturn` que reemplazó a esta, si existe una corrección posterior. */
  replacedBy: z.string().nullable(),
  /** `true` cuando esta es la versión vigente para su año (la más reciente no reemplazada). */
  isCurrentVersion: z.boolean(),
  /** Casillas extraídas, indexadas por número de casilla como texto (claves de objeto JSON). */
  boxes: z.record(z.string(), PriorYearBoxValueSchema),
  extractionConfidence: TaxConfidenceSchema.or(z.literal('insufficient')),
  parserVersion: z.string().min(1),
  createdAt: IsoTimestampSchema,
  updatedAt: IsoTimestampSchema,
});
export type PriorYearTaxReturn = z.infer<typeof PriorYearTaxReturnSchema>;

export const PRIOR_YEAR_RETURN_SCHEMA_VERSION = '2.4.0';

/** Estado de un candidato de arrastre concreto entre un año anterior y el actual. */
export const CarryForwardDecisionSchema = z.enum([
  'confirmed',
  'corrected',
  'rejected',
  'source_replaced',
  'pending',
]);
export type CarryForwardDecision = z.infer<typeof CarryForwardDecisionSchema>;

/**
 * Candidato de arrastre trazable de una casilla del año anterior hacia una
 * casilla del año actual (Sprint 2.4, Fase B — p. ej. R133 → R130, R137 →
 * R131). Nunca se aplica automáticamente: `decision` inicia en `pending` y
 * solo pasa a `confirmed`/`corrected` por una acción explícita del analista.
 */
export const PriorYearCarryForwardCandidateSchema = z.object({
  id: z.string().min(1),
  caseId: z.string().min(1),
  priorYearReturnId: z.string().min(1),
  priorYearTaxYear: z.number().int(),
  sourceBoxNumber: z.number().int().positive(),
  targetBoxNumber: z.number().int().positive(),
  sourceValueCop: z.number().nullable(),
  /**
   * Solo para el arrastre de saldo a favor (R137 → R131, art. 850 ET):
   * respuesta del analista a "¿este saldo a favor fue solicitado en
   * devolución o compensación?". `null` cuando no aplica (p. ej. arrastre
   * de anticipo, que no requiere esta pregunta).
   */
  refundOrCompensationRequested: z.enum(['yes', 'no', 'unknown']).nullable(),
  decision: CarryForwardDecisionSchema,
  /** Valor final aplicado al año actual tras la decisión (puede diferir del sugerido si el analista lo corrige). */
  finalValueCop: z.number().nullable(),
  evidence: z.string(),
  decidedAt: IsoTimestampSchema.nullable(),
  createdAt: IsoTimestampSchema,
  updatedAt: IsoTimestampSchema,
});
export type PriorYearCarryForwardCandidate = z.infer<typeof PriorYearCarryForwardCandidateSchema>;
