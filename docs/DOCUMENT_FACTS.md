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
