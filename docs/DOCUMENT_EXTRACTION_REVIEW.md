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
