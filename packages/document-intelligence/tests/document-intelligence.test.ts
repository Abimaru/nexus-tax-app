import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_PDF_LIMITS,
  PdfReadError,
  classifyDocument,
  extractCandidates,
  passwordErrorForReason,
  readPdfText,
  suggestExogenousMatches,
  suggestProduct,
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

  it('ignora porcentajes, años y referencias normativas como artículo 115', () => {
    const result = extractCandidates(
      representation(
        'Certificado tributario\n** Solo el 50% del GMF (4X1000) es deducible en tu declaración de renta (artículo 115 ET).\nGravamen a los Movimientos Financieros (GMF o 4x1000): $92.953,96',
      ),
      'consolidated_tax_certificate',
      context,
      DEFAULT_PDF_LIMITS,
    );
    expect(result.candidates.map((item) => item.extractedValue)).toEqual([92_953.96]);
    expect(result.candidates[0]).toMatchObject({ ruleId: 'gmf' });
  });

  it('extrae variantes de fondo de empleados sin tomar numeración, año ni totales', () => {
    const result = extractCandidates(
      representation(
        [
          'Certificado tributario',
          '1.1 Aportes Sociales a Diciembre 31 de 2025 3,592,670',
          '1.2 Ahorros Permanentes a Diciembre 31 de 2025 29,852,509',
          'Total Saldos a favor del Asociado: 33,571,119',
          '2.1 Deudas a Diciembre 31 de 2025 116,544,644',
          '3.2 Intereses sobre ahorros Abonados durante el año 2025 1,280,603',
          '4.1 Intereses por créditos causados durante el año 2025 11,095,276',
          '6.1 Retención en la fuente Practicada al Asociado 82,855',
        ].join('\n'),
      ),
      'consolidated_tax_certificate',
      context,
      DEFAULT_PDF_LIMITS,
    );
    expect(result.candidates.map((item) => item.extractedValue)).toEqual([
      3_592_670, 29_852_509, 116_544_644, 1_280_603, 11_095_276, 82_855,
    ]);
    expect(result.candidates.map((item) => item.ruleId)).toEqual([
      'closing-balance',
      'closing-balance',
      'debt',
      'interest',
      'credit-interest-expense',
      'withholding',
    ]);
  });

  it('relaciona columnas monetarias con el producto de una tabla posicionada', () => {
    const document = representation('Productos de ahorro');
    document.pages[0]!.blocks = [
      { text: 'Producto', x: 70, y: 700 },
      { text: 'Saldo a 31 de Diciembre', x: 360, y: 700 },
      { text: 'Rendimientos financieros', x: 560, y: 700 },
      { text: 'Retención en la fuente', x: 820, y: 700 },
      { text: 'GMF', x: 1100, y: 700 },
      { text: 'Depósito Bajo Monto', x: 70, y: 650 },
      { text: '156 783 099', x: 70, y: 632 },
      { text: '$13,007.83', x: 375, y: 650 },
      { text: '$47.41', x: 575, y: 650 },
      { text: '$0.00', x: 835, y: 650 },
      { text: '$0.00', x: 1115, y: 650 },
    ];
    const result = extractCandidates(
      document,
      'consolidated_tax_certificate',
      context,
      DEFAULT_PDF_LIMITS,
    );
    expect(result.candidates.map((item) => item.extractedValue)).toEqual([13_007.83, 47.41, 0, 0]);
    expect(result.candidates.every((item) => item.productLabel === 'Depósito Bajo Monto')).toBe(
      true,
    );
    expect(result.candidates.map((item) => item.ruleId)).toEqual([
      'closing-balance',
      'interest',
      'withholding',
      'gmf',
    ]);
  });

  it('reconstruye encabezados de tabla divididos en varias líneas', () => {
    const document = representation('Productos de ahorro');
    document.pages[0]!.blocks = [
      { text: 'Producto', x: 70, y: 710 },
      { text: 'Saldo a 31 de', x: 360, y: 710 },
      { text: 'Diciembre', x: 360, y: 685 },
      { text: 'Rendimientos', x: 560, y: 710 },
      { text: 'financieros', x: 560, y: 685 },
      { text: 'Retención', x: 820, y: 710 },
      { text: 'en la fuente', x: 820, y: 685 },
      { text: 'GMF', x: 1100, y: 685 },
      { text: 'Cuenta Ahorros 5645', x: 70, y: 640 },
      { text: '$4,051,577.00', x: 375, y: 640 },
      { text: '$185.00', x: 575, y: 640 },
      { text: '$0.00', x: 835, y: 640 },
      { text: '$92,953.96', x: 1115, y: 640 },
    ];

    const result = extractCandidates(
      document,
      'consolidated_tax_certificate',
      context,
      DEFAULT_PDF_LIMITS,
    );

    expect(result.candidates.map((item) => item.extractedValue)).toEqual([
      4_051_577, 185, 0, 92_953.96,
    ]);
    expect(result.candidates.every((item) => item.productLabel === 'Cuenta Ahorros 5645')).toBe(
      true,
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

  it('sugiere un producto existente por tipo y etiqueta detectada', () => {
    const candidate = extractCandidates(
      representation('Saldo al 31 de diciembre: $ 4.051.577'),
      'balance_certificate',
      context,
      DEFAULT_PDF_LIMITS,
    ).candidates[0]!;
    candidate.productLabel = 'Cuenta de ahorros terminada en 5645';
    expect(
      suggestProduct(candidate, [
        {
          id: 'product:savings',
          caseId: context.caseId,
          entityId: null,
          type: 'savings_account',
          label: 'Cuenta de ahorros 5645',
          status: 'active',
          notes: '',
          createdAt: context.timestamp,
          updatedAt: context.timestamp,
        },
      ]),
    ).toMatchObject({ productId: 'product:savings', ambiguous: false });
  });

  it('expone errores recuperables sin detalles técnicos', () => {
    expect(new PdfReadError('invalid_pdf', 'Mensaje humano')).toMatchObject({
      code: 'invalid_pdf',
      message: 'Mensaje humano',
    });
  });
});
