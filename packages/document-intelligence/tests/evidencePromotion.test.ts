import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PDF_LIMITS,
  analyzePdfDocument,
  classifyDocumentNumericEvidence,
  extractCandidates,
} from '../src';
import { representation, syntheticTextPdf } from './fixtures';

const context = {
  caseId: 'case:synthetic',
  documentId: 'document:synthetic',
  sessionId: 'session:synthetic',
  timestamp: '2026-08-01T00:00:00.000Z',
};

/**
 * Promotion gate (Sprint 2.4, Fase E.1, §2-§10 de docs/EVIDENCE_MATCHING.md):
 * `classifyNumericEvidence` ahora participa en la decisión de promover un
 * token a `DocumentFactCandidate` monetario, no solo en la inspección.
 * Estos tests verifican el pipeline completo (`extractCandidates`), no
 * solo el clasificador aislado (ver `evidenceClassifier.test.ts`).
 */
describe('promoción de evidencia numérica a candidato monetario (Fase E.1)', () => {
  it('no promueve un NIT con separadores como candidato monetario', () => {
    const result = extractCandidates(
      representation('Saldo total NIT 900.123.456-7: $ 5.000.000'),
      'other',
      context,
      DEFAULT_PDF_LIMITS,
    );
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]?.extractedValue).toBe(5_000_000);
  });

  it('no promueve un NIT sin separadores como candidato monetario', () => {
    const result = extractCandidates(
      representation('Saldo total NIT 900123456: $ 5.000.000'),
      'other',
      context,
      DEFAULT_PDF_LIMITS,
    );
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]?.extractedValue).toBe(5_000_000);
  });

  it('no promueve una cédula (C.C.) como candidato monetario', () => {
    const result = extractCandidates(
      representation('Valor total C.C. 1.130.123.456: $ 2.500.000'),
      'other',
      context,
      DEFAULT_PDF_LIMITS,
    );
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]?.extractedValue).toBe(2_500_000);
  });

  it('no promueve un número de cuenta como candidato monetario', () => {
    const result = extractCandidates(
      representation('Saldo cuenta 1234567890: $ 4.500.000'),
      'other',
      context,
      DEFAULT_PDF_LIMITS,
    );
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]?.extractedValue).toBe(4_500_000);
  });

  it('no promueve un número de resolución como candidato monetario', () => {
    const result = extractCandidates(
      representation('Saldo (Resolucion 000042 de 2020): $ 1.800.000'),
      'other',
      context,
      DEFAULT_PDF_LIMITS,
    );
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]?.extractedValue).toBe(1_800_000);
  });

  it('no promueve un año como candidato monetario', () => {
    const result = extractCandidates(
      representation('Saldo del año gravable 2025: $ 900.000'),
      'other',
      context,
      DEFAULT_PDF_LIMITS,
    );
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]?.extractedValue).toBe(900_000);
  });

  it('no promueve un porcentaje como candidato monetario', () => {
    const result = extractCandidates(
      representation('Valor total: Participación 50% del saldo: $ 700.000'),
      'other',
      context,
      DEFAULT_PDF_LIMITS,
    );
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]?.extractedValue).toBe(700_000);
  });

  it('promueve un saldo grande sin símbolo de moneda (dinero-sin-$)', () => {
    const result = extractCandidates(
      representation('Total pagado 15000 en el periodo'),
      'other',
      context,
      DEFAULT_PDF_LIMITS,
    );
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]?.extractedValue).toBe(15_000);
  });

  it('resuelve el contexto ambiguo de "obligación": identificador sin palabra de monto, dinero con ella', () => {
    const withoutMoneyWord = extractCandidates(
      representation('Saldo (Obligación 4512345678): $ 3.000.000'),
      'other',
      context,
      DEFAULT_PDF_LIMITS,
    );
    // La línea completa tiene "saldo" como etiqueta de regla, pero el
    // NÚMERO de la obligación en sí (sin punto de miles) sigue
    // suprimido; solo el valor con $ se promueve.
    expect(withoutMoneyWord.candidates).toHaveLength(1);
    expect(withoutMoneyWord.candidates[0]?.extractedValue).toBe(3_000_000);

    const withMoneyWordAndFormatting = extractCandidates(
      representation('Saldo obligación 45.123.456'),
      'other',
      context,
      DEFAULT_PDF_LIMITS,
    );
    // Aquí "saldo" + formato de miles en el propio número de obligación
    // sí se promueve como dinero (§8).
    expect(withMoneyWordAndFormatting.candidates).toHaveLength(1);
    expect(withMoneyWordAndFormatting.candidates[0]?.extractedValue).toBe(45_123_456);
  });

  it('no duplica candidatos cuando una línea mezcla un número de cuenta y un monto', () => {
    const result = extractCandidates(
      representation('Saldo cuenta 1234567890: $4.500.000'),
      'other',
      context,
      DEFAULT_PDF_LIMITS,
    );
    expect(result.candidates.map((item) => item.extractedValue)).toEqual([4_500_000]);
  });

  it('promueve de forma conservadora un valor "unknown" y lo marca requires_review', () => {
    const result = extractCandidates(
      representation('Retencion en la fuente practicada: 0'),
      'other',
      context,
      DEFAULT_PDF_LIMITS,
    );
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]).toMatchObject({
      extractedValue: 0,
      status: 'requires_review',
      confidence: { level: 'low' },
    });
    expect(result.candidates[0]?.warnings.join(' ')).toMatch(/no pudo confirmar/i);
  });

  it('no suprime montos legítimos grandes solo por su forma numérica', () => {
    const result = extractCandidates(
      representation('Intereses pagados: 3.241.486,57'),
      'other',
      context,
      DEFAULT_PDF_LIMITS,
    );
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]?.extractedValue).toBe(3_241_486.57);
  });
});

