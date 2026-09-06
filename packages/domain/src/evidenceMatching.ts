import { z } from 'zod';
import { IsoTimestampSchema } from './primitives';
import { TaxCategorySchema, TaxNatureSchema, TaxTreatmentSchema } from './taxClassification';

/**
 * Evidence Matching & Guided Reconciliation (Sprint 2.4, Fase E).
 *
 * Separa explícitamente las etapas del flujo (§2 del prompt de Fase E):
 *
 *   Evidence Extraction → Evidence Classification → Evidence Matching
 *   → Guided Review → Human Decision → Tax Fact / Reconciliation
 *
 * Este archivo modela las etapas de CLASIFICACIÓN y de PRESENTACIÓN
 * (Guided Review). La extracción vive en `packages/document-intelligence`
 * (adaptadores + `parseMoneyAmount`); el hecho tributario confirmado sigue
 * viviendo en `taxDossier.ts` (`DocumentFact`) y en `PreliminaryReconciliation`
 * — esta fase NUNCA crea un tercer lugar para el dato confirmado, solo
 * clasifica y prioriza lo que ya existe antes de llegar ahí.
 */

/**
 * Rol de un token numérico detectado en un documento. Solo `money` (y,
 * bajo condiciones controladas, `unknown`) se promueven a candidatos
 * monetarios revisables; el resto se clasifica y se conserva como
 * evidencia inspeccionable (nunca se descarta físicamente, §6).
 */
export const NumericEvidenceRoleSchema = z.enum([
  'money',
  'tax_identifier',
  'personal_identifier',
  'account_number',
  'document_reference',
  'legal_reference',
  'date',
  'year',
  'percentage',
  'quantity',
  'page_number',
  'unknown',
]);
export type NumericEvidenceRole = z.infer<typeof NumericEvidenceRoleSchema>;

export const NumericEvidenceConfidenceSchema = z.enum(['high', 'medium', 'low']);
export type NumericEvidenceConfidence = z.infer<typeof NumericEvidenceConfidenceSchema>;

/**
 * Estado de conciliación documento↔exógena a nivel de candidato (Sprint
 * 2.4, Fase E). Evolucionado desde el enum original (`strong_match`,
 * `probable_match`, `multiple_candidates`, `no_match`,
 * `possible_contradiction`) para distinguir explícitamente el redondeo
 * (`rounding_match`) de una coincidencia meramente probable, y para
 * nombrar la ambigüedad como estado propio (`ambiguous`) en vez de una
 * variante de "múltiples candidatos" sin más contexto. Ver
 * `docs/EVIDENCE_MATCHING.md` §9. Vive aquí (no en `documentExtraction.ts`)
 * porque es vocabulario de EMPAREJAMIENTO, reutilizado también por
 * `EvidenceReviewSuggestion` más abajo.
 *
 * - `exact_match`: valor fiscal idéntico.
 * - `rounding_match`: el valor decimal documental redondea exactamente al
 *   valor DIAN (`Math.round(decimalValue) === exogenousValue`).
 * - `minor_difference`: diferencia pequeña según la política central
 *   (no derivada de redondeo simple).
 * - `possible_match`: varias señales coinciden pero el monto no permite
 *   confirmar.
 * - `ambiguous`: dos o más candidatos empatan; requiere elección humana.
 * - `contradiction`: la diferencia es relevante y contradice el dato
 *   documental.
 * - `no_match`: sin relación suficiente.
 *
 * Solo `exact_match`/`rounding_match` habilitan la confirmación en bloque
 * (§27); ninguno de estos estados se autoconfirma sin una acción humana.
 */
export const CandidateExogenousMatchStatusSchema = z.enum([
  'exact_match',
  'rounding_match',
  'minor_difference',
  'possible_match',
  'ambiguous',
  'contradiction',
  'no_match',
]);
export type CandidateExogenousMatchStatus = z.infer<typeof CandidateExogenousMatchStatusSchema>;

/**
 * Resultado de clasificar un token numérico según su contexto (línea,
 * palabras cercanas, señales negativas). Se conserva SIEMPRE, incluso
 * cuando el rol es ruido (`tax_identifier`, `year`, etc.) — es evidencia
 * inspeccionable en modo avanzado/laboratorio, nunca se elimina (§6).
 */
export const NumericEvidenceClassificationSchema = z.object({
  raw: z.string().min(1),
  role: NumericEvidenceRoleSchema,
  confidence: NumericEvidenceConfidenceSchema,
  reasons: z.array(z.string()),
  page: z.number().int().positive().nullable(),
  /** Línea o fragmento de contexto (acotado, evidencia — no el documento completo). */
  lineExcerpt: z.string().max(200),
});
export type NumericEvidenceClassification = z.infer<typeof NumericEvidenceClassificationSchema>;

