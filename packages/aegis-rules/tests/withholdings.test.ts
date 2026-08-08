import { describe, expect, it } from 'vitest';
import {
  WITHHOLDINGS_SOURCE_ID,
  WITHHOLDING_DUPLICATE_RELATIVE_TOLERANCE,
  consolidateWithholdings,
} from '../src/colombia/individual-income-tax/2025/withholdings';
import type { WithholdingSource } from '../src/types';

function source(
  id: string,
  label: string,
  valueCop: number,
  entityTaxId: string | null = null,
  hasDocumentSupport = false,
): WithholdingSource {
  return { sourceId: id, label, valueCop, entityTaxId, hasDocumentSupport };
}

describe('retenciones consolidadas (art. 373 ET) — AG 2025', () => {
  it('declara constantes y fuente', () => {
    expect(WITHHOLDINGS_SOURCE_ID).toBe('et-art-373');
    expect(WITHHOLDING_DUPLICATE_RELATIVE_TOLERANCE).toBeCloseTo(0.01, 6);
  });

  it('devuelve total cero cuando no hay retenciones', () => {
    const result = consolidateWithholdings({ taxYear: 2025, sources: [] });
    expect(result.totalReportedCop).toBe(0);
    expect(result.entriesCount).toBe(0);
    expect(result.entriesWithoutSupportCount).toBe(0);
    expect(result.suspectedDuplicates).toEqual([]);
    expect(result.breakdown).toBeNull();
    expect(result.breakdownMatchesReported).toBe(true);
    expect(result.ruleSourceId).toBe('et-art-373');
  });

  it('suma retenciones y cuenta las que no tienen soporte documental', () => {
    const result = consolidateWithholdings({
      taxYear: 2025,
      sources: [
        source('w1', 'Empresa A', 3_000_000, '900000001', true),
        source('w2', 'Empresa B', 2_000_000, '900000002', false),
      ],
    });
    expect(result.totalReportedCop).toBe(5_000_000);
    expect(result.entriesCount).toBe(2);
    expect(result.entriesWithoutSupportCount).toBe(1);
    expect(result.entriesWithoutSupportIds).toEqual(['w2']);
  });

  it('normaliza valores negativos a cero', () => {
    const result = consolidateWithholdings({
      taxYear: 2025,
      sources: [source('w1', 'Ret negativa', -1_000_000, '900000001', true)],
    });
    expect(result.totalReportedCop).toBe(0);
    expect(result.entriesCount).toBe(0);
  });

  it('detecta pares con mismo retenedor y valor casi igual', () => {
    const result = consolidateWithholdings({
      taxYear: 2025,
      sources: [
        source('w1', 'Empresa A cert 1', 1_000_000, '900000001', true),
        source('w2', 'Empresa A cert 2', 1_005_000, '900000001', true),
        source('w3', 'Empresa B', 500_000, '900000002', true),
      ],
    });
    expect(result.suspectedDuplicates).toHaveLength(1);
    expect(result.suspectedDuplicates[0]!.a.sourceId).toBe('w1');
    expect(result.suspectedDuplicates[0]!.b.sourceId).toBe('w2');
  });

  it('no marca duplicados cuando el retenedor es distinto', () => {
    const result = consolidateWithholdings({
      taxYear: 2025,
      sources: [
        source('w1', 'Empresa A', 1_000_000, '900000001', true),
        source('w2', 'Empresa B', 1_000_000, '900000002', true),
      ],
    });
    expect(result.suspectedDuplicates).toEqual([]);
  });

  it('ignora entradas sin entityTaxId en la detección de duplicados', () => {
    const result = consolidateWithholdings({
      taxYear: 2025,
      sources: [
        source('w1', 'Ret desconocida A', 1_000_000, null, false),
        source('w2', 'Ret desconocida B', 1_000_000, null, false),
      ],
    });
    expect(result.suspectedDuplicates).toEqual([]);
  });

  it('confirma coincidencia entre reportado y desglose', () => {
    const result = consolidateWithholdings({
      taxYear: 2025,
      sources: [source('w1', 'Retención total', 10_000_000, '900000001', true)],
      breakdown: {
        employmentCop: 7_000_000,
        capitalCop: 2_000_000,
        nonLaborCop: 0,
        occasionalGainCop: 0,
        dividendsCop: 0,
        otherCop: 1_000_000,
      },
    });
    expect(result.breakdownTotalCop).toBe(10_000_000);
    expect(result.breakdownMatchesReported).toBe(true);
    expect(result.breakdownDifferenceCop).toBe(0);
    expect(result.breakdown!.employmentCop).toBe(7_000_000);
  });

  it('detecta discrepancia entre reportado y desglose', () => {
    const result = consolidateWithholdings({
      taxYear: 2025,
      sources: [source('w1', 'Retención total', 10_000_000, '900000001', true)],
      breakdown: {
        employmentCop: 5_000_000,
        capitalCop: 2_000_000,
        nonLaborCop: 0,
        occasionalGainCop: 0,
        dividendsCop: 0,
        otherCop: 0,
      },
    });
    expect(result.breakdownTotalCop).toBe(7_000_000);
    expect(result.breakdownMatchesReported).toBe(false);
    expect(result.breakdownDifferenceCop).toBe(-3_000_000);
  });

  it('rechaza años no modelados', () => {
    expect(() => consolidateWithholdings({ taxYear: 2024, sources: [] })).toThrow(/no modela/i);
  });
});