describe('regresión de redondeo tras el filtro antirruido (§11)', () => {
  it('conserva la detección de coincidencia por redondeo', async () => {
    const { suggestExogenousMatches } = await import('../src');
    const candidate = extractCandidates(
      representation('Intereses pagados: 3.241.486,57'),
      'other',
      context,
      DEFAULT_PDF_LIMITS,
    ).candidates[0]!;
    const record = {
      id: 'record:1',
      category: candidate.proposedCategory,
      reportedValue: 3_241_487,
      entityName: '',
    } as Parameters<typeof suggestExogenousMatches>[1][number];
    const [match] = suggestExogenousMatches(candidate, [record]);
    expect(match?.status).toBe('rounding_match');
    expect(match?.reasons.join(' ')).toMatch(/redondea/i);
  });
});

describe('métricas de ruido consistentes con la fórmula documentada (§9)', () => {
  it('numericEvidenceDetected = monetaryEvidencePromoted + numericNoiseSuppressed', async () => {
    const pdf = syntheticTextPdf([
      'CERTIFICADO DE SALDOS',
      'NIT 900.123.456-7',
      'Cuenta 1234567890',
      'Resolucion 000042 de 2020',
      'Participacion 50%',
      'Saldo al cierre: $ 3.241.486,57',
    ]);
    const result = await analyzePdfDocument({ ...context, bytes: pdf });
    const { metrics } = result;
    expect(metrics.numericEvidenceDetected).toBeGreaterThan(0);
    expect(metrics.monetaryEvidencePromoted).toBeGreaterThan(0);
    expect(metrics.numericNoiseSuppressed).toBeGreaterThan(0);
    expect(metrics.numericEvidenceDetected).toBe(
      (metrics.monetaryEvidencePromoted ?? 0) + (metrics.numericNoiseSuppressed ?? 0),
    );
    // La evidencia de ruido nunca se descarta: queda disponible para
    // inspección en modo avanzado/laboratorio (§4, §6).
    const suppressedRoles = result.suppressedNumericEvidence.map((item) => item.role);
    expect(suppressedRoles).toContain('tax_identifier');
    expect(suppressedRoles).toContain('account_number');
    expect(suppressedRoles).toContain('document_reference');
    expect(suppressedRoles).toContain('percentage');
  });

  it('la revisión guiada solo debe priorizar los valores monetarios reales, no los 30 números del documento', () => {
    const doc = representation(
      [
        'CERTIFICADO DE SALDOS',
        'NIT 900.123.456-7',
        'Cuenta 1234567890',
        'Cuenta 9988776655',
        'Resolucion 000042 de 2020',
        'Resolucion 000099 de 2021',
        'Fecha de corte: 2025-01-15',
        'Fecha de expedicion: 2025-02-20',
        'Año gravable 2025',
        'Año gravable 2024',
        'Participacion 50%',
        'Participacion 25%',
        'Participacion 10%',
        'Saldo al cierre: $ 1.000.000',
        'Saldo de deuda: $ 2.000.000',
        'Rendimientos financieros: $ 3.000.000',
        'Retencion en la fuente: $ 4.000.000',
      ].join('\n'),
    );
    const result = extractCandidates(doc, 'consolidated_tax_certificate', context, DEFAULT_PDF_LIMITS);
    const evidence = classifyDocumentNumericEvidence(doc);
    // Solo 4 valores son candidatos monetarios reales; el resto (ruido)
    // no debe contaminar la lista de candidatos aunque el documento
    // contenga muchos más números en total.
    expect(result.candidates).toHaveLength(4);
    expect(evidence.length).toBeGreaterThan(result.candidates.length);
  });
});
