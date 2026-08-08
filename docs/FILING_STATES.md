# Estados separados del expediente (Fase O)

_Última actualización: 2026-08-08 — Fase O del Sprint 2.3.1._

## 1. Alcance

`packages/form-210` expone `composeForm210FilingStates`: función pura
que empaqueta los cuatro estados independientes del expediente
tributario y devuelve un snapshot con etiquetas y tonos sugeridos para
la UI. `apps/web` los pinta en la vista `Estados` bajo la etapa
Declaración.

Los cuatro estados son:

1. **Obligación** — resultado de `assessFilingObligation` (aegis).
2. **Borrador** — `Form210Draft.status.status`.
3. **Liquidación** — `Form210PreliminaryLiquidation.status`.
4. **Presentación** — siempre `out_of_scope`. NexusTax no presenta
   ante la DIAN por diseño.

## 2. Contrato

```ts
export function composeForm210FilingStates(input: {
  obligation?: FilingObligationAssessment | null;
  draft?: Form210Draft | null;
}): Form210FilingStates;

export interface Form210FilingStates {
  stages: readonly FilingStageSnapshot[];
}

export interface FilingStageSnapshot {
  id: 'obligation' | 'draft' | 'liquidation' | 'presentation';
  label: string;
  status: string;
  statusLabel: string;
  tone: 'neutral' | 'emerald' | 'amber' | 'rose';
  description: string;
}
```

Cualquier entrada faltante se sustituye por una etiqueta neutra
("Sin evaluar" / "Sin iniciar" / "No disponible").

## 3. Integración en la app

- Vista nueva `estados` en la etapa Declaración
  (`packages/domain/src/navigation.ts` extendido con el nuevo id).
- `apps/web/src/components/case/FilingStatesPanel.tsx` muestra los
  cuatro estados como pipeline con badge de tono y descripción.

## 4. Verificación

Motor puro — `packages/form-210/tests/filing-states.test.ts` (4
fixtures):

- Sin entradas: los cuatro estados con etiquetas neutras.
- Obligación requerida ⇒ tono amber.
- Liquidación refund con retenciones altas ⇒ tono emerald.
- Presentation queda fijo en `out_of_scope` con descripción legible.

Verificación real en dev server con el expediente sintético del
usuario: la vista `Estados` muestra "Obligación: Sin evaluar",
"Borrador: Listo para revisión", "Liquidación: Saldo a pagar",
"Presentación: Fuera de alcance". Consola sin errores.

Sweep local: `pnpm -r typecheck` verde; `pnpm -r test` = 399 tests OK
(form-210 61 con 4 nuevos).

## 5. Fuera de alcance

- **Historial de estados** (cuándo cambió cada uno). Se pueden
  reconstruir desde el `resolutionDecisions` y las regeneraciones del
  draft; queda para una fase posterior.
- **Transiciones automáticas** entre estados. Cada estado es un valor
  derivado, no un flujo de trabajo con permisos.
- **Estado de presentación distinto de `out_of_scope`**. No se cambia
  por diseño; es un contrato explícito del proyecto.
