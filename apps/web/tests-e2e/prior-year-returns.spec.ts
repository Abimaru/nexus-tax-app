import { test, expect } from '@playwright/test';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as XLSX from 'xlsx';

/**
 * E2E de declaraciones anteriores (Sprint 2.4, Fase B1). Usa un Excel
 * sintético mínimo (para desbloquear la etapa Declaración, que requiere una
 * fuente procesada) y un PDF sintético de Formulario 210 generado con texto
 * plano — nunca datos reales ni el PDF real usado durante el diseño.
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
  const dir = mkdtempSync(join(tmpdir(), 'nexustax-prior-year-'));
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

/** Fixture sintético del Formulario 210 AG2024, anonimizado y determinista. */
function makePriorYearReturnPdfFile(overrides: { identity?: string } = {}): string {
  // Sin acentos ni caracteres especiales: el generador de PDF de este
  // fixture no aplica una codificación Latin-1 explícita al stream de texto,
  // así que cualquier carácter no-ASCII se corrompe al extraerlo (mismo
  // motivo por el que document-lab.spec.ts evita acentos en sus fixtures).
  const lines = [
    'Declaracion de Renta y Complementarios - Formulario 210',
    'Ano gravable 2024',
    `NIT ${overrides.identity ?? '1234567890'}`,
    'Numero de formulario 1102345678901',
    'Fecha de presentacion el 2025-05-10',
    '29 Patrimonio bruto 148.984.000',
    '89 Renta liquida gravable cedula general 76.778.000',
    '130 Anticipo de renta liquidado el ano anterior 1.839.000',
    '132 Retenciones del ano gravable 3.080.000',
    '133 Anticipo de renta por el ano gravable siguiente 79.000',
    '137 Saldo a favor 0',
  ];
  const dir = mkdtempSync(join(tmpdir(), 'nexustax-prior-year-pdf-'));
  const file = join(dir, 'formulario-210-ag2024-sintetico.pdf');
  writeFileSync(file, makeTextPdf(lines));
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

test('declaraciones anteriores: carga, identidad, arrastre de anticipo y evolución tributaria', async ({
  page,
}, testInfo) => {
  const samplePath = makeSampleFile();
  const priorYearPdfPath = makePriorYearReturnPdfFile();

  await page.goto('/');
  await page.getByRole('link', { name: 'Crear expediente' }).first().click();
  await page.getByLabel('Nombre o alias').fill('Expediente declaraciones anteriores E2E');
  await page.getByRole('button', { name: 'Crear expediente' }).click();

  await expect(page).toHaveURL(/\/fuente\/cargar$/);
  await page.setInputFiles('#exogenous-file-input', samplePath);
  await expect(page).toHaveURL(/\/extraccion\/inspeccion$/);
  await page.getByRole('button', { name: 'Reporte' }).click();
  await page.getByRole('button', { name: /Procesar información/ }).click();
  await expect(page).toHaveURL(/\/organizacion\/resumen$/, { timeout: 20_000 });

  await selectStage(page, 'Declaración');
  await selectView(page, 'Declaraciones anteriores');
  await expect(
    page.getByRole('heading', { name: 'Declaraciones anteriores', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('No has agregado declaraciones anteriores')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('prior-year-listado-vacio.png'), fullPage: true });

  // 1) Carga y análisis local.
  await page.getByRole('button', { name: 'Agregar declaración' }).first().click();
  await page.setInputFiles('#prior-year-return-file', priorYearPdfPath);
  await page.getByRole('button', { name: 'Analizar documento' }).click();
  await expect(page.getByText('Formulario reconocido.')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/casilla\(s\) reconocida/)).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath('prior-year-declaracion-reconocida.png'),
    fullPage: true,
  });

  // 2) Identidad: el expediente no tiene identidad confirmada todavía (no
  // bloquea, pero tampoco afirma "verificada"; el guardado queda habilitado).
  await page.getByRole('button', { name: 'Guardar declaración histórica' }).click();

  // 3) Casillas extraídas y procedencia.
  await expect(page.getByRole('heading', { name: 'AG 2024' })).toBeVisible();
  await expect(page.getByText('Presentada')).toBeVisible();
  await page.getByRole('button', { name: 'Ver declaración' }).click();
  await expect(page.getByRole('dialog', { name: 'Declaración AG 2024' })).toBeVisible();
  await expect(page.getByText('Anticipo de renta año gravable siguiente')).toBeVisible();
  await page.getByRole('button', { name: 'Ver procedencia' }).click();
  await expect(page.getByText(/native_text/).first()).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath('prior-year-valores-extraidos.png'),
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Cerrar', exact: true }).click();

  // 4) Arrastre de anticipo (R133 -> R130).
  await expect(page.getByText('Anticipo del año anterior')).toBeVisible();
  await expect(page.getByText(/79\.000/)).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath('prior-year-arrastre-pendiente.png'),
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Aplicar' }).first().click();
  await expect(page.getByText('Aplicado')).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath('prior-year-arrastre-aplicado.png'),
    fullPage: true,
  });

  // Saldo a favor en cero: no debe generar una tarjeta con tarea, solo el
  // mensaje informativo (adenda punto 9).
  await expect(
    page.getByText('El formulario anterior no registra saldo para trasladar en este concepto.'),
  ).toBeVisible();

  // 5) El borrador F-210 refleja el arrastre confirmado en la casilla 130.
  await selectView(page, 'Borrador Formulario 210');
  await expect(page.locator('#form210-box-130')).toContainText(/79\.000/);

  // 6) Evolución tributaria.
  await selectView(page, 'Declaraciones anteriores');
  await page.getByRole('button', { name: 'Comparar con año actual' }).click();
  await expect(page.getByRole('heading', { name: 'Evolución tributaria' })).toBeVisible();
  await expect(page.getByText('Patrimonio bruto')).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath('prior-year-evolucion-tributaria.png'),
    fullPage: true,
  });

  // Quality gate — móvil 390 px, sin overflow horizontal.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(250);
  await page.screenshot({ path: testInfo.outputPath('prior-year-evolucion-390.png'), fullPage: true });
  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(hasHorizontalOverflow).toBe(false);
  await page.setViewportSize({ width: 1280, height: 900 });

  // 7) Persistencia tras recargar.
  await page.reload();
  await selectView(page, 'Declaraciones anteriores');
  await expect(page.getByRole('heading', { name: 'AG 2024' })).toBeVisible();
  await expect(page.getByText('Aplicado')).toBeVisible();

  // 8) Revisión final: sin pendientes de declaración anterior tras confirmar.
  await selectView(page, 'Revisión final');
  await expect(page.getByRole('heading', { name: 'Revisión final del expediente' })).toBeVisible();
});

