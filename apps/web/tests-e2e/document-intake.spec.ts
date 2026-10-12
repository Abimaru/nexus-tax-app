import { test, expect } from '@playwright/test';
import { loadCase, makeSample, makeTextPdf } from './support';

test('Sube tus documentos: reconoce un PDF solo, avisa repetidos y explica un Excel ajeno', async ({
  page,
}, testInfo) => {
  const exogenous = makeSample(80_000_000);
  const pdf = makeTextPdf(
    ['Certificado de saldos', 'Cuenta de ahorros sintética', 'Saldo al 31 de diciembre: $ 4051577'],
    'saldos-sinteticos.pdf',
  );
  await loadCase(page, exogenous);

  // "Continuar" en Tu resultado lleva a la pantalla de documentos.
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(page).toHaveURL(/\/organizacion\/mis-documentos$/);
  await expect(page.getByRole('heading', { name: 'Suma tus documentos' })).toBeVisible();

  // Un PDF se lee y se reconoce sin elegir tipo ni opciones.
  await page.setInputFiles('#intake-files', pdf);
  await expect(page.getByText('saldos-sinteticos.pdf')).toBeVisible();
  await expect(page.getByText(/Reconocido como|Leído\./)).toBeVisible({ timeout: 30_000 });

  // El mismo archivo se avisa como repetido.
  await page.setInputFiles('#intake-files', pdf);
  await expect(page.getByText('Ya habías subido este archivo.')).toBeVisible({ timeout: 30_000 });

  // Un Excel que no es el reporte de facturas se explica sin error técnico.
  await page.setInputFiles('#intake-files', exogenous);
  await expect(page.getByText(/No lo reconocimos como reporte de facturas/)).toBeVisible({
    timeout: 30_000,
  });

  await page.screenshot({
    path: testInfo.outputPath('mis-documentos-desktop.png'),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(800);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    ),
  ).toBe(false);
  await page.screenshot({ path: testInfo.outputPath('mis-documentos-movil.png'), fullPage: true });
});
