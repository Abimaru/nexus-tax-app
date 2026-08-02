# Feedback de extracción

## Propósito

`ExtractionFeedback` registra decisiones de calibración sin convertirlas en aprendizaje automático.
Conserva documento, sesión, candidato opcional, decisión, motivo, método, perfil, valores acotados,
página, zona y fecha.

## Alcance elegido por el analista

- **Solo este documento:** trazabilidad local del caso actual.
- **Documentos similares:** señal para una futura sugerencia.
- **Actualización de perfil:** intención explícita; no modifica el perfil por sí sola.

Crear un perfil genera feedback vinculado para que el expediente pueda derivar la tarea “probar
perfil”. Marcarlo probado resuelve esa tarea en el siguiente recálculo.

## Privacidad

No se persiste texto OCR completo. `beforeValue` y `afterValue` tienen un máximo de 160 caracteres y
pueden contener datos sensibles; por eso no se exportan como feedback detallado. El manifiesto solo
informa la cantidad de registros vinculados.

## Regla de seguridad

El feedback nunca altera candidatos, perfiles, hechos ni matriz automáticamente. Toda aplicación
requiere una acción humana separada y auditable.
