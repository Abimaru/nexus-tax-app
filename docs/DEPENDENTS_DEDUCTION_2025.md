# Deducción por dependientes — Artículo 387 ET (AG 2025)

_Última actualización: 2026-09-06 — Sprint 2.4, Fase C (incluye revisión normativa puntual)._

> Este documento cubre únicamente el **Beneficio A** (art. 387 ET). El
> beneficio adicional de 72 UVT (art. 336 num. 3 ET), el modelo completo de
> `TaxDependent`, la elegibilidad y la coexistencia entre ambos beneficios
> se documentan en [`DEPENDENTS_BENEFITS_2025.md`](./DEPENDENTS_BENEFITS_2025.md).

## 1. Alcance

`packages/aegis-rules` modela la deducción por dependientes económicos del
art. 387 del Estatuto Tributario. `packages/form-210` la consume desde
`buildForm210Draft`: cablea la deducción calculada a la casilla 39 del
borrador y la conserva en `preliminaryLiquidation.dependentsDeduction` con
todos los candidatos limitantes para trazabilidad.

Todo es orientativo y sujeto a revisión humana. NexusTax no verifica la
elegibilidad de cada dependiente por sí solo en este motor — esa evaluación
vive en `dependent-eligibility.ts` (ver `DEPENDENTS_BENEFITS_2025.md`).

## ⚠️ Corrección normativa (Sprint 2.4, Fase C)

La implementación anterior (Sprint 2.3.1) multiplicaba el tope de 32 UVT
mensuales / 384 UVT anuales **por el número de dependientes elegibles**
(hasta 4), permitiendo un tope efectivo de 4 × 384 = 1.536 UVT. Esto era
incorrecto: la doctrina es explícita en que el tope es **agregado para el
contribuyente**, no por dependiente — "la deducción es la misma si se tiene
un solo dependiente, cuatro o cinco" (Gerencie, guía de renta 2025;
confirmado por Tributi). El número de dependientes tampoco tiene un máximo
para este artículo específico (a diferencia del art. 336 num. 3, que sí
limita a 4).

La corrección está en `packages/aegis-rules/tests/dependents.test.ts`
(prueba `CORRECCIÓN Fase C`) y en el motor (`dependents.ts`).

## ✅ Revisión normativa puntual (Sprint 2.4, Fase C, segunda auditoría)

Antes de cerrar la Fase C se ejecutó una revisión dedicada para confirmar
que la corrección anterior no reemplazó el bug de escalado por un nuevo
error (una simplificación incorrecta del cálculo mensual/anual). Hallazgos:

1. **Fórmula implementada**: `appliedDeductionCop = min(10 % × ingreso bruto
   anual, coveredMonths × 32 UVT, 384 UVT)`, donde `coveredMonths` es el
   máximo de `monthsClaimed` entre los dependientes declarados (nunca la
   suma). Confirmado correcto: coincide con la regla primaria mensual de
   32 UVT, sin escalar por conteo de dependientes.
2. **¿Mensual o agregado anual?** El motor calcula un **agregado anual**
   (no simula retención mensual con ingreso variable mes a mes): el
   candidato de porcentaje usa el ingreso bruto **anual** ya consolidado
   (casilla 32). Esto es consistente con el resto del proyecto, que solo
   liquida declaraciones anuales, nunca retenciones mensuales. El tope
   mensual de 32 UVT se usa exclusivamente para determinar cuántos MESES de
   cobertura de dependiente están disponibles (`coveredMonths`), no para
   fraccionar el ingreso.
3. **Meses parciales**: `clampMonths` acota cada `monthsClaimed` a
   `[0, MONTHS_PER_YEAR]`; el tope mensual aplicable es
   `coveredMonths × 32 UVT`, prorrateando correctamente cuando un
   dependiente calificó menos de 12 meses.
4. **Varios dependientes**: `coveredMonths` toma el **máximo** entre
   dependientes, nunca la suma ni se multiplica por `dependentsEligibleCount`
   (que ya no tiene cupo — todos los dependientes declarados participan).
5. **Derivación del máximo anual**: **corregido en esta revisión**. Antes,
   `ANNUAL_CAP_UVT_TOTAL = 384` era una constante independiente (numéricamente
   correcta, pero no estructuralmente derivada). Ahora:
   ```ts
   export const MONTHLY_CAP_UVT_TOTAL = 32;       // regla primaria (fuente de verdad)
   export const MONTHS_PER_YEAR = 12;
   export const ANNUAL_CAP_UVT_TOTAL = MONTHLY_CAP_UVT_TOTAL * MONTHS_PER_YEAR; // equivalencia derivada
   ```
   Esto garantiza que el límite mensual sea la única fuente de verdad y que
   el anual nunca pueda divergir de él por un error de mantenimiento futuro.
   Verificado por la prueba dedicada `REVISIÓN NORMATIVA: 384 UVT es una
   equivalencia DERIVADA...`.
6. **Tests que prueban 2, 3 y 4 dependientes explícitamente**: se agregó
   `it.each([1, 2, 3, 4])(...)` en `dependents.test.ts`, confirmando que el
   tope agregado (`monthlyCapCandidateCop`, `annualCapCandidateCop`,
   `appliedDeductionCop`) es idéntico para 1, 2, 3 y 4 dependientes con 12
   meses completos — antes solo se comparaba 1 contra 6.
