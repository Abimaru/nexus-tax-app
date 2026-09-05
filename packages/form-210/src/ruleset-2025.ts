import type { Form210BoxDefinition } from './types';

export const FORM_210_RULE_VERSION_2025 = 'co.dian.form210.2025.v1';
export const FORM_210_FORM_VERSION = 'Resolución DIAN 000044 de 2024, modificada y compilada';
export const FORM_210_VERIFIED_AT = '2026-08-02';

export const FORM_210_SOURCES_2025 = [
  {
    title: 'Formulario 210 e instructivo — año gravable 2023 y siguientes',
    url: 'https://www.dian.gov.co/atencionciudadano/formulariosinstructivos/Formularios/2025/Formulario_210_2025.pdf',
  },
  {
    title: 'Resolución DIAN 000044 de 2024',
    url: 'https://normograma.dian.gov.co/dian/compilacion/docs/resolucion_dian_0044_2024.htm',
  },
  {
    title: 'Resolución Única DIAN 000227 de 2025',
    url: 'https://normograma.dian.gov.co/dian/compilacion/docs/resolucion_dian_0227_2025.htm',
  },
] as const;

const box = (
  number: number,
  name: string,
  section: Form210BoxDefinition['section'],
  formula: string | null = null,
  dependencies: number[] = [],
  ruleComplete = false,
): Form210BoxDefinition => ({
  number,
  name,
  section,
  formula,
  dependencies,
  ruleComplete,
  implementationStatus: ruleComplete ? 'verified' : 'implemented_unverified',
});

/**
 * Casilla estructural (Fase B0, Sprint 2.4): existe en el catálogo para que
 * el Formulario 210 se pueda representar completo, pero su fórmula NO se
 * implementa hasta confirmarse contra el instructivo oficial. `formula`
 * siempre es `null` y `ruleComplete` siempre `false` — nunca se calcula
 * automáticamente ni se cablea en `builder.ts` salvo que `verificationNote`
 * documente explícitamente una fuente de valor ya calculada por otro motor
 * (p. ej. la casilla 133 usa `nextYearAdvance`, ya probado en `aegis-rules`).
 */
const structuralBox = (
  number: number,
  name: string,
  section: Form210BoxDefinition['section'],
  implementationStatus: Form210BoxDefinition['implementationStatus'],
  legalBasisSourceIds: readonly string[] = [],
  verificationNote?: string,
): Form210BoxDefinition => ({
  number,
  name,
  section,
  formula: null,
  dependencies: [],
  ruleComplete: false,
  implementationStatus,
  legalBasisSourceIds,
  verificationNote,
});

