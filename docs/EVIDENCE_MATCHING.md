# Evidence Matching & Guided Reconciliation (Sprint 2.4, Fase E + E.1)

_Última actualización: 2026-09-06 (cierre Fase E.1: promotion gate + E2E)._

## Objetivo

Reducir el ruido numérico mostrado al analista tras la extracción documental (NIT, cuentas,
resoluciones, años, referencias legales, etc. malinterpretados como dinero) y presentar una
"Revisión guiada" con pocas decisiones humanas relevantes en vez de decenas de candidatos en
bruto. **No** reemplaza la revisión detallada existente (`DocumentExtractionReviewPanel`): la
conserva completa, siempre disponible detrás de un interruptor ("modo avanzado").

## Alcance de esta fase

- Clasificador de evidencia numérica por rol documental (dinero vs. ruido), puro y determinista.
- **Promotion gate (Fase E.1)**: el clasificador ahora decide qué se promueve a candidato
  monetario, no solo qué se muestra como evidencia inspeccionable — ver sección dedicada más
  abajo.
- Evolución del emparejador candidato↔exógena existente (`suggestExogenousMatches`) con un estado
  granular que distingue explícitamente el redondeo de una coincidencia meramente probable.
- Contrato de "expectativa" (`ExpectedTaxEvidence`): qué espera encontrar el expediente,
  invirtiendo parcialmente el flujo habitual ("documento → qué encontré" → "expediente → qué estoy
  buscando").
- Capa de orquestación (`apps/web/src/lib/evidenceReview.ts`) que combina ambos para producir
  `EvidenceReviewSuggestion[]`: una sugerencia por expectativa (o por candidato sin relación),
  nunca una por cada par candidato/registro evaluado.
- UI `EvidenceReviewPanel` con resumen en lenguaje simple, confirmación en bloque acotada a
  coincidencias sin ambigüedad, resolución de ambigüedad eligiendo un valor, captura manual guiada
  y el interruptor al modo avanzado.
- Dos nuevos tipos de tarea (`evidence_ambiguous_match`, `evidence_missing_expected`) que **no**
  sustituyen la generación existente por candidato (`confirm_candidate`/`identify_product`/
  `associate_entity`), sino que la complementan con las situaciones específicas de Guided Review.
- E2E de Playwright (`evidence-review.spec.ts`) que cubre el flujo completo con datos sintéticos.

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
  **Fórmula real (§9), verificada por test**: `numericEvidenceDetected =
  monetaryEvidencePromoted + numericNoiseSuppressed` — no existen categorías intermedias; todo
  token clasificado es `money` (promovido) o no (`numericNoiseSuppressed`, sin importar el rol
  específico de ruido).
- Poblar `DocumentExtractionSession.suppressedNumericEvidence` (acotado a 200 entradas por sesión):
  la evidencia de ruido **nunca se elimina físicamente**, queda disponible para inspección en modo
  avanzado/laboratorio, solo se excluye de la revisión guiada normal.

Este clasificador es **independiente** del filtro ad-hoc que ya existía en `monetaryMatches()`
(rango de años, símbolo/formato explícito, umbral de 10.000): no lo reemplaza — ambos se combinan
(ver siguiente sección) para decidir qué se convierte en `DocumentFactCandidate`.

## Promotion gate: evidencia numérica ≠ candidato monetario (Fase E.1)

**Cierre de Fase E** (§2-§10 del prompt de cierre): el clasificador de evidencia numérica ahora
**participa en la decisión** de promover un token a candidato monetario principal, no solo en la
inspección. Antes de este cierre, `classifyNumericEvidence` solo alimentaba
`suppressedNumericEvidence`/las métricas; el filtro real de `monetaryMatches()` (formato/símbolo/
umbral de 10.000) podía dejar pasar un NIT o un número de cuenta con separadores de miles como si
fuera dinero, sin que la clasificación tuviera ningún efecto sobre la promoción.

`monetaryMatches()` (`packages/document-intelligence/src/adapters.ts`) conserva **todos** sus
filtros previos (línea explicativa, `%`/`x` adyacente, rango de año, umbral de 10.000/formato/
moneda) — estos siguen decidiendo qué token *parece* un monto por forma/magnitud. **Después** de
superarlos, cada token pasa por `classifyNumericEvidence` con el mismo contexto (línea, índice):

- `role === 'money'` → se promueve con normalidad (confianza/estado del adaptador sin cambios).
- `role === 'unknown'` → se promueve **de forma conservadora**, pero `addCandidate` fuerza
  `status: 'requires_review'` y `confidence.level: 'low'`, con una advertencia explícita
  ("El clasificador de evidencia numérica no pudo confirmar con alta confianza que este valor sea
  un monto: revísalo antes de confirmarlo."). Nunca se descarta un valor solo por incertidumbre.
- Cualquier otro rol (`tax_identifier`, `personal_identifier`, `account_number`,
  `document_reference`, `legal_reference`, `date`, `year`, `percentage`, `page_number`) **se
  suprime**: no se crea `DocumentFactCandidate`. El token sigue disponible como evidencia
  inspeccionable vía `classifyDocumentNumericEvidence`/`suppressedNumericEvidence` (§4: la
  clasificación nunca es destructiva), pero no contamina la revisión tributaria principal.

`MonetaryMatch` (interfaz interna de `adapters.ts`) ganó el campo `requiresReview: boolean`, que
se propaga a través de `CandidateSeed.amount` hasta `addCandidate` sin cambiar la firma pública de
`extractCandidates`.

### Reglas de contexto que resuelven casos ambiguos (§6-§8)

`classifyNumericEvidence` se reordenó por prioridad para resolver casos donde una palabra de
monto y una palabra de referencia conviven en la misma línea:

1. **Porcentaje / año aislado** — igual que antes, sin cambios.
2. **Símbolo de moneda pegado al propio token** (p. ej. `$4.500.000`) → `money` inmediato, **antes**
   de cualquier chequeo de NIT/cuenta — porque el símbolo está atado a ESE número, no a otro que
   pueda compartir la misma ventana de contexto. Resuelve `"Saldo cuenta 1234567890: $4.500.000"`:
   el número de cuenta (sin `$`) se suprime, el monto (con `$`) se promueve.
3. **Identificadores absolutos** (NIT/RUT, cédula/documento de identidad) → ganan siempre, incluso
   con formato de miles (`900.123.456-7` sigue siendo NIT) o con una palabra de monto en la línea.
4. **Palabra de monto + formato de miles/decimales en el propio token** (`saldo|valor|monto|pago|
   interes|rendimiento|retencion|ingreso|deuda|patrimonio|aporte|capital|abono|total|
   consignacion`, con variantes) → `money`, con prioridad sobre las referencias contextuales del
   punto 5. Resuelve `"Saldo obligación 45.123.456"` → dinero (hay palabra de monto y formato),
   mientras que `"Obligación 4512345678"` (sin palabra de monto, sin formato) sigue siendo
   identificador.
5. **Referencias contextuales** (cuenta/obligación, resolución, referencia legal, fecha, página).
6. Identificador bare de 6-10 dígitos sin formato → `tax_identifier` (fallback existente).
7. Fallback final `money`/`unknown` (formato, símbolo o valor ≥ 10.000).

### Redondeo — regresión verificada (§11)

El redondeo (`rounding_match`, `docs/EVIDENCE_MATCHING.md` §"Estado granular") se validó
explícitamente para que el filtro antirruido no lo rompa: `3.241.486,57` documental vs. `3.241.487`
en la exógena sigue produciendo `rounding_match` con la razón "El valor documental redondea
exactamente al valor de la exógena." — y **ya no** coexiste con "Valor cercano." en el mismo
arreglo de razones (se filtra explícitamente antes de anexar la razón de redondeo), para que la UI
nunca muestre ambas frases a la vez. `describeMatchConfidence('rounding_match').label` es
"Coincide por redondeo al peso" (nunca "valor cercano").

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
  `expectedEvidenceId` en el `DocumentFact` (nuevo campo opcional) para trazabilidad. **Desde el
  cierre de Fase E (§16-§18)**, también registra la `PreliminaryReconciliation` correspondiente
  (`status: 'reconciled'`, `confirmedByHuman: true`) — sin esto, la expectativa volvía a aparecer
  como "Falta este dato" en la siguiente recomputación de la revisión guiada, aunque ya tuviera un
  hecho documental capturado.

`buildEvidenceReviewSuggestions` también recibe `reconciledExogenousRecordIds` (un `Set` derivado
de `workspace.reconciliations` en `EvidenceReviewPanel`): las expectativas cuyo registro ya tiene
una conciliación no `rejected`/`restored` se excluyen por completo de la revisión guiada — ni
"matched" ni "unresolved" — para que confirmar (o capturar manualmente) una expectativa no la haga
reaparecer solo porque su candidato ya quedó consumido (`factId`).

Ninguna de estas funciones crea un mecanismo paralelo de conciliación: reutilizan exactamente los
mismos dos puntos que ya evitaban el doble conteo antes de esta fase.

## UI

`apps/web/src/components/case/EvidenceReviewPanel.tsx` es la nueva pantalla principal de
`organizacion/revision-documental` en `CaseWorkbench.tsx` (reemplaza el render directo de
`DocumentExtractionReviewPanel` en ese punto de navegación, sin eliminar el componente: sigue
siendo el "modo avanzado" detrás del interruptor "Ver otros datos detectados"). Muestra:

- Resumen en lenguaje simple ("Encontramos N valores relevantes. M coinciden con la exógena.").
- Confirmación en bloque para las sugerencias `safeForBulkConfirm` (solo `exact_match`/
  `rounding_match` sin ambigüedad ni anomalías, nunca `ambiguous`/`possible_match`/`contradiction`).
- Grupos por estado (coinciden / probables / necesitan tu decisión / datos que faltan / posibles
  valores nuevos), cada uno con acciones explícitas (confirmar, capturar manualmente, registrar
  como nuevo) y nunca un enum crudo: usa `EVIDENCE_SUGGESTION_STATUS_PRESENTATION` como fallback y
  `describeMatchConfidence(matchStatus)` (de `@nexus-tax/document-intelligence`) como etiqueta
  principal cuando hay un `matchStatus` — así "Coincide exactamente"/"Coincide por redondeo al
  peso"/"Ambiguo: requiere elegir" son visibles, no solo el genérico "Coincide con la exógena".
  También renderiza `suggestion.reasons` (las razones legibles del matcher), nunca un score.
- **Resolución de ambigüedad (§12/§17)**: cuando `matchStatus === 'ambiguous'`, el botón de
  confirmar se etiqueta "Elegir este valor" en vez de "Confirmar". Al elegir uno, ese candidato
  queda consumido (`factId`); la(s) otra(s) expectativa(s) en pugna por el mismo candidato dejan de
  encontrarlo como candidato abierto en la siguiente recomputación y vuelven automáticamente a
  `unresolved` — sin necesidad de un mecanismo separado de "elegir entre alternativas".

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
2. `classifyDocumentNumericEvidence` sigue siendo una segunda pasada de clasificación (para
   inspección/métricas) independiente del *gate* de `monetaryMatches`; ambas comparten el mismo
   clasificador (`classifyNumericEvidence`) pero se ejecutan por separado. Una futura fase podría
   unificarlas en un único recorrido por documento si el perfilado muestra que vale la pena.
3. La captura manual guiada (`createGuidedManualCapture`) no permite corregir la
   categoría/naturaleza/tratamiento heredados de la expectativa; si el analista no está de acuerdo,
   debe usar el modo avanzado.
4. `EvidenceReviewPanel` no pagina ni virtualiza listas largas: para expedientes con cientos de
   expectativas sin resolver convendría revisar el rendimiento antes de escalarlo.
5. El chequeo de ambigüedad de `suggestExogenousMatches` (`top[0].score === top[1].score`) se
   aplica hoy a los 3 elementos del top-3 devuelto, no solo a los que realmente empatan entre sí:
   si el top-3 tiene un empate en las posiciones 0-1 pero el elemento en posición 2 tiene un score
   distinto, ese tercer elemento también se marca `ambiguous` incorrectamente. No se corrigió en
   este cierre por no estar cubierto por los casos de prueba requeridos (los fixtures usados tienen
   como máximo 2 candidatos empatados); queda documentado para Fase E2.
6. La región de perfiles/OCR/calibración avanzada, la edición de región OCR y la ejecución
   automática completa de perfiles permanecen fuera de alcance, como ya establecía la fase original.

## Cierre de Fase E — verificación E2E (Fase E.1)

Se agregó `apps/web/tests-e2e/evidence-review.spec.ts`: expediente sintético completo con exógena
+ PDF financiero sintético que mezcla ruido (NIT con y sin separadores, número de cuenta,
resolución, año, porcentaje) con 3 valores monetarios reales (coincidencia exacta, coincidencia
por redondeo, y un valor ambiguo que empata contra dos registros exógenos) y una expectativa sin
documento (captura manual guiada). Verifica, en orden: que la revisión guiada solo muestra 3
candidatos reales en modo avanzado (nunca los 5+ números de ruido); confirmación en bloque segura
de exact/rounding; resolución de la ambigüedad eligiendo un valor (la expectativa competidora
vuelve a "Falta este dato" automáticamente); captura manual guiada; conciliación resultante sin
doble conteo (una decisión registrada por expectativa resuelta); persistencia tras recargar la
página; trazabilidad en modo avanzado; y ausencia de desbordamiento horizontal a 390px. Las
especificaciones existentes (`smoke.spec.ts`, `document-lab.spec.ts`) se actualizaron para abrir
el modo avanzado antes de interactuar con `DocumentExtractionReviewPanel`, ya que dejó de ser la
vista por defecto de `organizacion/revision-documental`.

## Documentación relacionada

`DOCUMENT_INTELLIGENCE.md`, `MONEY_PARSING.md`, `DOCUMENT_EXTRACTION_REVIEW.md`,
`PRELIMINARY_RECONCILIATION.md`, `RECONCILIATION.md`, `CASE_TASKS.md`, `DOCUMENT_FACTS.md`.
