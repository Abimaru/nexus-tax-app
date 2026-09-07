import { describe, expect, it } from 'vitest';
import { DEFAULT_PDF_LIMITS, analyzePdfDocument } from '../src';
import { syntheticTextPdf } from './fixtures';

/**
 * Sprint 2.4, Fase F.3 — Unified Reconciliation & Coverage Hardening
 * (§13-§15/§21). Cubre el routing documental explícito ANTES del
 * pipeline genérico de candidatos:
 *
 *   A. declaración de un año anterior → NO se generan candidatos vía el
 *      pipeline genérico (usa `extractPriorYearForm210` en su lugar);
 *   B. extracto bancario transaccional → NO genera decenas de
 *      candidatos tributarios principales;
 *   C. un certificado tributario normal sigue usando el pipeline
 *      genérico sin cambios (no regresión).
 *
 * En los tres casos el documento se sigue analizando (diagnóstico,
 * clasificación, métricas) — nunca se descarta (§14). Ningún valor es
 * real.
 */

const context = {
  caseId: 'case:synthetic',
  documentId: 'document:synthetic',
  sessionId: 'session:synthetic',
  timestamp: '2026-09-01T00:00:00.000Z',
};

describe('routing documental (Fase F.3, §13-§15)', () => {
  it('A. una declaración de un año anterior no genera candidatos vía el pipeline genérico', async () => {
    const pdf = syntheticTextPdf([
      'DECLARACION DE RENTA - FORMULARIO 210',
      'Renglon 29 Total patrimonio bruto: $ 100.000.000',
      'Renglon 65 Total ingresos: $ 50.000.000',
    ]);
    const result = await analyzePdfDocument({
      bytes: pdf,
      ...context,
      forcedKind: 'prior_year_return',
      limits: DEFAULT_PDF_LIMITS,
    });
    expect(result.candidates).toHaveLength(0);
    expect(result.findings.some((f) => f.code === 'requires_specialized_route')).toBe(true);
    expect(
      result.findings.find((f) => f.code === 'requires_specialized_route')?.message,
    ).toMatch(/declaraci[oó]n de un a[ñn]o anterior/i);
    // El documento sigue diagnosticado y clasificado (§14: nunca se descarta).
    expect(result.diagnosis.type).toBe('textual');
    expect(result.classification.proposedKind).toBe('prior_year_return');
  });

  it('B. un extracto bancario transaccional no genera decenas de candidatos', async () => {
    const transactionLines = Array.from({ length: 25 }, (_, index) => {
      const day = String((index % 28) + 1).padStart(2, '0');
      return `Movimiento transferencia consignacion ${day}/01/2025: $ ${1000 + index}`;
    });
    const pdf = syntheticTextPdf(['EXTRACTO DE MOVIMIENTOS', ...transactionLines]);
    const result = await analyzePdfDocument({
      bytes: pdf,
      ...context,
      forcedKind: 'consolidated_tax_certificate',
      limits: DEFAULT_PDF_LIMITS,
    });
    expect(result.candidates).toHaveLength(0);
    expect(result.findings.some((f) => f.code === 'requires_specialized_route')).toBe(true);
    expect(
      result.findings.find((f) => f.code === 'requires_specialized_route')?.message,
    ).toMatch(/extracto de movimientos/i);
    // El documento sigue disponible para diagnóstico/evidencia (§14).
    expect(result.diagnosis.type).toBe('textual');
  });

  it('C. un certificado tributario normal sigue usando el pipeline genérico sin cambios', async () => {
    const pdf = syntheticTextPdf([
      'CERTIFICADO TRIBUTARIO SINTETICO',
      'Saldo al cierre: $ 1.000.000',
    ]);
    const result = await analyzePdfDocument({
      bytes: pdf,
      ...context,
      forcedKind: 'balance_certificate',
      limits: DEFAULT_PDF_LIMITS,
    });
    expect(result.candidates.length).toBeGreaterThan(0);
    expect(result.findings.some((f) => f.code === 'requires_specialized_route')).toBe(false);
  });
});
