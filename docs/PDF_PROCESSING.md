# Procesamiento local de PDF

## Implementación

NexusTax usa `pdfjs-dist` 5.4.624. La aplicación copia durante `predev` y
`prebuild` `pdf.mjs` y `pdf.worker.mjs` a un directorio generado bajo
`public/vendor/pdfjs`. El navegador los carga desde el mismo origen sin que
Webpack transforme el bundle de PDF.js. Esto mantiene el funcionamiento
offline después de instalar dependencias y evita CDN o telemetría.

El paquete recibe `ArrayBuffer | Uint8Array`, nunca una URL remota. Para cada
página conserva temporalmente texto normalizado, bloques y dimensiones. Tras
extraer candidatos destruye el documento/worker y solo persiste evidencia breve.

## Límites por defecto

| Control    | Límite | Salida                                          |
| ---------- | -----: | ----------------------------------------------- |
| Archivo    | 25 MiB | `limit_exceeded`                                |
| Páginas    |    250 | `limit_exceeded`                                |
| Candidatos |    500 | advertencia preventiva; no trunca la extracción |
| Duración   |  120 s | `timeout`                                       |

Los límites son configurables mediante `PdfReadLimits`. El progreso se informa
por fase y página; `AbortSignal` cancela. La UI no muestra porcentajes de certeza
inventados.

## Contraseña y errores

PDF.js solicita la contraseña mediante `onPassword`. La UI la mantiene en estado
React únicamente durante el intento; no se pasa a repositorios ni manifiestos.
Los errores técnicos se convierten en razones accionables: contraseña requerida
o incorrecta, texto ausente, archivo inválido, límite, timeout o cancelación.

Un PDF sin texto en ninguna página **ya no se rechaza** (antes terminaba en
`unsupported`): se lee igual y `diagnosePdfDocument` lo clasifica como
`scanned`, dejando la sesión en `partially_read` hasta que el analista lo
registre manualmente o ejecute OCR local bajo demanda desde el laboratorio
documental (ver [OCR local](LOCAL_OCR.md)). Una página fallida sigue marcándose
como dañada; las demás páginas siguen siendo revisables. Los tests usan PDFs
mínimos generados en memoria, nunca documentos tributarios reales.

## Operación

`pnpm dev` y `pnpm build` ejecutan `prepare:pdfjs` y, desde el Sprint 2.2,
también `prepare:tesseract` (vendoriza el motor OCR; ver
[OCR local](LOCAL_OCR.md)). Ambas carpetas generadas están ignoradas por Git.
Si se actualiza PDF.js se deben repetir pruebas unitarias, build y E2E,
verificar compatibilidad de Node y auditar que no aparezcan nuevas solicitudes
de red durante una extracción.

`apps/web/src/lib/pdfPageRenderer.ts` reutiliza el mismo módulo vendorizado
para renderizar una página específica a píxeles (necesario para OCR); a
diferencia del lector de texto, esto solo puede ejecutarse en el navegador
(`<canvas>`), nunca en el paquete puro.