/**
 * Origen genérico de una expectativa (§14 del prompt): hoy solo se deriva
 * de la exógena, pero el contrato NO depende de ella. Mañana puede
 * originarse de una declaración anterior, un requisito documental, otro
 * certificado o una captura manual — `document-intelligence` nunca debe
 * volverse un paquete DIAN-only.
 */
export const ExpectedTaxEvidenceSourceKindSchema = z.enum([
  'exogenous_record',
  'prior_year_return',
  'requirement',
  'manual',
]);
export type ExpectedTaxEvidenceSourceKind = z.infer<typeof ExpectedTaxEvidenceSourceKindSchema>;

/**
 * "El expediente espera encontrar esto" (§13): invierte parcialmente el
 * flujo de "documento → qué encontré" a "expediente → qué estoy
 * buscando". Es un contrato PURO y genérico — no un tipo de exógena.
 */
export const ExpectedTaxEvidenceSchema = z.object({
  id: z.string().min(1),
  caseId: z.string().min(1),
  sourceKind: ExpectedTaxEvidenceSourceKindSchema,
  /** id del registro/requisito/declaración de origen, para trazabilidad. */
  sourceId: z.string().min(1),
  entityId: z.string().nullable(),
  entityName: z.string().nullable(),
  conceptLabel: z.string().min(1),
  category: TaxCategorySchema,
  /**
   * Naturaleza y tratamiento propuestos por la clasificación tributaria
   * v1 del registro de origen (§20): se conservan aquí para que la
   * captura manual guiada NUNCA tenga que volver a preguntarlos —ya están
   * implícitos en la expectativa que originó la captura.
   */
  nature: TaxNatureSchema,
  treatment: TaxTreatmentSchema,
  /** Valor que el expediente espera encontrar respaldado documentalmente. Nulo si solo se espera el concepto, sin monto conocido. */
  expectedValueCop: z.number().nullable(),
  period: z.string().nullable(),
});
export type ExpectedTaxEvidence = z.infer<typeof ExpectedTaxEvidenceSchema>;

/**
 * Estado humano de una sugerencia de revisión guiada (§15). Nunca se
 * presenta un score crudo al usuario (§11): estos estados y sus razones
 * legibles son la única superficie visible en modo normal.
 */
export const EvidenceReviewSuggestionStatusSchema = z.enum([
  'matched',
  'likely_match',
  'needs_review',
  'new_relevant_value',
  'unresolved',
]);
export type EvidenceReviewSuggestionStatus = z.infer<typeof EvidenceReviewSuggestionStatusSchema>;

/** Acciones humanas permitidas sobre una sugerencia, usadas por la UI para decidir qué botones mostrar. */
export const EvidenceReviewActionSchema = z.enum([
  'confirm',
  'choose_alternative',
  'correct_value',
  'capture_manually',
  'mark_new_value',
  'dismiss',
]);
export type EvidenceReviewAction = z.infer<typeof EvidenceReviewActionSchema>;

/**
 * Presentación consolidada de una comparación candidato↔expectativa,
 * lista para la Guided Review (§15-18). Nunca se autoconfirma
 * `needs_review`/`unresolved` (§9): siempre requiere una acción humana
 * explícita, incluso cuando `status: 'matched'` (la confirmación en sí
 * sigue siendo un clic humano, solo que se ofrece "confirmar coincidencias
 * claras" en bloque para las de mayor confianza, §27).
 */
export const EvidenceReviewSuggestionSchema = z.object({
  id: z.string().min(1),
  caseId: z.string().min(1),
  expectedEvidenceId: z.string().nullable(),
  /** Candidato principal sugerido; puede haber alternativas en `alternativeCandidateIds` cuando hay ambigüedad. */
  candidateId: z.string().nullable(),
  alternativeCandidateIds: z.array(z.string()),
  status: EvidenceReviewSuggestionStatusSchema,
  /**
   * Estado granular del matcher (`CandidateExogenousMatchStatus`) que
   * originó `status`. Se conserva para que confirmar la sugerencia pueda
   * derivar el estado de `PreliminaryReconciliation` correcto sin
   * recalcular el emparejamiento; nulo quando no hay un match subyacente
   * (`unresolved`/`new_relevant_value`).
   */
  matchStatus: CandidateExogenousMatchStatusSchema.nullable(),
  reasons: z.array(z.string()),
  documentValueCop: z.number().nullable(),
  expectedValueCop: z.number().nullable(),
  differenceCop: z.number().nullable(),
  differencePercentage: z.number().nullable(),
  /** `true` solo para exact_match/rounding_match sin anomalías — habilita la confirmación en bloque (§27). */
  safeForBulkConfirm: z.boolean(),
  allowedActions: z.array(EvidenceReviewActionSchema),
  createdAt: IsoTimestampSchema,
});
export type EvidenceReviewSuggestion = z.infer<typeof EvidenceReviewSuggestionSchema>;

export const EVIDENCE_MATCHING_SCHEMA_VERSION = '2.4.0';
