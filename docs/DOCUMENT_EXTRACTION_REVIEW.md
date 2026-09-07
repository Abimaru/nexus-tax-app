# Revisión de extracción documental

## Flujo del analista

Desde **Organización → Documentos**, el usuario selecciona un PDF, decide si
conservarlo y activa “Analizar PDF”. La advertencia previa dice: “El PDF se
leerá únicamente en este navegador.” Al terminar se abre **Revisión de
extracción**.

La cabecera muestra documento, ejecución, páginas, estado, clasificación,
confianza y señales. Puede corregirse el tipo y, si el binario sigue local,
reprocesarse con contraseña temporal. Una ejecución nueva no borra decisiones
anteriores.

## Candidato

Cada tarjeta distingue:

- valor extraído inmutable;
- evidencia breve, página, etiqueta, regla y adaptador;
- valor final y categoría editables;
- entidad, producto, requisito y registro exógeno relacionados;
- observación y confianza expresada en palabras.

Las acciones son confirmar y crear hecho, solo informativo, duplicado y
rechazar. Al descartar una propuesta, desaparece inmediatamente de la revisión
activa. La sección plegable **Ver descartados** conserva la trazabilidad y
permite restaurarla; los candidatos obsoletos de una ejecución anterior son de
solo lectura. Una corrección de categoría o superior al 5 % exige observación.
Confirmar crea un `DocumentFact` `assisted`; rechazar o clasificar como
informativo no afecta la matriz.

Cada nueva carga genera su propia sesión y muestra únicamente los candidatos de
ese documento. Si el extractor reconoce filas o secciones de producto, la
cabecera enumera **Productos detectados** y cada candidato conserva la etiqueta
original. La asociación con un producto ya registrado es sugerida por tipo,
etiqueta y entidad, pero sigue siendo editable antes de confirmar.

## Después de confirmar

La acción **Revisar conciliación** conduce a las sugerencias documentales contra
exógena. El analista confirma la conciliación; solo entonces una fuente
provisional puede pasar a respaldada, contradicha o no comparable. El valor no
se suma dos veces si ya estaba provisionalmente incluido.

## Accesibilidad y responsive

La confianza incluye texto, no depende del color. Controles nativos mantienen
teclado y foco; botones tienen nombres de acción. Las grillas colapsan en móvil,
no deben crear desplazamiento horizontal y siguen los tokens claro/oscuro. El
quality gate se valida con capturas sintéticas a 1280 y 390 px, además de zoom y
`prefers-reduced-motion`.

## Revisión 2.1.1

La vista inicia en pendientes y permite localizar cualquier candidato mediante estado, confianza,
página, producto y categoría. La paginación admite 10, 20, 50 o 100 tarjetas y el historial de
ejecuciones anteriores es consultable.

Rechazar exige un motivo estructurado; `otro` exige nota. Las acciones múltiples permiten rechazar,
informar, duplicar, asociar entidad/producto o restaurar tras confirmación de impacto. Nunca existe
confirmación tributaria masiva. Restaurar conserva la cadena de decisiones.

## Candidatos manuales del laboratorio (Sprint 2.2)

Desde el laboratorio documental (ver [OCR local](LOCAL_OCR.md)) el analista puede crear un candidato a partir de
texto nativo o de OCR de una página. Llega a esta misma revisión con `adapterId: 'manual.lab'`
(identificable como estrategia distinta de los adaptadores automáticos), categoría/naturaleza
`unclassified` y tratamiento `requires_review` por defecto: pasa por exactamente el mismo flujo de
confirmar/corregir/rechazar que un candidato automático, nunca alimenta la matriz por sí solo.

## Revisión guiada (Sprint 2.4, Fase E + E.1)

