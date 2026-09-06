# Modelo de datos — NexusTax

> Sprint 2.3.2 incorpora `AmountCandidate`, versión monetaria, estados
> explícitos de casilla y conciliaciones `rejected/restored`. Dexie v12 marca
> candidatos heredados sin cambiar decisiones humanas confirmadas.

Todos los tipos y esquemas viven en `packages/domain` como esquemas **Zod**, de
los que se derivan los tipos TypeScript (`z.infer`). Así, validación y tipos
comparten una sola fuente de verdad.

## Entidades

### TaxCase — expediente

Unidad raíz. `id`, `alias`, `taxYear`, `notes?`, `status`
(`draft|processing|ready|archived`), `createdAt`, `updatedAt`.

### TaxYear

Número entero acotado (2018–2035).

### UploadedDocument

Metadatos de un archivo aportado. `kind` (`exogenous`, certificados futuros…),
`fileName`, `fileSizeBytes`, `mimeType`, `status`, `uploadedAt`.
**No incluye el contenido binario** (privacidad).

### WorkbookMetadata / SheetMetadata

Estructura del libro leído: `fileName`, `fileSizeBytes`, `sheetCount`,
`sheets[]`. Cada hoja: `name`, `index`, `rowCount`, `columnCount`, `isEmpty`.

### RawExogenousRecord — dato crudo

`id`, `source {sheet,row}`, `cells` (nombre **original** de columna → valor
original). Nunca se muta.

### NormalizedExogenousRecord — dato normalizado

`id`, `rawId`, `source`, entidad reportante, documento de la persona reportada
(`reportedPersonDocument` + `reportedPersonDocumentNormalized`), estado de
coincidencia de identidad (`identityMatch`), concepto, valor, `withholding`,
`currency`, uso sugerido estructurado, y clasificación tributaria inicial
(`classificationVersion`, `nature`, `category`, `treatment`, `confidence`,
`classificationEvidence`). Para el análisis resoluble añade `secondaryUses`,
`multiplicityType` (+ explicación) y `consolidationDisposition` (+ razón). `extra`
preserva las columnas no canónicas. `entityTaxId` permanece como alias de
compatibilidad de `reportingEntityDocument`.

### TaxpayerIdentity — identidad del consultante

Tipo y documento original/normalizado, nombre, año gravable, fecha de corte y
fecha del reporte. El documento original se conserva localmente, pero la UI lo
muestra enmascarado por defecto.

### SuggestedDeclarationUse / clasificación

Conserva el texto original, topes, referencias `R<number>`, descripciones,
condiciones y grupos inferidos. La clasificación es determinista, versionada y
orientativa; alimenta una hoja de trabajo del Formulario 210, pero no liquida el impuesto.

### ExogenousReport — vista semántica del reporte

Es el campo `report` del resultado. Agrupa `metadata` (filas previas al
encabezado, conservadas sin interpretar), `taxpayer` (`TaxpayerIdentity`),
`structure` (`ExogenousReportStructure`, **filas 1-based**: `headerRow`,
`thresholdsStartRow?/thresholdsEndRow?`, `detailsStartRow`), `thresholds[]`
(`ExogenousThreshold`: número, etiqueta original/normalizada, valor y origen con
`detailColumn`/`valueColumn`), `records[]` y `findings[]`. Los topes son
opcionales (se admiten tablas planas) y nunca se normalizan como terceros.

### ReportingEntity / ReportedConcept — presentación

Agregados derivados. Entidad: `name`, `taxId`, `category`
(`employer|bank|pension|housing|other|unknown`), `recordCount`, `totalReported`.
Concepto: `code`, `label`, `recordCount`, `totalReported`.

### DataQualityFinding — hallazgo

`code` (estable), `severity` (`info|warning|error`), `title`, `message`,
`suggestedAction?`, evidencia trazable —incluidos documentos enmascarados cuando
aplica— y `relatedRecordId`.

### DocumentaryRequirement — checklist

`entityName`, `entityCategory`, `documentName`, `documentCategory`, `reason`,
`status` (`pending|available|received|not_applicable`), `recommendationSource`,
`confidence`, `isLegallyRequired` (**siempre `false`**) y metadatos opcionales
de un PDF asociado. El binario PDF no se persiste.

### ProcessingResult — resultado completo

