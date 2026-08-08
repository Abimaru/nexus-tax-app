import type { TaxLimitComputation, TaxLimitRule } from '../../../types';
import { getTaxUnit } from './tax-unit';

/**
 * Reglas de límite para el año gravable 2025.
 *
 * Cédula general (art. 336 del Estatuto Tributario): el total de rentas
 * exentas y deducciones imputables se limita al **40 % de la renta líquida
 * cedular sin exceder 1.340 UVT**. En el Formulario 210 esa limitación se
 * expresa por sub-cédula (trabajo, capital, no laborales):
 *
 *   - Casilla 41 = min(0,40 × casilla 34, 1.340 UVT, casilla 37 + casilla 40).
 *   - Casilla 65 = min(0,40 × casilla 61, 1.340 UVT, casilla 63 + casilla 64).
 *   - Casilla 82 = min(0,40 × casilla 78, 1.340 UVT, casilla 80 + casilla 81).
 *
 * El componente detectado (la suma de las rentas exentas y deducciones
 * candidatas) también funciona como techo: nunca podemos "restar" más de lo
 * que realmente se solicitó como beneficio.
 *
 * Fuente: `et-art-336` en `OFFICIAL_SOURCES_2025`.
 */
export const TAX_LIMIT_RULES_2025: readonly TaxLimitRule[] = [
  {
    id: 'et-336-employment-cedular-cap',
    description:
      'Rentas exentas y deducciones limitadas de la sub-cédula de rentas de trabajo (40 % + 1.340 UVT).',
    type: 'percentage_and_uvt_cap',
    baseBoxNumber: 34,
    componentBoxNumbers: [37, 40],
    percentageOfBase: 0.4,
    uvtCap: 1_340,
    targetBoxNumber: 41,
    legalSourceIds: ['et-art-336'],
  },
  {
    id: 'et-336-capital-cedular-cap',
    description:
      'Rentas exentas y deducciones limitadas de la sub-cédula de rentas de capital (40 % + 1.340 UVT).',
    type: 'percentage_and_uvt_cap',
    baseBoxNumber: 61,
    componentBoxNumbers: [63, 64],
    percentageOfBase: 0.4,
    uvtCap: 1_340,
    targetBoxNumber: 65,
    legalSourceIds: ['et-art-336'],
  },
  {
    id: 'et-336-non-labor-cedular-cap',
    description:
      'Rentas exentas y deducciones limitadas de la sub-cédula de rentas no laborales (40 % + 1.340 UVT).',
    type: 'percentage_and_uvt_cap',
    baseBoxNumber: 78,
    componentBoxNumbers: [80, 81],
    percentageOfBase: 0.4,
    uvtCap: 1_340,
    targetBoxNumber: 82,
    legalSourceIds: ['et-art-336'],
  },
] as const;

export function getLimitRule(id: string): TaxLimitRule {
  const rule = TAX_LIMIT_RULES_2025.find((entry) => entry.id === id);
  if (!rule) throw new Error(`Regla de límite desconocida: ${id}`);
  return rule;
}

/**
 * Aplica una `TaxLimitRule` sobre valores concretos en pesos. Devuelve el
 * detalle completo para que la UI pueda decir textualmente por qué se limitó
 * (por porcentaje, por tope UVT o porque el componente detectado era menor).
 *
 * Los valores negativos de la base o del componente se saturan en 0: no se
 * permite que un valor negativo genere un beneficio "negativo".
 */
export function applyLimitRule(
  rule: TaxLimitRule,
  boxValuesCop: Readonly<Record<number, number>>,
  taxYear: number = 2025,
): TaxLimitComputation {
  const uvt = getTaxUnit(taxYear).valueCop;
  const baseValueCop = Math.max(0, boxValuesCop[rule.baseBoxNumber] ?? 0);
  const componentValueCop = rule.componentBoxNumbers.reduce(
    (sum, boxNumber) => sum + Math.max(0, boxValuesCop[boxNumber] ?? 0),
    0,
  );
  const percentageCandidateCop = Math.round(baseValueCop * rule.percentageOfBase);
  const uvtCapValueCop = rule.uvtCap * uvt;
  const candidates: readonly (readonly [
    TaxLimitComputation['bindingCandidate'],
    number,
  ])[] = [
    ['percentage', percentageCandidateCop],
    ['uvt_cap', uvtCapValueCop],
    ['component', componentValueCop],
  ];
  const [bindingCandidate, appliedValueCop] = candidates.reduce((chosen, current) =>
    current[1] < chosen[1] ? current : chosen,
  );
  const formula = `min(${(rule.percentageOfBase * 100).toFixed(0)}% × casilla ${rule.baseBoxNumber}, ${rule.uvtCap} UVT, ${rule.componentBoxNumbers.map((b) => `casilla ${b}`).join(' + ')})`;
  return {
    ruleId: rule.id,
    taxYear,
    baseBoxNumber: rule.baseBoxNumber,
    targetBoxNumber: rule.targetBoxNumber,
    baseValueCop,
    componentValueCop,
    percentageCandidateCop,
    uvtCapValueCop,
    appliedValueCop,
    bindingCandidate,
    formula,
    legalSourceIds: rule.legalSourceIds,
  };
}
