# Rendimiento del OCR local

## Política

NexusTax no promete tiempos exactos: Tesseract depende de CPU, memoria, resolución, ruido y diseño
del documento. La interfaz usa estimaciones cualitativas y procesa una página por vez para limitar
el heap WASM.

## Medición de referencia

Referencia local del 2 de agosto de 2026:

| Entorno                                      | Valor                                                                |
| -------------------------------------------- | -------------------------------------------------------------------- |
| Sistema                                      | Windows 11 Pro 10.0.26200                                            |
| CPU                                          | Intel Core i5-11400F, 6 núcleos / 12 hilos                           |
| Memoria física                               | 31,9 GiB                                                             |
| Navegador                                    | Chromium de Playwright, escritorio                                   |
| Modelo                                       | `spa.traineddata` fast, 2.294.433 bytes                              |
| Concurrencia                                 | 1 página                                                             |
| Escenario automatizado                       | PDF sintético textual renderizado, OCR real, comparación y candidato |
| Duración E2E observada durante el cierre F–G | 3,3–4,5 s para el escenario completo del laboratorio                 |

La duración incluye navegación y operaciones de interfaz; no representa un benchmark aislado ni
se extrapola a documentos tributarios reales.

## Estrategia de recuperación

Ante timeout, watchdog o falta de memoria, el laboratorio permite:

1. reintentar con la resolución normal;
2. reintentar a escala 1,1 para reducir píxeles y memoria;
3. continuar con texto nativo cuando existe;
4. registrar un candidato manual sin perder la evidencia disponible.

La imagen original no se modifica y ningún reintento se ejecuta automáticamente.

## Protocolo para nuevas mediciones

Usar solo fixtures sintéticos, registrar sistema/CPU/memoria/navegador, cantidad de páginas,
resolución y transformaciones, y reportar mediana y rango de al menos cinco ejecuciones. Separar
tiempo de renderizado, carga del worker y reconocimiento. No llamar “precisión” a cobertura,
confianza técnica o cantidad de candidatos.
