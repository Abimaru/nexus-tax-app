import Dexie, { type Table } from 'dexie';
import type { FilingObligationInputs } from '@nexus-tax/aegis-rules';
import type { CaseAnalysis, ProcessingResult, TaxCase, UploadedDocument } from '@nexus-tax/domain';

/**
 * Persistencia local en IndexedDB mediante Dexie (§12, §14 del alcance).
 * Todo permanece en el navegador. Nunca se envía a un servidor.
 *
 * IMPORTANTE (privacidad): NO se persiste el archivo original. Solo metadatos
 * del documento y el resultado normalizado derivado.
 */

export interface StoredResult {
  /** Un resultado por expediente (clave primaria). */
  caseId: string;
  result: ProcessingResult;
  updatedAt: string;
}

export interface StoredFilingInputs {
  caseId: string;
  isVatResponsibleAtYearEnd: FilingObligationInputs['isVatResponsibleAtYearEnd'];
  updatedAt: string;
}

export type StoredAnalysis = CaseAnalysis;

class NexusTaxDatabase extends Dexie {
  cases!: Table<TaxCase, string>;
  documents!: Table<UploadedDocument, string>;
  results!: Table<StoredResult, string>;
  filingInputs!: Table<StoredFilingInputs, string>;
  analyses!: Table<StoredAnalysis, string>;

  constructor() {
    super('nexustax');
    this.version(1).stores({
      cases: 'id, updatedAt, taxYear, status',
      documents: 'id, caseId, uploadedAt',
      results: 'caseId, updatedAt',
    });
    this.version(2).stores({
      cases: 'id, updatedAt, taxYear, status',
      documents: 'id, caseId, uploadedAt',
      results: 'caseId, updatedAt',
      filingInputs: 'caseId, updatedAt',
    });
    this.version(3).stores({
      cases: 'id, updatedAt, taxYear, status',
      documents: 'id, caseId, uploadedAt',
      results: 'caseId, updatedAt',
      filingInputs: 'caseId, updatedAt',
      analyses: 'caseId, updatedAt, ruleVersion',
    });
  }
}

/** Instancia perezosa; solo se crea en el navegador. */
let dbInstance: NexusTaxDatabase | null = null;

export function getDb(): NexusTaxDatabase {
  if (typeof window === 'undefined') {
    throw new Error('IndexedDB solo está disponible en el navegador.');
  }
  if (!dbInstance) dbInstance = new NexusTaxDatabase();
  return dbInstance;
}
