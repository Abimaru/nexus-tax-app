# Dependientes económicos: dos beneficios, un modelo (Sprint 2.4, Fase C)

_Última actualización: 2026-09-06._

## 1. Por qué dos motores y no uno

Colombia reconoce **dos beneficios tributarios distintos e independientes**
relacionados con dependientes económicos, y NexusTax los modela como **dos
motores puros separados** que nunca se fusionan:

| | Beneficio A — art. 387 ET | Beneficio B — art. 336 num. 3 ET |
|---|---|---|
| Módulo | `dependents.ts` | `dependents-additional-336.ts` |
| Tope | 10 % ingresos, 32 UVT/mes, **384 UVT/año total** | **72 UVT por dependiente**, máx. 4 |
| Cupo de dependientes | Sin límite de conteo | Máximo **4** |
| Dónde entra al F-210 | Casilla 39 (subcomponente de 40) | Casilla 138/139 → **componente de R92** |
| Sujeto al tope 40 %/1.340 UVT | Sí | **No** — expresamente excluido |
| Documento de referencia | `DEPENDENTS_DEDUCTION_2025.md` | Este documento, sección 3 |

Fusionarlos sería un error porque el art. 336 num. 3 ET es **expresamente
adicional** tanto al límite general del 40 %/1.340 UVT como al propio art.
387 ("sin perjuicio de lo establecido en el inciso 2 del artículo 387").
Sumarlo dentro del mismo cálculo de casilla 39/41 lo sometería
incorrectamente a ese tope conjunto.

## 2. Modelo de dominio: `TaxDependent`

`packages/domain/src/taxDependent.ts` define el contrato persistible, más
rico que el `DependentDeclaration` interno de cada motor:

- **`TaxDependent`**: identidad (nombre, documento — se enmascara en UI),
  `relationship` (parentesco), fechas relevantes, `status` (activo/archivado).
- **`DependentSupport`**: soportes documentales asociados (certificación
  médica, registro civil, certificado de estudio, etc.), con
  `documentLibraryFileId` opcional para reutilizar la biblioteca documental.
- **`DependentEvaluation`**: resultado persistido de correr los evaluadores
  puros contra un `TaxDependent` — incluye `eligibilityStatus`,
  `candidateBenefits`, `pendingRequirements`, y se marca
  `stale_due_to_rule_change` si cambian las reglas o el registro base
  después de evaluar.

`apps/web/src/lib/dependentsEngine.ts` es la única capa que traduce entre
`TaxDependent` (persistido) y los `DependentDeclaration` que consumen los
motores puros de `aegis-rules`. Ningún componente React ni la capa de
persistencia debe reconstruir esa traducción por su cuenta.

## 3. Beneficio B: adición de 72 UVT (art. 336 num. 3 ET)

Texto literal: *"Sin perjuicio de lo establecido en el inciso 2 del artículo
387 del Estatuto Tributario, el trabajador podrá deducir, en adición al
límite establecido en el inciso anterior, setenta y dos (72) UVT por
dependiente hasta un máximo de cuatro (4) dependientes."*

`packages/aegis-rules/src/colombia/individual-income-tax/2025/dependents-additional-336.ts`:

```ts
export const DEPENDENTS_ADDITIONAL_SOURCE_ID = 'et-art-336-num-3';
export const ADDITIONAL_UVT_PER_DEPENDENT = 72;
export const ADDITIONAL_MAX_DEPENDENTS = 4;

export function computeDependentsAdditionalDeduction(input: {
  taxYear: number;
  dependents: readonly DependentDeclaration[];
}): DependentsAdditionalDeductionComputation;
```

- Solo cuenta dependientes con `monthsClaimed > 0`.
- Si hay más de 4, se seleccionan los primeros 4 en orden de entrada y el
  resto queda en `excludedDependents` (con motivo `over_cap`), nunca se
  descartan silenciosamente.
- **Nunca se satura por ingresos ni por el 40 %/1.340 UVT** — no hay
  candidato de porcentaje en este motor porque la norma lo exime.
