# E2E Playwright del Sprint 2.3.1 (Fase X)

_Última actualización: 2026-08-08 — Fase X del Sprint 2.3.1._

## 1. Alcance

`apps/web/tests-e2e/smoke.spec.ts` cubre el flujo pleno del expediente
y ahora verifica también las capacidades nuevas del sprint:

- **Fase R** — flujo previsualizar → confirmar en el `Form210DraftPanel`.
- **Fase U** — descarga del bundle exportable con validación del schema
  `nexustax.form210.export-bundle` y de `ruleset.ruleVersion`.
- **Fase P** — navegación a la vista "Liquidación preliminar" con
  encabezado y notice visibles.
- **Fase O** — navegación a la vista "Estados" con los cuatro estados
  independientes ("Presentación: Fuera de alcance").

## 2. Ejecución

Modo estándar (levanta `next start` en background):

```bash
pnpm --filter @nexus-tax/web build
pnpm --filter @nexus-tax/web test:e2e
```

Modo rápido contra dev server ya corriendo:

```bash
pnpm --filter @nexus-tax/web dev
# En otra terminal:
cd apps/web && PLAYWRIGHT_BASE_URL=http://localhost:3100 npx playwright test smoke.spec.ts
```

## 3. Verificación

- `flujo guiado completo del expediente` pasa (verificado local,
  ~17 s contra dev server).
- `stepper responsive sin desbordamiento horizontal` pasa (~3 s).
- Cambios respetan el flujo existente y añaden cobertura sin duplicar
  archivos.

## 4. Fuera de alcance

- **Spec por vista** (uno por Fase P/O). Preferimos extender el smoke
  existente para no fragmentar la suite; el flujo lineal cubre las tres
  vistas nuevas.
- **Tests visuales/regression** con snapshots de imagen.
- **CI matrix multi-browser**. Playwright está configurado solo con
  chromium.
