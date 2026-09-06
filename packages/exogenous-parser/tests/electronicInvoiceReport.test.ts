import { describe, it, expect } from 'vitest';
import {
  computeElectronicInvoiceTotals,
  detectElectronicInvoiceReport,
  evaluateReconciliationDifference,
  extractElectronicInvoicePurchases,
  normalizePaymentMethod,
  parseInvoiceAmountCell,
  readWorkbook,
  resolveCufeDuplicates,
} from '../src/index';
import {
  buildWorkbookBuffer,
  electronicInvoiceRegressionBuffer,
  offByOnePesoElectronicInvoiceBuffer,
  realisticElectronicInvoiceBuffer,
  sampleExogenousBuffer,
  syntheticCufe,
} from './fixtures';

function process(buffer: ArrayBuffer) {
  const read = readWorkbook(buffer, 'facturas.xlsx', buffer.byteLength);
  const detection = detectElectronicInvoiceReport(read);
  if (!detection) return { read, detection: null, rows: [], excluded: new Set<number>() };
  const rows = extractElectronicInvoicePurchases(read, detection);
  const { rows: resolved, excludedFromTotalsRowIndexes } = resolveCufeDuplicates(rows);
  return { read, detection, rows: resolved, excluded: excludedFromTotalsRowIndexes };
}

describe('detección del reporte DIAN de facturación electrónica', () => {
  it('reconoce el reporte por señales de contenido con encabezado tardío (no fila fija)', () => {
    const { detection } = process(realisticElectronicInvoiceBuffer());
    expect(detection).not.toBeNull();
    expect(detection!.headerRowIndex).toBeGreaterThan(20);
    expect(detection!.detectedTitle).toMatch(/CUFE/i);
    expect(detection!.confidence).toBeGreaterThan(0.5);
  });

  it('no reconoce un reporte de exógena genérico (sin falsos positivos)', () => {
    const read = readWorkbook(sampleExogenousBuffer(), 'exogena.xlsx', 0);
    expect(detectElectronicInvoiceReport(read)).toBeNull();
  });

  it('devuelve null para un workbook vacío', () => {
    expect(
      detectElectronicInvoiceReport({
        metadata: { fileName: 'x', fileSizeBytes: 0, sheetCount: 0, sheets: [] },
        fullRows: {},
      }),
    ).toBeNull();
  });

  it('lee el workbook completo, no limitado a una vista previa', () => {
    const { oracle, buffer } = electronicInvoiceRegressionBuffer();
    const { detection, rows } = process(buffer);
    expect(detection).not.toBeNull();
    expect(rows).toHaveLength(oracle.rowCount);
  });
});

describe('montos colombianos (parser monetario central)', () => {
  it.each([
    ['41.585.075', 41_585_075],
    ['41.585.075,00', 41_585_075],
    ['364.741,49', 364_741],
    ['0', 0],
    ['', 0],
  ])('interpreta %s como %i pesos', (raw, expected) => {
    const candidate = parseInvoiceAmountCell(raw === '' ? null : raw);
    expect(candidate.roundedTaxValue).toBe(expected);
    expect(candidate.parserVersion).toBe('2.0.0');
  });

  it('una celda vacía se trata como cero de alta confianza, no como fallo', () => {
    const candidate = parseInvoiceAmountCell(null);
    expect(candidate.confidence).toBe('high');
    expect(candidate.roundedTaxValue).toBe(0);
  });

  it('conserva rawText/parsedValue/parserVersion/confidence en cada candidato', () => {
    const candidate = parseInvoiceAmountCell('1.500.000');
    expect(candidate.rawText).toBe('1.500.000');
    expect(candidate.parsedValue).toBe(1_500_000);
    expect(candidate.parserVersion).toBe('2.0.0');
    expect(candidate.confidence).toBe('high');
  });
});

