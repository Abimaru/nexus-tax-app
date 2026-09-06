# Roadmap — NexusTax

> Sprint 2.4 (Fase B0 + Fase B + Fase B1 + Fase C + Fase D) completado:
> esqueleto de casillas del F-210, declaraciones anteriores, los dos
> beneficios de dependientes económicos (art. 387 y art. 336 num. 3 ET), y el
> reporte DIAN detallado de facturación electrónica (CUFE, deduplicación,
> conciliación, motor del 1 % corregido a su destino normativo correcto en
> R92). Pendiente: el resto del Sprint 2.4 (inmuebles, administración de
> propiedad horizontal, medicina prepagada).

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

- Ampliar el **Formulario 210** a otros años gravables solo después de una revisión normativa
  independiente de la matriz AG 2025.
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
sintéticos y calibrar detección de tablas por emisor. IA externa, backend, Formulario 210
definitivo y conciliación irrevocable siguen fuera de alcance.

## Sprint 2.2 — laboratorio documental, OCR local y perfiles

Implementado (Fases A-E): script de detección de mojibake; diagnóstico de tipo de PDF por documento
y por página (textual/escaneado/texto insuficiente/dañado); OCR local bajo demanda con Tesseract.js
vendorizado (sin CDN, sin red durante el reconocimiento, cancelable, con watchdog); contrato
unificado de texto nativo/OCR y comparación explícita entre ambas fuentes (nunca se fusionan);
preprocesamiento de imagen puro (escala, contraste, binarización, rotación, recorte, reducción de
ruido); laboratorio documental con overlay de capas y candidatos manuales asistidos; perfiles
documentales reutilizables por señales estructurales (nunca por nombre de archivo) y feedback de
calibración con el alcance que elige el analista.

Implementado (Fases F–G): tareas ligadas a documento+página (OCR sugerido, contradicción, fallo
recuperable y perfil listo para probar); deep-link al laboratorio; métricas OCR/perfiles en el
manifiesto 2.2.0; recuperación mediante reintento, menor resolución o texto nativo; editor de zonas
por arrastre con alternativa de teclado; ciclo explícito borrador→probado→activo→obsoleto;
fixtures sintéticos y E2E con OCR real, temas oscuro/claro, escritorio/móvil; documentación final y
medición de referencia. IA externa, backend obligatorio y Formulario 210 definitivo siguen fuera
de alcance.

Siguiente evolución segura: ampliar el corpus visual con emisores sintéticos adicionales y conectar
zonas de perfiles activos como **sugerencias** de candidatos, siempre con revisión humana.

## Sprint 2.3 — centro de resolución y borrador Formulario 210

Implementado: cola de decisiones ejecutables con historial reversible; prioridades bloqueantes;
política central de conciliación; separación de ganancias ocasionales; aportes laborales
contextuales; paquete puro `form-210`; casillas/fórmulas parciales AG 2025; trazabilidad,
validaciones, ajustes y export JSON; Dexie v11 y manifiesto 2.3.0.

Siguiente evolución segura: ampliar el ruleset solo desde fuentes oficiales versionadas, añadir
límites completos de rentas exentas/deducciones y validar más cédulas con corpus sintético. Siguen
fuera de alcance la liquidación definitiva, firma, presentación, autenticación DIAN y backend.

## Sprint 2.3.1 — validación tributaria y liquidación preliminar

Implementado: catálogo versionado de fuentes, UVT única, matriz de validación, once motores puros
AG 2025, liquidación privada preliminar, impacto de decisiones, simulación controlada, tareas por
casilla, validaciones cruzadas y bundle exportable. La web incorpora las vistas Liquidación y
Estados; Playwright cubre el flujo, temas y responsive.

Siguiente evolución segura: revisión normativa independiente de las reglas todavía marcadas
`implemented_unverified`, ampliación del corpus sintético y definición versionada de un año
gravable adicional. Firma, presentación DIAN/MUISCA, sanciones automáticas, backend obligatorio e
IA externa siguen fuera de alcance.

## Sprint 2.4 — Fase B0 (esqueleto F-210) + Fase B (declaraciones anteriores) + Fase B1 (UX)

