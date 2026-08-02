import { z } from 'zod';
import { IsoTimestampSchema } from './primitives';

export const WorkflowStageIdSchema = z.enum([
  'fuente',
  'extraccion',
  'organizacion',
  'conciliacion',
  'declaracion',
  'exportacion',
]);
export type WorkflowStageId = z.infer<typeof WorkflowStageIdSchema>;

export const WorkflowStageStatusSchema = z.enum([
  'locked',
  'available',
  'active',
  'incomplete',
  'completed',
  'requires_attention',
]);
export type WorkflowStageStatus = z.infer<typeof WorkflowStageStatusSchema>;

export const WorkflowViewIdSchema = z.enum([
  'cargar',
  'estado-fuente',
  'reemplazar',
  'datos-basicos',
  'inspeccion',
  'estructura',
  'mapeo',
  'topes',
  'registros',
  'calidad',
  'revision-documental',
  'pendientes',
  'resumen',
  'entidades',
  'documentos',
  'requisitos',
  'hechos',
  'conciliaciones',
  'matriz',
  'hallazgos',
  'resoluciones',
  'obligacion',
  'calendario',
  'formulario-210',
  'resumen-final',
  'exportar',
  'manifiesto',
  'historial',
]);
export type WorkflowViewId = z.infer<typeof WorkflowViewIdSchema>;

export const CaseNavigationStateSchema = z.object({
  caseId: z.string().min(1),
  lastStage: WorkflowStageIdSchema,
  lastView: WorkflowViewIdSchema,
  recommendedStage: WorkflowStageIdSchema,
  completedViews: z.array(z.string()),
  manualMode: z.boolean(),
  updatedAt: IsoTimestampSchema,
});
export type CaseNavigationState = z.infer<typeof CaseNavigationStateSchema>;
