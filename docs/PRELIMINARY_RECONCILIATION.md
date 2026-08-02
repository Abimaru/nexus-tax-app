# Conciliación documental preliminar

Esta conciliación enlaza hechos documentales con uno o varios registros de
información exógena. Es distinta de la comparación agregada de la matriz contra
topes descrita en `RECONCILIATION.md`.

## Sugerencias deterministas

Se puntúan entidad, categoría, valor igual o cercano, palabras del concepto y
producto. La sugerencia conserva puntaje y señales, pero nunca cambia a
`reconciled` sin `confirmedByHuman: true`. Igualdad de valor aislada no basta.

Estados: pendiente, sugerido, conciliado, diferencia menor, diferencia
relevante, no comparable, otro producto y dato exógeno cuestionado.

Cada decisión conserva valores, diferencia absoluta y porcentual, producto,
explicación, decisión del analista, fuentes enlazadas y marcas de tiempo.

## Aceptación exógena y documento posterior

Si un registro fue aceptado provisionalmente, una conciliación humana posterior
actualiza su estado: respaldado cuando el valor coincide, contradicho cuando
difiere o no comparable. La aceptación y su historial permanecen. El documento
no agrega de nuevo el valor a la matriz: solo cambia evidencia, confianza y
estado de la fuente.

## Candidatos extraídos

La extracción sugiere registros con estados fuerte, probable, múltiples, sin
coincidencia o posible contradicción. El analista puede asociar un registro al
candidato, pero esa selección no concilia. Después de crear el hecho, la vista
de conciliación calcula de nuevo señales y diferencias y exige confirmación.

Las fuentes aceptadas solo cambian a `supported_by_document`,
`contradicted_by_document` o `not_comparable` dentro de una conciliación humana;
se conserva el historial y se evita sumar por segunda vez el mismo valor.

## Integración con pendientes

Una conciliación no confirmada o con diferencia relevante genera una `CaseTask` con destino directo.
Los grupos incompletos de matriz muestran la tarea relacionada y su acción. Resolver la evidencia
provoca un nuevo cálculo; la tarea previa queda resuelta de forma trazable, no eliminada.

Sprint 2.3 comparte la política de tolerancias con la matriz. Una sugerencia solo ofrece confirmación
directa cuando puntaje, cercanía, naturaleza y categoría son compatibles; las sugerencias débiles
se presentan para rechazar, abrir evidencia o registrar manualmente. Rechazar crea una decisión
trazable y retira la sugerencia de la cola activa.
