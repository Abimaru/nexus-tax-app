/**
 * @nexus-tax/domain
 * -----------------
 * Modelo de dominio de NexusTax: tipos y esquemas Zod explícitos.
 * Este paquete es PURO: no depende de React, del navegador ni de librerías de
 * parsing. Es la única fuente de verdad sobre la forma de los datos.
 *
 * Separación de capas (§5):
 *  - primitives / records   -> datos crudos y normalizados
 *  - findings               -> hallazgos
 *  - processing (metrics)   -> métricas
 *  - aggregates / checklist -> presentación / derivados
 */
export * from './primitives';
export * from './taxCase';
export * from './documents';
export * from './workbook';
export * from './records';
export * from './taxpayer';
export * from './taxClassification';
export * from './aggregates';
export * from './findings';
export * from './exogenousReport';
export * from './checklist';
export * from './processing';
export * from './analysis';
export * from './taxDossier';
export * from './employment';

/** Versión del contrato de dominio. Se incrementa ante cambios incompatibles. */
export const DOMAIN_VERSION = '0.4.1';
