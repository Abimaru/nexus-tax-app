# Roadmap — NexusTax

> Sprint 2.4 (Fase B0 + Fase B + Fase B1 + Fase C + Fase D + Fase E + Fase
> E.1 + Fase F + F.1 + F.2 + F.3 + Fase G + Fase G.1 + Fase H +
> revisiones normativas puntuales) completado: esqueleto de casillas del
> F-210, declaraciones anteriores, los dos beneficios de dependientes
> económicos (art. 387 y art. 336 num. 3 ET), el reporte DIAN detallado de
> facturación electrónica (CUFE, deduplicación, conciliación, motor del
> 1 % en su casilla oficial: la 28, art. 336 num. 5 ET), Evidence
> Matching & Guided Reconciliation con su promotion gate cerrado y
> política de reconciliación numérica unificada, el módulo de
> inmuebles/renta inmobiliaria/administración de propiedad horizontal
> (candidatos, nunca cableado al Formulario 210 todavía), un caso
> tributario sintético integral ("golden case") que reemplaza el sample
> mínimo de humo, coherente entre todas las fuentes y validado contra el
> pipeline real, y la deducción de salud complementaria/medicina
> prepagada (art. 387 ET, tope mensual agregado de 16 UVT, cableada a la
> casilla 39 junto con dependientes).
> Sprint 2.4 completo — sin fases pendientes de esta lista original.

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

