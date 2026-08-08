# Validaciones cruzadas del F-210 (Fase T)

_Última actualización: 2026-08-08 — Fase T del Sprint 2.3.1._

## 1. Alcance

`packages/aegis-rules` expone `evaluateCrossValidations`: tres
verificaciones puras que cruzan indicadores agregados del borrador
(retenciones, impuesto, patrimonio, ingresos, base cedular) para
detectar desalineaciones. `packages/form-210` las cablea al `validate()`
del builder y emite un `Form210ValidationFinding` de severidad `warning`
por cada verificación disparada.

Son heurísticas conservadoras: alertan sin bloquear.

## 2. Reglas incluidas

| Código | Umbral por defecto | Fuente | Qué detecta |
|---|---|---|---|
| `withholdings_exceed_income_tax` | retenciones ≥ 2× impuesto | — | Retenciones desproporcionadas al impuesto de renta. |
| `patrimony_income_disproportion` | patrimonio ≥ 10× ingresos | `et-art-236` | Aumento patrimonial no justificado (comparación patrimonial). |
| `cedular_sum_mismatch` | \|diff\| > 1 peso | — | Base cedular reportada distinta de 42+66+83. |

## 3. Contrato del motor

`packages/aegis-rules/src/colombia/individual-income-tax/2025/cross-validations.ts`:

```ts
export const WITHHOLDING_TO_TAX_RATIO_ALERT = 2;
export const PATRIMONY_TO_INCOME_RATIO_ALERT = 10;
export const CEDULAR_SUM_TOLERANCE_COP = 1;
export const CROSS_VALIDATIONS_PATRIMONY_SOURCE_ID = 'et-art-236';

export function evaluateCrossValidations(input: {
  taxYear: number;
  incomeTaxCop: number;
  withholdingsAppliedCop: number;
  grossPatrimonyCop: number;
  totalGrossIncomeCop: number;
  reportedCedularTaxableIncomeCop: number;
  computedCedularTaxableIncomeCop: number;
}): CrossValidationEvaluation;
```

Cada `CrossValidationCheckResult` incluye `triggered`, `message`
legible en español, y evidencia numérica (`ratio`, `differenceCop`,
`thresholdRatio`, `thresholdCop`, `ruleSourceId` cuando corresponda).

## 4. Integración en el builder del F-210

`validate()` — o mejor dicho, el bloque final de `buildForm210Draft` —
ejecuta `evaluateCrossValidations` con:

- `incomeTaxCop`: `preliminaryLiquidation.incomeTax?.totalTaxCopRounded`.
- `withholdingsAppliedCop`: `preliminaryLiquidation.withholdingsCop`.
- `grossPatrimonyCop`: casilla 29.
- `totalGrossIncomeCop`: suma de casillas 32, 58, 74, 99, 104, 112
  normalizadas a ≥ 0.
- `reportedCedularTaxableIncomeCop`:
  `preliminaryLiquidation.generalCedularTaxableIncomeCop`.
- `computedCedularTaxableIncomeCop`: `max(0, 42) + max(0, 66) +
  max(0, 83)` recalculado desde `boxes`.

Cada resultado positivo se traduce a un finding:

- `withholdings_exceed_income_tax` → boxNumbers `[132]`.
- `patrimony_income_disproportion` → boxNumbers `[29]`.
- `cedular_sum_mismatch` → boxNumbers `[42, 66, 83]`.

`Form210ValidationFinding['code']` incluye los tres nuevos códigos.

## 5. Verificación

Motor puro — `packages/aegis-rules/tests/cross-validations.test.ts`
(12 fixtures):

- Constantes y fuente.
- `withholdings_exceed_income_tax`: no dispara bajo umbral, dispara a
  ratio ≥ 2, "no evaluable" con impuesto cero.
- `patrimony_income_disproportion`: no dispara con razón normal,
  dispara a ratio ≥ 10 con `ruleSourceId = 'et-art-236'`, "no
  evaluable" sin patrimonio o sin ingresos.
- `cedular_sum_mismatch`: no dispara al coincidir, dispara al exceder
  tolerancia, tolera diferencias de 1 peso.
- Año no modelado ⇒ excepción.

Integración F-210 —
`packages/form-210/tests/builder.test.ts` (2 fixtures nuevos):

- Patrimonio 200M con 10M de ingresos ⇒ ratio 20 ⇒ dispara
  `patrimony_income_disproportion`.
- Caso consistente con ingresos laborales ⇒ no dispara
  `cedular_sum_mismatch`.

Sweep local: `pnpm -r typecheck` verde; `pnpm -r test` = 390 tests OK
(aegis 129/129 con 12 nuevos, form-210 52/52 con 2 nuevos, resto sin
regresiones).

## 6. Fuera de alcance

- **Comparación patrimonial multi-año** (art. 236 ET exige patrimonio
  del año anterior). NexusTax no persiste historial multi-año; la
  alerta actual usa la razón intra-año como proxy conservador.
- **Cruce con exógena por retenedor** (verificar que las retenciones
  provengan de entidades que también reportaron ingresos). Requiere el
  mapeo entidad↔registro que llegará en fases posteriores.
- **Reglas cruzadas específicas de dividendos o pensiones** (art. 246,
  337 ET) que requieren tarifas separadas ya modeladas parcialmente.
