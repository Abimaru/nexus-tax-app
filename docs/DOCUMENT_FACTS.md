# Hechos documentales

`DocumentFact` es el contrato común para valores procedentes de certificados,
Excel, imágenes, texto y futuros extractores. No depende de un banco concreto.

Conserva expediente, documento, entidad, producto, concepto original,
clasificación, naturaleza, tratamiento, valor, moneda, corte, periodo, página o
sección, evidencia, método de captura, confianza, revisión, requisitos, autor,
fechas e historial.

Los métodos son `manual`, `automatic`, `assisted` e `imported`. La interfaz
identifica visualmente el método; una captura manual nunca se presenta como
automática. Crear o modificar un hecho añade un evento al historial.

Una contraseña de documento no pertenece a este contrato ni al de documento.
Solo se conserva la bandera `requiresPassword`; la contraseña permanece fuera
de IndexedDB y del manifiesto.

## Fuente y presentación

El método de captura no sustituye la fuente. Una aceptación exógena usa
`analyst_resolution` como método de decisión y `exogenous_information` como
fuente primaria. Los catálogos visuales traducen método, revisión, relación,
categoría, naturaleza y tratamiento; los enums nunca se interpolan.

La acción provisional anota el registro exógeno existente y no crea un segundo
hecho sumable. Los hechos documentales posteriores se enlazan mediante la
conciliación preliminar.

## Captura asistida

Un `DocumentFactCandidate` conserva la propuesta determinista y no participa en
la matriz. Al confirmarlo, el hecho usa `captureMethod: assisted` y registra ID
del candidato, valor extraído, valor corregido, adaptador/versión, confianza
final y decisión del analista. El fragmento y la página se copian como evidencia
mínima; el texto completo del PDF no se guarda.

Una corrección sustancial exige observación. Rechazar, marcar duplicado o dejar
informativo conserva la decisión sin crear hecho. Restaurar afecta la propuesta,
no elimina hechos previamente confirmados.
