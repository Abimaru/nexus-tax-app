# Reporte DIAN de facturación electrónica (Sprint 2.4, Fase D)

_Última actualización: 2026-09-06 — incluye revisión normativa puntual posterior a Fase D._

> **Corrección normativa posterior a Fase D**: la sección 15 de este
> documento describía el destino del beneficio del 1 % como componente de
> la casilla 92 (vía casillas 140/141). Una revisión posterior encontró que
> esto también era incorrecto: el fundamento legal correcto es el
> **numeral 5 del art. 336 ET** (no el "artículo 336-1 ET") y la casilla
> oficial es la **28** (no 140/141, que tienen significados oficiales
> distintos). Ver el detalle completo en
> [`ELECTRONIC_INVOICING_2025.md`](./ELECTRONIC_INVOICING_2025.md).

## 1. Qué resuelve esta fase

Convierte el reporte DIAN de facturación electrónica (el archivo que el
contribuyente descarga del portal DIAN con el detalle factura por factura)
en una fuente estructurada, trazable y conciliable — distinta de la
exógena — que alimenta el motor del 1 % (art. 336 num. 5 ET) con una base
explicable y auditable.

Flujo completo:

```
XLSX DIAN → identificar formato → extraer facturas → normalizar montos
→ deduplicar por CUFE → calcular totales → conciliar con exógena (Tope 5)
→ determinar base susceptible → evaluar beneficio 1% → integrar con F-210
→ tareas/UX/trazabilidad
```

Este documento cubre el reporte detallado. El motor puro del 1 % (sin
cambios de cálculo en esta fase, solo de destino en el F-210) se documenta
en [`ELECTRONIC_INVOICING_2025.md`](./ELECTRONIC_INVOICING_2025.md).

## 2. Por qué es una fuente distinta de la exógena

La exógena (Tope 5 — "Compras") ya podía traer una fila resumen clasificada
como `electronic_invoicing_total`/`electronic_invoicing_benefit_base`
(Sprint 2.3.2, `packages/exogenous-parser/src/classification.ts`), y
`analysis.matrix.electronicInvoicing` (Sprint 2.3.2,
`packages/exogenous-parser/src/analysis.ts`) ya calculaba una **estimación
preliminar** a partir de esas filas. Esa estimación:

- No tiene detalle por factura (solo un total agregado).
- No conoce el CUFE ni puede detectar duplicados.
- No distingue notas crédito/débito por factura.
- Nunca llegó a alimentar el motor real del F-210 (`Form210BuildInput
  .electronicInvoicing` existía como tipo desde la Fase B0/G del Sprint
  2.3.1, pero `rebuildForm210Draft` nunca lo poblaba — una capacidad
  huérfana detectada en la auditoría inicial de esta fase).

El reporte DIAN detallado (`dian_electronic_invoice_report`) es una
**fuente estructurada nueva y propia**, con su propio adaptador de lectura
(`packages/exogenous-parser/src/electronicInvoiceReport.ts` — hermano del
parser de exógena, reutiliza su infraestructura de bajo nivel pero no su
semántica). Su total neto se **concilia** contra el total estimado de la
exógena (`analysis.matrix.electronicInvoicing.totalNetInvoiced`, la
implementación de Tope 5), y **su base ya explicada** (post-deduplicación,
post-decisiones) es la que finalmente alimenta el motor del 1 %.

## 3. Auditoría inicial (antes de codificar)

