# Plan — Sprint 2.3.1: validación tributaria y liquidación preliminar

Rama: `feature/sprint-2.3.1-tax-validation-liquidation` (creada desde `main` el
2026-08-02). Alcance: completar el borrador del Formulario 210 AG 2025 con
fuentes normativas y liquidación preliminar, sin salir del dispositivo, sin
presentar y sin convertir NexusTax en asesoría tributaria definitiva.

Estado: **cerrado y verificado el 2026-08-08**. Este documento conserva la
línea base, el orden de ejecución y las decisiones de alcance de las 24 fases
técnicas A–X.

## 1. Inventario honesto (línea base)

Rama base: `main`. `packages/form-210/src`:

- `types.ts` (129 líneas): `Form210BoxDefinition`, `Form210BoxValue`,
  `Form210Draft`, `Form210SourceTrace`, `Form210ValidationFinding`,
  `Form210BuildInput`. Cubre las capas mínimas del borrador.
- `ruleset-2025.ts` (128 líneas): ~40 casillas modeladas. Solo las de suma/resta
  entre secciones tienen `ruleComplete: true` (31, 34, 37, 40, 42, 61, 78, 101,
  103, 115). El resto son placeholders sin fórmula.
- `builder.ts` (383 líneas): mapa `TaxCategory → boxNumber`, traces por
  registro/hecho, sumas por casilla y una tabla local `computeFormula` para las
  sumas entre casillas. **No calcula impuesto** ni tarifas.

`packages/aegis-rules/src/colombia/individual-income-tax/2025`:

- `filing-obligation.ts` define `UVT_2025 = 49_799` y evalúa la obligación por
  criterios OR (ver panel [FilingObligationPanel.tsx](../apps/web/src/components/case/FilingObligationPanel.tsx)).
- `deadlines-2026.ts` y `sources.ts` documentan calendario y fuentes.

### 1.1 Casillas modeladas hoy (por sección)

- **Patrimonio:** 29, 30, 31.
- **Rentas de trabajo:** 32-42.
- **Rentas de capital:** 58-67.
- **Rentas no laborales:** 74-84.
- **Pensiones:** 99-103.
- **Dividendos:** 104.
- **Ganancias ocasionales:** 112-115.
- **Liquidación privada (parcial):** 130 (anticipo), 131 (saldo anterior), 132
  (retenciones).

### 1.2 Casillas con fórmula completa (`ruleComplete === true`)

31, 34, 37, 40, 42, 61, 78, 101, 103, 115, 32, 58, 74, 99, 112, 132 (algunas
como "detectada" sin fórmula legal validada — `implemented_unverified`).

### 1.3 Ausencias importantes

- **Renta líquida cedular / gravable** (compensación entre cédulas).
- **Tarifa progresiva de renta y ganancias ocasionales** (impuesto en pesos y
  UVT, brackets).
- **Impuesto neto de renta, total impuesto a cargo.**
- **Anticipo año siguiente** (regla y años de historia).
- **Saldo a favor anterior confirmado.**
- **Retenciones consolidadas por origen** (trabajo/capital/otros).
- **Dependientes** (modelo de datos y validación por meses).
- **Factura electrónica** (base susceptible, porcentaje preliminar, límite).
- **Deducciones limitadas** (25% + 1340 UVT, intereses vivienda con límite,
  aportes AFC/AVC/FVP con topes).
- **UVT como contrato único** (`TaxUnitDefinition`).
- **Catálogo consolidado de fuentes oficiales**
  (`OfficialSourceReference` + checksum/versión).
- **Cálculo de impacto de decisiones** (`ResolutionImpact`).
- **Simulación** sin persistir.
- **Validaciones cruzadas** (patrimonio, retenciones, saldos).
- **Exportación** con ruleset + fuentes + liquidación.

### 1.4 Fuentes hoy

- `FORM_210_SOURCES_2025` (packages/form-210): 3 URLs a documentos DIAN 2025.
- `FILING_RULE_SOURCES_2025` (packages/aegis-rules): fuentes para topes de
  obligación (probablemente distintas). **Sin catálogo único.**

### 1.5 UVT hoy

- `UVT_2025 = 49_799` en `packages/aegis-rules/src/colombia/individual-income-tax/2025/filing-obligation.ts`.
- Consumido por el `assessFilingObligation` y algunos tests.
- **`packages/form-210` no lo importa** — no usa UVT porque no calcula tarifas
  aún. Cuando se implementen tarifas, se usa desde aquí.

## 2. Riesgo declarado

