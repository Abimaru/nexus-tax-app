# Deducción por dependientes (AG 2025)

_Última actualización: 2026-08-07 — Fase F del Sprint 2.3.1._

## 1. Alcance

`packages/aegis-rules` modela la deducción por dependientes económicos del
art. 387 del Estatuto Tributario. `packages/form-210` la consume desde
`buildForm210Draft`: cablea la deducción calculada a la casilla 39 del
borrador y la conserva en `preliminaryLiquidation.dependentsDeduction` con
todos los candidatos limitantes para trazabilidad.

Todo es orientativo y sujeto a revisión humana. NexusTax no verifica la
elegibilidad de cada dependiente (edad, ingresos, certificaciones,
parentesco) — esa clasificación la aporta el analista.

## 2. Regla

El art. 387 ET permite deducir el **10 %** de los ingresos brutos por rentas
de trabajo del contribuyente, con dos topes por dependiente calificado:

- **32 UVT mensuales** por dependiente (`MONTHLY_CAP_UVT_PER_DEPENDENT`).
- **384 UVT anuales** por dependiente (`ANNUAL_CAP_UVT_PER_DEPENDENT`).

La doctrina limita el beneficio a **máximo cuatro dependientes** por
contribuyente (`DEPENDENTS_MAX_ELIGIBLE`). Los dependientes calificados son:

| `kind` | Descripción |
|---|---|
| `child_minor` | Hijos hasta 18 años. |
| `child_studying_18_23` | Hijos entre 18 y 23 años estudiando. |
| `child_disabled` | Hijos mayores de 18 con dependencia física/psicológica certificada. |
| `spouse_no_income` | Cónyuge o compañero(a) permanente sin ingresos o con ingresos < 260 UVT anuales. |
| `parent_or_sibling_low_income` | Padres/hermanos económicamente dependientes con ingresos < 260 UVT anuales. |

La deducción efectiva es el **mínimo** entre los tres candidatos:

```
appliedDeductionCop = min(
  10 % × ingresos_brutos_trabajo,
  Σ (32 UVT × meses_calificados) por dependiente elegible,
  dependientes_elegibles × 384 UVT
)
```

El resultado indica cuál candidato fue el limitante (`percentage`,
`monthly_cap`, `annual_cap`).

## 3. Contrato del motor

`packages/aegis-rules/src/colombia/individual-income-tax/2025/dependents.ts`:

```ts
export const DEPENDENTS_DEDUCTION_SOURCE_ID = 'et-art-387';
export const DEPENDENTS_INCOME_PERCENTAGE = 0.1;
export const DEPENDENTS_MAX_ELIGIBLE = 4;
export const MONTHLY_CAP_UVT_PER_DEPENDENT = 32;
export const ANNUAL_CAP_UVT_PER_DEPENDENT = 384;

export function computeDependentsDeduction(input: {
  taxYear: number;
  dependents: readonly DependentDeclaration[];
  grossEmploymentIncomeCop: number;
}): DependentsDeductionComputation;
```

`DependentDeclaration` (ver `packages/aegis-rules/src/types.ts`):

```ts
interface DependentDeclaration {
  id: string;
  kind: DependentKind;
  monthsClaimed: number;   // clampado a [0, 12]
  notes?: string;
}
```

`DependentsDeductionComputation` expone `dependentsProvidedCount`,
`dependentsEligibleCount`, los tres `*CandidateCop`, `appliedDeductionCop`,
`bindingCandidate`, `formula`, `ruleSourceId` y el detalle por
dependiente (`monthlyCapContributionCop`).

Bases negativas se tratan como cero. Cuando se declaran más de cuatro
dependientes, los primeros cuatro entran en la deducción y el excedente se
reporta en `dependentsProvidedCount` para que la UI pueda advertirlo.

## 4. Integración en el borrador del F-210

`Form210BuildInput` acepta un campo opcional `dependents`:

```ts
buildForm210Draft({
  caseId: 'case-1',
  taxYear: 2025,
  records,
  facts,
  dependents: [
    { id: 'dep-1', kind: 'child_minor', monthsClaimed: 12 },
    { id: 'dep-2', kind: 'spouse_no_income', monthsClaimed: 12 },
  ],
});
```

Cuando se aportan dependientes, el builder:

1. Calcula los ingresos brutos de rentas de trabajo sumando las sources ya
   acumuladas en la casilla 32.
2. Llama a `computeDependentsDeduction`.
3. Si `appliedDeductionCop > 0`, inyecta una fuente de tipo `calculation`
   con `sourceId = 'calc:dependents-387'` en la casilla 39. La casilla
   suma esta deducción con cualquier otro `possible_deduction` que ya la
   alimentara.
4. Conserva la computación en
   `Form210PreliminaryLiquidation.dependentsDeduction` con todos los
   candidatos limitantes.

Warnings automáticos:

- `Se declararon N dependientes; solo los primeros 4 entran en la deducción
  del art. 387 ET.` cuando `provided > eligible`.
- `Los dependientes declarados no producen deducción: la casilla 32 no
  tiene ingresos brutos de rentas de trabajo aún.` cuando no hay ingresos
  para aplicar el 10 %.

## 5. Verificación

Motor puro — `packages/aegis-rules/tests/dependents.test.ts`:

- Constantes normativas verificadas (10 %, 4 dependientes, 32 y 384 UVT).
- Sin dependientes → deducción 0.
- Un dependiente con ingreso bajo: 10 % es el candidato limitante.
- Ingreso alto (12 meses): tope mensual = anual; `monthly_cap` gana por
  precedencia del reduce.
- Dependiente parcial (6 meses) reduce el tope mensual proporcionalmente.
- Más de cuatro dependientes: sólo se toman los cuatro primeros.
- `monthsClaimed` fuera de rango se clampa a `[0, 12]`.
- Ingresos negativos → 0.
- Año no modelado ⇒ excepción.

Integración F-210 — `packages/form-210/tests/preliminary-liquidation.test.ts`:

- Ingreso 60M + un dependiente completo ⇒ casilla 39 recibe 6M
  (`sourceId = 'calc:dependents-387'`); `dependentsDeduction` con
  `bindingCandidate = 'percentage'` y `ruleSourceId = 'et-art-387'`.
- Seis dependientes ⇒ `provided = 6`, `eligible = 4`, warning de cupo.
- Sin ingresos de trabajo ⇒ deducción 0 y warning específico.

Sweep local: `pnpm -r typecheck` verde; `pnpm -r test` = 303 tests OK
(aegis 70, form-210 24, resto sin regresiones).

## 6. Fuera de alcance

- **Elegibilidad**. NexusTax no verifica edad, ingresos, certificaciones ni
  parentesco. La `kind` la aporta el analista.
- **Certificados soporte** (registro civil, sentencia, certificación
  médica). Se gestionan en la biblioteca documental; la matriz de
  validación no bloquea por su ausencia hoy.
- **Ingresos brutos ≠ casilla 32**. La regla toma los ingresos brutos
  ya cargados en la casilla 32 al momento del cálculo. Si el analista
  registra nuevas fuentes de trabajo después, debe recomputar el borrador.
- **Interacción con el límite del art. 336 ET**. La deducción por
  dependientes se agrega a la casilla 39 (subcomponente de 40) y por
  tanto entra al cálculo consolidado de 41 con el mismo tope conjunto de
  40 % + 1.340 UVT. Esa interacción ya está modelada por la Fase D.