7. **Tests de 6 meses, 12 meses e ingresos variables**: además de los tests
   preexistentes (12 meses/ingreso bajo → `percentage`; 12 meses/ingreso
   alto → `monthly_cap`; 6 meses/ingreso alto → `monthly_cap`), se agregaron
   dos escenarios nuevos: 6 meses con ingreso bajo (confirma que
   `percentage` puede ganar incluso con cobertura parcial) y un barrido de
   tres niveles de ingreso (30M/60M/500M) con 12 meses, confirmando el
   candidato limitante correcto en cada nivel. La "variabilidad mensual del
   ingreso dentro del año" no es representable en el modelo actual (la API
   solo admite un agregado anual, no ingreso por mes) — documentado como
   límite de alcance, no como defecto: el proyecto no liquida retenciones.

**Documentación desactualizada corregida en la misma revisión**: los
comentarios JSDoc de `DependentsDeductionComputation` en
`packages/aegis-rules/src/types.ts` todavía describían la doctrina
incorrecta ("32 UVT mensuales y 384 UVT anuales **POR DEPENDIENTE**" y "el
motor cuenta hasta cuatro dependientes... los primeros cuatro se toman")
— un rastro documental del bug ya corregido en el código pero nunca
actualizado en los tipos. Corregido para reflejar la regla vigente.

**Fuentes oficiales registradas** (antes solo citadas en JSDoc, ahora en
`OFFICIAL_SOURCES_2025`): `et-art-387`, `et-art-336-num-3`,
`decreto-1625-2016-art-1.2.1.20.3` (texto vigente tras su sustitución) y
`decreto-2231-2023` (decreto modificatorio). Verificado con el texto
literal del Decreto 2231 de 2023 (normograma.dian.gov.co): *"un mismo
dependiente solo dará lugar a una de estas dos deducciones, excepto cuando
se tenga rentas provenientes de una relación laboral y legal o
reglamentaria, caso en el cual se podrá aplicar ambas deducciones por un
mismo dependiente"* — coincide exactamente con lo ya implementado en
`dependents-coexistence.ts`, sin discrepancias.

**Art. 336 num. 3 ET (72 UVT/dependiente)**: revisado y confirmado sin
discrepancias. No se modificó (72 UVT × dependiente, máx. 4, fuera del
límite 40 %/1.340 UVT, "en adición" al art. 387).

## 2. Regla (corregida)

El art. 387 ET permite deducir el **10 %** de los ingresos brutos por rentas
de trabajo del contribuyente, con un tope **total para el contribuyente**
(no por dependiente):

- **32 UVT mensuales** totales (`MONTHLY_CAP_UVT_TOTAL`) — regla primaria.
- **384 UVT anuales** totales (`ANNUAL_CAP_UVT_TOTAL`) — equivalencia
  derivada de `MONTHLY_CAP_UVT_TOTAL × 12` meses completos, no una
  constante independiente.

El art. 387 **no fija un número máximo de dependientes**: basta con tener al
menos uno calificado para habilitar el beneficio. El tope mensual/anual se
calcula sobre `coveredMonths`, el mayor número de meses declarado entre los
dependientes (basta con tener al menos uno calificado ese mes).

Categorías compartidas con el art. 336 num. 3 ET (mismo parágrafo 2 del
art. 387 ET):

| `kind` | Descripción |
|---|---|
| `child_minor` | Hijos hasta 18 años. |
| `child_studying_18_23` | Hijos estudiando financiados por el contribuyente. **Corrección (Ley 2411 de 2024):** el rango de edad se amplió de 18-23 a **18-25 años**, vigente para AG2025. El identificador se conserva por compatibilidad; el rango correcto vive en `CHILD_STUDENT_MAX_AGE` de `dependent-eligibility.ts`. |
| `child_disabled` | Hijos mayores de 18 con dependencia física/psicológica certificada. |
| `spouse_no_income` | Cónyuge o compañero(a) permanente sin ingresos o con ingresos < 260 UVT anuales. |
| `parent_or_sibling_low_income` | Padres/hermanos económicamente dependientes con ingresos < 260 UVT anuales. |
| `foster_family` (Fase C) | Familiar de crianza — requiere evaluación caso a caso. |
| `other_review` (Fase C) | Otro sujeto a revisión manual. |

La deducción efectiva es el **mínimo** entre los tres candidatos:


```
appliedDeductionCop = min(
  10 % × ingresos_brutos_trabajo,
  coveredMonths × 32 UVT,
  384 UVT
)
```

El resultado indica cuál candidato fue el limitante (`percentage`,
`monthly_cap`, `annual_cap`).

## 3. Contrato del motor

`packages/aegis-rules/src/colombia/individual-income-tax/2025/dependents.ts`:

```ts
export const DEPENDENTS_DEDUCTION_SOURCE_ID = 'et-art-387';
export const DEPENDENTS_INCOME_PERCENTAGE = 0.1;
export const MONTHLY_CAP_UVT_TOTAL = 32;
export const ANNUAL_CAP_UVT_TOTAL = 384;

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
`dependentsEligibleCount` (ahora siempre igual a `dependentsProvidedCount`:
no hay cupo de 4 en este artículo), los tres `*CandidateCop`,
`appliedDeductionCop`, `bindingCandidate`, `formula`, `ruleSourceId` y el
detalle por dependiente (`monthlyCapContributionCop`, informativo, no se
suma para el total).

Bases negativas se tratan como cero.

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

Warning automático:

- `Los dependientes declarados no producen deducción: la casilla 32 no
  tiene ingresos brutos de rentas de trabajo aún.` cuando no hay ingresos
  para aplicar el 10 %.

El campo `dependents` de `Form210BuildInput` lo produce
`apps/web/src/lib/dependentsEngine.ts` (`buildArticle387Input`) a partir de
los dependientes almacenados y la resolución de coexistencia — nunca desde
el `TaxDependent` crudo directamente (ver `DEPENDENTS_BENEFITS_2025.md`).

## 5. Verificación

Motor puro — `packages/aegis-rules/tests/dependents.test.ts` (18 pruebas):

- Constantes normativas verificadas (10 %, 32 y 384 UVT totales).
- **Revisión normativa puntual**: `ANNUAL_CAP_UVT_TOTAL === MONTHLY_CAP_UVT_TOTAL × MONTHS_PER_YEAR` (384 es una equivalencia derivada, no una constante independiente).
- Sin dependientes → deducción 0.
- Un dependiente con ingreso bajo: 10 % es el candidato limitante.
- Ingreso alto (12 meses): tope mensual = anual; `monthly_cap` gana por
  precedencia del reduce.
- Dependiente parcial (6 meses) reduce el tope mensual proporcionalmente.
- **Corrección Fase C**: 1 dependiente y 6 dependientes producen el MISMO
  tope aplicado (384 UVT total, no escalado).
- **Revisión normativa puntual**: `it.each([1, 2, 3, 4])` — 1, 2, 3 y 4
  dependientes con 12 meses producen el MISMO tope agregado.
- **Revisión normativa puntual**: 6 meses con ingreso bajo ⇒ `percentage`
  gana (no el tope prorrateado); barrido de tres niveles de ingreso
  (30M/60M/500M) con 12 meses confirma el limitante correcto en cada nivel.
- No hay límite de conteo a cuatro (el art. 387 no lo fija).
- `coveredMonths` usa el máximo entre dependientes, no la suma.
- `monthsClaimed` fuera de rango se clampa a `[0, 12]`.
- Ingresos negativos → 0.
- Año no modelado ⇒ excepción.

Coexistencia — `packages/aegis-rules/tests/dependents-coexistence.test.ts`:
verifica que `DEPENDENTS_COEXISTENCE_SOURCE_ID` está registrado en
`OFFICIAL_SOURCES_2025` (junto con el decreto modificatorio
`decreto-2231-2023`), cerrando un vacío de trazabilidad detectado en la
revisión normativa puntual.

Integración F-210 — `packages/form-210/tests/preliminary-liquidation.test.ts`:

- Ingreso 60M + un dependiente completo ⇒ casilla 39 recibe 6M
  (`sourceId = 'calc:dependents-387'`); `dependentsDeduction` con
  `bindingCandidate = 'percentage'` y `ruleSourceId = 'et-art-387'`.
- Seis dependientes ⇒ `dependentsEligibleCount = 6` (sin cupo), mismo tope
  aplicado que con uno solo.
- Sin ingresos de trabajo ⇒ deducción 0 y warning específico.

**Resultado de la revisión normativa puntual (ejecutado el 2026-09-06)**:
`aegis-rules` 174/174 tests (antes 167/167: +7 nuevos), `form-210` 89/89
(sin cambios, ya cubierto), typecheck y lint limpios en ambos paquetes y en
`apps/web`.

## 6. Fuera de alcance de este documento

- **Elegibilidad** (edad, ingresos, certificaciones, parentesco) — ver
  `dependent-eligibility.ts` y `DEPENDENTS_BENEFITS_2025.md`.
- **El beneficio adicional de 72 UVT** (art. 336 num. 3 ET) — motor
  independiente, ver `DEPENDENTS_BENEFITS_2025.md`.
- **Coexistencia entre ambos beneficios** — ver
  `dependents-coexistence.ts` y `DEPENDENTS_BENEFITS_2025.md`.
- **Certificados soporte** (registro civil, certificación médica). Se
  gestionan en la biblioteca documental existente.
- **Ingresos brutos ≠ casilla 32**. La regla toma los ingresos brutos ya
  cargados en la casilla 32 al momento del cálculo. Si el analista registra
  nuevas fuentes de trabajo después, debe recomputar el borrador.
- **Interacción con el límite del art. 336 ET**. La deducción por
  dependientes se agrega a la casilla 39 (subcomponente de 40) y por
  tanto entra al cálculo consolidado de 41 con el mismo tope conjunto de
  40 % + 1.340 UVT (a diferencia de la adición de 72 UVT, que queda fuera).
