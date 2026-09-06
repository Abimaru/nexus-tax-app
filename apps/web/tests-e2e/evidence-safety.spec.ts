import { test, expect } from '@playwright/test';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as XLSX from 'xlsx';

/**
 * E2E — Sprint 2.4, Fase F.2 (Safety & Critical Evidence Hardening, §22).
 *
 * Escenario sintético (ningún documento ni cifra real):
 *
 * 1-2. candidato de ingreso correcto → coincidencia exacta normal;
 * 3-5. candidato cuyo monto coincide pero el concepto contradice
 *      ("retención" comparado como ingreso) → NO entra en confirmación
 *      masiva y el mensaje humano explica "el valor coincide, pero el
 *      concepto no";
 * 6-9. certificado de vivienda reconocido, intereses extraídos cuando son
 *      claros, y caso de vivienda SIN intereses detectables con captura
 *      manual guiada disponible;
 * 10. persistencia tras recargar la página.
 */

function makeExogenousFile(): string {
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
      'Entidad Sintetica Safety E2E',
      '1234567890',
      'Persona Sintética E2E',
      'Rendimientos financieros legitimos',
      1_234_567,
      null,
    ],
    [
      '900111222',
      'Entidad Sintetica Safety E2E',
      '1234567890',
      'Persona Sintética E2E',
      'Saldo cuenta bancaria reportado',
      2_000_000,
      null,
    ],
    [
      '900111222',
      'Entidad Sintetica Safety E2E',
      '1234567890',
      'Persona Sintética E2E',
      'Deduccion GMF reportada',
      50_000_000,
      null,
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
  const dir = mkdtempSync(join(tmpdir(), 'nexustax-safety-xlsx-'));
  const file = join(dir, 'exogena-safety-sintetica.xlsx');
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

function makeTempPdfFile(name: string, lines: readonly string[]): string {
  const dir = mkdtempSync(join(tmpdir(), 'nexustax-safety-pdf-'));
  const file = join(dir, name);
  writeFileSync(file, makeTextPdf(lines));
  return file;
}

async function selectView(page: import('@playwright/test').Page, name: string) {
  await page
    .getByRole('navigation', { name: 'Vistas de la etapa' })
    .getByRole('button', { name: new RegExp(`^${name}`, 'i') })
    .click();
}

test('gate semántico + evidencia de vivienda: contradicción bloqueada y captura manual guiada (Fase F.2)', async ({
  page,
}) => {
  test.setTimeout(90_000);
  const exogenousPath = makeExogenousFile();
  const financialPdfPath = makeTempPdfFile('certificado-financiero-sintetico.pdf', [
    'CERTIFICADO TRIBUTARIO SINTETICO E2E',
    'Rendimientos financieros: $ 1.234.567',
    'Saldo al cierre: $ 2.000.000',
    'Base gravable GMF: $ 50.000.000',
  ]);
  const housingWithInterestPath = makeTempPdfFile('certificado-vivienda-con-intereses.pdf', [
    'Certificado de prestamo de vivienda sintetico',
    'Intereses pagados durante el periodo: $ 450.000',
    'Saldo de la obligacion a diciembre: $ 5.000.000',
  ]);
  const housingWithoutInterestPath = makeTempPdfFile('certificado-vivienda-sin-intereses.pdf', [
    'Certificado de financiacion de vivienda sintetico',
    'Saldo de la obligacion a diciembre: $ 7.000.000',
    'Correccion monetaria: $ 12.000',
  ]);

  // 1. Iniciar expediente sintético e importar la exógena.
  await page.goto('/');
  await page.getByRole('link', { name: 'Crear expediente' }).first().click();
  await page.getByLabel('Nombre o alias').fill('Expediente Fase F.2 Safety E2E');
  await page.getByRole('button', { name: 'Crear expediente' }).click();
  await expect(page).toHaveURL(/\/fuente\/cargar$/);
  await page.setInputFiles('#exogenous-file-input', exogenousPath);
  await expect(page).toHaveURL(/\/extraccion\/inspeccion$/);
  await page.getByRole('button', { name: 'Reporte' }).click();
  await page.getByRole('button', { name: /Procesar información/ }).click();
  await expect(page).toHaveURL(/\/organizacion\/resumen$/, { timeout: 20_000 });

  // 2. Cargar el certificado financiero (ingreso legítimo + retención
  // contradictoria) como certificado tributario consolidado.
  await selectView(page, 'Documentos');
  await expect(page).toHaveURL(/\/organizacion\/documentos$/);
  await page.setInputFiles('#case-document-file', financialPdfPath);
  await page.getByLabel('Tipo documental').selectOption('consolidated_tax_certificate');
  await page.getByLabel(/C.mo conservar el documento/).selectOption('store_locally');
  await page.getByRole('button', { name: 'Registrar y analizar' }).click();
  await expect(page).toHaveURL(/\/organizacion\/revision-documental$/);

  // 3-4. El candidato correcto ("Rendimientos financieros") coincide
  // exactamente; el candidato contradictorio ("Base gravable GMF") NO
  // debe entrar en confirmación masiva aunque el valor coincida
  // exactamente con la exógena.
  const incomeCard = page.locator('li').filter({ hasText: 'Rendimientos financieros legitimos' });
  await expect(incomeCard.getByText('Coincide exactamente')).toBeVisible();
  const balanceCard = page.locator('li').filter({ hasText: 'Saldo cuenta bancaria reportado' });
  await expect(balanceCard.getByText('Coincide exactamente')).toBeVisible();

  // 5. El candidato contradictorio se presenta como "posible coincidencia"
  // (nunca "coincide exactamente") y explica el problema en lenguaje
  // humano, sin jerga técnica.
  const gmfCard = page.locator('li').filter({ hasText: 'Deduccion GMF reportada' });
  await expect(gmfCard.getByText('Posible coincidencia')).toBeVisible();
  await expect(gmfCard.getByText('Coincide exactamente')).toHaveCount(0);
  await expect(
    gmfCard.getByText(/el certificado parece describir una base de c.lculo/i),
  ).toBeVisible();
  await expect(gmfCard.getByText(/semantic|contradiction detected/i)).toHaveCount(0);

  // 4. La contradictoria NUNCA entra en la confirmación en bloque (§6):
  // el conteo de "coincidencias claras" solo cuenta las 2 correctas, y al
  // confirmarlas en bloque la contradictoria sigue visible, pendiente de
  // revisión humana.
  await expect(page.getByText(/2 coincidencias claras sin anomal[ií]as/)).toBeVisible();
  await page.getByRole('button', { name: 'Confirmar todas las claras' }).click();
  await expect(incomeCard).toHaveCount(0);
  await expect(balanceCard).toHaveCount(0);
  await expect(gmfCard).toBeVisible();

  // 6-7. Cargar un certificado de vivienda con intereses claros: se
  // reconoce como evidencia propia, sin exigir coincidencia en exógena.
  await selectView(page, 'Documentos');
  await page.setInputFiles('#case-document-file', housingWithInterestPath);
  await page.getByLabel('Tipo documental').selectOption('housing_interest_certificate');
  await page.getByLabel(/C.mo conservar el documento/).selectOption('store_locally');
  await page.getByRole('button', { name: 'Registrar y analizar' }).click();
  await expect(page).toHaveURL(/\/organizacion\/revision-documental$/);
  await expect(page.getByRole('heading', { name: 'Posibles valores nuevos' })).toBeVisible();
  const housingCard = page.locator('li').filter({ hasText: 'Certificado de vivienda' });
  await expect(housingCard).toBeVisible();
  await expect(
    housingCard.getByText(/no necesitamos una coincidencia en ex[oó]gena/i),
  ).toBeVisible();

  // 8-9. Cargar un segundo certificado de vivienda SIN intereses
  // detectables: debe existir una vía de captura manual guiada (nunca
  // inventa el monto ni desaparece silenciosamente).
  await selectView(page, 'Documentos');
  await page.setInputFiles('#case-document-file', housingWithoutInterestPath);
  await page.getByLabel('Tipo documental').selectOption('housing_interest_certificate');
  await page.getByLabel(/C.mo conservar el documento/).selectOption('store_locally');
  await page.getByRole('button', { name: 'Registrar y analizar' }).click();
  await expect(page).toHaveURL(/\/organizacion\/revision-documental$/);
  await selectView(page, 'Pendientes');
  await expect(
    page.getByText('Registrar intereses de vivienda pagados').first(),
  ).toBeVisible();

  // 10. Recargar la página y comprobar persistencia: la coincidencia
  // clara sigue confirmada (ya no aparece pendiente) y la tarea de
  // vivienda sin intereses sigue presente.
  await page.reload();
  await selectView(page, 'Pendientes');
  await expect(
    page.getByText('Registrar intereses de vivienda pagados').first(),
  ).toBeVisible();
  await selectView(page, 'Revisión de extracción');
  await expect(
    page.locator('li').filter({ hasText: 'Rendimientos financieros legitimos' }),
  ).toHaveCount(0);
});