Las 24 fases (A→X) se cerraron en iteraciones pequeñas con **fuentes oficiales
por regla, ejemplos manuales y pruebas sintéticas**. Esto no equivale a una
validación profesional independiente de toda declaración real: cualquier
fórmula que todavía carezca de verificación normativa completa permanece como
`implemented_unverified` y nunca se presenta como resultado definitivo.

## 3. Plan por fases

### Fase 0 — Preparación (bloque actual)

- [x] Crear rama `feature/sprint-2.3.1-tax-validation-liquidation`.
- [x] Inventario honesto del ruleset actual.
- [x] Crear este documento.
- [x] Ejecutar A–X en iteraciones independientes y conservar trazabilidad por fase.

### Fase A — Auditoría normativa del ruleset (esta sesión)

- Definir `Form210RuleValidation` en `packages/form-210`.
- Materializar la matriz para las ~40 casillas actuales con status:
  - `verified` si la fórmula es aritmética simple entre casillas del formulario
    oficial (31 = 29 - 30, etc.) y la fuente es el formulario DIAN publicado.
  - `implemented_unverified` para fórmulas presentes pero sin verificación
    normativa por regla concreta.
  - `not_implemented` para el resto (rentas exentas limitadas, tarifa, etc.).
- Salida: nuevo archivo `packages/form-210/src/validation-matrix-2025.ts`
  exportado desde el índice del paquete, más doc
  `docs/TAX_RULE_VALIDATION_MATRIX.md`.

### Fase B — Catálogo versionado de fuentes oficiales (esta sesión)

- Definir `OfficialSourceReference` en `packages/aegis-rules` (dominio común).
- Consolidar las fuentes existentes de aegis-rules y form-210 en un catálogo
  único: `OFFICIAL_SOURCES_2025` con `id`, `authority`, `title`, `url`, `date`,
  `verifiedAt`, `taxYear`, `scope`, `relatedBoxNumbers`.
- Reexportar y consumir por id (`sourceId` en las reglas del ruleset).

### Fase C — UVT como fuente única (esta sesión)

- Definir `TaxUnitDefinition` en `aegis-rules`.
- Reexportar `getTaxUnit(taxYear)` y consumir desde `form-210` y
  `apps/web`.
- Mantener `UVT_2025` como alias interno por retro-compatibilidad, marcado
  como deprecated.

### Fases D-X — entregadas en iteraciones independientes

Cada fase se ejecutó como una iteración funcional propia. Orden entregado:

1. **D ✅ Cédula general** — ingresos, no constitutivos, renta líquida cedular.
2. **E ✅ Limitaciones declarativas** (`TaxLimitRule`).
3. **F ✅ Dependientes** — modelo de datos + validaciones.
4. **G ✅ Factura electrónica** — porcentaje y límite.
5. **H ✅ Ganancias ocasionales** — impuesto separado.
6. **I ✅ Patrimonio** — validaciones saldo/movimiento.
7. **J ✅ Tarifa progresiva** (`ProgressiveTaxBracket`).
8. **K ✅ Liquidación privada** — impuesto neto, total a cargo, saldo.
9. **L ✅ Anticipo** — regla versionada con años de historia.
10. **M ✅ Saldo a favor anterior** — confirmación humana.
11. **N ✅ Retenciones consolidadas.**
12. **O ✅ Estados separados** (obligación / borrador / liquidación / presentación).
13. **P ✅ Vista "Liquidación preliminar"** con expansión por casilla.
14. **Q ✅ Impacto de decisiones** (`ResolutionImpact`).
15. **R ✅ Simulación controlada** (previsualizar + confirmar).
16. **S ✅ Tareas** — tarea por casilla faltante.
17. **T ✅ Validaciones cruzadas.**
18. **U ✅ Exportación** del bundle con ruleset, fuentes y liquidación.
19. **V ✅ Fixtures sintéticos** y flujo tributario integrado.
20. **W ✅ Casos manuales verificados.**
21. **X ✅ E2E** — flujo completo y responsive.

## 4. Fuera de alcance del sprint (recordatorio explícito)

- Conexión con DIAN, MUISCA, firma electrónica, presentación oficial.
- Backend, IA externa, autenticación.
- Recomendaciones tributarias irrevocables.
- Sanciones automáticas (`K` menciona que ingresan solo manualmente).

## 5. Convenciones

- Commits por intención (`docs/COMMIT_CONVENTIONS.md`).
- Verificación mínima por bloque: `pnpm --filter … typecheck` + `lint` +
  tests del paquete afectado.
