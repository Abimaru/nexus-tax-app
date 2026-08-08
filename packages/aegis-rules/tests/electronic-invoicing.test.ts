import { describe, expect, it } from 'vitest';
import { UVT_2025 } from '../src/colombia/individual-income-tax/2025/filing-obligation';
import {
  ELECTRONIC_INVOICING_ANNUAL_CAP_UVT,
  ELECTRONIC_INVOICING_PERCENTAGE,
  ELECTRONIC_INVOICING_SOURCE_ID,
  computeElectronicInvoicingDeduction,
} from '../src/colombia/individual-income-tax/2025/electronic-invoicing';

describe('deducción por facturas electrónicas (art. 336-1 ET) — AG 2025', () => {
  it('declara constantes normativas', () => {
    expect(ELECTRONIC_INVOICING_SOURCE_ID).toBe('et-art-336-1');
    expect(ELECTRONIC_INVOICING_PERCENTAGE).toBe(0.01);
    expect(ELECTRONIC_INVOICING_ANNUAL_CAP_UVT).toBe(240);
  });

  it('sin compras no produce deducción', () => {
    const result = computeElectronicInvoicingDeduction({
      taxYear: 2025,
      purchasesWithElectronicInvoiceCop: 0,
    });
    expect(result.purchasesBaseCop).toBe(0);
    expect(result.percentageCandidateCop).toBe(0);
    expect(result.appliedDeductionCop).toBe(0);
    expect(result.bindingCandidate).toBe('percentage');
  });

  it('aplica 1 % cuando queda por debajo del tope', () => {
    // Compras 50M → 1 % = 500.000. Tope 240 UVT ≈ 11.951.760 (para 2025).
    const result = computeElectronicInvoicingDeduction({
      taxYear: 2025,
      purchasesWithElectronicInvoiceCop: 50_000_000,
    });
    expect(result.percentageCandidateCop).toBe(500_000);
    expect(result.uvtCapCandidateCop).toBe(
      Math.round(ELECTRONIC_INVOICING_ANNUAL_CAP_UVT * UVT_2025),
    );
    expect(result.appliedDeductionCop).toBe(500_000);
    expect(result.bindingCandidate).toBe('percentage');
    expect(result.ruleSourceId).toBe('et-art-336-1');
  });

  it('respeta el tope de 240 UVT cuando el 1 % lo excede', () => {
    // Compras 2.000M → 1 % = 20M. Tope 240 UVT ≈ 11.951.760 < 20M.
    // Aplicado = 11.951.760 ; limitante = uvt_cap.
    const result = computeElectronicInvoicingDeduction({
      taxYear: 2025,
      purchasesWithElectronicInvoiceCop: 2_000_000_000,
    });
    const expectedCap = Math.round(ELECTRONIC_INVOICING_ANNUAL_CAP_UVT * UVT_2025);
    expect(result.percentageCandidateCop).toBe(20_000_000);
    expect(result.uvtCapCandidateCop).toBe(expectedCap);
    expect(result.appliedDeductionCop).toBe(expectedCap);
    expect(result.bindingCandidate).toBe('uvt_cap');
  });

  it('normaliza compras negativas a cero', () => {
    const result = computeElectronicInvoicingDeduction({
      taxYear: 2025,
      purchasesWithElectronicInvoiceCop: -1_000_000,
    });
    expect(result.purchasesBaseCop).toBe(0);
    expect(result.appliedDeductionCop).toBe(0);
    expect(result.bindingCandidate).toBe('percentage');
  });

  it('redondea el resultado al peso más cercano', () => {
    // 33.333.333 × 1 % = 333.333,33 → 333.333.
    const result = computeElectronicInvoicingDeduction({
      taxYear: 2025,
      purchasesWithElectronicInvoiceCop: 33_333_333,
    });
    expect(result.percentageCandidateCop).toBe(333_333);
  });

  it('rechaza años no modelados', () => {
    expect(() =>
      computeElectronicInvoicingDeduction({
        taxYear: 2024,
        purchasesWithElectronicInvoiceCop: 10_000_000,
      }),
    ).toThrow(/no modela/i);
  });
});
