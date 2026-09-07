import { test, expect } from '@playwright/test';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as XLSX from 'xlsx';

/**
 * E2E de salud complementaria y medicina prepagada (Sprint 2.4, Fase H).
 * Usa un Excel sintético mínimo para desbloquear la etapa Declaración.
 * Principio cubierto: el límite del art. 387 ET es MENSUAL y agregado
 * para el contribuyente (16 UVT) — el escenario registra un mes bajo el
 * tope y otro que lo supera.
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
  const dir = mkdtempSync(join(tmpdir(), 'nexustax-health-'));
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

test('salud complementaria: dos meses, uno supera el tope, se explica y confirma', async ({
  page,
}, testInfo) => {
  const samplePath = makeSampleFile('Persona Sintética Salud E2E');

  await page.goto('/');
  await page.getByRole('link', { name: 'Crear expediente' }).first().click();
  await page.getByLabel('Nombre o alias').fill('Persona Sintética Salud E2E');
  await page.getByRole('button', { name: 'Crear expediente' }).click();
  await expect(page).toHaveURL(/\/fuente\/cargar$/);
  await page.setInputFiles('#exogenous-file-input', samplePath);
  await expect(page).toHaveURL(/\/extraccion\/inspeccion$/);
  await page.getByRole('button', { name: 'Reporte' }).click();
  await page.getByRole('button', { name: /Procesar información/ }).click();
  await expect(page).toHaveURL(/\/organizacion\/resumen$/, { timeout: 20_000 });

  await selectStage(page, 'Declaración');
  await selectView(page, 'Salud complementaria');
  await expect(page.getByRole('heading', { name: 'Salud complementaria', exact: true })).toBeVisible();
  await expect(page.getByText('No has registrado pagos de salud complementaria')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('health-listado-vacio.png'), fullPage: true });

  // Pago 1: enero, bajo el tope.
  await page.getByRole('button', { name: 'Agregar pago' }).first().click();
  await page.getByLabel(/Proveedor/).fill('Medicina Prepagada Sintética E2E');
  await page.getByLabel(/Quién estaba cubierto/).selectOption('taxpayer');
  await page.getByLabel('Valor pagado (COP)').fill('300000');
  await page.getByLabel('Estado del soporte').selectOption('sufficient');
  await page.getByLabel('Certificado de medicina prepagada').check();
  await page.getByRole('button', { name: 'Guardar pago' }).click();
  await expect(page.getByText('Medicina Prepagada Sintética E2E')).toBeVisible();
  await expect(page.getByText('Elegible', { exact: true })).toBeVisible();

  // Pago 2: febrero, supera el tope mensual de 16 UVT (~$796.784).
  await page.getByRole('button', { name: 'Agregar pago' }).first().click();
  await page.getByLabel(/Proveedor/).fill('Medicina Prepagada Sintética E2E');
  await page.getByLabel(/Quién estaba cubierto/).selectOption('taxpayer');
  await page
    .getByLabel('Mes del pago')
    .selectOption('2');
  await page.getByLabel('Valor pagado (COP)').fill('1200000');
  await page.getByLabel('Estado del soporte').selectOption('sufficient');
  await page.getByLabel('Certificado de medicina prepagada').check();
  await page.getByRole('button', { name: 'Guardar pago' }).click();

  await expect(page.getByText('Tope mensual aplicado')).toBeVisible();
  await expect(page.getByText(/tope mensual de 16 UVT aplicado/)).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath('health-tope-aplicado.png'),
    fullPage: true,
  });

  // Modo avanzado: explica el cálculo mes a mes sin lenguaje contable complejo.
  await page.getByRole('button', { name: 'Modo avanzado' }).click();
  await expect(page.getByText('Tope mensual por mes (16 UVT)')).toBeVisible();
  await expect(page.getByText('Máximo aplicable: $ 796.784 por mes.')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('health-modo-avanzado.png'), fullPage: true });
  await page.getByRole('button', { name: 'Modo normal' }).click();

  // Confirmar el primer pago (bajo el tope, mes de enero).
  const eligibleCard = page.locator('div.p-5', { hasText: 'Elegible' }).first();
  await eligibleCard.getByRole('button', { name: 'Confirmar' }).click();
  await expect(page.getByText('Confirmado por el analista').first()).toBeVisible();

  // Quality gate — móvil 390 px, sin overflow horizontal.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(200);
  await page.screenshot({ path: testInfo.outputPath('health-mobile-390.png'), fullPage: true });
  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(hasHorizontalOverflow).toBe(false);
  await page.setViewportSize({ width: 1280, height: 900 });

  // Persistencia tras recargar.
  await page.reload();
  await selectView(page, 'Salud complementaria');
  await expect(page.getByText('Medicina Prepagada Sintética E2E').first()).toBeVisible();
  await expect(page.getByText('Tope mensual aplicado')).toBeVisible();
});

test('salud complementaria: dependiente sin vincular queda en revisión de beneficiario', async ({
  page,
}) => {
  const samplePath = makeSampleFile('Persona Sintética Salud Dependiente E2E');

  await page.goto('/');
  await page.getByRole('link', { name: 'Crear expediente' }).first().click();
  await page.getByLabel('Nombre o alias').fill('Persona Sintética Salud Dependiente E2E');
  await page.getByRole('button', { name: 'Crear expediente' }).click();
  await expect(page).toHaveURL(/\/fuente\/cargar$/);
  await page.setInputFiles('#exogenous-file-input', samplePath);
  await expect(page).toHaveURL(/\/extraccion\/inspeccion$/);
  await page.getByRole('button', { name: 'Reporte' }).click();
  await page.getByRole('button', { name: /Procesar información/ }).click();
  await expect(page).toHaveURL(/\/organizacion\/resumen$/, { timeout: 20_000 });

  await selectStage(page, 'Declaración');
  await selectView(page, 'Salud complementaria');

  await page.getByRole('button', { name: 'Agregar pago' }).first().click();
  await page.getByLabel(/Proveedor/).fill('Medicina Prepagada Sintética E2E');
  await page.getByLabel(/Quién estaba cubierto/).selectOption('dependent');
  await expect(page.getByText('No tienes dependientes registrados')).toBeVisible();
  await page.getByLabel('Valor pagado (COP)').fill('200000');
  await page.getByLabel('Estado del soporte').selectOption('sufficient');
  await page.getByRole('button', { name: 'Guardar pago' }).click();

  await expect(page.getByText('Falta definir beneficiario')).toBeVisible();
});