- **No** correr `pnpm build` mientras el dev del preview (puerto 3100) o el del
  usuario esté activo, para no romper el `.next`. Usar directorio alterno si se
  requiere build explícito.

## 6. Estado

- **2026-08-07 22:30** — Fase N entregada. Retenciones consolidadas por
  origen (art. 373 ET).
  - **N ✅** Nuevos tipos `WithholdingOrigin`, `WithholdingSource`,
    `WithholdingOriginBreakdown`, `DuplicateWithholdingPair` y
    `WithholdingConsolidation` en aegis-rules; módulo puro
    `withholdings.ts` con `consolidateWithholdings` y detección de
    duplicados por retenedor con tolerancia relativa 1 %.
  - Fuente `et-art-373` añadida al catálogo con
    `relatedBoxNumbers: [132]`.
  - `Form210BuildInput.withholdingsBreakdown` opcional. El builder toma
    los records de `category === 'withholding'`, arma `WithholdingSource[]`
    con `entityTaxId` del record y ejecuta la consolidación. Si la
    casilla 132 tiene valor por ajuste manual que supera la suma de
    records, agrega una fuente sintética `box:132:manual`.
    `preliminaryLiquidation.withholdings` conserva la consolidación
    completa; `withholdingsCop` deriva de `totalReportedCop`.
  - Warnings automáticos: retenciones sin certificado, pares
    sospechosos de duplicidad, desglose que no coincide con el total.
  - Tests: 10 en `packages/aegis-rules/tests/withholdings.test.ts`
    (total cero, suma con soporte, negativos, duplicados con y sin
    retenedor, entradas sin entityTaxId ignoradas, desglose coincidente,
    desglose con discrepancia, año no modelado) + 3 nuevos en
    `preliminary-liquidation.test.ts` (consolidación con duplicados,
    validación de desglose, respeto de ajuste manual).
  - Doc nueva: `docs/WITHHOLDINGS_CONSOLIDATION_2025.md`;
    `FORM_210_LIQUIDATION.md` actualizado con
    `withholdings.ruleSourceId` en la sección de trazabilidad.
  - Validación: `pnpm -r typecheck` verde; sweep `pnpm -r test` con
    366 tests OK (aegis 118/118 con 10 nuevos, form-210 39/39 con 3
    nuevos, resto sin regresiones).
  - **Fuera de alcance de N (documentado):** inferencia automática del
    origen desde `secondaryUses`, cruce automático con certificados
    documentales, retenciones especiales de dividendos con tarifa
    propia, numeración oficial de las casillas de retención por cédula.

- **2026-08-07 22:20** — Fase M entregada. Saldo a favor del año anterior
  (art. 850 ET) con confirmación humana obligatoria.
  - **M ✅** Nuevos tipos `PriorYearBalanceStatus` y
    `PriorYearBalanceEvaluation` en aegis-rules; módulo puro
    `prior-year-balance.ts` con `evaluatePriorYearBalance`. Cuatro estados
    posibles: `no_declared`, `pending_confirmation`,
    `blocked_by_pending_request`, `applied`.
  - Fuente `et-art-850` añadida al catálogo `OFFICIAL_SOURCES_2025` con
    `relatedBoxNumbers: [131]`.
  - `Form210BuildInput.priorYearBalance` opcional
    (`declaredCop`, `confirmedByAnalyst`,
    `hasPendingCompensationOrRefundRequest`, `priorYearFilingDate`,
    `evidence`). El builder consume el motor: `priorYearBalanceCop` deja
    de leer directamente la casilla 131 y pasa a usar `appliedCop`. El
    resultado completo se expone en
    `preliminaryLiquidation.priorYearBalance`.
  - Warnings automáticos por `pending_confirmation`,
    `blocked_by_pending_request` y por casilla 131 con valor sin contexto
    aportado.
  - Tests: 6 en `packages/aegis-rules/tests/prior-year-balance.test.ts`
    (los cuatro estados, normalización de negativos, año no modelado) +
    4 nuevos en `preliminary-liquidation.test.ts` (aplicado con
    confirmación, `pending_confirmation`, `blocked_by_pending_request`,
    casilla 131 con valor pero sin contexto).
  - Doc nueva: `docs/PRIOR_YEAR_BALANCE_2025.md`;
    `FORM_210_LIQUIDATION.md` actualizado con
    `priorYearBalance.ruleSourceId` en la sección de trazabilidad.
  - Validación: `pnpm -r typecheck` verde; sweep `pnpm -r test` con
    352 tests OK (aegis 108/108 con 6 nuevos, form-210 36/36 con 4
    nuevos, resto sin regresiones).
  - **Fuera de alcance de M (documentado):** verificación DIAN de la
    existencia del saldo, rastreo multi-año automático del uso previo,
    numeración oficial de la casilla del saldo del año actual.

