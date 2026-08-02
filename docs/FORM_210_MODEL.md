# Modelo preliminar del Formulario 210

`packages/form-210` es un módulo TypeScript puro, sin React, IndexedDB, DOM ni red. Construye una
hoja de trabajo para año gravable 2025 y presentación 2026 a partir de registros exógenos, hechos
documentales revisados, disposiciones de matriz, fuentes provisionales y decisiones humanas.

## Contratos

- `Form210BoxDefinition`: número, nombre, sección, fórmula, dependencias y completitud de regla.
- `Form210BoxValue`: valor sugerido/confirmado, procedencia incluida y excluida, confianza, estado,
  advertencias, resolución y versión.
- `Form210SourceTrace`: tipo de fuente, identificadores de registro/documento/hecho, etiqueta, valor
  y evidencia.
- `Form210ValidationFinding`: severidad, código, mensaje, casillas y fuentes relacionadas.
- `Form210Draft`: versión de formulario/regla, estado de preparación, casillas, hallazgos y aviso.

Estados de casilla: sin datos, sugerida, incompleta, requiere decisión, confirmada, calculada,
contradicha y no aplica. El valor original nunca se modifica: un ajuste vive como decisión
`adjust_form_box`; restaurarlo crea `restore_automatic_value`.

El borrador se persiste como derivado en Dexie v11 (`form210Drafts`) y se reconstruye cuando cambian
fuentes, hechos, clasificaciones o decisiones. Su JSON usa el esquema
`nexustax.form210.working-draft` y declara que no contiene binarios.