Implementado: cableado del motor del 1 % — inicialmente movido de la casilla 39 a "componente de
la casilla 92" (casillas 140/141), corrección posteriormente revertida en la revisión normativa
puntual (ver más abajo); nuevo parser XLSX del reporte DIAN detallado (adaptador hermano de la
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

## Sprint 2.4 — Fase E (Evidence Matching & Guided Reconciliation)

Reduce el ruido numérico mostrado al analista tras la extracción documental y evoluciona el
emparejador candidato↔exógena existente con un estado granular que distingue explícitamente el
redondeo (`rounding_match`) de una coincidencia meramente probable, y la ambigüedad
(`ambiguous`) de una contradicción relevante. Nuevo clasificador puro
(`classifyNumericEvidence`) asigna un rol (dinero o una categoría de ruido: NIT, cuenta,
resolución, año, referencia legal, etc.) a cada token numérico según su contexto, sin descartar
nunca la evidencia (queda disponible para inspección en modo avanzado). Nueva UI
`EvidenceReviewPanel` presenta un resumen en lenguaje simple con confirmación en bloque acotada a
coincidencias claras y captura manual guiada desde una expectativa (`ExpectedTaxEvidence`) sin
candidato aceptable — sin reemplazar la revisión detallada existente, que sigue disponible como
"modo avanzado". Persistencia reutiliza exactamente los mecanismos existentes de confirmación de
candidato y conciliación preliminar, sin crear un segundo camino de doble conteo. Limitación
conocida documentada para una futura Fase E2: coexisten dos scorers (candidato↔exógena y
hecho↔exógena) sin unificar. Detalle completo en `docs/EVIDENCE_MATCHING.md`.

## Sprint 2.4 — Fase E.1 (cierre: promotion gate + E2E)

Cierra los dos criterios de aceptación pendientes de la Fase E funcional. El clasificador de
evidencia numérica ahora **participa en la decisión de promoción**: `monetaryMatches()` solo crea
un `DocumentFactCandidate` monetario cuando el rol clasificado es `money` (o, de forma
conservadora, `unknown`, marcado `requires_review`); los roles de ruido (NIT, cédula, cuenta,
resolución, referencia legal, fecha, año, porcentaje, página) se suprimen — nunca se descartan
como evidencia, pero dejan de crear candidatos falsos. Se resolvieron casos de contexto explícitos
(símbolo de moneda pegado al token gana sobre una referencia más atrás en la línea; palabra de
monto + formato de miles gana sobre "cuenta"/"obligación"; NIT/cédula ganan siempre). Se corrigió
que "Valor cercano." coexistiera con la razón de redondeo en la misma sugerencia. Se completó el
cableado de dos acciones ya modeladas pero sin UI: elegir el valor correcto ante una ambigüedad, y
que la captura manual guiada marque su expectativa como resuelta (antes reaparecía como pendiente).
Nuevo E2E de Playwright (`evidence-review.spec.ts`) cubre el flujo completo con datos sintéticos:
promoción/supresión, redondeo, ambigüedad, captura manual, conciliación sin doble conteo,
persistencia y responsive. Detalle completo en `docs/EVIDENCE_MATCHING.md`.

## Sprint 2.4 — Fase F / F.1 (benchmark real, diagnóstico)

Validación exclusivamente diagnóstica del motor de extracción y del emparejador contra documentos
reales de dos personas (nunca copiados al repositorio; solo métricas redactadas/agregadas en el
chat). Encontró: el *promotion gate* antirruido funciona correctamente; el problema principal es
de cobertura/clasificación/adaptadores, no de ruido; 1 false confident match real (retención
clasificada como ingreso, `exact_match` contra un registro de ingresos); certificados de
intereses de vivienda sin cobertura y sin categoría exógena equivalente; divergencias reales entre
`suggestExogenousMatches` y la política de conciliación de la matriz (`evaluateReconciliationDifference`)
sobre el tratamiento del redondeo y de "posible coincidencia". No se modificó ningún código de
producción en estas dos fases.

## Sprint 2.4 — Fase F.2 (Safety & Critical Evidence Hardening)

Corrige los dos hallazgos críticos de F.1 mediante una defensa semántica general, no un parche por
emisor: gate semántico reusable (`detectSemanticContradiction`) que impide que un `exact_match`/
`rounding_match` con contradicción de concepto (retención vs. ingreso, base gravable vs. valor,
saldo vs. deducción) sea confirmable en bloque; corrección de causa raíz en la regla de retención
del adaptador financiero consolidado; ampliación del vocabulario y las reglas de vivienda;
vivienda habilitada como evidencia "document-only" válida sin exógena; fallback guiado
(`evidence_missing_expected` reutilizado) cuando no se identifican los intereses. Rebenchmark
local confirmó la corrección del false confident original y ninguna regresión en los casos ya
bloqueados; la cobertura de vivienda mejoró parcialmente (1 de 2 casos reales). Deliberadamente
**no** se unificaron los dos scorers divergentes encontrados en F.1 — queda para una futura Fase
F.3. Detalle completo en `docs/EVIDENCE_MATCHING.md` §Fase F.2.

## Sprint 2.4 — Fase F.3 (Unified Reconciliation & Coverage Hardening)

Unifica la dimensión numérica de los tres/cuatro puntos donde NexusTax evaluaba diferencias
numéricas con criterios distintos (`suggestExogenousMatches`, `evaluateReconciliationDifference`,
`suggestReconciliations`, y un umbral ad-hoc en `ReconciliationsPanel.tsx`) bajo una única política
pura (`evaluateNumericReconciliation`, `@nexus-tax/domain`), preservando la precedencia del gate
semántico de Fase F.2 en los cuatro consumidores. Corrige incompatibilidades estructurales reales:
cesantías (saldo reclasificado de `asset` a `severance`, aporte/consignación reconocido en ambos
lados), certificados tributarios consolidados mal clasificados como `debt_certificate` (señal
singular→plural), nuevo adaptador `co.annual-cost-report.generic`, vocabulario textual ampliado de
Form 220, y una fixture de tabla multiproducto. Introduce routing documental explícito (declaración
anterior → ruta especializada; extracto bancario transaccional → sin candidatos, detectado
estructuralmente) sin descartar nunca el documento. Reduce falsos `unresolved` excluyendo 5
categorías exógenas estructuralmente sin certificado esperado. Nueva métrica local Human Review
Burden (`docs/HUMAN_REVIEW_BURDEN.md`). Rebenchmark real sobre el mismo corpus de F.1 confirmó
mejoras sustanciales (Human Review Burden ~192→88, candidatos totales 142→52, evidencia
document-only 115→26) manteniendo `falseConfidentMatches` en 0. Detalle completo en
`docs/EVIDENCE_MATCHING.md` §Fase F.3.

## Sprint 2.4 — Revisión normativa puntual (cierre de Fase D)

Antes de publicar la Fase D se ejecutó una revisión normativa exclusiva de la integración del
beneficio del 1 % con el Formulario 210. Hallazgo: la Fase D había corregido el destino de la
casilla 39 pero introducido un segundo error, asumiendo el fundamento legal "artículo 336-1 ET" y
las casillas 140/141 como destino. Verificado con múltiples fuentes independientes: el fundamento
real es el **numeral 5 del art. 336 ET** y la casilla oficial es la **28** (dato informativo previo
a patrimonio) — el art. 336-1 ET es una norma distinta (indicador de exceso de costos y gastos
estimados, casilla 140, checkbox no monetario) y la casilla 141 corresponde al impuesto voluntario
del art. 244-1 ET, sin relación con este beneficio. Se corrigió el cableado (casilla 28 propia,
fuera de R39/R92), el `sourceId` del motor (`et-art-336-num-5`), el catálogo de fuentes oficiales
(tres entradas separadas para las tres normas antes confundidas) y se agregó un bloque de 4 tests
de guardarraíl que impide permanentemente la reintroducción de los cuatro errores encontrados. Ver
`docs/ELECTRONIC_INVOICING_2025.md` §"Historial de correcciones normativas".

## Sprint 2.4 — Fase G (Inmuebles, renta inmobiliaria y administración de propiedad horizontal)

Nuevo módulo de dominio (`packages/domain/src/property.ts`): `TaxProperty`, `RentalActivity`
(período real, nunca los 12 meses del año por defecto), `RentalIncome` (enlace de lectura a un
registro exógeno/hecho documental/manual, nunca un segundo libro de ingresos que duplique sumas) y
`PropertyExpense` (candidato, con `eligibilityStatus` de seis estados explicables — nunca un
booleano `deductible = true/false`). Motor puro `evaluatePropertyExpenseEligibility`
(`@nexus-tax/aegis-rules`, 16 tests) que aplica en orden: posible duplicado → cuota extraordinaria
→ residencia personal (`not_applicable`) → uso vacante/otro/desconocido (`requires_context`) → uso
mixto sin asignación (`requires_allocation`) → período/ingreso de arrendamiento sin definir
(`requires_context`) → soporte insuficiente (`requires_support`, con copy específico de
administración de PH que nunca exige factura) → `potentially_deductible`. Nuevo adaptador
`co.property-administration.generic` (7 tests) para certificados/cuentas de cobro de
administración, con cinco reglas independientes (nunca `mensual × 12`). Dexie v16 (4 tablas
nuevas, aditiva). 6 tipos de tarea nuevos (`source: 'property'`, ver `docs/CASE_TASKS.md`). UI
`PropertiesPanel` con flujo guiado (uso → período → ingreso → gasto → soporte/asignación →
decisión humana) y modo avanzado con razones y fuentes normativas. E2E con capturas
desktop/móvil. Fundamento normativo: ET art. 107 (causalidad/necesidad/proporcionalidad), ET art.
743 (idoneidad de la prueba), Decreto 1625 de 2016 art. 1.3.1.13.5 + Oficio DIAN 912878 de 2021
(administración de PH = aporte a capital, nunca facturable). Ver
`docs/PROPERTY_INCOME_EXPENSES_2025.md` para el detalle completo.

**Decisión de alcance explícita**: esta fase **no** cablea ningún valor de `PropertyExpense`/
`RentalIncome` a ninguna casilla del Formulario 210 (ni la 58 "ingresos brutos de rentas de
capital" ni la 60 "costos y deducciones procedentes de rentas de capital", ambas ya existentes en
el ruleset pero sin fórmula que las alimente). El módulo queda completamente autocontenido; el
impacto preliminar mostrado en el panel es informativo, no se persiste en `Form210Draft`. Queda
para una futura fase — ver limitación completa en `docs/PROPERTY_INCOME_EXPENSES_2025.md`.

## Sprint 2.4 — Fase G.1 (Realistic Synthetic Tax Case)

Reemplaza el sample mínimo de humo (`samples/generate-sample.mjs`, un único archivo exógeno sin
relación con ninguna fase posterior a Sprint 2.3) por un "golden synthetic case" completamente
ficticio: expediente AG 2025 coherente entre exógena, 6 documentos textuales (Form 220,
certificado tributario consolidado, cesantías, vivienda, predial, administración PH), declaración
anterior AG 2024, reporte DIAN de facturación electrónica, un dependiente y un inmueble arrendado.
Diseñado deliberadamente para exercitar los siete escenarios de reconciliación (exact/rounding/
minor/contradicción semántica/document-only/exógena-only/ambigüedad) contra el pipeline REAL, sin
mocks. Nuevo `apps/web/src/lib/goldenCase.ts` (builder puro) + `goldenCase.test.ts` (24 tests,
incluye guardarraíl permanente de privacidad que impide que cualquier identificador de los
benchmarks reales de Fase F/F.1 reaparezca aquí). Human Review Burden deliberadamente modesto
(techo `< 20`), lejos de las ~88 decisiones del benchmark real. Sin integración nueva al
Formulario 210 (respeta el límite ya documentado de Fase G) y sin E2E nuevo (no existe mecanismo
de UI "Cargar caso de ejemplo" en la aplicación hoy). Ver `docs/SYNTHETIC_SAMPLE_CASE.md`.

## Sprint 2.4 — Fase H (Salud complementaria y medicina prepagada)

Modela pagos de medicina prepagada, seguros de salud y planes adicionales de salud elegibles bajo
el art. 387 ET, separados completamente de aportes obligatorios a EPS y gastos médicos directos.
Auditoría normativa verificó literalmente que el límite de 16 UVT mensuales es un único tope
AGREGADO compartido entre medicina prepagada y seguros de salud (nunca separado por concepto, ni
por proveedor, ni por beneficiario); el equivalente anual de 192 UVT se deriva en código, nunca es
la regla primaria. Nuevo `packages/domain/src/complementaryHealth.ts` (`ComplementaryHealthPayment`,
ocho estados de elegibilidad, nunca booleano), dos motores puros en `@nexus-tax/aegis-rules`
(validación individual + tope mensual agregado con reparto proporcional entre proveedores del mismo
mes), adaptador documental `co.complementary-health.generic` (2 reglas independientes, nunca
`mensual × 12`), Dexie v17, repositorio con recálculo agregado de todo el expediente, 6 tipos de
tarea nuevos, integración a la casilla 39 del Formulario 210 (SUMADA, no fusionada, con la
deducción de dependientes del mismo artículo — ninguna casilla nueva inventada), UI
`ComplementaryHealthPanel` con explicación mes a mes en lenguaje simple, E2E con capturas
desktop/móvil, y extensión del golden synthetic case de Fase G.1 con dos meses (uno bajo el tope,
otro que lo supera) y un beneficiario dependiente vinculado explícitamente. Ver
`docs/COMPLEMENTARY_HEALTH_2025.md`.

