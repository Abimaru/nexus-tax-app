import { describe, expect, it } from 'vitest';
import { DEFAULT_PDF_LIMITS, extractCandidates } from '../src';
import { representation } from './fixtures';

/**
 * Sprint 2.4, Fase F.3 — Unified Reconciliation & Coverage Hardening
 * (§12/§21). Amplía la cobertura textual de `co.form-220.generic` con
 * vocabulario público del Formulario 220 DIAN (nunca derivado de un
 * documento real). No se resuelve OCR aquí (§12): solo páginas textuales.
 */

const context = {
  caseId: 'case:synthetic',
  documentId: 'document:synthetic',
  sessionId: 'session:synthetic',
  timestamp: '2026-09-01T00:00:00.000Z',
};

describe('co.form-220.generic — cobertura textual ampliada (Fase F.3, §12)', () => {
  it('extrae ingresos por rentas de trabajo (variante sin "ingresos laborales")', () => {
    const result = extractCandidates(
      representation('Ingresos por rentas de trabajo: $ 48.000.000'),
      'form_220',
      context,
      DEFAULT_PDF_LIMITS,
    );
    const candidate = result.candidates.find((c) => c.ruleId === 'employment-income');
    expect(candidate).toBeDefined();
    expect(candidate!.proposedCategory).toBe('employment_income');
  });

  it('extrae auxilio de cesantías consignadas (variante sin "cesantias abonadas")', () => {
    const result = extractCandidates(
      representation('Auxilio de cesantías consignadas por el empleador: $ 1.200.000'),
      'form_220',
      context,
      DEFAULT_PDF_LIMITS,
    );
    const candidate = result.candidates.find((c) => c.ruleId === 'severance');
    expect(candidate).toBeDefined();
    expect(candidate!.proposedCategory).toBe('severance');
  });

  it('extrae otros ingresos como other_income', () => {
    const result = extractCandidates(
      representation('Otros ingresos reportados: $ 300.000'),
      'form_220',
      context,
      DEFAULT_PDF_LIMITS,
    );
    const candidate = result.candidates.find((c) => c.ruleId === 'other-income');
    expect(candidate).toBeDefined();
    expect(candidate!.proposedCategory).toBe('other_income');
  });

  it('extrae retención practicada (variante sin "en la fuente")', () => {
    const result = extractCandidates(
      representation('Valor retenido durante el año: $ 900.000'),
      'form_220',
      context,
      DEFAULT_PDF_LIMITS,
    );
    const candidate = result.candidates.find((c) => c.ruleId === 'withholding');
    expect(candidate).toBeDefined();
    expect(candidate!.proposedCategory).toBe('withholding');
  });

  it('un Form 220 realista con varios conceptos produce candidatos útiles en todas las líneas', () => {
    const result = extractCandidates(
      representation(
        'CERTIFICADO DE INGRESOS Y RETENCIONES - FORMULARIO 220',
        'Total ingresos laborales: $ 48.000.000',
        'Aportes obligatorios a salud: $ 1.920.000',
        'Aportes obligatorios a pensión: $ 1.920.000',
        'Retención en la fuente practicada: $ 900.000',
      ),
      'form_220',
      context,
      DEFAULT_PDF_LIMITS,
    );
    expect(result.candidates.length).toBeGreaterThanOrEqual(4);
    expect(result.candidates.some((c) => c.ruleId === 'employment-income')).toBe(true);
    expect(result.candidates.some((c) => c.ruleId === 'health')).toBe(true);
    expect(result.candidates.some((c) => c.ruleId === 'pension')).toBe(true);
    expect(result.candidates.some((c) => c.ruleId === 'withholding')).toBe(true);
  });
});
