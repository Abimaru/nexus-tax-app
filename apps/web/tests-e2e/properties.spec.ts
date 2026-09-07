import { test, expect } from '@playwright/test';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as XLSX from 'xlsx';

/**
 * E2E de inmuebles, renta inmobiliaria y administración de propiedad
 * horizontal (Sprint 2.4, Fase G). Usa un Excel sintético mínimo para
 * desbloquear la etapa Declaración. Principio cubierto: la sola propiedad
 * de un inmueble no sugiere ningún gasto deducible (§2 del prompt de
 * Fase G) hasta que exista uso, período e ingreso compatibles.
 */
function makeSampleFile(alias: string): string {
  const wb = XLSX.utils.book_new();
  const data = XLSX.utils.aoa_to_sheet([
    ['Información exógena - MUESTRA'],
    [null, null, null, null, null, null, 'Fecha Reporte:', '2025-01-15'],
    ['Fecha corte del proceso:', null, '2025-01-10'],
    ['Año al que se refiere la consulta:', null, 2025],
    ['Identificación del consultante'],
    ['Tipo de documento:', null, 'CC'],
    ['Identificación:', null, '1.234.567.890'],
    ['Nombres / Razón social:', null, alias],
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
      'Empresa Empleadora SAS',
      '1234567890',
      alias,
      'Salarios',
      60_000_000,
      'R32 Ingresos laborales',
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
  const dir = mkdtempSync(join(tmpdir(), 'nexustax-properties-'));
  const file = join(dir, 'exogena-sintetica.xlsx');
  writeFileSync(file, XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
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

async function createCaseAndOpenInmuebles(page: import('@playwright/test').Page, alias: string) {
  const samplePath = makeSampleFile(alias);
  await page.goto('/');
  await page.getByRole('link', { name: 'Crear expediente' }).first().click();
  await page.getByLabel('Nombre o alias').fill(alias);
  await page.getByRole('button', { name: 'Crear expediente' }).click();
  await expect(page).toHaveURL(/\/fuente\/cargar$/);
  await page.setInputFiles('#exogenous-file-input', samplePath);
  await expect(page).toHaveURL(/\/extraccion\/inspeccion$/);
  await page.getByRole('button', { name: 'Reporte' }).click();
  await page.getByRole('button', { name: /Procesar información/ }).click();
  await expect(page).toHaveURL(/\/organizacion\/resumen$/, { timeout: 20_000 });

  await selectStage(page, 'Declaración');
  await selectView(page, 'Inmuebles');
  await expect(page.getByRole('heading', { name: 'Inmuebles', exact: true })).toBeVisible();
}

test('inmuebles: arrendado con período, ingreso y soporte se sugiere y confirma como gasto candidato', async ({
  page,
}, testInfo) => {
  await createCaseAndOpenInmuebles(page, 'Persona Sintética Inmuebles E2E');
  await expect(page.getByText('No has registrado inmuebles')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('properties-listado-vacio.png'), fullPage: true });

  await page.getByRole('button', { name: 'Agregar inmueble' }).first().click();
  await page
    .getByLabel(/Nombre \/ referencia/)
    .fill('Apartamento arrendado E2E');
  await page.getByLabel(/Qué hiciste con este inmueble/).selectOption('rented');
  await page.getByRole('button', { name: 'Guardar inmueble' }).click();
  await expect(page.getByText('Apartamento arrendado E2E')).toBeVisible();
  await expect(page.getByText('Arrendado', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Gestionar' }).click();

  // Sin período, un gasto candidato quedaría en "Falta contexto" — se
  // registra el período antes de agregar el gasto (§4/§13).
  await page.getByRole('button', { name: 'Agregar período' }).click();
  await page.getByLabel('Desde').fill('2025-01-01');
  await page.getByLabel('Hasta').fill('2025-12-31');
  await page.getByRole('button', { name: 'Guardar período' }).click();
  await expect(page.getByText(/2025-01-01 a 2025-12-31/)).toBeVisible();

  await page.getByRole('button', { name: 'Vincular ingreso' }).click();
  await page.getByLabel('Valor (COP)').fill('12000000');
  await page.getByRole('button', { name: 'Guardar ingreso' }).click();
  await expect(page.getByText('$ 12.000.000').first()).toBeVisible();

  await page.getByRole('button', { name: 'Agregar gasto' }).click();
  await page.getByLabel('Valor (COP)').fill('300000');
  await page.getByLabel('Estado del soporte').selectOption('sufficient');
  await page.getByLabel('Cuenta de cobro').check();
  await page.getByRole('button', { name: 'Guardar gasto' }).click();

  await expect(page.getByText('Potencialmente deducible')).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath('properties-gasto-potencialmente-deducible.png'),
    fullPage: true,
  });

  await page.getByRole('button', { name: 'Confirmar' }).click();
  await expect(page.getByText('Confirmado por el analista')).toBeVisible();

  await page.getByRole('button', { name: 'Modo avanzado' }).click();
  await expect(page.getByText(/Impacto preliminar confirmado/)).toBeVisible();
  await expect(page.getByText(/300\.000/).first()).toBeVisible();
  await page.getByRole('button', { name: 'Modo normal' }).click();

  // Quality gate — móvil 390 px, sin overflow horizontal.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(200);
  await page.screenshot({ path: testInfo.outputPath('properties-mobile-390.png'), fullPage: true });
  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(hasHorizontalOverflow).toBe(false);
  await page.setViewportSize({ width: 1280, height: 900 });

  // Persistencia tras recargar.
  await page.reload();
  await selectView(page, 'Inmuebles');
  await expect(page.getByText('Apartamento arrendado E2E')).toBeVisible();
  await page.getByRole('button', { name: 'Gestionar' }).click();
  await expect(page.getByText('Potencialmente deducible')).toBeVisible();
  await expect(page.getByText('Confirmado por el analista')).toBeVisible();
});

test('inmuebles: vivienda personal con administración nunca sugiere un gasto deducible', async ({
  page,
}) => {
  await createCaseAndOpenInmuebles(page, 'Persona Sintética Vivienda E2E');

  await page.getByRole('button', { name: 'Agregar inmueble' }).first().click();
  await page.getByLabel(/Nombre \/ referencia/).fill('Apartamento donde vivo E2E');
  await page.getByLabel(/Qué hiciste con este inmueble/).selectOption('personal_residence');
  await page.getByRole('button', { name: 'Guardar inmueble' }).click();
  await expect(page.getByText('Apartamento donde vivo E2E')).toBeVisible();

  await page.getByRole('button', { name: 'Gestionar' }).click();
  await page.getByRole('button', { name: 'Agregar gasto' }).click();
  await page.getByLabel('Valor (COP)').fill('350000');
  await page.getByLabel('Estado del soporte').selectOption('sufficient');
  await page.getByLabel('Cuenta de cobro').check();
  await page.getByRole('button', { name: 'Guardar gasto' }).click();

  await expect(page.getByText('No aplica')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Confirmar' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Descartar' })).toHaveCount(0);
});
