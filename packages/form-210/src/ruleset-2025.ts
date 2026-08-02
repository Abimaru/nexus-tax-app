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
): Form210BoxDefinition => ({ number, name, section, formula, dependencies, ruleComplete });

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
  box(41, 'Rentas exentas y deducciones limitadas', 'employment_income', null, [34, 37, 40]),
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
  box(65, 'Rentas exentas y deducciones limitadas de capital', 'capital_income'),
  box(66, 'Renta líquida ordinaria de capital', 'capital_income'),
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
  box(82, 'Rentas exentas y deducciones limitadas no laborales', 'non_labor_income'),
  box(83, 'Renta líquida ordinaria no laboral', 'non_labor_income'),
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
