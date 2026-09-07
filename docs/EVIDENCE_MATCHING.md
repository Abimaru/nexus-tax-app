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

## Por qué NO se unificó el segundo scorer existente (histórico, superado en Fase F.3)

Durante la auditoría original (Fase E) se encontró que `apps/web/src/lib/taxCaseAnalysis.ts` ya
tiene un segundo emparejador, `suggestReconciliations` (a nivel de `DocumentFact` ya confirmado,
alimenta `PreliminaryReconciliation`), que duplicaba buena parte de la lógica de puntuación de
`suggestExogenousMatches` (a nivel de `DocumentFactCandidate`, antes de confirmar). En ese momento
se dejó como limitación conocida para una futura fase. **Fase F.3 unificó la dimensión numérica de
ambos scorers** (y de un tercer punto de divergencia encontrado en `ReconciliationsPanel.tsx`) —
ver la sección "Fase F.3" más abajo para el diseño final.

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

## Fase F.2 — Safety & Critical Evidence Hardening (defensa semántica)

El benchmark real Documento ↔ Exógena (Fase F/F.1, diagnóstico sobre documentos reales, nunca
copiados al repositorio) encontró un **false confident match** real: un candidato cuyo propio
texto describía una **retención** fue clasificado como `financial_income` (ingreso) y obtuvo
`exact_match` contra un registro exógeno de ingresos — el valor numérico coincidía, pero el
concepto tributario era otro. También encontró certificados reales de vivienda donde el valor
fiscalmente importante (intereses pagados) no se extraía, sin que exista ninguna categoría
exógena equivalente que actúe como red de seguridad.

### Principio: igualdad numérica ≠ equivalencia tributaria

`suggestExogenousMatches` (`packages/document-intelligence/src/matching.ts`) determinaba el
estado final (`exact_match`/`rounding_match`/…) **únicamente** a partir de la diferencia numérica
entre el candidato y el registro exógeno; la categoría solo influía en el *score* de selección del
top-3, nunca en si el resultado final podía tratarse como "confiable". Esto permitía que un
candidato mal etiquetado (p. ej. una retención etiquetada como ingreso) alcanzara `exact_match` si
el valor coincidía exactamente con algún registro, sin importar cuán contradictorio fuera el
concepto.

### Gate semántico (`packages/document-intelligence/src/semanticGate.ts`)

`detectSemanticContradiction` es una función **pura y reusable** (no depende de ningún banco, NIT
o texto de documento concreto — prohibido por diseño resolver el caso por emisor) que compara
marcadores léxicos inequívocos del propio texto del candidato (`originalConcept`/
`normalizedConcept`) contra:

1. la categoría que el adaptador le propuso (autoconsistencia), y
2. opcionalmente, la categoría del registro exógeno contra el que se está comparando
   (`referenceCategories`) — defensa en profundidad para el caso cruzado del benchmark, donde el
   candidato ya viene mal categorizado.

**Tabla de compatibilidad** (marcador → categorías que contradice si aparece en el texto):

| Marcador léxico | Categorías que contradice |
| --- | --- |
| `retencion(es)` | `financial_income`, `employment_income`, `other_income`, `dividend_income`, `pension_income` |
| `base` | `withholding`, `deduction_candidate` |
| `saldo` | `deduction_candidate`, `housing_interest` |

Reutiliza `TaxCategory` (ya existente en `@nexus-tax/domain`) — **no** crea una segunda taxonomía
paralela; la tabla es la única representación nueva y es deliberadamente mínima.

### Match gate: nunca `exact_match`/`rounding_match` con contradicción

