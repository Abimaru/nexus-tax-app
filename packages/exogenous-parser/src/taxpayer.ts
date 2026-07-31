import type { TaxpayerIdentity } from '@nexus-tax/domain';
import type { RawCell } from './workbook';
import { normalizeForCompare, toEvidenceText } from './text';

export function normalizeDocument(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.replace(/\D/g, '');
  return normalized === '' ? null : normalized;
}

export function maskDocument(value: string | null | undefined): string {
  const normalized = normalizeDocument(value);
  if (!normalized) return 'No disponible';
  const visible = normalized.slice(-4);
  return `${'•'.repeat(Math.max(4, normalized.length - visible.length))}${visible}`;
}

function firstValueToRight(row: RawCell[], labelColumn: number): string | null {
  for (let column = labelColumn + 1; column < row.length; column += 1) {
    const value = toEvidenceText(row[column]).trim();
    if (value !== '') return value;
  }
  return null;
}

interface MetadataValue {
  value: string | null;
  row?: number;
}

function findMetadataValue(
  matrix: RawCell[][],
  headerRow: number,
  matches: (normalizedLabel: string) => boolean,
): MetadataValue {
  for (let rowIndex = 0; rowIndex < headerRow - 1; rowIndex += 1) {
    const row = matrix[rowIndex] ?? [];
    for (let column = 0; column < row.length; column += 1) {
      const label = toEvidenceText(row[column]).trim();
      if (label === '' || !matches(normalizeForCompare(label))) continue;
      return { value: firstValueToRight(row, column), row: rowIndex + 1 };
    }
  }
  return { value: null };
}

export function extractTaxpayerIdentity(
  sheetName: string,
  matrix: RawCell[][],
  headerRow: number,
): TaxpayerIdentity {
  const documentType = findMetadataValue(
    matrix,
    headerRow,
    (label) => label === 'tipo de documento',
  );
  const document = findMetadataValue(matrix, headerRow, (label) => label === 'identificacion');
  const name = findMetadataValue(
    matrix,
    headerRow,
    (label) => label === 'nombres razon social' || label === 'nombre razon social',
  );
  const year = findMetadataValue(
    matrix,
    headerRow,
    (label) => label.includes('ano al que se refiere') || label === 'ano gravable',
  );
  const cutoffDate = findMetadataValue(matrix, headerRow, (label) => label.includes('fecha corte'));
  const reportDate = findMetadataValue(
    matrix,
    headerRow,
    (label) => label === 'fecha reporte' || label.includes('fecha de reporte'),
  );
  const parsedYear = year.value ? Number(year.value.replace(/\D/g, '')) : Number.NaN;

  return {
    documentType: documentType.value,
    documentRaw: document.value,
    documentNormalized: normalizeDocument(document.value),
    taxpayerName: name.value,
    taxYear: Number.isInteger(parsedYear) ? parsedYear : null,
    cutoffDate: cutoffDate.value,
    reportDate: reportDate.value,
    source: {
      sheet: sheetName,
      ...(document.row === undefined ? {} : { documentRow: document.row }),
      ...(name.row === undefined ? {} : { nameRow: name.row }),
    },
  };
}
