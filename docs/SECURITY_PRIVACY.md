# Seguridad y privacidad — NexusTax

La privacidad es un requisito de producto, no una opción. NexusTax está diseñado
para que los datos tributarios **nunca salgan del dispositivo** del usuario.

## Garantías (§12)

- **Sin subida de archivos.** Ningún archivo se envía a un servidor.
- **Sin red para procesar.** El parseo ocurre en el navegador (Web Worker o hilo
  principal). No hay llamadas de red durante el procesamiento de documentos.
- **Reglas tributarias embebidas.** La evaluación de obligación y vencimiento no
  descarga ni analiza páginas o PDFs de la DIAN en tiempo de ejecución.
- **Persistencia explícita.** Por defecto solo se guardan metadatos. El usuario
  puede conservar un soporte en IndexedDB o decidir no conservarlo. Nunca se
  envía por red y puede eliminar el binario sin romper sus metadatos.
- **Sin volcado de datos tributarios completos en consola.** El logging evita
  registrar contenido sensible.
- **Identidad enmascarada por defecto.** La comparación usa el documento
  normalizado en memoria y los hallazgos solo muestran versiones enmascaradas.
- **Sin documentos reales en Git.** `.gitignore` es estricto: excluye `*.xlsx`,
  `*.xls`, `*.pdf`, `*.csv`, carpetas de expedientes y exportaciones. Solo se
  permiten fixtures **sintéticos** bajo `samples/` y `tests/`.

## Controles del usuario

- **Eliminar un expediente** (borra su resultado y documentos asociados).
- **Limpiar toda la información local** (botón en la cabecera): vacía las tablas
  todas las tablas del expediente, incluidos binarios, hechos y conciliaciones.
- **Aviso visible** de procesamiento local en Inicio y en la carga.

## Manejo de contenido activo

El lector de Excel usa `bookVBA: false`: no se procesan macros ni VBA. Las
celdas de error se tratan como nulas.

## Biblioteca documental

Los bytes opcionales viven separados de los metadatos. Se muestra el espacio
ocupado y se permite descarga o eliminación local. SHA-256 detecta duplicados
sin revelar contenido. La contraseña nunca se persiste y no se ejecuta contenido
activo. El renderizado de páginas y el OCR son locales, efímeros y bajo demanda.

Los PDFs con texto se leen con PDF.js desde bytes locales. El módulo y worker se
sirven desde el mismo origen sin CDN; se desactiva evaluación dinámica y se
aplican límites de 25 MiB, 250 páginas, 500 candidatos y 120 segundos. La
representación completa es efímera: solo persisten clasificación, evidencia
breve, candidatos y decisiones. Consulta `DOCUMENT_EXTRACTION_SECURITY.md`.

El manifiesto declara `includesBinaryData: false`; las pruebas verifican que no
contiene bytes. No se registran nombres sensibles ni contenido completo en
consola.

## OCR local (Sprint 2.2)

El OCR corre íntegramente en el navegador (Tesseract.js vendorizado, sin CDN) y
**nunca se ejecuta automáticamente**: el analista elige la página. No hay
solicitudes de red durante el reconocimiento (auditado con una prueba
dedicada), sin telemetría y sin imágenes ni texto completo en logs. El
resultado de OCR es efímero, igual que el texto nativo: no se persiste, solo
las decisiones que el analista confirma. Detalle operativo en
[`LOCAL_OCR.md`](LOCAL_OCR.md).
La cadena de suministro, el modelo fijado y las exclusiones del manifiesto se detallan en
[`OCR_SECURITY.md`](OCR_SECURITY.md).

Los perfiles documentales y el feedback de calibración (`documentProfiles`,
`extractionFeedback`) evitan persistir texto completo, pero pueden contener
fragmentos sensibles confirmados por el analista: señales estructurales,
encabezados normalizados y valores antes/después acotados a 160 caracteres.
Permanecen exclusivamente en IndexedDB local. Ver [`DATA_MODEL.md`](DATA_MODEL.md).

## Superficie de ataque

- **Sin backend obligatorio** (`apps/api` está reservado y vacío) ⇒ no hay
  endpoints ni almacenamiento remoto que proteger.
- Los datos viven en IndexedDB del navegador del usuario, bajo su control.

## Decisiones y borrador 210 (Sprint 2.3)

Las decisiones y el borrador se calculan/persisten localmente en Dexie v11. La exportación 2.3.0
incluye valores, evidencia y procedencia, por lo que debe tratarse como información tributaria
sensible, pero declara `includesBinaryData: false`. No incluye archivo fuente, PDF, imágenes, texto
OCR completo, contraseña temporal ni llamadas a la DIAN. El ruleset se distribuye versionado con la
aplicación y no consulta fuentes oficiales durante el uso normal.

## Declaraciones anteriores (Sprint 2.4)

El Formulario 210 de un año anterior se lee localmente con el mismo lector PDF (`readPdfText`) que
el resto del motor documental; nunca se envía a un servidor. La identidad detectada se enmascara de
inmediato (`taxpayerIdentityMasked`, solo últimos dígitos visibles) antes de persistirse en Dexie
v13 (`priorYearReturns`); las tarjetas generales de la UI nunca muestran el NIT o número de
formulario completos, solo en el modo avanzado del drawer de detalle y siempre como fragmento corto
de evidencia, no el PDF íntegro. El documento fuente respeta el modo de almacenamiento elegido por
el analista (por defecto solo metadatos). Ningún valor histórico se traslada automáticamente: todo
arrastre (anticipo, saldo a favor) requiere confirmación humana explícita y queda registrado como
decisión trazable.

## Facturación electrónica (Sprint 2.4, Fase D)

El reporte DIAN de facturación electrónica se lee localmente con el mismo
lector de workbook (`readWorkbook`) que la exógena; el archivo original nunca
se envía a un servidor ni se persiste como binario (`sourceDocumentId` queda
`null`: es una fuente estructurada propia, no un documento de la biblioteca).
El CUFE completo de cada factura se conserva en IndexedDB local
(`electronicInvoicePurchases`, Dexie v15) para permitir la detección de
duplicados y la evidencia trazable, pero **la UI nunca lo muestra completo
por defecto**: la tabla principal y las tarjetas móviles solo exponen datos
no sensibles (fecha, emisor, número de factura, valores, estado); el CUFE
íntegro solo aparece en el detalle expandido de una factura, bajo
interacción explícita del analista. El export "safe" (`FORM_210_EXPORT_BUNDLE.md`)
nunca incluye el CUFE completo. Las decisiones tributarias por factura
(§ art. 336-1 ET) se persisten como eventos append-only reutilizando
`resolutionDecisions`, con motivo obligatorio y sin modificar jamás la
evidencia original (valores, CUFE, notas crédito/débito). Ver
[`ELECTRONIC_INVOICE_REPORT_2025.md`](./ELECTRONIC_INVOICE_REPORT_2025.md).

## Buenas prácticas para contribuir

- No agregar dependencias que realicen telemetría o llamadas de red implícitas.
- No introducir logs con NIT, nombres o valores completos.
- Mantener el `.gitignore` estricto; si necesitas una muestra, genera datos
  ficticios con `samples/generate-sample.mjs`.
- Cualquier funcionalidad futura de sincronización debe ser **opcional, cifrada y
  explícita**, y documentarse antes de implementarse.
