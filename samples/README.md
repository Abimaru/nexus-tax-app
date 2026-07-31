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
