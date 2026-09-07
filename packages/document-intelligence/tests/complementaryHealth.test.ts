import { describe, expect, it } from 'vitest';
import { DEFAULT_PDF_LIMITS, classifyDocument, extractCandidates, selectAdapter } from '../src';
import { representation } from './fixtures';

/**
 * Sprint 2.4, Fase H — Salud complementaria y medicina prepagada (§12).
 * Ningún texto proviene de un documento real; es vocabulario estructural
 * genérico.
 */

const context = {
  caseId: 'case:synthetic',
  documentId: 'document:synthetic',
  sessionId: 'session:synthetic',
  timestamp: '2026-09-01T00:00:00.000Z',
};

describe('co.complementary-health.generic (Fase H)', () => {
  it('selectAdapter resuelve el adaptador dedicado', () => {
    expect(selectAdapter('complementary_health_certificate').id).toBe(
      'co.complementary-health.generic',
    );
  });

  it('clasifica un certificado de medicina prepagada sintético', () => {
    const classification = classifyDocument(
      representation('Certificado de medicina prepagada 2025, entidad vigilada'),
    );
    expect(classification.proposedKind).toBe('complementary_health_certificate');
  });

  it('clasifica un certificado de seguro de salud sintético', () => {
    const classification = classifyDocument(
      representation('Seguro de salud - Superintendencia Financiera de Colombia, año 2025'),
    );
    expect(classification.proposedKind).toBe('complementary_health_certificate');
  });

  it('extrae el pago mensual como deduction_candidate', () => {
    const result = extractCandidates(
      representation('Pago mensual de medicina prepagada: $ 300.000'),
      'complementary_health_certificate',
      context,
      DEFAULT_PDF_LIMITS,
    );
    const candidate = result.candidates.find((c) => c.ruleId === 'monthly-payment');
    expect(candidate).toBeDefined();
    expect(candidate!.proposedCategory).toBe('deduction_candidate');
    expect(candidate!.extractedValue).toBe(300_000);
  });

  it('extrae el total del certificado como un candidato INDEPENDIENTE del pago mensual (nunca mensual × 12)', () => {
    const result = extractCandidates(
      representation(
        'Pago mensual de medicina prepagada: $ 300.000',
        'Total certificado anual: $ 3.600.000',
      ),
      'complementary_health_certificate',
      context,
      DEFAULT_PDF_LIMITS,
    );
    const monthly = result.candidates.find((c) => c.ruleId === 'monthly-payment');
    const annual = result.candidates.find((c) => c.ruleId === 'annual-total');
    expect(monthly).toBeDefined();
    expect(annual).toBeDefined();
    expect(monthly!.extractedValue).toBe(300_000);
    expect(annual!.extractedValue).toBe(3_600_000);
  });

  it('nunca promueve número de póliza, identificación, teléfono, resolución ni porcentaje como candidato', () => {
    const result = extractCandidates(
      representation(
        'Numero de poliza: 123456789',
        'Identificacion del titular: 1000000001',
        'Telefono de contacto: 3001234567',
        'Resolucion 000044 de 2024',
        'Porcentaje de cobertura: 80%',
      ),
      'complementary_health_certificate',
      context,
      DEFAULT_PDF_LIMITS,
    );
    expect(result.candidates).toHaveLength(0);
  });

  it('nunca exige la palabra "factura" para reconocer el documento ni sus reglas', () => {
    const adapter = selectAdapter('complementary_health_certificate');
    const allPatterns = adapter.rules.flatMap((rule) => rule.labels.map((label) => label.source));
    expect(allPatterns.join(' ')).not.toMatch(/factura/i);
  });
});
