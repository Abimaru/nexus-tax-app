# Arquitectura — NexusTax

## Monorepo

Workspace pnpm con dos capas: **aplicaciones** (`apps/*`) y **paquetes**
(`packages/*`). Los paquetes se consumen como **TypeScript fuente** (sin paso de
build propio); Next.js los transpila vía `transpilePackages`.

```
apps/web  ──depende de──▶ packages/ui ──▶ packages/config
   │                         packages/domain
   └──────────────────────▶ packages/exogenous-parser ──▶ packages/domain, config
   └──────────────────────▶ packages/aegis-rules ───────▶ packages/domain
```

### Regla de dependencias

- `domain` no depende de nadie (solo Zod). Es la fuente de verdad de los tipos.
- `exogenous-parser` depende de `domain` y `config`. **Puro y determinista**: no
  toca el DOM, no hace red, no importa React.
- `aegis-rules` depende de `domain`. Contiene criterios y calendarios oficiales
  versionados; es puro, explicable y no consulta la red durante la evaluación.
- `ui` depende de `config` (y de React como peer). Solo presentación.
- `web` orquesta todo: estado (Zustand), persistencia (Dexie/IndexedDB),
  Web Worker y pantallas.

### Límite duro (§17)

> La lógica de dominio y de parsing **no** vive en componentes React. Los
> componentes reciben datos ya normalizados y solo los presentan.

## Capas de datos (§5)

| Capa         | Dónde                                | Ejemplo                        |
| ------------ | ------------------------------------ | ------------------------------ |
| Datos crudos | `RawExogenousRecord`                 | fila tal cual, por columna     |
| Normalizados | `NormalizedExogenousRecord`          | campos canónicos + `extra`     |
| Hallazgos    | `DataQualityFinding`                 | severidad + evidencia          |
| Métricas     | `ProcessingMetrics`                  | totales, puntaje de calidad    |
| Presentación | `ReportingEntity`, `ReportedConcept` | agregados para gráficas/tablas |

## Flujo de procesamiento

```
File
 └─ validateFile()                 (extensión, tamaño)
 └─ readWorkbookFile()             (xlsx → metadatos + matrices)   [Web Worker]
 └─ detectHeaderRow() / buildColumns() / guessColumnMapping()
 └─ normalizeRecords()             (crudos + normalizados)
 └─ buildEntities() / buildConcepts()
 └─ detectFindings()               (calidad, con evidencia)
 └─ computeMetrics()
 └─ buildChecklist()               (reglas configurables)
 └─ ProcessingResult  ──▶ IndexedDB (Dexie)  ──▶ export JSON
```

El `ProcessingResult` es **determinista**: mismas entradas ⇒ misma salida
(identificadores por hash estable, ordenamientos explícitos).

## Concurrencia y rendimiento (§13)

- El parseo corre en un **Web Worker** (`apps/web/src/workers/parser.worker.ts`)
  para no bloquear el hilo principal. El worker conserva el último libro leído y
  permite reprocesar con otra hoja / encabezado / mapeo sin re-transferir.
- Si el worker no puede crearse, hay un **fallback en el hilo principal** con la
  misma interfaz (`processorClient.ts`).
- El progreso se reporta por **fases reales** (no un spinner infinito).

## Estado y persistencia

- **Zustand** (`workbenchStore.ts`): estado efímero del flujo de carga.
- **Dexie/IndexedDB** (`db.ts`, `repository.ts`): expedientes, resultados,
  análisis, biblioteca documental y navegación por expediente. Los binarios
  viven separados y solo se guardan por elección explícita del usuario.

## Decisiones clave

- **Next.js 14 (App Router) + React 18.3**: estabilidad probada con RSC/Workers.
- **Paquetes como fuente TS**: elimina un paso de build y mantiene DX simple para
  un Sprint 1; se puede empaquetar más adelante si se publica.
- **IDs por hash estable** en el parser: reproducibilidad y comparabilidad.

## Analisis resoluble y matriz

El parser puro produce relaciones y una matriz preliminar despues de normalizar.
La web guarda en la tabla `analyses` las resoluciones del analista y vuelve a
invocar el calculo puro con esa superposicion. React presenta el resultado, pero
no contiene reglas tributarias. Al reprocesar se conservan las decisiones y se
marcan obsoletas si cambia su registro o la version automatica.

El archivo exógeno procesado sigue fuera de IndexedDB por defecto. Los soportes
documentales pueden conservarse localmente de forma optativa y eliminable.

- **Adaptadores configurables** (sinónimos de columnas, reglas de checklist) en
  vez de reglas rígidas: preparan el terreno para el Aegis Engine.

## Sprint 2: agregado y almacenamiento

Dexie v4 agrega `documentBlobs`, `products`, `coverages`, `facts` y
`reconciliations`. `documents` contiene metadatos y hash; separar bytes permite
eliminar la copia local sin romper versiones, coberturas o hechos.

El expediente se materializa como una vista agregada desde esas tablas. Las
sugerencias y métricas viven en funciones puras fuera de React. La interfaz usa
tokens semánticos compartidos en tema claro y oscuro.

## Sprint 2.0.2: flujo y navegación

`packages/domain/src/navigation.ts` define identificadores y estado persistible.
`apps/web/src/lib/workflow.ts` decide de forma pura qué etapas y vistas están
disponibles y cuál es la siguiente acción. Los componentes solo renderizan esa
decisión.

Dexie v6 agrega `navigationStates`. `StoredResult` conserva metadatos mínimos de
la fuente (SHA-256 y fecha), nunca el archivo original. Las rutas estables siguen
`/expedientes/:caseId/:stage/:view`; el destino se valida antes de restaurarlo.
La eliminación de una fuente borra derivados exógenos de forma selectiva y
mantiene documentos y hechos manuales.

## Sprint 2.1: inteligencia documental

`packages/document-intelligence` agrega una frontera pura entre la librería PDF
y el dominio. Recibe bytes y contexto, devuelve representación efímera,
clasificación, adaptador, candidatos y hallazgos. No importa React, Dexie ni
funciones de matriz. `apps/web/src/lib/documentProcessor.ts` es la capa de
aplicación que obtiene bytes locales y persiste el resultado.

PDF.js se sirve desde el mismo origen como artefacto generado en `predev` y
`prebuild`; el lector nunca recibe una URL remota de documento. Dexie v8 añade
`extractionSessions` y `documentCandidates`. El texto completo y los buffers no
cruzan la frontera de persistencia. La confirmación humana transforma un
candidato en hecho y la conciliación posterior sigue siendo una decisión
separada.