| Pregunta | Hallazgo |
|---|---|
| ¿Existe un motor del 1 %? | Sí, `electronic-invoicing.ts` en `aegis-rules`, ya probado. |
| ¿Está cableado en el F-210? | Sí, pero **incorrectamente** a la casilla 39 (ver corrección normativa en `ELECTRONIC_INVOICING_2025.md`). |
| ¿`rebuildForm210Draft` lo poblaba? | **No** — capacidad huérfana, nunca invocada desde `apps/web`. |
| ¿Hay infraestructura XLSX reutilizable? | Sí — `readWorkbook`/`fullRows`, `buildColumns`, `normalizeForCompare` (todos genéricos, sin acoplarse a la semántica de exógena). |
| ¿Hay parser monetario central? | Sí — `parseMoneyAmount`/`AmountCandidate` v2.0.0 en `@nexus-tax/document-intelligence`; `exogenous-parser` no lo usaba (usaba `coerceNumber`, más simple, sin evidencia/confianza). Se agregó como dependencia. |
| ¿Hay política de conciliación reutilizable? | Sí — `evaluateReconciliationDifference` en `reconciliationPolicy.ts` (estados exact/rounding/minor/relevant, tolerancia de $1 ya incorporada). |
| ¿Hay infraestructura de decisiones tributarias? | Sí — `TaxResolutionDecision`/`saveTaxResolutionDecision` (append-only, reversible). Reutilizada en vez de crear una tercera tabla de decisiones. |
| Riesgos de integración | Numeración de casillas 140/141 ya reservada (`not_implemented`) desde Fase B0 — se asumió inicialmente (Fase D) que encajaban para este propósito, pero una revisión normativa posterior encontró que tienen significados oficiales distintos (indicador art. 336-1 ET y aporte voluntario art. 244-1 ET, respectivamente); la casilla oficial correcta es la 28, no modelada hasta la revisión puntual. |

## 4. Modelo de dominio

`packages/domain/src/electronicInvoice.ts`:

- **`ElectronicInvoiceReport`**: metadatos del reporte importado
  (`fileName`, `detectedTitle`, `headerRowIndex`, `headerConfidence`,
  `parserVersion`, `totals`, `reconciliation`, `processingStatus`,
  `benefitOptedOut`). Un reporte activo por expediente (se reemplaza al
  reimportar, como `priorYearReturns` con `isCurrentVersion` pero
  simplificado a 1:1 porque este reporte se re-descarga completo cada vez).
- **`ElectronicInvoicePurchase`**: una factura, evidencia inmutable. Cada
  columna monetaria original se conserva como `AmountCandidate` (parser
  central v2.0.0): nunca se descarta el texto crudo ni la confianza.
- **`ElectronicInvoiceBenefitBase`**: agregador explicable del §11
  (DIAN susceptible − duplicados − rechazadas − doble beneficio = base
  considerada).
- **`ElectronicInvoiceReconciliation`**: estado de conciliación contra
  Tope 5 (reutiliza los mismos nombres de `ReconciliationStatusSchema` más
  `missing_exogenous`/`missing_invoice_report`/`not_evaluated`).

No se modela nombre de columna físico como contrato de dominio: los campos
son semánticos (`grossValue`, `creditNoteValue`, etc.), no "columna C".

## 5. Identificación del reporte (sin fila fija)

`detectElectronicInvoiceReport` (`packages/exogenous-parser/src/electronicInvoiceReport.ts`)
escanea cada hoja hasta 80 filas buscando la combinación de encabezados
(Identificación Emisor Factura, Nombre Emisor Factura, Fecha Emisión, Valor
Facturado, Valor Notas Crédito, Valor Notas Débito, Valor Factura/Afectada
con Notas Débito - Crédito, Valor Susceptible Beneficio, Medios De Pago,
Num_factura_venta, CUFE). Requiere al menos 5 campos reconocidos y al menos
3 de los 5 "fuertes" (bruto, NC, ND, susceptible, CUFE) — nunca asume una
fila fija como la 25. Si no alcanza el umbral, devuelve `null` (archivo no
reconocido, ver §12).

## 6. Reutilización de infraestructura XLSX

Reutilizado de `exogenous-parser` (sin depender de su semántica de
exógena):

