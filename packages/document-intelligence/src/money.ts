import type { AmountCandidate } from '@nexus-tax/domain';

export const MONEY_PARSER_VERSION = '2.0.0';

export interface MoneyParseContext {
  sourceDocumentId?: string | null;
  page?: number | null;
  boundingBox?: AmountCandidate['boundingBox'];
  extractionMethod?: AmountCandidate['extractionMethod'];
  originalEvidence?: string;
}

export type MonetaryAnomalyCode =
  | 'amount_scale_suspected'
  | 'decimal_separator_ambiguous'
  | 'document_exogenous_amount_mismatch'
  | 'monetary_parse_low_confidence';

export interface MonetaryAnomaly {
  code: MonetaryAnomalyCode;
  severity: 'high' | 'medium';
  message: string;
  possibleScaleFactor: number | null;
}

/**
 * Convierte el decimal documental a pesos enteros sin truncarlo. Se redondea
 * al peso más cercano y los empates se alejan de cero. Es una política técnica
 * de representación del borrador; no reemplaza una regla de aproximación DIAN.
 */
export function roundDocumentAmountToTaxPeso(value: number): number {
  if (!Number.isFinite(value)) throw new Error('El valor monetario debe ser finito.');
  return Math.sign(value) * Math.floor(Math.abs(value) + 0.5);
}

function invalidAmount(rawText: string, context: MoneyParseContext): AmountCandidate {
  return {
    rawText,
    normalizedText: '',
    parsedValue: null,
    decimalValue: null,
    roundedTaxValue: null,
    detectedLocale: 'unknown',
    decimalSeparator: null,
    thousandsSeparator: null,
    parsingStrategy: 'invalid',
    confidence: 'insufficient',
    warnings: ['monetary_parse_low_confidence'],
    sourceDocumentId: context.sourceDocumentId ?? null,
    page: context.page ?? null,
    boundingBox: context.boundingBox ?? null,
    extractionMethod: context.extractionMethod ?? 'native',
    originalEvidence: context.originalEvidence ?? rawText,
    parserVersion: MONEY_PARSER_VERSION,
  };
}

function groupedInteger(value: string, separator: ',' | '.'): boolean {
  const parts = value.split(separator);
  return (
    parts.length > 1 &&
    /^\d{1,3}$/.test(parts[0] ?? '') &&
    parts.slice(1).every((part) => /^\d{3}$/.test(part))
  );
}

