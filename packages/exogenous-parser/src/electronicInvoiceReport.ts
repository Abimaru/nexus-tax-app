import type {
  CufeStatus,
  ElectronicInvoicePurchase,
  ElectronicInvoiceReportTotals,
  NetValueReconciliationStatus,
  PaymentMethodCategory,
} from '@nexus-tax/domain';
import type { AmountCandidate } from '@nexus-tax/domain';
import { MONEY_PARSER_VERSION, parseMoneyAmount } from '@nexus-tax/document-intelligence';
import type { RawCell, ReadWorkbookResult } from './workbook';
import { buildColumns, type ColumnDescriptor } from './columns';
import { normalizeForCompare, toEvidenceText } from './text';

/**
 * Adaptador HERMANO del parser de exógena para el reporte DIAN de
 * facturación electrónica (Sprint 2.4, Fase D).
 *
 * Reutiliza la infraestructura de bajo nivel de `exogenous-parser`
 * (`readWorkbook`/`fullRows`, `buildColumns`, `normalizeForCompare`) porque
 * ambos son archivos XLSX con la misma problemática estructural (metadatos
 * variables arriba, encabezado tardío, sin confiar en `!ref`). NO reutiliza
 * la semántica de la exógena (`sections.ts`, `mapping.ts`, `classification.ts`,
 * `HEADER_SYNONYMS`): el reporte de facturación electrónica tiene columnas y
 * reglas de negocio completamente distintas (CUFE, notas crédito/débito,
 * valor susceptible de beneficio) y se modela como fuente propia
 * (`dian_electronic_invoice_report`), nunca como "XLSX genérico".
 */

export const ELECTRONIC_INVOICE_PARSER_VERSION = '1.0.0';

/** Filas máximas escaneadas por hoja al buscar el encabezado (nunca una fila fija). */
const MAX_HEADER_SCAN_ROWS = 80;

/** Campos canónicos reconocidos del reporte DIAN. */
type FeField =
  | 'issuerTaxId'
  | 'issuerName'
  | 'issuedAt'
  | 'grossValue'
  | 'creditNoteValue'
  | 'debitNoteValue'
  | 'officialNetValue'
  | 'eligibleBenefitValue'
  | 'paymentMethod'
  | 'invoiceNumber'
  | 'cufe';

/**
 * Sinónimos normalizados (sin tildes, minúsculas) por campo. Cubren las
 * variantes de encabezado documentadas en la Sección 3 del prompt de Fase D.
 */
const FE_HEADER_SYNONYMS: Record<FeField, string[]> = {
  issuerTaxId: ['identificacion emisor factura', 'identificacion emisor', 'nit emisor factura'],
  issuerName: ['nombre emisor factura', 'nombre emisor', 'razon social emisor'],
  issuedAt: ['fecha emision', 'fecha de emision factura'],
  grossValue: ['valor facturado'],
  creditNoteValue: ['valor notas credito', 'valor nota credito'],
  debitNoteValue: ['valor notas debito', 'valor nota debito'],
  officialNetValue: [
    'valor factura afectada con notas debito credito',
    'valor factura afectada con notas debito - credito',
    'valor factura / afectada con notas debito - credito',
  ],
  eligibleBenefitValue: ['valor susceptible beneficio', 'valor susceptible de beneficio'],
  paymentMethod: ['medios de pago', 'medio de pago'],
  invoiceNumber: ['num factura venta', 'numero factura venta', 'numero de factura'],
  cufe: ['cufe'],
};

/** Campos cuya presencia es suficientemente distintiva de este reporte. */
const STRONG_SIGNAL_FIELDS: FeField[] = [
  'grossValue',
  'creditNoteValue',
  'debitNoteValue',
  'eligibleBenefitValue',
  'cufe',
];

/** Mínimo de campos distintos que deben coincidir para reconocer el reporte. */
const MIN_MATCHED_FIELDS = 5;

function normalizeHeaderCell(cell: RawCell): string {
  return typeof cell === 'string' ? normalizeForCompare(cell) : '';
}

function matchField(row: RawCell[], synonyms: string[]): boolean {
  return row.some((cell) => {
    const norm = normalizeHeaderCell(cell);
    if (!norm) return false;
    return synonyms.some((syn) => norm === syn || norm.includes(syn));
  });
}