export const FORM_210_BOXES_2025: readonly Form210BoxDefinition[] = [
  box(29, 'Patrimonio bruto', 'patrimony', 'Suma de activos al cierre', [], true),
  box(30, 'Deudas', 'patrimony', 'Suma de pasivos al cierre', [], true),
  box(31, 'Patrimonio líquido', 'patrimony', '29 - 30', [29, 30], true),
  box(32, 'Ingresos brutos de rentas de trabajo', 'employment_income', null, [], true),
  box(33, 'Ingresos no constitutivos de renta de trabajo', 'employment_income', null, [], true),
  box(34, 'Renta líquida de rentas de trabajo', 'employment_income', '32 - 33', [32, 33], true),
  box(35, 'Aportes voluntarios AFC, FVP y AVC', 'employment_income'),
  box(36, 'Otras rentas exentas', 'employment_income'),
  box(37, 'Total rentas exentas', 'employment_income', '35 + 36', [35, 36], true),
  box(38, 'Intereses de vivienda', 'employment_income'),
  box(39, 'Otras deducciones imputables', 'employment_income'),
  box(40, 'Total deducciones', 'employment_income', '38 + 39', [38, 39], true),
  box(
    41,
    'Rentas exentas y deducciones limitadas de rentas de trabajo',
    'employment_income',
    'min(40% × 34, 1.340 UVT, 37 + 40) — art. 336 ET',
    [34, 37, 40],
    true,
  ),
  box(
    42,
    'Renta líquida ordinaria de rentas de trabajo',
    'employment_income',
    '34 - 41',
    [34, 41],
    true,
  ),
  box(58, 'Ingresos brutos de rentas de capital', 'capital_income', null, [], true),
  box(59, 'Ingresos no constitutivos de renta de capital', 'capital_income'),
  box(60, 'Costos y deducciones procedentes de rentas de capital', 'capital_income'),
  box(
    61,
    'Renta líquida de rentas de capital',
    'capital_income',
    '58 - 59 - 60',
    [58, 59, 60],
    true,
  ),
  box(62, 'Rentas líquidas pasivas de capital', 'capital_income'),
  box(63, 'Rentas exentas de capital', 'capital_income'),
  box(64, 'Deducciones imputables de capital', 'capital_income'),
  box(
    65,
    'Rentas exentas y deducciones limitadas de capital',
    'capital_income',
    'min(40% × 61, 1.340 UVT, 63 + 64) — art. 336 ET',
    [61, 63, 64],
    true,
  ),
  box(66, 'Renta líquida ordinaria de capital', 'capital_income', '61 - 65', [61, 65], true),
  box(67, 'Pérdida líquida de capital', 'capital_income'),
  box(74, 'Ingresos brutos de rentas no laborales', 'non_labor_income', null, [], true),
  box(75, 'Devoluciones, rebajas y descuentos', 'non_labor_income'),
  box(76, 'Ingresos no constitutivos de renta no laboral', 'non_labor_income'),
  box(77, 'Costos y deducciones procedentes', 'non_labor_income'),
  box(
    78,
    'Renta líquida de rentas no laborales',
    'non_labor_income',
    '74 - 75 - 76 - 77',
    [74, 75, 76, 77],
    true,
  ),
  box(79, 'Rentas líquidas pasivas no laborales', 'non_labor_income'),
  box(80, 'Rentas exentas no laborales', 'non_labor_income'),
  box(81, 'Deducciones imputables no laborales', 'non_labor_income'),
  box(
    82,
    'Rentas exentas y deducciones limitadas no laborales',
    'non_labor_income',
    'min(40% × 78, 1.340 UVT, 80 + 81) — art. 336 ET',
    [78, 80, 81],
    true,
  ),
  box(83, 'Renta líquida ordinaria no laboral', 'non_labor_income', '78 - 82', [78, 82], true),
  box(84, 'Pérdida líquida no laboral', 'non_labor_income'),
  box(99, 'Ingresos brutos por rentas de pensiones', 'pensions', null, [], true),
  box(100, 'Ingresos no constitutivos de renta de pensiones', 'pensions'),
  box(101, 'Renta líquida de pensiones', 'pensions', '99 - 100', [99, 100], true),
  box(102, 'Rentas exentas de pensiones', 'pensions'),
  box(103, 'Renta líquida gravable de pensiones', 'pensions', '101 - 102', [101, 102], true),
  box(104, 'Dividendos y participaciones', 'dividends'),
  box(112, 'Ingresos por ganancias ocasionales', 'occasional_gains', null, [], true),
  box(113, 'Costos por ganancias ocasionales', 'occasional_gains'),
  box(114, 'Ganancias ocasionales no gravadas y exentas', 'occasional_gains'),
  box(
    115,
    'Ganancias ocasionales gravables',
    'occasional_gains',
    '112 - 113 - 114',
    [112, 113, 114],
    true,
  ),
  box(130, 'Anticipo de renta liquidado el año anterior', 'private_settlement'),
  box(131, 'Saldo a favor del año anterior sin devolución o compensación', 'private_settlement'),
  box(132, 'Retenciones del año gravable', 'private_settlement', null, [], true),

  // --- Casillas estructurales agregadas en Fase B0 (Sprint 2.4) ---
  //
  // Completan el esqueleto del F-210 para las secciones de consolidación de
  // la cédula general y liquidación del impuesto. NINGUNA fórmula se marca
  // `verified`: se documentó en la auditoría de Fase A/B0 que no hay acceso
  // directo y fiable al instructivo oficial DIAN para confirmar la posición
  // exacta de cada casilla, por lo que solo se representa la ESTRUCTURA
  // (número, sección, estado) y — donde ya existe un motor probado que
  // calcula el valor subyacente — se cablea informativamente en
  // `builder.ts` sin alterar ninguna casilla ya verificada.
  structuralBox(
    89,
    'Renta líquida gravable — cédula general (consolidación de subcédulas)',
    'general_income_consolidation',
    'requires_review',
    ['et-art-336'],
    'Hallazgo Fase B0: la suma 42+61 no reproduce el valor esperado en ' +
      'los fixtures de referencia; hay evidencia de una subcédula de ' +
      '"rentas de trabajo sin relación laboral" (honorarios/servicios, ' +
      'aprox. casillas 43-57) que el motor actual no modela. No se calcula ' +
      'automáticamente hasta confirmar la fórmula con el instructivo oficial.',
  ),
  structuralBox(
    91,
    'Renta líquida cédula general antes de beneficios del art. 336 ET',
    'general_income_consolidation',
    'not_implemented',
    ['et-art-336'],
  ),
  structuralBox(
    92,
    'Rentas exentas y deducciones limitadas de la cédula general',
    'general_income_consolidation',
    'not_implemented',
    ['et-art-336'],
    'Corrección de Fase A/B0: según el instructivo oficial, la adición por ' +
      'dependientes de 72 UVT (casilla 139) es un COMPONENTE de esta ' +
      'casilla, no una resta independiente posterior. Se deja sin calcular ' +
      'hasta la Fase C (motor del art. 336 — 72 UVT).',
  ),
  structuralBox(
    93,
    'Renta líquida ordinaria de la cédula general',
    'general_income_consolidation',
    'not_implemented',
    ['et-art-336'],
  ),
  structuralBox(
    111,
    'Base gravable conjunta para la tarifa del art. 241 ET (cédula general + pensiones + dividendos)',
    'general_income_consolidation',
    'not_implemented',
    ['et-art-241'],
  ),
  structuralBox(
    126,
    'Impuesto de renta líquida gravable',
    'tax_settlement',
    'implemented_unverified',
    ['et-art-241'],
    'Cableada informativamente desde `preliminaryLiquidation.incomeTax` ' +
      '(motor ya probado). La NUMERACIÓN oficial de esta casilla no está ' +
      'confirmada contra el instructivo DIAN 2025.',
  ),
  structuralBox(
    127,
    'Impuesto de ganancias ocasionales',
    'tax_settlement',
    'requires_review',
    ['et-art-314', 'et-art-317'],
    'Cableada informativamente desde `preliminaryLiquidation.occasionalGainsTax` ' +
      'cuando existe base gravable. Posición 127 evidenciada solo por un ' +
      'fixture anterior (Sprint 2.3.2), sin segunda fuente independiente.',
  ),
  structuralBox(
    129,
    'Total impuesto a cargo (renta + ganancias ocasionales)',
    'tax_settlement',
    'implemented_unverified',
    ['et-art-241', 'et-art-314'],
    'Cableada informativamente desde `preliminaryLiquidation.totalTaxDueCop` ' +
      '(motor ya probado). La NUMERACIÓN oficial no está confirmada.',
  ),
  structuralBox(
    133,
    'Anticipo de renta por el año gravable siguiente',
    'private_settlement',
    'implemented_unverified',
    ['et-art-807'],
    'Cableada informativamente desde `preliminaryLiquidation.nextYearAdvance` ' +
      '(motor ya probado, `computeAdvancePayment`). Este es el valor que la ' +
      'Fase B usa como candidato de arrastre hacia la casilla 130 del año ' +
      'siguiente (adenda Sprint 2.4, punto 13).',
  ),
  structuralBox(
    137,
    'Saldo a favor',
    'private_settlement',
    'implemented_unverified',
    [],
    'Cableada informativamente desde `preliminaryLiquidation.netBalanceCop` ' +
      '(motor ya probado) cuando el saldo neto es negativo. Este es el ' +
      'valor que la Fase B usa como candidato de arrastre hacia la casilla ' +
      '131 del año siguiente (adenda Sprint 2.4, punto 13).',
  ),
  structuralBox(
    138,
    'Número de dependientes económicos (adición 72 UVT, art. 336 ET)',
    'informational',
    'not_implemented',
    ['et-art-336'],
    'Pendiente de la Fase C (motor del beneficio de 72 UVT por dependiente, ' +
      'separado del art. 387 ya implementado).',
  ),
  structuralBox(
    139,
    'Adición por dependientes a la casilla 92 (72 UVT, art. 336 ET)',
    'informational',
    'not_implemented',
    ['et-art-336'],
    'Pendiente de la Fase C. Por instructivo oficial, es un componente de ' +
      'la casilla 92 y queda fuera del límite conjunto de 40 %/1.340 UVT.',
  ),
  structuralBox(
    140,
    'Información complementaria — pendiente de verificación',
    'informational',
    'not_implemented',
  ),
  structuralBox(
    141,
    'Información complementaria — pendiente de verificación',
    'informational',
    'not_implemented',
  ),
];

export interface Form210Ruleset {
  taxYear: 2025;
  filingYear: 2026;
  formVersion: string;
  ruleVersion: string;
  verifiedAt: string;
  sources: typeof FORM_210_SOURCES_2025;
  boxes: readonly Form210BoxDefinition[];
}

export const FORM_210_RULESET_2025: Form210Ruleset = {
  taxYear: 2025,
  filingYear: 2026,
  formVersion: FORM_210_FORM_VERSION,
  ruleVersion: FORM_210_RULE_VERSION_2025,
  verifiedAt: FORM_210_VERIFIED_AT,
  sources: FORM_210_SOURCES_2025,
  boxes: FORM_210_BOXES_2025,
};
