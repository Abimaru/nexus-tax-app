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
    [
      '901888999',
      'Juegos Sintéticos SAS',
      '1234567890',
      'Persona Sintetica E2E',
      'Premio de juego promocional',
      2_500_000,
      'Ganancia ocasional',
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
  writeFileSync(
    file,
    makeTextPdf([
      'FORMULARIO 220',
      'Certificado de ingresos y retenciones',
      'Ingresos laborales: $ 48000000',
      'Aportes obligatorios a salud: $ 1900000',
      'Retenciones en la fuente: $ 1000000',
    ]),
  );
  return file;
}

function makeUnsupportedPdfFile(): string {
  const dir = mkdtempSync(join(tmpdir(), 'nexustax-unsupported-'));
  const file = join(dir, 'escaneado-sin-texto-sintetico.pdf');
  writeFileSync(file, makeTextPdf([]));
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

test('flujo guiado completo del expediente', async ({ page }, testInfo) => {
  const samplePath = makeSampleFile();
  const supportPath = makeSupportFile();
  const unsupportedPath = makeUnsupportedPdfFile();

  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

  await page.getByRole('link', { name: 'Crear expediente' }).first().click();
  await page.getByLabel('Nombre o alias').fill('Expediente de prueba E2E');
  await page.getByRole('button', { name: 'Crear expediente' }).click();

  // Un expediente nuevo abre en Fuente y explica las etapas bloqueadas.
  await expect(page).toHaveURL(/\/fuente\/cargar$/);
  await expect(
    page.getByRole('heading', { name: 'Comienza cargando la información exógena' }),
  ).toBeVisible();
  await expect(
    page
      .getByRole('navigation', { name: 'Etapas del expediente' })
      .getByRole('button', { name: /Extracción/ }),
  ).toBeDisabled();
  await page.setInputFiles('#exogenous-file-input', samplePath);

  // Avanza a Extracción; selecciona la hoja y procesa.
  await expect(page).toHaveURL(/\/extraccion\/inspeccion$/);
  await page.getByRole('button', { name: 'Reporte' }).click();
  await page.getByRole('button', { name: /Procesar información/ }).click();

  // Organización abre en Resumen con métricas y gráficas.
  await expect(page).toHaveURL(/\/organizacion\/resumen$/, { timeout: 20_000 });
  await expect(page.getByText('Registros').first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('heading', { name: 'Valores reportados por entidad' })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Calidad del an.lisis/ })).toBeVisible();
  await expect(page.getByText('Persona Sintética E2E').first()).toBeVisible();
  await expect(page.getByText('Suma bruta no consolidada')).toBeVisible();
  await expect(page.getByText('1234567890', { exact: true })).toHaveCount(0);

  // Fuente permite revisar, reemplazar o eliminar con confirmación.
  await selectStage(page, 'Fuente');
  await expect(page.getByText(/SHA-256:/)).toBeVisible();
  let replacementWarning = '';
  page.once('dialog', async (dialog) => {
    replacementWarning = dialog.message();
    await dialog.dismiss();
  });
  await page.getByRole('button', { name: 'Reemplazar fuente', exact: true }).last().click();
  expect(replacementWarning).toContain('invalidar');
  let removalWarning = '';
  page.once('dialog', async (dialog) => {
    removalWarning = dialog.message();
    await dialog.dismiss();
  });
  await page.getByRole('button', { name: 'Eliminar fuente', exact: true }).click();
  expect(removalWarning).toContain('documentos y hechos manuales permanecerán');

  await selectStage(page, 'Organización');
  await selectView(page, 'Requisitos');
  await expect(
    page.getByRole('heading', { name: 'Ingresos laborales y empleadores' }),
  ).toBeVisible();
  await expect(page.getByLabel('Nombre del empleador')).toHaveValue('Empresa Empleadora SAS');
  // El 220 aparece una sola vez dentro del grupo laboral, no como requisito genérico duplicado.
  await expect(page.getByRole('heading', { name: /Formulario 220/ })).toHaveCount(1);
  await page.getByRole('button', { name: /Agregar otro empleador/ }).click();
  await expect(page.getByRole('heading', { name: 'Empleador 2' })).toBeVisible();

  // Los diálogos de requisitos viven en document.body, fuera de la tarjeta
  // animada con overflow que antes los recortaba.
  const occasionalGainGroup = page.locator('section').filter({ hasText: 'Juegos Sintéticos SAS' });
  await occasionalGainGroup
    .getByRole('button', { name: 'La entidad no emite este soporte' })
    .click();
  const requirementDialog = page.getByRole('dialog', {
    name: 'La entidad no emite este soporte',
  });
  await expect(requirementDialog).toBeVisible();
  expect(
    await requirementDialog.evaluate((element) => element.parentElement === document.body),
  ).toBe(true);
  const modalGeometry = await requirementDialog
    .locator(':scope > *')
    .first()
    .evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      return {
        top: bounds.top,
        bottom: bounds.bottom,
        viewportHeight: window.innerHeight,
        overflowY: window.getComputedStyle(element).overflowY,
      };
    });
  expect(modalGeometry.top).toBeGreaterThanOrEqual(0);
  expect(modalGeometry.bottom).toBeLessThanOrEqual(modalGeometry.viewportHeight);
  expect(modalGeometry.overflowY).toBe('auto');
  await page.screenshot({
    path: testInfo.outputPath('requisito-modal-fuera-de-tarjeta.png'),
  });
  await requirementDialog.getByRole('button', { name: 'Cerrar gestión del requisito' }).click();
  await page.reload();
  await expect(page).toHaveURL(/\/organizacion\/requisitos$/);
  await expect(page.getByRole('heading', { name: 'Empleador 2' })).toBeVisible();

  await selectStage(page, 'Conciliación');
  await selectView(page, 'Matriz');
  await expect(page.getByRole('heading', { name: 'Matriz tributaria preliminar' })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Facturaci.n electr.nica DIAN/ })).toBeVisible();
  await expect(page.getByText('Beneficio preliminar 1 %')).toBeVisible();

  await selectView(page, 'Hallazgos');
  const unresolved = page
    .locator('li')
    .filter({ has: page.getByRole('button', { name: 'Ver registro afectado' }) })
    .first();
  await unresolved.getByRole('button', { name: 'Ver registro afectado' }).click();
  await expect(page.getByRole('dialog', { name: /Resolver clasificaci.n/ })).toBeVisible();
  await page
    .getByLabel(/Justificaci.n/)
    .fill('Revision sintetica E2E: se conserva solo como dato informativo.');
  await page.getByRole('button', { name: 'Marcar informativo' }).click();
  await expect(page.getByText(/Resuelto: Modificado por el analista/).first()).toBeVisible();
  await page.getByRole('button', { name: /Cerrar panel de resoluci.n/ }).click();

  await page.reload();
  await expect(page).toHaveURL(/\/conciliacion\/hallazgos$/);
  await expect(page.getByText(/Resuelto: Modificado por el analista/).first()).toBeVisible();

  await selectStage(page, 'Declaración');
  await expect(
    page
      .getByRole('navigation', { name: 'Vistas de la etapa' })
      .getByRole('button', { name: /Formulario 210/ }),
  ).toBeDisabled();
  await expect(page.getByRole('heading', { name: 'Obligación de declarar' })).toBeVisible();
  await page.getByLabel('Responsabilidad de IVA al cierre de 2025').selectOption('false');
  await expect(page.getByText('No se detectan criterios que activen la obligación')).toBeVisible();
  await expect(page.getByText(/19 de octubre de 2026/)).toBeVisible();
  await expect(page.getByText(/co-renta-pn-2025\.1\.0\.0/)).toBeVisible();

  await selectStage(page, 'Organización');
  await selectView(page, 'Documentos');
  await expect(page).toHaveURL(/\/organizacion\/documentos$/);
  await expect(page.getByRole('heading', { name: 'Biblioteca documental local' })).toBeVisible();
  await page.setInputFiles('#case-document-file', supportPath);
  await page.getByLabel('Tipo documental').selectOption('form_220');
  await expect(page.getByLabel('Tipo documental')).toHaveValue('form_220');
  await page.getByLabel(/Decisi.n de persistencia/).selectOption('store_locally');
  await page.locator('input[type="checkbox"]').first().check();
  await page.getByRole('button', { name: 'Registrar y analizar' }).click();

  // La lectura PDF local propone candidatos, pero solo la revisión humana crea hechos.
  await expect(page).toHaveURL(/\/organizacion\/revision-documental$/);
  await expect(page.getByRole('heading', { name: 'Revisión de extracción' })).toBeVisible();
  await expect(page.getByLabel('Tipo documental propuesto')).toHaveValue('form_220');
  const incomeCandidate = page.getByRole('article', {
    name: 'Ingresos laborales',
    exact: true,
  });
  await expect(incomeCandidate.getByText(/48\.000\.000/)).toBeVisible();
  const suggestedRequirement = incomeCandidate.getByLabel('Requisito sugerido');
  const firstRequirementValue = await suggestedRequirement
    .locator('option')
    .nth(1)
    .getAttribute('value');
  if (firstRequirementValue) await suggestedRequirement.selectOption(firstRequirementValue);
  await incomeCandidate
    .getByLabel('Observación de la decisión')
    .fill('Valor y página confirmados en el Formulario 220 sintético.');
  await incomeCandidate.getByRole('button', { name: 'Confirmar y crear hecho' }).click();
  await expect(incomeCandidate.getByText('Hecho asistido creado y trazado.')).toBeVisible();

  await page.screenshot({
    path: testInfo.outputPath('revision-documental-1280.png'),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    )
    .toBe(true);
  await page.screenshot({
    path: testInfo.outputPath('revision-documental-390.png'),
    fullPage: true,
  });
  await page.setViewportSize({ width: 1280, height: 720 });

  await incomeCandidate.getByRole('button', { name: 'Revisar conciliación' }).click();
  await expect(page).toHaveURL(/\/conciliacion\/conciliaciones$/);
  await expect(
    page.getByRole('heading', { name: /Conciliación preliminar contra exógena/ }),
  ).toBeVisible();

  await selectStage(page, 'Organización');
  await selectView(page, 'Documentos');
  await expect(page.getByRole('heading', { name: 'certificado-sintetico.pdf' })).toBeVisible();

  await selectView(page, 'Hechos');
  await expect(page).toHaveURL(/\/organizacion\/hechos$/);
  await expect(page.getByRole('heading', { name: 'Registrar valores manualmente' })).toBeVisible();
  await page.getByLabel('Concepto original').fill('Saldo cuenta bancaria certificado');
  await page.getByLabel('Valor documental').fill('1250000');
  await page.getByRole('button', { name: /Clasificación tributaria/ }).click();
  await page.getByLabel(/Categor.a normalizada/).selectOption('asset');
  await page.getByLabel(/^Naturaleza/).selectOption('asset');
  await page.getByLabel(/^Tratamiento/).selectOption('add_to_assets');
  await page.getByRole('button', { name: 'Guardar hecho' }).click();
  await expect(page.getByText('Saldo cuenta bancaria certificado')).toBeVisible();

  await page
    .getByRole('button', { name: 'Usar valor de la exógena provisionalmente' })
    .first()
    .click();
  const acceptedSourceDialog = page.getByRole('dialog', {
    name: 'Aceptar información exógena como fuente provisional',
  });
  expect(
    await acceptedSourceDialog.evaluate((element) => element.parentElement === document.body),
  ).toBe(true);
  const recordSelect = page.getByLabel('Registro exógeno');
  const prizeValue = await recordSelect
    .locator('option')
    .filter({ hasText: 'Premio' })
    .getAttribute('value');
  await recordSelect.selectOption(prizeValue!);
  await page.getByLabel('Motivo').selectOption('validated_by_holder');
  await page.getByLabel('¿Reconoces esta operación?').selectOption('own_prize');
  await page
    .getByLabel('Observación', { exact: true })
    .fill('El titular reconoce el premio exclusivamente sintético.');
  await page.getByRole('button', { name: 'Aceptar provisionalmente' }).click();
  await expect(page.getByText('Aceptado provisionalmente')).toBeVisible();

  await page.reload();
  await expect(page).toHaveURL(/\/organizacion\/hechos$/);
  await selectView(page, 'Documentos');
  await expect(page.getByRole('heading', { name: 'certificado-sintetico.pdf' })).toBeVisible();
  await selectView(page, 'Hechos');
  await expect(page.getByText('Saldo cuenta bancaria certificado')).toBeVisible();
  await expect(page.getByText('Ingresos laborales').first()).toBeVisible();

  await selectView(page, 'Documentos');
  await page.getByRole('button', { name: 'Marcar obsoleto' }).click();
  await selectView(page, 'Revisión de extracción');
  await expect(page.getByText('Sin extracciones documentales')).toBeVisible();

  // Salida recuperable para PDF sin texto y control de contraseña por teclado.
  await selectView(page, 'Documentos');
  await page.setInputFiles('#case-document-file', unsupportedPath);
  const passwordToggle = page.getByLabel('El archivo requiere contraseña');
  await passwordToggle.focus();
  await passwordToggle.press('Space');
  await expect(page.getByLabel('Contraseña temporal')).toBeVisible();
  await page.getByLabel('Contraseña temporal').fill('solo-en-memoria');
  await passwordToggle.press('Space');
  await page.getByRole('button', { name: 'Registrar y analizar' }).click();
  await expect(page.locator('#case-document-file-error')).toContainText(
    /no contiene texto seleccionable/i,
  );
  await selectView(page, 'Revisión de extracción');
  await expect(page.getByText('No compatible')).toBeVisible();
  await expect(
    page.getByText('registra los valores manualmente', { exact: false }).first(),
  ).toBeVisible();

  await selectStage(page, 'Exportación');
  await selectView(page, 'Manifiesto');
  await expect(page.getByText(/Expediente incompleto|Preparado para revisión/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Exportar manifiesto JSON' })).toBeVisible();
});

test('stepper responsive sin desbordamiento horizontal', async ({ page }, testInfo) => {
  await page.goto('/');
  await expect(page.getByRole('region', { name: 'Capacidades actuales' })).toContainText(
    'Extracción documental asistida',
  );
  await expect(page.getByText('Sprint 1')).toHaveCount(0);
  await page.getByRole('link', { name: 'Crear expediente' }).first().click();
  await page.getByLabel('Nombre o alias').fill('Expediente responsive E2E');
  await page.getByRole('button', { name: 'Crear expediente' }).click();

  for (const width of [1440, 1280, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        ),
      )
      .toBe(true);
    if (width < 768) {
      await expect(page.getByLabel('Etapa actual')).toBeVisible();
      await expect(page.getByLabel('Vista actual')).toBeVisible();
    } else {
      await expect(
        page
          .getByRole('navigation', { name: 'Etapas del expediente' })
          .getByRole('button', { name: /Fuente/ }),
      ).toBeVisible();
    }
    if (width === 1440 || width === 390) {
      await page.screenshot({
        path: testInfo.outputPath(`expediente-${width}.png`),
        fullPage: true,
      });
    }
    if (width === 1440) {
      await page.getByRole('button', { name: 'Cambiar a modo claro' }).click();
      await page.screenshot({
        path: testInfo.outputPath('expediente-1440-claro.png'),
        fullPage: true,
      });
      await page.getByRole('button', { name: 'Cambiar a modo oscuro' }).click();
    }
  }
});