function scoreRowAsFeHeader(row: RawCell[]): { matchedFields: number; strongMatches: number } {
  let matchedFields = 0;
  let strongMatches = 0;
  for (const field of Object.keys(FE_HEADER_SYNONYMS) as FeField[]) {
    if (matchField(row, FE_HEADER_SYNONYMS[field])) {
      matchedFields += 1;
      if (STRONG_SIGNAL_FIELDS.includes(field)) strongMatches += 1;
    }
  }
  return { matchedFields, strongMatches };
}

export interface ElectronicInvoiceReportDetection {
  sheetName: string;
  headerRowIndex: number;
  /** Confianza heurística 0..1, proporcional a los campos reconocidos. */
  confidence: number;
  /** Evidencia textual (encabezados detectados) para mostrar al analista. */
  detectedTitle: string;
}

/**
 * Reconoce el reporte DIAN por SEÑALES DE CONTENIDO, escaneando cada hoja
 * hasta `MAX_HEADER_SCAN_ROWS` filas. Nunca asume una fila fija (§3): el
 * encabezado real puede aparecer después de bloques de metadatos, texto
 * explicativo y filas vacías. Devuelve `null` cuando ninguna fila alcanza el
 * mínimo de campos reconocidos (archivo no reconocido, §29 de tareas).
 */
export function detectElectronicInvoiceReport(
  read: ReadWorkbookResult,
): ElectronicInvoiceReportDetection | null {
  let best: ElectronicInvoiceReportDetection | null = null;
  let bestMatched = 0;
  for (const sheet of read.metadata.sheets) {
    const rows = read.fullRows[sheet.name] ?? [];
    const limit = Math.min(MAX_HEADER_SCAN_ROWS, rows.length);
    for (let r = 0; r < limit; r += 1) {
      const row = rows[r] ?? [];
      const { matchedFields, strongMatches } = scoreRowAsFeHeader(row);
      if (matchedFields < MIN_MATCHED_FIELDS || strongMatches < 3) continue;
      if (matchedFields <= bestMatched) continue;
      bestMatched = matchedFields;
      const detectedTitle = row
        .filter((cell): cell is string => typeof cell === 'string' && cell.trim() !== '')
        .join(' · ');
      best = {
        sheetName: sheet.name,
        headerRowIndex: r,
        confidence: matchedFields / Object.keys(FE_HEADER_SYNONYMS).length,
        detectedTitle,
      };
    }
  }
  return best;
}

function resolveFeColumn(
  columns: ColumnDescriptor[],
  field: FeField,
  used: Set<number>,
): ColumnDescriptor | undefined {
  const synonyms = FE_HEADER_SYNONYMS[field];
  const candidates = columns.filter((column) => {
    if (column.isUnnamed || used.has(column.index)) return false;
    return synonyms.some((syn) => column.normalized === syn || column.normalized.includes(syn));
  });
  // Determinismo: preferir coincidencia exacta y, en empate, la columna más a la izquierda.
  candidates.sort((a, b) => {
    const exactA = synonyms.includes(a.normalized) ? 0 : 1;
    const exactB = synonyms.includes(b.normalized) ? 0 : 1;
    if (exactA !== exactB) return exactA - exactB;
    return a.index - b.index;
  });
  const chosen = candidates[0];
  if (chosen) used.add(chosen.index);
  return chosen;
}

interface FeColumnMap {
  issuerTaxId?: ColumnDescriptor;
  issuerName?: ColumnDescriptor;
  issuedAt?: ColumnDescriptor;
  grossValue?: ColumnDescriptor;
  creditNoteValue?: ColumnDescriptor;
  debitNoteValue?: ColumnDescriptor;
  officialNetValue?: ColumnDescriptor;
  eligibleBenefitValue?: ColumnDescriptor;
  paymentMethod?: ColumnDescriptor;
  invoiceNumber?: ColumnDescriptor;
  cufe?: ColumnDescriptor;
}

function buildFeColumnMap(columns: ColumnDescriptor[]): FeColumnMap {
  const used = new Set<number>();
  const map: FeColumnMap = {};
  for (const field of Object.keys(FE_HEADER_SYNONYMS) as FeField[]) {
    map[field] = resolveFeColumn(columns, field, used);
  }
  return map;
}

function cell(row: RawCell[], column: ColumnDescriptor | undefined): RawCell {
  if (!column) return null;
  return row[column.index] ?? null;
}

function cellText(value: RawCell): string | null {
  if (value === null || value === undefined) return null;
  const text = toEvidenceText(value).trim();
  return text === '' ? null : text;
}