Desde Sprint 2.4, Fase E, `organizacion/revision-documental` muestra por defecto
**`EvidenceReviewPanel`** en vez de esta revisión detallada: un resumen en lenguaje simple
("Encontramos N valores relevantes. M coinciden con la exógena.") con pocas decisiones humanas
agrupadas por estado (coinciden / probables / necesitan tu decisión / datos que faltan / posibles
valores nuevos), confirmación en bloque acotada a coincidencias sin ambigüedad ni anomalías,
resolución de ambigüedad eligiendo el valor correcto, y captura manual guiada cuando la exógena
espera un valor sin ningún candidato aceptable.

Esta revisión detallada (`DocumentExtractionReviewPanel`) **no desaparece**: sigue completa,
sin cambios de comportamiento, detrás del interruptor "Ver otros datos detectados" como "modo
avanzado". La revisión guiada reutiliza exactamente las mismas funciones de persistencia
(`reviewDocumentCandidate`, `savePreliminaryReconciliation`) a través de nuevos envoltorios
(`confirmEvidenceMatch`, `createGuidedManualCapture`): no existe un segundo mecanismo de
conciliación ni riesgo de doble conteo.

**Cierre de Fase E.1**: desde este cierre, el clasificador de evidencia numérica también decide
qué candidatos se crean en primer lugar (no solo qué se muestra en la revisión guiada): un NIT,
número de cuenta, resolución, año o porcentaje ya no aparece como candidato monetario en NINGUNA
de las dos vistas (guiada o avanzada), aunque su formato numérico se pareciera a un monto. Sigue
disponible como evidencia inspeccionable (metadatos de la sesión), pero nunca como candidato falso
en la revisión. Ver `docs/EVIDENCE_MATCHING.md` para el detalle completo.

## Defensa semántica y vivienda (Sprint 2.4, Fase F.2)

Un `exact_match`/`rounding_match` con contradicción semántica (p. ej. el texto del candidato
describe una retención, pero se comparó como ingreso) se degrada automáticamente a "probable
coincidencia" en el grupo **Probables coincidencias**, nunca en **Coinciden con la exógena** ni en
la confirmación en bloque; su razón explica el problema en lenguaje humano ("El monto coincide,
pero el certificado parece describir…"), nunca jerga técnica ni un score. El candidato sigue
visible y puede confirmarse manualmente si el analista, tras revisarlo, considera que sí
corresponde.

Un candidato de intereses de vivienda (`proposedCategory: 'housing_interest'`) sin ninguna
coincidencia exógena aparece en **Posibles valores nuevos** con un título ("Certificado de
vivienda (evidencia propia)") y una razón distintos ("Este beneficio normalmente se sustenta con
el certificado de la entidad. No necesitamos una coincidencia en exógena para conservarlo como
evidencia."), nunca el genérico "sin relación con la exógena" — la ausencia de match no implica
error para este tipo de evidencia (ver `docs/EVIDENCE_MATCHING.md` §Fase F.2). Ver
`docs/CASE_TASKS.md` para el fallback guiado cuando ni siquiera se detecta un candidato de
intereses.

## Unificación numérica, cobertura y routing (Sprint 2.4, Fase F.3)

La revisión guiada y el panel de conciliaciones (`ReconciliationsPanel`) ya comparten la misma
política numérica (`evaluateNumericReconciliation`) para redondeo/diferencia menor — ver
`docs/EVIDENCE_MATCHING.md` §Fase F.3. `ReconciliationsPanel` también respeta ahora el gate
semántico de Fase F.2: una sugerencia de conciliación cuyo hecho documental contradice
semánticamente la categoría del registro exógeno comparado nunca se marca "segura para confirmar",
con el mismo copy humano ("El valor coincide, pero el concepto no").

Cuando un documento se enruta como declaración anterior o extracto bancario transaccional
(`decideDocumentRouting`, §13-§15), la revisión guiada no muestra candidatos para ese documento —
el motivo se explica en modo avanzado a través de un `DocumentExtractionFinding` con
`code: 'requires_specialized_route'`, nunca como un error silencioso.
