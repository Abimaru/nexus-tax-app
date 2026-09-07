# Handoff del proyecto — NexusTax (Sprint 2.4, Fase B0 + B + B1 + C + D + E + E.1 + F + F.1 + F.2 + F.3 + G + G.1 + revisiones puntuales)

_Última actualización: 2026-09-08 (cierre Fase G.1)._

## Sprint 2.4 — Fase G.1: Realistic Synthetic Tax Case

Rama `feature/sprint-2.4-realistic-sample`, creada desde `main` actualizado (post-merge de Fase G).

Reemplaza el sample mínimo de humo (`samples/generate-sample.mjs`, un único archivo exógeno sin
relación con ninguna fase posterior a Sprint 2.3) por un "golden synthetic case": un expediente
AG 2025 completamente ficticio, coherente entre exógena, documentos, declaración anterior AG 2024,
facturación electrónica, dependiente e inmueble.

1. **Auditoría**: el sample anterior no está referenciado por ningún test/E2E, no representa
   ninguna fase de Sprint 2.4 y no tiene ninguna expectativa de reconciliación verificable. No
   existe ningún mecanismo de UI "Cargar caso de ejemplo" en la aplicación.
2. **`apps/web/src/lib/goldenCase.ts`** (nuevo): perfil ficticio, generador del libro exógeno
   (formato "Persona que reporta"), 6 documentos textuales (Form 220, certificado tributario
   consolidado, cesantías, vivienda, predial, administración PH), texto de declaración anterior
   AG 2024, generador del reporte DIAN de facturación electrónica, e inputs de dependiente e
   inmueble. Ningún dato proviene de un expediente real.
