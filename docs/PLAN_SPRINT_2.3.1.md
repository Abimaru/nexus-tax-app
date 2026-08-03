# Plan — Sprint 2.3.1: validación tributaria y liquidación preliminar

Rama: `feature/sprint-2.3.1-tax-validation-liquidation` (creada desde `main` el
2026-08-02). Alcance: completar el borrador del Formulario 210 AG 2025 con
fuentes normativas y liquidación preliminar, sin salir del dispositivo, sin
presentar y sin convertir NexusTax en asesoría tributaria definitiva.

Este documento existe para no perder contexto entre iteraciones y explica qué
hay hoy, qué falta y en qué orden se ejecutan las fases.

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

Cerrar todas las 24 fases (A→X) con **fuentes oficiales por regla, ejemplos
manuales verificados, pruebas contra casos DIAN, verificación normativa
completa** requiere semanas de trabajo experto y acceso continuo a
publicaciones oficiales. Este sprint prioriza los cimientos verificables (A, B,
C) y deja el resto en fases sucesivas con criterios claros. Cualquier fórmula
avanzada que se implemente sin verificación normativa se marca
`implemented_unverified` y NO se presenta como resultado definitivo.

## 3. Plan por fases

### Fase 0 — Preparación (bloque actual)

- [x] Crear rama `feature/sprint-2.3.1-tax-validation-liquidation`.
- [x] Inventario honesto del ruleset actual.
- [x] Crear este documento.
- [ ] Ejecutar A, B y C. Reservar D+ para próximas iteraciones.

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

### Fases D-X — próximas iteraciones (no cierran en este sprint)

Cada fase requiere una iteración funcional propia con verificación tributaria
independiente. Orden sugerido:

1. **D. Cédula general** — ingresos, no constitutivos, renta líquida cedular.
2. **E. Limitaciones declarativas** (`TaxLimitRule`).
3. **F. Dependientes** — modelo de datos + validaciones.
4. **G. Factura electrónica** — porcentaje y límite.
5. **H. Ganancias ocasionales** — impuesto separado.
6. **I. Patrimonio** — validaciones saldo/movimiento.
7. **J. Tarifa progresiva** (`ProgressiveTaxBracket`).
8. **K. Liquidación privada** — impuesto neto, total a cargo, saldo.
9. **L. Anticipo** — regla versionada con años de historia.
10. **M. Saldo a favor anterior** — confirmación humana.
11. **N. Retenciones consolidadas.**
12. **O. Estados separados** (obligación / borrador / liquidación / presentación).
13. **P. Vista "Liquidación preliminar"** con expansión por casilla.
14. **Q. Impacto de decisiones** (`ResolutionImpact`).
15. **R. Simulación controlada** (previsualizar + confirmar).
16. **S. Tareas** — tarea por casilla faltante.
17. **T. Validaciones cruzadas.**
18. **U. Exportación** del manifiesto con ruleset y liquidación.
19. **V. Fixtures sintéticos** (20 casos).
20. **W. Casos manuales verificados.**
21. **X. E2E** — 17 pasos del flujo completo.

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
