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
