import { describe, expect, it } from 'vitest';
import { DEFAULT_PDF_LIMITS, extractCandidates } from '../src';
import { documentFromPages } from './fixtures';

/**
 * Sprint 2.4, Fase F.3 — Unified Reconciliation & Coverage Hardening (§11/§21).
 *
 * Fixture sintético de tabla multiproducto: varios productos, columnas de
 * saldo/rendimiento/retención, una columna de porcentaje intercalada (que
 * nunca debe interferir con las demás columnas), y valores cero y no
 * cero. Objetivo: que el extractor relacione correctamente
 * header → producto → concepto → valor sin arrastrar headers vecinos.
 * Ningún valor es real.
 */

const context = {
  caseId: 'case:synthetic',
  documentId: 'document:synthetic',
  sessionId: 'session:synthetic',
  timestamp: '2026-09-01T00:00:00.000Z',
};

function multiproductDocument() {
  return documentFromPages([
    {
      pageNumber: 1,
      normalizedText: '',
      errors: [],
      readConfidence: 'high',
      blocks: [
        // Encabezados (§11): cada uno debe activar una regla distinta de
        // co.financial.consolidated.generic. "Tasa %" no activa ninguna
        // regla — es la columna de porcentaje intercalada que no debe
        // interferir con las demás.
        { text: 'Saldo de Capital', x: 100, y: 700 },
        { text: 'Rendimientos Financieros', x: 300, y: 700 },
        { text: 'Retención Rendimientos', x: 500, y: 700 },
        { text: 'Tasa %', x: 700, y: 700 },
        // Producto 1: valores no cero en las 3 columnas monetarias.
        { text: 'Cuenta Ahorros A', x: 20, y: 660 },
        { text: '$ 1.000.000', x: 100, y: 660 },
        { text: '$ 50.000', x: 300, y: 660 },
        { text: '$ 5.000', x: 500, y: 660 },
        { text: '3,5%', x: 700, y: 660 },
        // Producto 2: valores cero en rendimiento y retención (no deben
        // desaparecer silenciosamente).
        { text: 'CDT B', x: 20, y: 620 },
        { text: '$ 2.000.000', x: 100, y: 620 },
        { text: '0', x: 300, y: 620 },
        { text: '0', x: 500, y: 620 },
        { text: '4,2%', x: 700, y: 620 },
        // Producto 3: tercer producto con sus propios valores no cero.
        { text: 'Cuenta Corriente C', x: 20, y: 580 },
        { text: '$ 500.000', x: 100, y: 580 },
        { text: '$ 10.000', x: 300, y: 580 },
        { text: '$ 1.000', x: 500, y: 580 },
        { text: '2%', x: 700, y: 580 },
      ],
    },
  ]);
}

describe('tabla multiproducto — header→producto→concepto→valor (Fase F.3, §11)', () => {
  it('relaciona cada valor con su header y producto correctos, sin arrastrar headers vecinos', () => {
    const result = extractCandidates(
      multiproductDocument(),
      'consolidated_tax_certificate',
      context,
      DEFAULT_PDF_LIMITS,
    );
    const byProductAndRule = (product: string, ruleId: string) =>
      result.candidates.find((c) => c.productLabel === product && c.ruleId === ruleId);

    // Producto 1: los 3 valores no cero quedan bajo su columna correcta.
    expect(byProductAndRule('Cuenta Ahorros A', 'closing-balance')?.extractedValue).toBe(1_000_000);
    expect(byProductAndRule('Cuenta Ahorros A', 'interest')?.extractedValue).toBe(50_000);
    expect(byProductAndRule('Cuenta Ahorros A', 'withholding')?.extractedValue).toBe(5_000);

    // Producto 3: mismo patrón, con otros valores — confirma que el
    // header no se "arrastra" incorrectamente entre filas de productos
    // distintos.
    expect(byProductAndRule('Cuenta Corriente C', 'closing-balance')?.extractedValue).toBe(
      500_000,
    );
    expect(byProductAndRule('Cuenta Corriente C', 'interest')?.extractedValue).toBe(10_000);
    expect(byProductAndRule('Cuenta Corriente C', 'withholding')?.extractedValue).toBe(1_000);
  });

  it('conserva los valores cero como candidatos (nunca desaparecen silenciosamente)', () => {
    const result = extractCandidates(
      multiproductDocument(),
      'consolidated_tax_certificate',
      context,
      DEFAULT_PDF_LIMITS,
    );
    const zeroInterest = result.candidates.find(
      (c) => c.productLabel === 'CDT B' && c.ruleId === 'interest',
    );
    const zeroWithholding = result.candidates.find(
      (c) => c.productLabel === 'CDT B' && c.ruleId === 'withholding',
    );
    expect(zeroInterest?.extractedValue).toBe(0);
    expect(zeroWithholding?.extractedValue).toBe(0);
    expect(byProductBalance(result.candidates, 'CDT B')).toBe(2_000_000);
  });

  it('la columna de porcentaje intercalada nunca contamina las columnas monetarias vecinas', () => {
    const result = extractCandidates(
      multiproductDocument(),
      'consolidated_tax_certificate',
      context,
      DEFAULT_PDF_LIMITS,
    );
    // Ningún candidato debe tener un valor que coincida con una tasa
    // porcentual (3.5, 4.2, 2) mal interpretada como un monto de columna
    // vecina, y ningún candidato debe originarse de la columna de tasa.
    expect(result.candidates.some((c) => [3.5, 4.2, 2].includes(c.extractedValue))).toBe(false);
  });
});

function byProductBalance(
  candidates: readonly { productLabel: string | null; ruleId: string; extractedValue: number }[],
  product: string,
): number | undefined {
  return candidates.find((c) => c.productLabel === product && c.ruleId === 'closing-balance')
    ?.extractedValue;
}
