import { describe, expect, it } from 'vitest';
import { DEFAULT_PDF_LIMITS, classifyDocument, extractCandidates, selectAdapter } from '../src';
import { representation } from './fixtures';

/**
 * Sprint 2.4, Fase G — Inmuebles, renta inmobiliaria y administración de
 * propiedad horizontal (§17/§18/§19). Ningún texto proviene de un
 * documento real; es vocabulario estructural genérico.
 */

const context = {
  caseId: 'case:synthetic',
  documentId: 'document:synthetic',
  sessionId: 'session:synthetic',
  timestamp: '2026-09-01T00:00:00.000Z',
};

describe('co.property-administration.generic (Fase G)', () => {
  it('selectAdapter resuelve el adaptador dedicado', () => {
    expect(selectAdapter('property_administration_certificate').id).toBe(
      'co.property-administration.generic',
    );
  });

  it('clasifica un certificado de administración sintético', () => {
    const classification = classifyDocument(
      representation('Certificado de administración de propiedad horizontal 2025'),
    );
    expect(classification.proposedKind).toBe('property_administration_certificate');
  });

  it('extrae la cuota mensual como deduction_candidate', () => {
    const result = extractCandidates(
      representation('Cuota mensual de administración: $ 250.000'),
      'property_administration_certificate',
      context,
      DEFAULT_PDF_LIMITS,
    );
    const candidate = result.candidates.find((c) => c.ruleId === 'monthly-fee');
    expect(candidate).toBeDefined();
    expect(candidate!.proposedCategory).toBe('deduction_candidate');
  });

  it('extrae el total anual como un candidato INDEPENDIENTE de la cuota mensual (nunca monthly × 12)', () => {
    const result = extractCandidates(
      representation(
        'Cuota mensual de administración: $ 250.000',
        'Total anual pagado: $ 3.000.000',
      ),
      'property_administration_certificate',
      context,
      DEFAULT_PDF_LIMITS,
    );
    const monthly = result.candidates.find((c) => c.ruleId === 'monthly-fee');
    const annual = result.candidates.find((c) => c.ruleId === 'annual-total');
    expect(monthly).toBeDefined();
    expect(annual).toBeDefined();
    expect(monthly!.extractedValue).toBe(250_000);
    expect(annual!.extractedValue).toBe(3_000_000);
  });

  it('extrae una cuota extraordinaria bajo su propia regla, nunca mezclada con la ordinaria', () => {
    const result = extractCandidates(
      representation(
        'Cuota mensual de administración: $ 250.000',
        'Cuota extraordinaria: $ 500.000',
      ),
      'property_administration_certificate',
      context,
      DEFAULT_PDF_LIMITS,
    );
    const monthly = result.candidates.find((c) => c.ruleId === 'monthly-fee');
    const extraordinary = result.candidates.find((c) => c.ruleId === 'extraordinary-fee');
    expect(monthly).toBeDefined();
    expect(extraordinary).toBeDefined();
    expect(monthly!.ruleId).not.toBe(extraordinary!.ruleId);
  });

  it('marca el saldo pendiente como informativo, no como deducción', () => {
    const result = extractCandidates(
      representation('Saldo pendiente de la cuenta: $ 100.000'),
      'property_administration_certificate',
      context,
      DEFAULT_PDF_LIMITS,
    );
    const candidate = result.candidates.find((c) => c.ruleId === 'balance');
    expect(candidate).toBeDefined();
    expect(candidate!.proposedCategory).toBe('informational');
  });

  it('nunca exige la palabra "factura" para reconocer el documento ni sus reglas', () => {
    const adapter = selectAdapter('property_administration_certificate');
    const allPatterns = adapter.rules.flatMap((rule) => rule.labels.map((label) => label.source));
    expect(allPatterns.join(' ')).not.toMatch(/factura/i);
  });
});
