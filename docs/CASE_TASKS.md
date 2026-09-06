# Tareas accionables del expediente

## Modelo

`CaseTask` representa un pendiente derivado y trazable. Incluye origen, prioridad, estado, bloqueo,
destino seguro dentro del flujo, referencias opcionales a entidad/documento/página/sesión de
extracción/perfil/requisito/candidato/conciliación/matriz, regla y evidencia.

Los estados son `pending`, `in_progress`, `resolved`, `discarded` y `blocked`. Dexie v9 persiste la
bandeja. La sincronización conserva estados gestionados por el usuario y marca como resueltas las
tareas que dejan de derivarse, en vez de borrarlas.

## Derivación

Se generan tareas para candidatos pendientes, requisitos sin cobertura o parciales,
conciliaciones/matriz abiertas e IVA sin confirmar. Sprint 2.2 agrega páginas recomendadas para OCR,
contradicciones nativo/OCR, fallos recuperables y perfiles en borrador vinculados al expediente. La
lista se ordena por prioridad y luego por título para mantener determinismo.

## Navegación

`Pendientes del expediente` abre el destino exacto de la tarea. El siguiente paso recomendado usa la
tarea activa de mayor prioridad, muestra cuántas quedan y coloca foco en un contexto resaltado. Las
tareas OCR seleccionan automáticamente el documento y la página del laboratorio. El
retorno a la bandeja no usa datos sensibles en la URL.

## Prioridad y resolución en Sprint 2.3

Se agregan tareas de casillas incompletas y decisiones tributarias. El orden operativo es:
bloqueante alta, bloqueante media, no bloqueante alta, no bloqueante media y baja; luego título e
identificador para mantener determinismo.

El Centro de resolución consume la misma lista: ofrece alternativas compatibles, exige motivo,
conserva evidencia e historial y abre el destino exacto. Una decisión activa suprime el pendiente;
una restauración o reversión permite derivarlo nuevamente.

## Declaraciones anteriores (Sprint 2.4, Fase B1)

Cinco tipos nuevos con `source: 'prior_year_return'` y destino
`declaracion/declaraciones-anteriores`: identidad no coincidente (bloqueante),
casillas no reconocidas con confianza suficiente, dos declaraciones vigentes
para el mismo año sin indicar corrección, arrastre pendiente de confirmación
(anticipo o saldo a favor, incluida la pregunta de devolución/compensación) y
anomalía de escala frente al año anterior (nunca corrige el valor, solo
advierte). Se generan en `buildCaseTasks` a partir de las declaraciones y
candidatos de arrastre vigentes; la Revisión final ("¿Qué me falta?") las
muestra como cualquier otra tarea, con deep-link a la tarjeta exacta.

## Dependientes económicos (Sprint 2.4, Fase C)

Ocho tipos nuevos con `source: 'dependent'`, campo `dependentId` para
trazabilidad y destino `declaracion/beneficios-dependientes`: soporte
documental faltante o parcial, evaluación de elegibilidad pendiente de
revisión (`pending_review`/`requires_support`), evaluación marcada
`stale_due_to_rule_change` tras un cambio de reglas o del registro base,
elección de beneficio requerida cuando el contribuyente es independiente y un
dependiente califica para ambos beneficios (art. 387 y art. 336 num. 3), y
naturaleza de ingresos laborales sin confirmar (bloquea la resolución de
coexistencia). Se derivan en `buildCaseTasks` recorriendo `taxDependents`,
`dependentEvaluations` y `dependentsCaseContext` del expediente. Ver
`docs/DEPENDENTS_BENEFITS_2025.md` para el detalle normativo de cada
beneficio.
