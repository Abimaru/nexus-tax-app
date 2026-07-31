# Roadmap — NexusTax

## Sprint 1 (actual) — Fundaciones locales ✅

Expediente local, carga de exógena, inspección, normalización, resumen +
gráficas, hallazgos, checklist preliminar, persistencia en IndexedDB y
exportación JSON. Sin backend, IA, PDFs ni cálculo tributario.

## Sprint 2 — Robustez del parser y conciliación básica

- Mapeo manual persistente por expediente y "perfiles" de columnas reutilizables.
- Más formatos de exógena y tolerancia a variantes de encabezados.
- Importación de más de un archivo por expediente y consolidación.
- Primeros cruces exógena ↔ conceptos (base del Aegis Engine, con evidencia).

## Sprint 3 — Certificados y documentos

- Carga de certificados (Formulario 220, bancarios, pensiones, vivienda).
- Estados del checklist persistentes y adjuntos locales.
- Extracción asistida de valores desde certificados (revisión humana).

## Sprint 4 — Aegis Engine (v1)

- Motor de reglas configurable y **auditable** para conciliación.
- Propuestas de valores para el **Formulario 210** con explicación y confianza.
- Trazabilidad completa: de cada valor propuesto a su evidencia de origen.

## Más adelante (no comprometido)

- Sincronización opcional cifrada entre dispositivos del usuario.
- Reportes exportables (PDF) y firmas de trazabilidad.
- Internacionalización de la interfaz.

## Principios que se mantienen en todo el roadmap

Privacidad y ejecución local por defecto, trazabilidad, evidencia, revisión
humana y **nunca** afirmar obligaciones legales que sean solo recomendaciones.

## Estado de conciliacion resoluble

Completado: clasificacion v2, relaciones entre registros, resolucion manual
persistente, matriz preliminar, facturacion electronica y conciliacion local
contra los cinco topes. Pendiente: perfiles de columnas, mas formatos, revision
manual de relaciones y explicacion asistida de diferencias por registro.
