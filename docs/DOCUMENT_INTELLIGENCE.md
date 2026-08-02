# Aegis Document Intelligence

## Propósito y frontera

`@nexus-tax/document-intelligence` convierte una representación PDF textual en
propuestas verificables. Es un paquete TypeScript sin React ni IndexedDB. Lee,
normaliza, clasifica, ejecuta un adaptador, puntúa confianza y devuelve
`DocumentFactCandidate[]`; no consolida impuestos ni modifica la matriz.

El flujo es:

```text
bytes locales → páginas normalizadas → clasificación orientativa
→ adaptador versionado → candidatos + evidencia → revisión humana
→ DocumentFact(captureMethod: assisted) → conciliación opcional
```

Un candidato nunca es un hecho y nunca entra por sí solo en la matriz. La web
persiste sesiones, candidatos y decisiones, y conserva el valor extraído como
inmutable aunque el analista lo corrija.

## Componentes

- `reader.ts`: bytes locales, páginas, progreso, timeout, cancelación y cifrado.
- `normalize.ts`: texto comparable, moneda colombiana e IDs deterministas.
- `classifier.ts`: señales ponderadas y niveles alta/media/baja/insuficiente.
- `adapters.ts`: catálogo versionado y extractor genérico de baja confianza.
- `matching.ts`: sugerencias de entidad, requisito y registro exógeno.
- `pipeline.ts`: orquestación pura y hallazgos recuperables.
- `contracts.ts`: representación independiente de PDF.js, límites y progreso.

## Estados y persistencia

La sesión recorre `pending`, `reading`, `classifying`, `extracting` y
`ready_for_review`; también puede terminar `password_required`,
`partially_read`, `unsupported`, `failed`, `cancelled` o `confirmed`. Dexie
guarda el resultado final por fase, no el worker, buffer, contraseña ni texto
completo. Una nueva ejecución referencia la anterior y vuelve obsoletos los
candidatos no confirmados, sin borrar sus decisiones.

## Alcance 2.1

Se soportan PDFs con texto seleccionable. Formulario 220, certificados
financieros multipropósito, deuda, saldos, vivienda, cesantías y predial tienen
adaptadores iniciales; los demás tipos usan reglas genéricas y revisión
obligatoria. OCR, imágenes, anotación geométrica precisa e IA están fuera.

Consulta también [procesamiento PDF](PDF_PROCESSING.md), [adaptadores](DOCUMENT_ADAPTERS.md),
[revisión](DOCUMENT_EXTRACTION_REVIEW.md) y [seguridad](DOCUMENT_EXTRACTION_SECURITY.md).

## Estabilización 2.1.1

La representación incluye fuente cuando está disponible, posición, tamaño, orden, líneas,
secciones y tablas simples. `maxCandidates` funciona como umbral preventivo: informa, pero no
recorta. Las métricas permiten comparar candidatos generados, persistidos y revisados. La firma
estable de evidencia permite conservar rechazos durante el reproceso y marcar como obsoletos los
valores que ya no aparecen. Véase [cobertura técnica](DOCUMENT_EXTRACTION_COVERAGE.md).
