import { test, expect } from '@playwright/test';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as XLSX from 'xlsx';

/**
 * Escenarios acotados del Sprint 2.2 (laboratorio documental / OCR). Se
 * mantienen separados de smoke.spec.ts a propósito: solo llegan hasta
 * Organización, sin recorrer Declaración/Conciliación, para no acoplarse a
 * ese flujo más largo.
 */

function makeSampleFile(): string {
  const wb = XLSX.utils.book_new();
  const data = XLSX.utils.aoa_to_sheet([
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
    [null, null, null, null, 'Patrimonio bruto', 100],
    [null, null, null, null, 'Ingresos brutos', 100],
    [
      '900111222',
      'Banco Ficticio S.A.',
      '1234567890',
      'Persona Sintética E2E',
      'Saldo cuenta bancaria',
      1_250_000,
      'R29 Patrimonio Bruto',
    ],
  ]);
  data['!merges'] = [
    XLSX.utils.decode_range('A6:B6'),
    XLSX.utils.decode_range('A7:B7'),
    XLSX.utils.decode_range('A8:B8'),
    XLSX.utils.decode_range('A13:B13'),
    XLSX.utils.decode_range('C13:G13'),
  ];
  XLSX.utils.book_append_sheet(wb, data, 'Reporte');
  const dir = mkdtempSync(join(tmpdir(), 'nexustax-lab-'));
  const file = join(dir, 'exogena-sintetica.xlsx');
  writeFileSync(file, XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
  return file;
}

function makeTextPdf(lines: readonly string[]): Buffer {
  const escape = (value: string) => value.replace(/([\\()])/g, '\\$1');
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
  return Buffer.from(pdf);
}

function makeScannedLikePdfFile(): string {
  const dir = mkdtempSync(join(tmpdir(), 'nexustax-scanned-'));
  const file = join(dir, 'escaneado-sin-texto-sintetico.pdf');
  writeFileSync(file, makeTextPdf([]));
  return file;
}

function makeLabTextPdfFile(): string {
  const dir = mkdtempSync(join(tmpdir(), 'nexustax-lab-text-'));
  const file = join(dir, 'certificado-laboratorio.pdf');
  writeFileSync(file, makeTextPdf(['CERTIFICADO DE SALDOS', 'Saldo al cierre: $ 900000']));
  return file;
}

async function selectStage(page: import('@playwright/test').Page, name: string) {
  await page
    .getByRole('navigation', { name: 'Etapas del expediente' })
    .getByRole('button', { name: new RegExp(name, 'i') })
    .click();
}

async function selectView(page: import('@playwright/test').Page, name: string) {
  await page
    .getByRole('navigation', { name: 'Vistas de la etapa' })
    .getByRole('button', { name: new RegExp(`^${name}`, 'i') })
    .click();
}

test('un PDF sin texto se lee y se diagnostica como escaneado, no se rechaza', async ({ page }) => {
  const samplePath = makeSampleFile();
  const scannedPath = makeScannedLikePdfFile();

  await page.goto('/');
  await page.getByRole('link', { name: 'Crear expediente' }).first().click();
  await page.getByLabel('Nombre o alias').fill('Expediente laboratorio E2E');
  await page.getByRole('button', { name: 'Crear expediente' }).click();

  await expect(page).toHaveURL(/\/fuente\/cargar$/);
  await page.setInputFiles('#exogenous-file-input', samplePath);

  await expect(page).toHaveURL(/\/extraccion\/inspeccion$/);
  await page.getByRole('button', { name: 'Reporte' }).click();
  await page.getByRole('button', { name: /Procesar información/ }).click();

  await expect(page).toHaveURL(/\/organizacion\/resumen$/, { timeout: 20_000 });

  await selectView(page, 'Documentos');
  await expect(page).toHaveURL(/\/organizacion\/documentos$/);
  await page.setInputFiles('#case-document-file', scannedPath);
  await page.getByLabel('Tipo documental').selectOption('balance_certificate');
  await page.getByLabel(/Decisi.n de persistencia/).selectOption('store_locally');
  await page.getByRole('button', { name: 'Registrar y analizar' }).click();

  await expect(page).toHaveURL(/\/organizacion\/revision-documental$/);
  await expect(
    page.getByRole('heading', { name: 'escaneado-sin-texto-sintetico.pdf' }),
  ).toBeVisible();
  await expect(page.getByText('Lectura parcial').first()).toBeVisible();
});

test('el laboratorio documental diagnostica, ejecuta OCR real y crea un candidato manual', async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000);
  const samplePath = makeSampleFile();
  const textPdfPath = makeLabTextPdfFile();

  await page.goto('/');
  await page.getByRole('link', { name: 'Crear expediente' }).first().click();
  await page.getByLabel('Nombre o alias').fill('Expediente laboratorio OCR E2E');
  await page.getByRole('button', { name: 'Crear expediente' }).click();

  await expect(page).toHaveURL(/\/fuente\/cargar$/);
  await page.setInputFiles('#exogenous-file-input', samplePath);
  await expect(page).toHaveURL(/\/extraccion\/inspeccion$/);
  await page.getByRole('button', { name: 'Reporte' }).click();
  await page.getByRole('button', { name: /Procesar información/ }).click();
  await expect(page).toHaveURL(/\/organizacion\/resumen$/, { timeout: 20_000 });

  await selectView(page, 'Documentos');
  await page.setInputFiles('#case-document-file', textPdfPath);
  await page.getByLabel('Tipo documental').selectOption('balance_certificate');
  await page.getByLabel(/Decisi.n de persistencia/).selectOption('store_locally');
  await page.getByRole('button', { name: 'Registrar y analizar' }).click();
  await expect(page).toHaveURL(/\/organizacion\/revision-documental$/);

  await selectView(page, 'Laboratorio documental');
  await expect(page.getByRole('heading', { name: 'Laboratorio documental' })).toBeVisible();
  await expect(page.getByText(/Documento: Textual/)).toBeVisible();

  await page.getByRole('button', { name: 'Avanzado' }).click();
  await page.getByRole('button', { name: 'Ejecutar OCR en esta página' }).click();

  await expect(page.getByText(/Coinciden|complementa|más confiable|más completo/)).toBeVisible({
    timeout: 90_000,
  });
  await expect(page.getByAltText('Vista previa de la página renderizada')).toBeVisible();
  await expect(page.getByLabel('Tokens nativos')).toBeVisible();

  await page.screenshot({
    path: testInfo.outputPath('laboratorio-avanzado-1280.png'),
    fullPage: true,
  });

  // Selección manual de campo: crea un candidato asistido y no navega fuera.
  await page.getByLabel('Fuente del texto').selectOption('native');
  await page.getByLabel('Campo').selectOption('balance');
  await page.getByRole('button', { name: 'Usar el texto de la página como punto de partida' }).click();
  await page.getByRole('textbox', { name: 'Concepto' }).fill('Saldo capturado en el laboratorio');
  await page.getByRole('spinbutton', { name: 'Valor' }).fill('900000');
  await page.getByRole('button', { name: 'Crear candidato manual asistido' }).click();
  await expect(page.getByText('Candidato creado y listo para revisar.')).toBeVisible();

  // Responsive: se verifica sobre la misma vista antes de navegar a otra, para
  // no depender del patrón de navegación móvil (combobox) en este spec.
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
    )
    .toBe(true);
  await page.screenshot({
    path: testInfo.outputPath('laboratorio-390.png'),
    fullPage: true,
  });
  await page.setViewportSize({ width: 1280, height: 720 });

  await selectView(page, 'Revisión de extracción');
  await expect(
    page.getByRole('article', { name: 'Saldo capturado en el laboratorio', exact: true }),
  ).toBeVisible();
});
