# Blueprint Evidence Studio v0.3.6

## Qué cambió
- Conserva `customData` original completo y su `value` sin alteraciones en **cada figura** del JSON de salida.
- Conserva `groups[]`, sus `members` y `groupReferences[]` por figura, por cada página.
- Añade `modelAssociations[]` usando grupos con una sola figura UMLClassBlock y modelos BPMNActivity etiquetados `ENTRADA`/`SALIDA`. Asociación completa o parcial según la evidencia. No asigna dirección a un modelo si no está marcada.
- Añade `activitySemantics[]` y en cada figura `semanticRole`, `classificationSource`, `classificationConfidence`, `classificationEvidence`.
- El rol `processActivity` se asigna provisionalmente según patrones de verbo infinitivo inicial en español y ausencia de patrón de campos estructurados; **no supone cumplimiento normativo ni verifica la iconografía**.
- Presenta la nueva sección de clasificación por operación; el JSON multipágina conserva `pages[]`.

## Prueba realizada
Con `MCI - BP - Virtual Account Opening - Virtual Account V2.1.0 (1).json`, página `initiateVirtualAccount`: 12 candidatas a actividad funcional, 5 modelos ENTRADA, 6 SALIDA, 4 asociaciones por grupo. El grupo `9S4u3kvwXH~5` contiene la API `8S4uZBWnl~74`, entrada `8S4uBGIxaDnu` y salida `8S4uoa1YkxAB`.

## Uso
Abrir el HTML en Chrome o Edge sin servidor, cargar un JSON original completo y uno o varios SVG por operación (hasta 10). CSV opcional. Analizar y descargar el JSON consolidado. No se modifican archivos originales.

## Límites
- Las etiquetas `BPMNActivity` no identifican por sí solas actividades funcionales: también incluyen modelos, reglas, errores y notas.
- `processActivity` de origen `textualRules` tiene confianza media y es candidata a validar el infinitivo; no es una certificación.
- Un grupo compartido es evidencia estructural, no certifica ubicación visual ni cumplimiento arquitectónico.
- Si una API no aparece en grupo inequívoco con modelos etiquetados, no se inventa la asociación.
- El algoritmo no asegura identificar todos los infinitivos españoles; las actividades no identificadas quedan `unclassified`.
- La impresión multipágina conserva el resumen por operación; las fichas completas están en el JSON consolidado.
