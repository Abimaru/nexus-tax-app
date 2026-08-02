import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_PDF_LIMITS,
  PdfReadError,
  classifyDocument,
  extractCandidates,
  passwordErrorForReason,
  readPdfText,
  suggestExogenousMatches,
} from '../src';
import { representation, syntheticTextPdf } from './fixtures';

const context = {
  caseId: 'case:synthetic',
  documentId: 'document:synthetic',
  sessionId: 'session:synthetic',
  timestamp: '2026-08-01T00:00:00.000Z',
};

describe('lector PDF local', () => {
  it('lee un PDF textual sintético sin usar la red', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const pdf = syntheticTextPdf(['Formulario 220', 'Ingresos laborales: $ 48000000']);
    const result = await readPdfText(pdf);
    expect(result.pageCount).toBe(1);
    expect(result.pages[0]?.normalizedText).toContain('Formulario 220');
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('distingue PDF protegido y contraseña incorrecta', () => {
    expect(passwordErrorForReason(1).code).toBe('password_required');
    expect(passwordErrorForReason(2).code).toBe('incorrect_password');
  });

  it('rechaza un documento sin texto y respeta cancelación y límites', async () => {
    await expect(readPdfText(syntheticTextPdf([]))).rejects.toMatchObject({ code: 'no_text' });
    const controller = new AbortController();
    controller.abort();
    await expect(
      readPdfText(syntheticTextPdf(['Texto']), { signal: controller.signal }),
    ).rejects.toMatchObject({ code: 'cancelled' });
    await expect(
      readPdfText(new Uint8Array(20), { limits: { maxBytes: 10 } }),
    ).rejects.toMatchObject({ code: 'limit_exceeded' });
  });
});

describe('clasificación y adaptadores', () => {
  const cases = [
    [
      'form_220',
      'FORMULARIO 220\nCertificado de ingresos y retenciones\nIngresos laborales: $ 48.000.000',
    ],
    [
      'consolidated_tax_certificate',
      'Certificado tributario\nSaldos Rendimientos Retenciones\nSaldo al cierre: $ 1.000.000',
    ],
    ['debt_certificate', 'Certificado de deuda\nSaldo de capital: $ 3.000.000'],
    ['balance_certificate', 'Certificado de saldos\nSaldo al 31 de diciembre: $ 5.000.000'],
    [
      'housing_interest_certificate',
      'Certificado de intereses de vivienda\nCredito hipotecario\nIntereses pagados: $ 900.000',
    ],
    [
      'severance_certificate',
      'Certificado de cesantias\nFondo de cesantias\nSaldo final: $ 2.000.000',
    ],
    [
      'property_tax_certificate',
      'Impuesto predial\nAvaluo catastral: $ 120.000.000\nIdentificacion predial 001',
    ],
  ] as const;

  it.each(cases)('clasifica %s y conserva evidencia candidata', (kind, text) => {
    const document = representation(text);
    const classification = classifyDocument(document);
    expect(classification.proposedKind).toBe(kind);
    const extracted = extractCandidates(document, kind, context, DEFAULT_PDF_LIMITS);
    expect(extracted.candidates.length).toBeGreaterThan(0);
    expect(extracted.candidates[0]).toMatchObject({ page: 1, documentId: context.documentId });
    expect(extracted.candidates[0]?.evidence.excerpt.length).toBeLessThanOrEqual(220);
  });

  it('extrae varios grupos de un certificado multipropósito', () => {
    const result = extractCandidates(
      representation(
        'Certificado tributario\nSaldo al cierre: $ 1.000.000\nSaldo de deuda: $ 400.000\nRendimientos financieros: $ 80.000\nRetencion en la fuente: $ 8.000',
      ),
      'consolidated_tax_certificate',
      context,
      DEFAULT_PDF_LIMITS,
    );
    expect(new Set(result.candidates.map((item) => item.proposedCategory))).toEqual(
      new Set(['asset', 'liability', 'financial_income', 'withholding']),
    );
  });

  it('usa el extractor genérico con confianza baja', () => {
    const result = extractCandidates(
      representation('Valor informado: $ 123.000'),
      'other',
      context,
      DEFAULT_PDF_LIMITS,
    );
    expect(result.candidates[0]).toMatchObject({
      adapterId: 'co.generic.label-value',
      status: 'requires_review',
      confidence: { level: 'low' },
    });
  });

  it('sugiere coincidencia fuerte o contradicción sin conciliar', () => {
    const candidate = extractCandidates(
      representation('Saldo al cierre: $ 1.000.000'),
      'balance_certificate',
      context,
      DEFAULT_PDF_LIMITS,
    ).candidates[0]!;
    const baseRecord = {
      id: 'record:1',
      category: 'asset',
      reportedValue: 1_000_000,
      entityName: '',
    } as Parameters<typeof suggestExogenousMatches>[1][number];
    expect(suggestExogenousMatches(candidate, [baseRecord])[0]?.status).toBe('strong_match');
    expect(
      suggestExogenousMatches(candidate, [
        { ...baseRecord, id: 'record:2', reportedValue: 2_000_000 },
      ])[0]?.status,
    ).toBe('possible_contradiction');
  });

  it('expone errores recuperables sin detalles técnicos', () => {
    expect(new PdfReadError('invalid_pdf', 'Mensaje humano')).toMatchObject({
      code: 'invalid_pdf',
      message: 'Mensaje humano',
    });
  });
});