- **2026-08-07 16:05** — Fase E entregada. Limitaciones declarativas por
  concepto (AFC/AVC/FVP, intereses de vivienda, medicina prepagada).
  - **E ✅** Nuevos tipos `IndividualDeductionLimitRule` e
    `IndividualDeductionLimitComputation` en aegis-rules; módulo puro
    `individual-deductions.ts` con las tres reglas (`afc-fvp-avc-2025`,
    `housing-interest-2025`, `prepaid-medicine-2025`), el catálogo
    `INDIVIDUAL_DEDUCTION_LIMIT_RULES_2025`, `getIndividualDeductionLimitRule`
    y `applyIndividualDeductionLimit` con candidatos `declared`,
    `percentage`, `uvt_cap`.
  - Fuentes añadidas al catálogo: `et-art-126-1`, `et-art-126-4` y
    `et-art-119`. La medicina prepagada reutiliza `et-art-387`.
  - `Form210BuildInput.individualDeductions` opcional
    (`afcFvpAvcCop`, `housingInterestCop`, `prepaidMedicineCop`). El
    builder aplica cada regla, cablea el aplicado a la casilla objetivo
    (35, 38, 39) como fuente `calculation` y expone las computaciones en
    `preliminaryLiquidation.individualDeductionLimits`. Cuando
    `bindingCandidate !== 'declared'`, emite un finding
    `unsupported_deduction` con severidad `warning`.
  - Tests: 11 en
    `packages/aegis-rules/tests/individual-deductions.test.ts` (reglas,
    ramas de recorte de AFC, tope de vivienda, tope de medicina,
    normalización de negativos, año no modelado) + 1 nuevo en
    `preliminary-liquidation.test.ts` (integración con 3 deducciones
    declaradas simultáneas y warnings de exceso).
  - Doc nueva: `docs/INDIVIDUAL_DEDUCTIONS_2025.md`;
    `FORM_210_LIQUIDATION.md` actualizado con
    `individualDeductionLimits[].ruleSourceIds` en la sección de
    trazabilidad.
  - Validación: `pnpm -r typecheck` verde; sweep `pnpm -r test` con
    342 tests OK (aegis 102/102 con 11 nuevos, form-210 32/32 con 1
    nuevo, resto sin regresiones).
  - **Fuera de alcance de E (documentado):** verificación de soportes,
    distribución entre cédulas (asume trabajo por defecto), interacción
    con art. 336 (ya modelada por Fase D), otras rentas
    exentas/deducciones (cesantías, aportes obligatorios) que se sumarán
    cuando su topografía en el F-210 se verifique con el instructivo.

- **2026-08-07 15:55** — Fase G entregada. Deducción por facturas
  electrónicas (art. 336-1 ET, Ley 2277 de 2022).
  - **G ✅** `ElectronicInvoicingDeductionComputation` en
    `packages/aegis-rules/src/types.ts`; módulo puro
    `electronic-invoicing.ts` con constantes
    (`ELECTRONIC_INVOICING_PERCENTAGE = 0.01`,
    `ELECTRONIC_INVOICING_ANNUAL_CAP_UVT = 240`) y
    `computeElectronicInvoicingDeduction`.
  - Regla: `min(1 % × compras_con_FE, 240 UVT)` con
    `bindingCandidate` explícito (`percentage` | `uvt_cap`) y redondeo al
    peso más cercano por candidato.
  - Fuente `et-art-336-1` añadida al catálogo `OFFICIAL_SOURCES_2025`
    con `relatedBoxNumbers: [39]`.
  - `Form210BuildInput` acepta `electronicInvoicing` opcional
    (`{ purchasesWithElectronicInvoiceCop }`). El builder ejecuta el motor
    y cablea la deducción como fuente `calc:electronic-invoicing-336-1`
    en la casilla 39; la deducción se acumula con la de dependientes.
    La computación queda en
    `preliminaryLiquidation.electronicInvoicingDeduction`.
  - Tests: 7 en `packages/aegis-rules/tests/electronic-invoicing.test.ts`
    (constantes, sin compras, 1 % bajo tope, 1 % excede tope,
    negativos → 0, redondeo, año no modelado) + 3 nuevos en
    `preliminary-liquidation.test.ts` (cablea a la casilla 39 y a la
    liquidación, respeta el tope de 240 UVT, coexiste con dependientes).
  - Doc nueva: `docs/ELECTRONIC_INVOICING_2025.md`;
    `FORM_210_LIQUIDATION.md` actualizado con
    `electronicInvoicingDeduction.ruleSourceId` en la sección de
    trazabilidad.
  - Validación: `pnpm -r typecheck` verde; sweep `pnpm -r test` con
    331 tests OK (aegis 91/91 con 7 nuevos, form-210 31/31 con 3 nuevos,
    resto sin regresiones).
  - **Fuera de alcance de G (documentado):** verificación de requisitos
    legales (factura vigente, medio de pago electrónico, NIT), cruce
    automático con exógena para inferir la base
    (`electronic_invoicing_total`), distribución entre cédulas (asume
    aplicación en la 39), interacción explícita con art. 336 (ya modelada
    por la Fase D vía casilla 41).

