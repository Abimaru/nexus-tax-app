# Diagnóstico comparativo: v0.5.1

Los porcentajes siguientes son una RUBRICA EXPERTA DE CONFIABILIDAD APARENTE, no mediciones estadísticas calibradas ni cumplimiento normativo. Se calculan como valoración de: escenario (15), jerarquía (20), identidad/texto (15), símbolos (15), colores (10), conexiones (10), trazabilidad de evidencia (10), cobertura (5). La información de los informes de Copilot es parcial y puede estar sesgada.

| Prueba | Puntuación orientativa /100 | Explicación |
|---|---:|---|
| E1 JSON+TXT | 82 | Corrige escenario, reconoce rasgos cromáticos del SVG y capas, pero faltan inspecciones exactas por instancia y cobertura de reglas. |
| E1 JSON+PNG | 76 | Mejor inventario visual que PDF, escenario E1 correcto tras confirmación; errores preliminares de pertenencia y comandos no tipificados. |
| E1 JSON+PDF | 64 | Buena extracción textual, insuficiencia visual; persistencia de relación errónea de NOMBRE SERVICIO en integración y sin dictamen completo. |
| E2 JSON+TXT grande | 43 | Omite contenedor servicio real nombrado, deja NOMBRE SERVICIO, no encuentra atributos; cobertura muy baja pese a nombres estructurados. |

No confundir puntuación con porcentaje normativo generado por Copilot; no afirma precisión calculada contra todas las reglas. Antes de producir una métrica empírica se necesita un ground truth por figura y regla.

## Hallazgos reproducibles
- E1: NOMBRE SERVICIO debe pertenecer al productor NEPA, no a INTEGRACIÓN.
- E2 hipotecario: JSON operativo contiene servicio `Mortgage Loan Disbursement Management - Disbursement Execution` como `RectangleContainerBlock` (ID TJ7m.cKnR-~v), y contenedores INTEGRACIÓN, DOMINIO PRODUCTOR y SISTEMAS EXTERNOS.
- Etiquetas semejantes a NOMBRE SERVICIO pueden provenir de leyenda u otra zona y no sustituyen el nombre real de un servicio.
- Confianza de interpretación y cobertura de reglas deben medirse por separado.
- Los chats nuevos no heredan aprendizaje de modelos entrenados por esa sesión. El contexto dentro de un mismo chat puede influir en evaluaciones posteriores. La configuración permanente solo cambia cuando se edita/publica; cualquier memoria externa sería dependiente de funciones explícitas de la plataforma.
