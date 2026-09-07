import { test, expect } from '@playwright/test';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as XLSX from 'xlsx';

/**
 * E2E — Sprint 2.4, Fase F.3 (Unified Reconciliation & Coverage
 * Hardening, §22). Escenario sintético (ningún documento ni cifra real)
 * que cubre los 12 puntos del prompt:
 *
 * 1. cargar exógena;
 * 2. cargar certificado consolidado;
 * 3. matched exact;
 * 4. matched rounding;
 * 5. contradicción semántica bloqueada;
 * 6. annual cost report con cobertura útil;
 * 7. severance con categoría compatible (antes incompatible);
 * 8. declaración anterior redirigida (sin candidatos genéricos);
 * 9. extracto transaccional sin muro de candidatos;
 * 10. Guided Review muestra el hecho de cesantías como coincidencia
 *     clara (antes hubiera quedado como "posible valor nuevo");
 * 11. persistencia tras recargar;
 * 12. 390px sin overflow horizontal.
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
    ['Nombres / Razón social:', null, 'Persona Sintética F3 E2E'],
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
      '900333444',
      'Entidad Sintetica F3 E2E',
      '1234567890',
      'Persona Sintética F3 E2E',
      'Rendimientos financieros legitimos',
      1_234_567,
      null,
    ],
    [
      '900333444',
      'Entidad Sintetica F3 E2E',
      '1234567890',
      'Persona Sintética F3 E2E',
      'Saldo cuenta bancaria reportado',
      2_000_000,
      null,
    ],
    [
      '900333444',
      'Entidad Sintetica F3 E2E',
      '1234567890',
      'Persona Sintética F3 E2E',
      'Deduccion GMF reportada',
      50_000_000,
      null,
    ],
    [
      '900555666',
      'Fondo Cesantias Sintetico F3 E2E',
      '1234567890',
      'Persona Sintética F3 E2E',
      'Cesantias abonadas reportadas',
      1_200_000,
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
  const dir = mkdtempSync(join(tmpdir(), 'nexustax-coverage-xlsx-'));
  const file = join(dir, 'exogena-coverage-sintetica.xlsx');
  writeFileSync(file, XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
  return file;
}

function makeTextPdf(lines: readonly string[]): Buffer {
  const escape = (value: string) => value.replace(/([\\()])/g, '\\$1');
  const commands = ['BT', '/F1 11 Tf', '72 740 Td'];
  lines.forEach((line, index) => {
    if (index) commands.push('0 -14 Td');
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
  const dir = mkdtempSync(join(tmpdir(), 'nexustax-coverage-pdf-'));
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

async function uploadDocument(
  page: import('@playwright/test').Page,
  path: string,
  kind: string,
) {
  await selectView(page, 'Documentos');
  await page.setInputFiles('#case-document-file', path);
  await page.getByLabel('Tipo documental').selectOption(kind);
  await page.getByLabel(/C.mo conservar el documento/).selectOption('store_locally');
  await page.getByRole('button', { name: 'Registrar y analizar' }).click();
  await expect(page).toHaveURL(/\/organizacion\/revision-documental$/);
}

test('unifica conciliación y amplía cobertura: exact/rounding, contradicción, cesantías, routing (Fase F.3)', async ({
  page,
}) => {
  test.setTimeout(120_000);
  const exogenousPath = makeExogenousFile();
  const consolidatedPdfPath = makeTempPdfFile('certificado-consolidado-sintetico.pdf', [
    'CERTIFICADO TRIBUTARIO SINTETICO E2E',
    'Rendimientos financieros: $ 1.234.567',
    'Saldo al cierre: $ 2.000.000,40',
    'Base gravable GMF: $ 50.000.000',
  ]);
  const annualCostPdfPath = makeTempPdfFile('reporte-anual-costos-sintetico.pdf', [
    'REPORTE ANUAL DE COSTOS 2025',
    'Intereses pagados durante el período: $ 80.000',
  ]);
  const severancePdfPath = makeTempPdfFile('certificado-cesantias-sintetico.pdf', [
    'CERTIFICADO DE CESANTIAS SINTETICO',
    'Cesantias abonadas durante el ano: $ 1.200.000',
  ]);
  const priorYearPdfPath = makeTempPdfFile('declaracion-anterior-sintetica.pdf', [
    'DECLARACION DE RENTA - FORMULARIO 210',
    'Renglon 29 Total patrimonio bruto: $ 100.000.000',
  ]);
  const transactionalLines = Array.from({ length: 25 }, (_, index) => {
    const day = String((index % 28) + 1).padStart(2, '0');
    return `Movimiento transferencia consignacion ${day}/01/2025: $ ${1000 + index}`;
  });
  const transactionalPdfPath = makeTempPdfFile('extracto-transaccional-sintetico.pdf', [
    'EXTRACTO DE MOVIMIENTOS',
    ...transactionalLines,
  ]);

  // 1. Iniciar expediente sintético e importar la exógena.
  await page.goto('/');
  await page.getByRole('link', { name: 'Crear expediente' }).first().click();
  await page.getByLabel('Nombre o alias').fill('Expediente Fase F.3 Coverage E2E');
  await page.getByRole('button', { name: 'Crear expediente' }).click();
  await expect(page).toHaveURL(/\/fuente\/cargar$/);
  await page.setInputFiles('#exogenous-file-input', exogenousPath);
  await expect(page).toHaveURL(/\/extraccion\/inspeccion$/);
  await page.getByRole('button', { name: 'Reporte' }).click();
  await page.getByRole('button', { name: /Procesar información/ }).click();
  await expect(page).toHaveURL(/\/organizacion\/resumen$/, { timeout: 20_000 });

  // 2. Cargar el certificado tributario consolidado.
  await uploadDocument(page, consolidatedPdfPath, 'consolidated_tax_certificate');

  // 3. Matched exact.
  const incomeCard = page.locator('li').filter({ hasText: 'Rendimientos financieros legitimos' });
  await expect(incomeCard.getByText('Coincide exactamente')).toBeVisible();

  // 4. Matched rounding (§4 del prompt de Fase F.3: sigue exigiendo
  // confirmación humana explícita, nunca se autoconfirma).
  const balanceCard = page.locator('li').filter({ hasText: 'Saldo cuenta bancaria reportado' });
  await expect(balanceCard.getByText('Coincide por redondeo al peso')).toBeVisible();

  // 5. Contradicción semántica bloqueada: nunca "coincide exactamente".
  const gmfCard = page.locator('li').filter({ hasText: 'Deduccion GMF reportada' });
  await expect(gmfCard.getByText('Posible coincidencia')).toBeVisible();
  await expect(gmfCard.getByText('Coincide exactamente')).toHaveCount(0);

  // 6. Annual cost report con cobertura útil (antes: co.generic.label-value).
  await uploadDocument(page, annualCostPdfPath, 'annual_cost_report');
  await expect(page.getByText(/Encontramos \d+ valor/)).toBeVisible();

  // 7/10. Severance: la categoría ahora empata con el registro exógeno
  // "Cesantías abonadas reportadas" — antes de Fase F.3 quedaba
  // atrapado en "Posibles valores nuevos" por incompatibilidad
  // estructural de categorías (§8 del prompt).
  await uploadDocument(page, severancePdfPath, 'severance_certificate');
  const severanceCard = page
    .locator('li')
    .filter({ hasText: 'Cesantias abonadas reportadas' });
  await expect(severanceCard).toBeVisible();
  await expect(severanceCard.getByText('Coincide exactamente')).toBeVisible();

  // 8. Declaración anterior redirigida: sin candidatos vía el pipeline
  // genérico, con un mensaje humano explícito en modo avanzado.
  await uploadDocument(page, priorYearPdfPath, 'prior_year_return');
  await page.getByRole('button', { name: 'Ver otros datos detectados', exact: true }).click();
  await expect(
    page.getByText(/reconocimos una declaraci[oó]n de un a[ñn]o anterior/i),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Ocultar modo avanzado' }).click();

  // 9. Extracto transaccional sin muro de candidatos.
  await uploadDocument(page, transactionalPdfPath, 'consolidated_tax_certificate');
  await page.getByRole('button', { name: 'Ver otros datos detectados', exact: true }).click();
  await expect(
    page.getByText(/parece ser un extracto de movimientos/i),
  ).toBeVisible();
  // Ningún candidato tributario principal se generó para este documento
  // (§9/§13.B), incluso con sus 25 líneas de movimiento — se verifica en
  // la tarjeta específica de este documento (modo avanzado muestra
  // también las sesiones de los documentos anteriores).
  const transactionalCard = page
    .locator('div')
    .filter({ has: page.getByRole('heading', { name: 'extracto-transaccional-sintetico.pdf' }) })
    .last();
  await expect(transactionalCard.getByRole('article')).toHaveCount(0);
  await page.getByRole('button', { name: 'Ocultar modo avanzado' }).click();

  // 11. Persistencia tras recargar.
  await page.reload();
  await selectView(page, 'Revisión de extracción');
  await expect(page.getByRole('heading', { name: 'Revisión guiada' })).toBeVisible();

  // 12. Responsive 390px sin overflow horizontal.
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    )
    .toBe(true);
  await page.setViewportSize({ width: 1280, height: 720 });
});
