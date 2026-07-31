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

`id`, `rawId`, `source`, entidad reportante, documento de la persona reportada,
estado de coincidencia de identidad, concepto, valor, uso sugerido estructurado,
clasificación tributaria inicial (`nature`, `category`, `treatment`,
`confidence`, `classificationEvidence`) y `extra`. `entityTaxId` permanece como
alias de compatibilidad de `reportingEntityDocument`.

### TaxpayerIdentity — identidad del consultante

Tipo y documento original/normalizado, nombre, año gravable, fecha de corte y
fecha del reporte. El documento original se conserva localmente, pero la UI lo
muestra enmascarado por defecto.

### SuggestedDeclarationUse / clasificación

Conserva el texto original, topes, referencias `R<number>`, descripciones,
condiciones y grupos inferidos. La clasificación es determinista, versionada y
orientativa; no calcula el Formulario 210.

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
`columnMapping`, `rawRecords[]`, `normalizedRecords[]`, `entities[]`,
`concepts[]`, `findings[]`, `requirements[]`, `metrics`.

### ProcessingMetrics

Incluye `grossUnconsolidatedSum` y agrupaciones homogéneas de ingresos, activos,
deudas, retenciones, movimientos, consumos, compras y registros sin clasificar,
además de conteos y `qualityScore`.

### FilingObligationAssessment — evaluación Aegis

Derivado local para un conjunto de reglas anual: `taxYear`, `filingYear`,
`status` (`required|not_required|pending_information`), `reasons[]`,
`missingInputs[]`, `deadline`, `evaluatedAt` y `ruleVersion`. Cada razón conserva
operador, monto observado, UVT, montos exacto/oficial y evidencia del tope.
`required` es un estado técnico orientativo y siempre se presenta con revisión
humana; no equivale a asesoría o determinación administrativa.

## Persistencia (IndexedDB / Dexie)

| Tabla          | Clave    | Contenido                                    |
| -------------- | -------- | -------------------------------------------- |
| `cases`        | `id`     | `TaxCase`                                    |
| `documents`    | `id`     | `UploadedDocument` (metadatos)               |
| `results`      | `caseId` | `{ caseId, result, updatedAt }`              |
| `filingInputs` | `caseId` | Respuesta local de responsabilidad de IVA    |
| `analyses`     | `caseId` | Relaciones, resoluciones y matriz versionada |

El **archivo original no se persiste**. Solo metadatos y el resultado normalizado.

## Exportación JSON

`toNormalizedJson(result)` produce un documento versionado
(`schema: "nexustax.exogenous.normalized"`, `schemaVersion: "4"`) con
`source`, `metrics`, `entities`, `concepts`, `records`, `findings`,
`requirements`. No incluye datos del archivo binario ni información fuera del
alcance.

## Analisis resoluble

`NormalizedExogenousRecord` incluye usos secundarios, tipo de multiplicidad y
disposicion de consolidacion. `RecordRelation` enlaza registros sin mutarlos.
`RecordResolution` conserva propuesta automatica, decision final, justificacion,
version, obsolescencia e historial. `TaxMatrix` agrupa entradas incluidas,
excluidas, informativas y pendientes, incorpora conciliacion con topes y separa
calidad de extraccion, clasificacion y conciliacion. `CaseAnalysis` es la raiz
persistida de esas estructuras.
