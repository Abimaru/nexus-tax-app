import { expect } from '@playwright/test';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as XLSX from 'xlsx';

/** Exógena SINTÉTICA con un único límite superado (ingresos). */
export function makeSample(income: number): string {
  const wb = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([
    ['Información exógena - MUESTRA'],
    [null, null, null, null, null, null, 'Fecha Reporte:', '2025-01-15'],
    ['Fecha corte del proceso:', null, '2025-01-10'],
    ['Año al que se refiere la consulta:', null, 2025],
    ['Identificación del consultante'],
    ['Tipo de documento:', null, 'CC'],
    ['Identificación:', null, '1.234.567.890'],
    ['Nombres / Razón social:', null, 'Persona Sintética E2E'],
    [],
    ['Advertencia sintética'],
    ['Información sintética'],
    [],
    ['Persona que reporta', null, 'Información reportada'],
    [
      'NIT',
      'Nombre / Razón Social',
      'NIT',
      'Nombre reportado',
      'Detalle',
      'Valor',
      'Uso declaración Sugerida',
    ],
    [null, null, null, null, 'Patrimonio bruto', 1_000_000],
    [null, null, null, null, 'Ingresos brutos', income],
    [null, null, null, null, 'Consumos con tarjeta', 1_000_000],
    [null, null, null, null, 'Compras', 1_000_000],
    [null, null, null, null, 'Consignaciones', 1_000_000],
    [
      '900111222',
      'Banco Ficticio S.A.',
      '1234567890',
      'Persona Sintética E2E',
      'Saldo cuenta bancaria',
      1_250_000,
      'R29 Patrimonio Bruto',
    ],
    [
      '800333444',
      'Empresa Empleadora SAS',
      '1234567890',
      'Persona Sintética E2E',
      'Salarios',
      income,
      'R32 Ingresos laborales',
    ],
  ]);
  sheet['!merges'] = [
    XLSX.utils.decode_range('A6:B6'),
    XLSX.utils.decode_range('A7:B7'),
    XLSX.utils.decode_range('A8:B8'),
    XLSX.utils.decode_range('A13:B13'),
    XLSX.utils.decode_range('C13:G13'),
  ];
  XLSX.utils.book_append_sheet(wb, sheet, 'Reporte');
  const file = join(mkdtempSync(join(tmpdir(), 'nexustax-first-')), 'exogena-sintetica.xlsx');
  writeFileSync(file, XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
  return file;
}

export async function loadCase(page: import('@playwright/test').Page, file: string) {
  await page.goto('/expedientes/nuevo');
  await page.getByLabel('Nombre o alias').fill('Resultado inicial E2E');
  await page.getByRole('button', { name: 'Crear expediente' }).click();
  await page.setInputFiles('#exogenous-file-input', file);
  await page.getByRole('button', { name: 'Reporte' }).click();
  await page.getByRole('button', { name: /Procesar información/ }).click();
  await expect(page).toHaveURL(/\/organizacion\/tu-resultado$/, { timeout: 20_000 });
}

/** PDF de texto SINTÉTICO mínimo. */
export function makeTextPdf(lines: readonly string[], fileName: string): string {
  const escape = (value: string) => value.replace(/([\()])/g, '\$1');
  const commands = ['BT', '/F1 11 Tf', '72 740 Td'];
  lines.forEach((line, index) => {
    if (index) commands.push('0 -18 Td');
    commands.push(`(${escape(line)}) Tj`);
  });
  commands.push('ET');
  const stream = `${commands.join('\n')}\n`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}endstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`)
    .join('');
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  const file = join(mkdtempSync(join(tmpdir(), 'nexustax-pdf-')), fileName);
  writeFileSync(file, Buffer.from(pdf));
  return file;
}
