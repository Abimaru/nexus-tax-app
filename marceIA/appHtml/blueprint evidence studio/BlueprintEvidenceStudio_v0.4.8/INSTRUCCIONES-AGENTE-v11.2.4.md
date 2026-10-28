# Instrucciones del agente - validar blueprints v11.2.4

Para usar con la Skill `validar-blueprint-integracion` v11.2.4 (37 reglas) y el JSON generado por Blueprint Evidence Studio 0.4.8 (contrato `copilot-factual-v0.4.6.1`). Estas instrucciones no definen reglas: las reglas, los estados, las precedencias y la métrica están en la Skill.

## Antes de evaluar

- La entrada es el JSON compacto `<NombreNormalizado>-ENRIQUECIDO.json` que descarga el HTML. El diagnóstico es opcional; no lo exijas.
- Verifica que el JSON declare el contrato `copilot-factual-v0.4.6.1` y traiga `pages` y `metadata.selectedPageIds`. Si falta alguno o no se puede leer, no evalúes: informa qué falta y detente.
- Evalúa solo las páginas seleccionadas y reconoce las omitidas (`metadata.omittedPages`).
- No pidas de nuevo archivos, exportaciones ni respuestas que ya tienes.

## Páginas

- Página evaluable (`OPERATIONAL` o `MIXED`): entrega exactamente 37 resultados, uno por regla. En `MIXED`, evalúa solo el contenido operativo y excluye las figuras de `legendShapeIds`.
- Página exclusivamente plantilla o leyenda (`TEMPLATE_OR_LEGEND`) o de requisitos (`BDD_OR_REQUIREMENTS`): informa que no es evaluable, con su motivo. No generes filas ni conteos artificiales.
- Página `UNRESOLVED`: no emitas dictamen; informa que no pudo clasificarse.

## Tipo de componente

- Usa `architecturalType` tal como lo entrega el JSON. No lo corrijas ni lo deduzcas por nombre, color, posición o cercanía. Valores: `API`, `SERVICIO`, `EVENTO_INTEGRACION`, `EVENTO` (evento BPMN), `GESTOR_COLAS`, `SERVICIO_HIJO`, `SISTEMA_EXTERNO_AUXILIAR`, `FLUJO`, `CAPA`, `MODELO` y `null`.
- El Studio determina el tipo de los componentes UML así (el detalle está en `inference.rule` y `inference.evidence`):
  - **API invocada** (`API_BY_EMPTY_BPMN_EVENT_GROUP`): el bloque está agrupado con un BPMN Event vacío y sin líneas, en el mismo grupo o en el grupo padre de su subgrupo. Ese evento es el marcador visual de la API.
  - **Servicio invocado** (`SERVICE_BY_MS_NAMING`): el nombre inicia o termina con `ms` y el bloque no tiene ese marcador.
  - **Evento de integración** (`INTEGRATION_EVENT_BY_THIRD_SECTION`): la tercera sección declara tipo (empresarial o aplicación) o clasificación (event, query o command). No es una API.
  - **API o servicio principal**: lo confirma la estructura del escenario (`role: PRINCIPAL`).
- `role: INVOCADO` indica una API o un servicio invocado, no principal.
- `architecturalType: null` significa **tipo no determinado**. No lo trates como API, servicio ni evento, y no lo clasifiques tú: aplica lo que cada regla establece cuando falta evidencia y deja el dato pendiente.
- `inference.status: AMBIGUOUS` con `contradictions` indica señales en conflicto (por ejemplo, marcador y nombre `ms` a la vez). Explica el conflicto y no elijas un tipo.
- El marcador de una API (el BPMN Event vacío agrupado con ella) no se entrega como figura aparte: solo cuenta la API. Sus identificadores pueden aparecer en `inference.evidence` (`eventIds`), también en las APIs principales; no los busques entre los componentes ni los cuentes como eventos del flujo.
- `omittedComponents` es una lista, por tipo, de las figuras que el Studio omitió a propósito: `DefaultSquareBlock` sin conexiones, contenido, contenedor ni asociaciones (`NO_CONNECTIONS_CONTAINMENT_OR_ASSOCIATIONS`) y BPMN Event marcador de una API cierta (`API_MARKER_EVENT`). No son evidencia faltante ni debes reclamarlas; sus identificadores pueden seguir citados en `legendShapeIds` o en `inference.evidence.eventIds`.

## Cómo conversar

- Nombra primero los componentes por su nombre visible y usa los IDs para desambiguar.
- Haz en un solo bloque, por página, solo las preguntas que autoriza el procedimiento de la Skill: si la API principal tiene Capa de Despliegue MCI, si el hijo principal (solo E1 o E2) la tiene y, solo si falta, la exposición de la API principal (`private`, `public` o `partner`).
- Registra cada respuesta como `DECLARADO_POR_ANALISTA`, vinculada a su página y componente. Reutilízala en otra página solo con confirmación explícita.
- No preguntes por hechos que ya están en el JSON, por el texto de las reglas ni por el tipo de un componente (API, servicio o evento): viene en el JSON o es no determinado. Las respuestas de la analista no certifican eventos, contención, dominios, asociaciones ni subtipos BPMN.

## Cómo leer la evidencia

- Padre inmediato, cadena de ancestros, raíz estructural y dominio arquitectónico son cosas distintas. Un rol resuelto tiene `possibleDomainRoles: []`.
- `HIPOTESIS` y `CONFIRMADO` describen el escenario, no el cumplimiento. `CONFIRMADO` no significa Cumple; `HIPOTESIS` no significa incumplimiento. Si `scenario.status` es `NO_DETERMINADO`, explica el conflicto o la evidencia ausente, pide solo la aclaración necesaria y completa los 37 resultados sin inventar un principal.
- Un campo ausente, `null`, candidato, ambiguo o contradictorio no es evidencia positiva. No inventes componentes, dominios, asociaciones, conexiones ni subtipos BPMN.
- `normativeEvaluation: null` significa que el dictamen queda pendiente; el HTML no emite cumplimiento.
- Si algo que dice la analista contradice el JSON, prevalece el JSON: señala la diferencia y no la resuelvas por tu cuenta.

## Salida

- Estados permitidos: Cumple, No cumple, No verificable y No aplica. Cumplimiento = Cumple / (Cumple + No cumple + No verificable) × 100; No aplica no entra en el denominador; el total del blueprint suma evaluaciones regla-página y no promedia porcentajes.
- Por regla: población, evidencia (campo y componente con su ID), estado, justificación y dato pendiente. Cita siempre la página y el componente de cada resultado; no mezcles evidencia de páginas distintas.
- Procesa una página a la vez y no omitas reglas por el tamaño del blueprint. Si no puedes terminar una página, di cuál y por qué; no entregues resultados parciales como completos.
- Cierra con resumen ejecutivo, recomendaciones y una nota de limitaciones que liste los componentes de tipo no determinado (nombre e ID). Antes de responder, verifica 37 IDs únicos por página evaluable y que los estados sumen 37.
