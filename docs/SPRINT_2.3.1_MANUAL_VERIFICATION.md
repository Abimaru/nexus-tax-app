# Verificación manual reproducible — Sprint 2.3.1

_Última actualización: 2026-08-08 — Fase W del Sprint 2.3.1._

Este documento permite que cualquier revisor externo verifique
localmente que los cálculos tributarios entregados en el Sprint 2.3.1
son consistentes con el Estatuto Tributario y con los valores
publicados en las fuentes oficiales. Todo se ejecuta sin red y sin
datos reales.

## 1. Requisitos

- Node.js 20+ y `pnpm` 10+ instalados.
- Repositorio clonado en la rama
  `feature/sprint-2.3.1-tax-validation-liquidation`.

```bash
pnpm install
```

## 2. Suite tributaria (395 tests)

Ejecuta el sweep completo. Todos los tests deben pasar sin fallas.

```bash
pnpm -r typecheck
pnpm -r test
```

Distribución esperada (**395 tests**):

| Paquete | Archivos | Tests |
|---|---|---|
| `packages/domain` | 1 | 15 |
| `packages/aegis-rules` | 12 | 129 |
| `packages/exogenous-parser` | 2 | 47 |
| `packages/document-intelligence` | 7 | 66 |
| `packages/form-210` | 6 | 57 |
| `apps/web` | 11 | 81 |
| **Total** | **39** | **395** |

## 3. Matriz de motores puros con su fuente

| Motor | Archivo | Fuente |
|---|---|---|
| Tarifa progresiva de renta | `progressive-tax.ts` | `et-art-241` |
| Límite art. 336 (cédula general) | `tax-limits.ts` | `et-art-336` |
| Ganancias ocasionales | `occasional-gains.ts` | `et-art-314`, `et-art-317` |
| Dependientes | `dependents.ts` | `et-art-387` |
| Factura electrónica | `electronic-invoicing.ts` | `et-art-336-1` |
| Deducciones individuales | `individual-deductions.ts` | `et-art-126-1`, `et-art-126-4`, `et-art-119`, `et-art-387` |
| Saldo a favor anterior | `prior-year-balance.ts` | `et-art-850` |
| Retenciones consolidadas | `withholdings.ts` | `et-art-373` |
| Anticipo año siguiente | `advance-payment.ts` | `et-art-807` |
| Validaciones patrimoniales | `patrimony-checks.ts` | `et-art-261` |
| Validaciones cruzadas | `cross-validations.ts` | `et-art-236` |

Todos los `officialSourceId` están registrados en
`OFFICIAL_SOURCES_2025` con URL, `verifiedAt` y `relatedBoxNumbers`.

## 4. Escenario canónico verificable a mano

El caso "pleno" del test end-to-end (`e2e-full` en
`packages/form-210/tests/end-to-end-tax.test.ts`) usa estos ajustes:

- Casilla 42 (renta líquida ordinaria de trabajo) = 80.000.000
- Casilla 115 (ganancias ocasionales gravables) = 20.000.000
- Casilla 130 (anticipo año anterior) = 1.000.000
- Casilla 132 (retenciones) = 5.000.000
- Saldo a favor anterior confirmado = 2.000.000

Cálculos a mano contra el motor puro (UVT_2025 = 49.799):

1. **Base cedular** = 80.000.000 (casilla 42; las 66 y 83 son cero).
2. **Base cedular en UVT** = 80.000.000 ÷ 49.799 = **1.606,46 UVT**.
3. **Impuesto de renta (art. 241)** — rango 1.090–1.700 UVT, marginal
   19 %, baseTaxUvt 0:
   - Exceso = 1.606,46 − 1.090 = 516,46 UVT
   - Impuesto en UVT = 516,46 × 0,19 = 98,13 UVT
   - Impuesto en COP = 98,13 × 49.799 ≈ **4.886.511**
4. **Impuesto de GO (art. 314)** = 20.000.000 × 15 % = **3.000.000**.
5. **Total impuesto a cargo** = 4.886.511 + 3.000.000 = **7.886.511**.
6. **Créditos**: anticipo anterior 1M + saldo anterior 2M + retenciones
   5M = 8M.