function cellDate(value: RawCell): string | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10);
  }
  return cellText(value);
}

/**
 * Interpreta una celda monetaria con el parser central v2.0.0
 * (`@nexus-tax/document-intelligence`). Una celda vacía se trata como CERO
 * de alta confianza (ausencia de nota crédito/débito es su significado
 * normativo real), nunca como fallo de interpretación — distinto de un
 * texto no numérico, que sí produce `confidence: 'insufficient'`.
 */
export function parseInvoiceAmountCell(value: RawCell): AmountCandidate {
  const text =
    value === null || value === undefined
      ? ''
      : typeof value === 'number'
        ? String(value)
        : String(value).trim();
  if (text === '') {
    return {
      rawText: '',
      normalizedText: '0',
      parsedValue: 0,
      decimalValue: 0,
      roundedTaxValue: 0,
      detectedLocale: 'integer',
      decimalSeparator: null,
      thousandsSeparator: null,
      parsingStrategy: 'plain_integer',
      confidence: 'high',
      warnings: [],
      sourceDocumentId: null,
      page: null,
      boundingBox: null,
      extractionMethod: 'imported',
      originalEvidence: '(vacío)',
      parserVersion: MONEY_PARSER_VERSION,
    };
  }
  return parseMoneyAmount(text, { extractionMethod: 'imported', originalEvidence: text });
}

/** Patrón laxo de CUFE bien formado: hexadecimal de 90-100 caracteres. */
const CUFE_SHAPE = /^[0-9a-f]{90,100}$/i;

function normalizeCufe(rawCufe: string | null): string | null {
  if (rawCufe === null) return null;
  const collapsed = rawCufe.trim().replace(/\s+/g, '').toLowerCase();
  return collapsed === '' ? null : collapsed;
}

const PAYMENT_METHOD_KEYWORDS: readonly { category: PaymentMethodCategory; keywords: string[] }[] = [
  { category: 'data_error', keywords: ['error'] },
  { category: 'cash', keywords: ['efectivo'] },
  { category: 'not_informed', keywords: ['no informado', 'sin informar', 'no reporta'] },
  {
    category: 'electronic',
    keywords: [
      'electronico',
      'tarjeta',
      'transferencia',
      'pse',
      'debito',
      'credito',
      'consignacion',
    ],
  },
];

/** Normaliza el método de pago a una categoría visible, conservando el texto original. */
export function normalizePaymentMethod(raw: string | null): PaymentMethodCategory {
  if (raw === null || raw.trim() === '') return 'not_informed';
  const norm = normalizeForCompare(raw);
  for (const entry of PAYMENT_METHOD_KEYWORDS) {
    if (entry.keywords.some((keyword) => norm.includes(keyword))) return entry.category;
  }
  return 'other';
}

function reconcileNetValue(
  computedCop: number,
  official: AmountCandidate | null,
): NetValueReconciliationStatus {
  if (!official || official.roundedTaxValue === null) return 'incomplete';
  const diff = Math.abs(computedCop - official.roundedTaxValue);
  if (diff === 0) return 'exact';
  if (diff <= 1) return 'rounding_difference';
  return 'mismatch';
}

/**
 * Filas sin señal suficiente de ser una factura real: sin CUFE, sin número
 * de factura y sin valor facturado. Filas de resumen final (p. ej. "Total
 * registros: N") suelen tener texto en la columna del emisor pero NUNCA
 * combinan CUFE/número de factura/valor facturado — por eso el emisor por
 * sí solo no basta para considerar la fila como dato real (§5, §30).
 */
function isBlankOrSummaryRow(row: RawCell[], columns: FeColumnMap): boolean {
  const hasCufe = cellText(cell(row, columns.cufe)) !== null;
  const hasInvoiceNumber = cellText(cell(row, columns.invoiceNumber)) !== null;
  const hasGross = cellText(cell(row, columns.grossValue)) !== null;
  return !hasCufe && !hasInvoiceNumber && !hasGross;
}

export interface ParsedElectronicInvoiceRow {
  sourceRow: number;
  purchase: Omit<ElectronicInvoicePurchase, 'id' | 'reportId' | 'caseId' | 'createdAt'>;
}

/**
 * Extrae todas las facturas del workbook a partir de la fila siguiente al
 * encabezado detectado. Lee `fullRows` completo (nunca limita a preview,
 * §5): procesa cada fila real hasta el final de la hoja.
 */
