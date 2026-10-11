# Pruebas controladas v0.5.0

## Tres escenarios × tres formatos = nueve conversaciones nuevas

Cada ensayo comienza en un chat completamente NUEVO con instrucciones v0.5.0 idénticas. Escenario E1, E2 y E3: aportar un blueprint real representativo y su JSON original de Lucidchart. **No asumir que son las mismas operaciones**; registrar el nombre y página objetivo.

### Etapa A (tres adjuntos)
1. Archivo visual (PDF / PNG / SVG renombrado a TXT), según la fila.
2. Normativa v0.5.0.
3. Catálogo visual PDF v0.4.0 (sin cambios).

El agente debe **preguntar los cinco parámetros** y esperar confirmación. Responder siempre con valores correctos del caso esperado. Debe producir solo inventario A, atributos visuales observados y solicitar JSON. Guardar literalmente esta respuesta.

### Etapa B (mensaje siguiente en el mismo chat)
Adjuntar JSON original del MISMO diagrama; indicar operación y página si hay múltiples. Pedir «Contrasta con el inventario visual anterior y genera ahora el informe conciliado; no reutilices clasificaciones sin evidencia». Guardar respuesta final.

### Qué registrar
- ¿Aceptó el JSON en un segundo mensaje, aun con 3 adjuntos en el primero? Si NO, no atribuirlo al modelo: documentar restricción real, y usar dos conversaciones separadas + reconciliación manual como plan B.
- Escenario correcto E1/E2/E3; en E2 identificar servicio gestionado REAL en INTEGRACIÓN.
- Cinco preguntas planteadas, no solo impresas en el informe.
- Diferencia entre dominio productor y su contenedor hijo.
- Capa `composicion` válida.
- API circular verde con triángulo blanco: qué vio y qué no verificó.
- Tipos de comando con icono/color y reglas; compuertas, inicio/fin, política, excepciones y punta de flecha.
- Nombres y formas de la página correcta del JSON; excluir NOTACIÓN/BDD.
- Separación de hallazgos y limitaciones de lectura; ausencia de inventos.
- Métricas consistentes y sin doble conteo.

### Regla de evaluación
Comparar las **primeras respuestas** contra la referencia definida por analista. No corregir dentro de la ejecución controlada; las rectificaciones van en una segunda columna de observaciones.
