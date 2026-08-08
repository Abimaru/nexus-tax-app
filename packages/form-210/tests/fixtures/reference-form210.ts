import type { Form210ReferenceValue } from '../../src';

/** Fixture anonimizado de uso exclusivo en pruebas; nunca completa datos productivos. */
export const ANONYMIZED_FORM_210_REFERENCE: readonly Form210ReferenceValue[] = [
  [29, 148_984_000, 'Patrimonio bruto'],
  [30, 120_032_000, 'Deudas'],
  [31, 28_952_000, 'Patrimonio líquido'],
  [32, 124_451_000, 'Ingresos laborales'],
  [33, 7_722_000, 'Ingresos no constitutivos'],
  [34, 116_729_000, 'Renta líquida laboral'],
  [35, 0, 'AFC, FVP y AVC'],
  [36, 29_182_000, 'Otras rentas exentas'],
  [37, 29_182_000, 'Total rentas exentas'],
  [38, 7_764_000, 'Intereses de vivienda'],
  [39, 12_492_000, 'Otras deducciones'],
  [40, 20_256_000, 'Total deducciones'],
  [41, 47_448_000, 'Rentas exentas y deducciones limitadas'],
  [42, 69_281_000, 'Renta laboral gravable'],
  [58, 2_022_000, 'Ingresos de capital'],
  [59, 130_000, 'Ingresos no constitutivos de capital'],
  [60, 0, 'Costos de capital'],
  [61, 1_892_000, 'Renta líquida de capital'],
  [89, 67_180_000, 'Renta líquida cedular'],
  [112, 2_143_000, 'Ganancias ocasionales'],
  [113, 0, 'Costos de ganancias ocasionales'],
  [114, 0, 'Ganancias no gravadas'],
  [115, 2_143_000, 'Ganancias ocasionales gravables'],
  [116, 2_451_000, 'Impuesto de renta'],
  [121, 2_451_000, 'Impuesto neto'],
  [126, 2_451_000, 'Total impuesto'],
  [127, 429_000, 'Impuesto ganancias ocasionales'],
  [129, 2_880_000, 'Total impuesto y ganancias'],
  [130, 79_000, 'Anticipo'],
  [131, 0, 'Saldo anterior'],
  [132, 4_145_000, 'Retenciones'],
  [133, 0, 'Anticipo anterior'],
  [134, 0, 'Saldo a pagar'],
  [137, 1_344_000, 'Saldo a favor'],
].map(([boxNumber, expectedValue, label]) => ({
  boxNumber: boxNumber as number,
  expectedValue: expectedValue as number,
  label: label as string,
}));

export const ANONYMIZED_DEPENDENTS_REFERENCE = {
  count: 1,
  additionalDeductionCop: 3_586_000,
} as const;