`parserVersion`, `generatedAt`, `workbook`, `selectedSheet`, `headerRowIndex`,
`columnMapping`, **`report`** (`ExogenousReport`), `rawRecords[]`,
`normalizedRecords[]`, `entities[]`, `concepts[]`, `findings[]`,
`requirements[]`, **`relationships[]`** (`RecordRelation`), **`matrix`**
(`TaxMatrix`) y `metrics`.

### ProcessingMetrics

Incluye `grossUnconsolidatedSum` y `homogeneousTotals` (ingresos, activos, deudas,
retenciones, movimientos financieros, consumos con tarjeta, compras y conteo de
registros sin clasificar), además de conteos de hallazgos, `qualityScore` y
`qualityDimensions` (extracción / clasificación / conciliación).

### FilingObligationAssessment — evaluación Aegis

Definido en `@nexus-tax/aegis-rules` (no en `domain`). Derivado local para un
conjunto de reglas anual: `taxYear`, `filingYear`,
`status` (`required|not_required|pending_information`), `reasons[]`,
`missingInputs[]`, `deadline`, `evaluatedAt` y `ruleVersion`. Cada razón conserva
operador, monto observado, UVT, montos exacto/oficial y evidencia del tope.
`required` es un estado técnico orientativo y siempre se presenta con revisión
humana; no equivale a asesoría o determinación administrativa.

## Persistencia (IndexedDB / Dexie)

| Tabla                        | Clave        | Contenido                                          |
| ---------------------------- | ------------ | -------------------------------------------------- |
| `cases`                      | `id`         | `TaxCase`                                          |
| `documents`                  | `id`         | `UploadedDocument` (metadatos)                     |
| `results`                    | `caseId`     | `{ caseId, result, updatedAt }`                    |
| `filingInputs`               | `caseId`     | Respuesta local de responsabilidad de IVA          |
| `analyses`                   | `caseId`     | Relaciones, resoluciones y matriz versionada       |
| `documentBlobs`              | `documentId` | Bytes locales opcionales, nunca exportados         |
| `products`                   | `id`         | Productos asociados o por identificar              |
| `coverages`                  | `id`         | Relación requisito-documento-hecho-entidad         |
| `facts`                      | `id`         | Hechos documentales normalizados e historial       |
| `reconciliations`            | `id`         | Asociaciones documentales con exógena              |
| `employmentGroups`           | `id`         | Grupo laboral e instancias por empleador           |
| `navigationStates`           | `caseId`     | Última etapa, vista y modo manual                  |
| `acceptedSources`            | `id`         | Aceptaciones exógenas, estado e historial          |
| `requirementSourceDecisions` | `id`         | Gestión de requisitos no emitidos                  |
| `extractionSessions`         | `id`         | Sesión de extracción, con diagnóstico opcional     |
| `documentCandidates`         | `id`         | Candidatos, incluidos los manuales del laboratorio |
| `caseTasks`                  | `id`         | Pendientes accionables del expediente              |
| `documentProfiles`           | `id`         | Perfiles reutilizables (sin `caseId`)              |
| `extractionFeedback`         | `id`         | Feedback de calibración (sin `caseId`)             |

Los binarios solo se persisten cuando el usuario elige `store_locally`; la
opción predeterminada conserva metadatos. La contraseña nunca forma parte del
modelo.

## Exportación JSON

`toNormalizedJson(result)` produce un documento versionado
(`schema: "nexustax.exogenous.normalized"`, `schemaVersion: "4"`) con
`source` (incluye `structure`), `metadata`, `taxpayer`, `thresholds`, `metrics`,
`entities`, `concepts`, `records`, `findings`, `requirements`, `relationships` y
`matrix`. No incluye datos del archivo binario ni información fuera del alcance.

## Analisis resoluble

`NormalizedExogenousRecord` incluye usos secundarios, tipo de multiplicidad y
disposicion de consolidacion. `RecordRelation` enlaza registros sin mutarlos.
`RecordResolution` conserva propuesta automatica, decision final, justificacion,
version, obsolescencia e historial. `TaxMatrix` agrupa entradas incluidas,
excluidas, informativas y pendientes, incorpora conciliacion con topes y separa
calidad de extraccion, clasificacion y conciliacion. `CaseAnalysis` es la raiz
persistida de esas estructuras.

## Expediente Sprint 2

`TaxCase` incorpora contribuyente enmascarado, año de presentación y seis
estados de ciclo de vida. `UploadedDocument` usa catálogo, SHA-256, decisión de
persistencia y cadena de versiones. `RequirementCoverage` permite cobertura
completa, parcial, no aplicable o revisable y explica la relación.

