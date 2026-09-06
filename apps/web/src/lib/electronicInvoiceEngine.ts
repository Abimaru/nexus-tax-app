import type {
  ElectronicInvoiceBenefitBase,
  ElectronicInvoiceBenefitDecision,
  ElectronicInvoicePurchase,
  ElectronicInvoiceReconciliation,
  ElectronicInvoiceReport,
  ElectronicInvoiceReportProcessingStatus,
} from '@nexus-tax/domain';
import { ELECTRONIC_INVOICE_SOURCE_KIND } from '@nexus-tax/domain';
import {
  ELECTRONIC_INVOICE_PARSER_VERSION,
  computeElectronicInvoiceTotals,
  detectElectronicInvoiceReport,
  evaluateReconciliationDifference,
  extractElectronicInvoicePurchases,
  readWorkbook,
  resolveCufeDuplicates,
} from '@nexus-tax/exogenous-parser';

/**
 * Orquestación pura (sin Dexie, sin React) entre el parser XLSX del reporte
 * DIAN de facturación electrónica (`@nexus-tax/exogenous-parser`) y el
 * modelo de dominio persistible (Sprint 2.4, Fase D). Mismo rol que
 * `dependentsEngine.ts` para la Fase C: traduce, no decide.
 */

export const ELECTRONIC_INVOICE_ENGINE_VERSION = 'nexustax.electronic-invoice.2025.v1';

export interface ParsedElectronicInvoiceWorkbook {
  report: Omit<
    ElectronicInvoiceReport,
    'id' | 'caseId' | 'sourceDocumentId' | 'reconciliation' | 'benefitOptedOut'
  >;
  purchases: readonly Omit<ElectronicInvoicePurchase, 'id' | 'reportId' | 'caseId' | 'createdAt'>[];
}

/**
 * Procesa un workbook completo: detecta el reporte por señales de
 * contenido (§3), lee TODAS las filas reales (§5), extrae cada factura,
 * resuelve duplicados por CUFE (§8) y agrega los totales (§10). Devuelve
 * `null` cuando el archivo no se reconoce como reporte DIAN de facturación
 * electrónica (tarea "archivo no reconocido", §28).
 */
export function parseElectronicInvoiceWorkbook(
  buffer: ArrayBuffer,
  fileName: string,
  taxYear: number,
  importedAt: string,
): ParsedElectronicInvoiceWorkbook | null {
  const read = readWorkbook(buffer, fileName, buffer.byteLength);
  const detection = detectElectronicInvoiceReport(read);
  if (!detection) return null;

  const rawRows = extractElectronicInvoicePurchases(read, detection);
  const { rows, excludedFromTotalsRowIndexes } = resolveCufeDuplicates(rawRows);
  const totals = computeElectronicInvoiceTotals(rows, excludedFromTotalsRowIndexes);

  const warnings: string[] = [];
  if (totals.duplicateConflictingCount > 0) {
    warnings.push(
      `${totals.duplicateConflictingCount} factura(s) con CUFE duplicado pero valores distintos: quedan fuera de los totales hasta que se revisen.`,
    );
  }
  if (totals.missingCufeCount > 0) {
    warnings.push(`${totals.missingCufeCount} factura(s) sin CUFE: revisa el soporte original.`);
  }
  if (totals.countByPaymentMethod.data_error > 0) {
    warnings.push(
      `${totals.countByPaymentMethod.data_error} factura(s) con "Error en datos" en el medio de pago.`,
    );
  }

  const processingStatus: ElectronicInvoiceReportProcessingStatus =
    totals.duplicateConflictingCount > 0 || totals.missingCufeCount > 0 ? 'requires_review' : 'processed';

  return {
    report: {
      taxYear,
      sourceKind: ELECTRONIC_INVOICE_SOURCE_KIND,
      fileName,
      detectedTitle: detection.detectedTitle,
      headerRowIndex: detection.headerRowIndex,
      headerConfidence: detection.confidence,
      importedAt,
      parserVersion: ELECTRONIC_INVOICE_PARSER_VERSION,
      rowCount: totals.rowCount,
      totals,
      processingStatus,
      warnings,
    },
    purchases: rows.map((row) => row.purchase),
  };
}

/**
 * Reproduce, a partir de datos YA PERSISTIDOS, qué filas quedan excluidas de
 * los totales monetarios por deduplicación de CUFE (§8): la primera
 * ocurrencia (menor `sourceRow`) de un grupo `duplicate_exact` cuenta una
 * vez; el resto y todo `duplicate_conflicting` se excluye. Determinista y
 * reproducible sin necesidad de persistir un campo adicional.
 */
