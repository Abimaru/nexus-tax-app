# Tareas por casilla del F-210 (Fase S)

_Última actualización: 2026-08-08 — Fase S del Sprint 2.3.1._

## 1. Alcance

`packages/form-210` expone `deriveForm210BoxTasks`: función pura que
inspecciona `Form210Draft.boxes` y devuelve plantillas de tareas para
las casillas que requieren atención humana. La app las persiste en la
tabla `caseTasks` a través del pipeline de análisis existente.

## 2. Reglas del motor

| `Form210BoxStatus` | ¿Genera tarea? | Prioridad | Bloqueante |
|---|---|---|---|
| `no_data` | Sí | `medium` | No |
| `incomplete` | Sí | `high` | No |
| `requires_decision` | Sí | `high` | Sí |
| `contradicted` | Sí | `high` | Sí |
| `suggested` | No | — | — |
| `confirmed` | No | — | — |
| `calculated` | No | — | — |
| `not_applicable` | No | — | — |

Cada plantilla incluye `title`, `explanation`, `recommendedAction` en
español, `formBoxNumber` y `ruleId = 'form-210:box:<n>'`.

## 3. Contrato

```ts
export interface Form210BoxTaskTemplate {
  type: 'resolve_form_box';
  title: string;
  explanation: string;
  recommendedAction: string;
  formBoxNumber: number;
  priority: 'high' | 'medium' | 'low';
  blocking: boolean;
  source: 'filing';
  stage: 'declaracion';
  view: 'formulario-210';
  ruleId: string;
}

export function deriveForm210BoxTasks(draft: Form210Draft): Form210BoxTaskTemplate[];
```

El consumidor añade `id`, `caseId`, `createdAt`, `updatedAt` y demás
campos requeridos por `CaseTaskSchema` antes de persistir.

## 4. Integración

`apps/web/src/lib/taxCaseAnalysis.ts` reemplaza el bloque inline de
derivación por una llamada a `deriveForm210BoxTasks`. Cada plantilla
se enriquece con:

- `id`: `task:<caseId>:form210:<boxNumber>` (estable, permite
  actualizar la misma tarea al regenerar el draft).
- `resolutionDecisionId`: `box.resolutionId` cuando existe.
- `evidence`: lista de `source.evidence` de la casilla.
- `ruleId`: `<ruleVersion>.form-210:box:<n>`.

Las tareas ya se pintan en el `CaseTasksPanel` existente.

## 5. Verificación

Motor puro — `packages/form-210/tests/derive-box-tasks.test.ts` (3
fixtures):

- Sin datos: todas las casillas del ruleset producen una tarea con
  `priority='medium'`, `blocking=false`.
- Casilla ajustada (`confirmed`): no genera tarea.
- Título e id de regla incluyen el número de casilla
  (`form-210:box:35`).

Sweep local: `pnpm -r typecheck` verde; `pnpm -r test` = 402 tests OK
(form-210 64 con 3 nuevos).

## 6. Fuera de alcance

- **Deduplicación cross-domain**: si una casilla ya está cubierta por
  una tarea de matriz o de conciliación, ambas conviven; el analista
  decide cuál cerrar primero.
- **Notificaciones push** cuando aparece una tarea nueva.
- **Auto-descarte** de tareas por dependencia lógica (por ejemplo, si
  la casilla 42 se cubre, la 41 también podría cerrarse). Hoy cada
  tarea vive independiente y se re-evalúa al regenerar el draft.
