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

**Sprint 2.0.1.** Checklist laboral agrupado, una a tres instancias de
empleador, deduplicación por entidad, cobertura individual del Formulario 220,
advertencia para certificados consolidados, migración Dexie v5 y guía de
validación funcional reproducible.

**Sprint 2.0.2.** Navegación guiada en seis etapas, rutas profundas estables,
progresión y siguiente acción deterministas, modo manual explícito, resumen de
fuente con SHA-256, persistencia de navegación y stepper responsive accesible.
Formulario 210 e historial se muestran únicamente como capacidades futuras.

**Sprint 2.0.3.** Catálogos de presentación en español, fuente exógena aceptada
provisionalmente con historial, requisito no emitido, flujo prudente de premios,
respaldo/contradicción por documento posterior, Dexie v7, manifiesto 2.0.3 y
dropzone compartido con quality gate visual obligatorio.

**Sprint 2.1.** Aegis Document Intelligence lee PDFs textuales sin salir del
navegador, clasifica documentos, ejecuta adaptadores deterministas, propone
hechos con página y evidencia, y exige revisión humana antes de crear hechos
`assisted`. Incluye reprocesamiento, contraseñas solo en memoria, límites,
manifiesto seguro y vista responsive de revisión.

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
- **Documentos**: ampliar adaptadores con fixtures de más emisores y mejorar la
  comparación explícita entre ejecuciones de extracción.

## Más adelante (no comprometido)

- Propuestas de valores para el **Formulario 210** con explicación y confianza
  (nunca liquidación automática sin revisión humana).
- OCR local para documentos escaneados, sujeto a evaluación de memoria y UX.
- Enriquecimiento opcional mediante el contrato abstracto, sin habilitar envío
  de documentos ni texto completo por defecto.
- Sincronización opcional cifrada entre dispositivos del usuario.
- Reportes exportables (PDF) y firmas de trazabilidad. Internacionalización.

## Principios que se mantienen en todo el roadmap

Privacidad y ejecución local por defecto, trazabilidad, evidencia, revisión
humana, determinismo/versionado de reglas y **nunca** afirmar obligaciones
legales que sean solo recomendaciones.

## Sprint 2.1.1 — estabilización documental

Implementado: extracción sin truncamiento silencioso, estructura geométrica básica, métricas de
cobertura, paginación/filtros, rechazo estructurado y por lotes, reproceso con decisiones,
identidad financiera versionada, requisitos depurados, tareas accionables y separación entre
obligación y preparación.

Siguiente evolución segura: ampliar adaptadores con nuevas variantes convertidas a fixtures
sintéticos y calibrar detección de tablas por emisor. OCR, IA externa, backend, Formulario 210
definitivo y conciliación irrevocable siguen fuera de alcance.
