# Blueprint Evidence Studio v0.3.8 — Exportación limpia para Copilot

## Problema abordado

La v0.3.7 enviaba al agente simultáneamente hechos extraídos, tablas derivadas y un escenario precalculado (`NO_DETERMINABLE`) capaz de contradecir las conexiones y la jerarquía. Algunas pertenencias CSV se promocionaban a `parentId`, mezclando contención con capas de despliegue.

## Qué cambió

- **Descargar JSON limpio para Copilot** es ahora la exportación principal. Un único archivo con `pages[]` y, por página: `evidence.components`, `groups`, `memberships`, `connections`, `associations`, `modelAssociations`, `semanticAttributes`, además de `reconciliation`.
- **Descargar diagnóstico completo** conserva la salida técnica anterior (con sus diagnósticos exploratorios) para depurar; NO se adjunta al agente.
- `DIRECT_CONTAINMENT` se deriva de `contains` del JSON; los vínculos CSV se conservan aparte como `CSV_DECLARED_MEMBERSHIP` y, cuando aplican, `DEPLOYMENT`.
- `customData` y texto por sección se conservan por ID. Una clasificación inferida queda marcada `nonNormative:true`.
- Sin conclusiones precalculadas de escenario, sin `resultMatrix` y sin colores SVG globales en el JSON para Copilot.
- No alteramos las Skills ni la normativa. El anexo de instrucciones refuerza el proceso para todas las reglas, no solo E1/E2.

## Límites honestos

- `contains` del JSON puede declarar pertenencia amplia; si existen varios candidatos equivalentes se marcan como ambiguos. No se certifica contención geométrica.
- `endpoint1` y `endpoint2` se preservan; su orden no demuestra por sí solo la dirección semántica de flechas Lucidchart. `orientationStatus` mantiene ese límite.
- `LEGEND_CANDIDATE` no certifica por sí solo que una figura pertenece a la leyenda.
- La ausencia de subtipos BPMN visuales, modelos o asociaciones no es incumplimiento automático.
- La interfaz conserva secciones de diagnóstico exploratorio por retrocompatibilidad; usa únicamente **Descargar JSON limpio para Copilot** para el agente.

## Prueba automatizada realizada

La proyección del JSON multipágina v0.3.7 disponible produjo un JSON limpio con 2 páginas, 192 y 135 componentes, 63 y 35 conexiones, sin IDs de extremos ausentes y sin `NO_DETERMINABLE`. JavaScript pasó `node --check`. Falta prueba funcional directa en navegador de usuario.

## Flujo

1. Cargar un JSON de Lucidchart y el SVG por operación (hasta 10), CSV opcional.
2. Analizar y verificar jerarquías por página.
3. Descargar JSON **limpio para Copilot** y guardar PDF para el agente.
4. Subir normativa/Skill aplicable, JSON limpio y PDF según el límite de adjuntos.
5. Solicitar evaluación con el anexo de instrucciones. Nunca entregar el JSON de diagnóstico como sustituto.
