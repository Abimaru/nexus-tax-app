# Liquidación privada preliminar del Formulario 210 (AG 2025)

_Última actualización: 2026-08-07 — Fase K del Sprint 2.3.1._

## 1. Alcance y advertencias

Este documento describe la **liquidación privada preliminar** que produce
`buildForm210Draft` en `@nexus-tax/form-210`. Es una salida **orientativa,
local y sujeta a revisión humana**. No es una declaración, no se presenta ante
la DIAN, no reemplaza al asesor tributario y no reemplaza al instructivo oficial.

- **No** liquida el impuesto definitivo del contribuyente.
- **No** genera el formulario oficial ni firma.
- **No** consulta la DIAN ni ningún backend.
- **No** persiste binarios: sólo el JSON del borrador.
- Todas las cifras se recalculan de forma pura desde los inputs y son
  reproducibles bit a bit para el mismo estado del caso.

La liquidación se acompaña del texto fijo:

> _Liquidación preliminar orientativa — no presentada ante la DIAN._

## 2. Contrato

La API pública es la propiedad `preliminaryLiquidation` que ahora forma parte
de `Form210Draft`:

```ts
draft.preliminaryLiquidation: Form210PreliminaryLiquidation | null;
```

El tipo `Form210PreliminaryLiquidation` (ver `packages/form-210/src/types.ts`)
expone, entre otros campos:

| Campo | Contenido |
|---|---|
| `ruleVersion` | Versión del ruleset del F-210 (`co.dian.form210.2025.v1`). |
| `generatedAt` | ISO timestamp del cálculo. |
| `generalCedularTaxableIncomeCop` / `…Uvt` | Base gravable de la cédula general (casillas 42 + 66 + 83). |
| `employmentLimit` / `capitalLimit` / `nonLaborLimit` | Detalle del límite del art. 336 ET aplicado a las casillas 41, 65 y 82. |
| `incomeTax` | `ProgressiveTaxComputation` del art. 241 ET sobre la base consolidada. |
| `occasionalGainsTaxableCop` | Base de ganancias ocasionales (casilla 115). |
| `occasionalGainsTax` | Impuesto de GO. **Hoy siempre `null`** (ver §4). |
| `totalTaxDueCop` | Impuesto de renta redondeado en pesos. |
| `priorYearAdvanceCop` / `priorYearBalanceCop` / `withholdingsCop` | Créditos que reducen el saldo (casillas 130, 131, 132). |
| `netBalanceCop` | Saldo neto: positivo = a pagar; negativo = a favor. |
| `status` | `insufficient_data` \| `zero` \| `refund` \| `to_pay`. |
| `warnings` | Lista de textos con condiciones que afectan la confianza. |
| `notice` | Texto fijo obligatorio de advertencia. |

Cuando no hay datos mínimos suficientes se retorna `status: 'insufficient_data'`
con `incomeTax: null` y `totalTaxDueCop: 0` — el borrador **nunca** sugiere un
impuesto a partir del vacío.

## 3. Cálculo paso a paso

1. **Sub-cédulas y art. 336 ET.** Las casillas 41, 65 y 82 se calculan con
   `applyLimitRule(TAX_LIMIT_RULES_2025[key], base, componentDetectado)`
   proveniente de `@nexus-tax/aegis-rules`. El resultado es el mínimo entre:
   - `40 % × base` (34, 61, 78 respectivamente),
   - `1.340 UVT`,
   - la suma del componente detectado (37 + 40, 63 + 64, 80 + 81).

   Cada `TaxLimitComputation` conserva cuál candidato fue el limitante, la
   fórmula legible y `ruleSourceId = 'et-art-336'`.

2. **Rentas líquidas ordinarias.** Las casillas 42, 66 y 83 se derivan por
   sustracción (`34 − 41`, `61 − 65`, `78 − 82`) y quedan marcadas como
   `ruleComplete: true` en el ruleset.

3. **Base cedular consolidada.** `generalCedularTaxableIncomeCop = max(0, 42) +
   max(0, 66) + max(0, 83)`. Los sumandos negativos (pérdidas) no se compensan
   automáticamente en esta fase; se marcan con warnings para revisión humana.

