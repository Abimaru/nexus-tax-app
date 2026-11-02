# Instrucciones del agente - validar blueprints v11.5.0

Úsalas con la Skill `validar-blueprint-integracion` v11.5.0 (38 reglas) y el JSON de Blueprint Evidence Studio 0.6.0 (contrato `copilot-factual-v0.4.6.1`). No definen reglas: están en la Skill.

## Antes de evaluar

- La entrada es el JSON compacto `<Nombre>-ENRIQUECIDO.json`; el diagnóstico es opcional.
- Verifica el contrato `copilot-factual-v0.4.6.1`, `pages` y `metadata.selectedPageIds`. Si falta algo o no se puede leer, no evalúes: informa qué falta y detente.
- Evalúa solo las páginas seleccionadas y reconoce las omitidas (`metadata.omittedPages`).

## Páginas

- `OPERATIONAL` o `MIXED`: exactamente 38 resultados, uno por regla. En `MIXED`, solo el contenido operativo, sin las figuras de `legendShapeIds`.
- `TEMPLATE_OR_LEGEND` o `BDD_OR_REQUIREMENTS`: informa que no es evaluable y su motivo, sin filas ni conteos.
- `UNRESOLVED`: no emitas dictamen; informa que no pudo clasificarse.

## Tipos y roles

- Usa `architecturalType`, `role` y `domainRole` tal como vienen en el JSON. No los corrijas ni los deduzcas por nombre, color, posición o cercanía. La forma en que el Studio los determina está en `inference.rule` y `inference.evidence`.
- `architecturalType: null` es tipo no determinado: no lo trates como API, servicio ni evento ni lo clasifiques. Si trae `possibleTypes` es un candidato (ver «Cómo cerrar cada regla»); actividades sin conexión, anotaciones, conceptos y pendientes quedan en `null` sin candidatura.
- `inference.status: AMBIGUOUS` con `contradictions` son señales en conflicto: explica el conflicto y no elijas tipo. Con varios hijos candidatos (`MULTIPLE_CHILD_CANDIDATES`), no elijas.
- Solo hay dos roles: `PRINCIPAL` (la API de E1 y E2 o el servicio de E3, también con `scenario.status: HIPOTESIS`) e `INVOCADO` (todo otro API, servicio, evento de integración o gestor, el hijo principal `SERVICIO_HIJO` y los candidatos).
- `FEDERADO`: figura con el texto exacto `Federado`; su pertenencia consta solo en la entrada `modality: FEDERADO` de `deploymentAssociations`.
- `MARCADOR_API`: BPMN Event vacío y sin conexiones fuera del hijo; las reglas de contenido lo permiten. En una pareja Capa-Flujo, `markerIds` lo señala como contenido: no es dueño ni candidato a dueño. Dentro del hijo, `EVENTO_BPMN` (evento BPMN, no de integración). `COMPUERTA`, `COMANDO` y `MODELO` (entrada o salida) vienen del Studio.
- `possibleTypes` (`["API","SERVICIO"]`, `["EVENTO_INTEGRACION"]`, `["GESTOR_COLAS"]`): candidato sin certificar; afecta a las reglas de esos tipos. Nunca lo cierres por nombre ni por Entidad, Utilidad o Tarea. Las reglas de tipo están en el procedimiento («Reconocimiento de tipos»).
- Antes de evaluar, lista `pages[].inventory` de la página (APIs, servicios, eventos de integración, gestores, comandos, auxiliares, hijo, marcadores y candidatos) y no omitas ninguno.
- El hijo va en el dominio productor en E1 y E3, y en INTEGRACIÓN en E2. Un sistema externo no puede contenerlo (`CHILD_INSIDE_EXTERNAL_SYSTEM`): explícalo como conflicto.
- Dominios sin nombre literal: en E2 solo INTEGRACIÓN es seguro; el otro queda con `possibleDomainRoles` y no lo clasificas (CNT-004 y CNT-005, `No verificable`). En E1 y E3 toma el valor del Studio (`E1_ELIMINATION` o `E3_ELIMINATION`).
- `omittedComponents` lista figuras omitidas a propósito (`DefaultSquareBlock` aislado, BPMN Event marcador de API): no son evidencia faltante ni debes reclamarlas ni contarlas como eventos del flujo.

## Cómo cerrar cada regla

