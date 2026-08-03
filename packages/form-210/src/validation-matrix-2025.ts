import type { Form210RuleValidation, Form210RuleValidationStatus } from './types';
import {
  FORM_210_RULE_VERSION_2025,
  FORM_210_VERIFIED_AT,
  FORM_210_BOXES_2025,
} from './ruleset-2025';

/**
 * Matriz de validación normativa del Formulario 210 (AG 2025).
 * Cada fila expresa qué respalda cada casilla, su estado de implementación y
 * un ejemplo determinista cuando aplica. Los `legalBasisSourceIds` referencian
 * el catálogo `OFFICIAL_SOURCES_2025` en `@nexus-tax/aegis-rules`.
 *
 * Criterio para el estado:
 * - `verified`: la fórmula es aritmética directa del instructivo oficial DIAN
 *   (sumas/restas entre casillas explícitas) y hay un ejemplo determinista.
 * - `implemented_unverified`: la casilla se calcula por agrupación heurística
 *   (mapeo `TaxCategory → box` en el builder) sin una regla legal explícita
 *   que respalde qué categoría alimenta qué casilla; el valor es orientativo.
 * - `requires_review`: existe implementación pero la regla depende de una
 *   interpretación no confirmada; el UI debe crear una tarea y mantener la
 *   casilla abierta.
 * - `not_implemented`: la casilla existe en el modelo pero aún no se calcula.
 */

const FORM_210_SOURCE = 'dian-formulario-210-2025';

function row(
  boxNumber: number,
  status: Form210RuleValidationStatus,
  options: {
    formulaDescription: string;
    examples?: Form210RuleValidation['examples'];
    additionalSources?: readonly string[];
    notes?: string;
  },
): Form210RuleValidation {
  return {
    boxNumber,
    ruleId: `${FORM_210_RULE_VERSION_2025}:box-${boxNumber}`,
    taxYear: 2025,
    filingYear: 2026,
    formulaDescription: options.formulaDescription,
    legalBasisSourceIds: [FORM_210_SOURCE, ...(options.additionalSources ?? [])],
    examples: options.examples ?? [],
    implementationStatus: status,
    verifiedAt: FORM_210_VERIFIED_AT,
    notes: options.notes,
  };
}

/**
 * Ejemplos deterministas para las casillas con fórmula aritmética directa.
 * Cada uno se puede reproducir a mano en menos de un minuto.
 */
