import { defineConfig, devices } from '@playwright/test';

const externalBaseUrl = process.env.PLAYWRIGHT_BASE_URL;
const baseURL = externalBaseUrl ?? 'http://localhost:3100';

/**
 * Configuración Playwright para el smoke test del flujo completo.
 * Levanta el servidor de Next en modo producción y prueba el camino feliz.
 */
export default defineConfig({
  testDir: './tests-e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: externalBaseUrl
    ? undefined
    : {
        // Usa el binario local de Next para no depender de pnpm en el PATH del shell.
        command: 'npx next start --port 3100',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
