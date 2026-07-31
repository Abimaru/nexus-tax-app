import { z } from 'zod';

export const TaxpayerIdentitySchema = z.object({
  documentType: z.string().nullable(),
  documentRaw: z.string().nullable(),
  documentNormalized: z.string().nullable(),
  taxpayerName: z.string().nullable(),
  taxYear: z.number().int().nullable(),
  cutoffDate: z.string().nullable(),
  reportDate: z.string().nullable(),
  source: z.object({
    sheet: z.string(),
    documentRow: z.number().int().positive().optional(),
    nameRow: z.number().int().positive().optional(),
  }),
});
export type TaxpayerIdentity = z.infer<typeof TaxpayerIdentitySchema>;
