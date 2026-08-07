# Validaciones patrimoniales (AG 2025)

_Última actualización: 2026-08-07 — Fase I del Sprint 2.3.1._

## 1. Alcance

`packages/aegis-rules` expone verificaciones puras que ayudan a detectar
incoherencias entre lo declarado como patrimonio bruto (casilla 29), deudas
(casilla 30) y movimientos económicos (bancarios, tarjetas, inversiones)
observados desde la exógena. `packages/form-210` las consume en el
`validate()` del builder y emite `Form210ValidationFinding` con severidad,
casillas relacionadas y sourceIds.

Las verificaciones son **orientativas**; sugieren posibles omisiones o
duplicaciones para revisión humana. Nunca bloquean el borrador ni presentan
la declaración.

## 2. Reglas incluidas

Todas se apoyan normativamente en el art. 261 ET
(`officialSourceId = 'et-art-261'`).

### `liability_without_asset`

Se dispara cuando hay deudas en la casilla 30 pero el patrimonio bruto
(casilla 29) es cero. Suele indicar un activo respaldo omitido (por ejemplo,
una tarjeta de crédito registrada sin la cuenta bancaria asociada).

### `movement_without_balance`

Se dispara cuando la suma de movimientos declarados (categorías
`bank_movement`, `card_consumption`, `investment_movement`, `purchase`)
supera un umbral en UVT (`PATRIMONY_MOVEMENT_SIGNIFICANCE_UVT`, por defecto
100 UVT anuales ≈ 5 millones para 2025) y no hay patrimonio bruto
declarado. Sugiere revisar si falta un saldo asociado a la actividad
observada.

### `duplicate_patrimony_entry`

Se dispara cuando dos fuentes de patrimonio comparten label normalizado
(sin acentos, en minúsculas) y su diferencia relativa es menor o igual a
`PATRIMONY_DUPLICATE_RELATIVE_TOLERANCE` (1 % por defecto). Genera un
finding por cada par sospechoso, sin modificar los datos.

## 3. Contrato del motor

`packages/aegis-rules/src/colombia/individual-income-tax/2025/patrimony-checks.ts`:

```ts
export const PATRIMONY_SOURCE_ID = 'et-art-261';
export const PATRIMONY_MOVEMENT_SIGNIFICANCE_UVT = 100;
export const PATRIMONY_DUPLICATE_RELATIVE_TOLERANCE = 0.01;

export function detectLiabilityWithoutAsset(input: {
  grossPatrimonyCop: number;
  liabilitiesCop: number;
}): LiabilityWithoutAssetCheckResult;

export function detectMovementWithoutBalance(input: {
  taxYear: number;
  grossPatrimonyCop: number;
  movementSources: readonly PatrimonySourceCandidate[];
  thresholdUvt?: number;
}): MovementWithoutBalanceCheckResult;

export function detectDuplicatePatrimonyEntries(input: {
  sources: readonly PatrimonySourceCandidate[];
  toleranceRelative?: number;
}): DuplicatePatrimonyCheckResult;
```

Cada función devuelve `triggered: boolean` y la evidencia numérica que
respalda la decisión (`grossPatrimonyCop`, `liabilitiesCop`,
`movementTotalCop`, `thresholdCop`, `significantSourceIds`, `pairs` con
`relativeDifference`). La creación de findings queda del consumidor.

## 4. Integración en el builder del F-210

`validate()` en `packages/form-210/src/builder.ts` invoca las tres
funciones al final de su ciclo:

1. Lee `casilla 29` y `casilla 30` (confirmed/suggested) para
   `detectLiabilityWithoutAsset`.
2. Filtra `input.records` por categorías de movimiento y arma
   `PatrimonySourceCandidate[]` para `detectMovementWithoutBalance`.
3. Toma `boxes[29].sources` para `detectDuplicatePatrimonyEntries`.

Cada resultado positivo se traduce a un finding con `severity: 'warning'`,
`boxNumbers` apropiados y sourceIds vinculados. Los nuevos códigos son
`liability_without_asset`, `movement_without_balance` y
`duplicate_patrimony_entry` en `Form210ValidationFinding['code']`.

## 5. Verificación

Motor puro — `packages/aegis-rules/tests/patrimony-checks.test.ts` (14
fixtures):

- Constantes normativas verificadas.
- `detectLiabilityWithoutAsset`: dispara con deuda y sin activo, no
  dispara con ambos, no dispara con nada, normaliza negativos.
- `detectMovementWithoutBalance`: dispara al superar el umbral en UVT,
  no dispara con patrimonio declarado, respeta el umbral configurable.
- `detectDuplicatePatrimonyEntries`: detecta pares con label y valor
  cercano, ignora diferencias > tolerancia, ignora ceros, normaliza
  acentos y mayúsculas, acepta tolerancia personalizada.

Integración F-210 — `packages/form-210/tests/builder.test.ts` (4 fixtures
nuevos):

- Deuda sin activo ⇒ `liability_without_asset`.
- Movimientos > 100 UVT sin patrimonio ⇒ `movement_without_balance`.
- Dos entradas de patrimonio con label similar y valor cercano ⇒
  `duplicate_patrimony_entry`.
- Caso consistente ⇒ ningún finding patrimonial.

Sweep local: `pnpm -r typecheck` verde; `pnpm -r test` = 321 tests OK
(aegis 84, form-210 28, resto sin regresiones).

## 6. Fuera de alcance

- **Composición legal del patrimonio bruto** (excepciones del art. 261:
  bienes no incorporados por límites, etc.). El motor no evalúa
  exclusiones — asume que el analista ya normalizó activos y pasivos.
- **Valor patrimonial neto** por tipo de activo (acciones, inmuebles,
  moneda extranjera). Cada tipo tiene reglas de valuación que se
  modelarán en fases posteriores.
- **Cruce con el año anterior** (aumento patrimonial no justificado
  del art. 236 ET). Requiere historial multi-año que NexusTax no
  persiste hoy.
- **Contraparte por producto**. Se detectan duplicados por label; no
  se cruza `productId` porque hoy no es un dato requerido en el
  `PatrimonySourceCandidate`.
