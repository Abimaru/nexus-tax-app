import type { FilingDeadlineResult } from '../../../types';

export const DEADLINE_SOURCE_ID = 'dian-calendario-tributario-2026';

export interface DeadlineRange {
  from: number;
  to: number;
  dueDate: string;
}

/** Rangos oficiales para renta de personas naturales AG 2025. */
export const INDIVIDUAL_INCOME_TAX_DEADLINES_2026: readonly DeadlineRange[] = [
  { from: 1, to: 2, dueDate: '2026-08-12' },
  { from: 3, to: 4, dueDate: '2026-08-13' },
  { from: 5, to: 6, dueDate: '2026-08-14' },
  { from: 7, to: 8, dueDate: '2026-08-18' },
  { from: 9, to: 10, dueDate: '2026-08-19' },
  { from: 11, to: 12, dueDate: '2026-08-20' },
  { from: 13, to: 14, dueDate: '2026-08-21' },
  { from: 15, to: 16, dueDate: '2026-08-24' },
  { from: 17, to: 18, dueDate: '2026-08-25' },
  { from: 19, to: 20, dueDate: '2026-08-26' },
  { from: 21, to: 22, dueDate: '2026-08-27' },
  { from: 23, to: 24, dueDate: '2026-08-28' },
  { from: 25, to: 26, dueDate: '2026-08-31' },
  { from: 27, to: 28, dueDate: '2026-09-01' },
  { from: 29, to: 30, dueDate: '2026-09-02' },
  { from: 31, to: 32, dueDate: '2026-09-03' },
  { from: 33, to: 34, dueDate: '2026-09-04' },
  { from: 35, to: 36, dueDate: '2026-09-07' },
  { from: 37, to: 38, dueDate: '2026-09-08' },
  { from: 39, to: 40, dueDate: '2026-09-09' },
  { from: 41, to: 42, dueDate: '2026-09-10' },
  { from: 43, to: 44, dueDate: '2026-09-11' },
  { from: 45, to: 46, dueDate: '2026-09-14' },
  { from: 47, to: 48, dueDate: '2026-09-15' },
  { from: 49, to: 50, dueDate: '2026-09-16' },
  { from: 51, to: 52, dueDate: '2026-09-17' },
  { from: 53, to: 54, dueDate: '2026-09-18' },
  { from: 55, to: 56, dueDate: '2026-09-21' },
  { from: 57, to: 58, dueDate: '2026-09-22' },
  { from: 59, to: 60, dueDate: '2026-09-23' },
  { from: 61, to: 62, dueDate: '2026-09-24' },
  { from: 63, to: 64, dueDate: '2026-09-25' },
  { from: 65, to: 66, dueDate: '2026-09-28' },
  { from: 67, to: 68, dueDate: '2026-10-01' },
  { from: 69, to: 70, dueDate: '2026-10-02' },
  { from: 71, to: 72, dueDate: '2026-10-05' },
  { from: 73, to: 74, dueDate: '2026-10-06' },
  { from: 75, to: 76, dueDate: '2026-10-07' },
  { from: 77, to: 78, dueDate: '2026-10-08' },
  { from: 79, to: 80, dueDate: '2026-10-09' },
  { from: 81, to: 82, dueDate: '2026-10-13' },
  { from: 83, to: 84, dueDate: '2026-10-14' },
  { from: 85, to: 86, dueDate: '2026-10-15' },
  { from: 87, to: 88, dueDate: '2026-10-16' },
  { from: 89, to: 90, dueDate: '2026-10-19' },
  { from: 91, to: 92, dueDate: '2026-10-20' },
  { from: 93, to: 94, dueDate: '2026-10-21' },
  { from: 95, to: 96, dueDate: '2026-10-22' },
  { from: 97, to: 98, dueDate: '2026-10-23' },
  { from: 99, to: 0, dueDate: '2026-10-26' },
];

function extractLastTwoDigits(
  document: string | null,
  documentType?: string | null,
): string | null {
  if (!document) return null;
  const isNit = documentType?.trim().toUpperCase() === 'NIT';
  const hasSeparatedCheckDigit = /[-–]\s*\d\s*$/.test(document);
  const valueWithoutCheckDigit =
    isNit && hasSeparatedCheckDigit ? document.replace(/[-–]\s*\d\s*$/, '') : document;
  const digits = valueWithoutCheckDigit.replace(/\D/g, '');
  return digits.length >= 2 ? digits.slice(-2) : null;
}

export function calculateFilingDeadline(
  document: string | null,
  documentType?: string | null,
): FilingDeadlineResult {
  const lastTwoDigits = extractLastTwoDigits(document, documentType);
  if (!lastTwoDigits) {
    return {
      status: 'missing_document',
      lastTwoDigits: null,
      dueDate: null,
      sourceId: DEADLINE_SOURCE_ID,
      explanation: 'No fue posible obtener los dos últimos dígitos del documento.',
    };
  }

  const numericDigits = Number(lastTwoDigits);
  const range = INDIVIDUAL_INCOME_TAX_DEADLINES_2026.find(({ from, to }) =>
    from === 99 && to === 0
      ? numericDigits === 99 || numericDigits === 0
      : numericDigits >= from && numericDigits <= to,
  );
  if (!range) throw new Error(`No existe vencimiento para los dígitos ${lastTwoDigits}.`);

  return {
    status: 'available',
    lastTwoDigits,
    dueDate: range.dueDate,
    sourceId: DEADLINE_SOURCE_ID,
    explanation: `Los dígitos ${lastTwoDigits} vencen el ${range.dueDate}.`,
  };
}
