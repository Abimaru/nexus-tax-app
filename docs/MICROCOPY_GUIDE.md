# Guía de microcopy

- Escribe en español claro, con frases breves y una acción por mensaje.
- No mezcles español con nombres internos en inglés.
- No interpoles enums. Usa un catálogo de presentación con etiqueta y ayuda.
- Si falta una etiqueta, muestra **Estado no reconocido** y registra un hallazgo
  técnico; nunca expongas el identificador crudo.
- Distingue “recomendado”, “requerido para el análisis” y “obligatorio
  legalmente”. NexusTax no afirma conclusiones legales definitivas.
- Explica consecuencias antes de reemplazar, eliminar o invalidar información.
- Usa mayúscula inicial en títulos y opciones; evita capitalizar cada palabra.
- Prefiere “Aceptado provisionalmente” a “Conciliado” cuando falta soporte.
- Prefiere “La entidad no emite este soporte” a “No aplica” cuando el documento
  es relevante pero no existe.

## Inventario corregido en 2.0.3

Se localizaron estados de documentos, hechos, conciliaciones, resoluciones,
entidades, empleadores y relaciones de requisitos. Los códigos técnicos de
hallazgos dejaron de mostrarse en pantalla y permanecen disponibles en la
exportación trazable.

## Pulido UX 2026-08-02

- En pantalla se usa “archivo original”, no “binario” o `blob`; “almacenamiento”, no
  “persistencia/IndexedDB”; y “huella del archivo”, no “hash”.
- En el laboratorio se habla de texto original, texto reconocido, datos propuestos y áreas de la
  página. `token`, `assisted` y los estados internos del motor OCR no llegan a la interfaz.
- En conciliación, el puntaje se presenta como “Coincidencia N/100”. La acción riesgosa es “Revisar
  y decidir” y siempre explica por qué requiere criterio humano.
- “Candidato” y “hecho” se reservan para documentación técnica. La UI prefiere “propuesta”, “dato” e
  “incorporar al expediente”.
- Una acción destructiva describe información eliminada, información conservada e irreversibilidad
  sin enumerar tablas o estructuras internas.
