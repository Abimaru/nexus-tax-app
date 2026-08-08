# Impacto de decisiones (Fase Q)

_Última actualización: 2026-08-08 — Fase Q del Sprint 2.3.1._

## 1. Alcance

`packages/form-210` expone `computeResolutionImpact(before, after)`:
función pura que compara dos borradores del F-210 y devuelve los deltas
más útiles para que el analista entienda cómo una decisión (o un lote de
decisiones) mueve la liquidación preliminar.

Es un motor **puro**: no recomputa nada; recibe los dos `Form210Draft`
ya construidos por `buildForm210Draft`. La integración en la UI
(previsualización antes de confirmar una decisión) queda para la Fase R.

## 2. Contrato

```ts
export interface ResolutionImpactSnapshot {
  netBalanceCop: number;
  status: 'insufficient_data' | 'zero' | 'refund' | 'to_pay';
  totalTaxDueCop: number;
  incomeTaxCop: number;
  occasionalGainsTaxCop: number;
  withholdingsCop: number;
  priorYearAdvanceCop: number;
  priorYearBalanceCop: number;
  nextYearAdvanceCop: number;
  warningsCount: number;
}

export interface ResolutionImpactBoxChange {
  boxNumber: number;
  name: string;
  beforeCop: number | null;
  afterCop: number | null;
  deltaCop: number;
}

export interface ResolutionImpact {
  before: ResolutionImpactSnapshot;
  after: ResolutionImpactSnapshot;
  deltas: { /* misma forma que Snapshot, cada campo = after - before */ };
  statusChanged: boolean;
  changedBoxes: readonly ResolutionImpactBoxChange[];
  newWarnings: readonly string[];
  resolvedWarnings: readonly string[];
  summary: string;
}

export function computeResolutionImpact(
  before: Form210Draft,
  after: Form210Draft,
): ResolutionImpact;
```

## 3. Qué incluye el análisis

- **Snapshot** con los indicadores clave: saldo neto, status, impuesto a
  cargo, impuesto de renta, impuesto de GO, retenciones aplicadas,
  anticipo anterior, saldo anterior aplicado, anticipo del año siguiente
  y conteo de warnings.
- **Deltas** por cada campo del snapshot.
- `statusChanged` — flag booleano cuando el status del cálculo cambia.
- `changedBoxes` — casillas cuyo valor efectivo (`confirmedValue ??
  suggestedValue`) cambió, con su nombre, `before`, `after` y `delta`.
- `newWarnings` — warnings del cálculo que aparecen en `after` pero no
  en `before`.
- `resolvedWarnings` — warnings que estaban en `before` y desaparecen en
  `after`.
- `summary` — texto legible: `"el saldo neto aumenta en 15.322.725
  pesos; estado pasa de insufficient_data a to_pay; 1 casilla(s)
  afectada(s); 1 advertencia(s) nueva(s)."`

## 4. Uso típico

```ts
const before = buildForm210Draft({ caseId, taxYear: 2025, records, facts });
const after = buildForm210Draft({
  caseId,
  taxYear: 2025,
  records,
  facts,
  resolutions: [...existingResolutions, tentativeDecision],
});
const impact = computeResolutionImpact(before, after);
// Presentar impact.summary y impact.changedBoxes al analista.
// Si acepta, persistir tentativeDecision con saveTaxResolutionDecision.
```

## 5. Verificación

`packages/form-210/tests/resolution-impact.test.ts` (6 fixtures):

- Delta cero cuando no hay cambios.
- Confirmar impuesto extra en la casilla 42 aumenta `incomeTaxCop`,
  `totalTaxDueCop` y `netBalanceCop` en el mismo importe (renta 3.000 UVT
  → 480 UVT según art. 241).
- Cambio de status: de `insufficient_data` a `to_pay`.
- Warnings resueltos: aportar `occasionalGainsBreakdown` elimina el
  warning "se asumió 15 %".
- Aumento de retenciones reduce el `netBalanceCop` en el mismo importe.
- Casillas con delta negativo se anotan con `deltaCop < 0` y `before` >
  `after`.

Sweep local: `pnpm -r typecheck` verde; `pnpm -r test` = 377 tests OK
(form-210 50 con 6 nuevos, resto sin regresiones).

## 6. Fuera de alcance

- **UI de previsualización** antes de confirmar una decisión — es el
  alcance de la Fase R (simulación controlada).
- **Impacto por casilla individual** con explicación causal (¿por qué
  cambió la 41 cuando toqué la 32?). Requiere trazar dependencias del
  ruleset y quedará para una fase posterior.
- **Historial acumulado** de impactos. Cada llamada compara dos
  snapshots; el histórico de decisiones ya vive en el `taxResolution`
  del dominio.