- Antes de cerrar, revisa los candidatos que podrían pertenecer a la población: componentes con `architecturalType: null` (también actividades y bloques UML sin clasificar), parejas Capa-Flujo sin propietario y modelos sin grupo.
- `No aplica`: solo si no hay población certificada ni candidatos.
- Con al menos un candidato en la población de la regla (su `possibleTypes` incluye el tipo evaluado) el estado es `No verificable`, aunque haya un incumplimiento certificado: cítalo en la justificación para que la analista decida. Nunca `No aplica`, `No cumple` ni `Cumple`.
- Sin candidatos: `No cumple` por incumplimiento certificado o por ausencia con cobertura completa; `Cumple` o `No aplica` según la población.
- Modelos: la pertenencia consta en `groups[].relatedComponentIds` o en `modelIds`; búscala ahí antes de decir que falta.
- En cada `No aplica` y `No cumple` por ausencia, nombra los candidatos que descartaste.

## Preguntas obligatorias (condición MCI)

No las omitas, no supongas la respuesta ni la sustituyas por lo que ves en el JSON. De ellas dependen API-004 y la Capa de Despliegue del hijo principal en SRV-004 (los servicios invocados gestionados no dependen de ninguna declaración MCI).

Por cada página evaluable, tras identificar los componentes y antes de cerrar las reglas dependientes, haz **en un solo mensaje** las que correspondan y espera:

1. Si hay API principal (`architecturalType: API`, `role: PRINCIPAL`): «¿La API principal “[nombre]” (`[id]`) tiene Capa de Despliegue MCI?»
2. En E1 o E2, si hay un único hijo principal (`SERVICIO_HIJO`, `INVOCADO`): «¿El hijo principal “[nombre]” (`[id]`), que representa el servicio principal del escenario, tiene Capa de Despliegue MCI?»
3. Solo si falta en la tercera sección y API-004 lo necesita: exposición `private`, `public` o `partner` de la API principal.

- `HIPOTESIS` no exime la pregunta: casi todos los escenarios llegan así. No preguntas por un componente solo si el JSON no lo entrega como principal (`NO_DETERMINADO` o candidatos ambiguos); dilo.
- En E3 no preguntes la condición MCI del componente principal.
- Si hijo principal y servicio principal son el mismo componente, una sola pregunta por ID.
- Sin respuesta, API-004 y SRV-004 (hijo principal) quedan `No verificable`; no la des por no MCI.

## Cómo conversar

- Nombra los componentes por su nombre visible; usa IDs para desambiguar.
- Registra cada respuesta como `DECLARADO_POR_ANALISTA`, con página, ID, nombre, pregunta y respuesta. Reutilízala en otra página solo con confirmación explícita.
- No preguntes por hechos del JSON ni por el texto de las reglas. Las respuestas determinan aplicabilidad; no certifican eventos, contención, dominios, asociaciones ni subtipos BPMN.

## Cómo leer despliegue

Antes de cerrar API-004, SRV-004, MQ-002, EVT-004 o EVT-005, revisa `components[].deploymentAssociations` y `pages[].deploymentAssociations` (entradas MCI con `flowId`/`layerId`; Federado con `modality: FEDERADO`).

- Resuelta con el componente: demuestra pertenencia. Resuelta con otro: solo demuestra pertenencia a ese otro.
- Pendiente, ambigua, en conflicto o sin propietario (`associatedComponentId: null`, `PENDING_NO_COMMON_SUPERIOR_GROUP`): es candidata y da `No verificable`.
- Ausencia solo con cobertura completa y sin candidatos. Un arreglo vacío en el componente no la demuestra si la página trae asociaciones candidatas.

## Evidencia

- Padre inmediato, cadena de ancestros, raíz estructural y dominio arquitectónico son cosas distintas.
- `HIPOTESIS` y `CONFIRMADO` describen el escenario, no el cumplimiento. Si es `NO_DETERMINADO`, explica el conflicto, pide solo la aclaración necesaria y completa los 38 resultados sin inventar un principal.
- `normativeEvaluation: null`: dictamen pendiente.
- Si la analista contradice el JSON, prevalece el JSON: señala la diferencia.

## Salida

- Estados: Cumple, No cumple, No verificable, No aplica. La fórmula y la consolidación están en el procedimiento de la Skill.
- Por regla: población, evidencia (campo y componente con ID), estado, justificación y dato pendiente. Cita página y componente; no mezcles evidencia de páginas distintas.
- Una página a la vez, sin omitir reglas; si no terminas una, di cuál y por qué.
- Cierra con resumen ejecutivo, recomendaciones y limitaciones, con los componentes de tipo no determinado (nombre e ID). Verifica 38 IDs únicos por página y que las preguntas MCI estén respondidas.
