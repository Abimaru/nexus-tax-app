# OCR local

## Motor y vendorización

NexusTax usa **Tesseract.js 7.0.0** (Apache-2.0), motor OCR en WebAssembly que
corre íntegramente en el navegador mediante su propio Web Worker. Igual que
`pdfjs-dist`, se vendoriza sin CDN: `apps/web/scripts/prepare-tesseract.mjs`
copia en `predev`/`prebuild` el worker (`worker.min.js`) y las tres variantes
del núcleo LSTM (`tesseract-core-{,simd-,relaxedsimd-}lstm.wasm.js`, ya
autocontenidas con el binario WASM embebido) desde los paquetes instalados
`tesseract.js`/`tesseract.js-core`, y descarga una única vez
`spa.traineddata` (modelo de español "fast", ~2.2 MB) a
`apps/web/public/vendor/tesseract/`. Esa carpeta está ignorada por Git y se
regenera localmente; la descarga del modelo de idioma requiere red **solo en
tiempo de desarrollo/build**, nunca durante el procesamiento de un documento
del usuario.

## Cuándo se ejecuta

Nunca automáticamente. `diagnosePdfDocument` (ver
[inteligencia documental](DOCUMENT_INTELLIGENCE.md)) clasifica cada página y
`recommendOcrPages` sugiere cuáles se beneficiarían de OCR (escaneadas o con
texto insuficiente; las dañadas necesitan registro manual, no OCR), con una
estimación cualitativa (rápida/moderada/intensiva) según cuántas páginas
habría que procesar — nunca un tiempo exacto. El analista decide, página por
página, desde el laboratorio documental integrado al expediente.

## Orquestación (`apps/web/src/lib/ocrClient.ts`)

`OcrClient` reutiliza el Web Worker interno de Tesseract.js y agrega:

- **Progreso real**: reenvía los eventos `{status, progress}` del `logger` de
  Tesseract.
- **Watchdog**: si no llega progreso en 30 s (configurable), se considera
  detenido y se rechaza con `code: 'stalled'`.
- **Timeout total**: 120 s por defecto, configurable.
- **Cancelación**: `AbortSignal`; si la señal ya estaba abortada antes de
  registrar el listener, se rechaza igual (evita una condición de carrera real
  que se encontró escribiendo las pruebas).
- **Concurrencia limitada a 1** (`MAX_CONCURRENT_OCR_JOBS`): el heap WASM de
  Tesseract solo crece durante la vida del worker, así que un único trabajo
  local activo evita picos de memoria en equipos modestos.
- **Liberación**: `terminate()`/`dispose()` cierran el worker ante cualquier
  fallo o al terminar.

## Representación unificada y comparación

`ocrTokensFromRaw`/`nativeTokensFromBlocks` (`document-intelligence`)
normalizan texto nativo y OCR bajo el mismo contrato (`UnifiedTextToken`:
método, página, coordenadas, confianza técnica). `compareTextSources` decide
entre seis estados —coinciden, OCR complementa, texto nativo más confiable,
OCR más completo, contradicción, requiere revisión— **sin fusionar nunca** dos
valores en conflicto; ambos textos se conservan como evidencia.

## Preprocesamiento opcional

`imagePreprocessing.ts` (puro, sobre arreglos RGBA) ofrece escala, contraste,
escala de grises, binarización, rotación en múltiplos de 90° y reducción de
ruido (mediana 3×3). El laboratorio expone un checkbox "Mejorar contraste
antes de OCR" en modo avanzado. El original renderizado nunca se modifica; el
preprocesamiento solo afecta la imagen que se envía a Tesseract.

## Limitaciones conocidas

- **Sin corrección automática de orientación**: requeriría el motor "legacy"
  de Tesseract (`osd`), fuera de alcance por ahora. `rotateQuarterTurns` existe
  como corrección manual.
- **Sin detección de imágenes grandes por página**: el diagnóstico usa
  cobertura de texto, no análisis del `operatorList` de PDF.js.
- **Sin renderizado por lotes**: cada ejecución de OCR renderiza y procesa una
  página a la vez, por diseño (evita mantener muchas imágenes en memoria).

La documentación específica de seguridad y mediciones de rendimiento queda
pendiente para la Fase G. Mientras tanto, consulta [seguridad y privacidad](SECURITY_PRIVACY.md)
y el [roadmap](ROADMAP.md).
