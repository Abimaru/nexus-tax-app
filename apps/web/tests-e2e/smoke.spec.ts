import { test, expect } from '@playwright/test';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as XLSX from 'xlsx';

/**
 * Smoke test del flujo completo (§18): crear expediente → cargar Excel →
 * inspeccionar → procesar → ver resumen. Usa un archivo SINTÉTICO temporal.
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
    [null, null, null, null, 'Consumos con tarjeta', 100],
    [null, null, null, null, 'Compras', 100],
    [null, null, null, null, 'Consignaciones', 100],
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
      '1 234 567 890',
      'Persona Sintética E2E',
      'Salarios',
      48_000_000,
      'R32 Ingresos laborales',
    ],
    [
      '901555666',
      'Proveedor Factura Electronica SAS',
      '1234567890',
      'Persona Sintetica E2E',
      'Total neto facturacion electronica',
      100,
      null,
    ],
    [
      '901555666',
      'Proveedor Factura Electronica SAS',
      '1234567890',
      'Persona Sintetica E2E',
      'Facturacion electronica susceptible beneficio 1%',
      20,
      null,
    ],
    [
      '901777888',
      'Entidad Referencia SAS',
      '1234567890',
      'Persona Sintetica E2E',
      'Referencia generica por revisar',
      50,
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
  const dir = mkdtempSync(join(tmpdir(), 'nexustax-'));
  const file = join(dir, 'exogena-sintetica.xlsx');
  writeFileSync(file, XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
  return file;
}

function makeSupportFile(): string {
  const dir = mkdtempSync(join(tmpdir(), 'nexustax-support-'));
  const file = join(dir, 'certificado-sintetico.pdf');
  writeFileSync(file, Buffer.from('%PDF-1.4 soporte exclusivamente sintetico'));
  return file;
}

test('flujo completo: crear expediente, cargar, procesar y ver resumen', async ({ page }) => {
  const samplePath = makeSampleFile();
  const supportPath = makeSupportFile();

  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

  await page.getByRole('link', { name: 'Crear expediente' }).first().click();
  await page.getByLabel('Nombre o alias').fill('Expediente de prueba E2E');
  await page.getByRole('button', { name: 'Crear expediente' }).click();

  // Ya en la pantalla del expediente, pestaña Cargar.
  await expect(page.getByRole('button', { name: /Cargar ex.gena/ })).toBeVisible();
  await page.getByRole('button', { name: /Cargar ex.gena/ }).click();
  await page.setInputFiles('input[type="file"]', samplePath);

  // Avanza a Inspección; selecciona la hoja de datos.
  await page.getByRole('button', { name: 'Reporte' }).click();
  await page.getByRole('button', { name: /Procesar información/ }).click();

  // Resumen visible con métricas y gráficas.
  await expect(page.getByText('Registros').first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('heading', { name: 'Valores reportados por entidad' })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Calidad del an.lisis/ })).toBeVisible();
  await expect(page.getByText('Persona Sintética E2E').first()).toBeVisible();
  await expect(page.getByText('Suma bruta no consolidada')).toBeVisible();
  await expect(page.getByText('1234567890', { exact: true })).toHaveCount(0);

  await page
    .getByRole('navigation', { name: 'Secciones del expediente' })
    .getByRole('button', { name: 'Requisitos', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Ingresos laborales y empleadores' }),
  ).toBeVisible();
  await expect(page.getByLabel('Nombre del empleador')).toHaveValue('Empresa Empleadora SAS');
  await expect(page.getByRole('heading', { name: /Formulario 220/ })).toHaveCount(0);
  await page.getByRole('button', { name: /Agregar otro empleador/ }).click();
  await expect(page.getByRole('heading', { name: 'Empleador 2' })).toBeVisible();
  await page.reload();
  await page
    .getByRole('navigation', { name: 'Secciones del expediente' })
    .getByRole('button', { name: 'Requisitos', exact: true })
    .click();
  await expect(page.getByRole('heading', { name: 'Empleador 2' })).toBeVisible();

  await page
    .getByRole('navigation', { name: 'Secciones del expediente' })
    .getByRole('button', { name: 'Matriz', exact: true })
    .click();
  await expect(page.getByRole('heading', { name: 'Matriz tributaria preliminar' })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Facturaci.n electr.nica DIAN/ })).toBeVisible();
  await expect(page.getByText('Beneficio preliminar 1 %')).toBeVisible();

  await page
    .getByRole('navigation', { name: 'Secciones del expediente' })
    .getByRole('button', { name: 'Hallazgos', exact: true })
    .click();
  const unresolved = page.locator('li').filter({ hasText: 'unclassified_tax_record' }).first();
  await unresolved.getByRole('button', { name: 'Ver registro afectado' }).click();
  await expect(page.getByRole('dialog', { name: /Resolver clasificaci.n/ })).toBeVisible();
  await page
    .getByLabel(/Justificaci.n/)
    .fill('Revision sintetica E2E: se conserva solo como dato informativo.');
  await page.getByRole('button', { name: 'Marcar informativo' }).click();
  await expect(page.getByText(/Resuelto: analyst modified/).first()).toBeVisible();
  await page.getByRole('button', { name: /Cerrar panel de resoluci.n/ }).click();

  await page.reload();
  await page
    .getByRole('navigation', { name: 'Secciones del expediente' })
    .getByRole('button', { name: 'Hallazgos', exact: true })
    .click();
  await expect(page.getByText(/Resuelto: analyst modified/).first()).toBeVisible();

  await page.getByRole('button', { name: /Obligación/ }).click();
  await expect(page.getByRole('heading', { name: 'Obligación de declarar' })).toBeVisible();
  await page.getByLabel('Responsabilidad de IVA al cierre de 2025').selectOption('false');
  await expect(page.getByText('No se detectan criterios que activen la obligación')).toBeVisible();
  await expect(page.getByText(/19 de octubre de 2026/)).toBeVisible();
  await expect(page.getByText(/co-renta-pn-2025\.1\.0\.0/)).toBeVisible();

  await page
    .getByRole('navigation', { name: 'Secciones del expediente' })
    .getByRole('button', { name: 'Documentos', exact: true })
    .click();
  await page.setInputFiles('#case-document-file', supportPath);
  await page.getByLabel(/Decisi.n de persistencia/).selectOption('store_locally');
  await page.locator('input[type="checkbox"]').first().check();
  await page.getByRole('button', { name: 'Registrar documento' }).click();
  await expect(page.getByRole('heading', { name: 'certificado-sintetico.pdf' })).toBeVisible();

  await page
    .getByRole('navigation', { name: 'Secciones del expediente' })
    .getByRole('button', { name: 'Hechos', exact: true })
    .click();
  await page.getByLabel('Concepto original').fill('Saldo cuenta bancaria certificado');
  await page.getByLabel('Valor documental').fill('1250000');
  await page.getByLabel(/Categor.a normalizada/).selectOption('asset');
  await page.getByLabel(/^Naturaleza/).selectOption('asset');
  await page.getByLabel(/^Tratamiento/).selectOption('add_to_assets');
  await page.getByRole('button', { name: 'Guardar hecho' }).click();
  await expect(page.getByText('Saldo cuenta bancaria certificado')).toBeVisible();

  await page.reload();
  await page
    .getByRole('navigation', { name: 'Secciones del expediente' })
    .getByRole('button', { name: 'Documentos', exact: true })
    .click();
  await expect(page.getByRole('heading', { name: 'certificado-sintetico.pdf' })).toBeVisible();
  await page
    .getByRole('navigation', { name: 'Secciones del expediente' })
    .getByRole('button', { name: 'Hechos', exact: true })
    .click();
  await expect(page.getByText('Saldo cuenta bancaria certificado')).toBeVisible();
});
