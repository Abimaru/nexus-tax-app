import { describe, expect, it } from 'vitest';
import { UVT_2025 } from '../src/colombia/individual-income-tax/2025/filing-obligation';
import {
  PATRIMONY_DUPLICATE_RELATIVE_TOLERANCE,
  PATRIMONY_MOVEMENT_SIGNIFICANCE_UVT,
  PATRIMONY_SOURCE_ID,
  detectDuplicatePatrimonyEntries,
  detectLiabilityWithoutAsset,
  detectMovementWithoutBalance,
} from '../src/colombia/individual-income-tax/2025/patrimony-checks';
import type { PatrimonySourceCandidate } from '../src/types';

function source(id: string, label: string, valueCop: number): PatrimonySourceCandidate {
  return { sourceId: id, label, valueCop };
}

describe('validaciones patrimoniales AG 2025', () => {
  it('declara constantes y fuente', () => {
    expect(PATRIMONY_SOURCE_ID).toBe('et-art-261');
    expect(PATRIMONY_MOVEMENT_SIGNIFICANCE_UVT).toBe(100);
    expect(PATRIMONY_DUPLICATE_RELATIVE_TOLERANCE).toBeCloseTo(0.01, 6);
  });

  describe('detectLiabilityWithoutAsset', () => {
    it('dispara cuando hay deuda sin activo', () => {
      const result = detectLiabilityWithoutAsset({
        grossPatrimonyCop: 0,
        liabilitiesCop: 15_000_000,
      });
      expect(result.triggered).toBe(true);
    });

    it('no dispara cuando también hay activo', () => {
      const result = detectLiabilityWithoutAsset({
        grossPatrimonyCop: 20_000_000,
        liabilitiesCop: 15_000_000,
      });
      expect(result.triggered).toBe(false);
    });

    it('no dispara cuando no hay deuda ni activo', () => {
      const result = detectLiabilityWithoutAsset({
        grossPatrimonyCop: 0,
        liabilitiesCop: 0,
      });
      expect(result.triggered).toBe(false);
    });

    it('normaliza negativos a cero', () => {
      const result = detectLiabilityWithoutAsset({
        grossPatrimonyCop: -100,
        liabilitiesCop: -200,
      });
      expect(result.triggered).toBe(false);
      expect(result.grossPatrimonyCop).toBe(0);
      expect(result.liabilitiesCop).toBe(0);
    });
  });

  describe('detectMovementWithoutBalance', () => {
    it('dispara cuando la suma de movimientos supera 100 UVT y no hay patrimonio', () => {
      // 100 UVT ≈ 4.979.900. Movimiento total 6M > umbral.
      const result = detectMovementWithoutBalance({
        taxYear: 2025,
        grossPatrimonyCop: 0,
        movementSources: [
          source('mov-1', 'Consignaciones bancarias', 3_500_000),
          source('mov-2', 'Consumos tarjeta', 2_500_000),
        ],
      });
      expect(result.triggered).toBe(true);
      expect(result.movementTotalCop).toBe(6_000_000);
      expect(result.thresholdCop).toBe(Math.round(100 * UVT_2025));
      expect(result.significantSourceIds).toEqual(['mov-1', 'mov-2']);
    });

    it('no dispara cuando ya hay patrimonio declarado', () => {
      const result = detectMovementWithoutBalance({
        taxYear: 2025,
        grossPatrimonyCop: 10_000_000,
        movementSources: [source('mov-1', 'Consignaciones', 6_000_000)],
      });
      expect(result.triggered).toBe(false);
      expect(result.significantSourceIds).toEqual([]);
    });

    it('no dispara si el total no llega al umbral', () => {
      const result = detectMovementWithoutBalance({
        taxYear: 2025,
        grossPatrimonyCop: 0,
        movementSources: [source('mov-1', 'Pequeño movimiento', 1_000_000)],
      });
      expect(result.triggered).toBe(false);
    });

    it('respeta el umbral en UVT configurable', () => {
      const result = detectMovementWithoutBalance({
        taxYear: 2025,
        grossPatrimonyCop: 0,
        movementSources: [source('mov-1', 'Movimiento', 500_000)],
        thresholdUvt: 5,
      });
      // 5 UVT ≈ 248.995. 500.000 > umbral.
      expect(result.triggered).toBe(true);
    });
  });

  describe('detectDuplicatePatrimonyEntries', () => {
    it('detecta pares con mismo label y valor cercano', () => {
      const result = detectDuplicatePatrimonyEntries({
        sources: [
          source('s1', 'Cuenta ahorros Bancolombia', 10_000_000),
          source('s2', 'Cuenta ahorros Bancolombia', 10_050_000),
          source('s3', 'CDT Davivienda', 5_000_000),
        ],
      });
      expect(result.triggered).toBe(true);
      expect(result.pairs).toHaveLength(1);
      expect(result.pairs[0]!.a.sourceId).toBe('s1');
      expect(result.pairs[0]!.b.sourceId).toBe('s2');
      expect(result.pairs[0]!.relativeDifference).toBeCloseTo(50_000 / 10_050_000, 5);
    });

    it('no confunde diferencias por más de la tolerancia', () => {
      const result = detectDuplicatePatrimonyEntries({
        sources: [
          source('s1', 'Cuenta ahorros', 10_000_000),
          source('s2', 'Cuenta ahorros', 20_000_000),
        ],
      });
      expect(result.triggered).toBe(false);
    });

    it('ignora entradas con valor cero', () => {
      const result = detectDuplicatePatrimonyEntries({
        sources: [
          source('s1', 'Cuenta', 0),
          source('s2', 'Cuenta', 0),
        ],
      });
      expect(result.triggered).toBe(false);
    });

    it('normaliza acentos y mayúsculas al comparar labels', () => {
      const result = detectDuplicatePatrimonyEntries({
        sources: [
          source('s1', 'Cuenta Ahorros Bancolombia', 5_000_000),
          source('s2', 'cuenta ahorros bancolombia', 5_010_000),
        ],
      });
      expect(result.triggered).toBe(true);
    });

    it('acepta tolerancia personalizada', () => {
      const result = detectDuplicatePatrimonyEntries({
        sources: [
          source('s1', 'Cuenta', 10_000_000),
          source('s2', 'Cuenta', 10_500_000),
        ],
        toleranceRelative: 0.06,
      });
      expect(result.triggered).toBe(true);
    });
  });
});
