import type {
  IndividualDeductionLimitComputation,
  IndividualDeductionLimitRule,
} from '../../../types';
import { getTaxUnit } from './tax-unit';

/**
 * Reglas declarativas de límites individuales para deducciones y rentas
 * exentas del F-210 en el año gravable 2025. Cada regla apunta a una
 * casilla del formulario y expone sus fuentes normativas.
 *
 * Este motor NO decide qué monto declara el analista: recibe el valor
 * declarado (y, si corresponde, la base de ingreso) y devuelve el
 * `bindingCandidate` que limita efectivamente el beneficio. Cuando el
 * `declaredCop` es menor que ambos candidatos, se aplica tal cual y el
 * `bindingCandidate` es `declared` (no hubo recorte).
 */

/** AFC / FVP / AVC — tope conjunto: 30 % del ingreso laboral, hasta 3.800 UVT. */
export const AFC_FVP_AVC_LIMIT_RULE_2025: IndividualDeductionLimitRule = {
  id: 'afc-fvp-avc-2025',
  description:
    'Aportes voluntarios a fondos de pensiones y depósitos AFC/AVC: 30 % del ingreso laboral o tributario, hasta 3.800 UVT anuales (arts. 126-1 y 126-4 ET).',
  percentageOfBase: 0.3,
  uvtCap: 3_800,
  baseIncomeRequired: true,
  targetBoxNumber: 35,
  legalSourceIds: ['et-art-126-1', 'et-art-126-4'],
};

/** Intereses de vivienda — tope 1.200 UVT anuales (100 UVT mensuales). */
export const HOUSING_INTEREST_LIMIT_RULE_2025: IndividualDeductionLimitRule = {
  id: 'housing-interest-2025',
  description:
    'Deducción de intereses de crédito de vivienda: tope 1.200 UVT anuales (art. 119 ET).',
  percentageOfBase: null,
  uvtCap: 1_200,
  baseIncomeRequired: false,
  targetBoxNumber: 38,
  legalSourceIds: ['et-art-119'],
};

/**
 * Medicina prepagada — tope 192 UVT anuales (16 UVT mensuales). Fuente:
 * parágrafo 2 del art. 387 ET; se referencia por `et-art-387`.
 */
export const PREPAID_MEDICINE_LIMIT_RULE_2025: IndividualDeductionLimitRule = {
  id: 'prepaid-medicine-2025',
  description:
    'Deducción por pagos de medicina prepagada: tope 192 UVT anuales (art. 387 ET, parágrafo 2).',
  percentageOfBase: null,
  uvtCap: 192,
  baseIncomeRequired: false,
  targetBoxNumber: 39,
  legalSourceIds: ['et-art-387'],
};

export const INDIVIDUAL_DEDUCTION_LIMIT_RULES_2025: readonly IndividualDeductionLimitRule[] = [
  AFC_FVP_AVC_LIMIT_RULE_2025,
  HOUSING_INTEREST_LIMIT_RULE_2025,
  PREPAID_MEDICINE_LIMIT_RULE_2025,
];

export function getIndividualDeductionLimitRule(id: string): IndividualDeductionLimitRule {
  const found = INDIVIDUAL_DEDUCTION_LIMIT_RULES_2025.find((rule) => rule.id === id);
  if (!found) {
    throw new Error(`Regla desconocida en INDIVIDUAL_DEDUCTION_LIMIT_RULES: "${id}".`);
  }
  return found;
}

export interface IndividualDeductionLimitInput {
  taxYear: number;
  declaredCop: number;
  /**
   * Ingreso base para el porcentaje (por ejemplo, ingresos brutos de
   * rentas de trabajo del año). Obligatorio cuando `rule.baseIncomeRequired`
   * es `true`; ignorado en otro caso.
   */
  baseIncomeCop?: number | null;
}

/**
 * Aplica una regla individual de límite. Devuelve la computación completa
 * con los candidatos (`declared`, `percentage`, `uvt_cap`) y el limitante
 * efectivo. Valores negativos se tratan como cero.
 */
export function applyIndividualDeductionLimit(
  rule: IndividualDeductionLimitRule,
  input: IndividualDeductionLimitInput,
): IndividualDeductionLimitComputation {
  if (input.taxYear !== 2025) {
    throw new Error(
      `INDIVIDUAL_DEDUCTION_LIMIT_RULES aún no modela el año ${input.taxYear}. Añade el ruleset correspondiente.`,
    );
  }
  const uvt = getTaxUnit(input.taxYear).valueCop;
  const declared = Math.max(0, input.declaredCop);
  const uvtCapCandidateCop = Math.round(rule.uvtCap * uvt);
  let percentageCandidateCop: number | null = null;
  let baseIncomeCop: number | null = null;
  if (rule.percentageOfBase !== null && rule.baseIncomeRequired) {
    baseIncomeCop = Math.max(0, input.baseIncomeCop ?? 0);
    percentageCandidateCop = Math.round(baseIncomeCop * rule.percentageOfBase);
  }

  const candidates: {
    key: IndividualDeductionLimitComputation['bindingCandidate'];
    value: number;
  }[] = [
    { key: 'declared', value: declared },
    { key: 'uvt_cap', value: uvtCapCandidateCop },
  ];
  if (percentageCandidateCop !== null) {
    candidates.push({ key: 'percentage', value: percentageCandidateCop });
  }
  const binding = candidates.reduce((min, current) =>
    current.value < min.value ? current : min,
  );

  const parts: string[] = ['declarado'];
  if (percentageCandidateCop !== null) {
    parts.push(`${(rule.percentageOfBase! * 100).toFixed(0)} % × ingreso_base`);
  }
  parts.push(`${rule.uvtCap} UVT`);
  const formula = `min(${parts.join(', ')})`;

  return {
    ruleId: rule.id,
    taxYear: input.taxYear,
    targetBoxNumber: rule.targetBoxNumber,
    declaredCop: declared,
    baseIncomeCop,
    percentageCandidateCop,
    uvtCapCandidateCop,
    appliedCop: Math.max(0, binding.value),
    bindingCandidate: binding.key,
    formula,
    ruleSourceIds: rule.legalSourceIds,
  };
}
