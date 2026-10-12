import { test, expect } from '@playwright/test';

import { loadCase, makeSample } from './support';

test('Tu resultado: responde en lenguaje llano y explica el porqué', async ({ page }, testInfo) => {
  await loadCase(page, makeSample(80_000_000));
  await expect(
    page.getByRole('heading', { name: /probablemente debes declarar renta/ }),
  ).toBeVisible();
  await expect(
    page.getByText(/Si te toca declarar, (tu fecha límite sería|la fecha límite venció)/),
  ).toBeVisible();
  await expect(page.getByText('Lo que ganaste en el año', { exact: true })).toBeVisible();
  await expect(page.getByText('Supera el límite', { exact: true })).toBeVisible();
  await expect(
    page.getByText(/no es un concepto legal|no un concepto legal/i).first(),
  ).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('tu-resultado-desktop.png'), fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(800);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflow).toBe(false);
  await page.screenshot({ path: testInfo.outputPath('tu-resultado-movil.png'), fullPage: true });
});

test('Tu resultado: pide solo la respuesta de IVA cuando nada se supera', async ({ page }) => {
  await loadCase(page, makeSample(1_000_000));
  await expect(page.getByRole('heading', { name: /Aún no podemos decirte/ })).toBeVisible();
  await page.getByRole('button', { name: 'No', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: /probablemente no estás obligado a declarar/ }),
  ).toBeVisible();
});