export function extractElectronicInvoicePurchases(
  read: ReadWorkbookResult,
  detection: ElectronicInvoiceReportDetection,
): ParsedElectronicInvoiceRow[] {
  const rows = read.fullRows[detection.sheetName] ?? [];
  const headerRow = rows[detection.headerRowIndex] ?? [];
  const columnCount = rows.reduce((max, r) => Math.max(max, r.length), headerRow.length);
  const descriptors = buildColumns(headerRow, columnCount);
  const columns = buildFeColumnMap(descriptors);

  const results: ParsedElectronicInvoiceRow[] = [];
  for (let r = detection.headerRowIndex + 1; r < rows.length; r += 1) {
    const row = rows[r] ?? [];
    if (isBlankOrSummaryRow(row, columns)) continue;

    const issuerTaxId = cellText(cell(row, columns.issuerTaxId));
    const issuerName = cellText(cell(row, columns.issuerName));
    const issuedAt = cellDate(cell(row, columns.issuedAt));
    const invoiceNumber = cellText(cell(row, columns.invoiceNumber));
    const rawCufe = cellText(cell(row, columns.cufe));
    const normalizedCufe = normalizeCufe(rawCufe);

    const grossValue = parseInvoiceAmountCell(cell(row, columns.grossValue));
    const creditNoteValue = parseInvoiceAmountCell(cell(row, columns.creditNoteValue));
    const debitNoteValue = parseInvoiceAmountCell(cell(row, columns.debitNoteValue));
    const officialNetCell = cell(row, columns.officialNetValue);
    const officialNetValue = columns.officialNetValue ? parseInvoiceAmountCell(officialNetCell) : null;
    const eligibleBenefitValue = parseInvoiceAmountCell(cell(row, columns.eligibleBenefitValue));
    const paymentMethodRaw = cellText(cell(row, columns.paymentMethod));

    const computedNetValueCop = Math.round(
      (grossValue.roundedTaxValue ?? 0) +
        (debitNoteValue.roundedTaxValue ?? 0) -
        (creditNoteValue.roundedTaxValue ?? 0),
    );

    let cufeStatus: CufeStatus;
    if (rawCufe === null) cufeStatus = 'missing_cufe';
    else if (normalizedCufe && !CUFE_SHAPE.test(normalizedCufe)) cufeStatus = 'requires_review';
    else cufeStatus = 'unique'; // la deduplicación entre filas se resuelve en un segundo paso.

    results.push({
      sourceRow: r,
      purchase: {
        sourceRow: r,
        issuerTaxId,
        issuerName,
        issuedAt,
        invoiceNumber,
        rawCufe,
        normalizedCufe,
        cufeStatus,
        grossValue,
        creditNoteValue,
        debitNoteValue,
        officialNetValue,
        computedNetValueCop,
        netReconciliationStatus: reconcileNetValue(computedNetValueCop, officialNetValue),
        eligibleBenefitValue,
        paymentMethodRaw,
        paymentMethodCategory: normalizePaymentMethod(paymentMethodRaw),
        benefitDecision: 'eligible',
        benefitDecisionReason: null,
      },
    });
  }
  return results;
}

/**
 * Resuelve la deduplicación por CUFE entre TODAS las filas ya extraídas
 * (§8). Los duplicados exactos comparten el mismo `normalizedCufe` y los
 * mismos valores bruto/NC/ND/neto; los conflictivos comparten CUFE pero
 * difieren en algún valor y bloquean la consolidación automática de esa
 * factura. Muta `cufeStatus` en las filas afectadas; el resto de campos
 * permanece intacto (evidencia inmutable).
 */
