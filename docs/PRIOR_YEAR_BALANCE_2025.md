# Saldo a favor del año anterior (AG 2025)

_Última actualización: 2026-08-07 — Fase M del Sprint 2.3.1._

## 1. Alcance

`packages/aegis-rules` expone `evaluatePriorYearBalance`: función pura que
determina si el saldo a favor declarado por el analista puede aplicarse al
descuento del saldo del año actual. `packages/form-210` la consume desde
el builder y ajusta `netBalanceCop` según el resultado.

El comportamiento es **conservador por diseño**: sin confirmación humana
explícita el motor no descuenta el saldo, aunque haya un valor en la
casilla 131. NexusTax no consulta la DIAN y no puede verificar por sí
mismo que el saldo exista y esté disponible.

## 2. Regla

Sustento normativo: art. 850 del Estatuto Tributario (Devolución de saldos
a favor). Estados posibles:

| Estado | Aplicado | Motivo |
|---|---|---|
| `no_declared` | 0 | El analista no declaró saldo a favor. |
| `pending_confirmation` | 0 | Hay saldo declarado pero sin confirmación explícita. |
| `blocked_by_pending_request` | 0 | Confirmado pero con solicitud de devolución/compensación pendiente. |
| `applied` | `declaredCop` | Confirmado y sin solicitud pendiente. |

## 3. Contrato del motor

`packages/aegis-rules/src/colombia/individual-income-tax/2025/prior-year-balance.ts`:

```ts
export const PRIOR_YEAR_BALANCE_SOURCE_ID = 'et-art-850';

export function evaluatePriorYearBalance(input: {
  taxYear: number;
  declaredCop: number;
  confirmedByAnalyst: boolean;
  hasPendingCompensationOrRefundRequest: boolean;
  priorYearFilingDate?: string | null;
  evidence?: string | null;
}): PriorYearBalanceEvaluation;
```

`PriorYearBalanceEvaluation` (ver `packages/aegis-rules/src/types.ts`)
expone `declaredCop`, `appliedCop`, `status`, `reason` legible,
`ruleSourceId`, `priorYearFilingDate`, `evidence`, `confirmedByAnalyst` y
`hasPendingCompensationOrRefundRequest`.

Valores negativos se normalizan a cero. Año no modelado ⇒ excepción.

## 4. Integración en el borrador del F-210

`Form210BuildInput` acepta un campo opcional:

```ts
buildForm210Draft({
  caseId: 'case-1',
  taxYear: 2025,
  records,
  facts,
  priorYearBalance: {
    declaredCop: 10_000_000,
    confirmedByAnalyst: true,
    hasPendingCompensationOrRefundRequest: false,
    priorYearFilingDate: '2025-08-10',
    evidence: 'F-210 AG 2024',
  },
});
```

Comportamiento del builder:

1. Cuando se aporta `priorYearBalance`, se ejecuta `evaluatePriorYearBalance`.
   El aplicado se usa en `netBalanceCop` en lugar del valor bruto de la
   casilla 131.
2. `preliminaryLiquidation.priorYearBalance` conserva la evaluación completa.
3. `preliminaryLiquidation.priorYearBalanceCop` sigue publicando el importe
   efectivamente descontado (`appliedCop` o `0`).
4. Warnings emitidos:
   - `pending_confirmation` ⇒ mensaje explícito que invita a confirmar.
   - `blocked_by_pending_request` ⇒ mensaje que menciona el art. 850 ET.
   - Si la casilla 131 tiene valor y NO se aportó `priorYearBalance`, se
     agrega un warning que pide el contexto de confirmación.

## 5. Verificación

Motor puro — `packages/aegis-rules/tests/prior-year-balance.test.ts` (6
fixtures):

- `no_declared` con importe cero.
- `pending_confirmation` sin confirmación.
- `blocked_by_pending_request` con solicitud pendiente.
- `applied` con confirmación y sin solicitudes; conserva
  `priorYearFilingDate` y `evidence`.
- Normalización de negativos a cero.
- Año no modelado ⇒ excepción.

Integración F-210 — `packages/form-210/tests/preliminary-liquidation.test.ts`
(4 fixtures nuevos):

- Saldo confirmado ⇒ descuenta al `netBalanceCop`.
- Sin confirmación ⇒ `status = 'pending_confirmation'`, aplicado 0,
  warning explícito.
- Solicitud pendiente ⇒ `blocked_by_pending_request`, aplicado 0.
- Casilla 131 con valor y sin contexto ⇒ warning que invita a aportar el
  contexto.

Sweep local: `pnpm -r typecheck` verde; `pnpm -r test` = 352 tests OK
(aegis 108, form-210 36, resto sin regresiones).

## 6. Fuera de alcance

- **Verificación contra la DIAN** de la existencia del saldo. NexusTax no
  consulta la DIAN y no persiste declaraciones previas.
- **Rastreo multi-año** del uso del saldo. El analista debe recordar si ya
  compensó/pidió devolución.
- **Numeración oficial de la casilla del saldo a favor del año actual** en
  el formulario. Sólo se conservan 130/131/132 verificados; el aplicado se
  reporta en `preliminaryLiquidation.priorYearBalanceCop`.