export const FORM_210_VALIDATION_MATRIX_2025: readonly Form210RuleValidation[] = [
  // === Patrimonio ===
  row(29, 'implemented_unverified', {
    formulaDescription: 'Suma de activos reportados y confirmados al cierre del año.',
    notes: 'La agrupación por categorías `asset`/`investment_asset` no está fijada por una regla oficial explícita.',
  }),
  row(30, 'implemented_unverified', {
    formulaDescription: 'Suma de pasivos reportados y confirmados al cierre del año.',
    notes: 'Agrupación por categoría `liability`.',
  }),
  row(31, 'verified', {
    formulaDescription: 'Patrimonio líquido = 29 - 30.',
    examples: [
      {
        description: 'Activos por 100.000.000 y deudas por 30.000.000.',
        inputs: { box29: 100_000_000, box30: 30_000_000 },
        expected: 70_000_000,
      },
    ],
  }),

  // === Rentas de trabajo ===
  row(32, 'implemented_unverified', {
    formulaDescription: 'Suma de ingresos brutos por rentas de trabajo detectados o confirmados.',
    notes: 'Categoría `employment_income`. Sin regla explícita para exclusiones.',
  }),
  row(33, 'implemented_unverified', {
    formulaDescription: 'Ingresos no constitutivos de renta de trabajo.',
    notes: 'Categoría `employment_non_constitutive_income`.',
  }),
  row(34, 'verified', {
    formulaDescription: 'Renta líquida de rentas de trabajo = 32 - 33.',
    examples: [
      {
        description: 'Ingresos 60M, no constitutivos 5M.',
        inputs: { box32: 60_000_000, box33: 5_000_000 },
        expected: 55_000_000,
      },
    ],
  }),
  row(35, 'not_implemented', {
    formulaDescription: 'Aportes voluntarios AFC, FVP y AVC (con topes de art. 126-1 y 126-4 ET).',
    notes: 'Requiere modelar aportes con límite de 30 % + 3.800 UVT por año.',
  }),
  row(36, 'not_implemented', {
    formulaDescription: 'Otras rentas exentas de trabajo (25 % laboral, otros).',
    notes: 'Requiere modelo de fuente por concepto.',
  }),
  row(37, 'verified', {
    formulaDescription: 'Total rentas exentas de trabajo = 35 + 36.',
    examples: [
      {
        description: 'Aportes 4M + otras 6M.',
        inputs: { box35: 4_000_000, box36: 6_000_000 },
        expected: 10_000_000,
      },
    ],
  }),
  row(38, 'not_implemented', {
    formulaDescription: 'Intereses de vivienda con límite de 1.200 UVT (art. 119 ET).',
  }),
  row(39, 'not_implemented', {
    formulaDescription:
      'Otras deducciones imputables (dependientes, salud prepagada, etc.) con sus topes.',
  }),
  row(40, 'verified', {
    formulaDescription: 'Total deducciones = 38 + 39.',
    examples: [
      {
        description: 'Intereses 3M + otras 2M.',
        inputs: { box38: 3_000_000, box39: 2_000_000 },
        expected: 5_000_000,
      },
    ],
  }),
  row(41, 'not_implemented', {
    formulaDescription:
      'Rentas exentas y deducciones limitadas al 40 % de (34) sin exceder 1.340 UVT.',
    notes: 'Requiere aplicar el límite combinado del art. 336 ET.',
  }),
  row(42, 'verified', {
    formulaDescription: 'Renta líquida ordinaria de rentas de trabajo = 34 - 41.',
    examples: [
      {
        description: 'Renta líquida 55M, limitada 10M.',
        inputs: { box34: 55_000_000, box41: 10_000_000 },
        expected: 45_000_000,
      },
    ],
  }),

  // === Rentas de capital ===
  row(58, 'implemented_unverified', {
    formulaDescription: 'Ingresos brutos de rentas de capital (categoría `financial_income`).',
  }),
  row(59, 'not_implemented', { formulaDescription: 'Ingresos no constitutivos de renta de capital.' }),
  row(60, 'not_implemented', { formulaDescription: 'Costos y deducciones procedentes de rentas de capital.' }),
  row(61, 'verified', {
    formulaDescription: 'Renta líquida de rentas de capital = 58 - 59 - 60.',
    examples: [
      {
        description: 'Ingresos 20M, no constitutivos 2M, costos 3M.',
        inputs: { box58: 20_000_000, box59: 2_000_000, box60: 3_000_000 },
        expected: 15_000_000,
      },
    ],
  }),
  row(62, 'not_implemented', { formulaDescription: 'Rentas líquidas pasivas ECE de capital.' }),
  row(63, 'not_implemented', { formulaDescription: 'Rentas exentas de capital.' }),
  row(64, 'not_implemented', { formulaDescription: 'Deducciones imputables de capital.' }),
  row(65, 'not_implemented', {
    formulaDescription: 'Rentas exentas y deducciones limitadas al 10 % + 1.340 UVT (capital).',
  }),
  row(66, 'not_implemented', { formulaDescription: 'Renta líquida ordinaria de capital.' }),
  row(67, 'not_implemented', { formulaDescription: 'Pérdida líquida de capital.' }),

  // === Rentas no laborales ===
  row(74, 'implemented_unverified', {
    formulaDescription: 'Ingresos brutos de rentas no laborales (categoría `other_income`).',
  }),
  row(75, 'not_implemented', { formulaDescription: 'Devoluciones, rebajas y descuentos.' }),
  row(76, 'not_implemented', { formulaDescription: 'Ingresos no constitutivos de renta no laboral.' }),
  row(77, 'not_implemented', { formulaDescription: 'Costos y deducciones procedentes.' }),
  row(78, 'verified', {
    formulaDescription: 'Renta líquida de rentas no laborales = 74 - 75 - 76 - 77.',
    examples: [
      {
        description: 'Ingresos 40M, dev 1M, no constitutivos 3M, costos 6M.',
        inputs: { box74: 40_000_000, box75: 1_000_000, box76: 3_000_000, box77: 6_000_000 },
        expected: 30_000_000,
      },
    ],
  }),
  row(79, 'not_implemented', { formulaDescription: 'Rentas líquidas pasivas ECE no laborales.' }),
  row(80, 'not_implemented', { formulaDescription: 'Rentas exentas no laborales.' }),
  row(81, 'not_implemented', { formulaDescription: 'Deducciones imputables no laborales.' }),
  row(82, 'not_implemented', {
    formulaDescription: 'Rentas exentas y deducciones limitadas al 10 % + 1.340 UVT (no laboral).',
  }),
  row(83, 'not_implemented', { formulaDescription: 'Renta líquida ordinaria no laboral.' }),
  row(84, 'not_implemented', { formulaDescription: 'Pérdida líquida no laboral.' }),

  // === Pensiones ===
  row(99, 'implemented_unverified', {
    formulaDescription: 'Ingresos brutos por rentas de pensiones (categoría `pension_income`).',
  }),
  row(100, 'not_implemented', {
    formulaDescription: 'Ingresos no constitutivos de renta de pensiones (aportes salud/pensión).',
  }),
  row(101, 'verified', {
    formulaDescription: 'Renta líquida de pensiones = 99 - 100.',
    examples: [
      {
        description: 'Pensión 24M, aportes 3M.',
        inputs: { box99: 24_000_000, box100: 3_000_000 },
        expected: 21_000_000,
      },
    ],
  }),
  row(102, 'not_implemented', {
    formulaDescription: 'Rentas exentas de pensiones (hasta 1.000 UVT mensuales, art. 206 numeral 5 ET).',
  }),
  row(103, 'verified', {
    formulaDescription: 'Renta líquida gravable de pensiones = 101 - 102.',
    examples: [
      {
        description: 'Líquida 21M, exenta 12M.',
        inputs: { box101: 21_000_000, box102: 12_000_000 },
        expected: 9_000_000,
      },
    ],
  }),

  // === Dividendos ===
  row(104, 'not_implemented', {
    formulaDescription: 'Dividendos y participaciones (tarifas propias del art. 242 ET).',
  }),

  // === Ganancias ocasionales ===
  row(112, 'implemented_unverified', {
    formulaDescription: 'Ingresos por ganancias ocasionales (categoría `occasional_gain`).',
  }),
  row(113, 'not_implemented', { formulaDescription: 'Costos por ganancias ocasionales.' }),
  row(114, 'not_implemented', {
    formulaDescription: 'Ganancias ocasionales no gravadas y exentas (loterías separadas, etc.).',
  }),
  row(115, 'verified', {
    formulaDescription: 'Ganancias ocasionales gravables = 112 - 113 - 114.',
    examples: [
      {
        description: 'Ingresos 10M, costos 2M, exentas 1M.',
        inputs: { box112: 10_000_000, box113: 2_000_000, box114: 1_000_000 },
        expected: 7_000_000,
      },
    ],
  }),

  // === Liquidación privada (aún incompleta) ===
  row(130, 'not_implemented', {
    formulaDescription: 'Anticipo de renta liquidado el año anterior (requiere historial).',
    notes: 'Modelar como entrada manual confirmada por el analista.',
  }),
  row(131, 'not_implemented', {
    formulaDescription: 'Saldo a favor del año anterior sin devolución o compensación.',
    notes: 'Requiere confirmación humana; no se reutiliza automáticamente.',
  }),
  row(132, 'implemented_unverified', {
    formulaDescription: 'Retenciones del año gravable (categoría `withholding`).',
    notes: 'Falta consolidación por origen (trabajo/capital/otros) y detección de duplicados.',
  }),
];

