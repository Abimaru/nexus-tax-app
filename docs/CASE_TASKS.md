# Tareas accionables del expediente

## Modelo

`CaseTask` representa un pendiente derivado y trazable. Incluye origen, prioridad, estado, bloqueo,
destino seguro dentro del flujo, referencias opcionales a entidad/documento/requisito/candidato/
conciliación/matriz, regla y evidencia.

Los estados son `pending`, `in_progress`, `resolved`, `discarded` y `blocked`. Dexie v9 persiste la
bandeja. La sincronización conserva estados gestionados por el usuario y marca como resueltas las
tareas que dejan de derivarse, en vez de borrarlas.

## Derivación

Se generan tareas para candidatos pendientes, requisitos sin cobertura o parciales,
conciliaciones/matriz abiertas e IVA sin confirmar. La lista se ordena por prioridad y luego por
título para mantener determinismo.

## Navegación

`Pendientes del expediente` abre el destino exacto de la tarea. El siguiente paso recomendado usa la
tarea activa de mayor prioridad, muestra cuántas quedan y coloca foco en un contexto resaltado. El
retorno a la bandeja no usa datos sensibles en la URL.