En `suggestExogenousMatches`, si `detectSemanticContradiction` marca contradicción **y** el estado
crudo habría sido `exact_match`/`rounding_match`, el estado final se degrada a `possible_match`
(el máximo permitido según el prompt de Fase F.2 entre `ambiguous`/`possible_match`/
`contradiction`). Esto garantiza automáticamente `safeForBulkConfirm: false` en
`buildEvidenceReviewSuggestions` (`apps/web/src/lib/evidenceReview.ts`), sin tocar esa función: el
gate vive enteramente en la capa de emparejamiento. El candidato **nunca se oculta**: sigue
visible con razón humana explícita ("El monto coincide, pero el certificado parece describir una
retención/una base de cálculo/un saldo, no [el concepto reportado]. Revísalo antes de confirmar.")
— nunca "semantic contradiction detected" ni scores internos. La anomalía también se registra en
`anomalyCodes: ['semantic_concept_contradiction']` (extensión mínima y compatible del enum
existente, mismo mecanismo que las anomalías monetarias).

### Corrección de causa raíz (no solo gate)

El caso real del benchmark existía porque la regla `withholding` de `co.financial.consolidated.
generic` exigía literalmente "fuente"/"renta" después de "retención", y no reconocía "retención
sobre/de rendimientos financieros". Se amplió esa regla y se agregó una **exclusividad
retención-domina-sobre-ingreso**: en `extractCandidates` (`adapters.ts`), si una línea contiene el
marcador léxico de retención, ninguna regla de categoría "ingreso" (`financial_income`,
`employment_income`, `other_income`, `dividend_income`, `pension_income`) genera candidato para
esa misma línea, evitando también un candidato duplicado bajo dos reglas. El rebenchmark local
(§ más abajo) confirma que el caso real ya no produce un candidato mal etiquetado en absoluto —
el gate queda como red de seguridad general, no como único mecanismo.

### Vivienda: cobertura, document-only y fallback guiado

- **Clasificador** (`classifier.ts`): el catálogo de señales de `housing_interest_certificate` se
  amplió con vocabulario estructural (préstamo/financiación/crédito de vivienda, intereses
  pagados/causados/del período, saldo de la obligación) sin exigir la frase literal "crédito
  hipotecario" — una entidad no bancaria también certifica vivienda. Ninguna señal aislada alcanza
  confianza alta por sí sola (requiere combinación), evitando que cualquier mención suelta de
  "vivienda" dispare una clasificación optimista.
- **Adaptador** (`co.housing-interest.generic`): reglas más flexibles para intereses, sin
  confundirlos nunca con saldo/corrección monetaria/tasa — nunca se infiere el valor de intereses
  a partir del saldo ni se calcula por diferencia; solo se extrae evidencia documental explícita.
- **Document-only sin exógena** (§15): la deducción de intereses de vivienda **no se reporta como
  información exógena** — nunca hay un `ExpectedTaxEvidence` que la origine. `buildEvidenceReviewSuggestions`
  y `EvidenceReviewPanel` presentan un candidato `housing_interest` sin match como evidencia propia
  válida ("Este beneficio normalmente se sustenta con el certificado de la entidad. No
  necesitamos una coincidencia en exógena para conservarlo como evidencia."), nunca como
  "No aparece en exógena" (que sonaría a error).
- **Fallback guiado sin exógena** (§17/§18): `buildCaseTasks` (`taxCaseAnalysis.ts`) reutiliza el
  `CaseTaskType` existente `evidence_missing_expected` (no crea un segundo sistema de tareas): si
  un documento se clasifica como `housing_interest_certificate` (vía `DocumentExtractionSession.
  classification`) y ningún candidato de ese documento tiene `proposedCategory: 'housing_interest'`,
  se genera una tarea de captura manual guiada, **sin depender de ningún registro exógeno**.

### Rebenchmark local (Fase F.2, §23) — resultados honestos

Se reprocesaron localmente (script temporal, eliminado; nunca se persistieron datos reales) los 5
casos reales relevantes del benchmark anterior con el motor corregido:

| Caso | Resultado |
| --- | --- |
| False confident original | **Corregido en la raíz**: el candidato ahora se etiqueta `withholding` (antes `financial_income`); su `exact_match`, cuando ocurre, no carga `semantic_concept_contradiction` — ya no hay evidencia de falso confiado. |
| GMF base gravable (caso P1) | Sigue bloqueado (`no_match`/`ambiguous`, nunca `exact_match`) — sin regresión. |
| Saldo como GMF (caso P2) | Sigue bloqueado (`no_match`) — sin regresión. |
| Vivienda, caso 1 | **Sin mejora**: 0 candidatos, clasificación sigue en `income_withholding_certificate`/confianza baja. El vocabulario real de este emisor específico elude las señales ampliadas; no se investigó más a fondo por la prohibición de derivar patrones de texto real. |
| Vivienda, caso 2 | **Mejora parcial**: la clasificación subió de confianza `medium` a `high` (correctamente `housing_interest_certificate` en ambas pasadas); el valor de intereses **sigue sin extraerse** (0 candidatos de esa regla), pero ahora existe el fallback guiado (`evidence_missing_expected`) que antes no existía. |

Ningún caso revalidado produjo un **nuevo** false confident match.

### Fase F.3 pendiente

- **Unificación de los dos scorers** (`suggestExogenousMatches` vs. `suggestReconciliations`):
  el benchmark de Fase F.1 encontró divergencias reales de umbral (p. ej. `rounding_match` habilita
  confirmación en bloque mientras la política de conciliación de la matriz siempre exige
  confirmación humana para el mismo tipo de diferencia). No se resolvió en F.2 por diseño explícito
  (§20 del prompt); los tests de esta fase están escritos de forma que facilitan esa futura
  unificación sin necesitar reescribirlos.
- **Cobertura de vivienda para los 2 casos reales que no mejoraron/mejoraron solo parcialmente**:
  requeriría más señales de vocabulario derivadas de un corpus más amplio, sin poder citar el texto
  real observado.
- El chequeo de ambigüedad documentado en la limitación (5) de la sección anterior sigue pendiente.

## Fase F.3 — Unified Reconciliation & Coverage Hardening

Cierra la limitación explícita de Fase F.2: unifica la dimensión NUMÉRICA de los tres puntos donde
NexusTax evaluaba "¿qué tan cerca están estos dos valores?" con criterios distintos, y corrige
incompatibilidades estructurales entre adaptadores y la taxonomía de la exógena encontradas en el
benchmark real (Fase F.1).

### Auditoría de los tres consumidores

1. **`suggestExogenousMatches`** (`packages/document-intelligence/src/matching.ts`) — candidato↔
   exógena, PRE-confirmación. Umbrales propios: exacto (diferencia=0), redondeo (diferencia≤1),
   menor (diferencia≤1, mismo umbral que redondeo — una redundancia real), posible (score≥50).
2. **`evaluateReconciliationDifference`** (`packages/exogenous-parser/src/reconciliationPolicy.ts`)
   — umbral/consolidado↔tope DIAN, usado en `analysis.ts` (matriz) y en `ReconciliationsPanel.tsx`
   (hecho↔exógena confirmado). Umbrales propios: redondeo (diferencia≤`roundingUnit`, típicamente 5
   para topes), menor (diferencia≤$100 **y** ≤0.01 %).
3. **`suggestReconciliations`** (`apps/web/src/lib/taxCaseAnalysis.ts`) — hecho↔exógena,
   PRE-sugerencia para `ReconciliationsPanel`. Tenía su propio sistema de score (sin estado
   granular) y **sin ninguna protección semántica** — un hallazgo real de esta auditoría: un hecho
   documental que describe una retención podía sugerirse como coincidencia "segura" contra un
   registro de ingresos, sin que el gate semántico de Fase F.2 lo bloqueara, porque ese gate solo
   protegía al primer consumidor.
4. **`ReconciliationsPanel.tsx`** tenía además un CUARTO umbral ad-hoc, hardcodeado en la UI
   (`score >= 75 && difference <= 5`), desconectado de los otros tres y también sin gate semántico.

### Política numérica única (`@nexus-tax/domain/numericReconciliation.ts`)

`evaluateNumericReconciliation` es la única fuente de verdad para `exact`/`rounding`/`minor`/
`relevant`. Vive en `@nexus-tax/domain` (sin dependencias hacia otros paquetes de NexusTax) porque
tanto `document-intelligence` como `exogenous-parser` (que ya depende de `document-intelligence`)
necesitan importarla — es el único paquete alcanzable desde ambos sin crear una dependencia
circular.

- **Redondeo**: `documentRoundedValue` (con centavos redondeados) dentro de una `roundingToleranceCop`
  (por defecto $1) del valor exógeno. El mismo parámetro modela también la tolerancia de redondeo
  agregado de topes/consolidados (`roundingUnit: 5`), unificando dos mecanismos que antes vivían
  por separado bajo el mismo nombre "rounding".
- **Menor** (§5 del prompt): exige **ambas** condiciones — diferencia absoluta ≤$100 **y**
  diferencia relativa ≤0.01 %. Nunca "menor" solo por porcentaje pequeño en un monto grande (un
  monto de $10.000.000 con $101 de diferencia, 0.00101 %, sigue siendo `relevant`, no `minor`).
- `evaluateReconciliationDifference` (exogenous-parser) y `suggestExogenousMatches`
  (document-intelligence) ahora son envoltorios delgados sobre esta política — conservan sus
  contratos públicos (nombres de estado, forma del resultado) para no romper a sus consumidores.
- `ReconciliationsPanel.tsx` reemplazó su umbral ad-hoc (`difference <= 5`) por la misma política
  (`roundingUnit: 1`, igual que el matcher de candidatos) y **ahora respeta el gate semántico**:
  `suggestReconciliations` calcula `semanticContradiction`/`semanticContradictionReason`
  (reutilizando `detectSemanticContradiction` de Fase F.2, nunca un segundo mecanismo) y la UI
  nunca ofrece "seguro para confirmar" cuando hay contradicción, con el mismo copy humano
  ("El valor coincide, pero el concepto no").
- **Precedencia semántica preservada** (§6 del prompt): la política numérica NUNCA sustituye el
  gate de Fase F.2 — un `exact`/`rounding` con contradicción semántica sigue degradándose a
  `possible_match` antes de habilitar confirmación en bloque.
- **Guardarraíl obligatorio** (§20): `packages/exogenous-parser/tests/unifiedReconciliationGuardrail.test.ts`
  verifica que el mismo par numérico produzca un balde de resultado compatible
  (`exact/rounding` ↔ `reconciled/rounding_difference`, etc.) en ambos consumidores.

### Cobertura estructural corregida

- **Cesantías** (`co.severance.generic` + `classification.ts`, §8): el saldo de cesantías se
  reclasificó de `asset` a `severance` (compatible con el fallback de la exógena para un saldo de
  cesantías "en bruto"); se agregó reconocimiento de aporte/consignación patronal tanto en el
  adaptador documental como en el clasificador de la exógena (antes caía en `bank_movement`
  genérico, una incompatibilidad de categoría real).
- **`annual_cost_report`** (`co.annual-cost-report.generic`, §9): nuevo adaptador dedicado
  (intereses/rendimientos, retención, GMF, total informativo de entidad) — antes caía en
  `co.generic.label-value` (categoría `unclassified`, siempre revisión).
- **Certificados tributarios consolidados** (`classifier.ts`, §10): la señal `certificado
  tributario` (singular) no reconocía la redacción real plural "Certificados tributarios" — causa
  raíz real de la miscategorización a `debt_certificate` encontrada en el benchmark. Se corrigió y
  se agregaron señales estructurales acumulativas (saldo + rendimiento + retención + GMF) para que
  un documento genuinamente multiproducto supere a una clasificación más estrecha.
- **Tabla multiproducto** (`packages/document-intelligence/tests/multiproductTable.test.ts`, §11):
  fixture con 3 productos, columna de porcentaje intercalada y valores cero — confirma
  header→producto→concepto→valor sin arrastrar headers vecinos.
- **Form 220 textual** (`co.form-220.generic`, §12): vocabulario público adicional del formulario
  DIAN (ingresos por rentas de trabajo, auxilio de cesantías consignadas, otros ingresos,
  indemnizaciones, valor retenido) — nunca derivado de un documento real.

### Routing documental explícito (`packages/document-intelligence/src/documentRouting.ts`, §13-§15)

`decideDocumentRouting` se ejecuta DESPUÉS de clasificar y ANTES de `extractCandidates`:

- **Declaración de un año anterior** (`prior_year_return`): se omite el pipeline genérico por
  completo — este tipo de documento tiene su ruta especializada propia
  (`extractPriorYearForm210`). Copy: "Reconocimos una declaración de un año anterior. La
  analizaremos como declaración previa, no como certificado."
- **Extracto bancario transaccional**: detectado estructuralmente (≥20 fechas de movimiento y ≥5
  palabras clave de movimiento en el texto) — nunca por nombre de banco/NIT/filename. Copy: "Este
  archivo parece ser un extracto de movimientos, no un certificado tributario. Lo conservamos como
  soporte, pero no intentaremos convertir cada movimiento en un dato para la declaración."
- En ambos casos el documento **sigue disponible** en biblioteca/evidencia/modo avanzado/historial
  (§14): el routing solo omite `extractCandidates`, nunca borra ni rechaza el archivo. Se expone un
  nuevo `DocumentExtractionFinding` (`code: 'requires_specialized_route'`) con el mensaje y la
  acción sugerida.
- La facturación electrónica mantiene su ruta XLSX estructurada existente, sin cambios (§13.C).

### Expected evidence reducida a falsos `unresolved` estructurales (§16)

`buildExpectedTaxEvidence` (`apps/web/src/lib/evidenceReview.ts`) excluye 5 categorías que nunca
deberían generar una expectativa de certificado: `card_consumption` (señal de umbral, no un hecho
documental), `bank_movement`/`investment_movement` (movimientos del período, no el saldo final que
sí certifica un producto), `electronic_invoicing_total`/`electronic_invoicing_benefit_base`
(reconciliadas exclusivamente contra el reporte DIAN de facturación electrónica, Fase D). Un
candidato cuya única coincidencia apunte a uno de estos registros excluidos sigue apareciendo como
"posible valor nuevo" — nunca desaparece silenciosamente (§28 de Fase E).

### Human Review Burden (`computeHumanReviewBurden`, `apps/web/src/lib/evidenceReview.ts`, §1/§19)

Métrica local de benchmark (nunca telemetría remota) que separa `bulkConfirmable` (cero esfuerzo),
`meaningfulHumanReview` (juicio real), `manualGuidedCapture` (captura sin documento),
`irrelevantCandidateReview` (candidatos sin relación con la exógena, a revisar) y
`unresolvedAfterAllDocuments` (mismo conjunto que `manualGuidedCapture`, nombrado para alinear con
el benchmark de Fase F.1).

### Rebenchmark real (§23) — resultados antes/después

Repetido con las mismas 2 exógenas, los mismos 29 PDF y los mismos 2 reportes de facturación
electrónica del benchmark de Fase F.1 (script temporal, eliminado; nunca se persistieron datos
reales):

| Métrica | Antes (Fase F.1) | Después (Fase F.3) |
| --- | --- | --- |
| expectationsTotal | 82 | 62 (−20, exclusión de categorías estructuralmente sin certificado, §16) |
| expectationsWithCandidate | 22 | 25 |
| unresolved | 59 | 37 |
| candidatesTotal | 142 | 52 (routing evita ~80 candidatos de un extracto bancario real) |
| document-only (`new_relevant_value`) | 115 | 26 |
| falseConfidentMatches | 1 (corregido en F.2) | **0** |
| Human Review Burden total | ~192 (estimado en F.1) | 88 |
| bulkConfirmable | 2 | 6 |

El extracto bancario transaccional real del corpus (que en Fase F.1 generó 80 candidatos de baja
calidad) fue correctamente detectado y enrutado, explicando gran parte de la reducción en
candidatos totales y en evidencia document-only. `falseConfidentMatches` se mantuvo en 0 en ambos
expedientes, confirmando que ningún cambio de esta fase reintrodujo el hallazgo crítico de F.1.

### Limitaciones restantes para una futura Fase F.4

- La detección de "extracto bancario transaccional" es una heurística estructural modesta (conteo
  de fechas + palabras clave); podría producir falsos negativos con formatos de fecha no
  contemplados o falsos positivos con certificados que enumeran muchas fechas por otros motivos.
- La cobertura de vivienda de los 2 casos reales que Fase F.2 dejó con mejora parcial no se
  revisó de nuevo en esta fase (fuera del alcance explícito de F.3).
- `unresolvedAfterAllDocuments` es hoy un alias exacto de `manualGuidedCapture`; si en el futuro se
  necesita distinguir "sin candidato tras cargar todos los documentos disponibles" de "sin
  candidato en este momento", requerirá una señal adicional (p. ej. cuántos documentos del tipo
  esperado ya se cargaron).
