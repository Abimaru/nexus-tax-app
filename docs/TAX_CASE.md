# Expediente tributario local

El expediente es el agregado principal de NexusTax. La información exógena es
una fuente del expediente, no su raíz.

## Contenido

Un expediente conserva un identificador estable, alias, contribuyente
enmascarado, año gravable, año de presentación, estado, notas y marcas de
tiempo. Las tablas relacionadas aportan documentos, entidades, productos,
requisitos, coberturas, hechos, análisis exógeno, matriz, resoluciones y
conciliaciones.

El grupo laboral conserva de una a tres instancias de empleador cuando existe
evidencia o declaración manual de ingresos laborales. Entidades adicionales se
mantienen como evidencia de detección, sin descartarlas silenciosamente.

Estados disponibles: `new`, `collecting_documents`, `under_analysis`,
`pending_information`, `ready_for_review` y `closed`.

## Panel general

El resumen muestra obligación orientativa, vencimiento, documentos, requisitos,
hallazgos y grupos pendientes. El progreso no se reduce a un único porcentaje:
separa cobertura documental, hechos revisados, conciliación, hallazgos y
preparación de matriz, con una explicación de lo que falta.

## Privacidad

Todo permanece en el navegador. El manifiesto JSON usa el esquema
`nexustax.tax-case.manifest` versión `2.0.1` y declara
`includesBinaryData: false`. El borrado del expediente elimina sus tablas y
binarios locales en una sola transacción.
