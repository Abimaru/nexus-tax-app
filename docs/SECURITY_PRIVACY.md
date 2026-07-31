# Seguridad y privacidad — NexusTax

La privacidad es un requisito de producto, no una opción. NexusTax está diseñado
para que los datos tributarios **nunca salgan del dispositivo** del usuario.

## Garantías (§12)

- **Sin subida de archivos.** Ningún archivo se envía a un servidor.
- **Sin red para procesar.** El parseo ocurre en el navegador (Web Worker o hilo
  principal). No hay llamadas de red durante el procesamiento de documentos.
- **Reglas tributarias embebidas.** La evaluación de obligación y vencimiento no
  descarga ni analiza páginas o PDFs de la DIAN en tiempo de ejecución.
- **No se persiste el archivo original.** Solo se guardan metadatos del documento
  y el resultado normalizado. El binario permanece en memoria durante la sesión.
- **Sin volcado de datos tributarios completos en consola.** El logging evita
  registrar contenido sensible.
- **Identidad enmascarada por defecto.** La comparación usa el documento
  normalizado en memoria y los hallazgos solo muestran versiones enmascaradas.
- **Sin documentos reales en Git.** `.gitignore` es estricto: excluye `*.xlsx`,
  `*.xls`, `*.pdf`, `*.csv`, carpetas de expedientes y exportaciones. Solo se
  permiten fixtures **sintéticos** bajo `samples/` y `tests/`.

## Controles del usuario

- **Eliminar un expediente** (borra su resultado y documentos asociados).
- **Limpiar toda la información local** (botón en la cabecera): vacía las tablas
  `cases`, `documents`, `results` y `filingInputs` de IndexedDB.
- **Aviso visible** de procesamiento local en Inicio y en la carga.

## Manejo de contenido activo

El lector de Excel usa `bookVBA: false`: no se procesan macros ni VBA. Las
celdas de error se tratan como nulas.

## PDFs asociados al checklist

En esta fase solo se guardan localmente nombre, tamaño, MIME y fecha de asociación
del PDF. El binario no se persiste ni se analiza. La extracción profunda de PDFs
se reserva para un backend futuro con controles de seguridad explícitos.

## Superficie de ataque

- **Sin backend** en el Sprint 1 (`apps/api` está reservado y vacío) ⇒ no hay
  endpoints ni almacenamiento remoto que proteger.
- Los datos viven en IndexedDB del navegador del usuario, bajo su control.

## Buenas prácticas para contribuir

- No agregar dependencias que realicen telemetría o llamadas de red implícitas.
- No introducir logs con NIT, nombres o valores completos.
- Mantener el `.gitignore` estricto; si necesitas una muestra, genera datos
  ficticios con `samples/generate-sample.mjs`.
- Cualquier funcionalidad futura de sincronización debe ser **opcional, cifrada y
  explícita**, y documentarse antes de implementarse.
