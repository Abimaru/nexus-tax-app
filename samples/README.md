# samples — Muestras SINTÉTICAS

> ⚠️ **Nunca** coloques aquí información tributaria real. Solo datos ficticios.

Esta carpeta contiene generadores de archivos de ejemplo para probar la carga de
información exógena en NexusTax. Los datos son **inventados** (entidades y NIT
ficticios) y sirven para el desarrollo y el smoke test.

## Generar un archivo de ejemplo

```bash
node samples/generate-sample.mjs
```

Esto crea `samples/exogena-sintetica.xlsx` con:

- una hoja de portada (para probar la detección de la hoja relevante);
- una hoja de datos con encabezados en una fila distinta de la primera;
- entidades ficticias de tipo banco, empleador, pensiones y vivienda;
- un identificador largo para verificar que no se trunca;
- una fila vacía y un duplicado para ejercitar los hallazgos de calidad.

El archivo generado está permitido por `.gitignore` (excepción para `samples/`),
pero de todas formas se recomienda no versionarlo salvo que sea necesario.

## Caso sintético integral ("golden case")

Este generador produce un archivo mínimo para probar la carga de un solo
archivo. Para un expediente sintético **completo y coherente** (exógena +
documentos + declaración anterior + facturación electrónica + dependiente +
inmueble, diseñado para demostrar y regresionar el pipeline real end-to-end),
ver `apps/web/src/lib/goldenCase.ts` y `docs/SYNTHETIC_SAMPLE_CASE.md`. Ese
módulo vive en el paquete `apps/web` (no aquí) porque su suite de coherencia
(`apps/web/src/lib/goldenCase.test.ts`) necesita ejecutar el parser de
exógena, los adaptadores documentales, el matcher, el motor de inmuebles y
el resto de paquetes de NexusTax — reutiliza toda esa infraestructura en vez
de crear un segundo sistema de muestras.