`DocumentFact` unifica valores manuales, importados, asistidos o automáticos con
autoría e historial. `PreliminaryReconciliation` enlaza múltiples hechos y
registros exógenos, conserva diferencias y exige confirmación humana para el
estado conciliado.

## Grupo de ingresos laborales

`EmploymentIncomeGroup` reemplaza requisitos independientes de Formulario 220.
Conserva hasta tres `EmployerInstance`, cobertura agregada, empleadores
adicionales detectados y un hallazgo informativo cuando se supera el límite de
la interfaz. Cada instancia guarda nombre, documento enmascarado, período,
entidad exógena, Formulario 220 principal, documentos complementarios, estado,
cobertura, observaciones, origen y marcas de tiempo.

La detección deduplica primero por identificación de entidad y luego por nombre
normalizado; una coincidencia manual confirmada queda persistida. Solo las
instancias activas participan en el progreso. El manifiesto 2.0.1 exporta el
grupo y sus relaciones, nunca los binarios.

## Fuentes aceptadas Sprint 2.0.3

`AcceptedExogenousValue` conserva el registro exógeno inmutable, valor original
y provisional, fuente primaria/secundarias, método, confianza, motivo,
observación, estado, requisito, decisión sobre matriz, documento posterior,
reconocimiento de ganancia ocasional, regla, autoría e historial.

`RequirementSourceDecision` registra que un requisito relevante no fue emitido:
motivo, gestión, canal, evidencia y resultado. No reutiliza `not_applicable`.
Dexie v7 agrega ambas tablas de forma aditiva. El manifiesto 2.0.3 exporta las
decisiones y nunca los binarios.

## Extracción documental Sprint 2.1

`DocumentExtractionSession` conserva documento, número de ejecución, estado,
fase final, páginas legibles, clasificación, adaptador, hallazgos y vínculo con
la sesión anterior. `textPersisted` es literalmente `false`.

`DocumentFactCandidate` mantiene valor extraído, correcciones separadas, valor
final, evidencia breve/página, regla, confianza y sugerencias de entidad,
producto, requisito y exógena. Su estado y decisiones son independientes de
`DocumentFact`; solo `confirmed`/`corrected` mediante acción humana crea un hecho
`assisted` y registra `extractionCandidateId`.

Dexie v8 agrega `extractionSessions` y `documentCandidates`. El manifiesto 2.1.0
incluye metadatos y decisiones seguras, y declara que no contiene contraseñas ni
texto completo.

## Cambios 2.1.1

- `DocumentExtractionSession.metrics` audita generación, persistencia, páginas y estados.
- `DocumentFactCandidate` conserva firma, sección, línea, bloques, geometría y motivo de rechazo.
- `ReportingEntity` diferencia razón social, marca, grupo y versión de identidad sin sustituir NIT.
- `CaseTask` modela pendientes con destino, prioridad, bloqueo, regla y evidencia.
- Dexie v9 agrega `caseTasks`; el manifiesto pasa a 2.1.1 y puede incluir tareas sin datos binarios.

## Cambios 2.2.0

- `CaseTask` incorpora `page`, `extractionSessionId` y `profileId`, además de orígenes OCR/perfil.
- `DocumentExtractionSession.ocrOutcomes` persiste solo estado, comparación, confianza, código de
  fallo y fecha por página; nunca texto, tokens ni imagen.
- `DocumentExtractionMetrics` agrega páginas sugeridas/procesadas por OCR, fallos, contradicciones y
  candidatos por fuente.
- El manifiesto 2.2.0 exporta métricas agregadas y declara que no incluye texto, contraseñas,
  imágenes renderizadas ni binarios.

Las sesiones y candidatos obsoletos se conservan para auditoría. Al reemplazar u obsoletar un
documento se invalidan coberturas relacionadas y se recalculan tareas derivadas.

## Diagnóstico, OCR y perfiles — Sprint 2.2

`PdfDocumentDiagnosis`/`PdfPageDiagnosis` (dominio) clasifican documento y página como
`textual|scanned|hybrid|insufficient_text|damaged` (más `password_protected`/`unsupported`,
reservados para cuando falla la lectura completa). Viven como campo opcional de
`DocumentExtractionSession`; no requirieron migración de Dexie porque no son un índice.

`DocumentCapturedField` (entidad/NIT/producto/fecha/concepto/valor/retención/saldo/deuda/ingreso/
otro) es el catálogo compartido entre el candidato manual del laboratorio y los campos esperados de
un `DocumentProfile`.