7. **Saldo neto** = 7.886.511 − 8.000.000 = **−113.489** ⇒
   `status = 'refund'`.

El test verifica cada componente comparando la salida del builder
contra `computeProgressiveIncomeTax` y `computeOccasionalGainsTax`,
así el ejecutable de referencia es el propio motor puro.

## 5. Verificación de warnings

Configura escenarios que disparan warnings específicos:

| Warning | Escenario para reproducir |
|---|---|
| `withholdings_exceed_income_tax` | Renta 100M cedular + retenciones 30M ⇒ ratio > 2 |
| `patrimony_income_disproportion` | Patrimonio 500M + ingresos 20M ⇒ ratio 25 |
| `cedular_sum_mismatch` | No debería dispararse por construcción; usa fixture manipulado |
| `liability_without_asset` | Deudas 5M sin patrimonio |
| `movement_without_balance` | Movimientos bancarios > 100 UVT sin patrimonio |
| `duplicate_patrimony_entry` | Dos assets con mismo label y valor cercano |
| `unsupported_deduction` | AFC declarado 20M con ingreso 50M ⇒ recorte al 30 % |

Todos están cubiertos por tests automatizados; los códigos y mensajes
son estables.

## 6. Verificación visual en la app

```bash
pnpm dev
```

Navega a
`http://localhost:3000/expedientes/nuevo`, crea un expediente AG 2025,
carga un Excel exógeno sintético (o usa el modo manual), avanza hasta
la etapa Declaración y visita las tres vistas:

- **Borrador Formulario 210** — casilla por casilla con procedencia.
- **Liquidación preliminar** — saldo neto, cédula general con límites
  art. 336, impuesto de renta con rango y fórmula, GO con desglose,
  deducciones con `bindingCandidate`, créditos y anticipo, tabla del
  saldo, advertencias del cálculo.
- Botón **Exportar bundle** — descarga
  `<alias>-liquidacion-210.json` con el borrador, el ruleset y las
  fuentes citadas. Verificar con:

```bash
jq '{ ruleVersion: .ruleset.ruleVersion, sourceCount: (.officialSources | length), netBalance: .draft.preliminaryLiquidation.netBalanceCop }' \
  <alias>-liquidacion-210.json
```

## 7. Simulación controlada (Fase R)

En cualquier casilla, "Crear ajuste trazable" → escribe valor y motivo
→ "Previsualizar impacto" muestra `ResolutionImpact.summary` antes de
persistir. Solo "Confirmar ajuste" guarda la decisión.

## 8. Checklist de auditoría

- [ ] `pnpm -r typecheck` verde.
- [ ] `pnpm -r test` = 395 tests OK.
- [ ] `pnpm --filter @nexus-tax/form-210 lint` sin errores.
- [ ] `pnpm --filter @nexus-tax/aegis-rules lint` sin errores.
- [ ] `pnpm --filter @nexus-tax/web lint` sin errores.
- [ ] El escenario canónico (§4) produce netBalance = −113.489
      (±1 peso por redondeo).
- [ ] Cada `ruleSourceId` referenciado por los motores existe en
      `OFFICIAL_SOURCES_2025` (los tests lo verifican).
- [ ] `preliminaryLiquidation.notice` conserva el texto
      "Liquidación preliminar orientativa — no presentada ante la DIAN".
- [ ] El bundle exportado incluye solo las fuentes efectivamente
      citadas (deduplicadas).
- [ ] Ningún cálculo cambia sin cambio de `ruleVersion` en el ruleset.

## 9. Fuera de alcance

- **Comparación contra declaraciones oficiales previas del
  contribuyente** — requiere datos reales, prohibido por el modelo de
  privacidad local del proyecto (`CLAUDE.md`).
- **Presentación ante la DIAN** — no está en el alcance del proyecto
  y `preliminaryLiquidation.notice` lo hace explícito.
- **Reproducibilidad bit a bit del bundle JSON** — requiere fijar
  `generatedAt`; los tests lo hacen con
  `buildForm210ExportBundle(..., { generatedAt: '...' })`.