export function computeExcludedFromTotalsRowIndexes(
  purchases: readonly ElectronicInvoicePurchase[],
): Set<number> {
  const excluded = new Set<number>();
  const byCufe = new Map<string, ElectronicInvoicePurchase[]>();
  for (const purchase of purchases) {
    if (purchase.cufeStatus === 'duplicate_conflicting') excluded.add(purchase.sourceRow);
    if (purchase.cufeStatus !== 'duplicate_exact' || !purchase.normalizedCufe) continue;
    const bucket = byCufe.get(purchase.normalizedCufe) ?? [];
    bucket.push(purchase);
    byCufe.set(purchase.normalizedCufe, bucket);
  }
  for (const bucket of byCufe.values()) {
    const sorted = [...bucket].sort((a, b) => a.sourceRow - b.sourceRow);
    for (const purchase of sorted.slice(1)) excluded.add(purchase.sourceRow);
  }
  return excluded;
}

/**
 * Agregador explicable de la base del beneficio del 1 % (§15): resta, paso
 * a paso, los duplicados, las facturas rechazadas/pendientes de decisión y
 * las usadas para otro beneficio (doble beneficio, §14) del total
 * susceptible bruto reportado por la DIAN.
 */
export function computeElectronicInvoiceBenefitBase(
  reportId: string,
  purchases: readonly ElectronicInvoicePurchase[],
  computedAt: string,
): ElectronicInvoiceBenefitBase {
  const excludedRows = computeExcludedFromTotalsRowIndexes(purchases);
  const eligibleValueOf = (purchase: ElectronicInvoicePurchase) =>
    purchase.eligibleBenefitValue.roundedTaxValue ?? 0;

  const dianSusceptibleTotalCop = purchases.reduce((sum, p) => sum + eligibleValueOf(p), 0);
  const excludedByDuplicateCop = purchases
    .filter((p) => excludedRows.has(p.sourceRow))
    .reduce((sum, p) => sum + eligibleValueOf(p), 0);

  const remaining = purchases.filter((p) => !excludedRows.has(p.sourceRow));
  const rejectionDecisions: ElectronicInvoiceBenefitDecision[] = ['not_eligible', 'requires_review'];
  const doubleBenefitDecisions: ElectronicInvoiceBenefitDecision[] = [
    'used_as_cost_or_expense',
    'used_for_other_tax_benefit',
  ];
  const excludedByRejectionCop = remaining
    .filter((p) => rejectionDecisions.includes(p.benefitDecision))
    .reduce((sum, p) => sum + eligibleValueOf(p), 0);
  const excludedByDoubleBenefitCop = remaining
    .filter((p) => doubleBenefitDecisions.includes(p.benefitDecision))
    .reduce((sum, p) => sum + eligibleValueOf(p), 0);

  const baseConsideredCop = Math.max(
    0,
    dianSusceptibleTotalCop - excludedByDuplicateCop - excludedByRejectionCop - excludedByDoubleBenefitCop,
  );
  const purchasesRequiringDecisionCount = remaining.filter(
    (p) => p.benefitDecision === 'requires_review',
  ).length;

  return {
    reportId,
    dianSusceptibleTotalCop,
    excludedByDoubleBenefitCop,
    excludedByRejectionCop,
    excludedByDuplicateCop,
    baseConsideredCop,
    purchasesRequiringDecisionCount,
    computedAt,
  };
}

/**
 * Construye el input `electronicInvoicing` para `buildForm210Draft` a
 * partir de la base ya explicada. `null` cuando no aplica (sin reporte, o
 * el analista optó por "No usaré esta deducción", §29).
 */
export function buildElectronicInvoicingInput(
  benefitBase: ElectronicInvoiceBenefitBase | null,
  benefitOptedOut: boolean,
): { purchasesWithElectronicInvoiceCop: number } | undefined {
  if (benefitOptedOut || !benefitBase || benefitBase.baseConsideredCop <= 0) return undefined;
  return { purchasesWithElectronicInvoiceCop: benefitBase.baseConsideredCop };
}

/**
 * Conciliación contra Tope 5 — Compras (§16-17). Reutiliza
 * `evaluateReconciliationDifference` (misma política que el resto del
 * proyecto); agrega los dos estados exclusivos de esta fuente cuando falta
 * un lado de la comparación. Nunca crea una excepción especial para
 * diferencias de $1: la tolerancia de redondeo ya existente las clasifica.
 */
