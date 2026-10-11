# Protocolo de pruebas v0.5.2

1. Reemplaza totalmente el campo Instrucciones de Agent Builder por INSTRUCCIONES_AGENT_BUILDER_v0.5.2.txt.
2. Un chat NUEVO por cada combinación. Adjunta exactamente el JSON del blueprint, una representación visual (PNG, PDF o SVG en TXT) y ESTANDAR_BLUEPRINTS_INTEGRADO_v0.5.2.pdf. No adjuntes los archivos de administración.
3. Espera las cinco preguntas, contesta el escenario esperado E1 para retrieveTransactionSummary y E2 para initiateMortgageLoanDisbursement; API privada, sin eventos de comportamiento, síncrona, MCI solo cuando la evidencia y tu contexto lo avalen. No respondas afirmaciones que no estén confirmadas por el analista.
4. No corrijas la primera respuesta. Guarda salida preliminar y dictamen final; registra el resultado en la matriz CSV.
5. Asegura que informe nombre e ID de cada contenedor real, localización del servicio y exclusión de NOTACIÓN.
6. Contrasta las conclusiones de cada combinación con el JSON real y el PDF visual; no utilices el porcentaje del informe como valor de precisión.
7. En la versión 0.5.2 se añadió un anexo antes del PDF anterior: los CV apuntan a páginas originales del catálogo, NO a la paginación total del PDF. Al localizar una figura usa el índice del catálogo contenido en el propio PDF.

## Mensaje de prueba idéntico para todos los ensayos
«Inicia evaluación v0.5.2. Recibiste el JSON original, una representación visual de la misma operación y el estándar integrado. Antes de evaluar, formula las cinco preguntas. Posteriormente construye el árbol de pertenencia por ID, inventario visual independiente, reconciliación y las siete secciones de cumplimiento. No cierres E2 por presencia de capas ni omitas nombres de servicio explícitos. Excluye NOTACIÓN. No reportes valores HEX sin prueba. Señala cada límite de evidencia».
