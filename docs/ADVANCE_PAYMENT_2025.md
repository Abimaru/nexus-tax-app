# Anticipo del impuesto de renta (AG 2025)

_Última actualización: 2026-08-07 — Fase L del Sprint 2.3.1._

## 1. Alcance

`packages/aegis-rules` modela el anticipo del impuesto de renta para el año
siguiente al que se declara, en los términos del artículo 807 del Estatuto
Tributario. `packages/form-210` lo consume desde la liquidación privada
preliminar del borrador. El motor es puro, sin red y sin efectos secundarios,
y el resultado es **orientativo**: nunca se presenta ante la DIAN y siempre
requiere revisión humana.

## 2. Regla

Según el art. 807 ET, el anticipo depende del número de veces que el
contribuyente ha declarado, contando la declaración que se está preparando:

| `filingCountIncludingCurrent` | Tarifa | Base |
|---|---|---|
| `1` | 25 % | Impuesto neto de renta del año actual. |
| `2` | 50 % | Mayor entre el impuesto neto del año actual y el promedio del año actual y el inmediatamente anterior (cuando ese último es conocido). |
| `3` (o más) | 75 % | Mayor entre el impuesto neto del año actual y el promedio de los dos años. |

El anticipo neto = anticipo bruto − retenciones del año declarado
(art. 807 ET, penúltimo inciso). Nunca es negativo: si las retenciones
exceden el anticipo bruto, el anticipo neto queda en cero.

Este motor **no** modela la disminución del anticipo por reducción
significativa del impuesto (parágrafo del art. 807 ET). Esa evaluación es
del contribuyente y de su asesor.

## 3. Contrato del motor

`packages/aegis-rules/src/colombia/individual-income-tax/2025/advance-payment.ts`:

```ts
export const ADVANCE_PAYMENT_BRACKETS_2025: readonly AdvancePaymentBracket[];
export const ADVANCE_PAYMENT_SOURCE_ID = 'et-art-807';

export function getAdvancePaymentBracket(
  filingCountIncludingCurrent: 1 | 2 | 3,
): AdvancePaymentBracket;

export function computeAdvancePayment(input: {
  taxYear: number;
  filingCountIncludingCurrent: 1 | 2 | 3;
  currentNetIncomeTaxCop: number;
  priorNetIncomeTaxCop?: number | null;
  withholdingsCop: number;
}): AdvancePaymentComputation;
```

`AdvancePaymentComputation` (ver `packages/aegis-rules/src/types.ts`) expone:

- `bracket` — con `filingCountIncludingCurrent` y `rate`.
- `currentNetIncomeTaxCop`, `priorNetIncomeTaxCop` — insumos tal como
  entraron al motor (normalizados a ≥ 0).
- `baseMethod` — `current_only` o `average_of_two`, según lo elegido.
- `baseCop` — base efectiva sobre la que se aplica la tarifa.
- `grossAdvanceCop` — anticipo antes de restar retenciones.
- `withholdingsAppliedCop` — retenciones absorbidas por el anticipo.
- `netAdvanceCop` — anticipo neto (≥ 0).
- `formula`, `rationale` — texto legible para la UI.
- `ruleSourceId` — siempre `'et-art-807'`.

## 4. Integración en el borrador del F-210

`Form210BuildInput` acepta un `advancePaymentContext` opcional:

```ts
interface Form210AdvancePaymentContext {
  filingCountIncludingCurrent: 1 | 2 | 3;
  priorNetIncomeTaxCop: number | null;
}
```

Si el contexto está presente **y** el impuesto neto de renta calculado es
positivo, `Form210PreliminaryLiquidation.nextYearAdvance` recibe la
`AdvancePaymentComputation` y `netBalanceCop` se recalcula como:

```
netBalanceCop =
  totalTaxDueCop
  + nextYearAdvance.netAdvanceCop
  − priorYearAdvanceCop   (casilla 130)
  − priorYearBalanceCop   (casilla 131)
  − withholdingsCop       (casilla 132)
```

Si el contexto falta pero hay impuesto, se agrega el warning
"El anticipo del año siguiente (art. 807 ET) no se calculó porque falta
indicar cuántas veces has declarado". Si no hay impuesto de renta, no se
calcula anticipo aunque haya contexto.

Notas:

- El impuesto neto usado como base es `incomeTax.totalTaxCopRounded`. El motor
  todavía **no** modela descuentos tributarios (art. 249 y ss.). Cuando se
  agreguen, la base del anticipo se ajustará en consecuencia.
- Las mismas retenciones (casilla 132) se aplican dos veces conceptualmente:
  primero reducen el saldo del año declarado y también se descuentan del
  anticipo bruto. Es la lectura del ET; el motor la conserva textual.

## 5. Verificación

Motor puro — `packages/aegis-rules/tests/advance-payment.test.ts`:

- Declara tres tramos: 25 % / 50 % / 75 %.
- Primera declaración: 25 % sobre impuesto neto actual (con retenciones que
  lo consumen todo → anticipo neto 0).
- Segunda declaración: elige el mayor entre `current_only` y `average_of_two`.
- Tercera declaración: 75 % con historial completo y retenciones parciales.
- Sin impuesto neto: anticipo cero.
- Sin historial anterior en segunda declaración: cae a `current_only`.
- Retenciones que exceden el bruto: anticipo neto 0, sin crédito.
- Valores negativos → 0.
- Rechaza años no modelados.

Integración F-210 — `packages/form-210/tests/preliminary-liquidation.test.ts`:

- Renta 3.000 UVT + primera declaración → anticipo 25 % sumado al saldo.
- Impuesto positivo sin contexto → warning claro y `nextYearAdvance: null`.
- Sin impuesto → sin anticipo aunque el contexto esté presente.

Sweep local: `pnpm -r typecheck` verde; `pnpm -r test` = 288 tests OK
(aegis 61, form-210 21, resto sin regresiones).

## 6. Fuera de alcance

- Historial de declaraciones previas del contribuyente (NexusTax no lo
  persiste; el analista lo aporta explícitamente en `advancePaymentContext`).
- Descuentos tributarios (art. 249 y ss.); cuando se modelen, la base del
  anticipo pasará de `totalTaxCopRounded` al impuesto neto después de
  descuentos.
- Disminución del anticipo por reducción significativa del impuesto
  (parágrafo art. 807 ET) — decisión humana.
- Numeración oficial de la casilla del anticipo del año siguiente en el
  formulario. Se anexará cuando se verifique con el instructivo DIAN 2025.
