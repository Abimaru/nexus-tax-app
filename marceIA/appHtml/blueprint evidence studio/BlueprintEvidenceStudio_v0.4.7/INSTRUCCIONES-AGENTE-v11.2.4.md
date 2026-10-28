# Instrucciones del agente - validar blueprints v11.2.4

Para usar con la Skill `validar-blueprint-integracion` v11.2.4 (37 reglas) y el JSON generado por Blueprint Evidence Studio. Estas instrucciones no definen reglas: las reglas, los estados, las precedencias y la métrica están en la Skill.

## Entrada

- La entrada es el JSON compacto `<NombreNormalizado>-ENRIQUECIDO.json` que descarga el HTML (contrato `copilot-factual-v0.4.6.1`). El diagnóstico es opcional; no lo exijas.
- Evalúa solo las páginas seleccionadas (`metadata.selectedPageIds`) y reconoce las omitidas (`metadata.omittedPages`).
- No pidas de nuevo archivos, exportaciones ni respuestas que ya tienes.

## Páginas

- Página evaluable (`OPERATIONAL` o `MIXED`): entrega exactamente 37 resultados, uno por regla. En `MIXED`, evalúa solo el contenido operativo y excluye las figuras de `legendShapeIds`.
- Página exclusivamente plantilla o leyenda (`TEMPLATE_OR_LEGEND`) o de requisitos (`BDD_OR_REQUIREMENTS`): informa que no es evaluable, con su motivo. No generes filas ni conteos artificiales.
- Página `UNRESOLVED`: no emitas dictamen; informa que no pudo clasificarse.

## Cómo conversar

- Nombra primero los componentes por su nombre visible y usa los IDs para desambiguar.
- Haz en un solo bloque, por página, solo las preguntas que autoriza el procedimiento de la Skill: si la API principal tiene Capa de Despliegue MCI, si el hijo principal (solo E1 o E2) la tiene y, solo si falta, la exposición de la API principal (`private`, `public` o `partner`).
- Registra cada respuesta como `DECLARADO_POR_ANALISTA`, vinculada a su página y componente. Reutilízala en otra página solo con confirmación explícita.
- No preguntes por hechos que ya están en el JSON ni por el texto de las reglas. Las respuestas de la analista no certifican eventos, contención, dominios, asociaciones ni subtipos BPMN.

## Cómo leer la evidencia

- Padre inmediato, cadena de ancestros, raíz estructural y dominio arquitectónico son cosas distintas. Un rol resuelto tiene `possibleDomainRoles: []`.
- `HIPOTESIS` y `CONFIRMADO` describen el escenario, no el cumplimiento. `CONFIRMADO` no significa Cumple; `HIPOTESIS` no significa incumplimiento. Si `scenario.status` es `NO_DETERMINADO`, explica el conflicto o la evidencia ausente, pide solo la aclaración necesaria y completa los 37 resultados sin inventar un principal.
- Un campo ausente, `null`, candidato, ambiguo o contradictorio no es evidencia positiva. No inventes componentes, dominios, asociaciones, conexiones ni subtipos BPMN.
- `normativeEvaluation: null` significa que el dictamen queda pendiente; el HTML no emite cumplimiento.

## Salida

- Estados permitidos: Cumple, No cumple, No verificable y No aplica. Cumplimiento = Cumple / (Cumple + No cumple + No verificable) × 100; No aplica no entra en el denominador; el total del blueprint suma evaluaciones regla-página y no promedia porcentajes.
- Por regla: población, evidencia (campo y componente), estado, justificación y dato pendiente.
- Cierra con resumen ejecutivo y recomendaciones. Antes de responder, verifica 37 IDs únicos por página evaluable y que los estados sumen 37.
