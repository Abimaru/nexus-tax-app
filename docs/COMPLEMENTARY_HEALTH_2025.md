# Salud complementaria y medicina prepagada AG 2025

Sprint 2.4, Fase H. Rama `feature/sprint-2.4-health-deductions`.

## Auditoría normativa

Texto vigente del art. 387 ET (verificado literalmente, no depende de blogs):

> "[...] los pagos por salud, siempre que el valor a disminuir mensualmente
> [...] no supere dieciséis (16) UVT mensuales [...]
> a. Los pagos efectuados por contratos de prestación de servicios a
> empresas de medicina prepagada vigiladas por la Superintendencia
> Nacional de Salud, que impliquen protección al trabajador, su cónyuge,
> sus hijos y/o dependientes.
> b. Los pagos efectuados por seguros de salud, expedidos por compañías de
> seguros vigiladas por la Superintendencia Financiera de Colombia, con la
> misma limitación del literal anterior."

Puntos clave verificados directamente del texto legal:

- El límite de **16 UVT mensuales** es **un único tope agregado** para el
  contribuyente — literal (b) dice explícitamente "con la misma limitación
  del literal anterior", es decir, medicina prepagada y seguros de salud
  **comparten** el mismo tope mensual, no cada uno el suyo.
- El tope cubre al contribuyente, su cónyuge, sus hijos y/o dependientes —
  también un tope agregado, nunca 16 UVT por cada beneficiario.
- Los pagos deben hacerse a una entidad vigilada por la Superintendencia
  Nacional de Salud (medicina prepagada) o la Superintendencia Financiera
  de Colombia (seguros de salud).
- Esta es una deducción **distinta** de la deducción por dependientes
  económicos (10 % de ingresos, hasta 32 UVT mensuales/384 UVT anuales)
  regulada en el mismo artículo — ambas son independientes entre sí.

**Fuentes registradas** en
`packages/aegis-rules/.../official-sources.ts`:

- `et-art-387` (actualizado en esta fase para aclarar que regula DOS
  deducciones distintas bajo el mismo artículo).
- `et-art-387-par-2-salud` (nueva, cita textual verbatim del literal (a)/(b)).

**Limitación documentada**: la numeración exacta del artículo reglamentario
del Decreto 1625 de 2016 que desarrolla los requisitos de control (entidad
vigilada) no se verificó con una fuente primaria confiable durante esta
fase — el requisito se documenta directamente desde el texto del art. 387
ET, que es autosuficiente para esta regla. Si se necesita la cita exacta
del decreto en una fase futura, debe verificarse contra el normograma
oficial antes de citarla.

## Regla AG 2025 — el límite es MENSUAL

UVT 2025: **49.799 COP**. Cap mensual: **16 UVT = 796.784 COP** (redondeado).
El equivalente anual de **192 UVT** (16 × 12) **NUNCA es la regla
primaria**: es la equivalencia matemática de acumular el tope mensual
durante los 12 meses completos del año, derivada en código a propósito
(`ANNUAL_CAP_UVT_HEALTH = MONTHLY_CAP_UVT_HEALTH * MONTHS_PER_YEAR_HEALTH`)
para que ambos valores nunca puedan divergir — el mismo patrón ya usado
para la deducción de dependientes (`ANNUAL_CAP_UVT_TOTAL` en `dependents.ts`).

## Modelo de dominio (`packages/domain/src/complementaryHealth.ts`)

`ComplementaryHealthPayment` — pago candidato de medicina prepagada,
seguro de salud o plan adicional de salud:

- `productType`: `prepaid_medicine | health_insurance | additional_health_plan | other | unknown`.
- `beneficiary`: `taxpayer | spouse_or_partner | child | dependent | unknown`.
  Cuando es `dependent`, `beneficiaryDependentId` debe apuntar a un
  `TaxDependent` **ya existente** (reutiliza el dominio de dependientes de
  Fase C; nunca crea un segundo registro de personas ni asume elegibilidad
  solo por la relación textual).