- **2026-08-07 15:45** — Fase I entregada. Validaciones patrimoniales
  (art. 261 ET).
  - **I ✅** Nuevos tipos `PatrimonySourceCandidate`,
    `LiabilityWithoutAssetCheckResult`,
    `MovementWithoutBalanceCheckResult`,
    `DuplicatePatrimonyPair` y `DuplicatePatrimonyCheckResult` en
    `packages/aegis-rules/src/types.ts`. Módulo puro
    `patrimony-checks.ts` con constantes
    (`PATRIMONY_MOVEMENT_SIGNIFICANCE_UVT = 100`,
    `PATRIMONY_DUPLICATE_RELATIVE_TOLERANCE = 0.01`) y funciones
    `detectLiabilityWithoutAsset`, `detectMovementWithoutBalance`,
    `detectDuplicatePatrimonyEntries`.
  - Fuente `et-art-261` añadida al catálogo con
    `relatedBoxNumbers: [29, 30, 31]`.
  - `Form210ValidationFinding['code']` extendido con tres códigos
    nuevos: `liability_without_asset`, `movement_without_balance`,
    `duplicate_patrimony_entry`. El `validate()` del builder invoca las
    tres funciones puras y emite un finding por regla disparada, con
    boxNumbers y sourceIds correctamente vinculados.
  - Tests: 14 en `packages/aegis-rules/tests/patrimony-checks.test.ts`
    (constantes, cada rama de cada regla, tolerancias configurables,
    normalización de acentos/mayúsculas, umbral en UVT) + 4 nuevos en
    `packages/form-210/tests/builder.test.ts` (deuda sin activo,
    movimientos sin patrimonio, duplicado por label similar y caso
    consistente sin hallazgos).
  - Doc nueva: `docs/PATRIMONY_CHECKS_2025.md`.
  - Validación: `pnpm -r typecheck` verde; sweep `pnpm -r test` con
    321 tests OK (aegis 84/84 con 14 nuevos, form-210 28/28 con 4
    nuevos, resto sin regresiones).
  - **Fuera de alcance de I (documentado):** exclusiones del art. 261,
    valor patrimonial neto por tipo de activo (acciones, inmuebles,
    moneda extranjera), aumento patrimonial no justificado
    (art. 236 ET) — requiere historial multi-año, cruce por
    `productId` (no está hoy en `PatrimonySourceCandidate`).

