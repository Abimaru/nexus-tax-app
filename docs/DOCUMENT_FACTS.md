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
