# Flujo guiado del expediente

El expediente se presenta como un proceso progresivo. La navegación organiza las
capacidades existentes; no altera las reglas tributarias ni convierte una
sugerencia en una obligación legal.

## Etapas

| Etapa        | Propósito                                      | Vistas actuales                                    |
| ------------ | ---------------------------------------------- | -------------------------------------------------- |
| Fuente       | Incorporar y revisar la fuente exógena         | Cargar, Estado, Reemplazar, Datos básicos          |
| Extracción   | Inspeccionar la hoja y confirmar su estructura | Inspección, Estructura, Calidad                    |
| Organización | Ordenar resultados, requisitos y evidencia     | Resumen, Registros, Requisitos, Documentos, Hechos |
| Conciliación | Contrastar topes, clasificación y soportes     | Matriz, Hallazgos, Conciliaciones                  |
| Declaración  | Explicar obligación y preparar hoja de trabajo | Obligación, Calendario, Borrador Formulario 210    |
| Exportación  | Revisar integridad y generar el manifiesto     | Estado, Manifiesto, Historial (futuro)             |

## Progresión

- Un expediente nuevo abre en `Fuente / Cargar`.
- `Extracción` se habilita cuando el libro está disponible en la sesión.
- Un resultado procesado habilita Organización, Conciliación y Declaración.
- Exportación permanece accesible y comunica si el expediente está incompleto.
- El modo manual habilita Documentos y Hechos sin inventar datos exógenos ni
  habilitar análisis que dependan del parser.
- Una vista futura se muestra como tal y permanece deshabilitada.

Cada etapa expone un estado textual además del color: bloqueada, disponible,
activa, incompleta, completada o requiere atención. El motor puro de
`apps/web/src/lib/workflow.ts` deriva estos estados y la siguiente acción
recomendada a partir del expediente, el resultado y el modo manual.

## Fuente y privacidad

La hoja completa se procesa en memoria; el archivo original no se persiste. La
ficha de fuente conserva únicamente nombre, fecha de carga, SHA-256, año, hojas,
filas procesadas y topes detectados. El hash se calcula localmente.

Reemplazar o eliminar la fuente requiere confirmación. Eliminarla invalida el
resultado y el análisis derivado, pero conserva los documentos, hechos y
decisiones manuales que siguen siendo válidos. La interfaz explica esta frontera
antes de ejecutar la operación.

## Continuidad

La última etapa, vista y acción recomendada se almacenan por expediente en
IndexedDB. Al recargar se restaura el último destino válido; si ya no cumple sus
precondiciones, el usuario vuelve al primer destino disponible. Las rutas son
enlazables:

```text
/expedientes/:caseId/:stage/:view
```

La ruta histórica `/expedientes/:caseId` se conserva y redirige al destino
válido. Véase [Navegación por etapas](NAVIGATION_STAGES.md) para los identificadores
y reglas de URL.