- **2026-08-07 15:35** — Fase F entregada. Deducción por dependientes
  (art. 387 ET).
  - **F ✅** `DependentKind`, `DependentDeclaration`,
    `DependentDeductionDetail` y `DependentsDeductionComputation` en
    `packages/aegis-rules/src/types.ts`. Módulo puro `dependents.ts` con
    constantes (`DEPENDENTS_INCOME_PERCENTAGE = 0.1`,
    `DEPENDENTS_MAX_ELIGIBLE = 4`, `MONTHLY_CAP_UVT_PER_DEPENDENT = 32`,
    `ANNUAL_CAP_UVT_PER_DEPENDENT = 384`) y
    `computeDependentsDeduction`. Fuente `et-art-387` añadida al catálogo
    con `relatedBoxNumbers: [39]`.
  - Regla: `min(10 % × ingresos_trabajo, Σ 32 UVT × meses,
dependientes_elegibles × 384 UVT)` con máximo 4 dependientes por
    contribuyente. El motor no valida elegibilidad (edad, ingresos,
    certificaciones); la clasificación la aporta el analista.
  - `Form210BuildInput` acepta `dependents` opcional. El builder calcula
    los ingresos brutos de rentas de trabajo desde la casilla 32,
    ejecuta el motor y cablea el resultado a la casilla 39 como fuente
    de tipo `calculation` con `sourceId = 'calc:dependents-387'`. La
    computación queda en `preliminaryLiquidation.dependentsDeduction`.
  - Warnings automáticos cuando se declaran más de 4 dependientes o
    cuando no hay ingresos de trabajo para aplicar el 10 %.
  - Tests: 9 en `packages/aegis-rules/tests/dependents.test.ts` (constantes
    normativas, sin dependientes, límite por porcentaje, límite por tope
    mensual con 12 meses, dependiente parcial (6 meses), tope de 4
    dependientes, clampeo de meses, negativos, año no modelado) + 3 nuevos
    en `preliminary-liquidation.test.ts` (cablea a casilla 39 y a la
    liquidación, warning por 6 dependientes, warning cuando no hay
    ingresos).
  - Doc nueva: `docs/DEPENDENTS_DEDUCTION_2025.md`;
    `FORM_210_LIQUIDATION.md` actualizado con `dependentsDeduction` en la
    sección de trazabilidad.
  - Validación: `pnpm -r typecheck` verde; sweep `pnpm -r test` con
    303 tests OK (aegis 70/70 con 9 nuevos, form-210 24/24 con 3 nuevos,
    resto sin regresiones).
  - **Fuera de alcance de F (documentado):** verificación de elegibilidad,
    certificados soporte, ingresos brutos ≠ casilla 32 (recomputar al
    cargar nuevas fuentes), interacción explícita con el art. 336 (ya
    modelada por la Fase D vía casilla 41).

- **2026-08-07 10:20** — Fase L entregada. Anticipo del año siguiente
  (art. 807 ET).
  - **L ✅** `AdvancePaymentBaseMethod`, `AdvancePaymentBracket` y
    `AdvancePaymentComputation` en `packages/aegis-rules/src/types.ts`;
    módulo puro `advance-payment.ts` con `ADVANCE_PAYMENT_BRACKETS_2025`
    (25 % / 50 % / 75 %) y `computeAdvancePayment`.
  - El motor elige el método más conservador de la base: `average_of_two`
    cuando hay historial y su promedio es mayor o igual al impuesto del
    año actual; `current_only` en el resto de casos. Retenciones del año
    se restan del bruto sin volverlo negativo.
  - Fuente `et-art-807` añadida al catálogo `OFFICIAL_SOURCES_2025`.
  - `Form210BuildInput` acepta `advancePaymentContext` opcional
    (`filingCountIncludingCurrent`, `priorNetIncomeTaxCop`).
    `Form210PreliminaryLiquidation.nextYearAdvance` recibe la
    `AdvancePaymentComputation` (o `null` sin datos suficientes) y
    `netBalanceCop` ahora suma el anticipo neto. Warning explícito cuando
    hay impuesto pero falta el contexto.
  - Tests: 10 en `packages/aegis-rules/tests/advance-payment.test.ts`
    (tarifas declaradas, primera declaración, actual > promedio, promedio
    gana, tercera con historial, impuesto cero, sin historial en 2da,
    retenciones que exceden el bruto, negativos, año no modelado) +
    3 nuevos en `preliminary-liquidation.test.ts` (anticipo cablea al
    saldo, warning por falta de contexto, sin impuesto ⇒ sin anticipo).
  - Doc nueva: `docs/ADVANCE_PAYMENT_2025.md`; `FORM_210_LIQUIDATION.md`
    actualizado con el nuevo paso y con `nextYearAdvance.ruleSourceId`
    en la sección de trazabilidad.
  - Validación: `pnpm -r typecheck` verde; sweep `pnpm -r test` con
    288 tests OK (aegis 61/61 con 10 nuevos, form-210 21/21 con 3 nuevos,
    resto sin regresiones).
  - **Fuera de alcance de L (documentado):** historial multi-año en la app
    (lo aporta el analista), descuentos tributarios (art. 249 y ss.),
    disminución del anticipo por reducción significativa (parágrafo del
    art. 807), numeración oficial de la casilla del anticipo.

