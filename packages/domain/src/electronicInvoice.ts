import { z } from 'zod';
import { IsoTimestampSchema } from './primitives';
import { AmountCandidateSchema } from './money';

/**
 * Reporte DIAN de facturación electrónica (Sprint 2.4, Fase D).
 *
 * Modela el reporte de compras soportadas con factura electrónica que el
 * contribuyente descarga del portal DIAN. Es una fuente estructurada
 * distinta a la exógena (`ExogenousReport`): no comparte su semántica de
 * topes/secciones, aunque reutiliza la misma infraestructura de lectura de
 * workbook (`fullRows`, detección de encabezado por señales de contenido).
 *
 * El reporte conserva CADA factura individual con su CUFE, notas
 * crédito/débito y valor susceptible de beneficio — evidencia que la
 * exógena (Tope 5, agregado) no ofrece. La conciliación entre ambas fuentes
 * vive en `ElectronicInvoiceReconciliation` (ver
 * `docs/ELECTRONIC_INVOICE_REPORT_2025.md`).
 *
 * Cada columna monetaria original se conserva como `AmountCandidate`
 * (parser monetario central v2.0.0 de `@nexus-tax/document-intelligence`):
 * nunca se descarta el texto crudo ni la confianza de interpretación.
 */

export const ELECTRONIC_INVOICE_SCHEMA_VERSION = '2.4.0';

/** Fuente estructurada distintiva: nunca se trata como "XLSX genérico". */
export const ELECTRONIC_INVOICE_SOURCE_KIND = 'dian_electronic_invoice_report' as const;

export const PAYMENT_METHOD_CATEGORIES = [
  'electronic',
  'cash',
  'other',
  'data_error',
  'not_informed',
] as const;
export const PaymentMethodCategorySchema = z.enum(PAYMENT_METHOD_CATEGORIES);
export type PaymentMethodCategory = z.infer<typeof PaymentMethodCategorySchema>;

/**
 * Estado de deduplicación por CUFE. `duplicate_conflicting` bloquea la
 * consolidación automática del importe afectado (Sección 8 del prompt de
 * Fase D): nunca se resuelve solo, requiere revisión humana.
 */
export const CufeStatusSchema = z.enum([
  'unique',
  'duplicate_exact',
  'duplicate_conflicting',
  'missing_cufe',
  'requires_review',
]);
export type CufeStatus = z.infer<typeof CufeStatusSchema>;

/**
 * Estado de la validación `neto = bruto + notas_débito - notas_crédito`
 * contra la columna neta oficial del reporte (cuando existe). Nunca se
 * reemplaza el valor oficial silenciosamente: el estado queda expuesto para
 * revisión.
 */
export const NetValueReconciliationStatusSchema = z.enum([
  'exact',
  'rounding_difference',
  'mismatch',
  'incomplete',
]);
export type NetValueReconciliationStatus = z.infer<typeof NetValueReconciliationStatusSchema>;

/**
 * Decisión tributaria por factura (o agrupación) respecto al beneficio del
 * 1 % (art. 336-1 ET). El reporte DIAN advierte que una compra usada como
 * costo/gasto u otro beneficio no puede generar simultáneamente el 1 %.
 * `eligible` es el valor por defecto cuando no hay decisión humana — nunca
 * se asume `used_as_cost_or_expense` automáticamente.
 */
export const ElectronicInvoiceBenefitDecisionSchema = z.enum([
  'eligible',
  'used_as_cost_or_expense',
  'used_for_other_tax_benefit',
  'not_eligible',
  'requires_review',
]);
export type ElectronicInvoiceBenefitDecision = z.infer<
  typeof ElectronicInvoiceBenefitDecisionSchema
>;

/**
 * Estado de conciliación del reporte completo contra la exógena (Tope 5 —
 * "Compras"). Reutiliza los mismos nombres de estado que
 * `ReconciliationStatusSchema`/`evaluateReconciliationDifference`
 * (`packages/exogenous-parser/src/reconciliationPolicy.ts`) más dos estados
 * exclusivos de esta fuente para cuando falta un lado de la comparación.
 */
export const ElectronicInvoiceReconciliationStatusSchema = z.enum([
  'reconciled',
  'rounding_difference',
  'minor_difference',
  'relevant_difference',
  'not_comparable',
  'missing_exogenous',
  'missing_invoice_report',
  'not_evaluated',
]);
export type ElectronicInvoiceReconciliationStatus = z.infer<
  typeof ElectronicInvoiceReconciliationStatusSchema
>;

/** Estado de procesamiento visible en la UI (Sección 20 del prompt). */
export const ElectronicInvoiceReportProcessingStatusSchema = z.enum([
  'not_loaded',
  'analyzing',
  'processed',
  'requires_review',
  'reconciled',
]);
export type ElectronicInvoiceReportProcessingStatus = z.infer<
  typeof ElectronicInvoiceReportProcessingStatusSchema
>;

export const ElectronicInvoiceReportTotalsSchema = z.object({
  rowCount: z.number().int().nonnegative(),
  uniqueInvoiceCount: z.number().int().nonnegative(),
  grossTotalCop: z.number(),
  creditNoteTotalCop: z.number(),
  debitNoteTotalCop: z.number(),
  netTotalCop: z.number(),
  eligibleBenefitTotalCop: z.number(),
  countByPaymentMethod: z.object({
    electronic: z.number().int().nonnegative(),
    cash: z.number().int().nonnegative(),
    other: z.number().int().nonnegative(),
    data_error: z.number().int().nonnegative(),
    not_informed: z.number().int().nonnegative(),
  }),
  countEligibleZero: z.number().int().nonnegative(),
  duplicateExactCount: z.number().int().nonnegative(),
  duplicateConflictingCount: z.number().int().nonnegative(),
  missingCufeCount: z.number().int().nonnegative(),
  anomalyCount: z.number().int().nonnegative(),
});
export type ElectronicInvoiceReportTotals = z.infer<typeof ElectronicInvoiceReportTotalsSchema>;

