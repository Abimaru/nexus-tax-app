# Parser de exógena — `@nexus-tax/exogenous-parser`

Motor **puro y determinista** que convierte un Excel de información exógena en un
`ProcessingResult`. No toca el DOM, no hace red y no contiene componentes React.

## Garantías

- Acepta `.xlsx` y `.xls`.
- **No ejecuta macros ni contenido activo** (`bookVBA: false` al leer).
- Detecta encabezados **tolerando** que no estén en la primera fila.
- Separa **metadatos, encabezado, resumen de topes y detalle** por señales de
  contenido; no depende de números de fila ni de una cantidad fija de topes.
- Conserva `fullRows` como fuente completa del motor y deriva `previewRows`
  únicamente para renderizar una muestra acotada en la interfaz.
- Normaliza espacios, tildes y mayúsculas **solo para comparación interna**;
  **conserva siempre** el nombre original de las columnas y el valor original.
- Transforma fechas y números con cuidado; **no convierte identificadores largos
  a notación científica**.
- Registra **advertencias** cuando faltan columnas esperadas.
- Permite **mapeo manual** de columnas.
- Reconoce encabezados jerárquicos, por lo que `Persona que reporta > NIT` e
  `Información reportada > NIT` son roles distintos y no duplicados.
- Extrae la identidad del consultante desde etiquetas semánticas y valida cada
  registro usando documentos normalizados, con evidencia enmascarada.
- Estructura `Uso declaración sugerida` y aplica una clasificación tributaria
  inicial versionada sin realizar cálculos definitivos.
- Conserva **referencia a hoja y fila** de origen.
- Produce un resultado **determinista** (IDs por hash estable, orden explícito).
- **No inventa** conceptos ausentes.

## Pipeline

| Paso          | Función                           | Salida                                         |
| ------------- | --------------------------------- | ---------------------------------------------- |
| Validar       | `validateFile`                    | extensión + tamaño                             |
| Leer          | `readWorkbookFile`                | `WorkbookMetadata` + matrices                  |
| Previsualizar | `buildWorkbookPreviews`           | proyección acotada de `fullRows`               |
| Encabezados   | `detectHeaderRow`                 | índice de fila + confianza                     |
| Secciones     | `detectReportSections`            | límites 1-based de metadatos, topes y detalle  |
| Topes         | `extractThresholds`               | topes con hoja, fila y columnas de origen      |
| Columnas      | `buildColumns`                    | descriptores (duplicada / sin nombre)          |
| Mapeo         | `guessColumnMapping`              | campo canónico → columna original              |
| Normalizar    | `normalizeRecords`                | crudos + normalizados                          |
| Identidad     | `extractTaxpayerIdentity`         | consultante + documento normalizado            |
| Uso sugerido  | `parseSuggestedUse`               | topes, casillas, condiciones y grupos          |
| Clasificar    | `classifyTaxRecord`               | naturaleza, categoría, tratamiento y evidencia |
| Agregar       | `buildEntities` / `buildConcepts` | entidades y conceptos                          |
| Calidad       | `detectFindings`                  | hallazgos con evidencia                        |
| Métricas      | `computeMetrics`                  | totales + `qualityScore`                       |
| Checklist     | `buildChecklist`                  | requisitos documentales                        |
| Exportar      | `toNormalizedJson`                | JSON versionado                                |

Orquestación: `processWorkbookFile()` / `processSheet()`.

## Lectura completa y dimensiones

La matriz `ReadWorkbookResult.fullRows` se construye a partir de las direcciones
de celda realmente presentes en cada worksheet. El lector no usa
`worksheet['!ref']` como límite autoritativo porque algunos generadores dejan
allí una dimensión obsoleta (por ejemplo, declaran fila 15 aunque existen celdas
en filas posteriores).

`SheetPreview.previewRows` se obtiene con `buildWorkbookPreviews()` y puede estar
limitado para proteger el renderizado. El worker conserva `fullRows` en memoria
y `processSheet()` siempre consume esa fuente completa, nunca la vista previa.

## Coerción de valores

- **Números** en formato colombiano (`1.234.567,89`) y contable (`(1.000)`).
- **Fechas** → ISO `yyyy-mm-dd`.
- **Identificadores**: si un número tiene ≥ 12 dígitos o viene en notación
  científica, se conserva como **texto** usando el valor formateado de la celda.

## Detección de encabezados

Escanea las primeras filas (límite configurable) y puntúa cada una por su
"aspecto de encabezado" (proporción de celdas de texto, cobertura y coincidencia
con sinónimos). Empates: gana la fila más temprana (determinismo).

## Detección de secciones

Después del encabezado, el parser busca la primera fila con señales combinadas
de identidad del tercero, concepto y valor. Las filas previas con descripción y
valor numérico forman el resumen de topes. Las filas no vacías anteriores al
encabezado se conservan como metadatos sin reinterpretarlas.

`ExogenousReportStructure` usa filas **1-based**, iguales a las que ve el usuario
en Excel. La pantalla de inspección permite corregir el encabezado, el rango de
topes y el comienzo del detalle antes de procesar. Los archivos que empiezan el
detalle inmediatamente después del encabezado siguen funcionando como tablas
planas.

## Mapeo de columnas (adaptador)

`HEADER_SYNONYMS` asocia cada campo canónico a una lista de sinónimos
normalizados. Es un **adaptador configurable**, no una regla acoplada a un único
archivo. El usuario puede sobrescribir el mapeo manualmente en la UI.

## Hallazgos de calidad (§7)

`empty_row`, `duplicate_header`, `unnamed_column`, `record_without_entity`,
`record_without_concept`, `record_without_value`, `non_numeric_value`,
`possible_exact_duplicate`, `possibly_truncated_identifier`, `empty_sheet`,
`unknown_format`. Cada uno con severidad y evidencia (hoja/fila/columna/valor).
Se limita el número por categoría para no saturar la UI.

## Checklist documental (§8)

`DEFAULT_CHECKLIST_RULES` define reglas por categoría de entidad (empleador,
banco, pensiones, vivienda). Cada requisito es una **recomendación de soporte**
con nivel de confianza; **nunca** se afirma obligatoriedad legal
(`isLegallyRequired: false`). Las reglas están separadas de la UI y preparadas
para el Aegis Engine.

## Extensibilidad

Para soportar un formato nuevo: añade sinónimos en `mapping.ts` o pasa un
`columnMapping` manual. Para nuevas recomendaciones: agrega reglas al arreglo de
checklist. No hay lógica acoplada a un archivo concreto.
