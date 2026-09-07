# Inmuebles, renta inmobiliaria y administración de propiedad horizontal AG 2025

Sprint 2.4, Fase G. Rama `feature/sprint-2.4-properties`.

## Principio inviolable

> `propiedad del inmueble != gasto deducible`

Ser propietario de un apartamento, casa, parqueadero, depósito o local **nunca**, por sí solo,
sugiere administración, predial, mantenimiento, reparaciones, seguros o intereses como gasto
deducible. El flujo completo siempre es:

```
hecho → contexto (uso, período, ingreso) → elegibilidad potencial → soporte
→ decisión humana → impacto tributario trazable
```

`PropertyExpense.eligibilityStatus` nunca es un booleano `deductible = true/false`: es uno de seis
estados explicables (`potentially_deductible`, `not_applicable`, `requires_context`,
`requires_support`, `requires_allocation`, `requires_review`), siempre acompañado de razones en
español. La confirmación final (`decisionStatus`) es **siempre** una decisión humana explícita
posterior — nunca se autoconfirma.

## Modelo de dominio (`packages/domain/src/property.ts`)

- **`TaxProperty`** — inmueble de la persona natural. `use` (`personal_residence`, `rented`,
  `business_use`, `mixed`, `vacant`, `other`, `unknown`) inicia siempre en lo que el analista
  elija explícitamente; nunca se infiere de otros datos (p. ej. de que existan ingresos exógenos).
  No guarda dirección exacta: `label` es una referencia humana (p. ej. "Apartamento principal") y
  `locationMasked`, si se conserva, debe llegar ya enmascarado (regla de privacidad §30 del
  prompt).
- **`RentalActivity`** — período real de arrendamiento/actividad económica. Separado del inmueble
  a propósito: `property.use === 'rented'` **no** implica los 12 meses del año — el período puede
  ser parcial (p. ej. un inmueble arrendado solo 7 meses).
- **`RentalIncome`** — **enlace de lectura**, nunca un segundo libro de ingresos. `sourceKind` es
  `exogenous_record`, `document_fact` o `manual`; para los dos primeros, `amountCop` es una copia
  de presentación de una fuente que ya existe (registro exógeno o hecho documental confirmado) —
  la fuente de verdad y cualquier suma agregada siguen viviendo donde siempre vivieron
  (`results`/`facts`), nunca se duplica el valor en ningún agregado. Solo `manual` almacena un
  valor propio, para cuando el ingreso todavía no está en ninguna de esas fuentes.
- **`PropertyExpense`** — gasto candidato de un inmueble. Incluye `supportStatus`/`supportTypes`
  (evidencia), `allocationMethod`/`allocationPercentage` (solo relevante en uso mixto),
  `isExtraordinary` (cuota extraordinaria de administración, nunca mezclada con la ordinaria), y
  dos guardarraíles de doble conteo: `possiblyDuplicateOfExpenseId` (otro `PropertyExpense`, p. ej.
  el mismo concepto capturado como mensual y como total anual) y `relatedFactId` (un `DocumentFact`
  ya confirmado que podría representar el mismo concepto, p. ej. intereses de vivienda ya
  modelados por `housing_interest_certificate`).

`PROPERTY_SCHEMA_VERSION = '2.4.0'`.

## Motor de elegibilidad (`packages/aegis-rules/.../property-expense-eligibility.ts`)

`evaluatePropertyExpenseEligibility` es puro (sin DOM, sin red, sin React) y conservador. Orden de
evaluación:

1. **Posible duplicado** (§26) → siempre `requires_review` antes que cualquier otro criterio.
2. **Cuota extraordinaria de administración** → siempre `requires_review`; nunca se trata igual
   que la ordinaria.
3. **Residencia personal** → siempre `not_applicable` (fundamento: ET art. 107 — sin actividad
   generadora de renta, no hay relación de causalidad/necesidad que sustente el gasto).
4. **Uso vacante/otro/desconocido** → `requires_context`: falta definir el contexto tributario.
5. **Uso mixto sin asignación explícita** → `requires_allocation`: nunca se asume 50 % por
   defecto ni ningún porcentaje sin que el analista lo confirme.
6. **Arrendado/mixto(ya asignado)/uso económico sin período definido** → `requires_context`:
   nunca se asumen los 12 meses del año.
