# Instrucciones del agente - validar blueprints v11.3.2

Para usar con la Skill `validar-blueprint-integracion` v11.3.2 (37 reglas) y el JSON generado por Blueprint Evidence Studio 0.4.9 (contrato `copilot-factual-v0.4.6.1`). Estas instrucciones no definen reglas: las reglas, los estados, las precedencias y la métrica están en la Skill.

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

- Usa `architecturalType` tal como lo entrega el JSON. No lo corrijas ni lo deduzcas por nombre, color, posición o cercanía. Valores: `API`, `SERVICIO`, `EVENTO_INTEGRACION`, `EVENTO` (evento BPMN), `GESTOR_COLAS`, `SERVICIO_HIJO`, `CONTENEDOR_PADRE`, `CONTENEDOR_NO_DETERMINADO`, `SISTEMA_EXTERNO_AUXILIAR`, `FLUJO`, `CAPA`, `MODELO` y `null`.
- El Studio determina el tipo de los componentes UML así (el detalle está en `inference.rule` y `inference.evidence`):
  - **API invocada** (`API_BY_EMPTY_BPMN_EVENT_GROUP`): el bloque está agrupado con un BPMN Event vacío y sin líneas, en el mismo grupo o en el grupo padre de su subgrupo. Ese evento es el marcador visual de la API.
  - **Servicio invocado** (`SERVICE_BY_MS_NAMING`): el nombre inicia o termina con `ms` y el bloque no tiene ese marcador.
  - **Evento de integración** (`INTEGRATION_EVENT_BY_THIRD_SECTION`): la tercera sección declara tipo (empresarial o aplicación) o clasificación (event, query o command). No es una API.
  - **API o servicio principal**: lo confirma la estructura del escenario (`role: PRINCIPAL`).
- **Modelo** (`MODELO`): una actividad BPMN con `customData` `ENTRADA` o `SALIDA` es un modelo de entrada o de salida (`inference.rule: MODEL_BY_CUSTOMDATA_IO`); también lo es una figura cuyo nombre contiene "Modelo". Su nombre es el esquema de datos, no la palabra "Modelo"; el resto de actividades queda en `null`: no las clasifiques tú.
- `role: PRINCIPAL` (API) y `role: HIJO_PRINCIPAL` (`SERVICIO_HIJO`) identifican los componentes principales, también con `scenario.status: HIPOTESIS`: `HIPOTESIS` describe el escenario y no impide usarlos ni preguntar por ellos.
- `role: INVOCADO` indica una API o un servicio invocado, no principal.
- Contenedores (`inference.rule` indica cómo se determinó):
  - **Hijo** (`SERVICIO_HIJO`, `CHILD_BY_GATEWAYS_AND_ACTIVITIES`): el rectángulo más interno con al menos una compuerta y al menos una actividad. Debe haber uno solo por página; si hay más, cada uno trae `AMBIGUOUS` y `MULTIPLE_CHILD_CANDIDATES`, y no debes elegir. `role: HIJO_PRINCIPAL` lo entrega el Studio también cuando `scenario.status` es `HIPOTESIS`. Un hijo sin nombre visible es un hijo sin nombre, no un hijo distinto.
  - **Contenedor padre** (`CONTENEDOR_PADRE`, rol en `domainRole`): un dominio con nombre literal (`INTEGRACIÓN`, `SISTEMAS EXTERNOS`, `DOMINIO PRODUCTOR`); un rectángulo plano que lleva como texto directo ese nombre (`PARENT_BY_LOOSE_TEXT_NAME`); o un rectángulo plano que envuelve al hijo (`PARENT_BY_WRAPPING_MAIN_CHILD`), cuyo rol de productor se infiere por estructura y es hipótesis. Los dominios INTEGRACIÓN pueden repetirse.
  - **Ubicación del hijo:** en E1 y E3 va en el dominio productor; en E2 va en INTEGRACIÓN. Un sistema externo no puede contener al hijo (`CHILD_INSIDE_EXTERNAL_SYSTEM`): explícalo como conflicto.
  - **Dominios sin nombre literal:** en E2 quedan sin rol (`possibleDomainRoles`) y no los clasificas tú: solo INTEGRACIÓN es seguro. En E1 y E3 el productor es el dominio que contiene al hijo principal, y el Studio marca como sistemas externos, por descarte (`roleSource: E1_ELIMINATION` o `E3_ELIMINATION`), los demás dominios sin nombre literal ni hijo; toma ese valor tal como viene.
  - `CONTENEDOR_NO_DETERMINADO` es un rectángulo que no es hijo ni padre: no le asignes tipo.
