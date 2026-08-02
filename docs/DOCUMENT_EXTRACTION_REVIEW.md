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

Las acciones son confirmar y crear hecho, solo informativo, duplicado, rechazar
y restaurar propuesta. Una corrección de categoría o superior al 5 % exige
observación. Confirmar crea un `DocumentFact` `assisted`; rechazar o clasificar
como informativo no afecta la matriz.

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
