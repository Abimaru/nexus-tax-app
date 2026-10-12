import { test, expect } from '@playwright/test';
import { loadCase, makeSample, makeTextPdf } from './support';

// Estas pruebas parten sin preferencia guardada: el modo por defecto es el guiado.
test.use({ storageState: { cookies: [], origins: [] } });

test('Asistente guiado: cinco pasos, siguiente acción clara y sin el banner antiguo', async ({
  page,
}, testInfo) => {
  await page.goto('/expedientes/nuevo');
  await page.getByLabel('Nombre o alias').fill('Asistente guiado E2E');
  await page.getByRole('button', { name: 'Crear expediente' }).click();

  const camino = page.getByRole('navigation', { name: 'Tu camino' });
  // Sin exógena solo el primer paso está disponible.
  await expect(camino.getByText('Paso 1 de 5')).toBeVisible();
  await expect(camino.getByRole('button', { name: /Tu resultado/ })).toBeDisabled();
  await expect(page.getByRole('navigation', { name: 'Etapas del expediente' })).toHaveCount(0);

  await page.setInputFiles('#exogenous-file-input', makeSample(80_000_000));
  await page.getByRole('button', { name: 'Reporte' }).click();
  await page.getByRole('button', { name: /Procesar información/ }).click();
  await expect(page).toHaveURL(/\/organizacion\/tu-resultado$/, { timeout: 20_000 });

  // En Tu resultado: paso 2 actual, paso 1 hecho, siguiente = documentos.
  await expect(camino.getByText('Paso 2 de 5')).toBeVisible();
  await expect(camino.getByRole('button', { name: /Tu exógena/ })).toContainText('Exógena cargada');
  await expect(page.getByText('Siguiente paso recomendado')).toHaveCount(0);
  await page.screenshot({
    path: testInfo.outputPath('guiado-resultado-desktop.png'),
    fullPage: true,
  });
  await camino.getByRole('button', { name: /Siguiente: Tus documentos/ }).click();
  await expect(page).toHaveURL(/\/organizacion\/mis-documentos$/);
  await expect(camino.getByText('Paso 3 de 5')).toBeVisible();

  // Subir un documento completa el paso 3 y habilita seguir.
  await page.setInputFiles(
    '#intake-files',
    makeTextPdf(['Certificado de saldos', 'Saldo al 31 de diciembre: $ 4051577'], 'saldos.pdf'),
  );
  await expect(page.getByText(/Reconocido como|Leído\./)).toBeVisible({ timeout: 30_000 });
  await expect(camino.getByRole('button', { name: /Tus documentos/ })).toContainText('1 documento');

  // El paso 5 lleva al borrador del Formulario 210.
  await camino.getByRole('button', { name: /Tu borrador/ }).click();
  await expect(page).toHaveURL(/\/declaracion\/formulario-210$/);
  await expect(camino.getByText('Paso 5 de 5')).toBeVisible();

  // El modo experto devuelve las seis etapas y recuerda la preferencia al recargar.
  await page.getByRole('button', { name: /modo experto/ }).click();
  await expect(page.getByRole('navigation', { name: 'Etapas del expediente' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('navigation', { name: 'Etapas del expediente' })).toBeVisible();
  await page.getByRole('button', { name: 'Volver al modo guiado' }).click();
  await expect(camino).toBeVisible();

  // Móvil: sin desbordamiento y con el paso actual legible.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(600);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    ),
  ).toBe(false);
  await page.screenshot({ path: testInfo.outputPath('guiado-movil.png'), fullPage: true });
});

test('Asistente guiado: las secciones extra siguen accesibles sin salir del modo guiado', async ({
  page,
}) => {
  await loadCase(page, makeSample(80_000_000));
  await page.getByText(/Más secciones de/).click();
  await expect(page.getByRole('button', { name: 'Entidades', exact: true })).toBeVisible();
});

test('Asistente guiado: en móvil el paso actual es legible y no hay desbordamiento', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await loadCase(page, makeSample(80_000_000));
  const camino = page.getByRole('navigation', { name: 'Tu camino' });
  await expect(camino.getByText('Paso 2 de 5')).toBeVisible();
  await expect(camino.getByRole('button', { name: 'Siguiente: Tus documentos' })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    ),
  ).toBe(false);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: testInfo.outputPath('guiado-resultado-movil.png') });
});
