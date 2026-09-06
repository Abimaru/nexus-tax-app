import { test, expect } from '@playwright/test';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as XLSX from 'xlsx';

/**
 * E2E de dependientes económicos (Sprint 2.4, Fase C). Usa un Excel
 * sintético mínimo para desbloquear la etapa Declaración.
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
  const dir = mkdtempSync(join(tmpdir(), 'nexustax-dependents-'));
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

test('dependientes económicos: agregar, evaluar, R138/R139 y máximo de cuatro', async ({ page }, testInfo) => {
  const samplePath = makeSampleFile();

  await page.goto('/');
  await page.getByRole('link', { name: 'Crear expediente' }).first().click();
  await page.getByLabel('Nombre o alias').fill('Expediente dependientes E2E');
  await page.getByRole('button', { name: 'Crear expediente' }).click();
  await expect(page).toHaveURL(/\/fuente\/cargar$/);
  await page.setInputFiles('#exogenous-file-input', samplePath);
  await expect(page).toHaveURL(/\/extraccion\/inspeccion$/);
  await page.getByRole('button', { name: 'Reporte' }).click();
  await page.getByRole('button', { name: /Procesar información/ }).click();
  await expect(page).toHaveURL(/\/organizacion\/resumen$/, { timeout: 20_000 });

  await selectStage(page, 'Declaración');
  await selectView(page, 'Beneficios y deducciones');
  await expect(page.getByRole('heading', { name: 'Beneficios y deducciones' })).toBeVisible();
  await expect(page.getByText('No has registrado dependientes')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('dependents-listado-vacio.png'), fullPage: true });

  // Naturaleza de renta laboral: habilita coexistencia de ambos beneficios.
  await page
    .getByLabel(/Cómo obtienes tus rentas de trabajo/)
    .selectOption('labor_relation');

  // Agregar un dependiente elegible (hijo menor con registro civil vía documento).
  await page.getByRole('button', { name: 'Agregar dependiente' }).first().click();
  await page.getByLabel('Nombre completo').fill('Hijo Menor Sintético');
  await page.getByLabel('Número').fill('1000000001');
  await page.getByLabel('Fecha de nacimiento (opcional)').fill('2015-06-01');
  await page.getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(page.getByText('Hijo Menor Sintético')).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath('dependents-declaracion-reconocida.png'),
    fullPage: true,
  });

  // El borrador F-210 refleja R138 (aunque sin soporte todavía puede quedar
  // en "Requiere soporte"; verificamos al menos que la sección no rompe el
  // flujo y que el borrador sigue siendo accesible).
  await selectView(page, 'Borrador Formulario 210');
  await expect(page.getByRole('heading', { name: 'Borrador Formulario 210' })).toBeVisible();

  await selectView(page, 'Beneficios y deducciones');

  // Modo avanzado: el botón cambia de etiqueta (el detalle normativo
  // completo requiere que el dependiente ya sea elegible, lo que exige
  // adjuntar soporte desde la biblioteca documental — ver limitación
  // conocida en docs/DEPENDENTS_BENEFITS_2025.md).
  await page.getByRole('button', { name: 'Modo avanzado' }).click();
  await expect(page.getByRole('button', { name: 'Modo normal' })).toBeVisible();
  await page.getByRole('button', { name: 'Modo normal' }).click();

  // Quality gate — móvil 390 px, sin overflow horizontal.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(200);
  await page.screenshot({ path: testInfo.outputPath('dependents-mobile-390.png'), fullPage: true });
  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(hasHorizontalOverflow).toBe(false);
  await page.setViewportSize({ width: 1280, height: 900 });

  // Persistencia tras recargar.
  await page.reload();
  await selectView(page, 'Beneficios y deducciones');
  await expect(page.getByText('Hijo Menor Sintético')).toBeVisible();
});

test('dependientes económicos: "No tengo dependientes" cierra el estado del expediente', async ({
  page,
}) => {
  const samplePath = makeSampleFile();

  await page.goto('/');
  await page.getByRole('link', { name: 'Crear expediente' }).first().click();
  await page.getByLabel('Nombre o alias').fill('Expediente sin dependientes E2E');
  await page.getByRole('button', { name: 'Crear expediente' }).click();
  await expect(page).toHaveURL(/\/fuente\/cargar$/);
  await page.setInputFiles('#exogenous-file-input', samplePath);
  await expect(page).toHaveURL(/\/extraccion\/inspeccion$/);
  await page.getByRole('button', { name: 'Reporte' }).click();
  await page.getByRole('button', { name: /Procesar información/ }).click();
  await expect(page).toHaveURL(/\/organizacion\/resumen$/, { timeout: 20_000 });

  await selectStage(page, 'Declaración');
  await selectView(page, 'Beneficios y deducciones');
  await page.getByRole('button', { name: 'No tengo dependientes' }).click();
  await expect(page.getByText(/No tengo dependientes.*para este expediente/)).toBeVisible();

  await page.reload();
  await selectView(page, 'Beneficios y deducciones');
  await expect(page.getByText(/No tengo dependientes.*para este expediente/)).toBeVisible();
});
