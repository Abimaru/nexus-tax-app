import { test, expect } from '@playwright/test';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as XLSX from 'xlsx';

/**
 * E2E de Evidence Matching & Guided Reconciliation (Sprint 2.4, Fase E /
 * E.1). Cubre el escenario mínimo descrito en el cierre de fase:
 *
 * 1-4. crear expediente, importar exógena sintética, cargar un PDF
 *      financiero sintético con ruido (NIT/cuenta/resolución/año/%) y
 *      valores monetarios reales, esperar el análisis documental;
 * 5-8. comprobar el resumen de la revisión guiada y que NIT, número de
 *      cuenta, resolución y año no aparecen como candidatos monetarios
 *      principales (siguen disponibles como evidencia en modo avanzado);
 * 9-11. comprobar coincidencia exacta, coincidencia por redondeo (§11:
 *      "Coincide por redondeo al peso", nunca "valor cercano") y
 *      confirmación en bloque segura;
 * 12-13. abrir una ambigüedad (dos registros exógenos empatan para un
 *      mismo valor documental) y elegir el correcto;
 * 14-16. resolver una expectativa sin documento mediante captura manual
 *      guiada, y comprobar la conciliación resultante;
 * 17-18. confirmar que exact/rounding entran en confirmación masiva y que
 *      ambiguous no, y que no existe doble conteo (una única conciliación
 *      por valor confirmado);
 * 19-20. recargar la página, comprobar persistencia, y verificar
 *      trazabilidad básica en modo avanzado.
 *
 * Todos los datos son sintéticos; ningún documento ni cifra es real.
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
      'Entidad Sintetica Evidencia E2E',
      '1234567890',
      'Persona Sintética E2E',
      'Saldo cuenta bancaria A',
      1_250_000,
      null,
    ],
    [
      '900111222',
      'Entidad Sintetica Evidencia E2E',
      '1234567890',
      'Persona Sintética E2E',
      'Rendimientos financieros B',
      3_241_487,
      null,
    ],
    [
      '900111222',
      'Entidad Sintetica Evidencia E2E',
      '1234567890',
      'Persona Sintética E2E',
      'Retencion en la fuente C',
      226_904,
      null,
    ],
    [
      '900111222',
      'Entidad Sintetica Evidencia E2E',
      '1234567890',
      'Persona Sintética E2E',
      'Saldo de deuda registrada D',
      500_000,
      null,
    ],
    [
      '900111222',
      'Entidad Sintetica Evidencia E2E',
      '1234567890',
      'Persona Sintética E2E',
      'Saldo de deuda registrada E',
      500_000,
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
  const dir = mkdtempSync(join(tmpdir(), 'nexustax-evidence-xlsx-'));
  const file = join(dir, 'exogena-evidencia-sintetica.xlsx');
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

function makeFinancialPdfFile(): string {
  const dir = mkdtempSync(join(tmpdir(), 'nexustax-evidence-pdf-'));
  const file = join(dir, 'certificado-financiero-sintetico.pdf');
  writeFileSync(
    file,
    makeTextPdf([
      'CERTIFICADO TRIBUTARIO SINTETICO E2E',
      'Saldo al cierre NIT 900.123.456-7 sin valor asociado en esta linea',
      'Saldo al cierre Cuenta 1234567890 sin valor asociado en esta linea',
      'Saldo al cierre Resolucion 000042 de 2020 sin valor asociado',
      'Saldo al cierre correspondiente al ano gravable 2025',
      'Saldo al cierre: Participacion 50% del total',
      'Saldo al cierre: $ 1.250.000',
      'Rendimientos financieros: $ 3.241.486,57',
      'Saldo de deuda registrada: $ 500.000',
    ]),
  );
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

test('revisión guiada: promoción de evidencia, redondeo, ambigüedad y captura manual (Fase E.1)', async ({
  page,
}, testInfo) => {
  test.setTimeout(90_000);
  const exogenousPath = makeExogenousFile();
  const pdfPath = makeFinancialPdfFile();

  // 1. Iniciar expediente sintético.
  await page.goto('/');
  await page.getByRole('link', { name: 'Crear expediente' }).first().click();
  await page.getByLabel('Nombre o alias').fill('Expediente Fase E Evidence E2E');
  await page.getByRole('button', { name: 'Crear expediente' }).click();
  await expect(page).toHaveURL(/\/fuente\/cargar$/);

  // 2. Cargar/importar exógena sintética.
  await page.setInputFiles('#exogenous-file-input', exogenousPath);
  await expect(page).toHaveURL(/\/extraccion\/inspeccion$/);
  await page.getByRole('button', { name: 'Reporte' }).click();
  await page.getByRole('button', { name: /Procesar información/ }).click();
  await expect(page).toHaveURL(/\/organizacion\/resumen$/, { timeout: 20_000 });

  // 3. Cargar PDF financiero sintético (ruido + valores reales).
  await selectView(page, 'Documentos');
  await expect(page).toHaveURL(/\/organizacion\/documentos$/);
  await page.setInputFiles('#case-document-file', pdfPath);
  await page.getByLabel('Tipo documental').selectOption('consolidated_tax_certificate');
  await page.getByLabel(/C.mo conservar el documento/).selectOption('store_locally');
  await page.getByRole('button', { name: 'Registrar y analizar' }).click();

  // 4. Esperar análisis documental.
  await expect(page).toHaveURL(/\/organizacion\/revision-documental$/);

  // 5. Comprobar el resumen de la revisión guiada.
  await expect(page.getByRole('heading', { name: 'Revisión guiada' })).toBeVisible();
  await expect(page.getByText(/Encontramos \d+ valor/)).toBeVisible();

  // 6-8. NIT, cuenta, resolución y año no aparecen como candidatos
  // monetarios principales: en modo avanzado solo existen los 3
  // candidatos reales (A, B y el de la deuda ambigua D/E).
  await page.getByRole('button', { name: 'Ver otros datos detectados', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Revisión de extracción' })).toBeVisible();
  await expect(page.getByRole('article')).toHaveCount(3);
  await expect(page.locator('article').filter({ hasText: '900.123.456' })).toHaveCount(0);
  await expect(page.locator('article').filter({ hasText: '1234567890' })).toHaveCount(0);
  await expect(page.locator('article').filter({ hasText: '000042' })).toHaveCount(0);
  await expect(page.locator('article', { hasText: /^2025$/ })).toHaveCount(0);
  await expect(page.getByRole('article', { name: 'Saldo al cierre', exact: true })).toBeVisible();
  await expect(
    page.getByRole('article', { name: 'Rendimientos financieros', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('article', { name: 'Saldo de deuda registrada', exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath('evidence-review-avanzado-1280.png'),
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Ocultar modo avanzado' }).click();

  // 9. Comprobar coincidencia exacta.
  const cardA = page.locator('li').filter({ hasText: 'Saldo cuenta bancaria A' });
  await expect(cardA.getByText('Coincide exactamente')).toBeVisible();

  // 10. Comprobar coincidencia por redondeo (§11): nunca "valor cercano".
  const cardB = page.locator('li').filter({ hasText: 'Rendimientos financieros B' });
  await expect(cardB.getByText('Coincide por redondeo al peso')).toBeVisible();
  await expect(cardB.getByText(/valor cercano/i)).toHaveCount(0);

  // 12. Abrir una ambigüedad: dos registros exógenos empatan para el
  // mismo valor documental de "Saldo de deuda registrada".
  const cardD = page.locator('li').filter({ hasText: 'Saldo de deuda registrada D' });
  const cardE = page.locator('li').filter({ hasText: 'Saldo de deuda registrada E' });
  await expect(cardD.getByText('Ambiguo: requiere elegir')).toBeVisible();
  await expect(cardE.getByText('Ambiguo: requiere elegir')).toBeVisible();

  // 17. exact_match y rounding_match entran en confirmación masiva
  // segura; ambiguous no aparece en el conteo de "coincidencias claras".
  await expect(page.getByText('2 coincidencias claras sin anomalías.')).toBeVisible();

  // 11. Confirmar las coincidencias claras en bloque.
  await page.getByRole('button', { name: 'Confirmar todas las claras' }).click();
  await expect(cardA).toHaveCount(0);
  await expect(cardB).toHaveCount(0);

  // 13. Escoger el valor correcto para resolver la ambigüedad.
  await cardD.getByRole('button', { name: 'Elegir este valor' }).click();
  await expect(cardD).toHaveCount(0);
  // La otra expectativa en pugna deja de encontrar el candidato ya
  // consumido y vuelve a "Datos que faltan" sin un mecanismo paralelo.
  await expect(
    page
      .locator('li')
      .filter({ hasText: 'Saldo de deuda registrada E' })
      .getByText('Falta este dato'),
  ).toBeVisible();

  // 14-15. Resolver una expectativa sin documento con captura manual guiada.
  const cardC = page.locator('li').filter({ hasText: 'Retencion en la fuente C' });
  await expect(cardC.getByText('Falta este dato')).toBeVisible();
  await cardC.getByRole('button', { name: /Capturar manualmente/ }).click();
  await cardC.getByLabel('Valor observado en el documento').fill('226.904');
  await cardC.getByRole('button', { name: 'Guardar' }).click();
  await expect(cardC).toHaveCount(0);

  // 16. Comprobar la conciliación resultante (sin doble conteo: una sola
  // decisión registrada por candidato confirmado, ninguna para la captura
  // manual porque no compara contra un candidato documental).
  await selectStage(page, 'Conciliación');
  await selectView(page, 'Conciliaciones');
  await expect(
    page.getByRole('heading', { name: 'Revisión de coincidencias con la exógena' }),
  ).toBeVisible();
  const guidedDecisions = page.getByText(/revisión guiada/);
  await expect(guidedDecisions).toHaveCount(4);

  // 19. Recargar la página y comprobar persistencia: A, B, C y D siguen
  // resueltos (no reaparecen); solo E permanece pendiente (nunca se
  // resolvió deliberadamente, para probar que persiste igual).
  await page.reload();
  await selectStage(page, 'Organización');
  await selectView(page, 'Revisión de extracción');
  await expect(page).toHaveURL(/\/organizacion\/revision-documental$/);
  await expect(page.locator('li').filter({ hasText: 'Saldo cuenta bancaria A' })).toHaveCount(0);
  await expect(
    page.locator('li').filter({ hasText: 'Rendimientos financieros B' }),
  ).toHaveCount(0);
  await expect(page.locator('li').filter({ hasText: 'Retencion en la fuente C' })).toHaveCount(0);
  await expect(
    page.locator('li').filter({ hasText: 'Saldo de deuda registrada D' }),
  ).toHaveCount(0);
  const cardEAfterReload = page.locator('li').filter({ hasText: 'Saldo de deuda registrada E' });
  await expect(cardEAfterReload.getByText('Falta este dato')).toBeVisible();

  // 20. Abrir modo avanzado y verificar trazabilidad básica.
  await page.getByRole('button', { name: 'Ver otros datos detectados', exact: true }).click();
  await page.getByLabel('Estado').first().selectOption('all');
  await expect(page.getByText('Hecho asistido creado y trazado.').first()).toBeVisible();
  const confirmedCount = await page.getByText('Hecho asistido creado y trazado.').count();
  expect(confirmedCount).toBe(3);

  // Responsive: el flujo crítico se ve utilizable a 390px sin overflow
  // horizontal (§14 de la Fase E.1).
  await page.getByRole('button', { name: 'Ocultar modo avanzado' }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    )
    .toBe(true);
  await expect(page.getByRole('heading', { name: 'Revisión guiada', exact: true })).toBeVisible();
  await expect(cardEAfterReload.getByText('Falta este dato')).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath('evidence-review-390.png'),
    fullPage: true,
  });
  await page.setViewportSize({ width: 1280, height: 720 });
});