- `readWorkbook`/`fullRows` — lectura completa, nunca limitada a preview.
- `buildColumns` — descriptores de columna genéricos.
- `normalizeForCompare`/`toEvidenceText` — utilidades de comparación.

**No reutilizado** (semántica específica de exógena, no aplica aquí):
`HEADER_SYNONYMS`, `detectHeaderRow`, `sections.ts`, `classification.ts`,
`mapping.ts`. El nuevo módulo (`electronicInvoiceReport.ts`) implementa su
propia detección de encabezado y su propio mapeo de columnas — un
"adaptador hermano", no una mezcla de dominios.

## 7. Moneda (parser central v2.0.0)

Cada columna monetaria pasa por `parseMoneyAmount`
(`@nexus-tax/document-intelligence`), agregado como dependencia de
`exogenous-parser` (sin ciclo: `document-intelligence` solo depende de
`domain`). Nunca se usa `replace(/[^\d]/g, '')`. Se conserva `rawText`,
`parsedValue`, `roundedTaxValue` (≈ normalizedCop), `parserVersion`,
`parsingStrategy`/`detectedLocale` (≈ interpretation) y `confidence`.

Casos verificados (`packages/exogenous-parser/tests/electronicInvoiceReport.test.ts`):
`41.585.075`, `41.585.075,00`, `364.741,49`, `0`, vacío. Una celda vacía se
trata como **cero de alta confianza** (ausencia de nota crédito/débito es su
significado normativo real), nunca como fallo de interpretación — distinto
de un texto no numérico, que sí produce `confidence: 'insufficient'`.

## 8. CUFE

`normalizedCufe` colapsa espacios y pasa a minúsculas; `rawCufe` conserva el
texto original intacto (nunca se altera la evidencia). Un patrón laxo
(hexadecimal de 90-100 caracteres) detecta formato malformado sin
rechazarlo — se marca `requires_review`.

## 9. Deduplicación

Estados (`CufeStatus`): `unique`, `duplicate_exact`, `duplicate_conflicting`,
`missing_cufe`, `requires_review`. `resolveCufeDuplicates` agrupa por
`normalizedCufe`: si todos los miembros comparten los mismos valores
(bruto/NC/ND/neto) → `duplicate_exact` (solo la primera ocurrencia por
`sourceRow` cuenta en los totales); si difieren → `duplicate_conflicting`
(**ninguna** ocurrencia cuenta en los totales — bloquea la consolidación
automática del importe afectado, requiere revisión humana).

## 10. Notas crédito/débito y valor neto