- Alimenta la casilla 138 (conteo) y 139 (valor), y 139 es sumando de la
  fórmula de la casilla 92 (ver `FORM_210_RULESET_2025.md`).

## 4. Elegibilidad (`dependent-eligibility.ts`)

Evalúa, por categoría de parentesco, si un `TaxDependent` es candidato:

| Categoría | Regla |
|---|---|
| `child_minor` | ≤ 18 años a 31/dic |
| `child_student` | 18–25 años (Ley 2411 de 2024) y estudiando |
| `child_disabled` | Certificación de dependencia física/psicológica |
| `spouse` / `parent` / `sibling` | Ingresos < 260 UVT anuales o condición certificada |

**Principio de diseño clave**: el evaluador **nunca devuelve un falso
`not_eligible`** cuando faltan datos. Los estados posibles son:

- `eligible` — todos los datos y soportes están completos y consistentes.
- `possibly_eligible` — los datos sugieren elegibilidad pero falta un dato puntual.
- `requires_support` — falta adjuntar un documento soporte.
- `pending_review` — datos insuficientes o contradictorios; requiere al analista.
- `not_eligible` — solo cuando los datos disponibles descartan la categoría de forma inequívoca (p. ej. edad > 25 sin discapacidad certificada).

Esto evita que el sistema le niegue automáticamente un beneficio a alguien
por falta de captura de datos, preservando el principio de "sugiere, no
decide".

## 5. Coexistencia entre beneficios (`dependents-coexistence.ts`)

Fundamento: Decreto 1625 de 2016, art. 1.2.1.20.3 (modificado por Decreto
2231 de 2023). Regla:

- Si el contribuyente obtiene sus rentas de **relación laboral, legal o
  reglamentaria** (asalariado/servidor público): puede aplicar **ambos**
  beneficios para el mismo dependiente, simultáneamente.
- Si el contribuyente es **independiente** (honorarios, servicios,
  rentas no laborales): debe **elegir un solo beneficio por dependiente**
  (`preferredBenefit`), nunca ambos para el mismo dependiente.

`resolveDependentBenefitCoexistence` solo agrega un beneficio a
`candidateBenefits` cuando `baseEligible === true` — es decir, únicamente
cuando el estado de elegibilidad es exactamente `'eligible'` (no
`'possibly_eligible'`/`'requires_support'`/`'pending_review'`). Esta es una
decisión de diseño deliberadamente conservadora: un dependiente necesita
**tanto** una evaluación de elegibilidad completa **como** todos los
soportes documentales requeridos antes de que cualquiera de los dos motores
lo considere.

La UI (`DependentsPanel.tsx`) pide al analista un único selector: *"¿Cómo
obtienes tus rentas de trabajo?"* (relación laboral vs. independiente) —
**el motor decide qué beneficios aplican; la interfaz nunca pregunta
directamente por el artículo**.

## 6. Wiring en el Formulario 210

`buildForm210Draft` (en `packages/form-210/src/builder.ts`) recibe
opcionalmente `dependentsAdditional` (salida ya resuelta de coexistencia,
producida por `buildArticle336Input` en `dependentsEngine.ts`) y:

1. Llama a `computeDependentsAdditionalDeduction`.
2. Fija las fuentes de las casillas 138 y 139 **antes** de que se construya
   el array `boxes` (que lee `sourcesByBox` para el `suggestedValue`
   inicial) y **antes** de que corra el motor genérico de `computeFormula`
   (que resuelve 91/92/93 leyendo los valores ya poblados vía `getValue()`).
   Este orden de ejecución es crítico — invertirlo produce casillas 91-93
   con valores obsoletos en la primera pasada.
3. Conserva la computación completa en
   `Form210PreliminaryLiquidation.dependentsAdditionalDeduction`.

Las casillas 91/92/93 (consolidación de la cédula general) y 138/139 se
marcan `implementedUnverified` porque su numeración algebraica proviene de
una fuente secundaria (ver `FORM_210_RULESET_2025.md`), no de una cita
literal verificada del instructivo DIAN.