- `month: number | null` (1-12) — mes del pago. `null` únicamente cuando
  el pago proviene de un certificado anual **sin** detalle mensual
  recuperable.
- `coveragePeriodDescription: string | null` — período de cobertura
  declarado por el certificado (p. ej. "Enero-Diciembre 2025"), cuando
  existe pero **no** permite derivar el mes exacto. Distingue dos
  situaciones distintas que el prompt de esta fase pide separar: "no sé
  nada del período" (ambos campos `null`) vs. "sé el período de cobertura
  pero no puedo desglosarlo mes a mes" (`month: null`,
  `coveragePeriodDescription` con texto).
- `isMandatoryEpsContribution` / `isDirectMedicalExpense` — marcas
  explícitas de exclusión (§9/§10 del prompt): nunca se infieren
  automáticamente del nombre del proveedor.
- `eligibilityStatus` — nunca un booleano; ver más abajo.
- `eligibleAmountCop` — valor considerado tras aplicar el tope mensual
  agregado; `null` hasta el primer cálculo.
- `possiblyDuplicateOfPaymentId` — guardarraíl de doble conteo (p. ej. el
  mismo mes capturado dos veces desde un pago mensual y desde el detalle
  de un certificado anual).

`PROPERTY_TYPE`/`ProductTypeSchema` de `@nexus-tax/domain` gana un nuevo
valor `health_plan` para los candidatos documentales de esta fase.

## Motor de elegibilidad individual (`packages/aegis-rules/.../complementary-health-eligibility.ts`)

`evaluateComplementaryHealthPaymentEligibility` decide si un pago **puede
participar** del agregado mensual. Orden de evaluación:

1. posible duplicado → `requires_review` (antes que cualquier otro criterio);
2. aporte obligatorio a EPS → `not_applicable` (§9: `mandatory_health_contribution != complementary_health_payment`, NUNCA se suma al tope de medicina prepagada ni se presenta como tal);
3. gasto médico pagado directamente (consulta, odontología, medicamentos,
   hospital, cirugía) → `not_applicable` (§10: motor conservador, nunca lo
   asume deducible por un mecanismo distinto al art. 387 ET);
4. tipo de producto sin definir/otro → `requires_review`;
5. beneficiario sin definir → `requires_beneficiary_review`;
6. beneficiario = dependiente sin vincular a un `TaxDependent` existente
   → `requires_beneficiary_review` (§4/§14);
7. sin mes conocido → `requires_monthly_breakdown` (§7/§8: nunca se asume
   dividir el total entre 12);
8. soporte insuficiente/parcial → `requires_support` (§11: certificado o
   comprobante de la entidad vigilada, nunca se exige factura electrónica
   como única forma de soporte);
9. si todo lo anterior se cumple → `eligible` (candidato listo para el
   agregado mensual; el estado final tras aplicar el tope se decide en el
   siguiente motor).

21 tests en `packages/aegis-rules/tests/complementary-health.test.ts`.

## Motor del tope mensual agregado (`packages/aegis-rules/.../complementary-health-monthly-cap.ts`)

`evaluateComplementaryHealthMonthlyCap` recibe **solo** pagos que ya
pasaron la validación individual (con `month` conocido) y aplica, por cada
mes con pagos declarados:

```
eligibleMonth = min(totalPaidCop_delMes, 16 UVT)
annualEligible = sum(eligibleMonth para cada mes)
```