`computedNetValueCop = grossValue + debitNoteValue - creditNoteValue`,
siempre calculado. Cuando el reporte trae la columna oficial ("Valor
Factura / Afectada con Notas Débito - Crédito"), se compara contra el
cálculo con una tolerancia de redondeo de $1 (`netReconciliationStatus`:
`exact`/`rounding_difference`/`mismatch`/`incomplete`). Nunca se reemplaza
el valor oficial silenciosamente.

## 11. Totales y base explicable del beneficio (§10/§15 del prompt)

`computeElectronicInvoiceTotals` agrega, **separado de cualquier total que
el propio XLSX declare**: filas totales, facturas únicas, gross/credit/
debit/net/eligible totals, conteo por medio de pago, conteo
susceptible=0, duplicados, anomalías.

`computeElectronicInvoiceBenefitBase`
(`apps/web/src/lib/electronicInvoiceEngine.ts`) construye el agregador
explicable paso a paso:

```
DIAN susceptible total (bruto)
− excluidas por duplicado (conflictivas + repeticiones exactas)
− excluidas por rechazo/pendiente de decisión
− excluidas por doble beneficio (costo/gasto u otro beneficio)
= base considerada
  → 1 % → límite 240 UVT → deducción aplicada
```

Cada resta se expone por separado en `ElectronicInvoiceBenefitBase` — nunca
es una resta directa oculta del bruto DIAN.

## 12. Métodos de pago

Categorías visibles: `electronic`, `cash`, `other`, `data_error`,
`not_informed`. El texto original se conserva (`paymentMethodRaw`).
**"Error en datos" nunca se convierte automáticamente en electrónico** —
queda como categoría propia, visible y filtrable.

## 13. Doble beneficio y decisión por factura (§14 del prompt)

`ElectronicInvoiceBenefitDecision`: `eligible` (por defecto), `used_as_cost_
or_expense`, `used_for_other_tax_benefit`, `not_eligible`, `requires_review`.
El reporte DIAN advierte que una compra usada como costo/gasto u otro
beneficio no puede generar simultáneamente el 1 % — el analista decide por
factura, nunca se aplica automáticamente el 1 % sobre toda la columna
susceptible sin considerar estas decisiones.

**Decisión de diseño (§19 del prompt, "estructura más compacta")**: las
decisiones se persisten reutilizando `TaxResolutionDecision`
(`resolutionDecisions`, ya existente para el Centro de resolución) con
`objectType: 'electronic_invoice_purchase'`/`'electronic_invoice_report'` y
los tipos nuevos `decide_electronic_invoice_benefit`/
`set_no_electronic_invoicing_benefit`, en vez de crear una tercera tabla
Dexie. Es append-only, reversible y ya integrado con `rebuildForm210Draft`.

## 14. Conciliación contra Tope 5

`reconcileElectronicInvoiceReport` (`apps/web/src/lib/electronicInvoiceEngine.ts`)
compara `report.totals.netTotalCop` contra
`analysis.matrix.electronicInvoicing.totalNetInvoiced` (la implementación
existente de Tope 5 — Compras), reutilizando `evaluateReconciliationDifference`
(misma política que el resto del proyecto: `reconciled`/`rounding_difference`/
`minor_difference`/`relevant_difference`) más dos estados propios
(`missing_exogenous`/`missing_invoice_report`) para cuando falta un lado.

**Diferencia de $1**: se cubre con un fixture sintético dedicado
(`offByOnePesoElectronicInvoiceBuffer` en
`packages/exogenous-parser/tests/fixtures.ts`) que verifica que se
clasifica como `rounding_difference` usando la política **ya existente**,
sin ninguna excepción especial de "$1".

## 15. Corrección normativa: destino en el Formulario 210

Ver el detalle completo en
[`ELECTRONIC_INVOICING_2025.md`](./ELECTRONIC_INVOICING_2025.md) §"Historial
de correcciones normativas". Resumen: el numeral 5 del art. 336 ET exime
esta deducción del límite del 40 %/1.340 UVT (numeral 3 del mismo
artículo) — cablearla a la casilla 39 (que sí entra a ese límite vía
R40→R41, Fase D) era incorrecto. Una revisión normativa posterior también
corrigió el destino intermedio (componente de R92 vía casillas 140/141,
asumido en Fase D): las casillas oficiales 140 y 141 tienen significados
completamente distintos (indicador de costos/gastos estimados del art.
336-1 ET, e impuesto voluntario del art. 244-1 ET, respectivamente). La
casilla oficial correcta es la **28** (dato informativo previo a
patrimonio), fuera de cualquier fórmula de consolidación cedular.

## 16. Persistencia (Dexie v15)

Tablas nuevas, aditivas: `electronicInvoiceReports`,
`electronicInvoicePurchases`. Las decisiones reutilizan `resolutionDecisions`
(§13). `rebuildForm210Draft` recupera el reporte activo, calcula la base
explicable y la pasa a `buildForm210Draft` como `electronicInvoicing`.

## 17. Tareas del expediente

8 tipos nuevos con `source: 'electronic_invoice'`:
`electronic_invoice_report_not_reconciled`,
`electronic_invoice_duplicate_conflicting`, `electronic_invoice_missing_cufe`,
`electronic_invoice_payment_method_error`,
`electronic_invoice_requires_benefit_decision`,
`electronic_invoice_relevant_difference`,
`electronic_invoice_base_without_decision`,
`electronic_invoice_file_not_recognized` (reservado; ver limitación §20).

## 18. UI

Vista `facturacion-electronica`, dentro de la etapa Declaración (junto a
`beneficios-dependientes`). Estados: No cargado / Analizando / Procesado /
Requiere revisión / Conciliado. Tarjeta resumen (facturas, compras netas,
base susceptible, conciliación, deducción estimada 1 %). Tabla con detalle
expandible (fecha, emisor, factura, neto, susceptible, pago, estado; detalle:
NIT, gross, NC, ND, **CUFE completo solo en el detalle expandido de modo
avanzado**, fila fuente, decisión tributaria). Filtros (todos, elegibles,
susceptible=0, efectivo, error en datos, duplicados, requiere revisión,
excluidos del 1 %). Resolución por factura con motivo. "No usaré deducción
por facturación electrónica" (reversible, conserva el reporte).

**CUFE en UI**: la vista normal nunca muestra el CUFE completo en la tabla
principal — solo enmascarado sería el diseño de la tarjeta compacta; el
detalle expandido (siempre bajo interacción explícita del analista, nunca
en el resumen visible por defecto) muestra el CUFE completo con la etiqueta
"CUFE (completo, solo modo avanzado)". El export "safe" nunca incluye el
CUFE completo.

## 19. Verificación

- `packages/exogenous-parser`: 77/77 tests (29 nuevos de
  `electronicInvoiceReport.test.ts`: detección, encabezado variable,
  workbook completo, montos CO, CUFE, duplicados exactos/conflictivos/
  malformados, NC/ND, neto, métodos de pago, totales, regresión numérica de
  227 facturas, conciliación con diferencia de $1).
- `packages/form-210`: 93/93 tests (reescritos en la revisión normativa puntual para reflejar el
  destino oficial correcto en la casilla 28, nunca 39/92/140/141; incluye 4 tests de guardarraíl
  dedicados).
- `apps/web`: 113/113 tests (7 nuevos de repository — importar, archivo no
  reconocido, doble beneficio, opt-out reversible, deduplicación, eliminar,
  reimportar —, 1 nuevo de `taxCaseAnalysis` con los 8 tipos de tarea, 4
  nuevos de `ElectronicInvoicingPanel`).
- E2E (`apps/web/tests-e2e/electronic-invoicing.spec.ts`): 2/2 escenarios —
  flujo completo (cargar → conciliar → decidir → verificar F-210 →
  recargar → tarea → cierre) y archivo no reconocido. Capturas
  desktop/móvil verificadas.
- Monorepo completo (revisión normativa puntual): `check:encoding`, `typecheck`, `lint`, `test`
  (566 tests), `build`, `test:e2e` (10/10) — todo verde.

## 20. Fuera de alcance / limitaciones conocidas

- **`electronic_invoice_file_not_recognized`** está reservado en el
  dominio pero **no se persiste como tarea**: un archivo no reconocido
  nunca se guarda (no hay report/purchase que anclar como evidencia), así
  que se muestra como error inmediato en la UI en vez de una tarea
  deep-linkeable — a diferencia de las demás tareas de esta sección, que sí
  sobreviven a `synchronizeCaseTasks` porque se derivan de datos
  persistidos. Documentado como decisión de alcance, no como bug.
- **Biblioteca documental**: el reporte no se asocia a un `UploadedDocument`
  (`sourceDocumentId` queda `null`). Es una fuente estructurada propia, no
  un documento de la biblioteca general.
- **El 1 % de facturación electrónica en la casilla 89** (posible
  subcédula de honorarios, hallazgo abierto de Fase B0) — no se toca.
- Inmuebles, administración de propiedad horizontal, medicina prepagada —
  explícitamente fuera de alcance de esta fase.
