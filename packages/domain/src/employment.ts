import { z } from 'zod';
import { CoverageStatusSchema } from './taxDossier';
import { IsoTimestampSchema } from './primitives';

export const EmployerInstanceStatusSchema = z.enum([
  'pending',
  'partially_covered',
  'covered',
  'not_applicable',
  'requires_review',
]);
export type EmployerInstanceStatus = z.infer<typeof EmployerInstanceStatusSchema>;

export const EmployerInstanceSchema = z.object({
  id: z.string().min(1),
  employerName: z.string(),
  taxIdMasked: z.string().nullable(),
  workedPeriod: z.string(),
  entityId: z.string().nullable(),
  form220DocumentId: z.string().nullable(),
  complementaryDocumentIds: z.array(z.string()),
  status: EmployerInstanceStatusSchema,
  coverage: CoverageStatusSchema,
  observations: z.string(),
  source: z.enum(['detected', 'manual']),
  manualMatchConfirmed: z.boolean(),
  createdAt: IsoTimestampSchema,
  updatedAt: IsoTimestampSchema,
});
export type EmployerInstance = z.infer<typeof EmployerInstanceSchema>;

export const AdditionalDetectedEmployerSchema = z.object({
  entityId: z.string(),
  employerName: z.string(),
  taxIdMasked: z.string().nullable(),
});
export type AdditionalDetectedEmployer = z.infer<typeof AdditionalDetectedEmployerSchema>;

export const EmploymentGroupFindingSchema = z.object({
  id: z.string(),
  code: z.literal('employment_employer_limit_exceeded'),
  severity: z.literal('info'),
  message: z.string(),
  entityIds: z.array(z.string()),
});
export type EmploymentGroupFinding = z.infer<typeof EmploymentGroupFindingSchema>;

export const EmploymentIncomeGroupSchema = z.object({
  id: z.string().min(1),
  caseId: z.string().min(1),
  title: z.literal('Ingresos laborales y empleadores'),
  receivedEmploymentIncome: z.boolean().nullable(),
  instances: z.array(EmployerInstanceSchema).max(3),
  additionalDetectedEmployers: z.array(AdditionalDetectedEmployerSchema),
  coverage: z.enum(['pending', 'partial', 'covered', 'not_applicable', 'requires_review']),
  findings: z.array(EmploymentGroupFindingSchema),
  createdAt: IsoTimestampSchema,
  updatedAt: IsoTimestampSchema,
});
export type EmploymentIncomeGroup = z.infer<typeof EmploymentIncomeGroupSchema>;

export const MAX_EMPLOYER_INSTANCES = 3;