## 7. Persistencia (Dexie v14)

`apps/web/src/lib/db.ts` añade, de forma aditiva:

- `taxDependents` — registros `TaxDependent`.
- `dependentSupports` — soportes documentales por dependiente.
- `dependentEvaluations` — resultado persistido de evaluar elegibilidad y coexistencia.
- `dependentsCaseContext` — contexto por expediente: naturaleza de ingresos
  (`employmentIncomeNature`) y bandera `noDependentsDeclared`.

`repository.ts` expone CRUD completo (`createTaxDependent`,
`updateTaxDependent`, `archiveTaxDependent`, gestión de soportes,
`saveDependentsCaseContext`, `setNoDependentsDeclared`,
`recalculateDependentEvaluation`, `confirmDependentEvaluation`,
`reviewStaleDependentEvaluation`) y extiende `rebuildForm210Draft` para
recuperar dependientes/contexto y pasarlos a `buildForm210Draft`.

`recalculateDependentEvaluation` marca una evaluación previa como
`stale_due_to_rule_change` (en vez de sobreescribirla silenciosamente)
cuando el registro base o las reglas cambiaron desde la última evaluación
confirmada — preservando el historial para revisión humana
(`reviewStaleDependentEvaluation`).

## 8. Tareas del expediente (`CaseTaskType`)

`packages/domain/src/caseTasks.ts` añade tipos de tarea derivados del
estado de cada dependiente (soporte faltante, evaluación pendiente de
revisión, evaluación obsoleta, elección de beneficio requerida para
independientes, etc.), con `source: 'dependent'` y campo `dependentId`
para trazabilidad. `apps/web/src/lib/taxCaseAnalysis.ts` los deriva en
`buildCaseTasks`.

## 9. UI (`DependentsPanel.tsx`)

Vista `beneficios-dependientes` dentro de la etapa Declaración. Incluye:

- Selector de naturaleza de ingresos laborales (define coexistencia).
- Estado vacío con dos acciones: "Agregar dependiente" / "No tengo
  dependientes" (esta última cierra el estado del expediente sin exigir
  registros — el banner de confirmación se muestra siempre que la lista
  esté vacía, corrigiendo un bug de Fase C donde solo aparecía si ya había
  dependientes).
- Tarjetas de dependiente con documento enmascarado, beneficios
  potenciales y estado de elegibilidad.
- Formulario de alta/edición seccionado; modo avanzado con panel de
  detalle normativo (fuente, artículo, fórmula).

**Límite conocido**: la adjunción de un archivo de la biblioteca documental
como soporte de un dependiente aún no tiene una acción de UI dedicada — los
campos estructurales (`documentLibraryFileId`) existen en el modelo pero el
flujo de "reutilizar biblioteca documental" se completará en una fase
posterior.

## 10. Verificación

- `packages/aegis-rules`: 167/167 tests (incluye 11 de `dependents.ts`
  corregido, 11 de `dependents-additional-336.ts`, 8 de
  `dependents-coexistence.ts`, 17 de `dependent-eligibility.ts`).
- `packages/form-210`: 89/89 tests (incluye 5 nuevos de R91-93/138/139).
- `apps/web`: 99/99 unit/component tests (incluye 5 de repository, 4 de
  `DependentsPanel`, 1 de `taxCaseAnalysis`).
- E2E (`apps/web/tests-e2e/dependents.spec.ts`): 2/2 escenarios —
  alta/evaluación/cupo de 4, y flujo "No tengo dependientes".

## 11. Fuera de alcance de esta fase

- Adjuntar documentos de la biblioteca como soporte de un dependiente
  desde la UI (campo estructural listo, acción pendiente).
- El 1 % de facturación electrónica como posible componente de R92 en
  lugar de R39 (discrepancia detectada en la fuente secundaria consultada,
  documentada pero **no aplicada** — requiere verificación adicional antes
  de tocar R39, que ya está verificado contra un fixture real).
- Casilla 89 (posible subcédula de honorarios) — hallazgo abierto de la
  Fase B0, no resuelto aquí.