export function reconcileElectronicInvoiceReport(
  invoiceReportNetTotalCop: number | null,
  exogenousNetTotalCop: number | null,
  evaluatedAt: string,
): ElectronicInvoiceReconciliation {
  if (invoiceReportNetTotalCop === null && exogenousNetTotalCop === null) {
    return {
      status: 'not_evaluated',
      invoiceReportNetTotalCop,
      exogenousNetTotalCop,
      differenceAbsoluteCop: null,
      differencePercentage: null,
      roundingUnitCop: 1,
      explanation: 'No hay reporte de facturación electrónica ni exógena para comparar.',
      requiresHumanConfirmation: false,
      policyVersion: ELECTRONIC_INVOICE_ENGINE_VERSION,
      evaluatedAt,
    };
  }
  if (exogenousNetTotalCop === null) {
    return {
      status: 'missing_exogenous',
      invoiceReportNetTotalCop,
      exogenousNetTotalCop,
      differenceAbsoluteCop: null,
      differencePercentage: null,
      roundingUnitCop: 1,
      explanation:
        'El expediente no tiene un valor de "Compras" (Tope 5) en la exógena para conciliar.',
      requiresHumanConfirmation: true,
      policyVersion: ELECTRONIC_INVOICE_ENGINE_VERSION,
      evaluatedAt,
    };
  }
  if (invoiceReportNetTotalCop === null) {
    return {
      status: 'missing_invoice_report',
      invoiceReportNetTotalCop,
      exogenousNetTotalCop,
      differenceAbsoluteCop: null,
      differencePercentage: null,
      roundingUnitCop: 1,
      explanation: 'Aún no se ha cargado el reporte DIAN de facturación electrónica.',
      requiresHumanConfirmation: true,
      policyVersion: ELECTRONIC_INVOICE_ENGINE_VERSION,
      evaluatedAt,
    };
  }
  const result = evaluateReconciliationDifference({
    leftValue: invoiceReportNetTotalCop,
    rightValue: exogenousNetTotalCop,
    source: 'exogenous_threshold',
    groupNature: 'income',
  });
  return {
    status: result.status,
    invoiceReportNetTotalCop,
    exogenousNetTotalCop,
    differenceAbsoluteCop: result.differenceAbsolute,
    differencePercentage: result.differencePercentage,
    roundingUnitCop: result.roundingUnit,
    explanation: result.explanation,
    requiresHumanConfirmation: result.requiresHumanConfirmation,
    policyVersion: result.policyVersion,
    evaluatedAt,
  };
}

/** Aplica una decisión de beneficio (o su reversión) sobre una lista de facturas. */
export function applyBenefitDecision(
  purchases: readonly ElectronicInvoicePurchase[],
  purchaseId: string,
  decision: ElectronicInvoiceBenefitDecision,
  reason: string | null,
): ElectronicInvoicePurchase[] {
  return purchases.map((purchase) =>
    purchase.id === purchaseId
      ? { ...purchase, benefitDecision: decision, benefitDecisionReason: reason }
      : purchase,
  );
}

/** Etiquetas humanas para la UI. Nunca se muestra el enum crudo. */
export const PAYMENT_METHOD_CATEGORY_LABEL: Record<
  ElectronicInvoicePurchase['paymentMethodCategory'],
  string
> = {
  electronic: 'Electrónico',
  cash: 'Efectivo',
  other: 'Otro',
  data_error: 'Error en datos',
  not_informed: 'No informado',
};

export const CUFE_STATUS_LABEL: Record<ElectronicInvoicePurchase['cufeStatus'], string> = {
  unique: 'CUFE único',
  duplicate_exact: 'Duplicado exacto',
  duplicate_conflicting: 'Duplicado con valores distintos',
  missing_cufe: 'Sin CUFE',
  requires_review: 'CUFE requiere revisión',
};

export const BENEFIT_DECISION_LABEL: Record<ElectronicInvoiceBenefitDecision, string> = {
  eligible: 'Usar para el 1 %',
  used_as_cost_or_expense: 'Usada como costo/gasto',
  used_for_other_tax_benefit: 'Usada en otro beneficio',
  not_eligible: 'No aplica',
  requires_review: 'Requiere revisión',
};

export const RECONCILIATION_STATUS_LABEL: Record<ElectronicInvoiceReconciliation['status'], string> = {
  reconciled: 'Concilia',
  rounding_difference: 'Diferencia de redondeo',
  minor_difference: 'Diferencia menor',
  relevant_difference: 'Diferencia relevante',
  not_comparable: 'No comparable',
  missing_exogenous: 'Falta la exógena',
  missing_invoice_report: 'Falta el reporte',
  not_evaluated: 'Sin evaluar',
};

export const PROCESSING_STATUS_LABEL: Record<ElectronicInvoiceReportProcessingStatus, string> = {
  not_loaded: 'No cargado',
  analyzing: 'Analizando',
  processed: 'Procesado',
  requires_review: 'Requiere revisión',
  reconciled: 'Conciliado',
};
