import { test, expect } from '@playwright/test';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as XLSX from 'xlsx';

/**
 * E2E de facturación electrónica (Sprint 2.4, Fase D). Usa un Excel sintético
 * mínimo de exógena para desbloquear la etapa Declaración y un reporte DIAN
 * de facturación electrónica sintético (con metadatos, encabezado tardío y
 * CUFE) para ejercer el flujo completo de carga → conciliación → decisión →
 * impacto en el Formulario 210.
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
      'Empresa Empleadora SAS',
      '1234567890',
      'Persona Sintética E2E',
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
  const dir = mkdtempSync(join(tmpdir(), 'nexustax-electronic-invoicing-'));
  const file = join(dir, 'exogena-sintetica.xlsx');
  writeFileSync(file, XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
  return file;
}

const FE_HEADER_ROW = [
  'Identificación Emisor Factura',
  'Nombre Emisor Factura',
  'Fecha Emisión',
  'Num_factura_venta',
  'Valor Facturado',
  'Valor Notas Crédito',
  'Valor Notas Débito',
  'Valor Factura / Afectada con Notas Débito - Crédito',
  'Valor Susceptible Beneficio',
  'Medios De Pago',
  'CUFE',
];

function makeElectronicInvoiceFile(): string {
  const metadata: (string | number | null)[][] = [
    ['Reporte de facturas electrónicas - MUESTRA SINTÉTICA'],
    ['Dirección de Impuestos y Aduanas Nacionales'],
    ['Este reporte es orientativo. Datos exclusivamente sintéticos.'],
    [],
  ];
  while (metadata.length < 21) metadata.push([]);

  const cufe1 = 'a'.repeat(96);
  const cufe2 = 'b'.repeat(96);
  const rows: (string | number | null)[][] = [
    [
      '900111222',
      'Proveedor Sintético Uno SAS',
      '2025-02-10',
      'FES-0001',
      '1.500.000',
      '0',
      '0',
      '1.500.000',
      '1.500.000',
      'Tarjeta débito o crédito',
      cufe1,
    ],
    [
      '900333444',
      'Proveedor Sintético Dos SAS',
      '2025-03-05',
      'FES-0002',
      '2.000.000',
      '0',
      '0',
      '2.000.000',
      '2.000.000',
      'Efectivo',
      cufe2,
    ],
  ];
  const sheet: (string | number | null)[][] = [...metadata, FE_HEADER_ROW, ...rows];
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(sheet);
  XLSX.utils.book_append_sheet(wb, ws, 'Facturas');
  const dir = mkdtempSync(join(tmpdir(), 'nexustax-electronic-invoicing-'));
  const file = join(dir, 'facturas-electronicas.xlsx');
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

test('facturación electrónica: cargar, conciliar, decidir y verificar impacto en el F-210', async ({
  page,
}, testInfo) => {
  const exogenousPath = makeExogenousFile();
  const invoicePath = makeElectronicInvoiceFile();

  // 1. Expediente.
  await page.goto('/');
  await page.getByRole('link', { name: 'Crear expediente' }).first().click();
  await page.getByLabel('Nombre o alias').fill('Expediente FE E2E');
  await page.getByRole('button', { name: 'Crear expediente' }).click();
  await expect(page).toHaveURL(/\/fuente\/cargar$/);
  await page.setInputFiles('#exogenous-file-input', exogenousPath);
  await expect(page).toHaveURL(/\/extraccion\/inspeccion$/);
  await page.getByRole('button', { name: 'Reporte' }).click();
  await page.getByRole('button', { name: /Procesar información/ }).click();
  await expect(page).toHaveURL(/\/organizacion\/resumen$/, { timeout: 20_000 });

  // 2. Abrir Facturación electrónica.
  await selectStage(page, 'Declaración');
  await selectView(page, 'Facturación electrónica');
  await expect(page.getByRole('heading', { name: 'Facturación electrónica' })).toBeVisible();
  await expect(page.getByText('No cargado')).toBeVisible();

  // 3-5. Cargar XLSX sintético, detectar formato y procesar.
  await page.setInputFiles('#electronic-invoice-report-upload', invoicePath);
  await page.getByRole('button', { name: 'Procesar reporte' }).click();
  await expect(page.getByText('facturas-electronicas.xlsx')).toBeVisible({ timeout: 10_000 });
  await page.screenshot({
    path: testInfo.outputPath('electronic-invoicing-procesado.png'),
    fullPage: true,
  });

  // 6. Ver total de facturas.
  const summaryPanel = page.getByRole('heading', { name: 'Resumen' }).locator('..');
  await expect(summaryPanel.getByText('Facturas')).toBeVisible();
  await expect(summaryPanel.getByText('2', { exact: true })).toBeVisible();

  // 7-8. Revisar una factura y ver el CUFE enmascarado (nunca completo en modo normal).
  // La tabla (escritorio) y las tarjetas (móvil) coexisten en el DOM — se
  // alternan por CSS según el viewport — por eso se escoge explícitamente
  // la tabla en este viewport de escritorio.
  await page.getByRole('table').getByRole('cell', { name: 'FES-0001' }).click();
  await expect(page.getByText('CUFE (completo, solo modo avanzado)').first()).toBeVisible();
  const rawCufeShown = await page.getByText(/^a{90,}$/).count();
  expect(rawCufeShown).toBeGreaterThan(0);

  // 9-10. Conciliar contra Tope 5: sin un valor de Tope 5 explícito en la
  // exógena sintética, el estado esperado es "Falta la exógena".
  await expect(page.getByText(/Falta la exógena|Sin evaluar/).first()).toBeVisible();

  // 11. Excluir la factura por costo/gasto (doble beneficio).
  await page.getByRole('table').getByRole('button', { name: 'Usada como costo/gasto' }).click();
  await expect(page.getByText('Motivo registrado:').first()).toBeVisible();

  // 12-13. Verificar nueva base y deducción 1 % (solo la segunda factura,
  // 2.000.000, queda elegible → 1 % = 20.000).
  await expect(page.getByText('$ 20.000').first()).toBeVisible();

  // 14. Verificar Form 210.
  await selectView(page, 'Borrador Formulario 210');
  await expect(page.getByRole('heading', { name: 'Borrador Formulario 210' })).toBeVisible();
  await selectView(page, 'Facturación electrónica');

  // 15-16. Recargar y verificar persistencia.
  await page.reload();
  await selectView(page, 'Facturación electrónica');
  await expect(page.getByText('facturas-electronicas.xlsx')).toBeVisible();
  await expect(page.getByText('$ 20.000').first()).toBeVisible();

  // 17-18. Revisar y resolver la tarea de conciliación pendiente desde
  // Revisión final (deep-link exacto). Las tareas no bloqueantes viven en
  // un <details> colapsado por defecto: se abren todos los grupos primero.
  await selectView(page, 'Revisión final');
  await expect(page.getByRole('heading', { name: '¿Qué me falta?' })).toBeVisible();
  const summaries = page.locator('details summary');
  const summaryCount = await summaries.count();
  for (let index = 0; index < summaryCount; index += 1) {
    const details = summaries.nth(index).locator('..');
    if (!(await details.evaluate((element) => (element as HTMLDetailsElement).open))) {
      await summaries.nth(index).click();
    }
  }
  const pendingSection = page.getByRole('heading', { name: '¿Qué me falta?' }).locator('..');
  await expect(pendingSection.getByText(/facturación electrónica/i).first()).toBeVisible();

  // 19. Verificar el cierre: "No usaré deducción" también queda disponible
  // y es reversible (cierre alternativo del flujo).
  await selectView(page, 'Facturación electrónica');
  await page
    .getByRole('button', { name: 'No usaré deducción por facturación electrónica' })
    .click();
  await expect(page.getByText(/No se aplicará la deducción del 1 %/)).toBeVisible();

  // Mobile 390px, sin overflow horizontal.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(200);
  await page.screenshot({
    path: testInfo.outputPath('electronic-invoicing-mobile-390.png'),
    fullPage: true,
  });
  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(hasHorizontalOverflow).toBe(false);
});

test('facturación electrónica: archivo no reconocido no crea un reporte', async ({ page }) => {
  const exogenousPath = makeExogenousFile();

  const dir = mkdtempSync(join(tmpdir(), 'nexustax-electronic-invoicing-'));
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ['Columna A', 'Columna B'],
    ['dato', 123],
  ]);
  XLSX.utils.book_append_sheet(wb, ws, 'Hoja1');
  const otherPath = join(dir, 'otro-archivo.xlsx');
  writeFileSync(otherPath, XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));

  await page.goto('/');
  await page.getByRole('link', { name: 'Crear expediente' }).first().click();
  await page.getByLabel('Nombre o alias').fill('Expediente FE no reconocido E2E');
  await page.getByRole('button', { name: 'Crear expediente' }).click();
  await expect(page).toHaveURL(/\/fuente\/cargar$/);
  await page.setInputFiles('#exogenous-file-input', exogenousPath);
  await expect(page).toHaveURL(/\/extraccion\/inspeccion$/);
  await page.getByRole('button', { name: 'Reporte' }).click();
  await page.getByRole('button', { name: /Procesar información/ }).click();
  await expect(page).toHaveURL(/\/organizacion\/resumen$/, { timeout: 20_000 });

  await selectStage(page, 'Declaración');
  await selectView(page, 'Facturación electrónica');
  await page.setInputFiles('#electronic-invoice-report-upload', otherPath);
  await page.getByRole('button', { name: 'Procesar reporte' }).click();
  await expect(page.getByText(/no se reconoció como reporte DIAN/)).toBeVisible();
  await expect(page.getByText('No cargado')).toBeVisible();
});
