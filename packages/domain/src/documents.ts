import { z } from 'zod';
import { IsoTimestampSchema } from './primitives';

/**
 * UploadedDocument — metadatos de un archivo aportado a un expediente.
 * Por privacidad, NO se persiste el contenido binario del archivo por defecto;
 * solo sus metadatos y el resultado normalizado derivado.
 */

export const DocumentKindSchema = z.enum([
  'exogenous', // Información exógena (Excel) — foco del Sprint 1
  'employment_certificate', // Formulario 220 / certificado laboral (futuro)
  'financial_certificate', // Certificados bancarios (futuro)
  'other',
]);
export type DocumentKind = z.infer<typeof DocumentKindSchema>;

export const DocumentStatusSchema = z.enum(['pending', 'parsed', 'error']);
export type DocumentStatus = z.infer<typeof DocumentStatusSchema>;

export const UploadedDocumentSchema = z.object({
  id: z.string().min(1),
  caseId: z.string().min(1),
  kind: DocumentKindSchema,
  fileName: z.string().min(1),
  fileSizeBytes: z.number().int().nonnegative(),
  mimeType: z.string().default(''),
  status: DocumentStatusSchema,
  /** Mensaje de error legible cuando status === 'error'. */
  errorMessage: z.string().optional(),
  uploadedAt: IsoTimestampSchema,
});
export type UploadedDocument = z.infer<typeof UploadedDocumentSchema>;