export function resolveCufeDuplicates(
  rows: ParsedElectronicInvoiceRow[],
): { rows: ParsedElectronicInvoiceRow[]; excludedFromTotalsRowIndexes: Set<number> } {
  const groups = new Map<string, ParsedElectronicInvoiceRow[]>();
  for (const row of rows) {
    const cufe = row.purchase.normalizedCufe;
    if (!cufe || row.purchase.cufeStatus === 'missing_cufe') continue;
    const bucket = groups.get(cufe) ?? [];
    bucket.push(row);
    groups.set(cufe, bucket);
  }

  const excludedFromTotalsRowIndexes = new Set<number>();
  const updated: ParsedElectronicInvoiceRow[] = rows.map((row) => ({
    ...row,
    purchase: { ...row.purchase },
  }));
  const byRowIndex = new Map(updated.map((row) => [row.sourceRow, row]));

  for (const [, members] of groups) {
    if (members.length < 2) continue;
    const signature = (member: ParsedElectronicInvoiceRow) =>
      [
        member.purchase.grossValue.roundedTaxValue,
        member.purchase.creditNoteValue.roundedTaxValue,
        member.purchase.debitNoteValue.roundedTaxValue,
        member.purchase.computedNetValueCop,
      ].join('|');
    const firstSignature = signature(members[0]!);
    const allSame = members.every((member) => signature(member) === firstSignature);
    members.forEach((member, index) => {
      const target = byRowIndex.get(member.sourceRow);
      if (!target) return;
      const wasMalformed = member.purchase.cufeStatus === 'requires_review';
      target.purchase.cufeStatus = allSame
        ? 'duplicate_exact'
        : wasMalformed
          ? 'requires_review'
          : 'duplicate_conflicting';
      if (allSame && index > 0) excludedFromTotalsRowIndexes.add(member.sourceRow);
      if (!allSame) excludedFromTotalsRowIndexes.add(member.sourceRow);
    });
  }

  return { rows: updated, excludedFromTotalsRowIndexes };
}

/**
 * Agrega los totales del reporte (§10), separados de cualquier total que el
 * propio XLSX pudiera declarar. Excluye del total monetario las filas
 * conflictivas y las repeticiones exactas de un mismo CUFE (§8): cada
 * factura única contribuye una sola vez.
 */
export function computeElectronicInvoiceTotals(
  rows: readonly ParsedElectronicInvoiceRow[],
  excludedFromTotalsRowIndexes: ReadonlySet<number>,
): ElectronicInvoiceReportTotals {
  const countedRows = rows.filter(
    (row) =>
      !excludedFromTotalsRowIndexes.has(row.sourceRow) &&
      row.purchase.cufeStatus !== 'duplicate_conflicting',
  );

  const countByPaymentMethod: Record<PaymentMethodCategory, number> = {
    electronic: 0,
    cash: 0,
    other: 0,
    data_error: 0,
    not_informed: 0,
  };
  for (const row of rows) {
    countByPaymentMethod[row.purchase.paymentMethodCategory] += 1;
  }

  const seenCufeGroups = new Set<string>();
  let uniqueInvoiceCount = 0;
  for (const row of rows) {
    const cufe = row.purchase.normalizedCufe;
    if (!cufe) {
      uniqueInvoiceCount += 1;
      continue;
    }
    if (seenCufeGroups.has(cufe)) continue;
    seenCufeGroups.add(cufe);
    uniqueInvoiceCount += 1;
  }

  const sumOf = (selector: (row: ParsedElectronicInvoiceRow) => number) =>
    countedRows.reduce((sum, row) => sum + selector(row), 0);

  const duplicateExactCount = rows.filter((row) => row.purchase.cufeStatus === 'duplicate_exact')
    .length;
  const duplicateConflictingCount = rows.filter(
    (row) => row.purchase.cufeStatus === 'duplicate_conflicting',
  ).length;
  const missingCufeCount = rows.filter((row) => row.purchase.cufeStatus === 'missing_cufe').length;
  const countEligibleZero = rows.filter(
    (row) => (row.purchase.eligibleBenefitValue.roundedTaxValue ?? 0) === 0,
  ).length;
  const anomalyCount =
    duplicateConflictingCount +
    rows.filter((row) => row.purchase.cufeStatus === 'requires_review').length +
    rows.filter((row) => row.purchase.netReconciliationStatus === 'mismatch').length +
    countByPaymentMethod.data_error;

  return {
    rowCount: rows.length,
    uniqueInvoiceCount,
    grossTotalCop: sumOf((row) => row.purchase.grossValue.roundedTaxValue ?? 0),
    creditNoteTotalCop: sumOf((row) => row.purchase.creditNoteValue.roundedTaxValue ?? 0),
    debitNoteTotalCop: sumOf((row) => row.purchase.debitNoteValue.roundedTaxValue ?? 0),
    netTotalCop: sumOf((row) => row.purchase.computedNetValueCop),
    eligibleBenefitTotalCop: sumOf((row) => row.purchase.eligibleBenefitValue.roundedTaxValue ?? 0),
    countByPaymentMethod,
    countEligibleZero,
    duplicateExactCount,
    duplicateConflictingCount,
    missingCufeCount,
    anomalyCount,
  };
}
