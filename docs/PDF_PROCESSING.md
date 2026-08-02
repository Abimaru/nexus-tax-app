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

| Control | Límite | Salida |
| --- | ---: | --- |
| Archivo | 25 MiB | `limit_exceeded` |
| Páginas | 250 | `limit_exceeded` |
| Candidatos | 500 | extracción parcial/hallazgo |
| Duración | 120 s | `timeout` |

Los límites son configurables mediante `PdfReadLimits`. El progreso se informa
por fase y página; `AbortSignal` cancela. La UI no muestra porcentajes de certeza
inventados.

## Contraseña y errores

PDF.js solicita la contraseña mediante `onPassword`. La UI la mantiene en estado
React únicamente durante el intento; no se pasa a repositorios ni manifiestos.
Los errores técnicos se convierten en razones accionables: contraseña requerida
o incorrecta, texto ausente, archivo inválido, límite, timeout o cancelación.

Un PDF sin texto queda `unsupported` y ofrece registro manual u OCR futuro. Una
página fallida puede producir `partially_read`; las demás páginas siguen siendo
revisables. Los tests usan PDFs mínimos generados en memoria, nunca documentos
tributarios reales.

## Operación

`pnpm dev` y `pnpm build` ejecutan `prepare:pdfjs`. La carpeta generada está
ignorada por Git. Si se actualiza PDF.js se deben repetir pruebas unitarias,
build y E2E, verificar compatibilidad de Node y auditar que no aparezcan nuevas
solicitudes de red durante una extracción.