7. **Sin ingreso por arrendamiento conciliado para el mismo período** → `requires_context`: la
   relación de causalidad con la actividad generadora de renta aún no está confirmada.
8. **Soporte insuficiente/parcial/en revisión** → `requires_support`. Para administración de PH,
   el texto explícitamente aclara que no se exige factura (ver más abajo); para el resto,
   `requires_support` genérico (fundamento: ET art. 743).
9. Si todo lo anterior se cumple → `potentially_deductible`, siempre sujeto a decisión humana
   posterior.

16 tests (`packages/aegis-rules/tests/property-expense-eligibility.test.ts`) cubren cada rama,
incluida la prioridad del duplicado sobre cualquier otro criterio y una comprobación explícita de
que el estado nunca es un booleano.

### Administración de propiedad horizontal: nunca exige factura

Fundamento normativo (registrado en `official-sources.ts`):

- **Decreto 1625 de 2016, art. 1.3.1.13.5** — la cuota de administración de una copropiedad es un
  **aporte a capital**, no una venta ni una prestación de servicios; no es un hecho generador de
  IVA.
- **Oficio DIAN 912878 de 2021** — confirma que la copropiedad **no está obligada** a expedir
  factura electrónica por el cobro de cuotas de administración, ordinarias o extraordinarias.

Por eso `ADMINISTRATION_FEE_SUFFICIENT_SUPPORT_TYPES` lista soportes idóneos alternativos: cuenta
de cobro, certificado de la copropiedad, recibo o comprobante/extracto de pago — **nunca** una
factura. El adaptador documental, el motor de elegibilidad y la UI comparten este mismo lenguaje;
un test dedicado (`propertyAdministration.test.ts`) verifica que la palabra "factura" no aparece en
ninguna regla del adaptador.

## Adaptador documental (`co.property-administration.generic`)

Reconoce certificados/cuentas de cobro de administración de PH (nuevo `DocumentKind`
`property_administration_certificate`). Cinco reglas **independientes**, nunca derivadas unas de
otras: `extraordinary-fee`, `annual-total`, `monthly-fee`, `balance` (informativo, nunca un
candidato de gasto — un saldo no es un gasto pagado) y `payments`. Explícitamente **prohibido**:
`mensual × 12` como sustituto de un total anual real. 7 tests en
`packages/document-intelligence/tests/propertyAdministration.test.ts`.

## Persistencia (Dexie v16)

Migración aditiva: 4 tablas nuevas (`taxProperties`, `rentalActivities`, `rentalIncomes`,
`propertyExpenses`), sin tocar las versiones 1-15. Repositorio (`apps/web/src/lib/repository.ts`):

- `getTaxProperties`/`createTaxProperty`/`updateTaxProperty`/`deleteTaxProperty`
- `getRentalActivities`/`createRentalActivity`/`removeRentalActivity`
- `getRentalIncomes`/`linkRentalIncome`/`removeRentalIncome`
- `getPropertyExpenses`/`createPropertyExpense`/`updatePropertyExpense`/`decidePropertyExpense`/
  `removePropertyExpense`
- `recalculatePropertyExpenseEligibility` — recalcula en cascada cada vez que cambia el inmueble
  (uso), la actividad de arrendamiento (período) o el ingreso vinculado; se invoca automáticamente
  desde `updateTaxProperty`, `createRentalActivity`, `removeRentalActivity`, `linkRentalIncome` y
  `removeRentalIncome`. Nunca escribe al Formulario 210.

## Doble conteo — guardarraíles (§26 del prompt)

- **Mensual vs. total anual del mismo concepto**: al crear un segundo `PropertyExpense` con
  `possiblyDuplicateOfExpenseId` apuntando al primero, el motor devuelve `requires_review` de
  inmediato, sin importar que el resto del contexto esté completo.
- **Intereses de vivienda ya confirmados como hecho documental**: si un `PropertyExpense` de tipo
  `mortgage_interest` tiene `relatedFactId` apuntando a un `DocumentFact` ya confirmado (p. ej.
  `housing_interest_certificate`), también queda en `requires_review` — nunca se suman ambos.
