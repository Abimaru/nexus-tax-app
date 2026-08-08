# Impuesto de ganancias ocasionales (AG 2025)

_Última actualización: 2026-08-07 — Fase H del Sprint 2.3.1._

## 1. Alcance

`packages/aegis-rules` modela las dos tarifas de ganancias ocasionales para
personas naturales residentes en Colombia, vigentes durante el año gravable
2025. El motor es puro, sin red y sin efectos secundarios. `packages/form-210`
consume el motor desde la liquidación privada preliminar del borrador; no
altera el instructivo oficial ni sustituye la revisión humana.

- **Ninguna** cifra se presenta ante la DIAN.
- El motor **no** decide qué base es lotería y cuál es general: eso lo
  determina el analista (o el clasificador cuando lo modele) mediante el
  parámetro opcional `occasionalGainsBreakdown` del `Form210BuildInput`.
- Si no se indica desglose, se aplica la tarifa general (15 %) y se emite un
  warning para que el analista lo revise.

## 2. Tarifas

| `kind` | Tarifa | Base normativa | `officialSourceId` |
|---|---|---|---|
| `general` | 15 % | ET art. 314 (modificado por la Ley 2277 de 2022) | `et-art-314` |
| `lottery` | 20 % | ET art. 317 | `et-art-317` |

La tarifa `general` cubre la mayoría de conceptos: venta de activos fijos
poseídos por más de dos años, indemnizaciones por seguros de vida, herencias
y legados por encima del componente exento, etc. La tarifa `lottery` cubre
loterías, rifas, apuestas y similares.

## 3. Contrato del motor

`packages/aegis-rules/src/colombia/individual-income-tax/2025/occasional-gains.ts`
expone:

```ts
export const OCCASIONAL_GAIN_RATES_2025: readonly OccasionalGainRate[];

export function getOccasionalGainRate(kind: OccasionalGainKind): OccasionalGainRate;

export function computeOccasionalGainsTax(input: {
  taxYear: number;
  generalBaseCop: number;
  lotteryBaseCop: number;
}): OccasionalGainsTaxComputation;
```

`OccasionalGainsTaxComputation` (ver `packages/aegis-rules/src/types.ts`):

- `components` — un `OccasionalGainComponent` por cada base positiva, con
  `kind`, `baseCop`, `rate`, `taxCop` (redondeado al peso más cercano) y
  `officialSourceId`.
- `totalBaseCop`, `totalTaxCop` — suma de las bases y de los impuestos por
  componente.
- `ruleSourceIds` — ids únicos de fuentes que sustentan el cálculo.
- `formula` — texto legible: por ejemplo `GO general × 15 % + loterías × 20 %`.

Bases negativas se tratan como cero (no generan crédito ficticio). Si ambas
bases son cero, `components = []`, `totalTaxCop = 0` y `formula` describe la
ausencia.

## 4. Integración en el borrador del F-210

`Form210PreliminaryLiquidation.occasionalGainsTax` pasa de ser un placeholder
`null` a exponer `OccasionalGainsTaxComputation | null`:

- Si la casilla 115 es cero y el desglose es cero → `null`.
- Si hay base y el analista **no** provee `occasionalGainsBreakdown` → toda la
  base tributa como `general` (15 %) y se agrega un warning que invita a
  desglosar loterías si corresponde.
- Si el analista provee un desglose (`generalBaseCop`, `lotteryBaseCop`) → se
  respeta el desglose. Se agrega un warning adicional cuando la suma no
  coincide con la casilla 115.

`totalTaxDueCop` deja de depender solo del impuesto progresivo:
`totalTaxDueCop = incomeTax.totalTaxCopRounded + occasionalGainsTax.totalTaxCop`.

`priorYearAdvanceCop`, `priorYearBalanceCop` y `withholdingsCop` siguen
descontándose para producir `netBalanceCop` y el `status`.

## 5. Verificación

Motor puro — `packages/aegis-rules/tests/occasional-gains.test.ts`:

- Declara dos tarifas: 15 % (`et-art-314`) y 20 % (`et-art-317`).
- Total 0 cuando no hay base.
- 15 % sobre base general (100M → 15M).
- 20 % sobre base de loterías (50M → 10M).
- Mixto: 40M @ 15 % + 20M @ 20 % = 6M + 4M = 10M.
- Bases negativas se tratan como 0.
- Redondeo por componente (3.333.333 × 15 % = 500.000).
- Rechaza años no modelados.

Integración F-210 — `packages/form-210/tests/preliminary-liquidation.test.ts`:

- 115 sin desglose → 15 % con warning.
- Desglose mixto general/lotería → `ruleSourceIds` combinado, sin warning de 15 %.
- Desglose que no cuadra con 115 → warning de discrepancia.
- Renta + GO se suman en `totalTaxDueCop`.

Sweep local: `pnpm -r typecheck` verde; `pnpm -r test` = 278 tests OK.

## 6. Fuera de alcance

- **Categoría específica de lotería en el dominio.** Hoy el desglose lo aporta
  el analista mediante `Form210BuildInput.occasionalGainsBreakdown`. Cuando el
  clasificador de exógena distinga loterías podrá derivarlo automáticamente
  sin cambiar el motor.
- **Ganancias exentas por herencia, venta de vivienda, etc.** Se restan en la
  casilla 114 antes de llegar a la 115, no en este motor.
- **Retenciones específicas de loterías (art. 317 ET).** Se contabilizan en la
  casilla 132 de retenciones, no las modela este motor.
- **Numeración oficial** de la casilla que declara el impuesto de GO en el
  formulario. Se anexa cuando se verifique con el instructivo DIAN 2025.
