# Reglas Aegis — obligación de declarar

## Alcance actual

`packages/aegis-rules` contiene reglas locales, puras y versionadas para la
declaración de renta de personas naturales de Colombia. La primera versión cubre
el año gravable 2025 y su presentación en 2026.

No realiza liquidación de impuestos, no reemplaza la revisión humana y no hace
consultas de red durante el uso normal. El estado `required` significa que el
motor encontró al menos uno de los criterios configurados; la determinación
definitiva depende de la realidad económica y jurídica del contribuyente.

## Evaluación

- Los cinco topes se mapean por significado, tolerando tildes, mayúsculas,
  puntuación, abreviaturas y variaciones menores. El número de tope es respaldo,
  no reemplaza una etiqueta semántica clara.
- Cada resultado conserva la etiqueta original y hoja/fila/columnas de origen.
- Un tope ausente queda `not_evaluable`; nunca se convierte en `not_met`.
- Si algún criterio se cumple, el estado es `required`. Si ninguno se cumple
  pero falta información, es `pending_information`. Solo es `not_required` si
  los seis criterios fueron evaluados y ninguno se cumple.
- La comparación monetaria usa el valor oficial redondeado publicado, conserva
  también la multiplicación exacta de UVT y respeta estrictamente `>` frente a
  `>=`.

## Calendario

Los 50 rangos oficiales de terminaciones `01-02` a `99-00` están embebidos en
`deadlines-2026.ts`. Para un NIT con dígito de verificación separado por guion,
el DV se excluye antes de tomar los dos últimos dígitos. Si no hay documento
suficiente, la fecha queda pendiente.

## Fuentes incorporadas

- Micrositio DIAN de renta personas naturales AG 2025.
- Resolución DIAN 000193 de 2024 para la UVT 2025.
- Calendario tributario DIAN 2026.

La versión `co-renta-pn-2025.1.0.0` fue verificada el 31 de julio de 2026. Las
URL exactas forman parte de `sources.ts` y se muestran en la interfaz.