4. **Impuesto de renta.** Se llama a
   `computeProgressiveIncomeTax(baseCop, 2025)` con la tabla del art. 241 ET.
   El resultado incluye rango, marginal, impuesto en UVT y en pesos redondeados.

5. **Ganancias ocasionales.** La casilla 115 se toma tal cual del borrador y
   se transforma en impuesto vía `computeOccasionalGainsTax` (Fase H): 15 % por
   defecto (art. 314 ET). Si el analista provee `occasionalGainsBreakdown`,
   se separa entre general (15 %) y loterías (20 %, art. 317 ET). Ver
   [OCCASIONAL_GAINS_2025.md](OCCASIONAL_GAINS_2025.md) para el contrato
   completo.

6. **Total impuesto a cargo.**
   `totalTaxDueCop = incomeTax.totalTaxCopRounded + occasionalGainsTax.totalTaxCop`.
   Cada componente conserva su `ruleSourceId` propio para trazabilidad.

7. **Créditos.** `priorYearAdvanceCop`, `priorYearBalanceCop` y `withholdingsCop`
   se leen de las casillas 130, 131 y 132.

8. **Anticipo del año siguiente (Fase L).** Si el analista aporta
   `advancePaymentContext` y hay impuesto de renta, `nextYearAdvance` se
   calcula con `computeAdvancePayment` (art. 807 ET, 25 % / 50 % / 75 %).
   Ver [ADVANCE_PAYMENT_2025.md](ADVANCE_PAYMENT_2025.md).

9. **Saldo.**
   `netBalanceCop = totalTaxDueCop + nextYearAdvance.netAdvanceCop
   − (advance + balance + withholdings)` determina `status`
   (`to_pay` > 0, `refund` < 0, `zero` = 0).

## 4. Fuera de alcance en Fase K

Se decidió **no** inventar numeración oficial para las casillas de impuesto de
renta / GO / total a cargo / saldo. Sólo se mantienen los números fijados por
el instructivo (41, 65, 82, 130, 131, 132). Cuando cada casilla oficial se
verifique con el formulario DIAN se agregarán como filas en el ruleset y en la
matriz de validación, en fases posteriores.

Tampoco se implementa aquí:

- Sanciones (permanecen manuales; no las calcula el motor).
- Descuentos tributarios (art. 249 y ss.). Se dejarán como warnings hasta que
  se modelen.

## 5. Trazabilidad

Cada componente del resultado expone la fuente que lo respalda:

- `employmentLimit / capitalLimit / nonLaborLimit` → `ruleSourceId = 'et-art-336'`.
- `incomeTax.ruleSourceId` → `'et-art-241'`.
- `occasionalGainsTax.ruleSourceIds` → subconjunto de `['et-art-314', 'et-art-317']`.
- `nextYearAdvance.ruleSourceId` → `'et-art-807'`.
- `dependentsDeduction.ruleSourceId` → `'et-art-387'`.
- `electronicInvoicingDeduction.ruleSourceId` → `'et-art-336-1'`.
- `ruleVersion` → `FORM_210_RULE_VERSION_2025 = 'co.dian.form210.2025.v1'`.
- `notice` → texto fijo que la UI **debe** mostrar donde se presente la
  liquidación.

## 6. Verificación

- `packages/form-210/tests/preliminary-liquidation.test.ts` cubre:
  - `insufficient_data` cuando no hay ingresos ni resoluciones.
  - Aplicación del límite del art. 336 a la casilla 41.
  - Impuesto progresivo sobre base cedular consolidada de 3.000 UVT
    (rango 1.700 – 4.100 → 480 UVT según el art. 241).
  - Descuento de retenciones (casilla 132) que produce `status: 'refund'`.
- Sweep local: `pnpm --filter @nexus-tax/form-210 typecheck` y `test` (14/14),
  `pnpm -r typecheck` (todos los paquetes verdes).

## 7. Referencias normativas

- Estatuto Tributario art. 241 — tarifa progresiva para personas naturales.
- Estatuto Tributario art. 336 — cédula general y límite de rentas exentas y
  deducciones especiales (40 % / 1.340 UVT).
- Resolución DIAN 000193 de 2024 — UVT 2025 = 49.799.
- Formulario 210 e instructivo, año gravable 2025 (Resolución 000044 de 2024,
  compilada por la Resolución Única 000227 de 2025).