- **Predial como activo vs. gasto**: el valor catastral/fiscal vive en `TaxProperty`
  (`cadastralValue`/`fiscalValue`), separado de cualquier `PropertyExpense.expenseType ===
  'property_tax'` — no hay ningún camino de código que sume ambos.

12 tests de integración (`apps/web/src/lib/property.test.ts`) cubren: vivienda personal nunca
deducible, arrendado con período/ingreso/soporte → potencialmente deducible con confirmación
humana, uso mixto sin asignación → `requires_allocation`, administración sin factura, cuota
extraordinaria siempre en revisión, duplicado siempre en revisión, intereses de vivienda
duplicados, eliminación en cascada del inmueble y sus dependencias, recálculo en cascada al
cambiar uso/período/ingreso, y eliminación de un gasto individual sin afectar los demás.

## Tareas del expediente

Ver `docs/CASE_TASKS.md` §"Inmuebles, renta inmobiliaria y administración de propiedad horizontal
(Sprint 2.4, Fase G)" para los 6 tipos de tarea nuevos (`source: 'property'`).

## UI (`PropertiesPanel.tsx`)

Vista `declaracion/inmuebles`. Flujo: agregar inmueble (nombre/referencia enmascarada, tipo, uso,
% de propiedad) → si el uso implica arrendamiento, registrar período(s) y vincular ingreso →
agregar gastos candidatos (tipo, valor, soporte, asignación si el uso es mixto, marca de cuota
extraordinaria) → el motor calcula la elegibilidad potencial de inmediato → si es
`potentially_deductible`, el analista confirma o descarta explícitamente. Modo avanzado muestra las
razones completas del motor y un "impacto preliminar" informativo (suma de gastos confirmados),
explícitamente marcado como no incorporado todavía al Formulario 210. Catálogos en español para
todos los enums en `apps/web/src/lib/propertyLabels.ts` (nunca se interpola un valor de enum
crudo).

## Limitación explícita: sin integración con el Formulario 210 (todavía)

Esta fase **no** escribe ningún valor de `PropertyExpense`/`RentalIncome` a ninguna casilla del
Formulario 210. Las casillas 58 ("Ingresos brutos de rentas de capital") y 60 ("Costos y
deducciones procedentes de rentas de capital") ya existen en el ruleset `FORM_210_BOXES_2025`
(estructurales/verificadas) pero **no tienen ninguna fórmula que las alimente** hoy — ni antes ni
después de esta fase. `packages/form-210` no se tocó en este incremento. El "impacto preliminar"
mostrado en `PropertiesPanel` es puramente informativo, calculado y presentado dentro del propio
panel, sin persistirse en `Form210Draft`.

Motivo de esta decisión de alcance: el prompt de Fase G (§25) exige explícitamente distinguir
"candidato ≠ hecho tributario ≠ deducción aplicada", y cablear una casilla del Formulario 210 exige
una decisión normativa adicional (cómo mapear `expenseType`/`use` a la fórmula de la casilla 60,
si existe un tope, cómo reconciliar contra el registro exógeno de "arrendamientos" si existe, etc.)
que merece su propia revisión dedicada, no una decisión apresurada dentro de esta fase. Queda
documentado como trabajo pendiente para una fase futura.

## Fuentes oficiales

- **ET art. 107** — causalidad, necesidad y proporcionalidad de cualquier costo/deducción
  asociado a una actividad productora de renta.
- **ET art. 743** — idoneidad de la prueba: la ley no exige un único tipo de documento (p. ej.
  factura) cuando no lo exige expresamente para ese hecho.
- **Decreto 1625 de 2016, art. 1.3.1.13.5** — cuotas de administración de PH = aporte a capital,
  no facturable.
- **Oficio DIAN 912878 de 2021** — confirma la no obligación de facturación electrónica para
  cuotas de administración de PH, ordinarias o extraordinarias.

## Quality gate

`check:encoding`, `pnpm -r typecheck`, `pnpm -r lint`, `pnpm -r test` (domain 36, aegis-rules 191,
document-intelligence 182, exogenous-parser 87, form-210 93, web 147 — incluye los 12 tests nuevos
de integración de inmuebles y los 5 de esquema de dominio), `pnpm build`, `pnpm test:e2e` (17/17,
incluye el nuevo `properties.spec.ts`) — todo en verde.
