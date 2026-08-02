import { z } from 'zod';
import { DocumentCapturedFieldSchema, DocumentConfidenceLevelSchema } from './documentExtraction';
import { DocumentKindSchema } from './documents';
import { IsoTimestampSchema } from './primitives';

export const DocumentProfileStatusSchema = z.enum(['draft', 'tested', 'active', 'obsolete']);
export type DocumentProfileStatus = z.infer<typeof DocumentProfileStatusSchema>;

export const DocumentProfileOriginSchema = z.enum(['manual', 'promoted_from_feedback']);
export type DocumentProfileOrigin = z.infer<typeof DocumentProfileOriginSchema>;

export const DocumentZonePurposeSchema = z.enum([
  'header',
  'identity',
  'period',
  'product',
  'table',
  'totals',
  'observations',
  'footer',
  'ignored',
]);
export type DocumentZonePurpose = z.infer<typeof DocumentZonePurposeSchema>;

// Coordenadas relativas (0-1) respecto al ancho/alto de la página para que la
// zona siga siendo válida aunque el documento se re-renderice a otra escala.
export const DocumentProfileZoneSchema = z.object({
  id: z.string().min(1),
  purpose: DocumentZonePurposeSchema,
  page: z.number().int().positive().nullable(),
  relativeX: z.number().min(0).max(1),
  relativeY: z.number().min(0).max(1),
  relativeWidth: z.number().min(0).max(1),
  relativeHeight: z.number().min(0).max(1),
  field: DocumentCapturedFieldSchema.nullable(),
  adapterId: z.string().nullable(),
  version: z.string().min(1),
  evidence: z.string().max(240),
  createdBy: z.literal('analyst'),
});
export type DocumentProfileZone = z.infer<typeof DocumentProfileZoneSchema>;

// Señales estructurales usadas para sugerir un perfil compatible; nunca se
// asocia solo por nombre de archivo (§15).
export const DocumentProfileSignalsSchema = z.object({
  pageWidth: z.number().nullable(),
  pageHeight: z.number().nullable(),
  pageCount: z.number().int().nonnegative().nullable(),
  sectionLabels: z.array(z.string()),
  headerKeywords: z.array(z.string()),
});
export type DocumentProfileSignals = z.infer<typeof DocumentProfileSignalsSchema>;

// Un perfil vive a nivel de instalación local, no de expediente: el mismo
// certificado de un banco puede repetirse en expedientes de años distintos y
// debe poder reconocerse en cualquiera de ellos. entityId es un indicio, no
// una clave estable entre expedientes (las entidades se resuelven por
// expediente); brandName y las señales estructurales son lo que realmente
// sostiene el reconocimiento entre expedientes.
export const DocumentProfileSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  documentKind: DocumentKindSchema,
  entityId: z.string().nullable(),
  brandName: z.string().nullable(),
  signals: DocumentProfileSignalsSchema,
  expectedPageCount: z.number().int().positive().nullable(),
  zones: z.array(DocumentProfileZoneSchema),
  fields: z.array(DocumentCapturedFieldSchema),
  adapterId: z.string().nullable(),
  version: z.string().min(1),
  confidence: DocumentConfidenceLevelSchema,
  origin: DocumentProfileOriginSchema,
  status: DocumentProfileStatusSchema,
  createdAt: IsoTimestampSchema,
  updatedAt: IsoTimestampSchema,
});
export type DocumentProfile = z.infer<typeof DocumentProfileSchema>;

export const DOCUMENT_PROFILE_SCHEMA_VERSION = '1.0.0';