`DocumentProfile`: nombre, tipo documental, entidad/marca opcionales, señales estructurales
(dimensiones, número de páginas, secciones, palabras del encabezado), páginas esperadas, zonas
(`DocumentProfileZone`, coordenadas relativas 0-1 por propósito), campos, adaptador, versión,
confianza, origen (`manual|promoted_from_feedback`) y estado (`draft|tested|active|obsolete`). **No
lleva `caseId`**: vive a nivel de instalación para reconocerse en expedientes de años distintos.

`ExtractionFeedback`: documento, sesión, candidato, decisión (categoría/producto/valor corregido,
falso positivo, zona ignorada, campo seleccionado), motivo, método (nativo/OCR), adaptador, perfil,
valores antes/después (acotados a 160 caracteres, sin texto completo), página, zona, y la
aplicabilidad que el analista elige explícitamente (`this_document_only|similar_documents|
profile_update`). Tampoco lleva `caseId`.

Dexie v10 agrega `documentProfiles` y `extractionFeedback`, ambas sin índice por expediente.

## Cambios 2.3.0

- `TaxResolutionDecision`: evento inmutable con objeto, alternativa, estado anterior/final,
  valores/categorías, casilla, motivo, evidencia, autor, versión y decisión reemplazada.
- `CaseTask` agrega `formBoxNumber` y `resolutionDecisionId`; sus nuevas tareas resuelven una casilla
  o revisan una decisión.
- `Form210Draft`: derivado AG 2025 con casillas, fuentes, fórmulas, estados, hallazgos y readiness.
- `TaxCategory` distingue aportes laborales no constitutivos, pensiones y dividendos.
- `ReconciliationStatus` distingue diferencia menor y contradicción.

Dexie v11 agrega `resolutionDecisions` y `form210Drafts`. Ambas participan en borrado de expediente
y limpieza total. El manifiesto 2.3.0 exporta las decisiones y el borrador, nunca el PDF/Excel ni
binarios documentales.

## Cambios 2.3.1

- `Form210Draft.preliminaryLiquidation` conserva estado, impuesto progresivo, ganancias
  ocasionales, anticipo, saldo anterior, retenciones, límites y validaciones cruzadas.
- `Form210BuildInput` admite contextos opcionales aportados por el analista para dependientes,
  facturación electrónica, deducciones, ganancias ocasionales, anticipo, saldo anterior y
  retenciones; una ausencia se representa como información pendiente, no como cero confirmado.
- `Form210FilingStates` separa obligación, disponibilidad del borrador, liquidación y presentación.
  El estado de presentación es fijo y permanece fuera de alcance.
- `Form210ExportBundle` empaqueta borrador, versión del ruleset y referencias oficiales sin incluir
  archivos originales.
- `ResolutionImpact` y la simulación controlada son derivados efímeros; solo la confirmación humana
  crea el ajuste persistido.

## Cambios 2.4.0 (Fase B0 + Fase B — declaraciones anteriores)

Ver [`PRIOR_YEAR_RETURNS.md`](./PRIOR_YEAR_RETURNS.md) para el detalle completo. Resumen de modelo:

- `Form210BoxDefinition` gana campos opcionales `implementationStatus`, `legalBasisSourceIds` y
  `verificationNote`; retrocompatible con las casillas existentes (se derivan de `ruleComplete`
  cuando no se declaran explícitamente).
- `Form210Section` agrega `general_income_consolidation`, `tax_settlement` e `informational` para
  las casillas de consolidación de la cédula general (89, 91-93, 111) y de liquidación del impuesto
  (126, 127, 129, 133, 137-141) que no encajan en las secciones por cédula existentes.
- Nuevo contrato `PriorYearTaxReturn` (`@nexus-tax/domain`): declaración de un año anterior con
  `boxes: Record<string, PriorYearBoxValue>`, `identityMatch`, `replaces`/`replacedBy` (historial de
  correcciones nunca borrado) e `isCurrentVersion`.
- Nuevo contrato `PriorYearCarryForwardCandidate`: candidato trazable de arrastre (R133→R130,
  R137→R131) con `decision` que inicia siempre en `pending`; nunca se aplica automáticamente.
- `CaseTaskType` agrega `review_prior_year_identity_mismatch`, `confirm_prior_year_carry_forward`,
  `review_historical_scale_anomaly`, `resolve_prior_year_conflict` y
  `resolve_prior_year_extraction_gap`. `CaseTask.source` agrega `prior_year_return`.