3. **Tabla de reconciliaciones deliberada (§7)**: exact_match, rounding_match, minor_difference,
   contradicción semántica (demostrada directamente contra el gate, no emergente de los
   documentos), document_only (vivienda), exógena-only (aportes a pensión, acción "capturar
   manualmente"), y una ambigüedad realista (dos entidades con el mismo valor).
4. **`apps/web/src/lib/goldenCase.test.ts`** (nuevo, 24 tests): ejercita el pipeline REAL
   (`processWorkbookFile`, `extractCandidates`/`classifyDocument`, `suggestExogenousMatches`,
   `detectSemanticContradiction`, `importElectronicInvoiceReport`, `evaluatePropertyExpenseEligibility`,
   `extractPriorYearForm210`, dependientes) — no un mock. Incluye guardarraíl permanente de
   privacidad (§19): ningún identificador del benchmark real (`1130641532`/`1130671777`) puede
   aparecer en el caso sintético.
5. **Golden expectations**: constantes nombradas (no un snapshot gigante), verificadas contra el
   pipeline real: exógena coherente, FE sin doble conteo (neto = Tope 5 exacto), base del 1%
   derivada por el motor (nunca hardcodeada), CUFE únicos, carry-forward AG2024→AG2025 coherente,
   Human Review Burden modesto (techo `< 20`, deliberadamente lejos de las ~88 decisiones del
   benchmark real).
6. **Sin integración con el Formulario 210 más allá de lo ya soportado**: el inmueble no aparece
   cableado a ninguna casilla, respetando la limitación explícita de Fase G.
7. **Sin E2E nuevo**: no existe mecanismo "Cargar caso de ejemplo" en la UI (§18 del prompt es
   condicional a que exista), así que la validación equivalente la da la suite de coherencia
   de 24 tests contra el pipeline real.

**Quality gate**: `check:encoding`, `pnpm -r typecheck`, `pnpm -r lint`, `pnpm -r test` (+24
tests nuevos), `pnpm build`, `pnpm test:e2e` (sin cambios) — todo en verde. Ver
`docs/SYNTHETIC_SAMPLE_CASE.md` para el detalle completo (auditoría, diseño, tabla de
reconciliaciones, golden expectations, cómo extenderlo).

## Sprint 2.4 — Fase G: Inmuebles, renta inmobiliaria y administración de propiedad horizontal

Rama `feature/sprint-2.4-properties`, creada desde `main` actualizado (post-merge de Fase F.3).

Principio inviolable de esta fase: `propiedad del inmueble != gasto deducible`. Nunca se sugiere
administración, predial, mantenimiento, reparaciones, seguros o intereses como gasto deducible
solo porque el usuario sea propietario — primero debe existir uso, período de arrendamiento e
ingreso conciliado.

1. **Modelo de dominio** (`packages/domain/src/property.ts`): `TaxProperty`, `RentalActivity`
   (período real, nunca los 12 meses por defecto), `RentalIncome` (enlace de lectura a
   exógena/hecho documental/manual, nunca un segundo libro de ingresos que duplique sumas),
   `PropertyExpense` (candidato con `eligibilityStatus` de seis estados, nunca un booleano). 5
   tests de esquema.
2. **Motor de elegibilidad puro** (`evaluatePropertyExpenseEligibility`,
   `@nexus-tax/aegis-rules`): orden explícito duplicado → cuota extraordinaria → residencia
   personal → uso vacante/otro/desconocido → uso mixto sin asignación → período/ingreso sin
   definir → soporte insuficiente (nunca exige factura para administración de PH) →
   potencialmente deducible. 16 tests. Fundamento: ET art. 107, ET art. 743, Decreto 1625 de 2016
   art. 1.3.1.13.5, Oficio DIAN 912878 de 2021.
3. **Adaptador documental** `co.property-administration.generic` (5 reglas independientes, nunca
   `mensual × 12`, nunca menciona "factura"). 7 tests.
4. **Persistencia**: Dexie v16 (4 tablas nuevas, aditiva); repositorio con CRUD completo +
   `recalculatePropertyExpenseEligibility` (recálculo en cascada ante cualquier cambio de
   contexto). 12 tests de integración cubriendo los guardarraíles de doble conteo (§26): mensual
   vs. total anual duplicado, intereses de vivienda ya confirmados como hecho documental.
5. **6 tipos de tarea nuevos** (`source: 'property'`, ver `docs/CASE_TASKS.md`).
6. **UI `PropertiesPanel`**: flujo guiado uso → período → ingreso → gasto → soporte/asignación →
   decisión humana; modo avanzado con razones y "impacto preliminar" informativo. Catálogos en
   español en `apps/web/src/lib/propertyLabels.ts`.
7. **E2E** (`properties.spec.ts`, 2 escenarios con capturas desktop/móvil): arrendado completo
   confirmado como candidato + persistencia tras recarga; vivienda personal nunca sugiere gasto
   deducible.

**Decisión de alcance explícita**: esta fase **no** cablea ningún valor al Formulario 210 (casillas
58/60 existen en el ruleset pero sin fórmula, antes y después de esta fase). `packages/form-210`
no se tocó. El impacto mostrado es informativo, vive solo dentro de `PropertiesPanel`. Detalle
completo, incluida la justificación de esta decisión, en `docs/PROPERTY_INCOME_EXPENSES_2025.md`.

**Quality gate**: `check:encoding`, `pnpm -r typecheck`, `pnpm -r lint`, `pnpm -r test` (domain 36,
aegis-rules 191, document-intelligence 182, exogenous-parser 87, form-210 93, web 147 = 736 tests
en todos los paquetes), `pnpm build`, `pnpm test:e2e` (17/17) — todo en verde.

**Limitaciones explícitas para una futura fase**: sin integración con el Formulario 210 (ver
arriba); la vinculación de `RentalIncome` a un registro exógeno/hecho documental existente no tiene
un selector dedicado en la UI de esta fase (solo entrada manual) — el modelo ya soporta
`sourceKind: 'exogenous_record'|'document_fact'`, falta el componente de selección; no se modeló
todavía la venta/enajenación de inmuebles (ganancia ocasional), solo renta corriente y
administración.

## Sprint 2.4 — Fase F.3: Unified Reconciliation & Coverage Hardening

Rama `feature/sprint-2.4-reconciliation-coverage`, creada desde `main` actualizado (post-merge de
Fase F.2). Cierra la limitación explícita de F.2 (dos scorers sin unificar) y corrige
incompatibilidades estructurales entre adaptadores y la taxonomía de la exógena encontradas en el
benchmark real (Fase F.1).

1. **Política numérica única** (`packages/domain/src/numericReconciliation.ts`,
   `evaluateNumericReconciliation`): fuente única para exact/rounding/minor/relevant, consumida
   ahora por `suggestExogenousMatches` (candidato↔exógena), `evaluateReconciliationDifference`
   (umbral/matriz) y `suggestReconciliations` (hecho↔exógena). Un cuarto punto de divergencia
   encontrado en la auditoría (`ReconciliationsPanel.tsx`'s `score >= 75 && difference <= 5`
   hardcodeado, sin gate semántico) también se unificó y ahora respeta el gate de Fase F.2 —
   `suggestReconciliations` calcula `semanticContradiction`/`semanticContradictionReason`
   reutilizando `detectSemanticContradiction`.
2. **Cobertura estructural corregida**: cesantías (`co.severance.generic` + `classification.ts`,
   saldo reclasificado de `asset` a `severance`, aporte/consignación patronal reconocido en ambos
   lados); nuevo adaptador `co.annual-cost-report.generic`; corrección de la señal de clasificación
   "certificado tributario" (singular→plural, causa raíz real de una miscategorización a
   `debt_certificate`); fixture de tabla multiproducto; vocabulario adicional de Form 220 textual.
3. **Routing documental explícito** (`packages/document-intelligence/src/documentRouting.ts`):
   antes de `extractCandidates`, decide si el documento usa el pipeline genérico, la ruta de
   declaración anterior, o queda marcado como extracto bancario transaccional (detectado
   estructuralmente) — nunca se descarta el documento, solo se evita el extractor equivocado.
4. **Menos falsos `unresolved`**: `buildExpectedTaxEvidence` excluye 5 categorías estructuralmente
   sin certificado esperado (card_consumption, bank_movement, investment_movement,
   electronic_invoicing_total/benefit_base).
5. **Human Review Burden** (`computeHumanReviewBurden`, nuevo `docs/HUMAN_REVIEW_BURDEN.md`):
   métrica local de benchmark, nunca telemetría.

**Rebenchmark real (§23, script temporal, eliminado; datos nunca persistidos)**: mismo corpus real
de Fase F.1 (2 exógenas, 29 PDF, 2 reportes de facturación electrónica). Resultados: unresolved
59→37, candidatos totales 142→52 (el routing evitó ~80 candidatos de baja calidad de un extracto
bancario real), evidencia document-only 115→26, Human Review Burden total ~192→88,
**falseConfidentMatches se mantuvo en 0**. Detalle completo en `docs/EVIDENCE_MATCHING.md`
§Fase F.3.

**Quality gate**: `check:encoding`, `pnpm -r typecheck`, `pnpm -r lint`, `pnpm -r test` (696 tests
en todos los paquetes), `pnpm build`, `pnpm test:e2e` (13/13, incluye el nuevo
`evidence-reconciliation-coverage.spec.ts`) — todo en verde.

**Limitaciones explícitas para una futura Fase F.4**: la detección de extracto transaccional es
una heurística estructural modesta (podría tener falsos negativos/positivos en formatos atípicos);
la cobertura de vivienda de los 2 casos reales que F.2 dejó con mejora parcial no se revisó de
nuevo; `unresolvedAfterAllDocuments` es hoy un alias exacto de `manualGuidedCapture`.

## Sprint 2.4 — Fase F.2: Safety & Critical Evidence Hardening

Rama `feature/sprint-2.4-evidence-safety`, creada desde `main` actualizado (post-merge de Fase
E.1). Responde a dos hallazgos críticos del benchmark real Documento ↔ Exógena (Fase F/F.1,
puramente diagnóstico, ningún documento real llegó nunca al repositorio):

1. **False confident match real**: un candidato cuyo texto describía una retención fue
   clasificado como ingreso y obtuvo `exact_match` contra un registro de ingresos. Corregido en
   dos capas: (a) causa raíz en `co.financial.consolidated.generic` (regla `withholding` ampliada +
   exclusividad "retención domina sobre ingreso en la misma línea"); (b) defensa general en
   `packages/document-intelligence/src/semanticGate.ts` (`detectSemanticContradiction`), un gate
   semántico reusable que degrada cualquier `exact_match`/`rounding_match` contradictorio a
   `possible_match` antes de que `safeForBulkConfirm` pueda ser `true`. Ver
   `docs/EVIDENCE_MATCHING.md` §Fase F.2 para el diseño completo y la tabla de compatibilidad.
2. **Certificados de vivienda sin red de seguridad**: la deducción de intereses de vivienda nunca
   se reporta como información exógena, así que un fallo de extracción no tiene ningún respaldo
   cruzado. Se amplió el vocabulario del clasificador y del adaptador de vivienda (sin exigir
   "crédito hipotecario" literal), se habilitó la evidencia `housing_interest` como válida
   "document-only" sin exógena, y se agregó un fallback guiado (`evidence_missing_expected`
   reutilizado, sin nuevo tipo de tarea) cuando el documento se reconoce como vivienda pero no se
   identifican los intereses.

**Rebenchmark local (§23, script temporal, eliminado; datos nunca persistidos)**: el false
confident original quedó corregido en la raíz (candidato ahora etiquetado `withholding`, sin
`semantic_concept_contradiction` en su match); los dos casos de riesgo previos (GMF base gravable,
saldo como GMF) siguen bloqueados sin regresión; de los 2 certificados reales de vivienda, uno
mejoró (confianza de clasificación medium→high, más el fallback guiado ahora disponible) y el otro
no mostró mejora medible en esta pasada (el vocabulario real de ese emisor específico elude las
señales ampliadas; no se investigó más por la prohibición de derivar patrones de texto real).
Ningún caso revalidado produjo un nuevo false confident.

**Quality gate**: `check:encoding`, `-r typecheck`, `-r lint`, `-r test` (634+ tests, todos los
paquetes), `build` y `test:e2e` (12/12, incluye el nuevo `evidence-safety.spec.ts`) — todo en
verde. Nuevos tests: `semanticGate.test.ts` (15), `housingInterest.test.ts` (8), más ajustes en
`evidenceReview.test.ts` y `taxCaseAnalysis.test.ts`. **No se unificaron los dos scorers**
(`suggestExogenousMatches` vs. `suggestReconciliations`) — explícitamente diferido a Fase F.3.

## Sprint 2.4 — Fase E.1: cierre de Evidence Matching & Guided Reconciliation

Continuación exclusiva sobre `feature/sprint-2.4-evidence-matching` (misma rama, sin crear otra).
Cierra los dos criterios de aceptación que quedaron pendientes al terminar la Fase E funcional:
(1) el clasificador antirruido no participaba en la decisión de promover evidencia numérica a
candidato monetario, solo en la inspección; (2) no existía un E2E de Playwright del Guided Review.

### 1. Promotion gate

`monetaryMatches()` (`packages/document-intelligence/src/adapters.ts`) ahora aplica
`classifyNumericEvidence` como filtro semántico DESPUÉS de sus filtros previos (línea explicativa,
%/x adyacente, rango de año, umbral de 10.000/formato/moneda): solo `role === 'money'` se promueve
con normalidad; `role === 'unknown'` se promueve de forma conservadora forzando
`status: 'requires_review'`; cualquier rol de ruido (NIT, cédula, cuenta, resolución, referencia
legal, fecha, año, porcentaje, página) se suprime — nunca se descarta como evidencia, sigue
disponible vía `classifyDocumentNumericEvidence`/`suppressedNumericEvidence`, pero no se convierte
en `DocumentFactCandidate`. Antes de este cierre, un NIT con separadores de miles (p. ej.
`900.123.456-7`) podía pasar el filtro ad-hoc por formato y magnitud aunque el clasificador ya lo
reconociera como ruido — la clasificación no tenía ningún efecto sobre la promoción real.

Se reordenó `classifyNumericEvidence` por prioridad para resolver los casos de contexto exigidos:
símbolo de moneda pegado al propio token (`$4.500.000`) gana siempre sobre una palabra de
referencia más atrás en la línea (`"Saldo cuenta 1234567890: $4.500.000"` → cuenta suprimida, monto
promovido); NIT/cédula ganan siempre incluso con formato de miles; una palabra de monto ("saldo",
"valor", "rendimientos", etc.) + formato de miles/decimales en el propio token gana sobre
"cuenta"/"obligación" (`"Saldo obligación 45.123.456"` → dinero; `"Obligación 4512345678"` sin
palabra de monto ni formato → identificador). Se agregó una alternativa bare "obligación" (sin
requerir "no") al patrón de `account_number`.

Se corrigió además un defecto encontrado durante la verificación de redondeo: cuando
`suggestExogenousMatches` detecta `rounding_match`, ya no coexiste la razón genérica "Valor
cercano." junto con la razón específica de redondeo — se reemplaza, para que la UI nunca muestre
ambas frases. La etiqueta de `describeMatchConfidence('rounding_match')` se ajustó a "Coincide por
redondeo al peso" (antes "Coincide por redondeo", a secas).

### 2. Gaps de UI completados (no un rediseño)

Al construir el E2E se encontraron dos piezas del modelo ya definido (`EvidenceReviewAction`) que
no estaban conectadas en `EvidenceReviewPanel`:

- **Resolución de ambigüedad**: `allowedActions` para `ambiguous` ahora incluye `confirm` (además
  de `choose_alternative`), con el botón etiquetado "Elegir este valor". Elegir una expectativa
  consume el candidato (`factId`); la expectativa competidora deja de encontrarlo como candidato
  abierto en la siguiente recomputación y vuelve automáticamente a `unresolved`, sin necesidad de
  un selector de alternativas independiente.
- **Captura manual guiada sin conciliación**: `createGuidedManualCapture` creaba el `DocumentFact`
  pero nunca marcaba la expectativa como resuelta ante el resto de la revisión guiada — volvía a
  aparecer como "Falta este dato" en cada recomputación. Ahora también registra la
  `PreliminaryReconciliation` correspondiente (`status: 'reconciled'`, igual que
  `confirmEvidenceMatch`). `buildEvidenceReviewSuggestions` recibe `reconciledExogenousRecordIds`
  (derivado de `workspace.reconciliations`) para excluir por completo cualquier expectativa ya
  conciliada.
- La tarjeta de sugerencia ahora renderiza `suggestion.reasons` y usa
  `describeMatchConfidence(matchStatus)` como etiqueta principal (en vez del genérico "Coincide con
  la exógena" para exact/rounding), para que la distinción de redondeo sea visible en la UI, no
  solo en los datos.

### 3. E2E de Playwright

Nuevo `apps/web/tests-e2e/evidence-review.spec.ts`: expediente sintético con exógena + PDF
financiero sintético (kind `consolidated_tax_certificate`, con categorías reales `asset`/
`financial_income`/`liability`/`withholding` para evitar colisiones de score entre candidatos no
relacionados) que mezcla ruido (NIT con/sin separadores, cuenta, resolución, año, porcentaje) con
3 valores monetarios reales: coincidencia exacta, coincidencia por redondeo, y un valor ambiguo que
empata contra dos registros exógenos idénticos. Cubre: resumen de la revisión guiada; solo 3
candidatos reales en modo avanzado (nunca los 5 números de ruido); confirmación en bloque segura;
resolución de ambigüedad; captura manual guiada de una expectativa sin documento; conciliación
resultante (4 decisiones — A, B, D confirmados + C manual — sin doble conteo); persistencia tras
recargar la página; trazabilidad en modo avanzado; y 390px sin overflow horizontal.

Se actualizaron `smoke.spec.ts` y `document-lab.spec.ts`: como `EvidenceReviewPanel` es ahora la
vista por defecto de `organizacion/revision-documental` (reemplazando el render directo de
`DocumentExtractionReviewPanel` desde el cierre funcional de Fase E), ambos specs necesitaban abrir
el interruptor "Ver otros datos detectados" antes de interactuar con la revisión detallada. Se
agregó el helper `openAdvancedReview(page)` en ambos archivos.

### Verificación ejecutada

- `pnpm check:encoding`: sin mojibake (387 archivos).
- `pnpm -r typecheck`: limpio en todo el monorepo.
- `pnpm -r lint`: 0 advertencias.
- `pnpm -r test`: **609/609** tests (domain 19, aegis-rules 175, document-intelligence 118 [+15],
  form-210 93, exogenous-parser 77, web 127 [+2] — sin regresiones en los 592 previos).
- `pnpm build`: exitoso.
- `pnpm test:e2e`: **11/11** specs (incluye el nuevo `evidence-review.spec.ts`).

### Limitaciones reales restantes para Fase E2

Ver `docs/EVIDENCE_MATCHING.md` §"Limitaciones conocidas": los dos scorers sin unificar
(`suggestExogenousMatches`/`suggestReconciliations`), el clasificador de ruido ejecutado dos veces
por documento (gate + inspección, sin unificar el recorrido), captura manual guiada sin edición de
categoría/naturaleza/tratamiento, sin paginación en `EvidenceReviewPanel` para expedientes muy
grandes, y un caso límite conocido en el chequeo de ambigüedad del matcher (marca `ambiguous` al
tercer elemento del top-3 cuando solo empatan los dos primeros) — no cubierto por los fixtures
requeridos, documentado para no perderlo de vista.

### Estado de Git

Continuó sobre `feature/sprint-2.4-evidence-matching` (misma rama de la Fase E funcional), sin
crear otra. Pendiente de push y PR — el cierre de esta fase no incluyó publicación salvo
indicación explícita del usuario.

## Sprint 2.4 — Fase E: Evidence Matching & Guided Reconciliation

Objetivo: reducir el ruido numérico mostrado al analista tras la extracción documental (NIT,
cuentas, resoluciones, años, etc. malinterpretados como dinero) y presentar una "Revisión guiada"
con pocas decisiones humanas relevantes en vez de decenas de candidatos en bruto, sin reemplazar
la revisión detallada existente. Detalle técnico completo en `docs/EVIDENCE_MATCHING.md`.

### Auditoría previa (obligatoria antes de codificar)

Se auditó `packages/document-intelligence/src` completo, el esquema `DocumentFactCandidate`, la
lógica de `suggestExogenousMatches`, el enum `PreliminaryReconciliationStatus`, la comparación
nativo/OCR, `DocumentExtractionReviewPanel.tsx`, `CaseTask`/`buildCaseTasks`, la captura manual y
`ExtractionFeedback`. Hallazgo adicional relevante: existe un **segundo scorer** independiente
(`suggestReconciliations` en `apps/web/src/lib/taxCaseAnalysis.ts`, a nivel de `DocumentFact` ya
confirmado) que duplica buena parte de la lógica de `suggestExogenousMatches` (a nivel de
`DocumentFactCandidate`, antes de confirmar). **Decisión**: no unificarlos en esta fase (blast
radius demasiado grande); se documenta como limitación conocida para una Fase E2.

### Diseño e implementación

- **Clasificador puro** `classifyNumericEvidence` (`packages/document-intelligence/src/
  evidenceClassifier.ts`): asigna un rol (`money` o una categoría de ruido: NIT, cédula, cuenta,
  referencia documental/legal, fecha, año, porcentaje, página) a cada token numérico según su
  contexto léxico. `classifyDocumentNumericEvidence` (`adapters.ts`) lo aplica a todo un documento;
  el pipeline (`pipeline.ts`) lo usa para poblar métricas de ruido
  (`numericEvidenceDetected/monetaryEvidencePromoted/numericNoiseSuppressed`) y
  `DocumentExtractionSession.suppressedNumericEvidence` (acotado a 200 entradas; nunca se descarta
  evidencia, solo se excluye de la revisión guiada normal).
- **Estado granular del emparejador** `CandidateExogenousMatchStatus` (movido a
  `packages/domain/src/evidenceMatching.ts` para evitar un ciclo de importación): reemplaza el
  enum anterior (`strong_match/probable_match/multiple_candidates/no_match/
  possible_contradiction`) por `exact_match | rounding_match | minor_difference | possible_match |
  ambiguous | contradiction | no_match`, con detección explícita de redondeo
  (`Math.round(decimalValue) === exogenousValue`). `suggestExogenousMatches`
  (`packages/document-intelligence/src/matching.ts`) se evolucionó sin cambiar su firma ni su
  ranking; se agregó `describeMatchConfidence` como único humanizador (nunca expone el score
  crudo).
- **Contrato `ExpectedTaxEvidence`**: "el expediente espera encontrar esto", derivado hoy de
  `NormalizedExogenousRecord` (`buildExpectedTaxEvidence` en `apps/web/src/lib/evidenceReview.ts`).
- **Guided Review** `buildEvidenceReviewSuggestions` combina expectativas y candidatos en una
  sugerencia por expectativa (o por candidato sin relación, `new_relevant_value` — nunca se oculta
  dinero sin decisión humana) con estados `matched | likely_match | needs_review | unresolved |
  new_relevant_value`.
- **Persistencia sin doble conteo**: `confirmEvidenceMatch`/`confirmEvidenceMatchesBulk`/
  `createGuidedManualCapture` (`apps/web/src/lib/repository.ts`) reutilizan exactamente
  `reviewDocumentCandidate` + `savePreliminaryReconciliation`/`saveDocumentFact`, sin crear un
  mecanismo paralelo. Nuevo `captureMethod: 'manual_guided'` y campo `expectedEvidenceId` en
  `DocumentFact` para trazabilidad.
- **UI** `EvidenceReviewPanel.tsx` reemplaza el render directo de `DocumentExtractionReviewPanel`
  en `organizacion/revision-documental` (que se conserva íntegro como "modo avanzado" detrás de un
  interruptor). Resumen en lenguaje simple, confirmación en bloque acotada a coincidencias claras,
  captura manual guiada.
- **Tareas**: dos tipos nuevos (`evidence_ambiguous_match`, `evidence_missing_expected`) derivados
  directamente en `buildCaseTasks` (no en `evidenceReview.ts`, por el mismo motivo de ciclo de
  importación), sin tocar la generación existente por candidato.

### Tests agregados

`evidenceClassifier.test.ts` (9), `matching.test.ts` (4, incluye redondeo/ambigüedad/diferencia
menor/humanizador), `evidenceReview.test.ts` (7), `EvidenceReviewPanel.test.tsx` (4),
`presentationCatalogs.test.ts` (+1), `taxCaseAnalysis.test.ts` (+1, valida ambos tipos de tarea
nuevos). Se actualizó el test existente de `suggestExogenousMatches` a los nuevos nombres de
estado (`exact_match`/`contradiction`).

### Verificación ejecutada

- `pnpm check:encoding`: sin mojibake (384 archivos).
- `pnpm -r typecheck`: limpio en todo el monorepo.
- `pnpm -r lint`: 0 advertencias.
- `pnpm -r test`: **592/592** tests (domain 19, aegis-rules 175, document-intelligence 103 [+13],
  form-210 93, exogenous-parser 77, web 125 [+12] — sin regresiones en los 566 previos).
- `pnpm build`: exitoso.

### Limitaciones y Fase E2 propuesta

Ver `docs/EVIDENCE_MATCHING.md` §"Limitaciones conocidas": los dos scorers sin unificar, el
clasificador de ruido como capa de inspección (no suprime candidatos existentes todavía), la
captura manual guiada sin edición de categoría/naturaleza/tratamiento, y la ausencia de
paginación/virtualización en `EvidenceReviewPanel` para expedientes muy grandes.

### Estado de Git

Rama `feature/sprint-2.4-evidence-matching`, creada desde `origin/main` (que ya incluye el merge
de PR #6, `aca5505`). Pendiente de push y de PR — el cierre de esta fase no incluyó publicación
salvo indicación explícita del usuario.

## Sprint 2.4 — Revisión normativa puntual (cierre de Fase D)

Revisión exclusiva, previa a publicar `feature/sprint-2.4-electronic-invoices`, de la integración
normativa del beneficio del 1 % con el Formulario 210. **No se rehizo** parser, UI, Dexie,
conciliación ni contratos de dominio de facturación electrónica — el ajuste se limitó a
`packages/form-210`, al `sourceId` del motor puro en `packages/aegis-rules` y a documentación/copy.

### Hallazgo externo verificado

La Fase D había corregido el destino de la casilla 39 (bug real), pero introdujo un **segundo
error** al asumir: (a) el fundamento legal era el "artículo 336-1 ET"; (b) la casilla oficial era
la 141 (componente de R92 vía R138/R139, análogo a dependientes), con R140 como base informativa.

Verificado con múltiples fuentes independientes (Estatuto.co, Gerencie, Consultor Contable,
Connotar, cobertura de prensa específica de la temporada de declaración AG2025/2026 con calendario
de agosto-octubre de 2026 — coincide exactamente con el contexto del proyecto):

- El fundamento legal correcto es el **numeral 5 del artículo 336 ET** (texto introducido por el
  art. 7 de la Ley 2277 de 2022, que sustituyó el artículo 336 completo). El **artículo 336-1 ET**
  (adicionado por el art. 60 de la misma ley) es una norma **completamente distinta**: estimación
  de costos y gastos deducibles (tope del 60 % de ingresos brutos de rentas de trabajo), cuyo
  exceso se informa marcando la **casilla 140** — un indicador booleano ("marque X"), nunca un
  valor monetario.
- La **casilla 141** corresponde al **impuesto voluntario del art. 244-1 ET**, sin relación alguna
  con dependientes ni con facturación electrónica.
- La deducción del 1 % tiene su **propia casilla oficial: la 28** (dato informativo previo a
  patrimonio), confirmada explícitamente por Connotar ("Nueva casilla 28 del formulario 210 para
  informar el 1 % de las compras personales") y por prensa del calendario AG2025/2026 ("el valor
  correspondiente al 1 % debe registrarse en la casilla 28 del formulario").

### Corrección aplicada

- `ELECTRONIC_INVOICING_SOURCE_ID` (`packages/aegis-rules`) cambia de `'et-art-336-1'` a
  `'et-art-336-num-5'`.
- `OFFICIAL_SOURCES_2025` registra tres fuentes separadas: `et-art-336-num-5` (deducción, casilla
  28), `et-art-336-1` (indicador de costos/gastos, casilla 140) y `et-art-244-1` (impuesto
  voluntario, casilla 141, no modelado).
- `FORM_210_BOXES_2025` agrega la casilla 28 (`implemented_unverified`, dato informativo previo a
  patrimonio); la fórmula de R92 revierte a `41 + 65 + 82 + 139` (sin R141); R140/R141 recuperan su
  significado oficial correcto y quedan `not_implemented` (ninguno recibe valores del motor).
- `builder.ts` cablea la deducción únicamente a la casilla 28; nunca a R39, R92, R140 ni R141.
- UI (`ElectronicInvoicingPanel.tsx`, `PreliminaryLiquidationPanel.tsx`): copy corregido de "art.
  336-1 ET" a "art. 336 num. 5 ET" (sin cambios estructurales de componente).

### Tests de guardarraíl agregados

Bloque `describe('GUARDARRAÍL...')` en `preliminary-liquidation.test.ts` (4 tests) que impide
permanentemente: R140 tratado como importe COP; R141 usado para la deducción electrónica; el 1 %
reintroducido en R39; el 1 % sometido accidentalmente al límite del 40 %/1.340 UVT (verificado
forzando R41 = 0 por agotamiento del tope de deducciones y confirmando que R28 conserva su valor
íntegro). Más un test en `packages/aegis-rules/tests/electronic-invoicing.test.ts` que verifica el
catálogo de fuentes oficiales no vuelve a confundir ambos artículos.

### Verificación ejecutada

- `pnpm check:encoding`: sin mojibake.
- `pnpm -r typecheck`: limpio en todo el monorepo.
- `pnpm -r lint`: 0 advertencias.
- `pnpm -r test`: **566/566** tests (aegis-rules 175 [+1], form-210 93 [+4], domain 19,
  document-intelligence 90, exogenous-parser 77, web 113 — sin regresiones en los 562 previos).
- `pnpm build`: exitoso.

### Estado de Git

Rama `feature/sprint-2.4-electronic-invoices` publicada y fusionada a `main` como **PR #6**
(`https://github.com/Abimaru/nexus-tax-app/pull/6`, merge commit `aca5505`). Incluye el commit de
esta revisión normativa puntual (`508d5c0`) más los 8 commits de la Fase D. `main` ya refleja este
estado; cualquier trabajo posterior parte de `main` actualizado.

## Sprint 2.4 — Fase D (reporte DIAN de facturación electrónica)

Trabaja desde `main` actualizado (verificado que contiene el merge del PR #5,
commit `bb3387d`). Rama de trabajo local `feature/sprint-2.4-electronic-invoices`,
creada exactamente sobre `origin/main`.

Ver detalle completo en
[`docs/ELECTRONIC_INVOICE_REPORT_2025.md`](./ELECTRONIC_INVOICE_REPORT_2025.md)
y [`docs/ELECTRONIC_INVOICING_2025.md`](./ELECTRONIC_INVOICING_2025.md).

### Auditoría inicial

- El motor puro del 1 % (`electronic-invoicing.ts`) ya existía y estaba probado, pero:
  - Estaba cableado a la **casilla 39**, exponiéndolo indirectamente al límite del 40 %/1.340 UVT
    del que el Decreto 2231 de 2023 lo exime expresamente — el mismo tipo de bug ya corregido para
    R139 en la Fase C.
  - `Form210BuildInput.electronicInvoicing` nunca era poblado por `rebuildForm210Draft`: una
    capacidad huérfana, nunca invocada desde `apps/web`.
- `analysis.matrix.electronicInvoicing` (Sprint 2.3.2) ya calculaba una estimación preliminar desde
  la exógena (Tope 5), sin detalle por factura ni CUFE — se conserva y se usa como el lado "exógena"
  de la conciliación, pero no reemplaza el reporte detallado.

### Implementado

- **Corrección normativa (parcial, ver revisión puntual arriba)**: R141 (1 % de facturación
  electrónica) se movió de la casilla 39 a ser componente de la casilla 92
  (`92 = 41 + 65 + 82 + 139 + 141`), con la casilla 140 (base, informativa) y 141 (deducción
  aplicada) ya reservadas desde la Fase B0. **Esta atribución de casilla resultó incorrecta y fue
  corregida en la revisión normativa puntual posterior** (casilla real: 28).
- **Nuevo parser XLSX** (`packages/exogenous-parser/src/electronicInvoiceReport.ts`, "adaptador
  hermano" de la exógena): detección por señales de contenido (nunca fila fija), lectura completa,
  extracción por factura, deduplicación por CUFE, validación NC/ND, agregación de totales,
  normalización de medios de pago.
- **Parser monetario central reutilizado**: `@nexus-tax/document-intelligence` agregado como
  dependencia de `exogenous-parser` (sin ciclo); reemplaza `coerceNumber` para columnas monetarias
  del reporte de facturación electrónica.
- **Modelo de dominio**: `ElectronicInvoiceReport`, `ElectronicInvoicePurchase`,
  `ElectronicInvoiceBenefitBase`, `ElectronicInvoiceReconciliation`
  (`packages/domain/src/electronicInvoice.ts`). `DOMAIN_VERSION` 0.12.0.
- **Decisiones tributarias por factura** (doble beneficio): reutilizan `TaxResolutionDecision`
  (`resolutionDecisions`) en vez de una tercera tabla Dexie — decisión de diseño explícita, más
  compacta y consistente con el Centro de resolución existente.
- **Dexie v15**: `electronicInvoiceReports`, `electronicInvoicePurchases` (aditivo).
- **Orquestación web** (`apps/web/src/lib/electronicInvoiceEngine.ts`): parseo, agregador
  explicable de la base del 1 % (susceptible − duplicados − rechazadas − doble beneficio),
  conciliación contra Tope 5, construcción del input para `buildForm210Draft`.
- **8 tipos de tarea nuevos** con `source: 'electronic_invoice'`.
- **UI** (`ElectronicInvoicingPanel.tsx`, vista `facturacion-electronica`): carga, resumen, tabla
  con detalle expandible, CUFE enmascarado por defecto, filtros, resolución por factura, "No usaré
  deducción" reversible.

### Pendiente explícito (no se avanzó, por decisión de alcance)

- `electronic_invoice_file_not_recognized` no se persiste como tarea deep-linkeable (no hay
  report/purchase que anclar como evidencia cuando el archivo no se reconoce); se muestra como
  error inmediato en la UI.
- El reporte no se asocia a la biblioteca documental general (`sourceDocumentId` queda `null`): es
  una fuente estructurada propia.
- Inmuebles, administración de propiedad horizontal, medicina prepagada — fuera de alcance.

### Verificación ejecutada

- `pnpm check:encoding`: 375 archivos, sin mojibake.
- `pnpm -r typecheck`: limpio en todo el monorepo.
- `pnpm -r lint`: 0 advertencias (incluida `packages/exogenous-parser/tests`, lintada
  explícitamente aparte del script del paquete).
- `pnpm -r test`: **562/562** tests (domain 19, aegis-rules 174, document-intelligence 90,
  exogenous-parser 77 — incluye 29 nuevos de facturación electrónica y regresión de 227 facturas —,
  form-210 89, web 113 — incluye 7 nuevos de repository, 1 de tareas, 4 de
  `ElectronicInvoicingPanel`). Ver conteo actualizado tras la revisión normativa puntual arriba.
- `pnpm build`: exitoso.
- `pnpm test:e2e`: **10/10** (2 nuevos de `electronic-invoicing.spec.ts`: flujo completo y archivo
  no reconocido), capturas desktop/móvil verificadas.

### Estado de Git

Rama `feature/sprint-2.4-electronic-invoices` fue publicada exitosamente (usando la cuenta personal
del usuario, que sí tenía permisos, tras diagnosticar que el bloqueo previo era una identidad EMU
inyectada por variables de entorno del sistema, no una restricción real de la cuenta) y fusionada a
`main` como **PR #6** (merge commit `aca5505`), junto con el commit de la revisión normativa
puntual descrita arriba.

## Sprint 2.4 — Fase C (beneficios de dependientes: art. 387 + art. 336 num. 3 ET)

Continúa sobre el estado local de Fase B0+B+B1 (rama de trabajo local
`feature/sprint-2.4-dependents`, creada sobre el checkout que ya contenía los
13 commits reales de esa fase — ver "Estado de Git" al final de esta sección).
Ver detalle completo en
[`docs/DEPENDENTS_BENEFITS_2025.md`](./DEPENDENTS_BENEFITS_2025.md) y
[`docs/DEPENDENTS_DEDUCTION_2025.md`](./DEPENDENTS_DEDUCTION_2025.md).

### Auditoría normativa previa a cualquier código

Antes de escribir código se verificó, con dos fuentes independientes
(Gerencie.com, Tributi.com):

1. **Bug real encontrado en el motor existente del art. 387 ET**: el tope de
   32 UVT/mes y 384 UVT/año se estaba multiplicando por el número de
   dependientes elegibles (hasta 4), permitiendo un tope efectivo de hasta
   1.536 UVT/año. La doctrina es explícita: el tope es **agregado para el
   contribuyente**, no por dependiente. Corregido — ver
   `DEPENDENTS_DEDUCTION_2025.md`.
2. El art. 336 num. 3 ET (72 UVT × dependiente, máx. 4) es **expresamente
   adicional** tanto al tope general del 40 %/1.340 UVT como al propio art.
   387 — deben modelarse como motores independientes, nunca fusionados.
3. Ley 2411 de 2024 amplió el rango de "hijo estudiante" de 18-23 a 18-25
   años, vigente para AG2025.
4. La casilla 139 (72 UVT) es un componente algebraico de la casilla 92
   (confirmado con la misma fuente secundaria usada en Fase B0 para R91-93).
5. **Hallazgo flagged, no corregido** (fuera de alcance): la misma fuente
   sugiere que el 1 % de facturación electrónica podría pertenecer a R92 en
   lugar de R39 — contradice la documentación existente; requiere
   verificación adicional antes de tocar R39 (ya verificado contra fixture
   real).

### Implementado

- **Motor art. 387 corregido** (`dependents.ts`): sin escalado por número de
  dependientes, sin cupo de 4 (ese cupo es exclusivo del art. 336).
- **Motor art. 336 num. 3 nuevo e independiente**
  (`dependents-additional-336.ts`): 72 UVT/dependiente, máx. 4, nunca
  saturado por el 40 %/1.340 UVT.
- **Evaluador de elegibilidad** (`dependent-eligibility.ts`): nunca devuelve
  un falso `not_eligible` por datos incompletos — usa
  `pending_review`/`requires_support`/`possibly_eligible`.
- **Resolutor de coexistencia** (`dependents-coexistence.ts`): implementa el
  Decreto 1625/2231-2023 — ambos beneficios simultáneos solo si el
  contribuyente es asalariado; independientes eligen uno por dependiente. El
  motor decide; la UI solo pregunta la naturaleza del ingreso.
- **Casillas 91/92/93/138/139** cableadas en `form-210` (`implemented_unverified`).
- **Dominio** (`taxDependent.ts`): `TaxDependent`, `DependentSupport`,
  `DependentEvaluation`. `DOMAIN_VERSION` 0.11.0.
- **Dexie v14**: `taxDependents`, `dependentSupports`, `dependentEvaluations`,
  `dependentsCaseContext` (aditivo).
- **8 tipos de tarea nuevos** con `source: 'dependent'` (ver `CASE_TASKS.md`).
- **UI** (`DependentsPanel.tsx`, vista `beneficios-dependientes`): selector de
  naturaleza de ingresos, tarjetas de dependiente, formulario seccionado,
  modo avanzado con detalle normativo. Bug encontrado y corregido en E2E: el
  banner de confirmación "No tengo dependientes" no se mostraba cuando la
  lista estaba vacía (el caso exacto para el que existe el botón).

### Pendiente explícito (no se avanzó, por decisión de alcance)

- Adjuntar un documento de la biblioteca como soporte de un dependiente desde
  la UI (campo estructural `documentLibraryFileId` listo; acción pendiente).
- El 1 % de facturación electrónica como posible componente de R92 (flagged,
  no aplicado).
- Casilla 89 (subcédula de honorarios) — hallazgo abierto de Fase B0, sin
  resolver.
- Facturación electrónica DIAN, inmuebles, administración de propiedad
  horizontal y medicina prepagada (secciones D-G del Sprint 2.4).

### Verificación ejecutada

- `pnpm --filter @nexus-tax/aegis-rules test`: 167/167 verdes.
- `pnpm --filter @nexus-tax/form-210 test`: 89/89 verdes.
- `pnpm --filter @nexus-tax/domain typecheck`: verde.
- `pnpm --filter @nexus-tax/web test`: 99/99 verdes.
- `pnpm --filter @nexus-tax/web typecheck` / `lint`: verdes.
- `pnpm --filter @nexus-tax/web test:e2e`: 8/8 verdes (6 previos + 2 nuevos de
  `dependents.spec.ts`), capturas desktop (1280 px) y móvil (390 px)
  verificadas visualmente.

### Estado de Git (limitación de entorno, resuelta en una sesión posterior)

El entorno de esta sesión **bloqueaba por completo** `git push` y la creación
de PR con la identidad gestionada: `git push` respondía `Permission ... denied to AIBARGUEN_bocc`
(403); la herramienta `create_pull_request` fallaba al intentar crear un fork
("Enterprise Managed User ... cannot access this content", 403). En su momento, ninguna vía
disponible en esta sesión permitía publicar el trabajo. Por eso:

- Fase B0+B+B1 (13 commits reales) y Fase C existieron **únicamente** en el
  worktree local, en la rama `feature/sprint-2.4-dependents`.
- El PR #3 en GitHub (`feature/sprint-2.4-prior-year-returns`) fue fusionado
  a `main`, pero su contenido real era un commit de estilo no relacionado
  (orden alfabético) — **no** contenía el trabajo de declaraciones
  anteriores. `main` no reflejaba ninguna de las fases de este sprint.

**Actualización posterior**: se diagnosticó que el bloqueo era causado por variables de entorno
(`GH_TOKEN`, `GIT_CONFIG_PARAMETERS`) que forzaban la identidad EMU gestionada para cualquier
operación con github.com, no una restricción real de la cuenta personal del usuario. Limpiando esas
variables y activando la cuenta personal (`gh auth switch`), el push funcionó con normalidad. Fase C
se publicó como **PR #4** y su revisión normativa puntual como **PR #5** (ambos fusionados a
`main`). Ver el detalle en la sección "Sprint 2.4 — Fase D" y "Revisión normativa puntual" más
arriba en este documento para el estado de publicación de las fases posteriores.
- Un humano con permisos debe empujar la rama local y abrir el PR
  manualmente, o ejecutar `gh auth login` con una cuenta habilitada en este
  mismo entorno.

## Sprint 2.4 — Fase B1 (integración UX de declaraciones anteriores)

Continúa exactamente sobre el estado local de Fase B0+B (commits `c9f7ca7`…`8e36c8e`, verificados
al inicio de esta fase). Ver detalle completo en
[`docs/PRIOR_YEAR_RETURNS.md`](./PRIOR_YEAR_RETURNS.md).

### Verificación inicial (punto 0 de la adenda)

- Los 6 commits de Fase B0+B existen en `HEAD`/historial local; `git status` estaba limpio antes de
  empezar.
- `docs/PRIOR_YEAR_RETURNS.md` existe en el working tree y su contenido corresponde al commit
  `8e36c8e`.
- `docs/PROJECT_HANDOFF.md` ya contenía el cierre de Fase B0+B antes de esta fase.
- **Discrepancia de `docs.zip`**: la sesión opera en un *worktree* (`aibarguen-bocc-...`) separado
  del checkout principal (`main`) del repositorio. Los commits de Fase B0+B viven únicamente en la
  rama de este worktree — todavía no están fusionados a `main`. Un ZIP de `docs/` tomado desde el
  checkout principal (o desde `main`) necesariamente mostrará la documentación previa al Sprint 2.4,
  porque esos archivos no han cambiado ahí. No es una inconsistencia del repositorio: es el
  historial esperado de una rama de trabajo todavía no fusionada.

### Fase B1 — completada funcionalmente

Un analista puede ahora, únicamente desde la UI (`Declaración → Declaraciones anteriores`):

1. Agregar una declaración cargando un Formulario 210 en PDF.
2. Ver el análisis local en tiempo real (`Analizando documento…` → `Formulario reconocido` /
   `Requiere revisión` / `No reconocido`).
3. Confirmar año gravable e indicar si corrige una declaración ya cargada.
4. Revisar identidad (bloqueo explícito y trazable si no coincide, nunca un "continuar de todas
   formas" genérico).
5. Ver las casillas extraídas con concepto humano, valor, confianza y procedencia (modo avanzado).
6. Ver la comparación de evolución tributaria contra el año actual, con anomalías de escala
   descartables (nunca autocorregidas).
7. Confirmar, corregir o rechazar el arrastre de anticipo (R133→R130) y de saldo a favor
   (R137→R131, con la pregunta de devolución/compensación del art. 850 ET).
8. Ver el impacto reflejado de inmediato en el borrador del Formulario 210 y en Revisión final.

Implementado: nueva vista `declaraciones-anteriores` en la etapa Declaración;
`apps/web/src/lib/priorYearReturns.ts` y `priorYearBoxLabels.ts` (orquestación de carga, sin
segundo parser en React); `PriorYearReturnsPanel.tsx` (listado, carga, drawer de detalle,
tarjetas de arrastre, evolución tributaria); 5 tipos de tarea nuevos derivados en `buildCaseTasks`
con deep-link desde Revisión final; reutilización de `saveTaxResolutionDecision` +
`rebuildForm210Draft` para aplicar arrastres (sin reimplementar el motor de liquidación);
`removePriorYearReturn` y `discardCaseTask` en el repositorio.

### Limitación conocida, documentada explícitamente

El arrastre se aplica mediante un ajuste genérico de casilla (`adjust_form_box`), no mediante el
input dedicado `Form210BuildInput.priorYearBalance` del motor puro (que ya modela la nuance de
devolución/compensación de forma más trazable). `rebuildForm210Draft` todavía no persiste ni lee
ese contexto. Documentado como trabajo futuro en `docs/PRIOR_YEAR_RETURNS.md` §7.

### Verificación ejecutada

- `pnpm --filter @nexus-tax/web typecheck`: verde.
- `pnpm --filter @nexus-tax/web lint`: verde, cero advertencias.
- `pnpm --filter @nexus-tax/web test`: 89/89 verdes (84 previos de la sesión + 1 nuevo en
  `taxCaseAnalysis.test.ts` + 4 nuevos en `PriorYearReturnsPanel.test.tsx`).
- `pnpm build`: verde (monorepo completo).
- `pnpm test:e2e`: 6/6 verdes (4 previos + 2 nuevos: flujo feliz completo y bloqueo por identidad),
  con capturas desktop (1280 px) y móvil (390 px) verificadas visualmente.
- `pnpm check:encoding`: sin mojibake.

Ningún test previo de la sesión desapareció; el conteo total pasó de 454 a 459 tests unitarios más
2 escenarios E2E nuevos (6/6 en total).

## Sprint 2.4 — Fase B0 (esqueleto Formulario 210) + Fase B (declaraciones anteriores)

Continúa sobre el cierre del Sprint 2.3.2. Ejecutado sobre `main`, sin operaciones destructivas
de Git. Ver detalle completo en [`docs/PRIOR_YEAR_RETURNS.md`](./PRIOR_YEAR_RETURNS.md).

### Corrección de la auditoría de Fase A

La conclusión inicial de la Fase A (que la adición de 72 UVT se resta directamente de la renta
líquida gravable consolidada) se corrigió: por instructivo oficial, la casilla 139 es un
**componente explícito** de la casilla 92 (rentas exentas y deducciones limitadas de la cédula
general), no una resta independiente posterior. La casilla 92 queda estructuralmente representada
pero sin fórmula calculada (`not_implemented`) hasta la Fase C.

### Fase B0 — esqueleto del Formulario 210

- `FORM_210_BOXES_2025` se completó con 14 casillas estructurales (89, 91, 92, 93, 111, 126, 127,
  129, 133, 137, 138, 139, 140, 141) usando un patrón nuevo (`structuralBox`) que declara
  `implementationStatus` y `legalBasisSourceIds` sin inventar fórmulas no verificadas.
- `Form210Section` agrega `general_income_consolidation`, `tax_settlement` e `informational`.
- Las casillas 126, 127, 129, 133 y 137 se cablean **informativamente** en `buildForm210Draft` con
  valores ya calculados por motores probados (impuesto de renta, impuesto de ganancias
  ocasionales, total a cargo, anticipo del año siguiente, saldo a favor) — la numeración oficial
  de casilla queda marcada como no verificada.
- **Hallazgo documentado, no oculto**: la aritmética de los fixtures de referencia sugiere una
  subcédula de "rentas de trabajo sin relación laboral" (honorarios/servicios, aprox. 43-57) no
  modelada; la casilla 89 queda en `requires_review` sin fórmula automática.
- Regresión ejecutada antes y después: 68/68 tests de `form-210` seguían verdes antes de agregar
  las 3 pruebas nuevas de la Fase B0 (71/71 después). Ningún valor previamente verificado cambió.

### Fase B — declaraciones anteriores

- Nuevos contratos en `@nexus-tax/domain`: `PriorYearTaxReturn`, `PriorYearBoxValue` (con `role`
  explícito: `carry_forward_candidate`/`calculation_input`/`historical_reference`/
  `comparison_only`/`context_prefill`/`not_reusable`), `PriorYearCarryForwardCandidate`.
- Nuevo parser puro en `@nexus-tax/document-intelligence`
  (`extractPriorYearForm210`) que detecta el Formulario 210, año gravable, identidad (enmascarada),
  estado y corrección, y extrae casillas por patrón número+etiqueta+valor. Verificado exactamente
  contra el oráculo anonimizado AG2024 de la adenda (23 casillas, incluidas 89, 126, 129, 133,
  137, 138, 139).
- Nuevo motor puro en `@nexus-tax/form-210` (`prior-year.ts`): arrastres de anticipo (R133→R130) y
  saldo a favor (R137→R131, con la pregunta de devolución/compensación del art. 850 ET),
  comparación de evolución tributaria (`stable`/`increase`/`decrease`/`relevant_variation`/
  `incomplete`/`not_comparable`) y detector de anomalías de escala histórica que **reutiliza**
  `detectMonetaryAnomalies` de Sprint 2.3.2 en vez de reimplementarlo.
- Dexie v13 agrega `priorYearReturns` y `priorYearCarryForwardCandidates` de forma aditiva.
  `apps/web/src/lib/repository.ts` expone la capa de persistencia completa y probada
  (`savePriorYearReturn`, `refreshPriorYearCarryForwardCandidates`,
  `decideCarryForwardCandidate`, `answerRefundCarryForwardQuestion`,
  `getTaxEvolutionComparison`).
- `CaseTaskType` agrega 5 tipos nuevos para declaraciones anteriores;
  `CaseTask.source` agrega `'prior_year_return'`.

### Pendiente explícito (no se avanzó, por decisión de alcance)

- El componente visual "Declaraciones anteriores" dentro del expediente y su wiring en la
  navegación (deep-links de tareas, quality gate visual, capturas Playwright). El motor y la
  persistencia están completos y probados; la UI queda para una iteración siguiente con revisión
  intermedia, tal como se solicitó explícitamente ("detente para revisión antes de Fase C").
- Fase C (beneficio de 72 UVT por dependiente, art. 336 ET, casillas 138/139) — explícitamente
  fuera de alcance de este incremento.
- Facturación electrónica DIAN, inmuebles, administración de propiedad horizontal y medicina
  prepagada (secciones D-G del Sprint 2.4) no se iniciaron.

### Verificación ejecutada

- `pnpm --filter @nexus-tax/domain test`: 19/19 verdes (15 previos + 4 nuevos).
- `pnpm --filter @nexus-tax/document-intelligence test`: 90/90 verdes (80 previos + 10 nuevos).
- `pnpm --filter @nexus-tax/form-210 test`: 84/84 verdes (68 previos + 16 nuevos).
- `pnpm --filter @nexus-tax/web typecheck`: verde.
- `pnpm --filter @nexus-tax/web test`: 84/84 verdes (82 previos + 2 nuevos).
- No se ejecutó `pnpm build` completo del monorepo ni Playwright E2E en este incremento (ver
  limitaciones); se recomienda ejecutarlos antes de fusionar.

## Corrección UX — orden alfabético consistente

Las listas visibles de entidades, conceptos/registros exógenos, candidatos,
requisitos, productos, documentos, hechos y conciliaciones se ordenan ahora con
un comparador compartido `es-CO`. El orden ignora diferencias de mayúsculas y
tildes y usa comparación numérica natural (`Entidad 2` antes de `Entidad 10`).

Las opciones de contexto (`Todos`, `Sin asociar`, `No reemplaza`) permanecen al
inicio. La clasificación solo afecta la presentación: no reordena ni muta
`normalizedRecords`, filas de evidencia, relaciones o cálculos del dominio. La
tabla de registros exógenos abre por defecto ordenada por entidad y permite
seguir alternando por fila, concepto y valor.

## Sprint 2.3.2 — exactitud monetaria y cierre guiado

### Diagnóstico y correcciones

- El normalizador anterior devolvía solo un `number` y no conservaba cómo
  interpretó separadores. `AmountCandidate` + parser `2.0.0` separa evidencia,
  decimal y peso fiscal; detecta escalas ×10/×100/×1000.
- Las alertas monetarias ahora impiden consolidar una casilla como confiable y
  se propagan a fórmulas dependientes.
- La regla laboral genérica capturaba rendimientos de cesantías por la palabra
  "empleado"; la regla financiera específica se evalúa antes.
- El patrimonio anterior podía caer en la regla patrimonial genérica; ahora es
  `prior_year_reference` informativo. Movimientos e inversiones efectuadas no
  se convierten en saldos de cierre.
- Intereses de vivienda confirmados llegan a R38; R37 y R40 derivan de sus
  operandos. Una conciliación confirmada excluye la exógena reemplazada para
  evitar doble conteo, conservando procedencia.
- Rechazar conciliación antes solo afectaba estado React. Ahora se persiste y
  restaura en Dexie; la sugerencia rechazada no reaparece tras recargar.

### Modelo, migración y UX

- Dexie v12 marca candidatos monetarios heredados para reanálisis y conserva el
  valor anterior. No altera hechos/resoluciones confirmados.
- Casillas: `provisional`, `requires_review`, `not_applicable`,
  `confirmed_zero` y `blocked`, además de estados previos.
- Procedencia visible con valor original, transformación, confianza y fuentes
  excluidas. Centro de resolución con valor, fuente esperada, destino y efecto.
- Nueva vista **Revisión final** y bloque **¿Qué me falta?**. Nunca afirma que
  la declaración fue presentada.

### Regresión y límites conocidos

`Form210RegressionComparison` clasifica coincidencia exacta, redondeo, revisión
y fallo en fixtures. Los valores del formulario manual de referencia no se
incluyen en producción. El motor ya protege R29 contra el saldo anterior, R58
contra doble fuente conciliada y R38/R40 contra pérdida de propagación.

Todavía requieren intervención humana: validar fuentes reales de renta exenta y
otras deducciones, confirmar documentos de confianza media, justificar
exclusiones, registrar declaración anterior si se desea comparar y verificar el
fundamento oficial de la política de redondeo al peso. No se afirma coincidencia
integral con el formulario real mientras esas fuentes no estén modeladas.

### Documentación nueva

- `MONEY_PARSING.md`
- `RESOLUTION_WORKFLOW.md`
- `CASE_CLOSURE.md`
- `FORM_210.md` como índice

### Siguiente incremento

Completar un corpus sintético multiproducto para todas las casillas del oráculo,
incorporar el comparativo de año anterior como fuente separada y ampliar E2E del
laboratorio documental al cierre final, sin datos reales ni servicios externos.

### Verificación ejecutada

- `pnpm typecheck`: verde.
- `pnpm lint`: verde, cero advertencias.
- `pnpm test`: 424 pruebas unitarias verdes.
- `pnpm build`: verde.
- `pnpm test:e2e`: 4/4 Playwright verdes.
- `pnpm check:encoding`: 345 archivos revisados, sin mojibake.
- Capturas verificadas: `revision-final-1280.png` y
  `revision-final-390.png` en la salida local de Playwright.

Playwright solo reporta advertencias no bloqueantes conocidas: `sharp`
opcional, variables npm que cambiarán en una versión mayor y la limitación de
generación estática al usar edge runtime.

## Cierre del Sprint 2.3.1 — validación tributaria y liquidación preliminar

Las 24 fases técnicas A–X quedaron implementadas y verificadas. El sprint amplía el borrador
trazable del Formulario 210 AG 2025 sin convertirlo en una declaración definitiva: conserva
revisión humana, ejecución local, fuentes versionadas y estados separados para obligación,
borrador, liquidación y presentación. Este último siempre permanece fuera de alcance.

### Resultado consolidado

- Catálogo único de fuentes oficiales y UVT 2025 centralizada.
- Once motores puros: tarifa progresiva, límite cedular, ganancias ocasionales, anticipo,
  dependientes, factura electrónica, deducciones individuales, validaciones patrimoniales, saldo
  anterior, retenciones y validaciones cruzadas.
- Liquidación privada preliminar explicable, impacto de decisiones y simulación
  previsualizar→confirmar sin mutar el dato original.
- Bundle exportable con ruleset, fuentes y borrador; tareas derivadas por casilla pendiente.
- Vistas Borrador F-210 extendido, Liquidación preliminar y Estados, con catálogos humanos y sin
  exponer enums internos.
- Veintidós documentos nuevos del sprint en `docs/`; el plan conserva el detalle por fase.

### Validación final reproducible

| Paso                  | Resultado                                                                          |
| --------------------- | ---------------------------------------------------------------------------------- |
| `pnpm check:encoding` | OK; 332 archivos revisados, 1 fixture excluida                                     |
| `pnpm typecheck`      | OK; 8 de 9 proyectos                                                               |
| `pnpm lint`           | OK; 0 errores y 0 advertencias                                                     |
| `pnpm test`           | OK; 402/402 (15 dominio, 129 Aegis, 47 parser, 66 documental, 64 Form 210, 81 web) |
| `pnpm build`          | OK; compilación Next.js y 5 páginas generadas                                      |
| `pnpm test:e2e`       | OK; 4/4 Chromium                                                                   |

El gate visual revisó capturas sintéticas en 1440 px, 1280 px y 390 px, temas oscuro/claro y
ausencia de desbordamiento horizontal. Durante el cierre se corrigieron dos comillas JSX de la
vista Estados que impedían pasar `react/no-unescaped-entities`.

### Decisiones y pendientes posteriores

- Se conserva el historial por fase; no se hace squash porque aporta trazabilidad normativa.
- Los estados `implemented_unverified` continúan visibles y no se promueven a `verified` sin una
  revisión normativa independiente.
- Siguen fuera de alcance firma, presentación DIAN/MUISCA, sanciones automáticas, backend e IA
  externa.
- Próximo paso seguro: revisión tributaria independiente de la matriz y ampliación del corpus
  sintético antes de modelar otro año gravable.

## Sprint 2.3.1 — Fase N (2026-08-07)

Se agrega el motor puro **consolidación de retenciones** (art. 373 ET):
suma total, conteo de retenciones sin certificado documental, detección
de pares con mismo retenedor y valor similar (tolerancia 1 %), y
validación opcional del desglose por origen (`employment`, `capital`,
`non_labor`, `occasional_gain`, `dividends`, `other`) contra el total
reportado.

El builder del F-210 arma `WithholdingSource[]` desde los records de
`category === 'withholding'` con `entityTaxId`; si la casilla 132 se
ajusta manualmente por encima de la suma de records, agrega una fuente
sintética `box:132:manual` para preservar el total. `Form210BuildInput
.withholdingsBreakdown` permite aportar el desglose por origen.
`preliminaryLiquidation.withholdings` conserva la consolidación
completa; `withholdingsCop` deriva de allí.

Documentación: [docs/WITHHOLDINGS_CONSOLIDATION_2025.md](WITHHOLDINGS_CONSOLIDATION_2025.md);
[docs/FORM_210_LIQUIDATION.md](FORM_210_LIQUIDATION.md) actualizado.
Verificación: `pnpm -r typecheck` verde; `pnpm -r test` = 366 tests OK
(aegis 118, form-210 39, resto sin regresiones).

## Sprint 2.3.1 — Fase M (2026-08-07)

Se agrega el motor puro **saldo a favor del año anterior** (art. 850 ET)
con confirmación humana obligatoria. Cuatro estados:
`no_declared`, `pending_confirmation`, `blocked_by_pending_request`,
`applied`. Solo el estado `applied` produce descuento; los demás publican
`appliedCop = 0` y emiten warnings específicos.

`Form210BuildInput.priorYearBalance` es opcional. Sin él, el motor ignora
la casilla 131 y emite un warning si tiene valor. Con él,
`preliminaryLiquidation.priorYearBalance` conserva la evaluación completa
(estado, razón legible, fecha de la declaración anterior, evidencia).

Documentación: [docs/PRIOR_YEAR_BALANCE_2025.md](PRIOR_YEAR_BALANCE_2025.md);
[docs/FORM_210_LIQUIDATION.md](FORM_210_LIQUIDATION.md) actualizado.
Verificación: `pnpm -r typecheck` verde; `pnpm -r test` = 352 tests OK
(aegis 108, form-210 36, resto sin regresiones).

## Sprint 2.3.1 — Fase E (2026-08-07)

Se agregan **límites individuales declarativos** por concepto: AFC/AVC/FVP
(30 % del ingreso, 3.800 UVT anuales — arts. 126-1/126-4), intereses de
vivienda (1.200 UVT anuales — art. 119) y medicina prepagada (192 UVT
anuales — art. 387 par. 2).

`Form210BuildInput.individualDeductions` es opcional. Cuando se aporta, el
builder ejecuta `applyIndividualDeductionLimit` para cada concepto,
cablea el aplicado a la casilla objetivo (35, 38, 39) como fuente
`calculation` y expone la lista completa de computaciones en
`preliminaryLiquidation.individualDeductionLimits`. Los recortes generan
findings `unsupported_deduction` con severidad `warning`.

Documentación: [docs/INDIVIDUAL_DEDUCTIONS_2025.md](INDIVIDUAL_DEDUCTIONS_2025.md);
[docs/FORM_210_LIQUIDATION.md](FORM_210_LIQUIDATION.md) actualizado.
Verificación: `pnpm -r typecheck` verde; `pnpm -r test` = 342 tests OK
(aegis 102, form-210 32, resto sin regresiones).

## Sprint 2.3.1 — Fase G (2026-08-07)

Se agrega la **deducción por facturas electrónicas** (art. 336-1 ET, Ley
2277 de 2022) al motor puro y al borrador del F-210. Regla:
`min(1 % × compras_con_FE, 240 UVT)` con `bindingCandidate` explícito.

`Form210BuildInput.electronicInvoicing` es opcional. Cuando se aporta, el
builder ejecuta `computeElectronicInvoicingDeduction`, cablea la deducción
como fuente `calc:electronic-invoicing-336-1` en la casilla 39 (se acumula
con la de dependientes) y expone la computación en
`preliminaryLiquidation.electronicInvoicingDeduction`.

Documentación: [docs/ELECTRONIC_INVOICING_2025.md](ELECTRONIC_INVOICING_2025.md);
[docs/FORM_210_LIQUIDATION.md](FORM_210_LIQUIDATION.md) actualizado.
Verificación: `pnpm -r typecheck` verde; `pnpm -r test` = 331 tests OK
(aegis 91, form-210 31, resto sin regresiones).

## Sprint 2.3.1 — Fase I (2026-08-07)

Se agrega un motor puro de **validaciones patrimoniales** (art. 261 ET) con
tres reglas: deuda sin activo respaldo, movimientos significativos sin
patrimonio bruto declarado y posibles duplicados en la casilla 29. Las
funciones son puras y parametrizables por UVT (`thresholdUvt`) y tolerancia
(`toleranceRelative`).

`Form210ValidationFinding['code']` se extiende con `liability_without_asset`,
`movement_without_balance` y `duplicate_patrimony_entry`. `validate()` del
builder invoca las tres funciones al final del ciclo y emite un finding por
disparo, con casillas y sourceIds vinculados.

Documentación: [docs/PATRIMONY_CHECKS_2025.md](PATRIMONY_CHECKS_2025.md).
Verificación: `pnpm -r typecheck` verde; `pnpm -r test` = 321 tests OK
(aegis 84, form-210 28, resto sin regresiones).

## Sprint 2.3.1 — Fase F (2026-08-07)

Se agrega la **deducción por dependientes** (art. 387 ET) al motor puro y al
borrador del F-210. Regla: `min(10 % × ingresos_trabajo, Σ 32 UVT × meses,
dependientes_elegibles × 384 UVT)` con máximo 4 dependientes.

`Form210BuildInput.dependents` es opcional. Cuando se aporta, el builder
calcula los ingresos brutos desde la casilla 32, ejecuta
`computeDependentsDeduction` y cablea el resultado como fuente
`calc:dependents-387` en la casilla 39. La computación queda en
`preliminaryLiquidation.dependentsDeduction` con todos los candidatos
limitantes. Warnings automáticos por exceso de dependientes o ausencia de
ingresos.

Documentación: [docs/DEPENDENTS_DEDUCTION_2025.md](DEPENDENTS_DEDUCTION_2025.md);
[docs/FORM_210_LIQUIDATION.md](FORM_210_LIQUIDATION.md) actualizado.
Verificación: `pnpm -r typecheck` verde; `pnpm -r test` = 303 tests OK
(aegis 70, form-210 24, resto sin regresiones).

## Sprint 2.3.1 — Fase L (2026-08-07)

Se agrega el **anticipo del impuesto de renta del año siguiente** (art. 807
ET) al motor puro y a la liquidación privada preliminar del F-210. Tres
tramos: 25 % / 50 % / 75 % según `filingCountIncludingCurrent`.
`computeAdvancePayment` elige la base más conservadora entre `current_only`
y `average_of_two`, descuenta las retenciones del año declarado y jamás
produce anticipo negativo.

`Form210BuildInput.advancePaymentContext` es opcional. Si el analista lo
provee y hay impuesto de renta positivo, `nextYearAdvance` se calcula y
`netBalanceCop` lo suma; si falta, se emite un warning explícito.

Documentación: [docs/ADVANCE_PAYMENT_2025.md](ADVANCE_PAYMENT_2025.md);
[docs/FORM_210_LIQUIDATION.md](FORM_210_LIQUIDATION.md) actualizado.
Verificación: `pnpm -r typecheck` verde; `pnpm -r test` = 288 tests OK
(aegis 61, form-210 21, resto sin regresiones).

## Sprint 2.3.1 — Fase H (2026-08-07)

Se agrega el **impuesto orientativo de ganancias ocasionales** al motor puro
(`packages/aegis-rules`) y se cablea a la liquidación privada preliminar del
Formulario 210. Dos tarifas versionadas:

- `general` 15 % — art. 314 ET (Ley 2277 de 2022), `et-art-314`.
- `lottery` 20 % — art. 317 ET, `et-art-317`.

`Form210BuildInput` acepta un `occasionalGainsBreakdown` opcional. Si no se
provee, toda la casilla 115 tributa al 15 % con warning que invita a
desglosar. `Form210PreliminaryLiquidation.occasionalGainsTax` pasa de `null` a
`OccasionalGainsTaxComputation | null`, y `totalTaxDueCop` suma renta + GO.

Documentación: [docs/OCCASIONAL_GAINS_2025.md](OCCASIONAL_GAINS_2025.md);
[docs/FORM_210_LIQUIDATION.md](FORM_210_LIQUIDATION.md) actualizado.
Verificación: `pnpm -r typecheck` verde; `pnpm -r test` = 278 tests OK
(aegis 51, form-210 18, resto sin regresiones).

## Sprint 2.3.1 — Fase K (2026-08-07)

Se entrega la **liquidación privada preliminar** del Formulario 210 AG 2025.
El `Form210Draft` ahora incluye `preliminaryLiquidation`
(`Form210PreliminaryLiquidation`) con:

- Casillas 41 / 65 / 82 calculadas con el art. 336 ET (min(40 %, 1.340 UVT,
  componente_detectado)) vía `applyLimitRule` de aegis-rules.
- Casillas 66 y 83 derivadas por sustracción y marcadas `ruleComplete`.
- Impuesto de renta con la tarifa progresiva del art. 241 ET (`computeProgressiveIncomeTax`).
- Descuento de anticipos, saldo a favor previo y retenciones (130/131/132).
- Estado `insufficient_data | zero | refund | to_pay`, warnings y aviso fijo
  "Liquidación preliminar orientativa — no presentada ante la DIAN".

Se decide **no** inventar numeración oficial para las casillas de impuesto,
GO, total a cargo y saldo hasta verificarlas contra el formulario. La tarifa de
ganancias ocasionales, el anticipo y las sanciones permanecen fuera de alcance
hasta las Fases H / L / manuales.

Documentación: [docs/FORM_210_LIQUIDATION.md](FORM_210_LIQUIDATION.md).
Plan actualizado en [docs/PLAN_SPRINT_2.3.1.md](PLAN_SPRINT_2.3.1.md).
Verificación: `pnpm -r typecheck` verde; `pnpm --filter @nexus-tax/form-210
test` 14/14; sweep `pnpm -r test` sin regresiones.

## 1. Estado actual

Monorepo pnpm inicializado con el alcance completo del Sprint 1 implementado a
nivel de código: dominio, parser de exógena, UI compartida, app Next.js con las
8 pantallas, persistencia local, exportación JSON, documentación y pruebas.

El parser distingue ahora reportes seccionados: conserva metadatos, detecta el
encabezado, extrae el resumen variable de topes y normaliza únicamente el
detalle reportado por terceros. La detección se puede revisar y corregir en la
pantalla de inspección antes de procesar.

La lectura ya no confía en `worksheet['!ref']` como límite: deriva `fullRows` de
las celdas reales, incluso si el XLSX declara solo 15 filas y contiene detalle
posterior. `previewRows` es una proyección exclusiva de UI y nunca alimenta el
pipeline.

El reporte extrae ahora la identidad del consultante, muestra su documento
enmascarado, distingue los dos NIT jerárquicos, valida coincidencias por registro,
estructura el uso sugerido y clasifica cada fila con reglas versionadas. El
resumen separa métricas homogéneas de la suma bruta no consolidada.

El paquete puro `@nexus-tax/aegis-rules` evalúa offline la obligación orientativa
de declarar para AG 2025: mapea los cinco topes, solicita la condición de IVA,
respeta los operadores oficiales y calcula el vencimiento 2026 por los últimos
dos dígitos. La UI muestra explicación, evidencia, versión y fuentes DIAN.

> El resultado exacto de instalación / build / lint / typecheck / tests se
> registra en la sección **4. Validaciones** (se actualiza tras ejecutarlas en
> el entorno del desarrollador).

## 2. Decisiones

- **Next.js 14 (App Router) + React 18.3**: estabilidad probada con Web Workers.
- **Paquetes consumidos como TypeScript fuente** (`transpilePackages`), sin build
  propio por paquete — simplicidad para Sprint 1.
- **Parser puro y determinista** en `packages/exogenous-parser` (IDs por hash).
- **Web Worker** para el parseo con **fallback** en hilo principal.
- **Dexie/IndexedDB** para persistencia; **no** se guarda el archivo original.
- **Reglas y sinónimos configurables** (adaptadores) preparados para Aegis Engine.
- **Filas 1-based en `ExogenousReportStructure`**: coinciden con Excel y con la
  evidencia; `headerRowIndex` se conserva por compatibilidad interna.
- **Detección de secciones por contenido**: identidad/concepto/valor para el
  detalle y descripción/valor para topes, sin constantes de posición o cantidad.
- **Fuente completa separada de la preview**: worker y fallback conservan
  `fullRows`; `buildWorkbookPreviews` limita únicamente lo que se renderiza.
- **Encabezados jerárquicos**: el grupo padre forma parte de la clave de columna;
  los dos encabezados NIT del formato DIAN no son duplicados.
- **Clasificación inicial v1**: prioridad código → casilla sugerida → detalle →
  tipo de entidad; es orientativa y no calcula el Formulario 210.
- **PDF local limitado**: requisitos aceptan solo metadatos PDF y estado
  `received`; no se persiste ni analiza el binario.
- **Aegis anual y versionado**: criterios y calendario viven fuera de React; no
  se consulta la DIAN en tiempo de ejecución y un dato ausente es no evaluable.
- **Monto de comparación**: se usa el valor oficial redondeado y se conserva el
  resultado exacto de UVT para trazabilidad.

## 3. Comandos

```bash
corepack enable
pnpm install
pnpm dev                 # http://localhost:3000
pnpm build
pnpm lint
pnpm typecheck
pnpm test
pnpm --filter @nexus-tax/web test:e2e
node samples/generate-sample.mjs   # genera un Excel sintético de prueba
```

## 4. Validaciones

| Paso         | Comando             | Resultado                           |
| ------------ | ------------------- | ----------------------------------- |
| Install      | `pnpm install`      | OK; enlazó el nuevo paquete Aegis   |
| Build        | `pnpm build`        | OK; Next compiló y generó 5 páginas |
| Lint         | `pnpm lint`         | OK; 0 warnings / 0 errors           |
| Typecheck    | `pnpm typecheck`    | OK; 6 proyectos verificados         |
| Unit tests   | `pnpm test`         | OK; 76/76 pruebas                   |
| Smoke (e2e)  | `pnpm ... test:e2e` | OK; 1/1 en Chromium                 |
| Muestra XLSX | `node samples/...`  | OK; archivo sintético generado      |

## 5. Pendientes

- Persistir el mapeo manual de columnas por expediente (hoy es por sesión).
- Incorporar reglas Aegis para años distintos de 2025 antes de evaluarlos.
- Virtualización de tablas muy grandes (hoy: paginación de 25 filas).
- Métricas de rendimiento con archivos muy grandes en Web Worker.

## 6. Siguiente paso exacto

1. `node samples/generate-sample.mjs` y probar el flujo en `pnpm dev`:
   crear expediente → cargar `samples/exogena-sintetica.xlsx` → inspeccionar →
   confirmar filas 14 / 15–19 / 20 → procesar → revisar que haya 5 topes y que
   solo el detalle alimente registros, hallazgos y checklist → exportar JSON.
2. Revisar la pestaña Obligación, responder la condición de IVA y contrastar la
   evidencia y la fecha con el RUT antes de usar el resultado.

## 7. Riesgos conocidos

- **Web Worker + monorepo**: si el bundler no resuelve el worker en algún
  entorno, actúa el fallback en hilo principal (menor rendimiento, mismo
  resultado).
- **Heurística de categorías/encabezados**: orientativa; el mapeo manual es la
  vía de corrección. No debe interpretarse como verdad tributaria.
- **Heurística de secciones**: formatos con columnas atípicas pueden requerir
  ajustar manualmente el rango de topes y el inicio del detalle en Inspección.
- **Clasificación tributaria inicial**: requiere revisión humana; las casillas y
  palabras clave no sustituyen reglas legales ni el cálculo del Formulario 210.
- **Obligación orientativa**: solo cubre los seis criterios configurados para AG 2025. El estado técnico `required` no sustituye asesoría ni decisión de la DIAN.
- **PDFs**: solo se conserva metadata. El análisis profundo corresponde al
  futuro backend y debe diseñarse antes de persistir binarios.
- **Compatibilidad de versiones** (Next/React/recharts): fijadas a rangos
  probados; revisar al actualizar mayores.

## 8. Entrega: clasificacion resoluble y matriz (2026-07-31)

### Estado inicial

El parser v1 clasificaba de forma orientativa, pero los hallazgos no podian
resolverse, no existian relaciones entre registros ni una matriz que evitara
doble conteo. IndexedDB conservaba resultados y la respuesta de IVA, no
decisiones de analisis.

### Cambios implementados

- Dominio v0.3.0 con relaciones, multiplicidad, resoluciones con historial,
  disposiciones de consolidacion, matriz y tres dimensiones de calidad.
- Parser v0.4.0 / reglas 2.0.0 con prioridad por evidencia, facturacion
  electronica, conceptos laborales y de inversion, relaciones de subconjunto,
  resumen, movimiento y posible duplicado.
- Matriz preliminar con grupos tributarios, conciliacion contra cinco topes,
  diferencias, confianza, evidencia y prevencion de doble conteo.
- Flujo local de resolucion desde Hallazgos, filtros ampliados en Registros y
  pestaña Matriz. El valor, entidad, texto y ubicacion originales son inmutables.
- Dexie v3 agrega `analyses`; las decisiones sobreviven recargas y se marcan
  obsoletas al cambiar la regla o clasificacion automatica.
- Export normalizado actualizado al esquema 4.

### Reglas y decisiones arquitectonicas

La base susceptible de factura electronica es `subset_of` del total y solo
alimenta el calculo orientativo del 1 %. Los promedios laborales son
informativos, un CDT efectuado es movimiento y un fondo al cierre es activo. Un
valor positivo no determina activo/pasivo. Las reglas siguen en el paquete puro;
React presenta y el repositorio aplica/persiste la superposicion manual.

### Pruebas y resultados exactos

Se añadieron casos sinteticos para facturacion, relaciones, multiplicidad,
activos/pasivos, inversiones, resumen/componentes, conciliacion, resolucion,
restauracion, obsolescencia, calidad y recarga.

| Paso                  | Comando                                 | Resultado                 |
| --------------------- | --------------------------------------- | ------------------------- |
| Typecheck             | `pnpm typecheck`                        | OK; 6 proyectos           |
| Unitarias/integracion | `pnpm test`                             | OK; 85/85 pruebas         |
| Lint                  | `pnpm lint`                             | OK; 0 warnings / 0 errors |
| Produccion            | `pnpm build`                            | OK; 5 paginas generadas   |
| E2E                   | `pnpm --filter @nexus-tax/web test:e2e` | OK; 1/1 Chromium          |

### Riesgos, pendientes y siguiente paso

Las relaciones se infieren por reglas conservadoras; un duplicado posible queda
pendiente y todavia no existe UI especifica para confirmar/rechazar la relacion
independientemente del registro. La conciliacion es preliminar y un certificado
solo aporta estado/metadatos, no valores extraidos.

Siguiente paso exacto: validar con una copia local del expediente del usuario,
sin incorporarla al repositorio, revisar cada grupo de Matriz y resolver primero
`pending_records`; despues contrastar saldos con certificados y registrar reglas
deterministas adicionales para cualquier etiqueta realmente desconocida.

## 9. Entrega: tema claro/oscuro y pulido de Registros (2026-08-01)

### Estado inicial

La app era **solo oscura** (colores fijos `text-slate-*` / `white/x`). En
Registros, la barra de filtros se amontonaba en un `flex-wrap` irregular, la
columna Clasificación se veía comprimida y el detalle expandido era una hilera de
badges sueltos.

### Cambios implementados

- **Sistema de tema claro/oscuro** con tokens semánticos por variables CSS en
  `globals.css` (`surface`, `overlay`, `content`, `tone-*`) mapeados a Tailwind.
  Se migraron ~270 clases fijas a tokens tema-conscientes (los acentos de marca se
  conservan; en claro los tonos de estado usan variantes más profundas).
- **`ThemeProvider` + `ThemeToggle`** (sol/luna en la cabecera) con persistencia en
  `localStorage`, respeto de `prefers-color-scheme` y **script inline anti-parpadeo**.
- **Badges** y **tooltips de gráficas** ahora son tema-conscientes.
- **Registros**: barra de filtros en **grilla uniforme** + "Limpiar filtros";
  columna **Clasificación** con puntos de estado de color y ancho mínimo; **detalle
  expandido reorganizado por secciones** (Clasificación, Trazabilidad,
  Consolidación, Relaciones, Uso sugerido, Columnas adicionales).

### Nota operativa

La configuración TS de Tailwind (`tailwind.config.ts`) **no se recarga en caliente**:
tras editarla hay que **reiniciar `pnpm dev`** (el `next build` sí toma los cambios).
Se añadió `.claude/launch.json` para gestionar el dev server.

### Validaciones (resultados exactos)

| Paso      | Comando              | Resultado                         |
| --------- | -------------------- | --------------------------------- |
| Typecheck | `pnpm typecheck`     | OK; 6 proyectos                   |
| Lint      | `pnpm lint`          | OK; 0 warnings / 0 errors         |
| Tests     | `pnpm test`          | OK (incluye parser 43, web 12)    |
| Build     | `pnpm build`         | OK; 5 páginas generadas           |
| Tema      | verificación en vivo | OK; conmuta dark↔light y persiste |

### Pendientes / siguiente paso

Opcionales de UI: encabezado de tabla "pegajoso" (`sticky`), densidad ajustable
(compacto/cómodo) y resaltar con anillo de acento la fila enfocada al llegar desde
Hallazgos.

## 10. Entrega: Sprint 2.0 — expediente tributario (2026-08-01)

### Estado inicial encontrado

La exógena, matriz y resoluciones ya funcionaban. También había cambios locales
recientes de tema claro/oscuro y pulido de Registros, todavía sin confirmar, que
se conservaron. `TaxCase` era mínimo; documentos solo ofrecía cuatro tipos y el
checklist enlazaba metadatos PDF. No existían coberturas multipropósito,
productos, hechos documentales ni conciliación documental.

### Implementación

- Rama dedicada: `sprint-2-tax-case`.
- Dominio v0.4.0: ciclo de vida del expediente, catálogo de 16 documentos,
  productos, coberturas, hechos con historial, sugerencias y conciliaciones.
- Dexie v4: tablas aditivas `documentBlobs`, `products`, `coverages`, `facts` y
  `reconciliations`; migración de estados de expedientes anteriores.
- Biblioteca con SHA-256, detección de duplicados, persistencia explícita,
  descarga/eliminación local, versiones y reemplazos sin romper relaciones.
- Cobertura completa, parcial, no aplicable o revisable. Un mismo certificado
  puede cubrir varios requisitos.
- Hechos manuales claramente identificados, con autoría, evidencia e historial.
- Sugerencias deterministas por entidad, categoría, valor y concepto. El estado
  conciliado exige confirmación humana.
- Panel general con cinco progresos separados, acciones rápidas y explicación
  de pendientes; secciones Entidades, Documentos, Requisitos, Hechos,
  Conciliaciones, Matriz y Hallazgos, conservando las vistas existentes.
- Manifiesto `nexustax.tax-case.manifest` 2.0.0 sin binarios.
- UI nueva construida exclusivamente con tokens semánticos para tema claro y
  oscuro.

### Seguridad y arquitectura

El soporte se guarda por defecto solo como metadatos. `store_locally` conserva
bytes únicamente en IndexedDB y `removeDocumentBinary` los elimina sin borrar
metadatos. La contraseña no existe en los esquemas persistibles. No hay red,
OCR, IA ni extracción avanzada. Los binarios nunca entran al manifiesto.

### Validaciones exactas

| Paso                  | Comando                                 | Resultado                 |
| --------------------- | --------------------------------------- | ------------------------- |
| Typecheck             | `pnpm typecheck`                        | OK; 6 proyectos           |
| Unitarias/integración | `pnpm test`                             | OK; 98/98 pruebas         |
| Lint                  | `pnpm lint`                             | OK; 0 warnings / 0 errors |
| Producción            | `pnpm build`                            | OK; 5 páginas generadas   |
| E2E                   | `pnpm --filter @nexus-tax/web test:e2e` | OK; 1/1 Chromium          |

El E2E crea el expediente, procesa exógena sintética, resuelve un hallazgo,
registra un PDF local, crea un hecho manual y comprueba persistencia tras
recargar.

### Riesgos y pendientes

- Los binarios grandes consumen la cuota del navegador; hoy se muestra el uso,
  pero no se estima la cuota disponible antes de guardar.
- Las sugerencias no interpretan PDFs: dependen de hechos digitados o importados
  y siempre requieren revisión.
- La UI confirma asociaciones sugeridas de un hecho con un registro; el dominio
  ya admite múltiples IDs, pero falta un editor avanzado de asociaciones N:M.
- El catálogo es inicial y versionado en código; nuevos formatos deben añadir
  pruebas y reglas de compatibilidad.

### Siguiente paso exacto

Probar con soportes sintéticos de varios productos para una sola entidad:
registrar certificado consolidado → asignar coberturas parciales/completas →
crear hechos por producto → revisar sugerencias → confirmar diferencias →
exportar el manifiesto y verificar `includesBinaryData: false`. Después diseñar
el editor N:M antes de cualquier extractor PDF.

## 11. Entrega: Sprint 2.0.1 — checklist laboral (2026-08-01)

### Estado inicial

El checklist generaba un requisito independiente de Formulario 220 por entidad.
No existía un agregado laboral que conservara empleadores, períodos, documento
principal, complementos y cobertura por instancia. Tampoco había una guía
funcional reproducible ni una convención oficial de commits.

### Implementación

- Dominio v0.4.1 con `EmploymentIncomeGroup` y `EmployerInstance`; máximo de
  tres instancias activas, estados explícitos, documento enmascarado, período,
  entidad, 220 principal, complementos y trazabilidad temporal.
- Detección pura de empleadores por concepto laboral o categoría de entidad,
  deduplicada por identificación y nombre normalizado. Varios conceptos de la
  misma entidad crean una sola instancia.
- Las entidades adicionales al límite se conservan y producen un hallazgo
  informativo; no se descartan silenciosamente.
- Dexie v5 agrega `employmentGroups`; creación automática al procesar,
  persistencia tras recarga, edición manual y borrado transaccional.
- El Formulario 220 salió del checklist genérico. El grupo laboral permite
  agregar una segunda o tercera instancia, marcar no aplica, eliminar, editar
  período y asociar entidad y documentos.
- Un 220 cubre una sola instancia. Los complementos generan cobertura parcial y
  el certificado consolidado exige confirmación expresa con advertencia.
- La vista por entidad muestra el 220 asociado sin crear otro requisito.
- Manifiesto `nexustax.tax-case.manifest` 2.0.1 incluye el grupo laboral y sigue
  excluyendo binarios.
- Se crearon `docs/SPRINT_2_VALIDATION.md` y
  `docs/COMMIT_CONVENTIONS.md`; AGENTS y CLAUDE exigen el estándar.

### Validaciones exactas

| Paso                  | Comando                                 | Resultado                 |
| --------------------- | --------------------------------------- | ------------------------- |
| Typecheck             | `pnpm typecheck`                        | OK; 6 proyectos           |
| Unitarias/integración | `pnpm test`                             | OK; 110/110 pruebas       |
| Lint                  | `pnpm lint`                             | OK; 0 warnings / 0 errors |
| Producción            | `pnpm build`                            | OK; 5 páginas generadas   |
| E2E                   | `pnpm --filter @nexus-tax/web test:e2e` | OK; 1/1 Chromium          |

El E2E comprueba detección laboral, ausencia del 220 duplicado, creación de una
segunda instancia y persistencia después de recargar, además del flujo completo
del Sprint 2.0.

### Riesgos y siguiente paso

La interfaz limita deliberadamente la edición activa a tres empleadores; los
adicionales quedan exportados para una ampliación futura. Los períodos y la
equivalencia de un certificado consolidado requieren decisión humana porque no
se interpretan PDFs.

Siguiente paso exacto: ejecutar la matriz manual de
`docs/SPRINT_2_VALIDATION.md` con fixtures sintéticos de uno, dos, tres y cuatro
empleadores; registrar evidencia local y priorizar cualquier diferencia antes
de ampliar el límite o diseñar extracción documental.

## 12. Entrega: Sprint 2.0.2 — navegación guiada (2026-08-01)

### Estado inicial

El expediente exponía doce pestañas React en una barra horizontal. No había
rutas por vista, restauración de navegación, progresión explícita ni un punto de
entrada claro para un caso nuevo. La carga exógena era efímera, pero la UI no
diferenciaba con precisión la fuente de sus resultados derivados.

### Implementación

- Seis etapas: Fuente, Extracción, Organización, Conciliación, Declaración y
  Exportación, con vistas contextuales y estados explicados.
- Motor puro y determinista para disponibilidad, destino válido y siguiente
  acción; Formulario 210 e Historial permanecen deshabilitados como futuros.
- Rutas estables por etapa/vista, breadcrumb, restauración del último destino
  válido y foco transferido al contenido.
- Inicio en Fuente, modo manual confirmado, resumen de fuente con SHA-256 local y
  acciones confirmadas de reemplazo/eliminación.
- Eliminación selectiva: invalida resultados exógenos, conserva documentos y
  hechos manuales.
- Dexie v6 con `navigationStates`; manifiesto 2.0.2 con estado del flujo.
- Stepper en grilla y selectores móviles, sin carrusel horizontal; estados no
  dependientes solo del color y respeto por movimiento reducido.
- Documentación nueva: `EXPEDIENT_WORKFLOW.md` y `NAVIGATION_STAGES.md`.

### Validaciones exactas

| Paso                  | Comando                                             | Resultado                 |
| --------------------- | --------------------------------------------------- | ------------------------- |
| Typecheck             | `pnpm typecheck`                                    | OK; 6 proyectos           |
| Unitarias/integración | `pnpm test`                                         | OK; 122/122 pruebas       |
| Lint                  | `pnpm lint`                                         | OK; 0 warnings / 0 errors |
| Producción            | `pnpm build`                                        | OK; 5 páginas generadas   |
| E2E                   | `pnpm test:e2e -- apps/web/tests-e2e/smoke.spec.ts` | OK; 2/2 Chromium          |

### Riesgos y siguiente paso

El archivo original sigue sin persistirse: al recargar antes de procesar debe
seleccionarse de nuevo, por diseño de privacidad. El modo manual no habilita
conclusiones que requieren exógena. Formulario 210 e Historial no tienen lógica.

Siguiente paso exacto: ejecutar la matriz manual actualizada en cinco anchos,
validar reemplazo/eliminación con datos sintéticos y registrar evidencia antes
de ampliar reglas, múltiples fuentes o capacidades futuras.

## Experiencia: tema oscuro, navegación fluida y rediseño de documentos (2026-08-01)

### Estado inicial

La app seguía la preferencia del sistema (a veces abría en claro). Al cambiar de
paso, `applyDestination` hacía `router.push` además de actualizar el estado
local: eso disparaba una navegación RSC completa en cada cambio (parpadeo, "se ve
la anterior", salto de scroll y 400 intermitente en navegaciones rápidas). Las
vistas de documentos y valores eran planas: muros de campos y casillas
`Entidad · Documento` repetidas.

### Cambios implementados

- **Modo oscuro por defecto**: el script anti-parpadeo ya no consulta
  `prefers-color-scheme`; abre en oscuro salvo preferencia explícita guardada.
- **Navegación sin recarga**: la URL de etapa/vista se actualiza con la History
  API (`pushState`/`replaceState`, soportada por Next 14.2), no con el router.
  Se eliminó el parpadeo, el salto de scroll (`focus({ preventScroll })`) y el
  400 intermitente. Se añadió sincronización con atrás/adelante (`popstate`).
- **Rediseño de vistas de documentos y valores** (helper `entityVisuals`):
  - `RequirementsPanel`: agrupado por entidad, iconos por categoría, progreso y
    asociación de documentos expandible (menos saturación).
  - `DocumentsPanel`: zona de carga drag & drop, "Requisitos que cubre" agrupado
    por entidad (sin repetir el prefijo) e iconos por tipo de documento.
  - `FactsPanel`: formulario por secciones (Qué registras / Origen / Vínculo /
    Clasificación avanzada colapsable) con formato de moneda en vivo y `optgroup`
    por entidad.
  - `EmploymentIncomeGroupPanel`: tarjetas de empleador con cabecera de estado,
    subsecciones (Datos / Formulario 220 / Complementarios / Observaciones) y
    acciones con icono.

### Nota operativa

No ejecutar `pnpm build` mientras `pnpm dev` está activo: ambos comparten `.next`
y el build desincroniza el CSS del dev server (página sin estilos). Recuperación:
refresco fuerte del navegador o reiniciar `pnpm dev`. Verificación durante dev
solo con `typecheck` y `lint`.

### Validaciones

| Paso      | Comando              | Resultado                      |
| --------- | -------------------- | ------------------------------ |
| Typecheck | `pnpm typecheck`     | OK; 6 proyectos                |
| Lint      | `pnpm lint`          | OK; 0 warnings / 0 errors      |
| Tema      | verificación en vivo | OK; abre en oscuro por defecto |

### Pendiente

Rediseño del `UploadPanel` (cargues) con estados animados, alineado con la
biblioteca documental.

## 13. Entrega: Sprint 2.0.3 — fuentes aceptadas y consistencia UX (2026-08-01)

### Estado recibido

Antes de este sprint, Claude había corregido la navegación RSC, establecido el
modo oscuro predeterminado y rediseñado Documentos, Requisitos, Hechos y el
grupo laboral. Esos cambios se conservaron. Quedaban enums visibles, dos
dropzones duplicados, un input PDF aislado y ningún contrato para aceptar
provisionalmente un valor exógeno o justificar un soporte no emitido.

### Implementación

- Dominio 0.5.0: fuentes de información, aceptación exógena, diez estados,
  motivos, reconocimiento de ganancias ocasionales, gestión de requisito no
  emitido e historiales.
- Dexie v7 agrega `acceptedSources` y `requirementSourceDecisions` sin cambiar
  claves ni valores existentes. El manifiesto 2.0.3 exporta valor original,
  provisional, motivo, regla, requisito, reemplazo e historial; no exporta
  binarios.
- Aceptación disponible desde Requisitos, Hechos, Conciliaciones, Matriz y
  Hallazgos. “Otro motivo” y “cobrado para un tercero” exigen explicación.
- Flujo de premio propio, operación no reconocida y cobro para tercero. Nunca
  calcula impuesto, presume base gravable ni excluye automáticamente.
- Una conciliación humana con un hecho respaldado por documento marca la fuente
  como respaldada, contradicha o no comparable y conserva el historial.
- La aceptación anota el registro ya presente: no crea otro hecho sumable ni
  cambia la matriz, evitando doble conteo.
- Catálogos en español para relaciones, coberturas, métodos, revisiones,
  conciliaciones, fuentes, decisiones, entidades, documentos y estados. Se
  corrigieron `active`, estados con guion bajo, categorías de entidad, métodos,
  revisiones, conciliaciones y códigos técnicos visibles.
- `FileDropzone` unifica exógena, biblioteca y PDF de requisito con clic,
  teclado, drag/drop, selección, reemplazo, quitar, formato, tamaño, privacidad,
  error, deshabilitado y progreso.
- Quality gate y microcopy obligatorios para Claude y Codex.

### Validaciones exactas

| Paso                  | Comando                                             | Resultado                        |
| --------------------- | --------------------------------------------------- | -------------------------------- |
| Typecheck             | `pnpm typecheck`                                    | OK; 6 proyectos                  |
| Unitarias/integración | `pnpm test`                                         | OK; 133/133 pruebas              |
| Lint                  | `pnpm lint`                                         | OK; 0 warnings / 0 errors        |
| Producción            | `pnpm build`                                        | OK; 5 páginas generadas          |
| E2E                   | `pnpm test:e2e -- apps/web/tests-e2e/smoke.spec.ts` | OK; 2/2 Chromium                 |
| Visual                | capturas Playwright locales                         | OK; oscuro 1440/390 y claro 1440 |

### Riesgos, pendientes y siguiente paso

La coincidencia con un documento posterior depende de hechos digitados y de una
confirmación humana; no se interpreta el PDF. El alias de un tercero es opcional
y deliberadamente no exige identificación sensible. Las fuentes futuras
asistidas permanecen deshabilitadas.

Siguiente paso: validar manualmente con fixtures sintéticos un valor igual, uno
contradictorio y uno no comparable; revisar la exportación 2.0.3 y después
diseñar, sin OCR todavía, un editor N:M de fuentes y documentos.

## 14. Corrección: modales de requisitos fuera de las tarjetas (2026-08-01)

### Problema y causa

Los diálogos de “La entidad no emite este soporte” y “Usar valor de la exógena
provisionalmente” se montaban dentro de las tarjetas animadas de Requisitos. El
`transform` de Framer Motion convertía ese ancestro en el contenedor del
posicionamiento `fixed` y el `overflow-hidden` de `GlassPanel` recortaba el
contenido, especialmente en ganancias ocasionales.

### Implementación

- `ModalPortal` monta ambos diálogos directamente en `document.body`.
- El panel limita su alto con unidades de viewport dinámico y conserva scroll
  vertical y `overscroll-contain`, sin depender de la tarjeta de entidad.
- Mientras el diálogo está abierto se bloquea el scroll del fondo; Escape y los
  controles visibles permiten cerrarlo, y el foco entra al diálogo.
- Playwright acepta `PLAYWRIGHT_BASE_URL` para validar contra un servidor de
  desarrollo ya activo sin reconstruir ni alterar su directorio `.next`.

### Validaciones exactas

| Paso                  | Comando                                                                                               | Resultado                   |
| --------------------- | ----------------------------------------------------------------------------------------------------- | --------------------------- |
| Typecheck             | `pnpm typecheck`                                                                                      | OK; 6 proyectos             |
| Unitarias/integración | `pnpm test`                                                                                           | OK; 134/134 pruebas         |
| Lint                  | `pnpm lint`                                                                                           | OK; 0 warnings / 0 errors   |
| E2E                   | `$env:PLAYWRIGHT_BASE_URL='http://localhost:3000'; pnpm test:e2e -- apps/web/tests-e2e/smoke.spec.ts` | OK; 2/2 Chromium            |
| Visual                | captura Playwright del modal en Requisitos                                                            | OK; panel completo y scroll |

No se ejecutó `pnpm build` porque había una sesión `pnpm dev` activa y
ambos procesos comparten `.next`; el build queda cubierto por el quality gate al
cerrar esa sesión.

## 15. Entrega: Sprint 2.1 — extracción documental local y asistida (2026-08-01)

### Estado inicial

`main` ya contenía expediente Sprint 2.0.3, documentos/binarios locales, hechos,
coberturas, fuentes aceptadas, conciliación y matriz. No existían lector PDF,
sesiones de extracción, candidatos, adaptadores ni revisión. Los adjuntos eran
metadatos/binarios y los hechos se registraban manualmente.

### Decisiones y arquitectura

- Se creó `@nexus-tax/document-intelligence`, puro respecto de React, Dexie y la
  matriz. Separa lector, normalizador, clasificador, adaptadores, matching,
  pipeline, límites y contratos.
- Se eligió `pdfjs-dist` 5.4.624 por su lectura desde bytes, worker,
  `onPassword`, progreso y destrucción de recursos. Para compatibilidad con
  Next 14, `predev`/`prebuild` copian sus módulos al mismo origen y el navegador
  los importa sin transformación Webpack; no se usa CDN.
- Node mínimo sube a 20.16 por la versión elegida. Los límites son 25 MiB, 250
  páginas, 500 candidatos y 120 segundos.
- Dexie v8 agrega `extractionSessions` y `documentCandidates`. El manifiesto
  2.1.0 exporta trazabilidad mínima con `includesFullText: false` e
  `includesPasswords: false`.
- El candidato es distinto del hecho. Solo `confirm` crea `DocumentFact` con
  captura `assisted`; correcciones sustanciales exigen observación y conservan
  antes/después. Reprocesar crea una sesión nueva y deja candidatos previos
  obsoletos sin borrar decisiones.
- La vista **Revisión de extracción** permite corregir tipo, reprocesar,
  confirmar/corregir/rechazar/restaurar y asociar entidad, producto, requisito y
  registro exógeno. La conciliación sigue requiriendo confirmación separada.

### Modelos, adaptadores y privacidad

Se añadieron `DocumentExtractionSession`, `DocumentFactCandidate`,
`DocumentClassification`, hallazgos y decisiones. Los adaptadores v1 cubren
Formulario 220, certificado financiero multipropósito, deuda, saldos, intereses
de vivienda, cesantías y predial; un octavo extractor concepto–valor actúa como
fallback de baja confianza.

La contraseña vive solo en estado de UI durante el intento. No se persisten
buffers, workers, objetos PDF ni texto completo; la evidencia se limita a un
fragmento. Marcar el documento obsoleto elimina binario, sesiones y candidatos.
La prueba de navegador afirma cero solicitudes HTTP fuera del origen local
durante la extracción.

### Validaciones exactas

| Paso                                                                              | Resultado                                                                    |
| --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `pnpm typecheck`                                                                  | OK; 7 de 8 proyectos del workspace, 0 errores                                |
| `pnpm test`                                                                       | OK; 153/153 pruebas (11 dominio, 26 Aegis, 14 documentos, 43 parser, 59 web) |
| `pnpm lint`                                                                       | OK; 0 warnings / 0 errors                                                    |
| `NEXUSTAX_NEXT_DIST_DIR=.next-build pnpm build`                                   | OK; compilación y 5 páginas generadas                                        |
| `PLAYWRIGHT_BASE_URL=http://localhost:3000 pnpm --filter @nexus-tax/web test:e2e` | OK; 2/2 Chromium                                                             |
| Visual                                                                            | capturas sintéticas de revisión a 1280 px y 390 px, sin overflow             |

El build aislado evita competir con el `pnpm dev` activo en `.next`. Los tests
PDF usan archivos sintéticos creados en memoria; no se añadió información
tributaria real.

### Riesgos, no soportado y siguiente paso

- PDF.js advierte en fixtures Node sobre `standardFontDataUrl`; no afecta la
  extracción de texto, pero debe configurarse si futuros adaptadores dependen de
  renderizado o fuentes estándar.
- No hay OCR: PDF escaneado, imagen, estructura dañada o cifrado no resuelto
  termina con salida recuperable y registro manual. Tampoco hay anotación visual
  exacta, IA, backend ni cálculo del Formulario 210.
- Los adaptadores son genéricos; variantes de emisores reales deben incorporarse
  únicamente mediante fixtures anonimizados/sintéticos y reglas versionadas.
- La comparación entre ejecuciones existe en datos, pero la UI solo muestra la
  última por documento; una comparación lado a lado queda pendiente.

**Siguiente paso exacto:** probar localmente certificados sintéticos con tablas
y etiquetas partidas en varios bloques, ampliar fixtures por adaptador y diseñar
una comparación de ejecuciones antes de evaluar OCR local.

## 16. Identidad visual: icono y marca de cabecera (2026-08-01)

Se incorporaron los PNG entregados por el propietario del proyecto: el isotipo
vive como `apps/web/src/app/icon.png` y Next lo publica como icono de pestaña; la
marca horizontal vive en `apps/web/public/branding/nexustax-home.png` y reemplaza
la marca anterior en la cabecera global. Los originales conservan transparencia
y no se modificaron; la cabecera recorta visualmente sus márgenes con CSS y
superpone el subtítulo usando tokens semánticos para mantener contraste en ambos
temas.

Validación: typecheck web OK, lint web sin advertencias, ruta `rel="icon"`
generada por Next y smoke responsive Chromium OK sin desbordamiento horizontal.

## 17. Corrección: descarte y extracción financiera por producto (2026-08-01)

### Problemas reproducidos

- Rechazar, marcar duplicado o dejar un candidato como informativo guardaba la
  decisión, pero la tarjeta seguía ocupando la revisión activa.
- Una frase explicativa sobre el artículo 115 ET producía el falso importe
  `$115`; numeraciones, años y porcentajes también podían parecer dinero.
- Los certificados financieros con tablas perdían la relación entre producto,
  columna e importe. Una carga posterior resultaba poco clara porque la sesión
  anterior seguía dominando visualmente la revisión.

### Implementación y decisiones

- Los estados descartados se ocultan de inmediato y quedan en una sección
  plegable, restaurable y trazable. Los obsoletos permanecen como evidencia de
  una ejecución sustituida, sin acción de restauración.
- El adaptador financiero sube a 1.1.0. El detector monetario excluye referencias
  normativas, porcentajes, años y numeración de apartados; además evita duplicar
  totales cuando ya existen filas de detalle.
- La posición de los bloques PDF permite reconstruir columnas y encabezados de
  una o varias líneas. Cada candidato conserva `productLabel`, evidencia, regla,
  página y columna conceptual; la UI muestra los productos detectados.
- El pipeline intenta asociar el producto detectado con los productos del caso
  mediante tipo, etiqueta y entidad. La sugerencia nunca confirma ni crea un
  hecho automáticamente.
- El flujo E2E carga dos PDFs sintéticos consecutivos y comprueba que la segunda
  sesión presenta sus propios valores. No se añadieron documentos tributarios
  reales al repositorio.

### Cobertura incorporada

Se añadieron fixtures sintéticos para referencias legales, certificados de
fondos de empleados, tablas financieras posicionadas, encabezados partidos y
asociación de producto. El navegador valida rechazo, ocultamiento, restauración
y sustitución por una nueva carga.

### Validaciones exactas

| Paso                                                                                                         | Resultado                                                                    |
| ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| `pnpm typecheck`                                                                                             | OK; 7 de 8 proyectos del workspace, 0 errores                                |
| `pnpm test`                                                                                                  | OK; 158/158 pruebas (11 dominio, 26 Aegis, 19 documentos, 43 parser, 59 web) |
| `pnpm lint`                                                                                                  | OK; 0 warnings / 0 errors                                                    |
| `NEXUSTAX_NEXT_DIST_DIR=.next-build pnpm build`                                                              | OK; compilación y 6 rutas generadas                                          |
| `PLAYWRIGHT_BASE_URL=http://localhost:3000 pnpm --filter @nexus-tax/web test:e2e -- tests-e2e/smoke.spec.ts` | OK; 2/2 Chromium                                                             |

### Riesgos y siguiente paso

El motor sigue siendo local y determinista, sin OCR ni IA. Un PDF escaneado o
una tabla cuya capa de texto no conserve posiciones requiere registro manual.
Los formatos nuevos deben incorporarse con ejemplos anonimizados o fixtures
sintéticos; no se deben codificar nombres de emisores ni datos personales.

**Siguiente paso exacto:** validar documentos reales únicamente en el navegador
del usuario, registrar qué columnas o etiquetas no se reconocen y convertir
esas variantes en fixtures sintéticos antes de extender otra regla.

---

## Sprint 2.1.1 — estabilización documental y pendientes accionables

### Estado

- El extractor ya no corta candidatos en `maxCandidates`; registra advertencia y conserva el total.
- La sesión audita páginas, bloques, secciones, candidatos generados/persistidos y estados.
- La revisión pagina 10/20/50/100, filtra, conserva historial y soporta decisiones masivas.
- El rechazo exige motivo y el reproceso empareja por firma estable para no reactivar descartes.
- La identidad separa NIT, razón social, marca, grupo y producto; Bancolombia, Fiduciaria
  Bancolombia y Nequi conservan entidades independientes.
- Los requisitos cubiertos por otros soportes se ocultan por defecto y coberturas inválidas se
  recalculan al reemplazar u obsoletar.
- `CaseTask` y la vista `Pendientes del expediente` entregan acciones con destino concreto.
- Obligación legal y preparación operativa se presentan como conceptos independientes.

### Decisiones y riesgos

La detección de tabla es deliberadamente simple y determinista; no sustituye revisión humana. El
catálogo de alias es versionado y nunca fusiona NIT diferentes. Las tareas son derivadas: cuando una
causa desaparece se marcan resueltas para preservar auditoría. No se incorporaron OCR, red, backend
ni IA externa.

### Validación

Fixtures exclusivamente sintéticos cubren 550 candidatos sin pérdida, líneas/columnas/secciones,
productos ambiguos, identidad Grupo Bancolombia, tareas, persistencia, rechazo, restauración y
reproceso. El smoke Playwright añade un PDF de 55 candidatos, paginación y operación masiva.

Validación cerrada: `pnpm typecheck`, `pnpm test` (165 pruebas), `pnpm lint`, `pnpm build` y
`pnpm --filter @nexus-tax/web test:e2e` (2 escenarios Chromium) finalizan correctamente. El smoke
incluye capturas de escritorio/móvil, ausencia de scroll horizontal y revisión paginada de 55
candidatos.

**Siguiente paso exacto:** validar documentos reales únicamente en el navegador del usuario y
convertir cualquier nueva variante observada en un fixture sintético antes de modificar reglas.

## 18. Diseño previo — Sprint 2.2: laboratorio documental, OCR local y calibración (2026-08-02)

### Por qué existe esta sección

AGENTS.md exige no avanzar hacia OCR sin diseñarlo y validarlo antes. Esta entrada es ese diseño:
se escribió y se acordó con el propietario del proyecto antes de tocar código, sobre la rama
`feature/sprint-2.2-document-lab-ocr` creada desde `main` (limpio, con Sprint 2.1.1 ya integrado).

### Estado real encontrado (evita repetir trabajo)

- Ya existe modelo geométrico completo (bloques, líneas, columnas, secciones, tablas simples) desde
  2.1.1 en `packages/document-intelligence/src/structure.ts` y `contracts.ts`. El diagnóstico por
  página de este sprint se **extiende** sobre ese modelo, no lo reemplaza.
- `DocumentPageRepresentation.readConfidence` ya distingue `high/low/insufficient`, pero el valor
  `medium` está declarado en el tipo y nunca se asignaba en `reader.ts`; el diagnóstico de tipo de
  PDF debe corregir ese hueco.
- La extracción posicional "por producto" (Sprint 2.1.1, adaptador financiero 1.1.0) ya reconstruye
  columnas por coordenadas x/y; el futuro laboratorio de zonas se apoyará en esa heurística existente.
- `CaseTask` no tiene campo de página; las tareas del tipo "página requiere OCR" necesitarán una
  migración de esquema, no solo una regla nueva.
- Los adaptadores comparten una única constante de versión y `selectAdapter` no usa
  `activationSignals`; "perfil documental" (fases futuras) es un concepto nuevo, no una extensión
  del adaptador actual.
- No existe hoy worker para PDF (el análisis corre en el hilo principal); solo el parser de exógena
  usa Web Worker (`apps/web/src/workers/parser.worker.ts`), que sirve de patrón a replicar.
- `DocumentExtractionSessionSchema.textPersisted` es `z.literal(false)`: OCR y laboratorio deben
  seguir sin persistir texto completo.

### Decisión técnica: OCR

**Tesseract.js** (Apache-2.0), vendorizado localmente sin CDN igual que `pdfjs-dist` (assets en
`apps/web/public/vendor/tesseract`, copiados en `predev`/`prebuild`), con `spa.traineddata` variante
"fast" (~2.2 MB) como opción por defecto; una variante de mayor calidad queda para una fase futura y
solo bajo pedido explícito del usuario, nunca descarga automática. El motor de OCR se orquesta desde
`apps/web` (worker de aplicación); `packages/document-intelligence` se mantiene puro y solo define el
contrato unificado de tokens y las funciones de comparación nativo/OCR — nunca instancia un Worker ni
toca el DOM.

### Alcance de este bloque (Fases A, B y C)

El pedido completo (34 secciones: diagnóstico, OCR, laboratorio visual, perfiles documentales,
feedback de calibración, tareas, métricas, exportación, corpus sintético, E2E) excede un solo bloque
de trabajo razonable. Se ejecuta en fases dentro de la misma rama, cada una con su propio commit y
validación (`pnpm typecheck/lint/test/build`):

- **Fase A** — Corrección de codificación: script `check:encoding` (detecta mojibake en
  ts/tsx/js/json/md/yml) y auditoría real del repo.
- **Fase B** — Diagnóstico de tipo de PDF y de página (textual/escaneado/híbrido/protegido/dañado),
  usando y corrigiendo `readConfidence`, expuesto en `DocumentExtractionSession` (migración Dexie).
- **Fase C** — OCR local bajo demanda: Tesseract.js vendorizado, worker con progreso/cancelación/
  watchdog, contrato unificado texto nativo/OCR, comparación de fuentes, preprocesamiento de imagen,
  auditoría de cero solicitudes de red.

Fases D (laboratorio documental visual), E (perfiles y calibración), F (tareas/métricas/exportación/
fallos) y G (corpus sintético completo, E2E de 14 pasos, rendimiento, documentación final) quedan
para bloques posteriores, documentadas en la conversación de diseño pero no implementadas aún.

### Riesgos identificados antes de implementar

- Tesseract.js no reduce automáticamente el tamaño de imagen antes de procesarla y su heap WASM solo
  crece (nunca decrece) durante la vida del worker; hay que limitar resolución y recrear el worker
  entre documentos grandes, especialmente en móvil.
- Cualquier variante de mayor calidad del modelo de español pesa ~13 MB; no debe descargarse nunca
  automáticamente ni desde un CDN en tiempo de ejecución.
- La migración Dexie debe ser aditiva (no romper sesiones de extracción ya persistidas de 2.1.1).

### Cierre de Fases A, B y C (2026-08-02)

**Fase A** — `scripts/check-encoding.mjs` (Node puro) detecta mojibake por patrón de bytes
(UTF-8 reinterpretado como Latin-1/Windows-1252, carácter de reemplazo Unicode) y se expone como
`pnpm check:encoding`. Encontró y permitió corregir 31 coincidencias reales de codificación dañada
en 6 archivos (tildes/eñes/¿?/· rotos) que venían de un editor o copia intermedia anterior; ninguna
eran datos tributarios, solo texto de interfaz y mensajes.

**Fase B** — `diagnosePdfDocument` (`document-intelligence`) clasifica documento y página como
textual/escaneado/texto insuficiente/dañado a partir de `readConfidence` (que por fin asigna
`'medium'`, declarado desde 2.1.1 pero nunca usado) y los errores de lectura existentes. Se expone
como campo opcional de `DocumentExtractionSession`; no requirió migración de Dexie. La detección de
imágenes grandes por página queda fuera de este cambio (ver más abajo).

**Fase C** — Se agregó `tesseract.js` 7.0.0 vendorizado sin CDN (`docs/ARCHITECTURE.md` documenta la
justificación) y `OcrClient` en `apps/web`, que reutiliza el Web Worker interno de Tesseract con
watchdog, timeout, cancelación por `AbortSignal` y un único trabajo local concurrente (el heap WASM
de Tesseract solo crece durante la vida del worker). Escribir las pruebas de `OcrClient` encontró y
corrigió dos bugs reales antes de que llegaran a producción: el watchdog comparaba con `>` en vez de
`>=` (nunca disparaba en el límite exacto) y una señal de cancelación ya abortada antes de registrar
el listener de `abort` nunca rechazaba la promesa. `document-intelligence` gana `UnifiedTextToken`
(contrato común nativo/OCR), `compareTextSources` (los seis estados del punto 9 del pedido original,
sin fusionar nunca dos valores en conflicto), preprocesamiento de imagen puro (escala, contraste,
escala de grises, binarización, rotación en múltiplos de 90°, recorte de márgenes, mediana 3x3 para
ruido) y `recommendOcrPages` (recomienda página por página sin ejecutar OCR automáticamente, con
estimación cualitativa rápida/moderada/intensiva).

**Deliberadamente fuera de este bloque** (para no entregar código sin poder verificarlo):

- **Detección de imágenes grandes por página**: requiere interpretar el `operatorList` de PDF.js con
  su pila de transformaciones geométricas; se evaluó y se decidió no improvisarla sin poder
  verificarla visualmente. El diagnóstico de página usa señales de cobertura de texto, que ya
  distinguen escaneado/textual de forma confiable.
- **Renderizado de página a `<canvas>` para alimentar OCR real sobre un PDF**: `reader.ts` solo
  extrae texto hoy, nunca renderiza píxeles. Esta pieza conecta naturalmente con la Fase D (el
  laboratorio documental necesita renderizar la página de todos modos para mostrarla), así que se
  deja para entonces en vez de construirla sin una vista que la ejercite.
- Como consecuencia de lo anterior, **`reader.ts` sigue lanzando `no_text` cuando ninguna página
  tiene texto**: un PDF totalmente escaneado nunca llega a generar una `DocumentRepresentation` hoy.
  Antes de que el flujo de OCR bajo demanda sea utilizable de punta a punta, ese `throw` debe
  relajarse (Fase D), porque hoy le impide a `diagnosePdfDocument` siquiera evaluar ese caso.
- Corrección automática de orientación: requeriría el motor "legacy" de Tesseract (`osd`); se dejó
  `rotateQuarterTurns` como corrección manual seleccionada por el analista.

### Validación exacta (2026-08-02)

| Paso                                            | Resultado                                                                               |
| ----------------------------------------------- | --------------------------------------------------------------------------------------- |
| `pnpm typecheck`                                | OK; 7 de 8 proyectos del workspace, 0 errores                                           |
| `pnpm lint`                                     | OK; 0 warnings / 0 errors                                                               |
| `pnpm test`                                     | OK; 204/204 pruebas (11 dominio, 26 Aegis, 55 document-intelligence, 44 parser, 68 web) |
| `NEXUSTAX_NEXT_DIST_DIR=.next-build pnpm build` | OK; compilación y 7 rutas generadas                                                     |
| `pnpm check:encoding`                           | OK; 236 archivos revisados, 0 mojibake                                                  |

No se ejecutó `pnpm --filter @nexus-tax/web test:e2e` en este cierre: no se tocó ninguna vista ni
flujo de UI en las Fases A-C (todo el trabajo fue dominio, paquete puro y un cliente de aplicación sin
componentes React), así que no hay superficie nueva que el E2E existente pueda ejercitar; se retoma en
la Fase D, que sí agrega UI.

**Siguiente paso exacto:** con aprobación explícita, continuar con la Fase D (laboratorio documental),
que debe primero relajar el `throw` de `no_text` en `reader.ts` y agregar el renderizado de página a
`<canvas>` antes de construir la vista, ya que ambas piezas se necesitan para que el flujo de OCR bajo
demanda sea utilizable de punta a punta.

## 19. Entrega: Fases D y E — laboratorio documental, OCR real y perfiles (2026-08-02)

### Fase D — Laboratorio documental

Se relajó el `throw` de `no_text` en `reader.ts` (bloqueaba que `diagnosePdfDocument` evaluara el
caso más común de un documento escaneado) y se agregó `apps/web/src/lib/pdfPageRenderer.ts`, que
renderiza una página específica a píxeles usando el mismo módulo vendorizado de PDF.js que ya usa el
lector de texto.

Nueva vista `laboratorio` en la etapa Organización (`DocumentLabPanel.tsx`): selección de documento y
página, diagnóstico por página, modo básico/avanzado, ejecución de OCR local bajo demanda (con
progreso, cancelación y comparación de texto nativo contra OCR vía `compareTextSources`), overlay SVG
de capas (tokens nativos, tokens OCR, candidatos, con bordes sólidos/punteados/círculos para no
depender solo del color) y selección manual de campo que crea un `DocumentFactCandidate` real vía
`createManualDocumentCandidate` (nueva función en `repository.ts`), pasando por la revisión normal.

**Bugs reales encontrados y corregidos durante la verificación en navegador** (no solo compilación):

- Un servidor de Playwright de una validación anterior quedó vivo en el puerto 3101 tras un `kill`
  que no llegó al proceso real (particularidad de Windows/Git Bash con procesos hijos); el nuevo
  intento de arranque fallaba en silencio y el servidor viejo servía un build ya borrado, devolviendo
  500 en todos los assets. Se diagnosticó con capturas de consola del navegador antes de asumir un bug
  de código, y se documenta aquí porque puede repetirse: verificar `netstat` por el PID real antes de
  reintentar un `next start` en un puerto que debería estar libre.
- La vista previa de página ocupaba toda la altura del PDF (rectángulo casi vacío enorme en páginas
  con poco contenido); se limitó a `max-h-[70vh]` con scroll interno tras verlo en una captura real.
- `getByLabel('Concepto')` en el E2E coincidía también con el `<select>` de "Campo" porque Playwright
  arma el nombre accesible de un `<label>` concatenando el texto de todas sus opciones internas; se
  corrigió usando `getByRole` con el rol específico de cada campo.
- De paso, se corrigieron tres aserciones obsoletas en `smoke.spec.ts` (preexistentes, no
  relacionadas con este sprint): la pregunta de responsabilidad de IVA pasó de un `<select>` a tres
  botones en un sprint anterior sin actualizar el E2E.

### Fase E — Perfiles documentales y calibración

`DocumentProfile` y `ExtractionFeedback` (`packages/domain`), Dexie v10. Ambas tablas viven a nivel de
instalación, no de expediente: un perfil debe reconocerse en expedientes de años distintos, así que
`caseId` se dejó fuera deliberadamente (`entityId` queda como indicio, no como clave estable entre
expedientes). El catálogo de "campo capturable" (entidad/NIT/producto/fecha/concepto/valor/
retención/saldo/deuda/ingreso/otro) se movió a `DocumentCapturedFieldSchema` en el dominio para que el
candidato manual y los perfiles compartan la misma fuente de verdad.

`computeDocumentProfileSignals` y `matchDocumentProfiles` (`document-intelligence`, puro) comparan
dimensiones, número de páginas, secciones y encabezado con pesos fijos y explicables (25% cada uno);
nunca asocian solo por nombre de archivo y excluyen perfiles obsoletos. El laboratorio muestra las
coincidencias con su confianza y motivos, y permite crear un perfil en borrador desde el documento
actual — activarlo, probarlo u obsoletarlo sigue siendo una acción aparte
(`updateDocumentProfileStatus`), nunca automática. La selección manual de campo ahora también registra
un `ExtractionFeedback` con el alcance que el analista elige (solo este documento / sugerencia para
similares / actualización de perfil); ninguna de las tres opciones aplica nada por sí sola.

**Pendientes registrados al cierre de la fase E:**

- Editor de zonas por arrastre: quedó resuelto en las fases F–G mediante el overlay con coordenadas
  relativas 0–1 y alternativa accesible para seleccionar la página completa.
- Aplicar automáticamente las zonas de un perfil activo para pre-rellenar candidatos: el perfil se
  sugiere y se puede crear, pero todavía no alimenta la extracción — es el siguiente enganche natural
  una vez que existan perfiles reales probados con documentos similares.
- Registrar feedback desde las acciones de corrección/rechazo de `DocumentExtractionReviewPanel.tsx`
  (el panel de revisión ya existente y muy probado): se priorizó no tocar ese componente bajo presión
  de tiempo. El feedback sí se registra desde la selección manual de campo del laboratorio (mismo
  espíritu, menor riesgo de regresión).
- Precedencia de estrategias expuesta al usuario (perfil exacto > adaptador específico > genérico >
  OCR/manual): existe como orden conceptual documentado, pero no hay todavía un campo visible que
  diga "este candidato salió de un perfil" — los candidatos manuales sí distinguen
  `adapterId: 'manual.lab'` como estrategia identificable.

### Validación exacta (2026-08-02)

| Paso                                                                    | Resultado                                                                                                                             |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm typecheck`                                                        | OK; 7 de 8 proyectos del workspace, 0 errores                                                                                         |
| `pnpm lint`                                                             | OK; 0 warnings / 0 errors                                                                                                             |
| `pnpm test`                                                             | OK; 219/219 pruebas (13 dominio, 26 Aegis, 61 document-intelligence, 44 parser, 75 web)                                               |
| `NEXUSTAX_NEXT_DIST_DIR=.next-build pnpm build`                         | OK; compilación y 7 rutas generadas                                                                                                   |
| `pnpm --filter @nexus-tax/web test:e2e` (servidor aislado, puerto 3101) | OK; 4/4 escenarios Chromium, incluyendo OCR real (no mockeado)                                                                        |
| `pnpm check:encoding`                                                   | OK; 244 archivos revisados, 0 mojibake                                                                                                |
| Visual                                                                  | capturas Playwright reales: escritorio 1280, móvil 390, tema claro — sin desbordamiento horizontal, contraste correcto en ambos temas |

El estado vigente, la validación final y el siguiente paso se consolidan en la sección 20.

## 20. Entrega: Fases F y G — operación, calidad y cierre de Sprint 2.2 (2026-08-02)

### Fase F

- `CaseTask` 2.2.0 agrega destino por documento, sesión, perfil y página. Se derivan tareas para OCR
  recomendado, contradicción nativo/OCR, fallo recuperable y perfil en borrador; el laboratorio abre
  directamente el destino exacto.
- `DocumentExtractionSession.ocrOutcomes` conserva solo metadatos operacionales por página. Texto,
  tokens e imagen siguen siendo efímeros.
- Los fallos OCR ofrecen reintento, escala reducida y continuidad con texto nativo. Ninguna opción
  se ejecuta automáticamente.
- El manifiesto pasa a 2.2.0 con métricas agregadas de OCR, candidatos, perfiles vinculados y
  feedback. Declara que no contiene binarios, texto completo, contraseñas ni imágenes renderizadas.

### Fase G y quality gate visual

- Editor de zonas por arrastre con coordenadas relativas 0–1 y alternativa de teclado para marcar la
  página completa. Los perfiles tienen transiciones explícitas borrador→probado→activo→obsoleto.
- Corpus sintético de representaciones textuales, escaneadas, híbridas, horizontales y de dos
  columnas; E2E con PDF sin texto, OCR real, candidato manual, tarea por página, zona, tema oscuro/
  claro y 390 px.
- Se corrigió la lista nativa blanca de los cinco filtros de cobertura técnica mediante colores
  semánticos globales para `<option>`/`<optgroup>`. La auditoría eliminó además tres colores fijos
  fuera del estándar en drawer, acción primaria e indicador.
- `spa.traineddata` queda fijado a commit y SHA-256. Se crean `OCR_SECURITY.md`,
  `OCR_PERFORMANCE.md`, `DOCUMENT_LAB.md`, `DOCUMENT_PROFILES.md` y `EXTRACTION_FEEDBACK.md`.

### Validación exacta

| Paso                  | Resultado                                                                               |
| --------------------- | --------------------------------------------------------------------------------------- |
| `pnpm check:encoding` | OK; 252 archivos, una fixture excluida, sin mojibake                                    |
| `pnpm typecheck`      | OK; 7 de 8 proyectos, 0 errores                                                         |
| `pnpm lint`           | OK; 0 warnings / 0 errors                                                               |
| `pnpm test`           | OK; 227/227 pruebas (14 dominio, 26 Aegis, 66 document-intelligence, 44 parser, 77 web) |
| `pnpm build`          | OK; 7 rutas; verificación SHA-256 del modelo OCR correcta                               |
| `pnpm test:e2e`       | OK; 4/4 escenarios Chromium; OCR real y flujo completo                                  |
| Visual                | OK; capturas locales 1280/390, temas oscuro/claro y sin desbordamiento horizontal       |

### Riesgos y siguiente paso

- Los perfiles activos siguen siendo sugerencias: no aplican zonas ni crean candidatos
  automáticamente. Esta frontera es deliberada para conservar revisión humana.
- `DocumentLabPanel.tsx` concentra varias responsabilidades; la siguiente refactorización segura es
  separarlo en diagnóstico, OCR, overlay, perfiles y candidato manual sin cambiar comportamiento.
- Ampliar el corpus con más emisores sintéticos y medir por separado renderizado, carga de worker y
  reconocimiento antes de ofrecer nuevas optimizaciones.

## 21. Entrega Sprint 2.3 — centro de resolución y borrador 210 (2026-08-02)

### Estado entregado

- Nuevo `TaxResolutionDecision` inmutable: decisiones por registro, matriz, conciliación, candidato,
  requisito y casilla, con motivo, evidencia, versión y reversión por evento compensatorio.
- Centro de resolución operativo con alternativas compatibles, navegación a evidencia, prioridad
  bloqueante y estados completamente localizados al español.
- Política central de conciliación `co.form210.reconciliation.2025.v1`: igualdad, redondeo según
  unidad $1/$5, diferencia menor y relevante. Las sugerencias débiles no se confirman como acción
  primaria.
- Ganancias ocasionales separadas del ingreso ordinario; aportes obligatorios de salud/pensión se
  proponen como no constitutivos solo bajo contexto laboral explícito.
- Nuevo paquete puro `@nexus-tax/form-210`: ruleset AG 2025/presentación 2026, casillas 29–42,
  58–67, 74–84, 99–104, 112–115 y 130–132, fórmulas seguras, procedencia, validaciones y JSON.
- Dexie v11 agrega `resolutionDecisions` y `form210Drafts`; el derivado se reconstruye al cambiar
  fuente, hecho, aceptación o decisión. Eliminación de expediente y limpieza total cubren tablas.
- UI de borrador con aviso “no presentado ante la DIAN”, secciones, trazabilidad desplegable,
  ajustes motivados, restauración y exportación. Manifiesto actualizado a 2.3.0 sin binarios.

### Decisiones de alcance

- El ruleset solo calcula fórmulas marcadas completas. Casillas sin regla cerrada quedan explícitas
  como incompletas; no se aproximan límites, deducciones, rentas exentas ni impuesto.
- El borrador es una hoja de trabajo local. Firma, liquidación definitiva, presentación,
  autenticación y conexión con la DIAN siguen fuera de alcance.
- Las fuentes oficiales se verificaron al construir la versión y se incluyen como metadatos; la app
  no consulta internet durante el uso normal.

### Validación exacta

| Paso             | Resultado                                                                               |
| ---------------- | --------------------------------------------------------------------------------------- |
| `pnpm typecheck` | OK; 8 de 9 proyectos, 0 errores                                                         |
| `pnpm lint`      | OK; 0 warnings / 0 errores                                                              |
| `pnpm test`      | OK; 239/239 (15 dominio, 26 Aegis, 66 documental, 47 parser, 5 form-210, 80 web)        |
| `pnpm build`     | OK; compilación Next.js y 7 rutas                                                       |
| `pnpm test:e2e`  | OK; 4/4 Chromium; centro, ajuste persistente, export JSON, OCR y responsive 390–1440 px |

### Pendientes y siguiente paso

- Completar, con validación normativa independiente, las reglas hoy marcadas parciales del
  Formulario 210 y ampliar pruebas sintéticas de pensiones/dividendos/deducciones.
- Consolidar las resoluciones históricas de clasificación y el nuevo evento transversal bajo una
  única proyección de lectura, sin migración destructiva.
- Realizar validación tributaria manual de las fórmulas implementadas antes de ampliar el ruleset.

## 22. Cierre del plan de mejoras UX 2026-08-02

- P1–P3: borrado permanente con error visible, resolución manual de conciliaciones y onboarding del
  laboratorio.
- P0 adicional: contraseña temporal para PDF cifrado, solo en memoria y propagada a lectura/OCR.
- P4 acotado: aceptar exógena provisionalmente retira el registro de sugerencias; queda pendiente
  investigar otros usos de `suggestedUse` vinculados al borrador 210.
- P5: sugerencias consumidas se deduplican por hecho o registro ya conciliado.
- P6: microcopy centrado en tareas, resultados y consecuencias; no expone `token`, `assisted`,
  `blob`, `IndexedDB`, estados Tesseract ni nombres de tablas.

Validación de P6: `check:encoding` revisó 272 archivos; typecheck y lint completos sin errores;
240/240 pruebas unitarias y 4/4 E2E Chromium sobre el preview activo. El build se ejecutó con
`NEXUSTAX_NEXT_DIST_DIR=.next-build` para no interferir con el servidor de desarrollo del usuario:
compilación correcta y 5 páginas generadas.

## Sprint 2.3.1 — cimientos de validación normativa (2026-08-02)

### Estado inicial

`packages/form-210` calculaba ~10 casillas por sumas/restas literales del
instructivo y ~9 por agrupación heurística de `TaxCategory → box`. No existía
un catálogo consolidado de fuentes oficiales (aegis-rules y form-210 tenían
listas paralelas), la UVT vivía como constante en `filing-obligation.ts` y no
había una matriz de validación normativa que dejara explícito qué reglas están
verificadas y cuáles no.

### Cambios implementados (Fases A, B, C)

- **Fuentes oficiales.** Nuevo tipo `OfficialSourceReference` en
  `@nexus-tax/aegis-rules` como superconjunto retro-compatible de
  `FilingRuleSource`. Catálogo consolidado `OFFICIAL_SOURCES_2025` (6 fuentes:
  guía general, UVT, calendario, formulario, resoluciones 000044 y 000227) con
  helpers `getOfficialSource(id)` y `officialSourcesForBox(number)`.
- **UVT como fuente única.** Nuevo tipo `TaxUnitDefinition` y `TAX_UNIT_2025`
  en aegis-rules, más helpers `getTaxUnit`, `uvtToCop`, `copToUvt`. `UVT_2025`
  permanece como alias interno para no romper consumidores existentes.
- **Matriz de validación normativa.** Nuevo tipo `Form210RuleValidation`, más
  `FORM_210_VALIDATION_MATRIX_2025` en `@nexus-tax/form-210` (43 filas, 1 por
  casilla del ruleset). Un bloqueo de coherencia lanza al cargar si la matriz
  y el ruleset dejan de coincidir. Helpers `getBoxValidation(boxNumber)` y
  `summarizeValidationStatus()`.
- **Test dedicado.** `tests/validation-matrix.test.ts` valida cobertura,
  ejemplos deterministas y consistencia aritmética de las casillas `verified`.
- **Documento vivo.** `docs/TAX_RULE_VALIDATION_MATRIX.md` publica los criterios
  y la línea base de cobertura.

### Validaciones exactas

| Paso               | Comando                                          | Resultado                        |
| ------------------ | ------------------------------------------------ | -------------------------------- |
| Typecheck aegis    | `pnpm --filter @nexus-tax/aegis-rules typecheck` | OK                               |
| Tests aegis        | `pnpm --filter @nexus-tax/aegis-rules test`      | OK; 26/26                        |
| Typecheck form-210 | `pnpm --filter @nexus-tax/form-210 typecheck`    | OK                               |
| Tests form-210     | `pnpm --filter @nexus-tax/form-210 test`         | OK; 10/10 (5 builder + 5 matriz) |

### Riesgos y siguiente paso

El sprint 2.3.1 completo (fases D-X) requiere semanas de trabajo experto en
tributación colombiana con verificación normativa por regla. Cerrar todo en un
solo pase implicaría fórmulas sin respaldo oficial confirmado, lo que rompe la
política de "no afirmar obligaciones legales que sean solo interpretaciones".

Siguiente paso exacto: retomar por la Fase D (cédula general) con la matriz
como brújula — cada casilla que pase a `verified` debe adjuntar el número de
regla del instructivo DIAN y su ejemplo determinista. Ver
`docs/PLAN_SPRINT_2.3.1.md` para el orden previsto.

## Sprint 2.3.1 — tarifa progresiva y límites cedulares (2026-08-03)

### Estado inicial

Tras cerrar Fases A, B y C (auditoría, catálogo de fuentes y UVT centralizada),
el motor puro no incluía todavía la tarifa progresiva del art. 241 ET ni el
límite conjunto del art. 336 ET. Ambos se necesitan para hablar de liquidación
preliminar de renta con respaldo normativo verificable.

### Cambios implementados (Fases J y D)

- **Tarifa progresiva de renta.** Nuevos tipos `ProgressiveTaxBracket`,
  `ProgressiveTaxTable`, `ProgressiveTaxComputation`. Tabla
  `PROGRESSIVE_TAX_BRACKETS_2025` con los 7 rangos del art. 241 ET; función
  `computeProgressiveIncomeTax` devuelve el detalle explicable (rango, tarifa
  marginal, excess UVT, impuesto UVT, impuesto redondeado a pesos, fórmula,
  `ruleSourceId`). Cada caso manual del art. 241 se ejercita en
  `tests/progressive-tax.test.ts` (9/9).
- **Límite conjunto del art. 336 ET.** Nuevos tipos `TaxLimitRule` y
  `TaxLimitComputation`. Tabla `TAX_LIMIT_RULES_2025` con 3 reglas (trabajo,
  capital, no laboral) usando el patrón `min(40 % × base, 1.340 UVT,
componente_detectado)`. La función `applyLimitRule` reporta explícitamente
  cuál candidato limitó el resultado. `tests/tax-limits.test.ts` cubre cada
  candidato limitante y casos degenerados (8/8).
- **Fuentes.** Se añadieron `et-art-241` y `et-art-336` al catálogo
  `OFFICIAL_SOURCES_2025`, con `relatedBoxNumbers` para las tres casillas
  limitadas (41, 65, 82).
- **Docs.** `docs/PROGRESSIVE_TAX_RATE_2025.md` y `docs/TAX_LIMITS_2025.md`
  documentan la fuente, la tabla, los ejemplos verificados y las reglas de
  actualización futura.

### Validaciones exactas

| Paso            | Comando                                          | Resultado      |
| --------------- | ------------------------------------------------ | -------------- |
| Typecheck aegis | `pnpm --filter @nexus-tax/aegis-rules typecheck` | OK             |
| Tests aegis     | `pnpm --filter @nexus-tax/aegis-rules test`      | OK; 43/43      |
| Sweep completo  | `pnpm -r test`                                   | OK; 240+ tests |

### Nota importante

El motor puro está listo y con fuente verificada, pero el `builder` del F-210
**aún no consume** estas reglas. Las casillas 41 / 65 / 82 permanecen en
`not_implemented` en la matriz de validación hasta que se cablen dentro del
builder (previsto en la fase K junto con la liquidación privada). Ese cambio
de estado debe ir acompañado de un ejemplo determinista adicional en la
matriz.

### Siguiente paso exacto

Continuar por la Fase K (impuesto neto, saldo a pagar / saldo a favor)
cableando `computeProgressiveIncomeTax` sobre la renta gravable resultante y
usando `applyLimitRule` en las casillas 41/65/82 del builder. Cada casilla que
pase a `verified` en la matriz debe añadir su ejemplo determinista y una
prueba dedicada en `packages/form-210/tests`.