describe('CUFE', () => {
  it('normaliza y detecta CUFE duplicado exacto (no se suma dos veces)', () => {
    const { rows, excluded } = process(realisticElectronicInvoiceBuffer());
    const exactGroup = rows.filter((row) => row.purchase.normalizedCufe === syntheticCufe(1));
    expect(exactGroup).toHaveLength(2);
    expect(exactGroup.every((row) => row.purchase.cufeStatus === 'duplicate_exact')).toBe(true);
    // Solo una de las dos filas debe excluirse de los totales (la otra cuenta una vez).
    const excludedInGroup = exactGroup.filter((row) => excluded.has(row.sourceRow));
    expect(excludedInGroup).toHaveLength(1);
  });

  it('detecta CUFE duplicado conflictivo y lo excluye de la consolidación automática', () => {
    const { rows, excluded } = process(realisticElectronicInvoiceBuffer());
    const conflictGroup = rows.filter((row) => row.purchase.normalizedCufe === syntheticCufe(2));
    expect(conflictGroup).toHaveLength(2);
    expect(conflictGroup.every((row) => row.purchase.cufeStatus === 'duplicate_conflicting')).toBe(
      true,
    );
    expect(conflictGroup.every((row) => excluded.has(row.sourceRow))).toBe(true);
  });

  it('detecta factura sin CUFE sin descartarla silenciosamente', () => {
    const { rows } = process(realisticElectronicInvoiceBuffer());
    const missing = rows.filter((row) => row.purchase.cufeStatus === 'missing_cufe');
    expect(missing).toHaveLength(1);
    expect(missing[0]!.purchase.invoiceNumber).toBe('FES-0004');
  });

  it('detecta CUFE malformado (fuera del alfabeto/tamaño esperado) sin descartarlo', () => {
    const { rows } = process(realisticElectronicInvoiceBuffer());
    const malformed = rows.find((row) => row.purchase.invoiceNumber === 'FES-0006');
    expect(malformed).toBeTruthy();
    expect(malformed!.purchase.cufeStatus).toBe('requires_review');
    expect(malformed!.purchase.rawCufe).toBe('cufe-no-valido-123');
  });
});

describe('notas crédito/débito y valor neto', () => {
  it('valida neto = bruto + débito - crédito contra la columna oficial', () => {
    const { rows } = process(realisticElectronicInvoiceBuffer());
    const withCredit = rows.find((row) => row.purchase.invoiceNumber === 'FES-0002');
    expect(withCredit).toBeTruthy();
    expect(withCredit!.purchase.computedNetValueCop).toBe(2_000_000);
    expect(withCredit!.purchase.netReconciliationStatus).toBe('exact');
  });

  it('marca "incomplete" cuando el reporte no trae columna neta oficial', () => {
    const headerWithoutOfficialNet = [
      'Identificación Emisor Factura',
      'Nombre Emisor Factura',
      'Fecha Emisión',
      'Num_factura_venta',
      'Valor Facturado',
      'Valor Notas Crédito',
      'Valor Notas Débito',
      'Valor Susceptible Beneficio',
      'Medios De Pago',
      'CUFE',
    ];
    const sheet = [
      ['Reporte de facturas electrónicas - MUESTRA SINTÉTICA'],
      ...Array.from({ length: 20 }, () => []),
      headerWithoutOfficialNet,
      [
        '900111222',
        'Proveedor Sintético SAS',
        '2025-02-10',
        'FES-0001',
        '1.500.000',
        '0',
        '0',
        '1.500.000',
        'Efectivo',
        syntheticCufe(1),
      ],
    ];
    const read = readWorkbook(buildWorkbookBuffer({ Facturas: sheet }), 'f.xlsx', 0);
    const detection = detectElectronicInvoiceReport(read)!;
    expect(detection).toBeTruthy();
    const rows = extractElectronicInvoicePurchases(read, detection);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.purchase.officialNetValue).toBeNull();
    expect(rows[0]!.purchase.netReconciliationStatus).toBe('incomplete');
    expect(rows[0]!.purchase.computedNetValueCop).toBe(1_500_000);
  });
});