Cuando varios pagos comparten el mismo mes y superan el tope, el valor
considerado se reparte **proporcionalmente** a la participación de cada
pago en el total pagado ese mes — un criterio determinista y neutral que
no privilegia arbitrariamente a un proveedor sobre otro cuando ambos
reportan el mismo mes (§6 del prompt: "Proveedor A enero: 500.000,
Proveedor B enero: 500.000 → NO permitir 1.000.000, aplicar cap agregado
mensual").

Nunca calcula `16 UVT × 12` como total anual directo: el equivalente anual
solo se expone como derivado (`ANNUAL_CAP_UVT_HEALTH`), nunca como una
constante independiente que pudiera divergir del mensual.

## Integración con dependientes (§14/§15 del prompt)

Reutiliza el dominio de `TaxDependent` existente (Fase C) — **no** crea un
segundo registro de personas. Cuando `beneficiary === 'dependent'`, el
repositorio (`recalculateComplementaryHealthCap`) verifica que
`beneficiaryDependentId` apunte a un dependiente **activo**; si no,
`requires_beneficiary_review` y se genera una tarea accionable.

**Distinción conceptual explícita (§15)**: nunca se confunden tres
beneficios relacionados pero conceptualmente distintos, todos bajo o
asociados al art. 387/336 ET:

1. Deducción por dependientes económicos (art. 387 ET, 10 % de ingresos,
   hasta 32 UVT mensuales/384 UVT anuales) — `dependentsDeduction`.
2. Adición por dependientes (art. 336 num. 3 ET, 72 UVT por dependiente,
   máximo cuatro) — `dependentsAdditionalDeduction`.
3. Salud complementaria (art. 387 ET, 16 UVT mensuales agregados) —
   `complementaryHealthDeduction`, esta fase.

Las tres son **independientes** entre sí, se calculan por separado y
nunca se multiplican por cantidad de dependientes ni se fusionan en un
único candidato.

## Integración con el Formulario 210

Casilla **39** ("Otras deducciones imputables", `employment_income`) —
misma casilla que ya recibía la deducción de dependientes (art. 387).
`complementaryHealthDeduction` se cablea como una fuente **adicional e
independiente** (`sourceId: 'calc:complementary-health-387'`), **sumada,
nunca fusionada**, con `calc:dependents-387`. Ambas siguen siendo
deducciones distintas del mismo artículo.

El límite conjunto de la cédula general (40 %/1.340 UVT, casilla 41 =
`min(40% × 34, 1.340 UVT, 37 + 40)`) se aplica **una sola vez**, sobre la
SUMA ya calculada de la casilla 40 (= 38 + 39) — nunca se vuelve a aplicar
un límite adicional dentro del motor de salud complementaria. El tope
mensual de 16 UVT y el límite cedular del 40 %/1.340 UVT son capas
distintas que actúan en secuencia, no en paralelo (§16 del prompt: "no
aplicar dos veces el límite").

**No se inventó ninguna casilla nueva** (§17): se auditó el flujo actual y
se confirmó que la casilla 39 ya está diseñada para recibir "otras
deducciones imputables" de rentas de trabajo, incluida explícitamente
"salud prepagada" en su descripción normativa desde antes de esta fase
(ver `packages/form-210/src/validation-matrix-2025.ts`).

Solo se cablea cuando: elegibilidad resuelta (`eligible`/`cap_applied`),
soporte suficiente, tope mensual calculable (mes conocido) — la decisión
humana (`decisionStatus`) se conserva por separado para el "impacto
preliminar confirmado" mostrado en la UI, pero el valor orientativo del
Formulario 210 refleja el candidato ya validado individualmente y limitado
por el tope, siguiendo el mismo patrón que `dependentsDeduction` (que
tampoco exige una confirmación humana explícita por dependiente antes de
cablear la casilla 39 — es un candidato orientativo, revisable).

## Adaptador documental (`co.complementary-health.generic`)

Reconoce certificados de medicina prepagada/seguros de salud (nuevo
`DocumentKind` `complementary_health_certificate`). Dos reglas
independientes: `monthly-payment` (pago mensual) y `annual-total` (total
del certificado) — nunca infiere `mensual × 12`. Evita promover número de
póliza, identificación, teléfono, resolución o porcentaje: al no existir
una regla para esas etiquetas, esas líneas nunca generan un candidato
monetario (verificado con un test dedicado). 7 tests en
`packages/document-intelligence/tests/complementaryHealth.test.ts`.

## Tareas del expediente

6 tipos de tarea nuevos (`source: 'complementary_health'`, ver
`docs/CASE_TASKS.md`).

## UI (`ComplementaryHealthPanel.tsx`)

Vista `declaracion/salud-complementaria`. Pregunta simple: "¿Pagaste
medicina prepagada, seguro de salud o un plan adicional de salud durante
2025?" Si sí: proveedor, quién estaba cubierto, mes (o período de
cobertura si no se conoce el mes exacto), valor, soporte. Explica: "Este
beneficio tiene un límite mensual, por eso necesitamos saber en qué meses
hiciste los pagos." Modo avanzado muestra el desglose mes a mes con
lenguaje simple ("Pagaste en enero: X, Máximo aplicable: 16 UVT, Valor
considerado: Y"), reutilizando el mismo cálculo que produce el motor real
(`preliminaryLiquidation.complementaryHealthDeduction`), nunca
recalculado en la UI.

## Guardarraíles de doble conteo (§9/§10 del prompt)

- **Aporte obligatorio EPS**: marcado explícitamente
  (`isMandatoryEpsContribution`), nunca se suma al tope de medicina
  prepagada ni se presenta como tal.
- **Gasto médico directo**: marcado explícitamente
  (`isDirectMedicalExpense`), siempre `not_applicable`.
- **Duplicado entre pagos**: `possiblyDuplicateOfPaymentId` fuerza
  `requires_review` con prioridad `high` en la tarea correspondiente.
- **Eliminar un pago recalcula todo el expediente**: el tope mensual es
  agregado por mes entre TODOS los pagos del caso, así que
  `recalculateComplementaryHealthCap` siempre recalcula desde cero (nunca
  arrastra un reparto proporcional obsoleto).

## Tests

- `packages/aegis-rules/tests/complementary-health.test.ts` (21 tests):
  motor de tope mensual (A-G, K-M del prompt) y motor de elegibilidad
  individual (H-M).
- `packages/domain/tests/complementaryHealth.test.ts` (7 tests): esquema
  de dominio.
- `packages/document-intelligence/tests/complementaryHealth.test.ts` (7
  tests): adaptador documental.
- `apps/web/src/lib/complementaryHealth.test.ts` (10 tests de
  integración): H/I/J/N/O del prompt, incluida la coexistencia con
  dependientes y la ausencia de doble conteo al eliminar pagos.
- `apps/web/src/lib/taxCaseAnalysis.test.ts` (+7 tests): derivación de
  los 6 tipos de tarea nuevos.
- `packages/form-210/tests/preliminary-liquidation.test.ts` (+4 tests):
  cableado a la casilla 39, suma (no fusión) con dependientes, tope
  mensual aplicado antes de sumarse a R39.

## E2E

`apps/web/tests-e2e/complementary-health.spec.ts` (2 escenarios, capturas
desktop/móvil): dos meses (uno bajo el tope, otro que lo supera), cálculo
explicado en modo avanzado, confirmación, persistencia tras recarga; y
dependiente sin vincular queda en revisión de beneficiario.

## Sample sintético

`apps/web/src/lib/goldenCase.ts` se extiende con salud complementaria
(§23 del prompt): medicina prepagada del contribuyente en dos meses (uno
bajo el tope, otro que lo supera) y un seguro de salud del dependiente ya
registrado en el golden case, vinculado explícitamente. Ver
`docs/SYNTHETIC_SAMPLE_CASE.md`.

## Limitaciones

- La numeración exacta del artículo reglamentario del Decreto 1625 de
  2016 (requisito de entidad vigilada) no se verificó contra el
  normograma oficial en esta fase (ver "Auditoría normativa" arriba).
- El reparto proporcional del tope mensual entre varios proveedores del
  mismo mes es una decisión de diseño razonable pero no está explícitamente
  prescrita por el art. 387 ET (que no contempla el caso de múltiples
  proveedores) — se documenta como la interpretación más neutral posible.
- La UI no ofrece todavía un selector para vincular un pago a un registro
  exógeno o hecho documental existente (solo entrada manual), igual que
  ocurre hoy con `RentalIncome` en el módulo de inmuebles (Fase G).