test('declaraciones anteriores: bloquea el uso cuando la identidad no coincide', async ({
  page,
}, testInfo) => {
  const samplePath = makeSampleFile();
  const priorYearPdfPath = makePriorYearReturnPdfFile({ identity: '999888777-1' });

  await page.goto('/');
  await page.getByRole('link', { name: 'Crear expediente' }).first().click();
  await page.getByLabel('Nombre o alias').fill('Expediente identidad E2E');
  await page.getByRole('button', { name: 'Crear expediente' }).click();
  await expect(page).toHaveURL(/\/fuente\/cargar$/);
  await page.setInputFiles('#exogenous-file-input', samplePath);
  await expect(page).toHaveURL(/\/extraccion\/inspeccion$/);
  await page.getByRole('button', { name: 'Reporte' }).click();
  await page.getByRole('button', { name: /Procesar información/ }).click();
  await expect(page).toHaveURL(/\/organizacion\/resumen$/, { timeout: 20_000 });

  await selectStage(page, 'Declaración');
  await selectView(page, 'Declaraciones anteriores');
  await page.getByRole('button', { name: 'Agregar declaración' }).first().click();
  await page.setInputFiles('#prior-year-return-file', priorYearPdfPath);
  await page.getByRole('button', { name: 'Analizar documento' }).click();
  await expect(page.getByText('Formulario reconocido.')).toBeVisible({ timeout: 20_000 });

  // El expediente ya tiene identidad confirmada por la exógena
  // (1.234.567.890) y el PDF trae un NIT distinto (999888777-1): la
  // comparación debe bloquear el uso, nunca importar valores.
  await expect(page.getByText('Este formulario parece pertenecer a otra persona.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Guardar declaración histórica' })).toBeDisabled();
  await page.screenshot({
    path: testInfo.outputPath('prior-year-identity-mismatch.png'),
    fullPage: true,
  });
});
