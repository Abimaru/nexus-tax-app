# Roadmap — NexusTax

## Entregado hasta hoy ✅

**Fundaciones locales.** Expediente local, carga de exógena, inspección,
normalización, resumen + gráficas, hallazgos, checklist preliminar, persistencia
en IndexedDB y exportación JSON. Sin backend ni IA.

**Lectura y estructura.** Lectura robusta (`fullRows`, no depende de `!ref`),
detección de secciones (metadatos / topes / detalle) revisable, encabezados
jerárquicos y preservación de identificadores.

**Identidad y clasificación.** Extracción de la identidad DIAN (documento
enmascarado, dos NIT jerárquicos, coincidencia por registro) y clasificación
tributaria (categoría / naturaleza / tratamiento, con evidencia y confianza).

**Análisis resoluble.** Relaciones entre registros, matriz con grupos y
conciliación preliminar contra los cinco topes, prevención de doble conteo, y
**resolución humana** con historial persistente (Dexie `analyses`), que se marca
obsoleta al cambiar el registro o la clasificación automática.

**Obligación de declarar (Aegis, AG 2025).** Paquete puro `@nexus-tax/aegis-rules`:
seis criterios (cinco topes + condición de IVA), montos oficiales conservando el
UVT, vencimiento 2026 y **fuentes DIAN**. Orientativo y versionado.

**Expediente tributario Sprint 2.0.** Biblioteca documental con persistencia
local opcional, catálogo de 16 tipos, hash, versiones, coberturas
multipropósito, productos, hechos normalizados, conciliación documental humana
y manifiesto sin binarios.

**Experiencia.** Interfaz con **tema claro y oscuro** conmutable, tokens de color
semánticos, filtros y detalle de Registros reorganizados, accesibilidad y
`prefers-reduced-motion`.

## Próximo

- **Parser**: mapeo manual persistente por expediente y "perfiles" de columnas;
  más formatos y variantes de encabezados; varios archivos por expediente.
- **Relaciones**: UI para confirmar/rechazar una relación (p. ej. posible
  duplicado) de forma independiente del registro.
- **Reglas Aegis**: años gravables distintos de 2025 y más criterios, siempre
  versionados y con fuentes.
- **Conciliación**: edición avanzada de asociaciones múltiples y revisión
  independiente de relaciones sugeridas.
- **Rendimiento**: virtualización de tablas grandes y métricas del Web Worker.

## Más adelante (no comprometido)

- Propuestas de valores para el **Formulario 210** con explicación y confianza
  (nunca liquidación automática sin revisión humana).
- Extracción asistida de valores desde certificados PDF.
- Sincronización opcional cifrada entre dispositivos del usuario.
- Reportes exportables (PDF) y firmas de trazabilidad. Internacionalización.

## Principios que se mantienen en todo el roadmap

Privacidad y ejecución local por defecto, trazabilidad, evidencia, revisión
humana, determinismo/versionado de reglas y **nunca** afirmar obligaciones
legales que sean solo recomendaciones.
