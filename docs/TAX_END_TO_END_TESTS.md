# Tests tributarios end-to-end (Fase V)

_Última actualización: 2026-08-08 — Fase V del Sprint 2.3.1._

## 1. Alcance

`packages/form-210/tests/end-to-end-tax.test.ts` cubre el flujo pleno
del cálculo tributario integrando todos los motores puros del sprint
(art. 241 progresivo, art. 314/317 GO, art. 336 límite cedular,
art. 387 dependientes, art. 336-1 factura electrónica, art. 807
anticipo, art. 850 saldo anterior, art. 373 retenciones, art. 236
comparación patrimonial y `computeResolutionImpact`).

Los fixtures son sintéticos, deterministas y verificables a mano contra
los motores puros; no usan datos reales.

## 2. Casos incluidos

1. **Caso pleno**: renta líquida ordinaria 80M, GO 20M, retenciones
   5M, anticipo anterior 1M, saldo anterior confirmado 2M. Verifica:
   base cedular, impuesto de renta contra `computeProgressiveIncomeTax`,
   impuesto de GO contra `computeOccasionalGainsTax`, total a cargo,
   saldo anterior aplicado (`status = 'applied'`), retenciones
   consolidadas (`ruleSourceId = 'et-art-373'`), anticipo siguiente
   ausente y saldo neto = totalTax − créditos.
2. **Impacto de retenciones**: agregar 10M de retenciones tentativas
   reduce `netBalanceCop` en el mismo importe y produce un
   `ResolutionImpact.summary` con "disminuye".
3. **Deducciones acumuladas**: ingreso 100M + 1 dependiente + FE 50M
   ⇒ la casilla 39 recibe 10M (dependientes) + 500K (FE) = 10.5M con
   ambos `sourceId` (`calc:dependents-387`,
   `calc:electronic-invoicing-336-1`) presentes.
4. **Sin datos suficientes**: `status = 'insufficient_data'`,
   `netBalanceCop = 0`, `incomeTax` y `occasionalGainsTax` nulos.
5. **Escenario grande dispara validación cruzada**: patrimonio 500M
   con ingresos 20M ⇒ ratio 25 ⇒ finding
   `patrimony_income_disproportion`.

## 3. Verificación

Sweep local: `pnpm -r typecheck` verde; `pnpm -r test` = **395 tests
OK** (form-210 57/57 con 5 nuevos, aegis 129/129, resto sin
regresiones).

## 4. Fuera de alcance

- **Tests E2E de UI con Playwright** — quedan para la Fase X.
- **Comparación con declaraciones oficiales anteriores del
  contribuyente** — requiere datos reales, prohibido por el modelo de
  privacidad local.
- **Fuzz testing** con generadores aleatorios de casos.
