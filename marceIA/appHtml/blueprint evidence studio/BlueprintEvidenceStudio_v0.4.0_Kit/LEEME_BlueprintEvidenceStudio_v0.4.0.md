# Blueprint Evidence Studio v0.4.0 — dominio, capas y servicios inferidos

## Propósito
Actualización incremental de v0.3.9 sin cambiar las Skills ni la normativa. El archivo HTML es autocontenido y funciona sin conexión a internet.

## Cambios
1. En el JSON **limpio para Copilot**, cada entrada `architecturalStructure.elements[]` separa `structuralParentId` del `parentDomainId` y `parentDomainName`, y expone `layerAssociations` con `transactionFlows`, `architectureLayers`, asociaciones CSV y estado. No crea flujos ni capas si no existen; tampoco presupone que las capas sean obligatorias fuera de MCI.
2. `evidence.componentTypeEvidence[]` registra una clasificación técnica por figura UML: nombre que comienza exactamente por `ms-` o `ms_` => `technicalType: service`, `typeStatus: INFERRED_BY_NAMING_CONVENTION`, `confidence: medium`. Los UML restantes se mantienen como `apiOrService`, salvo evidencia complementaria externa; **no se afirma que todos los servicios sean ms** ni que el prefijo sea una certificación documental.
3. Un hijo `RectangleContainerBlock` usa `technicalType: mainServiceContainer`, separado de un componente UML de tres secciones.
4. Las asociaciones de modelos siguen siendo evidencia por grupo; si corresponden a un objeto UML clasificado como servicio `ms-`, se refleja `componentType: service` con un campo adicional `componentTypeInference`.
5. Se conservan las dos exportaciones: JSON limpio para Copilot y JSON de diagnóstico completo. El formato multipágina `pages[]`, SVG adicionales y CSV opcional se mantienen.

## Validaciones realizadas
- `node --check`: PASS.
- Navegador Chromium con entrada `E1 con servicios`: 126 figuras, 30 conexiones, 4 instancias inferidas de servicio: `wniBHx_-rM2r`, `wniByx~NXUYm`, `wniBCQc8BggU`, `wniBxMxEmoPx`.
- Navegador Chromium con entrada `E2`: 170 figuras, 42 conexiones. `qoVt-EO_PR2Y`: dominio `INTEGRACIÓN`, padre inmediato `Flujo Transaccional - operativo`, flujo y capa presentes. API `HezB9KD_PZ.-`: dominio `INTEGRACIÓN`, padre inmediato `INTEGRACIÓN`, capas no declaradas en su cadena JSON.
- Prueba de apertura manual directa en equipo corporativo: pendiente.

## Advertencias y límites
- El nombre `ms-` produce **inferencia**, no evidencia declarada. Si una organización emplea un nombre distinto, la figura permanecerá `apiOrService` hasta contar con evidencia de tipo suficiente. No imponer `ms-` como regla normativa.
- La presencia de flujo/capa en el mismo dominio no demuestra pertenencia específica a una API si no existe relación JSON/CSV explícita.
- `NOT_DECLARED_IN_JSON_CHAIN` no equivale a incumplimiento.
- Ninguna salida de la herramienta emite E1/E2/E3 ni Cumple/No Cumple.
- La herramienta no se publicó automáticamente en repositorios corporativos; quien administre el repositorio debe cargar el HTML aprobado.

## Procedimiento de prueba sugerido
1. Abrir HTML, cargar 1 JSON original y 1 SVG por operación (hasta 10), CSV opcional.
2. Analizar y descargar **JSON limpio para Copilot**.
3. Verificar `pages[].architecturalStructure.elements[]` y `pages[].evidence.componentTypeEvidence[]`.
4. Comprobar que las figuras `ms-` llevan `INFERRED_BY_NAMING_CONVENTION` y que las figuras no `ms-` no quedan convertidas automáticamente en servicio.
5. Comparar con el JSON anterior en conversaciones limpias de Copilot.