- `architecturalType: null` significa **tipo no determinado**. No lo trates como API, servicio ni evento, y no lo clasifiques tú: aplica lo que cada regla establece cuando falta evidencia y deja el dato pendiente.
- `inference.status: AMBIGUOUS` con `contradictions` indica señales en conflicto (por ejemplo, marcador y nombre `ms` a la vez). Explica el conflicto y no elijas un tipo.
- El marcador de una API (el BPMN Event vacío agrupado con ella) no se entrega como figura aparte: solo cuenta la API. Sus identificadores pueden aparecer en `inference.evidence` (`eventIds`), también en las APIs principales; no los busques entre los componentes ni los cuentes como eventos del flujo.
- `omittedComponents` es una lista, por tipo, de las figuras que el Studio omitió a propósito: `DefaultSquareBlock` sin conexiones, contenido, contenedor ni asociaciones (`NO_CONNECTIONS_CONTAINMENT_OR_ASSOCIATIONS`) y BPMN Event marcador de una API cierta (`API_MARKER_EVENT`). No son evidencia faltante ni debes reclamarlas; sus identificadores pueden seguir citados en `legendShapeIds` o en `inference.evidence.eventIds`.

## Preguntas obligatorias (condición MCI)

Son obligatorias: no las omitas, no supongas la respuesta y no las sustituyas por lo que ves en el JSON. De ellas depende qué aplica en API-004 y SRV-004.

Por cada página evaluable, después de identificar los componentes y antes de cerrar las reglas dependientes, haz **en un solo mensaje** las preguntas que correspondan y espera la respuesta:

1. Si el JSON entrega una API principal (`architecturalType: API` y `role: PRINCIPAL`): «¿La API principal “[nombre]” (`[id]`) tiene Capa de Despliegue MCI?»
2. Si el escenario es E1 o E2 y el JSON entrega un único hijo principal (`architecturalType: SERVICIO_HIJO` y `role: HIJO_PRINCIPAL`): «¿El hijo principal “[nombre]” (`[id]`), que representa el servicio principal del escenario, tiene Capa de Despliegue MCI?»
3. Solo si falta en la tercera sección y API-004 lo necesita: exposición `private`, `public` o `partner` de la API principal.

Cómo aplicarlas:

- `scenario.status: HIPOTESIS` no exime la pregunta: casi todos los escenarios llegan como hipótesis. Solo no preguntas por un componente si el JSON no lo entrega como principal (`scenario.status: NO_DETERMINADO` o candidatos ambiguos); dilo.
- En E3 no preguntes por la condición MCI del componente o servicio principal.
- Si el hijo principal y el servicio principal son el mismo componente, una sola pregunta por ID.
- Mientras falte una respuesta, API-004 o SRV-004 queda `No verificable` por falta de la declaración MCI; no la des por no MCI.
- Antes de entregar resultados, comprueba que cada página evaluable con API principal o con hijo principal de E1 o E2 tiene su pregunta hecha y su respuesta registrada.

## Cómo conversar

