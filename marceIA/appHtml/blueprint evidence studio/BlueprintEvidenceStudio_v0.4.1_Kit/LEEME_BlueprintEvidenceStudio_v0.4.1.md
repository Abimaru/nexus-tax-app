# Blueprint Evidence Studio v0.4.1 — Jerarquía por dominio raíz

## Alcance
- Un único `DIRECT_CONTAINMENT` por componente solo si existe padre inmediato único en las afirmaciones de `JSON.contains`. Los ancestros se conservan por separado como `ANCESTOR_CONTAINMENT`. Ambigüedades y ciclos se registran sin inventar un padre.
- `architecturalStructure.rootContainers`: raíces arquitectónicas reconocidas por las declaraciones y nombres, sin llamar automáticamente productor a todo dominio personalizado.
- `architecturalStructure.childContainers`: hijos con padre inmediato, raíz y cadena completa, aun si no hay flujo ni capa.
- `architecturalStructure.principalInteractionPaths`: rutas candidatas UML → conexión → BPMNEvent → hijo → dominio. No certifican Inicio ni escenario.
- `architecturalStructure.deploymentOwnership`: capas asociadas por componente y fuente, sin compartir capas de otro componente ni exigir MCI cuando no está declarado.
- `architecturalStructure.containmentReconciliation`: afirmaciones originales, relaciones normalizadas y conflictos.
- Se conservan el inventario, conexiones, extremos, estilos, `customData`, semántica y exportación multipágina.
- El agente sigue siendo responsable de E1/E2/E3 y del cumplimiento normativo.

## Comprobaciones realizadas
- Sintaxis JavaScript mediante Node: PASS.
- Proyección sobre JSON técnico multipágina Virtual Account: 192 figuras y 63 conexiones en initiateVirtualAccount; 135 figuras y 35 conexiones en initiateVirtualAccountAlias. Cero padres directos duplicados y cero discrepancias entre `structuralParent.id` y `DIRECT_CONTAINMENT` en ambas páginas.
- Pendiente: pruebas de interfaz y exportación en el navegador corporativo con E1 Recaudos y E2 Credit Limit Management.

## Prueba recomendada
1. Abrir HTML, cargar JSON original y SVG(s), CSV opcional.
2. Descargar JSON limpio para Copilot.
3. Verificar por cada página `rootContainers`, `childContainers` y `principalInteractionPaths`.
4. Asegurar que la cadena de padre inmediato y dominio raíz sea diferente cuando haya capas intermedias.
5. Confirmar que no se haya alterado ninguna conexión y que las capas ausentes no se registren como incumplimiento.
