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

test('Sube tus documentos: propone asociar el PDF al soporte de su entidad y solo guarda al confirmar', async ({
  page,
}, testInfo) => {
  const pdf = makeTextPdf(
    [
      'Banco Ficticio S.A.',
      'Certificado de saldos',
      'Cuenta de ahorros sintética',
      'Saldo al 31 de diciembre: $ 1250000',
    ],
    'saldo-banco-ficticio.pdf',
  );
  await loadCase(page, makeSample(80_000_000));
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Suma tus documentos' })).toBeVisible();

  // Antes de subir no hay asociaciones propuestas y el soporte está pendiente.
  await expect(page.getByRole('heading', { name: 'Asociaciones que encontramos' })).toHaveCount(0);
  await expect(page.getByText(/0 de \d+ asociados/)).toBeVisible();

  await page.setInputFiles('#intake-files', pdf);
  await expect(page.getByRole('heading', { name: 'Asociaciones que encontramos' })).toBeVisible({
    timeout: 30_000,
  });
  await expect(
    page.getByText(/Soportaría: Certificado de saldos · .*BANCO FICTICIO/i),
  ).toBeVisible();
  // Sin confirmar, nada cambia.
  await expect(page.getByText(/0 de \d+ asociados/)).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('asociaciones-desktop.png'), fullPage: true });

  await page.getByRole('button', { name: /^Confirmar: / }).click();
  await expect(page.getByRole('heading', { name: 'Asociaciones que encontramos' })).toHaveCount(0);
  await expect(page.getByText(/1 de \d+ asociados/)).toBeVisible();
  await expect(page.getByText('Completo').first()).toBeVisible();

  // Persiste tras recargar.
  await page.reload();
  await expect(page.getByText(/1 de \d+ asociados/)).toBeVisible({ timeout: 20_000 });
});

test('Sube tus documentos: «No es este» descarta la sugerencia sin guardar nada', async ({
  page,
}) => {
  const pdf = makeTextPdf(
    ['Banco Ficticio S.A.', 'Certificado de saldos', 'Saldo al 31 de diciembre: $ 1250000'],
    'otro-saldo.pdf',
  );
  await loadCase(page, makeSample(80_000_000));
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.setInputFiles('#intake-files', pdf);
  await expect(page.getByRole('heading', { name: 'Asociaciones que encontramos' })).toBeVisible({
    timeout: 30_000,
  });
  await page.getByRole('button', { name: /^Descartar: / }).click();
  await expect(page.getByRole('heading', { name: 'Asociaciones que encontramos' })).toHaveCount(0);
  await expect(page.getByText(/0 de \d+ asociados/)).toBeVisible();
});
