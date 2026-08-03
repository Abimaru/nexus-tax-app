import type { TaxUnitDefinition } from '../../../types';
import { VERIFIED_AT } from './sources';
import { UVT_2025 } from './filing-obligation';

/**
 * Definición canónica de la UVT vigente para el año gravable 2025.
 * Fuente: Resolución DIAN 000193 de 2024 (id `dian-resolucion-000193-2024`).
 * Cualquier fórmula tributaria debe consumir el valor a través de
 * `TAX_UNIT_2025` (o el helper `getTaxUnit(2025)`) en lugar de literalizarlo.
 */
export const TAX_UNIT_2025: TaxUnitDefinition = {
  taxYear: 2025,
  valueCop: UVT_2025,
  officialSourceId: 'dian-resolucion-000193-2024',
  verifiedAt: VERIFIED_AT,
};

/** Registro de UVT por año gravable (extensible al añadir más años). */
const TAX_UNITS: readonly TaxUnitDefinition[] = [TAX_UNIT_2025];

/**
 * Devuelve la definición de UVT para el año solicitado. Lanza si aún no está
 * modelado: el objetivo es forzar la actualización explícita del catálogo
 * cuando se aborde un nuevo año gravable.
 */
export function getTaxUnit(taxYear: number): TaxUnitDefinition {
  const definition = TAX_UNITS.find((unit) => unit.taxYear === taxYear);
  if (!definition) {
    throw new Error(
      `Aún no hay UVT modelada para el año gravable ${taxYear}. ` +
        'Añade la definición en packages/aegis-rules/.../tax-unit.ts y verifica la fuente oficial.',
    );
  }
  return definition;
}

/** Convierte un monto en UVT a pesos colombianos según el año indicado. */
export function uvtToCop(uvtAmount: number, taxYear: number): number {
  return uvtAmount * getTaxUnit(taxYear).valueCop;
}

/** Convierte un monto en pesos a UVT (con decimales) según el año indicado. */
export function copToUvt(copAmount: number, taxYear: number): number {
  const uvt = getTaxUnit(taxYear).valueCop;
  return uvt === 0 ? 0 : copAmount / uvt;
}
