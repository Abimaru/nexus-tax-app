# Evidence Matching & Guided Reconciliation (Sprint 2.4, Fase E)

_Última actualización: 2026-09-06._

## Objetivo

Reducir el ruido numérico mostrado al analista tras la extracción documental (NIT, cuentas,
resoluciones, años, referencias legales, etc. malinterpretados como dinero) y presentar una
"Revisión guiada" con pocas decisiones humanas relevantes en vez de decenas de candidatos en
bruto. **No** reemplaza la revisión detallada existente (`DocumentExtractionReviewPanel`): la
conserva completa, siempre disponible detrás de un interruptor ("modo avanzado").

## Alcance de esta fase

- Clasificador de evidencia numérica por rol documental (dinero vs. ruido), puro y determinista.
- Evolución del emparejador candidato↔exógena existente (`suggestExogenousMatches`) con un estado
  granular que distingue explícitamente el redondeo de una coincidencia meramente probable.
- Contrato de "expectativa" (`ExpectedTaxEvidence`): qué espera encontrar el expediente,
  invirtiendo parcialmente el flujo habitual ("documento → qué encontré" → "expediente → qué estoy
  buscando").
- Capa de orquestación (`apps/web/src/lib/evidenceReview.ts`) que combina ambos para producir
  `EvidenceReviewSuggestion[]`: una sugerencia por expectativa (o por candidato sin relación),
  nunca una por cada par candidato/registro evaluado.
- UI `EvidenceReviewPanel` con resumen en lenguaje simple, confirmación en bloque acotada a
  coincidencias sin ambigüedad, captura manual guiada y el interruptor al modo avanzado.
- Dos nuevos tipos de tarea (`evidence_ambiguous_match`, `evidence_missing_expected`) que **no**
  sustituyen la generación existente por candidato (`confirm_candidate`/`identify_product`/
  `associate_entity`), sino que la complementan con las situaciones específicas de Guided Review.

## Por qué NO se unificó el segundo scorer existente

Durante la auditoría se encontró que `apps/web/src/lib/taxCaseAnalysis.ts` ya tiene un segundo
emparejador, `suggestReconciliations` (a nivel de `DocumentFact` ya confirmado, alimenta
`PreliminaryReconciliation`), que duplica buena parte de la lógica de puntuación de
`suggestExogenousMatches` (a nivel de `DocumentFactCandidate`, antes de confirmar). Unificarlos
habría sido un refactor mucho más grande y riesgoso que el alcance de esta fase. **Se dejó como
limitación conocida** para una futura Fase E2: hoy conviven dos scorers con criterios similares
pero no idénticos, cada uno resolviendo una etapa distinta del flujo (pre-confirmación vs.
post-confirmación).

## Clasificador de evidencia numérica

`packages/document-intelligence/src/evidenceClassifier.ts` expone
`classifyNumericEvidence(raw, context)`, puro y determinista: recibe el texto crudo de un token
numérico y su contexto (línea completa, índice, página) y devuelve un
`NumericEvidenceClassification` con:

- `role`: `money | tax_identifier | personal_identifier | account_number | document_reference |
  legal_reference | date | year | percentage | quantity | page_number | unknown`.
- `confidence`: `high | medium | low`.
- `reasons`: explicación legible (nunca un score crudo).
- `page`, `lineExcerpt`: trazabilidad hacia el documento.

Reglas de clasificación (orden de mayor a menor especificidad): NIT/RUT → `tax_identifier`;
cédula/documento de identidad → `personal_identifier`; cuenta/producto → `account_number`;
resolución/radicado/factura-como-número/consecutivo/folio/formulario → `document_reference`;
artículo/decreto/ley/circular/concepto DIAN → `legal_reference`; fecha/vencimiento →
`date`; año de 4 dígitos aislado (1900-2100) sin formato monetario → `year`; seguido de "%" →
`percentage`; página/hoja → `page_number`. Si nada de lo anterior aplica pero el token tiene
símbolo de moneda, formato de miles/decimales, o un valor ≥ 10.000, se clasifica como `money`
(con confianza según la señal más fuerte). En caso contrario, `unknown` (nunca se descarta un
token sin clasificar: siempre hay un rol y al menos una razón).

`packages/document-intelligence/src/adapters.ts` expone `classifyDocumentNumericEvidence(document)`,
que recorre todas las páginas/líneas de un `DocumentRepresentation` (reutilizando las mismas
líneas y filtros de línea explicativa que `monetaryMatches`) y clasifica cada token detectado por
`VALUE_PATTERN`. El pipeline (`analyzePdfDocument` en `packages/document-intelligence/src/
pipeline.ts`) usa el resultado para:

- Poblar `DocumentExtractionMetrics.numericEvidenceDetected/monetaryEvidencePromoted/
  numericNoiseSuppressed` (conteos agregados, nunca telemetría — quedan en el expediente local).
- Poblar `DocumentExtractionSession.suppressedNumericEvidence` (acotado a 200 entradas por sesión):
  la evidencia de ruido **nunca se elimina físicamente**, queda disponible para inspección en modo
  avanzado/laboratorio, solo se excluye de la revisión guiada normal.

Este clasificador es **independiente** del filtro ad-hoc que ya existía en `monetaryMatches()`
(rango de años, símbolo/formato explícito, umbral de 10.000): no lo reemplaza ni cambia qué se
convierte en `DocumentFactCandidate` hoy — añade una segunda capa de clasificación más explicable
para la evidencia que ya se excluye.

## Estado granular del emparejador (`CandidateExogenousMatchStatus`)

Vive en `packages/domain/src/evidenceMatching.ts` (no en `documentExtraction.ts`, para evitar un
ciclo de importación con `EvidenceReviewSuggestion`, que también lo referencia). Reemplaza el
enum anterior (`strong_match | probable_match | multiple_candidates | no_match |
possible_contradiction`):

| Estado | Significado |
| --- | --- |
| `exact_match` | Valor documental idéntico al reportado en la exógena. |
| `rounding_match` | El valor decimal documental (con centavos) redondea **exactamente** al entero reportado (`Math.round(decimalValue) === exogenousValue`), aunque los valores crudos difieran. |
| `minor_difference` | Diferencia ≤ 1 peso que **no** proviene de un redondeo de centavos (p. ej. ambos valores ya son enteros pero difieren en 1). |
| `possible_match` | Varias señales coinciden (categoría, entidad) pero el monto no permite confirmar. |
| `ambiguous` | Dos o más candidatos empatan en el primer lugar del ranking: requiere elección humana explícita. |
| `contradiction` | La diferencia es relevante y contradice el dato documental. |
| `no_match` | Sin relación suficiente. |

Solo `exact_match`/`rounding_match` **sin anomalías** y **sin ambigüedad** habilitan la
confirmación en bloque (`safeForBulkConfirm`). Ningún estado se autoconfirma: la confirmación en
bloque sigue siendo una acción humana explícita (un único clic sobre un lote ya filtrado, no una
automatización silenciosa).

`suggestExogenousMatches` (`packages/document-intelligence/src/matching.ts`) implementa esta
lógica sin reemplazar su firma ni su forma de rankear candidatos (score ≥ 35, top 3, empate por
`id`): solo evolucionó el mapeo final de score/diferencia al nuevo enum. `describeMatchConfidence`
traduce cada estado a una etiqueta y descripción humanas — es la única superficie que la UI debe
usar para mostrar confianza; el score interno nunca llega a la interfaz.

## Expectativa (`ExpectedTaxEvidence`)

`packages/domain/src/evidenceMatching.ts` también define `ExpectedTaxEvidence`: "el expediente
espera encontrar esto". El contrato es genérico (`sourceKind: exogenous_record | prior_year_return
| requirement | manual`), aunque hoy `buildExpectedTaxEvidence` (`apps/web/src/lib/
evidenceReview.ts`) solo lo deriva de `NormalizedExogenousRecord` con valor reportado no nulo.
Conserva `category`, `nature` y `treatment` del registro de origen para que la captura manual
guiada **nunca** tenga que volver a preguntarlos.

## Guided Review (`EvidenceReviewSuggestion`)

`buildEvidenceReviewSuggestions` (`apps/web/src/lib/evidenceReview.ts`) combina expectativas y
candidatos en una sugerencia por expectativa (agrupando todos los candidatos que el matcher ya
relacionó con ese registro exógeno) más una sugerencia por cada candidato sin relación con ninguna
expectativa (`new_relevant_value` — nunca se oculta dinero sin decisión humana). Estados:

- `matched`: coincide (exacto o por redondeo) — puede ser parte de la confirmación en bloque.
- `likely_match`: probable, requiere una mirada humana.
- `needs_review`: ambigüedad o contradicción — requiere elegir o corregir.
- `unresolved`: la exógena espera un valor que ningún documento cargado respalda todavía.
- `new_relevant_value`: valor documental sin relación con la exógena, posible información nueva.

Cada sugerencia conserva `matchStatus` (el `CandidateExogenousMatchStatus` subyacente, nulo para
`unresolved`/`new_relevant_value`) para que confirmar no tenga que recalcular el emparejamiento.

## Persistencia y prevención de doble conteo

`apps/web/src/lib/repository.ts` agrega:

- `confirmEvidenceMatch(candidateId, input)`: envuelve, en orden, `reviewDocumentCandidate({
  action: 'confirm', ... })` (crea el `DocumentFact`) y `savePreliminaryReconciliation` (marca la
  fuente exógena aceptada como respaldada/contradicha por documento). El estado de conciliación se
  deriva del `matchStatus` para no duplicar la política de redondeo/tolerancia en dos lugares.
- `confirmEvidenceMatchesBulk(items)`: itera `confirmEvidenceMatch` — "en bloque" solo agrupa la
  interacción humana, nunca omite la creación del hecho ni de la conciliación.
- `createGuidedManualCapture(caseId, input)`: variante simplificada de la captura manual existente,
  disparada desde una `ExpectedTaxEvidence` sin candidato aceptable. Usa `saveDocumentFact` con
  `captureMethod: 'manual_guided'` (nuevo valor de `FactCaptureMethod`) y conserva
  `expectedEvidenceId` en el `DocumentFact` (nuevo campo opcional) para trazabilidad.

Ninguna de estas funciones crea un mecanismo paralelo de conciliación: reutilizan exactamente los
mismos dos puntos que ya evitaban el doble conteo antes de esta fase.

## UI

`apps/web/src/components/case/EvidenceReviewPanel.tsx` es la nueva pantalla principal de
`organizacion/revision-documental` en `CaseWorkbench.tsx` (reemplaza el render directo de
`DocumentExtractionReviewPanel` en ese punto de navegación, sin eliminar el componente: sigue
siendo el "modo avanzado" detrás del interruptor "Ver otros datos detectados"). Muestra:

- Resumen en lenguaje simple ("Encontramos N valores relevantes. M coinciden con la exógena.").
- Confirmación en bloque para las sugerencias `safeForBulkConfirm`.
- Grupos por estado (coinciden / probables / necesitan tu decisión / datos que faltan / posibles
  valores nuevos), cada uno con acciones explícitas (confirmar, capturar manualmente, registrar
  como nuevo) y nunca un enum crudo (usa `EVIDENCE_SUGGESTION_STATUS_PRESENTATION`).

## Tareas del expediente

Dos tipos nuevos en `CaseTaskTypeSchema` (`packages/domain/src/caseTasks.ts`), derivados
directamente en `buildCaseTasks` (`apps/web/src/lib/taxCaseAnalysis.ts`) — **no** en
`evidenceReview.ts`, para evitar un ciclo de importación con `entityForRecord`:

- `evidence_ambiguous_match`: un candidato abierto tiene al menos un `suggestedExogenousMatches`
  en estado `ambiguous`.
- `evidence_missing_expected`: un registro exógeno con valor reportado no está cubierto por ningún
  candidato con relación útil (`status !== 'no_match'/'contradiction'`) ni por ninguna
  `PreliminaryReconciliation` existente.

Ninguno reemplaza la generación existente por candidato (`confirm_candidate`/`identify_product`/
`associate_entity`), que se mantiene sin cambios.

## Limitaciones conocidas y Fase E2 propuesta

1. **Dos scorers sin unificar** (`suggestExogenousMatches` vs. `suggestReconciliations`): ver
   sección anterior. Fase E2 podría explorar una unificación cuidadosa, con migración de tests.
2. `classifyDocumentNumericEvidence` es una segunda pasada de clasificación independiente de
   `monetaryMatches`; no cambia qué candidatos existen hoy, solo enriquece la evidencia
   inspeccionable. Una futura fase podría usarlo para suprimir candidatos de baja confianza en el
   punto de generación, no solo para el conteo/inspección.
3. La captura manual guiada (`createGuidedManualCapture`) no permite corregir la
   categoría/naturaleza/tratamiento heredados de la expectativa; si el analista no está de acuerdo,
   debe usar el modo avanzado.
4. `EvidenceReviewPanel` no pagina ni virtualiza listas largas: para expedientes con cientos de
   expectativas sin resolver convendría revisar el rendimiento antes de escalarlo.
5. No se agregó un test E2E de Playwright para el escenario completo de Guided Review (carga de
   exógena + PDF sintético → clasificación → revisión guiada → confirmación/captura manual). Los
   fixtures sintéticos necesarios (PDF con NIT/cuenta/resolución/año/porcentaje/montos mezclados,
   más una exógena con casos de redondeo/ambigüedad) y la orquestación de un flujo de 18 pasos en
   desktop y 390px son un esfuerzo separado y considerable; queda como el primer punto pendiente de
   Fase E2. La cobertura actual (unitaria + de componente, 592/592 tests) valida la lógica pura y
   la interacción del panel de forma aislada.

## Documentación relacionada

`DOCUMENT_INTELLIGENCE.md`, `MONEY_PARSING.md`, `DOCUMENT_EXTRACTION_REVIEW.md`,
`PRELIMINARY_RECONCILIATION.md`, `RECONCILIATION.md`, `CASE_TASKS.md`, `DOCUMENT_FACTS.md`.