Dexie v13 agrega `priorYearReturns` y `priorYearCarryForwardCandidates` de forma aditiva; ninguna
tabla ni dato previo se modifica.

## Cambios 2.4.1 (Fase C — dependientes económicos)

Ver [`DEPENDENTS_BENEFITS_2025.md`](./DEPENDENTS_BENEFITS_2025.md) para el detalle completo.
Resumen: nuevos contratos `TaxDependent`, `DependentSupport`, `DependentEvaluation`
(`@nexus-tax/domain`); `CaseTaskType` agrega 8 tipos con `source: 'dependent'` y campo
`dependentId`. Dexie v14 agrega `taxDependents`, `dependentSupports`, `dependentEvaluations`,
`dependentsCaseContext` de forma aditiva.

## Cambios 2.4.2 (Fase D — reporte DIAN de facturación electrónica)

Ver [`ELECTRONIC_INVOICE_REPORT_2025.md`](./ELECTRONIC_INVOICE_REPORT_2025.md) para el detalle
completo. Resumen de modelo:

- Nuevos contratos `ElectronicInvoiceReport`, `ElectronicInvoicePurchase`,
  `ElectronicInvoiceBenefitBase`, `ElectronicInvoiceReconciliation` (`@nexus-tax/domain`,
  `packages/domain/src/electronicInvoice.ts`). Cada columna monetaria original de una factura se
  conserva como `AmountCandidate` (parser central v2.0.0), nunca como número plano.
- `TaxResolutionDecisionType` agrega `decide_electronic_invoice_benefit` y
  `set_no_electronic_invoicing_benefit`; `TaxResolutionObjectType` agrega
  `electronic_invoice_purchase` y `electronic_invoice_report` — las decisiones tributarias por
  factura reutilizan `resolutionDecisions` en vez de una tabla nueva.
- `CaseTaskType` agrega 8 tipos con `source: 'electronic_invoice'` y campos
  `electronicInvoicePurchaseId`/`electronicInvoiceReportId`.
- `WorkflowViewId` agrega `facturacion-electronica` (etapa Declaración).
- **Corrección normativa (Fase D)**: la deducción del 1 % se mueve de la casilla 39 a ser
  componente de la casilla 92, usando las casillas informativas 140 (base) y 141 (deducción
  aplicada) — **corregido de nuevo** en la revisión normativa puntual posterior (ver más abajo).

Dexie v15 agrega `electronicInvoiceReports` y `electronicInvoicePurchases` de forma aditiva; ninguna
tabla ni dato previo se modifica.

## Cambios adicionales — revisión normativa puntual (posterior a Fase D)

Revisión exclusiva de la integración del beneficio del 1 % con el Formulario 210, sin cambios en el
modelo de dominio de facturación electrónica en sí. Hallazgo, verificado con múltiples fuentes
independientes: el destino "componente de R92 vía casillas 140/141" (Fase D) era incorrecto en dos
aspectos. El fundamento legal correcto es el **numeral 5 del artículo 336 ET** (no el "artículo
336-1 ET", que es una norma distinta: estimación de costos y gastos deducibles, indicador
booleano de la casilla 140) y la casilla oficial es la **28** (dato informativo previo a
patrimonio, nunca 140/141). La casilla 141 corresponde al impuesto voluntario del art. 244-1 ET.

- `ELECTRONIC_INVOICING_SOURCE_ID` (`@nexus-tax/aegis-rules`) cambia de `'et-art-336-1'` a
  `'et-art-336-num-5'`.
- El catálogo `OFFICIAL_SOURCES_2025` registra ahora tres fuentes separadas:
  `et-art-336-num-5` (deducción del 1 %, casilla 28), `et-art-336-1` (indicador de costos/gastos
  estimados, casilla 140) y `et-art-244-1` (impuesto voluntario, casilla 141, no modelado).
- `FORM_210_BOXES_2025` agrega la casilla 28 (nueva, `implemented_unverified`); la fórmula de R92
  revierte a `41 + 65 + 82 + 139` (sin R141); R140/R141 quedan `not_implemented` con su
  significado oficial correcto restaurado.
- Ningún cambio en `ElectronicInvoiceReport`/`ElectronicInvoicePurchase`/Dexie/UI/parser: la
  corrección se limita a `packages/form-210` y al `sourceId` del motor puro.

Ver [`ELECTRONIC_INVOICING_2025.md`](./ELECTRONIC_INVOICING_2025.md) §"Historial de correcciones
normativas" para el detalle completo.
