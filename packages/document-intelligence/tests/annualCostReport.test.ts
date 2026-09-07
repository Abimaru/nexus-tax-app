import { describe, expect, it } from 'vitest';
import { DEFAULT_PDF_LIMITS, classifyDocument, extractCandidates, selectAdapter } from '../src';
import { representation } from './fixtures';

/**
 * Sprint 2.4, Fase F.3 — Unified Reconciliation & Coverage Hardening (§9/§21).
 *
 * `annual_cost_report` (p. ej. reportes anuales de costos de billeteras
 * digitales) antes caía en `co.generic.label-value` (categoría
 * `unclassified`, siempre requiere revisión, sin distinguir conceptos).
 * Este fixture cubre el nuevo adaptador dedicado con los 4 conceptos
 * exigidos por el prompt: intereses/rendimientos, retención, GMF, y un
 * total informativo. Ningún valor es real.
 */

const context = {
  caseId: 'case:synthetic',
  documentId: 'document:synthetic',
  sessionId: 'session:synthetic',
  timestamp: '2026-09-01T00:00:00.000Z',
};

describe('co.annual-cost-report.generic (Fase F.3, §9)', () => {
  it('selectAdapter resuelve el adaptador dedicado para annual_cost_report', () => {
    expect(selectAdapter('annual_cost_report').id).toBe('co.annual-cost-report.generic');
  });

  it('clasifica un reporte anual de costos sintético con la señal correcta', () => {
    const classification = classifyDocument(
      representation('Reporte anual de costos y gastos 2025'),
    );
    expect(classification.proposedKind).toBe('annual_cost_report');
  });

  it('extrae intereses/rendimientos como financial_income', () => {
    const result = extractCandidates(
      representation('Intereses pagados durante el período: $ 120.000'),
      'annual_cost_report',
      context,
      DEFAULT_PDF_LIMITS,
    );
    const candidate = result.candidates.find((c) => c.ruleId === 'interest');
    expect(candidate).toBeDefined();
    expect(candidate!.proposedCategory).toBe('financial_income');
  });

  it('extrae retención en la fuente como withholding', () => {
    const result = extractCandidates(
      representation('Retención en la fuente sobre rendimientos: $ 12.000'),
      'annual_cost_report',
      context,
      DEFAULT_PDF_LIMITS,
    );
    const candidate = result.candidates.find((c) => c.ruleId === 'withholding');
    expect(candidate).toBeDefined();
    expect(candidate!.proposedCategory).toBe('withholding');
  });

  it('extrae GMF como deduction_candidate', () => {
    const result = extractCandidates(
      representation('Gravamen a los movimientos financieros (GMF): $ 5.000'),
      'annual_cost_report',
      context,
      DEFAULT_PDF_LIMITS,
    );
    const candidate = result.candidates.find((c) => c.ruleId === 'gmf');
    expect(candidate).toBeDefined();
    expect(candidate!.proposedCategory).toBe('deduction_candidate');
  });

  it('marca un total de entidad como informativo, no como concepto sin clasificar', () => {
    const result = extractCandidates(
      representation('Entidad Sintética Compañía de Financiamiento SA Total: $ 200.000'),
      'annual_cost_report',
      context,
      DEFAULT_PDF_LIMITS,
    );
    const candidate = result.candidates.find((c) => c.ruleId === 'informational-total');
    expect(candidate).toBeDefined();
    expect(candidate!.proposedCategory).toBe('informational');
  });

  it('no duplica el gate semántico (reutiliza el mismo mecanismo de matching.ts)', () => {
    const result = extractCandidates(
      representation('Retención sobre rendimientos financieros: $ 12.000'),
      'annual_cost_report',
      context,
      DEFAULT_PDF_LIMITS,
    );
    // Igual que en co.financial.consolidated.generic (Fase F.2): la
    // retención domina sobre el ingreso en la misma línea — nunca se
    // genera también un candidato `interest` para el mismo valor.
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]!.proposedCategory).toBe('withholding');
  });
});