Implementado: catálogo de casillas del F-210 completado estructuralmente (89, 91-93, 111, 126,
127, 129, 133, 137-141) con estado explícito de verificación normativa; corrección documentada de
la conclusión de Fase A sobre la casilla 92/139; nueva fuente estructurada `PriorYearTaxReturn` con
parser de PDF que detecta el formulario, año, identidad y estado, y extrae casillas por patrón
(verificado contra un oráculo AG2024 anonimizado); motor de arrastres de anticipo y saldo a favor
con confirmación humana obligatoria; comparación de evolución tributaria y detector de anomalías
de escala histórica (reutiliza el motor monetario de Sprint 2.3.2); Dexie v13. Fase B1 completa la
integración UX: sección "Declaraciones anteriores" dentro del expediente, carga con estados
humanos, drawer de detalle con procedencia, tarjetas de arrastre aplicables desde la UI, evolución
tributaria con hallazgos descartables, tareas con deep-link desde Revisión final, y E2E con
capturas desktop/móvil.

Pendiente explícito de este incremento: conectar de forma nativa el input `priorYearBalance` del
motor puro (hoy el arrastre se aplica vía ajuste genérico de casilla, una simplificación
documentada). Ver `docs/PRIOR_YEAR_RETURNS.md`.

## Sprint 2.4 — Fase C (dependientes económicos: art. 387 + art. 336 num. 3 ET)

Implementado: corrección de un bug real en el motor del art. 387 ET (el tope de 384 UVT/año era
agregado para el contribuyente, no se multiplica por dependiente); nuevo motor independiente para
la adición de 72 UVT por dependiente del art. 336 num. 3 ET (máx. 4, nunca sujeto al tope 40 %/
1.340 UVT); evaluador de elegibilidad por categoría de parentesco que nunca fuerza un falso
`not_eligible` con datos incompletos; resolutor de coexistencia (Decreto 1625/2231-2023) que
decide si ambos beneficios aplican simultáneamente según la naturaleza del ingreso laboral;
casillas 91-93 y 138-139 del F-210 cableadas (`implemented_unverified`); dominio `TaxDependent`/
`DependentSupport`/`DependentEvaluation`; Dexie v14; 8 tipos de tarea nuevos; UI
`beneficios-dependientes` con selector de naturaleza de ingresos y tarjetas de dependiente; E2E con
capturas desktop/móvil. Ver `docs/DEPENDENTS_BENEFITS_2025.md`.

Pendiente explícito de este incremento: adjuntar un documento de la biblioteca como soporte de un
dependiente desde la UI (campo estructural listo, acción pendiente); el 1 % de facturación
electrónica como posible componente de R92 (hallazgo señalado, no aplicado — **resuelto en la Fase
D**); casilla 89 (subcédula de honorarios, hallazgo abierto de Fase B0). El resto del Sprint 2.4
(facturación electrónica DIAN, inmuebles, administración de propiedad horizontal, medicina
prepagada) no se inició en esta fase: facturación electrónica se completó en la Fase D; inmuebles,
administración de propiedad horizontal y medicina prepagada quedan para incrementos siguientes.

## Sprint 2.4 — Fase D (reporte DIAN de facturación electrónica)

Implementado: corrección normativa del destino de la deducción del 1 % (art. 336-1 ET) — se movía
a la casilla 39, exponiéndola indirectamente al límite del 40 %/1.340 UVT del que el Decreto 2231
de 2023 la exime expresamente; se corrige moviéndola a ser componente de la casilla 92 (casillas
140/141), análogo a R139; nuevo parser XLSX del reporte DIAN detallado (adaptador hermano de la
exógena, reutiliza su infraestructura de lectura pero no su semántica); parser monetario central
(`@nexus-tax/document-intelligence`) reutilizado en vez de duplicar lógica de coerción numérica;
deduplicación por CUFE (exacto/conflictivo/ausente/malformado); validación de notas crédito/débito
contra la columna neta oficial; agregador explicable de la base del 1 % (susceptible − duplicados −
rechazadas − doble beneficio); conciliación contra el Tope 5 de la exógena reutilizando la política
de tolerancia ya existente (sin excepción especial para diferencias de $1); decisiones tributarias
por factura reutilizando el historial append-only existente (`resolutionDecisions`, sin tabla
nueva); Dexie v15; 8 tipos de tarea nuevos; UI `facturacion-electronica` con CUFE enmascarado por
defecto y "No usaré deducción" reversible; E2E con capturas desktop/móvil; fixture de regresión
numérica de 227 facturas sintéticas. Ver `docs/ELECTRONIC_INVOICE_REPORT_2025.md`.

Pendiente explícito de este incremento: `electronic_invoice_file_not_recognized` no se persiste
como tarea deep-linkeable (se muestra como error inmediato en la UI, ya que un archivo no
reconocido nunca se guarda); el reporte no se asocia a la biblioteca documental general. Inmuebles,
administración de propiedad horizontal y medicina prepagada no se iniciaron: quedan para
incrementos siguientes con revisión intermedia.
