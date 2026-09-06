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
  // === Datos informativos (previos a patrimonio) ===
  row(28, 'implemented_unverified', {
    formulaDescription:
      'Deducción especial por compras con factura electrónica (art. 336 num. 5 ET) = ' +
      'min(1 % × compras con FE, 240 UVT).',
    additionalSources: ['et-art-336-num-5'],
    examples: [
      {
        description: '1 % de 49.799.000 (muy por debajo del tope de 240 UVT).',
        inputs: { purchasesBaseCop: 49_799_000 },
        expected: 497_990,
      },
    ],
    notes:
      'Revisión normativa puntual (Sprint 2.4, posterior a Fase D): corrige la ubicación de ' +
      'esta deducción, antes cableada a las casillas 140/141 por error. Ubicación oficial: ' +
      'casilla 28 (dato informativo previo a patrimonio), confirmada por múltiples fuentes ' +
      'independientes. Cableada informativamente desde ' +
      '`preliminaryLiquidation.electronicInvoicingDeduction.appliedDeductionCop` (motor ya ' +
      'probado). Nunca entra a la fórmula de R92 ni de R39: el numeral 5 exime expresamente ' +
      'esta deducción del límite del 40 %/1.340 UVT del numeral 3.',
  }),
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
      'Otras deducciones imputables (dependientes art. 387, salud prepagada, intereses ' +
      'de vivienda, etc.) con sus topes. NO incluye la deducción especial por compras con ' +
      'factura electrónica (art. 336 num. 5 ET, casilla oficial 28): esa deducción tiene su ' +
      'propia casilla y está expresamente exenta del límite conjunto que sí afecta a esta ' +
      'casilla vía R40→R41. Corregido en revisión normativa puntual posterior a Fase D.',
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
  row(41, 'verified', {
    formulaDescription:
      'Rentas exentas y deducciones limitadas de trabajo = min(40 % × 34, 1.340 UVT, 37 + 40) — art. 336 ET.',
    additionalSources: ['et-art-336'],
    examples: [
      {
        description: 'Renta líquida 60M; rentas exentas + deducciones 30M → 40 % gana.',
        inputs: { box34: 60_000_000, box37: 20_000_000, box40: 10_000_000 },
        expected: 24_000_000,
      },
      {
        description: 'Componente detectado 8M < 40 % de 100M → componente gana.',
        inputs: { box34: 100_000_000, box37: 5_000_000, box40: 3_000_000 },
        expected: 8_000_000,
      },
    ],
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
  row(65, 'verified', {
    formulaDescription:
      'Rentas exentas y deducciones limitadas de capital = min(40 % × 61, 1.340 UVT, 63 + 64) — art. 336 ET.',
    additionalSources: ['et-art-336'],
    examples: [
      {
        description: 'Renta líquida capital 50M; componente 15M → 40 % gana (20M vs 15M).',
        inputs: { box61: 50_000_000, box63: 10_000_000, box64: 5_000_000 },
        expected: 15_000_000,
      },
    ],
    notes:
      'El instructivo separa por sub-cédula con el mismo patrón del art. 336; la implementación es idéntica a la de trabajo.',
  }),
  row(66, 'verified', {
    formulaDescription: 'Renta líquida ordinaria de capital = 61 − 65.',
    examples: [
      {
        description: 'Renta líquida 50M; limitada 15M.',
        inputs: { box61: 50_000_000, box65: 15_000_000 },
        expected: 35_000_000,
      },
    ],
  }),
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
  row(82, 'verified', {
    formulaDescription:
      'Rentas exentas y deducciones limitadas no laborales = min(40 % × 78, 1.340 UVT, 80 + 81) — art. 336 ET.',
    additionalSources: ['et-art-336'],
    examples: [
      {
        description: 'Renta no laboral 500M; el tope 1.340 UVT domina (66.730.660).',
        inputs: { box78: 500_000_000, box80: 200_000_000, box81: 100_000_000 },
        expected: 66_730_660,
      },
    ],
  }),
  row(83, 'verified', {
    formulaDescription: 'Renta líquida ordinaria no laboral = 78 − 82.',
    examples: [
      {
        description: 'Renta líquida 40M; limitada 12M.',
        inputs: { box78: 40_000_000, box82: 12_000_000 },
        expected: 28_000_000,
      },
    ],
  }),
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

  // === Consolidación cédula general (Fase B0, Sprint 2.4) ===
  row(89, 'requires_review', {
    formulaDescription:
      'Renta líquida gravable de la cédula general (consolidación de subcédulas). ' +
      'Fórmula candidata sin confirmar: 42 + 57(honorarios, no modelada) + 66 + 83.',
    additionalSources: ['et-art-336'],
    notes:
      'Hallazgo Fase B0: la aritmética contra los fixtures de referencia sugiere una ' +
      'subcédula de rentas de trabajo sin relación laboral (honorarios/servicios) no ' +
      'modelada todavía (aprox. casillas 43-57). No se calcula hasta confirmar con el ' +
      'instructivo oficial.',
  }),
  row(91, 'implemented_unverified', {
    formulaDescription: 'Renta líquida cédula general antes de beneficios del art. 336 ET = 34 + 61 + 78.',
    additionalSources: ['et-art-336'],
    examples: [
      {
        description: 'Trabajo 60M, capital 10M, no laboral 20M.',
        inputs: { box34: 60_000_000, box61: 10_000_000, box78: 20_000_000 },
        expected: 90_000_000,
      },
    ],
    notes:
      'Implementado en Fase C (Sprint 2.4). Derivado algebraicamente de la mecánica ' +
      'R91→R92→R93 (fuente secundaria, no cita literal del instructivo DIAN).',
  }),
  row(92, 'implemented_unverified', {
    formulaDescription:
      'Rentas exentas y deducciones limitadas de la cédula general = 41 + 65 + 82 + 139, ' +
      'incluida la adición por dependientes de 72 UVT (casilla 139) como componente explícito.',
    additionalSources: ['et-art-336', 'et-art-336-num-3'],
    examples: [
      {
        description: 'Limitadas 41=10M, 65=2M, 82=3M; adición dependientes 139=3.585.528 (1 dependiente).',
        inputs: { box41: 10_000_000, box65: 2_000_000, box82: 3_000_000, box139: 3_585_528 },
        expected: 18_585_528,
      },
    ],
    notes:
      'Implementado en Fase C (Sprint 2.4): la adición de 72 UVT (art. 336 num. 3) es un ' +
      'componente explícito de esta casilla, no una resta posterior independiente. ' +
      'Revisión normativa puntual (Sprint 2.4, posterior a Fase D): se revirtió la inclusión ' +
      'de la casilla 141 en esta fórmula — esa casilla no corresponde a facturación ' +
      'electrónica (ver R141) y la deducción del 1 % (art. 336 num. 5 ET) tiene su propia ' +
      'casilla oficial (28), fuera de esta consolidación cedular.',
  }),
  row(93, 'implemented_unverified', {
    formulaDescription: 'Renta líquida ordinaria de la cédula general = 91 - 92.',
    additionalSources: ['et-art-336'],
    examples: [
      {
        description: 'R91 = 90M; R92 = 18.585.528.',
        inputs: { box91: 90_000_000, box92: 18_585_528 },
        expected: 71_414_472,
      },
    ],
    notes: 'Implementado en Fase C (Sprint 2.4).',
  }),
  row(111, 'not_implemented', {
    formulaDescription:
      'Base gravable conjunta para la tarifa progresiva del art. 241 ET ' +
      '(cédula general + pensiones + dividendos).',
    additionalSources: ['et-art-241'],
  }),

  // === Liquidación del impuesto (Fase B0, Sprint 2.4) ===
  row(126, 'implemented_unverified', {
    formulaDescription: 'Impuesto de renta líquida gravable (tarifa progresiva, art. 241 ET).',
    additionalSources: ['et-art-241'],
    notes:
      'Cableada informativamente desde `preliminaryLiquidation.incomeTax` (motor probado ' +
      'en `computeProgressiveIncomeTax`). La numeración de casilla no está confirmada.',
  }),
  row(127, 'requires_review', {
    formulaDescription: 'Impuesto de ganancias ocasionales (arts. 314 y 317 ET).',
    additionalSources: ['et-art-314', 'et-art-317'],
    notes:
      'Cableada informativamente desde `preliminaryLiquidation.occasionalGainsTax`. ' +
      'Posición 127 evidenciada solo por un fixture anterior (Sprint 2.3.2), sin ' +
      'segunda fuente independiente que la confirme.',
  }),
  row(129, 'implemented_unverified', {
    formulaDescription: 'Total impuesto a cargo = 126 + 127.',
    additionalSources: ['et-art-241', 'et-art-314'],
    examples: [
      {
        description: 'Impuesto de renta 4.840.000 y sin ganancias ocasionales.',
        inputs: { box126: 4_840_000, box127: 0 },
        expected: 4_840_000,
      },
    ],
    notes:
      'Cableada informativamente desde `preliminaryLiquidation.totalTaxDueCop`. La ' +
      'numeración de casilla no está confirmada contra el instructivo oficial.',
  }),
  row(133, 'implemented_unverified', {
    formulaDescription: 'Anticipo de renta por el año gravable siguiente (art. 807 ET).',
    additionalSources: ['et-art-807'],
    notes:
      'Cableada informativamente desde `preliminaryLiquidation.nextYearAdvance` (motor ' +
      'probado en `computeAdvancePayment`). Candidato de arrastre hacia la casilla 130 ' +
      'del año siguiente (Fase B, adenda Sprint 2.4 punto 13).',
  }),
  row(137, 'implemented_unverified', {
    formulaDescription: 'Saldo a favor = max(0, -(126 + 127 + 133 - 130 - 131 - 132)).',
    notes:
      'Cableada informativamente desde `preliminaryLiquidation.netBalanceCop` cuando el ' +
      'saldo neto es negativo. Candidato de arrastre hacia la casilla 131 del año ' +
      'siguiente (Fase B, adenda Sprint 2.4 punto 13).',
  }),

  // === Información complementaria (Fase C, Sprint 2.4) ===
  row(138, 'implemented_unverified', {
    formulaDescription: 'Número de dependientes económicos confirmados (adición 72 UVT, art. 336 num. 3 ET).',
    additionalSources: ['et-art-336-num-3'],
    notes:
      'Cableada informativamente desde `preliminaryLiquidation.dependentsAdditionalDeduction' +
      '.dependentsAppliedCount` (motor probado en `computeDependentsAdditionalDeduction`). ' +
      'Refleja el número CONFIRMADO por elegibilidad/coexistencia, no el conteo bruto.',
  }),
  row(139, 'implemented_unverified', {
    formulaDescription:
      'Adición por dependientes a la casilla 92 = dependientes confirmados × 72 UVT.',
    additionalSources: ['et-art-336-num-3'],
    examples: [
      {
        description: '1 dependiente confirmado × 72 UVT.',
        inputs: { box138: 1 },
        expected: 3_585_528,
      },
    ],
    notes:
      'Cableada informativamente desde ' +
      '`preliminaryLiquidation.dependentsAdditionalDeduction.totalCop`. Por instructivo ' +
      'oficial es un componente de la casilla 92 y queda fuera del límite conjunto de ' +
      '40 %/1.340 UVT.',
  }),
  row(140, 'not_implemented', {
    formulaDescription:
      'Indicador (checkbox) de exceso del tope de costos y gastos deducibles (art. 336-1 ET) ' +
      '— NO es una casilla monetaria.',
    additionalSources: ['et-art-336-1'],
    notes:
      'Revisión normativa puntual (Sprint 2.4, posterior a Fase D): esta casilla corresponde ' +
      'a una norma distinta (estimación de costos y gastos, tope indicativo del 60 %), ' +
      'confundida por error en las Fases B0/D con la deducción del 1 % de facturación ' +
      'electrónica (ver casilla 28). NexusTax no modela el tope de costos/gastos estimados ' +
      'en esta fase; permanece `not_implemented`.',
  }),
  row(141, 'not_implemented', {
    formulaDescription: 'Impuesto voluntario (art. 244-1 ET) — sin relación con dependientes ni facturación electrónica.',
    additionalSources: ['et-art-244-1'],
    notes:
      'Revisión normativa puntual (Sprint 2.4, posterior a Fase D): antes usada por error para ' +
      'la deducción del 1 % de facturación electrónica (ver casilla 28, su ubicación oficial ' +
      'correcta). NexusTax no modela el impuesto voluntario en esta fase; permanece ' +
      '`not_implemented`.',
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