export const ElectronicInvoiceReconciliationSchema = z.object({
  status: ElectronicInvoiceReconciliationStatusSchema,
  /** Total neto del reporte de facturación electrónica (evidencia propia). */
  invoiceReportNetTotalCop: z.number().nullable(),
  /** Tope 5 — Compras, tomado de `analysis.matrix.electronicInvoicing.totalNetInvoiced`. */
  exogenousNetTotalCop: z.number().nullable(),
  differenceAbsoluteCop: z.number().nullable(),
  differencePercentage: z.number().nullable(),
  roundingUnitCop: z.number(),
  explanation: z.string(),
  requiresHumanConfirmation: z.boolean(),
  policyVersion: z.string(),
  evaluatedAt: IsoTimestampSchema,
});
export type ElectronicInvoiceReconciliation = z.infer<typeof ElectronicInvoiceReconciliationSchema>;

/**
 * Reporte importado. `sourceDocumentId` referencia la biblioteca documental
 * existente (metadatos, nunca el binario — ver `SECURITY_PRIVACY.md`);
 * `detectedTitle` es la evidencia textual que permitió reconocer el formato
 * (nunca un número de fila fijo).
 */
export const ElectronicInvoiceReportSchema = z.object({
  id: z.string().min(1),
  caseId: z.string().min(1),
  taxYear: z.number().int(),
  sourceKind: z.literal(ELECTRONIC_INVOICE_SOURCE_KIND),
  sourceDocumentId: z.string().nullable(),
  fileName: z.string(),
  detectedTitle: z.string().nullable(),
  headerRowIndex: z.number().int().nonnegative(),
  headerConfidence: z.number().min(0).max(1),
  importedAt: IsoTimestampSchema,
  parserVersion: z.string(),
  rowCount: z.number().int().nonnegative(),
  totals: ElectronicInvoiceReportTotalsSchema,
  reconciliation: ElectronicInvoiceReconciliationSchema.nullable(),
  processingStatus: ElectronicInvoiceReportProcessingStatusSchema,
  /** `true` cuando el analista confirmó "No usaré deducción por facturación electrónica" (reversible, Sección 29). */
  benefitOptedOut: z.boolean(),
  warnings: z.array(z.string()),
});
export type ElectronicInvoiceReport = z.infer<typeof ElectronicInvoiceReportSchema>;

/**
 * Factura individual (evidencia inmutable). Los campos de decisión
 * tributaria (`benefitDecision`) reflejan el estado ACTUAL derivado del
 * historial en `resolutionDecisions` (objectType `electronic_invoice_purchase`)
 * — la evidencia original (valores, CUFE) nunca se modifica al decidir.
 */
export const ElectronicInvoicePurchaseSchema = z.object({
  id: z.string().min(1),
  reportId: z.string().min(1),
  caseId: z.string().min(1),
  /** Fila real en el workbook (0-based), para trazabilidad — nunca asumida fija. */
  sourceRow: z.number().int().nonnegative(),
  issuerTaxId: z.string().nullable(),
  issuerName: z.string().nullable(),
  issuedAt: z.string().nullable(),
  invoiceNumber: z.string().nullable(),
  rawCufe: z.string().nullable(),
  normalizedCufe: z.string().nullable(),
  cufeStatus: CufeStatusSchema,
  grossValue: AmountCandidateSchema,
  creditNoteValue: AmountCandidateSchema,
  debitNoteValue: AmountCandidateSchema,
  /** Columna "Valor Factura / Afectada con Notas Débito - Crédito" cuando existe en el reporte. */
  officialNetValue: AmountCandidateSchema.nullable(),
  /** `grossValue + debitNoteValue - creditNoteValue`, redondeado. Siempre calculado, con o sin columna oficial. */
  computedNetValueCop: z.number(),
  netReconciliationStatus: NetValueReconciliationStatusSchema,
  eligibleBenefitValue: AmountCandidateSchema,
  paymentMethodRaw: z.string().nullable(),
  paymentMethodCategory: PaymentMethodCategorySchema,
  /** Estado actual (derivado del historial de decisiones). `eligible` por defecto. */
  benefitDecision: ElectronicInvoiceBenefitDecisionSchema,
  benefitDecisionReason: z.string().nullable(),
  notes: z.string().optional(),
  createdAt: IsoTimestampSchema,
});
export type ElectronicInvoicePurchase = z.infer<typeof ElectronicInvoicePurchaseSchema>;

/**
 * Base explicable del beneficio del 1 % (art. 336-1 ET), agregador de
 * Sección 15 del prompt de Fase D. Cada resta se muestra por separado; no es
 * una resta directa del bruto DIAN.
 */
export const ElectronicInvoiceBenefitBaseSchema = z.object({
  reportId: z.string().min(1),
  dianSusceptibleTotalCop: z.number(),
  excludedByDoubleBenefitCop: z.number(),
  excludedByRejectionCop: z.number(),
  excludedByDuplicateCop: z.number(),
  baseConsideredCop: z.number(),
  purchasesRequiringDecisionCount: z.number().int().nonnegative(),
  computedAt: IsoTimestampSchema,
});
export type ElectronicInvoiceBenefitBase = z.infer<typeof ElectronicInvoiceBenefitBaseSchema>;
