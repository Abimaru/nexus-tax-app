# Prueba controlada v0.4.0

**Un chat nuevo por formato y por escenario**, con la misma versión de instrucciones, normativa y catálogo. No corregir resultados durante la primera respuesta. Registrar tanto la primera salida como los ajustes posteriores por separado.

## Caso de referencia — retrieveTransactionSummary
- Esperado condicionado: E1 API directa a backend, sujeto a confirmar que el componente en NEPA es servicio no gestionado.
- Dominio productor: `NEPA - NUEVAS EXPERIENCIAS DE PAGO` (padre).
- Servicio/contendor hijo: `NOMBRE SERVICIO` (pendiente de nombramiento si regla lo exige).
- Capa: `Capa de Arquitectura - composicion` (válida).
- Modelo de lectura y salida; validaciones, actividades, políticas, compuertas, excepciones, inicio/fin presentes.
- No contabilizar la leyenda NOTACIÓN.

## Matriz de ensayos
1. PDF blueprint + normativa MD + catálogo PDF.
2. PNG blueprint + normativa MD + catálogo PDF (chat nuevo).
3. JSON original + normativa MD + catálogo PDF (chat nuevo; delimitar página/operación).
4. SVG renombrado TXT + normativa MD + catálogo PDF (chat nuevo; prueba de limitación).

Para cada caso, copiar las filas del checklist y comparar contra la primera respuesta. Usar estados PASS/FAIL/NO PROBADO. No simular éxito.