/**
 * Bloqueo de coherencia: la matriz debe cubrir exactamente el mismo conjunto
 * de casillas que el ruleset. Se ejecuta en tiempo de carga (constructor de
 * módulo) para detectar desincronizaciones tan pronto se cargan los tipos.
 */
const RULESET_BOX_SET = new Set(FORM_210_BOXES_2025.map((box) => box.number));
const MATRIX_BOX_SET = new Set(FORM_210_VALIDATION_MATRIX_2025.map((entry) => entry.boxNumber));
for (const number of RULESET_BOX_SET) {
  if (!MATRIX_BOX_SET.has(number)) {
    throw new Error(
      `La casilla ${number} está en el ruleset pero no en la matriz de validación 2025.`,
    );
  }
}
for (const number of MATRIX_BOX_SET) {
  if (!RULESET_BOX_SET.has(number)) {
    throw new Error(
      `La casilla ${number} está en la matriz de validación pero no en el ruleset 2025.`,
    );
  }
}

/** Recupera una fila de validación por número de casilla. Lanza si no existe. */
export function getBoxValidation(boxNumber: number): Form210RuleValidation {
  const entry = FORM_210_VALIDATION_MATRIX_2025.find((row) => row.boxNumber === boxNumber);
  if (!entry) throw new Error(`Sin validación normativa para la casilla ${boxNumber}`);
  return entry;
}

/** Resumen por estado, útil para tests y para la vista de auditoría. */
export function summarizeValidationStatus(): Record<Form210RuleValidationStatus, number> {
  const counts: Record<Form210RuleValidationStatus, number> = {
    verified: 0,
    implemented_unverified: 0,
    requires_review: 0,
    not_implemented: 0,
  };
  for (const entry of FORM_210_VALIDATION_MATRIX_2025) {
    counts[entry.implementationStatus] += 1;
  }
  return counts;
}