- **2026-08-07 10:10** — Fase H entregada. Impuesto de ganancias ocasionales.
  - **H ✅** `OccasionalGainKind`, `OccasionalGainRate`, `OccasionalGainComponent`
    y `OccasionalGainsTaxComputation` en `packages/aegis-rules/src/types.ts`.
  - Tabla `OCCASIONAL_GAIN_RATES_2025` con dos tarifas: `general` 15 %
    (art. 314 ET, Ley 2277 de 2022, `et-art-314`) y `lottery` 20 %
    (art. 317 ET, `et-art-317`). Ambas fuentes se añaden al catálogo oficial
    con `relatedBoxNumbers: [115]`.
  - `computeOccasionalGainsTax({ taxYear, generalBaseCop, lotteryBaseCop })`
    devuelve componentes con su tarifa y `officialSourceId`, formula legible
    y total redondeado por componente. Bases negativas se tratan como 0.
  - El builder del F-210 consume el motor: `occasionalGainsTax` pasa de `null`
    a `OccasionalGainsTaxComputation | null`. `Form210BuildInput` acepta un
    `occasionalGainsBreakdown` opcional; sin él, toda la casilla 115 tributa
    al 15 % y se agrega un warning. Si el desglose no cuadra con 115, se
    agrega un warning adicional.
  - `totalTaxDueCop` ahora suma renta + GO.
  - Tests: 8 en `packages/aegis-rules` (declaración de tarifas, base cero,
    15 %, 20 %, mixto, negativos, redondeo, año no modelado) + 4 nuevos en
    `preliminary-liquidation.test.ts` (15 % con warning, desglose respetado,
    warning por discrepancia, suma renta+GO).
  - Doc nueva: `docs/OCCASIONAL_GAINS_2025.md`; `FORM_210_LIQUIDATION.md`
    actualizado.
  - Validación: `pnpm -r typecheck` verde; sweep `pnpm -r test` con 278 tests
    OK (aegis 51/51, form-210 18/18, resto sin regresiones).
  - **Fuera de alcance de H (documentado):** categoría de lotería en el dominio
    (hoy el desglose lo aporta el analista), exenciones específicas (van en
    casilla 114 antes de 115), retenciones específicas de loterías (casilla
    132), numeración oficial de la casilla que declara el impuesto de GO.

- **2026-08-07 10:05** — Fase K entregada. Motor de liquidación privada
  preliminar cableado al builder del F-210 con trazabilidad completa.
  - **K ✅** `Form210PreliminaryLiquidation` en `packages/form-210/src/types.ts`
    y `computePreliminaryLiquidation` en `builder.ts`. Se enchufan las reglas
    puras de las Fases D y J:
    - Casillas 41 / 65 / 82 ahora calculan `min(40 % × base, 1.340 UVT,
componente_detectado)` vía `applyLimitRule` (`ruleSourceId = et-art-336`).
    - Casillas 66 y 83 se derivan (`61 − 65` y `78 − 82`) con `ruleComplete`.
    - `incomeTax` = `computeProgressiveIncomeTax(baseCedular, 2025)`
      (`ruleSourceId = et-art-241`); `totalTaxDueCop` toma su valor redondeado.
    - `status` ∈ `insufficient_data | zero | refund | to_pay`; se descuentan
      casillas 130 / 131 / 132 para producir `netBalanceCop`.
    - `occasionalGainsTax = null` y `sanciones` fuera de alcance hasta las
      Fases H / manuales.
  - Matriz de validación: 41, 65, 66, 82, 83 pasan de `not_implemented` a
    `verified` con ejemplos manuales verificables por el analista.
  - Tests: `packages/form-210/tests/preliminary-liquidation.test.ts` con
    4 casos (`insufficient_data`, límite art. 336 aplicado a 41, tarifa
    progresiva sobre 3.000 UVT → 480 UVT, retenciones que producen `refund`).
  - Doc nueva: `docs/FORM_210_LIQUIDATION.md`.
  - Validación: `pnpm -r typecheck` verde; `pnpm --filter @nexus-tax/form-210
test` 14/14; sweep local `pnpm -r test` sin regresiones.
  - **Fuera de alcance de K (documentado):** numeración oficial de impuesto de
    renta / GO / total a cargo / saldo (se anexan cuando se verifiquen contra
    el formulario), tarifa de ganancias ocasionales (Fase H), anticipo (Fase L),
    sanciones (siempre manuales).

