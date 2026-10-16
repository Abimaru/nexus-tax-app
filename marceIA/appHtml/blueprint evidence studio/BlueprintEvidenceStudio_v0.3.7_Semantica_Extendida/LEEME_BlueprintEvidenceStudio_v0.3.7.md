# Blueprint Evidence Studio v0.3.7 — Enriquecimiento semántico extendido

## Entradas y salida
Un JSON original Lucidchart, uno a diez SVG (uno por operación), CSV opcional. El HTML funciona localmente y genera un único JSON con `pages[]` por operación. La normativa y las Skills no se modifican.

## Cambios
- Cada figura conserva los textos etiquetados, `customData` completo (sin eliminar valores vacíos), referencias a grupos y contenedores, IDs de conexiones entrantes y salientes, ruta jerárquica, `declaredSemantics` e `inferredSemantics`.
- Catálogo editable de equivalencias `customData.KEY` con mapeos iniciales ENTRADA→inputModel y SALIDA→outputModel; claves desconocidas no se descartan y figuran en `unmappedKeys`.
- `componentSemantics`, `modelSemantics`, `modelAssociations`, `activitySemantics`, `eventSemantics`, `interactionSemantics`, `semanticWarnings`, `semanticSummary` y `structuredConnections` por página.
- Asociación de modelos mediante grupo directo o anidado solo si el grupo tiene un único componente API candidato. Direcciones solo declaradas mediante `customData`.
- La clasificación de actividad funcional ya NO exige infinitivo. `namingAssessment` funciona de forma independiente. Para evitar falsos positivos, en ausencia de marca declarada se exige conexión del grafo y contexto del proceso.
- Comunicación bidireccional solo si existen dos líneas JSON distintas entre la actividad y el componente, en sentidos opuestos según los endpoints del JSON.

## Prueba efectuada
- Con el JSON Virtual Account Opening y SVG initiateVirtualAccount se obtuvieron 192 figuras, 63 conexiones, 12 candidatas funcionales, 5 modelos ENTRADA y 6 SALIDA. Se encontraron 5 asociaciones de grupo con ambas direcciones y 1 parcial.
- Accounts quedó parcial por falta de un modelo ENTRADA confirmado.
- Con dos SVG del mismo JSON se exportaron dos operaciones separadas en un único `pages[]`, con 192 y 135 figuras.
- Navegador Chromium sin errores JavaScript durante las pruebas.

## Límites deliberados
- `high/medium/low` representan confianza heurística, no certificación normativa ni porcentaje de precisión medido.
- `mainApi`, `consumedInternalApi`, `externalApi` y `mainService` son candidatos según texto y estructura, no dictámenes definitivos. La obligación de modelos solo se propone cuando se identifica una API principal; el agente debe aplicar la normativa vigente.
- La definición de `BPMNActivity` no prueba por sí sola el tipo de comando; `activityType: unknown` es un resultado legítimo.
- Los endpoints declarados no prueban el estilo visual de las flechas. Las terminaciones SVG siguen pendientes de conciliación.
- El algoritmo de nombres utiliza un conjunto limitado de verbos en español; `namingAssessment` es una orientación para el agente y puede necesitar revisión lingüística.
- Los eventos de integración y auxiliares necesitan marcas y relaciones explícitas antes de certificarse. Se conservan sin inventar asociaciones.
- La ausencia de evidencia **no** equivale a ausencia confirmada ni a incumplimiento.

## Prueba sugerida al analista
1. Abrir el HTML en Edge o Chrome.
2. Cargar el JSON original de Virtual Account Opening y los SVG de initiateVirtualAccount e initiateVirtualAccountAlias.
3. Analizar y descargar el JSON consolidado.
4. Revisar en `pages[0]`: `semanticKeyCatalog`, `modelAssociations`, `activitySemantics`, `semanticSummary`.
5. Confirmar que todas las páginas están en `pages[]` y que el informe de Copilot distingue evidencias declaradas e inferidas.
