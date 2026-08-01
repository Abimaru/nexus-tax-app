# Modelo de datos — NexusTax

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
orientativa; no calcula el Formulario 210.

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

| Tabla              | Clave        | Contenido                                    |
| ------------------ | ------------ | -------------------------------------------- |
| `cases`            | `id`         | `TaxCase`                                    |
| `documents`        | `id`         | `UploadedDocument` (metadatos)               |
| `results`          | `caseId`     | `{ caseId, result, updatedAt }`              |
| `filingInputs`     | `caseId`     | Respuesta local de responsabilidad de IVA    |
| `analyses`         | `caseId`     | Relaciones, resoluciones y matriz versionada |
| `documentBlobs`    | `documentId` | Bytes locales opcionales, nunca exportados   |
| `products`         | `id`         | Productos asociados o por identificar        |
| `coverages`        | `id`         | Relación requisito-documento-hecho-entidad   |
| `facts`            | `id`         | Hechos documentales normalizados e historial |
| `reconciliations`  | `id`         | Asociaciones documentales con exógena        |
| `employmentGroups` | `id`         | Grupo laboral e instancias por empleador     |

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
