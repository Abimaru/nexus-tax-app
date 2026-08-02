# Seguridad del OCR local

## Garantía operativa

El reconocimiento se ejecuta en el navegador con Tesseract.js. `OcrClient` usa exclusivamente
`/vendor/tesseract/worker.min.js`, `/vendor/tesseract/core` y `/vendor/tesseract/lang`; no acepta URLs
externas ni ejecuta OCR automáticamente. Las imágenes renderizadas, tokens y texto completo son
efímeros y no forman parte del manifiesto.

## Cadena de suministro

`prepare-tesseract.mjs` copia worker y WASM desde las versiones bloqueadas por `pnpm-lock.yaml`. El
modelo español `spa.traineddata` se descarga solo durante desarrollo/build desde el commit fijo
`87416418657359cb625c412a48b6e1d6d41c29bd` de `tessdata_fast` y se valida contra SHA-256
`6f2e04d02774a18f01bed44b1111f2cd7f3ba7ac9dc4373cd3f898a40ea6b464`. Una discrepancia detiene la
preparación.

Una instalación limpia necesita red para obtener ese modelo una vez. El reconocimiento normal no la
necesita. La carpeta generada permanece fuera de Git.

## Persistencia y exportación

Solo se persiste un resultado operacional acotado por página: estado, tipo de comparación,
confianza, código de fallo y fecha. No se persisten texto OCR, tokens ni imagen renderizada. El
manifiesto 2.2.0 declara `includesFullText`, `includesPasswords` e `includesRenderedImages` en
`false` y exporta únicamente métricas agregadas.

Los candidatos confirmados conservan evidencia breve porque forman parte de la trazabilidad humana;
pueden contener información sensible y permanecen locales.

## Controles

- Un trabajo OCR concurrente como máximo.
- Watchdog de 30 segundos y timeout total de 120 segundos.
- Cancelación mediante `AbortSignal` y terminación del worker ante fallos.
- Sin telemetría, backend ni logs de texto completo.
- Revisión humana obligatoria antes de crear hechos.

Consulta también [OCR local](LOCAL_OCR.md), [seguridad general](SECURITY_PRIVACY.md) y
[rendimiento](OCR_PERFORMANCE.md).