- **2026-08-02 16:40** — Plan creado. Working tree limpio en la rama.
- **2026-08-03 15:00** — Fases J y D entregadas. Motor puro con verificación
  normativa y ejemplos manuales.
  - **J ✅** `ProgressiveTaxBracket` + `ProgressiveTaxTable` +
    `ProgressiveTaxComputation` en `@nexus-tax/aegis-rules`. Tabla
    `PROGRESSIVE_TAX_BRACKETS_2025` con los 7 rangos del art. 241 ET, más
    `computeProgressiveIncomeTax(cop, taxYear)` que devuelve base, rango,
    excess, tarifa marginal, impuesto en UVT, impuesto redondeado a pesos,
    fórmula y `ruleSourceId`. `findBracket` para localización.
    9/9 tests con casos manuales verificados (rangos 19 %, 28 %, 35 %, 39 %,
    exento, bordes exactos y año no modelado).
    Doc: `docs/PROGRESSIVE_TAX_RATE_2025.md`.
  - **D ✅** `TaxLimitRule` + `TaxLimitComputation` en aegis-rules. Tabla
    `TAX_LIMIT_RULES_2025` con 3 reglas del art. 336 ET (una por sub-cédula:
    trabajo → casilla 41, capital → 65, no laboral → 82), todas con el
    patrón `min(40 % × base, 1.340 UVT, componente_detectado)`.
    `applyLimitRule` devuelve el candidato limitante explícito
    (`percentage | uvt_cap | component`) y la fórmula legible.
    8/8 tests que ejercitan cada candidato limitante, casos degenerados y
    consistencia con las otras dos sub-cédulas.
    Doc: `docs/TAX_LIMITS_2025.md`.
  - Fuente adicional al catálogo: `et-art-241` y `et-art-336` con
    `relatedBoxNumbers`.
  - Validación: `pnpm --filter @nexus-tax/aegis-rules typecheck && test`
    (43/43); sweep completo `pnpm -r test` con 240+ tests OK.
  - **Nota importante:** el motor puro está listo, pero **el builder del F-210
    aún no consume estas reglas**. Las casillas 41/65/82 permanecen en
    `not_implemented` en la matriz de validación hasta que la conexión al
    builder ocurra en una fase futura (probablemente K, junto con la
    liquidación privada).

- **2026-08-02 17:05** — Fases A, B, C entregadas. Typecheck y tests verdes.
  - **B ✅** `OfficialSourceReference` en `@nexus-tax/aegis-rules` +
    `OFFICIAL_SOURCES_2025` (6 fuentes consolidadas, con `getOfficialSource` y
    `officialSourcesForBox`). Retrocompatible con `FilingRuleSource`.
  - **C ✅** `TaxUnitDefinition` + `TAX_UNIT_2025` + helpers `getTaxUnit`,
    `uvtToCop`, `copToUvt`. `UVT_2025` sigue como alias interno.
  - **A ✅** `Form210RuleValidation` + `FORM_210_VALIDATION_MATRIX_2025` en
    `@nexus-tax/form-210` (43 filas, 1 por cada casilla del ruleset). Test
    `validation-matrix.test.ts` (5 casos, verificando cobertura y aritmética).
    `docs/TAX_RULE_VALIDATION_MATRIX.md` publicado.
  - Cobertura de la matriz: **10 verified**, **9 implemented_unverified**,
    **24 not_implemented**, **0 requires_review**.
  - Validación: `pnpm --filter @nexus-tax/aegis-rules typecheck && test` (26/26),
    `pnpm --filter @nexus-tax/form-210 typecheck && test` (10/10).

## 7. Cierre verificable — 2026-08-08

- **24/24 fases A–X entregadas.** La Fase 0 de preparación también quedó cerrada.
- **11 motores tributarios puros nuevos** con `ruleSourceId` y catálogo oficial versionado.
- **Tres vistas nuevas:** Borrador F-210 extendido, Liquidación preliminar y Estados.
- **Dos flujos nuevos:** previsualizar/confirmar un ajuste y exportar el bundle trazable.
- **22 documentos nuevos** dentro de `docs/`, además de este cierre en el handoff y las guías
  generales actualizadas.
- **Historial preservado:** se mantienen los commits por fase; no se hace squash.

| Gate                  | Resultado final                                                    |
| --------------------- | ------------------------------------------------------------------ |
| `pnpm check:encoding` | OK; 332 archivos revisados, 1 fixture excluida                     |
| `pnpm typecheck`      | OK; 8 de 9 proyectos                                               |
| `pnpm lint`           | OK; 0 errores y 0 advertencias                                     |
| `pnpm test`           | OK; 402/402 pruebas unitarias                                      |
| `pnpm build`          | OK; compilación Next.js y 5 páginas generadas                      |
| `pnpm test:e2e`       | OK; 4/4 Chromium, incluidos los 2 smoke tests ampliados del sprint |

Distribución de pruebas unitarias: dominio 15, Aegis 129, parser de exógena 47,
inteligencia documental 66, Form 210 64 y web 81. Playwright verificó temas oscuro/claro,
escritorio 1280/1440 px, móvil 390 px y ausencia de desbordamiento horizontal.
