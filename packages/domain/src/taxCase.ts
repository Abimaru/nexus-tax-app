import { z } from 'zod';
import { IsoTimestampSchema, TaxYearSchema } from './primitives';

export const TaxCaseStatusSchema = z.enum([
  'new',
  'collecting_documents',
  'under_analysis',
  'pending_information',
  'ready_for_review',
  'closed',
]);
export type TaxCaseStatus = z.infer<typeof TaxCaseStatusSchema>;

export const CaseTaxpayerSchema = z.object({
  documentType: z.string().nullable(),
  documentMasked: z.string().nullable(),
  displayName: z.string().nullable(),
});
export type CaseTaxpayer = z.infer<typeof CaseTaxpayerSchema>;

export const TaxCaseSchema = z.object({
  id: z.string().min(1),
  alias: z.string().trim().min(2, 'El alias debe tener al menos 2 caracteres').max(120),
  taxpayer: CaseTaxpayerSchema,
  taxYear: TaxYearSchema,
  filingYear: TaxYearSchema,
  notes: z.string().max(2000).optional(),
  status: TaxCaseStatusSchema,
  createdAt: IsoTimestampSchema,
  updatedAt: IsoTimestampSchema,
});
export type TaxCase = z.infer<typeof TaxCaseSchema>;

export const CreateTaxCaseInputSchema = z.object({
  alias: TaxCaseSchema.shape.alias,
  taxYear: TaxYearSchema,
  notes: z.string().max(2000).optional(),
});
export type CreateTaxCaseInput = z.infer<typeof CreateTaxCaseInputSchema>;