export function parseMoneyAmount(
  rawText: string,
  context: MoneyParseContext = {},
): AmountCandidate {
  const negative = /^\s*\(.*\)\s*$/.test(rawText) || /-\s*(?:cop|\$)?\s*\d/i.test(rawText);
  const cleaned = rawText
    .replace(/(?:cop|\$)/gi, '')
    .replace(/[()\s-]/g, '')
    .replace(/[^\d,.]/g, '');
  if (!cleaned || !/\d/.test(cleaned)) return invalidAmount(rawText, context);

  const commaCount = (cleaned.match(/,/g) ?? []).length;
  const dotCount = (cleaned.match(/\./g) ?? []).length;
  let detectedLocale: AmountCandidate['detectedLocale'] = 'unknown';
  let decimalSeparator: AmountCandidate['decimalSeparator'] = null;
  let thousandsSeparator: AmountCandidate['thousandsSeparator'] = null;
  let parsingStrategy: AmountCandidate['parsingStrategy'] = 'invalid';
  let confidence: AmountCandidate['confidence'] = 'high';
  const warnings: string[] = [];
  let normalizedText = cleaned;

  if (!commaCount && !dotCount) {
    detectedLocale = 'integer';
    parsingStrategy = 'plain_integer';
  } else if (commaCount && dotCount) {
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');
    decimalSeparator = lastComma > lastDot ? ',' : '.';
    thousandsSeparator = decimalSeparator === ',' ? '.' : ',';
    const decimals = cleaned.length - Math.max(lastComma, lastDot) - 1;
    if (decimals < 1 || decimals > 2) return invalidAmount(rawText, context);
    detectedLocale = decimalSeparator === ',' ? 'es_CO' : 'en_US';
    parsingStrategy = decimalSeparator === ',' ? 'colombian_decimal' : 'english_decimal';
    normalizedText = cleaned.split(thousandsSeparator).join('').replace(decimalSeparator, '.');
  } else {
    const separator: ',' | '.' = commaCount ? ',' : '.';
    const count = commaCount || dotCount;
    const trailingDigits = cleaned.length - cleaned.lastIndexOf(separator) - 1;
    if (groupedInteger(cleaned, separator)) {
      detectedLocale = separator === '.' ? 'es_CO' : 'en_US';
      thousandsSeparator = separator;
      parsingStrategy = 'grouped_integer';
      normalizedText = cleaned.split(separator).join('');
      if (count === 1) {
        confidence = 'medium';
        warnings.push('decimal_separator_ambiguous');
        detectedLocale = 'ambiguous';
        parsingStrategy = 'ambiguous_single_separator';
      }
    } else if (count === 1 && trailingDigits >= 1 && trailingDigits <= 2) {
      decimalSeparator = separator;
      detectedLocale = separator === ',' ? 'es_CO' : 'en_US';
      parsingStrategy = separator === ',' ? 'colombian_decimal' : 'english_decimal';
      normalizedText = cleaned.replace(separator, '.');
      confidence = 'medium';
    } else {
      return invalidAmount(rawText, context);
    }
  }

  const unsignedValue = Number(normalizedText);
  if (!Number.isFinite(unsignedValue)) return invalidAmount(rawText, context);
  const decimalValue = negative ? -unsignedValue : unsignedValue;
  return {
    rawText,
    normalizedText: `${negative ? '-' : ''}${normalizedText}`,
    parsedValue: decimalValue,
    decimalValue,
    roundedTaxValue: roundDocumentAmountToTaxPeso(decimalValue),
    detectedLocale,
    decimalSeparator,
    thousandsSeparator,
    parsingStrategy,
    confidence,
    warnings,
    sourceDocumentId: context.sourceDocumentId ?? null,
    page: context.page ?? null,
    boundingBox: context.boundingBox ?? null,
    extractionMethod: context.extractionMethod ?? 'native',
    originalEvidence: context.originalEvidence ?? rawText,
    parserVersion: MONEY_PARSER_VERSION,
  };
}

function closeToScale(ratio: number, factor: number): boolean {
  return Math.abs(ratio - factor) / factor <= 0.02;
}

export function detectMonetaryAnomalies(
  amount: AmountCandidate,
  comparableValue?: number | null,
): MonetaryAnomaly[] {
  const anomalies: MonetaryAnomaly[] = [];
  if (amount.warnings.includes('decimal_separator_ambiguous')) {
    anomalies.push({
      code: 'decimal_separator_ambiguous',
      severity: 'medium',
      message:
        'El separador único puede representar miles o decimales; confirma el valor original.',
      possibleScaleFactor: null,
    });
  }
  if (amount.parsedValue === null || ['low', 'insufficient'].includes(amount.confidence)) {
    anomalies.push({
      code: 'monetary_parse_low_confidence',
      severity: 'high',
      message: 'La cantidad monetaria no pudo interpretarse con confianza suficiente.',
      possibleScaleFactor: null,
    });
  }
  if (amount.parsedValue === null || comparableValue === null || comparableValue === undefined)
    return anomalies;
  const smaller = Math.min(Math.abs(amount.parsedValue), Math.abs(comparableValue));
  const larger = Math.max(Math.abs(amount.parsedValue), Math.abs(comparableValue));
  if (smaller === 0 || larger === 0) return anomalies;
  const ratio = larger / smaller;
  const factor = [10, 100, 1000].find((candidate) => closeToScale(ratio, candidate)) ?? null;
  if (factor) {
    anomalies.push({
      code: 'amount_scale_suspected',
      severity: 'high',
      message: `Posible error de escala ×${factor} causado por separadores monetarios.`,
      possibleScaleFactor: factor,
    });
  } else if (Math.abs(amount.parsedValue - comparableValue) / smaller > 0.5) {
    anomalies.push({
      code: 'document_exogenous_amount_mismatch',
      severity: 'high',
      message: 'El valor documental y la fuente comparable tienen magnitudes incompatibles.',
      possibleScaleFactor: null,
    });
  }
  return anomalies;
}