describe('métodos de pago', () => {
  it.each([
    ['Tarjeta débito o crédito', 'electronic'],
    ['Transferencia electrónica', 'electronic'],
    ['Efectivo', 'cash'],
    ['Error en datos', 'data_error'],
    ['No informado', 'not_informed'],
    ['', 'not_informed'],
    ['Vale alimentación', 'other'],
  ])('normaliza "%s" a %s', (raw, expected) => {
    expect(normalizePaymentMethod(raw === '' ? null : raw)).toBe(expected);
  });

  it('no convierte automáticamente "Error en datos" en electrónico', () => {
    expect(normalizePaymentMethod('Error en datos')).toBe('data_error');
  });
});

describe('totales agregados (§10) y regresión numérica (§31-32)', () => {
  it('reproduce el oráculo sintético de 227 facturas', () => {
    const { buffer, oracle } = electronicInvoiceRegressionBuffer();
    const { rows, excluded } = process(buffer);
    const totals = computeElectronicInvoiceTotals(rows, excluded);

    expect(totals.rowCount).toBe(oracle.rowCount);
    expect(totals.uniqueInvoiceCount).toBe(oracle.rowCount);
    expect(totals.grossTotalCop).toBe(oracle.grossTotalCop);
    expect(totals.creditNoteTotalCop).toBe(oracle.creditNoteTotalCop);
    expect(totals.debitNoteTotalCop).toBe(oracle.debitNoteTotalCop);
    expect(Math.abs(totals.netTotalCop - oracle.netTotalCop)).toBeLessThanOrEqual(1);
    expect(totals.eligibleBenefitTotalCop).toBe(oracle.eligibleBenefitTotalCop);
    expect(totals.countByPaymentMethod.electronic).toBe(oracle.electronicCount);
    expect(totals.countByPaymentMethod.cash).toBe(oracle.cashCount);
    expect(totals.countByPaymentMethod.data_error).toBe(oracle.errorCount);
    expect(totals.duplicateExactCount).toBe(0);
    expect(totals.duplicateConflictingCount).toBe(0);
    expect(totals.missingCufeCount).toBe(0);
    expect(totals.countEligibleZero).toBe(5);
  });

  it('separa los totales calculados de cualquier total declarado en el XLSX', () => {
    const { buffer, oracle } = electronicInvoiceRegressionBuffer();
    const { rows, excluded } = process(buffer);
    const totals = computeElectronicInvoiceTotals(rows, excluded);
    // El fixture no incluye una fila de "total" propia del XLSX; el cálculo
    // proviene íntegramente de sumar cada fila, nunca de una celda de resumen.
    expect(totals.grossTotalCop).toBe(oracle.grossTotalCop);
  });

  it('excluye duplicados exactos/conflictivos de los totales monetarios del fixture realista', () => {
    const { rows, excluded } = process(realisticElectronicInvoiceBuffer());
    const totals = computeElectronicInvoiceTotals(rows, excluded);
    expect(totals.duplicateExactCount).toBe(2);
    expect(totals.duplicateConflictingCount).toBe(2);
    expect(totals.missingCufeCount).toBe(1);
    // 1.500.000 (una sola vez, no dos) + 0 (conflictivo excluido) + 364.741 + 41.585.075 (sin CUFE) + 0 + 800.000 (CUFE malformado, no excluido)
    expect(totals.grossTotalCop).toBe(1_500_000 + 364_741 + 41_585_075 + 800_000);
  });
});

describe('conciliación contra Tope 5 ($1 sin excepción especial)', () => {
  it('clasifica una diferencia de $1 como redondeo, usando la política existente', () => {
    const { buffer, exogenousNetTotalCop } = offByOnePesoElectronicInvoiceBuffer();
    const { rows, excluded } = process(buffer);
    const totals = computeElectronicInvoiceTotals(rows, excluded);
    const result = evaluateReconciliationDifference({
      leftValue: totals.netTotalCop,
      rightValue: exogenousNetTotalCop,
      source: 'exogenous_threshold',
      groupNature: 'income',
    });
    expect(result.status).toBe('rounding_difference');
    expect(result.differenceAbsolute).toBe(1);
  });
});
