import { z } from 'zod';

export const AmountCandidateSchema = z.object({
  rawText: z.string(),
  normalizedText: z.string(),
  parsedValue: z.number().nullable(),
  decimalValue: z.number().nullable(),
  roundedTaxValue: z.number().int().nullable(),
  detectedLocale: z.enum(['es_CO', 'en_US', 'integer', 'ambiguous', 'unknown']),
  decimalSeparator: z.enum([',', '.']).nullable(),
  thousandsSeparator: z.enum([',', '.']).nullable(),
  parsingStrategy: z.enum([
    'colombian_decimal',
    'english_decimal',
    'grouped_integer',
    'plain_integer',
    'ambiguous_single_separator',
    'invalid',
  ]),
  confidence: z.enum(['high', 'medium', 'low', 'insufficient']),
  warnings: z.array(z.string()),
  sourceDocumentId: z.string().nullable(),
  page: z.number().int().positive().nullable(),
  boundingBox: z
    .object({
      x: z.number(),
      y: z.number(),
      width: z.number().nullable(),
      height: z.number().nullable(),
    })
    .nullable(),
  extractionMethod: z.enum(['native', 'ocr', 'manual', 'imported']),
  originalEvidence: z.string(),
  parserVersion: z.string(),
});

export type AmountCandidate = z.infer<typeof AmountCandidateSchema>;