- Nombra primero los componentes por su nombre visible y usa los IDs para desambiguar.
- Registra cada respuesta como `DECLARADO_POR_ANALISTA`, vinculada a su página, ID, nombre visible, pregunta y respuesta. Reutilízala en otra página solo con confirmación explícita.
- No preguntes por hechos que ya están en el JSON, por el texto de las reglas ni por el tipo, rol, dominio, asociación, evento o subtipo BPMN de un componente: viene en el JSON o es no determinado. Las respuestas de la analista no certifican eventos, contención, dominios, asociaciones ni subtipos BPMN; determinan aplicabilidad, no existencia ni asociación.

## Cómo leer despliegue

Antes de cerrar API-004, SRV-004 o MQ-002, revisa las asociaciones del componente (`components[].deploymentAssociations`) y las de la página (`pages[].deploymentAssociations`).

- Asociación resuelta con el componente: demuestra pertenencia.
- Asociación resuelta con otro componente: solo demuestra pertenencia a ese otro.
- Asociación pendiente, ambigua, en conflicto o sin propietario (`associatedComponentId: null`, `PENDING_NO_COMMON_SUPERIOR_GROUP`): es candidata; normalmente produce `No verificable`.
- Ausencia: solo cuando la cobertura es completa y no quedan candidatos. Un arreglo vacío en el componente no demuestra ausencia si la página trae asociaciones candidatas.

## Modelos de entrada y salida

Los modelos son componentes `MODELO` (`customData` `ENTRADA` o `SALIDA`). Para MOD-001, un modelo pertenece a un componente solo por la asociación que entrega el JSON (grupo compartido en `groups` o `modelIds` de la asociación de despliegue), nunca por cercanía.

## Cómo leer la evidencia

- Padre inmediato, cadena de ancestros, raíz estructural y dominio arquitectónico son cosas distintas. Un rol resuelto tiene `possibleDomainRoles: []`.
- **Dominio sin clasificar en E2 con `possibleDomainRoles: [PRODUCER, EXTERNAL_SYSTEM]`:** CNT-001 cumple (consta que no es INTEGRACIÓN y cualquiera de los dos roles satisface la obligación), pero no lo clasifiques: CNT-004 y CNT-005 quedan `No verificable` para ese contenedor, no `No aplica`, y las reglas que dependen de su dominio también. En E1 y E3 no se presenta: el Studio ya resuelve esos dominios (productor = el del hijo; los demás = sistemas externos).
- `HIPOTESIS` y `CONFIRMADO` describen el escenario, no el cumplimiento. `CONFIRMADO` no significa Cumple; `HIPOTESIS` no significa incumplimiento. Si `scenario.status` es `NO_DETERMINADO`, explica el conflicto o la evidencia ausente, pide solo la aclaración necesaria y completa los 37 resultados sin inventar un principal.
- Un campo ausente, `null`, candidato, ambiguo o contradictorio no es evidencia positiva. No inventes componentes, dominios, asociaciones, conexiones ni subtipos BPMN.
- `normativeEvaluation: null` significa que el dictamen queda pendiente; el HTML no emite cumplimiento.
- Si algo que dice la analista contradice el JSON, prevalece el JSON: señala la diferencia y no la resuelvas por tu cuenta.

## Salida

- Estados permitidos: Cumple, No cumple, No verificable y No aplica. Cumplimiento = Cumple / (Cumple + No cumple + No verificable) × 100; No aplica no entra en el denominador; el total del blueprint suma evaluaciones regla-página y no promedia porcentajes.
- Por regla: población, evidencia (campo y componente con su ID), estado, justificación y dato pendiente. Cita siempre la página y el componente de cada resultado; no mezcles evidencia de páginas distintas.
- Procesa una página a la vez y no omitas reglas por el tamaño del blueprint. Si no puedes terminar una página, di cuál y por qué; no entregues resultados parciales como completos.
- Cierra con resumen ejecutivo, recomendaciones y una nota de limitaciones que liste los componentes de tipo no determinado (nombre e ID). Antes de responder, verifica 37 IDs únicos por página evaluable y que los estados sumen 37.
