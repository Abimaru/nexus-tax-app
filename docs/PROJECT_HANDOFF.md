# Handoff del proyecto — NexusTax (Sprint 1)

_Última actualización: 2026-07-31._

## 1. Estado actual

Monorepo pnpm inicializado con el alcance completo del Sprint 1 implementado a
nivel de código: dominio, parser de exógena, UI compartida, app Next.js con las
8 pantallas, persistencia local, exportación JSON, documentación y pruebas.

El parser distingue ahora reportes seccionados: conserva metadatos, detecta el
encabezado, extrae el resumen variable de topes y normaliza únicamente el
detalle reportado por terceros. La detección se puede revisar y corregir en la
pantalla de inspección antes de procesar.

La lectura ya no confía en `worksheet['!ref']` como límite: deriva `fullRows` de
las celdas reales, incluso si el XLSX declara solo 15 filas y contiene detalle
posterior. `previewRows` es una proyección exclusiva de UI y nunca alimenta el
pipeline.

El reporte extrae ahora la identidad del consultante, muestra su documento
enmascarado, distingue los dos NIT jerárquicos, valida coincidencias por registro,
estructura el uso sugerido y clasifica cada fila con reglas versionadas. El
resumen separa métricas homogéneas de la suma bruta no consolidada.

El paquete puro `@nexus-tax/aegis-rules` evalúa offline la obligación orientativa
de declarar para AG 2025: mapea los cinco topes, solicita la condición de IVA,
respeta los operadores oficiales y calcula el vencimiento 2026 por los últimos
dos dígitos. La UI muestra explicación, evidencia, versión y fuentes DIAN.

> El resultado exacto de instalación / build / lint / typecheck / tests se
> registra en la sección **4. Validaciones** (se actualiza tras ejecutarlas en
> el entorno del desarrollador).

## 2. Decisiones

- **Next.js 14 (App Router) + React 18.3**: estabilidad probada con Web Workers.
- **Paquetes consumidos como TypeScript fuente** (`transpilePackages`), sin build
  propio por paquete — simplicidad para Sprint 1.
- **Parser puro y determinista** en `packages/exogenous-parser` (IDs por hash).
- **Web Worker** para el parseo con **fallback** en hilo principal.
- **Dexie/IndexedDB** para persistencia; **no** se guarda el archivo original.
- **Reglas y sinónimos configurables** (adaptadores) preparados para Aegis Engine.
- **Filas 1-based en `ExogenousReportStructure`**: coinciden con Excel y con la
  evidencia; `headerRowIndex` se conserva por compatibilidad interna.
- **Detección de secciones por contenido**: identidad/concepto/valor para el
  detalle y descripción/valor para topes, sin constantes de posición o cantidad.
- **Fuente completa separada de la preview**: worker y fallback conservan
  `fullRows`; `buildWorkbookPreviews` limita únicamente lo que se renderiza.
- **Encabezados jerárquicos**: el grupo padre forma parte de la clave de columna;
  los dos encabezados NIT del formato DIAN no son duplicados.
- **Clasificación inicial v1**: prioridad código → casilla sugerida → detalle →
  tipo de entidad; es orientativa y no calcula el Formulario 210.
- **PDF local limitado**: requisitos aceptan solo metadatos PDF y estado
  `received`; no se persiste ni analiza el binario.
- **Aegis anual y versionado**: criterios y calendario viven fuera de React; no
  se consulta la DIAN en tiempo de ejecución y un dato ausente es no evaluable.
- **Monto de comparación**: se usa el valor oficial redondeado y se conserva el
  resultado exacto de UVT para trazabilidad.

## 3. Comandos

```bash
corepack enable
pnpm install
pnpm dev                 # http://localhost:3000
pnpm build
pnpm lint
pnpm typecheck
pnpm test
pnpm --filter @nexus-tax/web test:e2e
node samples/generate-sample.mjs   # genera un Excel sintético de prueba
```

## 4. Validaciones

| Paso         | Comando             | Resultado                           |
| ------------ | ------------------- | ----------------------------------- |
| Install      | `pnpm install`      | OK; enlazó el nuevo paquete Aegis   |
| Build        | `pnpm build`        | OK; Next compiló y generó 5 páginas |
| Lint         | `pnpm lint`         | OK; 0 warnings / 0 errors           |
| Typecheck    | `pnpm typecheck`    | OK; 6 proyectos verificados         |
| Unit tests   | `pnpm test`         | OK; 76/76 pruebas                   |
| Smoke (e2e)  | `pnpm ... test:e2e` | OK; 1/1 en Chromium                 |
| Muestra XLSX | `node samples/...`  | OK; archivo sintético generado      |

## 5. Pendientes

- Persistir el mapeo manual de columnas por expediente (hoy es por sesión).
- Incorporar reglas Aegis para años distintos de 2025 antes de evaluarlos.
- Virtualización de tablas muy grandes (hoy: paginación de 25 filas).
- Métricas de rendimiento con archivos muy grandes en Web Worker.

## 6. Siguiente paso exacto

1. `node samples/generate-sample.mjs` y probar el flujo en `pnpm dev`:
   crear expediente → cargar `samples/exogena-sintetica.xlsx` → inspeccionar →
   confirmar filas 14 / 15–19 / 20 → procesar → revisar que haya 5 topes y que
   solo el detalle alimente registros, hallazgos y checklist → exportar JSON.
2. Revisar la pestaña Obligación, responder la condición de IVA y contrastar la
   evidencia y la fecha con el RUT antes de usar el resultado.

## 7. Riesgos conocidos

- **Web Worker + monorepo**: si el bundler no resuelve el worker en algún
  entorno, actúa el fallback en hilo principal (menor rendimiento, mismo
  resultado).
- **Heurística de categorías/encabezados**: orientativa; el mapeo manual es la
  vía de corrección. No debe interpretarse como verdad tributaria.
- **Heurística de secciones**: formatos con columnas atípicas pueden requerir
  ajustar manualmente el rango de topes y el inicio del detalle en Inspección.
- **Clasificación tributaria inicial**: requiere revisión humana; las casillas y
  palabras clave no sustituyen reglas legales ni el cálculo del Formulario 210.
- **Obligación orientativa**: solo cubre los seis criterios configurados para AG 2025. El estado técnico `required` no sustituye asesoría ni decisión de la DIAN.
- **PDFs**: solo se conserva metadata. El análisis profundo corresponde al
  futuro backend y debe diseñarse antes de persistir binarios.
- **Compatibilidad de versiones** (Next/React/recharts): fijadas a rangos
  probados; revisar al actualizar mayores.

## 8. Entrega: clasificacion resoluble y matriz (2026-07-31)

### Estado inicial

El parser v1 clasificaba de forma orientativa, pero los hallazgos no podian
resolverse, no existian relaciones entre registros ni una matriz que evitara
doble conteo. IndexedDB conservaba resultados y la respuesta de IVA, no
decisiones de analisis.

### Cambios implementados

- Dominio v0.3.0 con relaciones, multiplicidad, resoluciones con historial,
  disposiciones de consolidacion, matriz y tres dimensiones de calidad.
- Parser v0.4.0 / reglas 2.0.0 con prioridad por evidencia, facturacion
  electronica, conceptos laborales y de inversion, relaciones de subconjunto,
  resumen, movimiento y posible duplicado.
- Matriz preliminar con grupos tributarios, conciliacion contra cinco topes,
  diferencias, confianza, evidencia y prevencion de doble conteo.
- Flujo local de resolucion desde Hallazgos, filtros ampliados en Registros y
  pestaña Matriz. El valor, entidad, texto y ubicacion originales son inmutables.
- Dexie v3 agrega `analyses`; las decisiones sobreviven recargas y se marcan
  obsoletas al cambiar la regla o clasificacion automatica.
- Export normalizado actualizado al esquema 4.

### Reglas y decisiones arquitectonicas

La base susceptible de factura electronica es `subset_of` del total y solo
alimenta el calculo orientativo del 1 %. Los promedios laborales son
informativos, un CDT efectuado es movimiento y un fondo al cierre es activo. Un
valor positivo no determina activo/pasivo. Las reglas siguen en el paquete puro;
React presenta y el repositorio aplica/persiste la superposicion manual.

### Pruebas y resultados exactos

Se añadieron casos sinteticos para facturacion, relaciones, multiplicidad,
activos/pasivos, inversiones, resumen/componentes, conciliacion, resolucion,
restauracion, obsolescencia, calidad y recarga.

| Paso                  | Comando                                 | Resultado                 |
| --------------------- | --------------------------------------- | ------------------------- |
| Typecheck             | `pnpm typecheck`                        | OK; 6 proyectos           |
| Unitarias/integracion | `pnpm test`                             | OK; 85/85 pruebas         |
| Lint                  | `pnpm lint`                             | OK; 0 warnings / 0 errors |
| Produccion            | `pnpm build`                            | OK; 5 paginas generadas   |
| E2E                   | `pnpm --filter @nexus-tax/web test:e2e` | OK; 1/1 Chromium          |

### Riesgos, pendientes y siguiente paso

Las relaciones se infieren por reglas conservadoras; un duplicado posible queda
pendiente y todavia no existe UI especifica para confirmar/rechazar la relacion
independientemente del registro. La conciliacion es preliminar y un certificado
solo aporta estado/metadatos, no valores extraidos.

Siguiente paso exacto: validar con una copia local del expediente del usuario,
sin incorporarla al repositorio, revisar cada grupo de Matriz y resolver primero
`pending_records`; despues contrastar saldos con certificados y registrar reglas
deterministas adicionales para cualquier etiqueta realmente desconocida.

## 9. Entrega: tema claro/oscuro y pulido de Registros (2026-08-01)

### Estado inicial

La app era **solo oscura** (colores fijos `text-slate-*` / `white/x`). En
Registros, la barra de filtros se amontonaba en un `flex-wrap` irregular, la
columna Clasificación se veía comprimida y el detalle expandido era una hilera de
badges sueltos.

### Cambios implementados

- **Sistema de tema claro/oscuro** con tokens semánticos por variables CSS en
  `globals.css` (`surface`, `overlay`, `content`, `tone-*`) mapeados a Tailwind.
  Se migraron ~270 clases fijas a tokens tema-conscientes (los acentos de marca se
  conservan; en claro los tonos de estado usan variantes más profundas).
- **`ThemeProvider` + `ThemeToggle`** (sol/luna en la cabecera) con persistencia en
  `localStorage`, respeto de `prefers-color-scheme` y **script inline anti-parpadeo**.
- **Badges** y **tooltips de gráficas** ahora son tema-conscientes.
- **Registros**: barra de filtros en **grilla uniforme** + "Limpiar filtros";
  columna **Clasificación** con puntos de estado de color y ancho mínimo; **detalle
  expandido reorganizado por secciones** (Clasificación, Trazabilidad,
  Consolidación, Relaciones, Uso sugerido, Columnas adicionales).

### Nota operativa

La configuración TS de Tailwind (`tailwind.config.ts`) **no se recarga en caliente**:
tras editarla hay que **reiniciar `pnpm dev`** (el `next build` sí toma los cambios).
Se añadió `.claude/launch.json` para gestionar el dev server.

### Validaciones (resultados exactos)

| Paso      | Comando              | Resultado                         |
| --------- | -------------------- | --------------------------------- |
| Typecheck | `pnpm typecheck`     | OK; 6 proyectos                   |
| Lint      | `pnpm lint`          | OK; 0 warnings / 0 errors         |
| Tests     | `pnpm test`          | OK (incluye parser 43, web 12)    |
| Build     | `pnpm build`         | OK; 5 páginas generadas           |
| Tema      | verificación en vivo | OK; conmuta dark↔light y persiste |

### Pendientes / siguiente paso

Opcionales de UI: encabezado de tabla "pegajoso" (`sticky`), densidad ajustable
(compacto/cómodo) y resaltar con anillo de acento la fila enfocada al llegar desde
Hallazgos.

## 10. Entrega: Sprint 2.0 — expediente tributario (2026-08-01)

### Estado inicial encontrado

La exógena, matriz y resoluciones ya funcionaban. También había cambios locales
recientes de tema claro/oscuro y pulido de Registros, todavía sin confirmar, que
se conservaron. `TaxCase` era mínimo; documentos solo ofrecía cuatro tipos y el
checklist enlazaba metadatos PDF. No existían coberturas multipropósito,
productos, hechos documentales ni conciliación documental.

### Implementación

- Rama dedicada: `sprint-2-tax-case`.
- Dominio v0.4.0: ciclo de vida del expediente, catálogo de 16 documentos,
  productos, coberturas, hechos con historial, sugerencias y conciliaciones.
- Dexie v4: tablas aditivas `documentBlobs`, `products`, `coverages`, `facts` y
  `reconciliations`; migración de estados de expedientes anteriores.
- Biblioteca con SHA-256, detección de duplicados, persistencia explícita,
  descarga/eliminación local, versiones y reemplazos sin romper relaciones.
- Cobertura completa, parcial, no aplicable o revisable. Un mismo certificado
  puede cubrir varios requisitos.
- Hechos manuales claramente identificados, con autoría, evidencia e historial.
- Sugerencias deterministas por entidad, categoría, valor y concepto. El estado
  conciliado exige confirmación humana.
- Panel general con cinco progresos separados, acciones rápidas y explicación
  de pendientes; secciones Entidades, Documentos, Requisitos, Hechos,
  Conciliaciones, Matriz y Hallazgos, conservando las vistas existentes.
- Manifiesto `nexustax.tax-case.manifest` 2.0.0 sin binarios.
- UI nueva construida exclusivamente con tokens semánticos para tema claro y
  oscuro.

### Seguridad y arquitectura

El soporte se guarda por defecto solo como metadatos. `store_locally` conserva
bytes únicamente en IndexedDB y `removeDocumentBinary` los elimina sin borrar
metadatos. La contraseña no existe en los esquemas persistibles. No hay red,
OCR, IA ni extracción avanzada. Los binarios nunca entran al manifiesto.

### Validaciones exactas

| Paso                  | Comando                                 | Resultado                 |
| --------------------- | --------------------------------------- | ------------------------- |
| Typecheck             | `pnpm typecheck`                        | OK; 6 proyectos           |
| Unitarias/integración | `pnpm test`                             | OK; 98/98 pruebas         |
| Lint                  | `pnpm lint`                             | OK; 0 warnings / 0 errors |
| Producción            | `pnpm build`                            | OK; 5 páginas generadas   |
| E2E                   | `pnpm --filter @nexus-tax/web test:e2e` | OK; 1/1 Chromium          |

El E2E crea el expediente, procesa exógena sintética, resuelve un hallazgo,
registra un PDF local, crea un hecho manual y comprueba persistencia tras
recargar.

### Riesgos y pendientes

- Los binarios grandes consumen la cuota del navegador; hoy se muestra el uso,
  pero no se estima la cuota disponible antes de guardar.
- Las sugerencias no interpretan PDFs: dependen de hechos digitados o importados
  y siempre requieren revisión.
- La UI confirma asociaciones sugeridas de un hecho con un registro; el dominio
  ya admite múltiples IDs, pero falta un editor avanzado de asociaciones N:M.
- El catálogo es inicial y versionado en código; nuevos formatos deben añadir
  pruebas y reglas de compatibilidad.

### Siguiente paso exacto

Probar con soportes sintéticos de varios productos para una sola entidad:
registrar certificado consolidado → asignar coberturas parciales/completas →
crear hechos por producto → revisar sugerencias → confirmar diferencias →
exportar el manifiesto y verificar `includesBinaryData: false`. Después diseñar
el editor N:M antes de cualquier extractor PDF.

## 11. Entrega: Sprint 2.0.1 — checklist laboral (2026-08-01)

### Estado inicial

El checklist generaba un requisito independiente de Formulario 220 por entidad.
No existía un agregado laboral que conservara empleadores, períodos, documento
principal, complementos y cobertura por instancia. Tampoco había una guía
funcional reproducible ni una convención oficial de commits.

### Implementación

- Dominio v0.4.1 con `EmploymentIncomeGroup` y `EmployerInstance`; máximo de
  tres instancias activas, estados explícitos, documento enmascarado, período,
  entidad, 220 principal, complementos y trazabilidad temporal.
- Detección pura de empleadores por concepto laboral o categoría de entidad,
  deduplicada por identificación y nombre normalizado. Varios conceptos de la
  misma entidad crean una sola instancia.
- Las entidades adicionales al límite se conservan y producen un hallazgo
  informativo; no se descartan silenciosamente.
- Dexie v5 agrega `employmentGroups`; creación automática al procesar,
  persistencia tras recarga, edición manual y borrado transaccional.
- El Formulario 220 salió del checklist genérico. El grupo laboral permite
  agregar una segunda o tercera instancia, marcar no aplica, eliminar, editar
  período y asociar entidad y documentos.
- Un 220 cubre una sola instancia. Los complementos generan cobertura parcial y
  el certificado consolidado exige confirmación expresa con advertencia.
- La vista por entidad muestra el 220 asociado sin crear otro requisito.
- Manifiesto `nexustax.tax-case.manifest` 2.0.1 incluye el grupo laboral y sigue
  excluyendo binarios.
- Se crearon `docs/SPRINT_2_VALIDATION.md` y
  `docs/COMMIT_CONVENTIONS.md`; AGENTS y CLAUDE exigen el estándar.

### Validaciones exactas

| Paso                  | Comando                                 | Resultado                 |
| --------------------- | --------------------------------------- | ------------------------- |
| Typecheck             | `pnpm typecheck`                        | OK; 6 proyectos           |
| Unitarias/integración | `pnpm test`                             | OK; 110/110 pruebas       |
| Lint                  | `pnpm lint`                             | OK; 0 warnings / 0 errors |
| Producción            | `pnpm build`                            | OK; 5 páginas generadas   |
| E2E                   | `pnpm --filter @nexus-tax/web test:e2e` | OK; 1/1 Chromium          |

El E2E comprueba detección laboral, ausencia del 220 duplicado, creación de una
segunda instancia y persistencia después de recargar, además del flujo completo
del Sprint 2.0.

### Riesgos y siguiente paso

La interfaz limita deliberadamente la edición activa a tres empleadores; los
adicionales quedan exportados para una ampliación futura. Los períodos y la
equivalencia de un certificado consolidado requieren decisión humana porque no
se interpretan PDFs.

Siguiente paso exacto: ejecutar la matriz manual de
`docs/SPRINT_2_VALIDATION.md` con fixtures sintéticos de uno, dos, tres y cuatro
empleadores; registrar evidencia local y priorizar cualquier diferencia antes
de ampliar el límite o diseñar extracción documental.

## 12. Entrega: Sprint 2.0.2 — navegación guiada (2026-08-01)

### Estado inicial

El expediente exponía doce pestañas React en una barra horizontal. No había
rutas por vista, restauración de navegación, progresión explícita ni un punto de
entrada claro para un caso nuevo. La carga exógena era efímera, pero la UI no
diferenciaba con precisión la fuente de sus resultados derivados.

### Implementación

- Seis etapas: Fuente, Extracción, Organización, Conciliación, Declaración y
  Exportación, con vistas contextuales y estados explicados.
- Motor puro y determinista para disponibilidad, destino válido y siguiente
  acción; Formulario 210 e Historial permanecen deshabilitados como futuros.
- Rutas estables por etapa/vista, breadcrumb, restauración del último destino
  válido y foco transferido al contenido.
- Inicio en Fuente, modo manual confirmado, resumen de fuente con SHA-256 local y
  acciones confirmadas de reemplazo/eliminación.
- Eliminación selectiva: invalida resultados exógenos, conserva documentos y
  hechos manuales.
- Dexie v6 con `navigationStates`; manifiesto 2.0.2 con estado del flujo.
- Stepper en grilla y selectores móviles, sin carrusel horizontal; estados no
  dependientes solo del color y respeto por movimiento reducido.
- Documentación nueva: `EXPEDIENT_WORKFLOW.md` y `NAVIGATION_STAGES.md`.

### Validaciones exactas

| Paso                  | Comando                                             | Resultado                 |
| --------------------- | --------------------------------------------------- | ------------------------- |
| Typecheck             | `pnpm typecheck`                                    | OK; 6 proyectos           |
| Unitarias/integración | `pnpm test`                                         | OK; 122/122 pruebas       |
| Lint                  | `pnpm lint`                                         | OK; 0 warnings / 0 errors |
| Producción            | `pnpm build`                                        | OK; 5 páginas generadas   |
| E2E                   | `pnpm test:e2e -- apps/web/tests-e2e/smoke.spec.ts` | OK; 2/2 Chromium          |

### Riesgos y siguiente paso

El archivo original sigue sin persistirse: al recargar antes de procesar debe
seleccionarse de nuevo, por diseño de privacidad. El modo manual no habilita
conclusiones que requieren exógena. Formulario 210 e Historial no tienen lógica.

Siguiente paso exacto: ejecutar la matriz manual actualizada en cinco anchos,
validar reemplazo/eliminación con datos sintéticos y registrar evidencia antes
de ampliar reglas, múltiples fuentes o capacidades futuras.

## Experiencia: tema oscuro, navegación fluida y rediseño de documentos (2026-08-01)

### Estado inicial

La app seguía la preferencia del sistema (a veces abría en claro). Al cambiar de
paso, `applyDestination` hacía `router.push` además de actualizar el estado
local: eso disparaba una navegación RSC completa en cada cambio (parpadeo, "se ve
la anterior", salto de scroll y 400 intermitente en navegaciones rápidas). Las
vistas de documentos y valores eran planas: muros de campos y casillas
`Entidad · Documento` repetidas.

### Cambios implementados

- **Modo oscuro por defecto**: el script anti-parpadeo ya no consulta
  `prefers-color-scheme`; abre en oscuro salvo preferencia explícita guardada.
- **Navegación sin recarga**: la URL de etapa/vista se actualiza con la History
  API (`pushState`/`replaceState`, soportada por Next 14.2), no con el router.
  Se eliminó el parpadeo, el salto de scroll (`focus({ preventScroll })`) y el
  400 intermitente. Se añadió sincronización con atrás/adelante (`popstate`).
- **Rediseño de vistas de documentos y valores** (helper `entityVisuals`):
  - `RequirementsPanel`: agrupado por entidad, iconos por categoría, progreso y
    asociación de documentos expandible (menos saturación).
  - `DocumentsPanel`: zona de carga drag & drop, "Requisitos que cubre" agrupado
    por entidad (sin repetir el prefijo) e iconos por tipo de documento.
  - `FactsPanel`: formulario por secciones (Qué registras / Origen / Vínculo /
    Clasificación avanzada colapsable) con formato de moneda en vivo y `optgroup`
    por entidad.
  - `EmploymentIncomeGroupPanel`: tarjetas de empleador con cabecera de estado,
    subsecciones (Datos / Formulario 220 / Complementarios / Observaciones) y
    acciones con icono.

### Nota operativa

No ejecutar `pnpm build` mientras `pnpm dev` está activo: ambos comparten `.next`
y el build desincroniza el CSS del dev server (página sin estilos). Recuperación:
refresco fuerte del navegador o reiniciar `pnpm dev`. Verificación durante dev
solo con `typecheck` y `lint`.

### Validaciones

| Paso      | Comando              | Resultado                      |
| --------- | -------------------- | ------------------------------ |
| Typecheck | `pnpm typecheck`     | OK; 6 proyectos                |
| Lint      | `pnpm lint`          | OK; 0 warnings / 0 errors      |
| Tema      | verificación en vivo | OK; abre en oscuro por defecto |

### Pendiente

Rediseño del `UploadPanel` (cargues) con estados animados, alineado con la
biblioteca documental.

## 13. Entrega: Sprint 2.0.3 — fuentes aceptadas y consistencia UX (2026-08-01)

### Estado recibido

Antes de este sprint, Claude había corregido la navegación RSC, establecido el
modo oscuro predeterminado y rediseñado Documentos, Requisitos, Hechos y el
grupo laboral. Esos cambios se conservaron. Quedaban enums visibles, dos
dropzones duplicados, un input PDF aislado y ningún contrato para aceptar
provisionalmente un valor exógeno o justificar un soporte no emitido.

### Implementación

- Dominio 0.5.0: fuentes de información, aceptación exógena, diez estados,
  motivos, reconocimiento de ganancias ocasionales, gestión de requisito no
  emitido e historiales.
- Dexie v7 agrega `acceptedSources` y `requirementSourceDecisions` sin cambiar
  claves ni valores existentes. El manifiesto 2.0.3 exporta valor original,
  provisional, motivo, regla, requisito, reemplazo e historial; no exporta
  binarios.
- Aceptación disponible desde Requisitos, Hechos, Conciliaciones, Matriz y
  Hallazgos. “Otro motivo” y “cobrado para un tercero” exigen explicación.
- Flujo de premio propio, operación no reconocida y cobro para tercero. Nunca
  calcula impuesto, presume base gravable ni excluye automáticamente.
- Una conciliación humana con un hecho respaldado por documento marca la fuente
  como respaldada, contradicha o no comparable y conserva el historial.
- La aceptación anota el registro ya presente: no crea otro hecho sumable ni
  cambia la matriz, evitando doble conteo.
- Catálogos en español para relaciones, coberturas, métodos, revisiones,
  conciliaciones, fuentes, decisiones, entidades, documentos y estados. Se
  corrigieron `active`, estados con guion bajo, categorías de entidad, métodos,
  revisiones, conciliaciones y códigos técnicos visibles.
- `FileDropzone` unifica exógena, biblioteca y PDF de requisito con clic,
  teclado, drag/drop, selección, reemplazo, quitar, formato, tamaño, privacidad,
  error, deshabilitado y progreso.
- Quality gate y microcopy obligatorios para Claude y Codex.

### Validaciones exactas

| Paso                  | Comando                                             | Resultado                        |
| --------------------- | --------------------------------------------------- | -------------------------------- |
| Typecheck             | `pnpm typecheck`                                    | OK; 6 proyectos                  |
| Unitarias/integración | `pnpm test`                                         | OK; 133/133 pruebas              |
| Lint                  | `pnpm lint`                                         | OK; 0 warnings / 0 errors        |
| Producción            | `pnpm build`                                        | OK; 5 páginas generadas          |
| E2E                   | `pnpm test:e2e -- apps/web/tests-e2e/smoke.spec.ts` | OK; 2/2 Chromium                 |
| Visual                | capturas Playwright locales                         | OK; oscuro 1440/390 y claro 1440 |

### Riesgos, pendientes y siguiente paso

La coincidencia con un documento posterior depende de hechos digitados y de una
confirmación humana; no se interpreta el PDF. El alias de un tercero es opcional
y deliberadamente no exige identificación sensible. Las fuentes futuras
asistidas permanecen deshabilitadas.

Siguiente paso: validar manualmente con fixtures sintéticos un valor igual, uno
contradictorio y uno no comparable; revisar la exportación 2.0.3 y después
diseñar, sin OCR todavía, un editor N:M de fuentes y documentos.

## 14. Corrección: modales de requisitos fuera de las tarjetas (2026-08-01)

### Problema y causa

Los diálogos de “La entidad no emite este soporte” y “Usar valor de la exógena
provisionalmente” se montaban dentro de las tarjetas animadas de Requisitos. El
`transform` de Framer Motion convertía ese ancestro en el contenedor del
posicionamiento `fixed` y el `overflow-hidden` de `GlassPanel` recortaba el
contenido, especialmente en ganancias ocasionales.

### Implementación

- `ModalPortal` monta ambos diálogos directamente en `document.body`.
- El panel limita su alto con unidades de viewport dinámico y conserva scroll
  vertical y `overscroll-contain`, sin depender de la tarjeta de entidad.
- Mientras el diálogo está abierto se bloquea el scroll del fondo; Escape y los
  controles visibles permiten cerrarlo, y el foco entra al diálogo.
- Playwright acepta `PLAYWRIGHT_BASE_URL` para validar contra un servidor de
  desarrollo ya activo sin reconstruir ni alterar su directorio `.next`.

### Validaciones exactas

| Paso                  | Comando                                                                                               | Resultado                   |
| --------------------- | ----------------------------------------------------------------------------------------------------- | --------------------------- |
| Typecheck             | `pnpm typecheck`                                                                                      | OK; 6 proyectos             |
| Unitarias/integración | `pnpm test`                                                                                           | OK; 134/134 pruebas         |
| Lint                  | `pnpm lint`                                                                                           | OK; 0 warnings / 0 errors   |
| E2E                   | `$env:PLAYWRIGHT_BASE_URL='http://localhost:3000'; pnpm test:e2e -- apps/web/tests-e2e/smoke.spec.ts` | OK; 2/2 Chromium            |
| Visual                | captura Playwright del modal en Requisitos                                                            | OK; panel completo y scroll |

No se ejecutó `pnpm build` porque había una sesión `pnpm dev` activa y
ambos procesos comparten `.next`; el build queda cubierto por el quality gate al
cerrar esa sesión.

## 15. Entrega: Sprint 2.1 — extracción documental local y asistida (2026-08-01)

### Estado inicial

`main` ya contenía expediente Sprint 2.0.3, documentos/binarios locales, hechos,
coberturas, fuentes aceptadas, conciliación y matriz. No existían lector PDF,
sesiones de extracción, candidatos, adaptadores ni revisión. Los adjuntos eran
metadatos/binarios y los hechos se registraban manualmente.

### Decisiones y arquitectura

- Se creó `@nexus-tax/document-intelligence`, puro respecto de React, Dexie y la
  matriz. Separa lector, normalizador, clasificador, adaptadores, matching,
  pipeline, límites y contratos.
- Se eligió `pdfjs-dist` 5.4.624 por su lectura desde bytes, worker,
  `onPassword`, progreso y destrucción de recursos. Para compatibilidad con
  Next 14, `predev`/`prebuild` copian sus módulos al mismo origen y el navegador
  los importa sin transformación Webpack; no se usa CDN.
- Node mínimo sube a 20.16 por la versión elegida. Los límites son 25 MiB, 250
  páginas, 500 candidatos y 120 segundos.
- Dexie v8 agrega `extractionSessions` y `documentCandidates`. El manifiesto
  2.1.0 exporta trazabilidad mínima con `includesFullText: false` e
  `includesPasswords: false`.
- El candidato es distinto del hecho. Solo `confirm` crea `DocumentFact` con
  captura `assisted`; correcciones sustanciales exigen observación y conservan
  antes/después. Reprocesar crea una sesión nueva y deja candidatos previos
  obsoletos sin borrar decisiones.
- La vista **Revisión de extracción** permite corregir tipo, reprocesar,
  confirmar/corregir/rechazar/restaurar y asociar entidad, producto, requisito y
  registro exógeno. La conciliación sigue requiriendo confirmación separada.

### Modelos, adaptadores y privacidad

Se añadieron `DocumentExtractionSession`, `DocumentFactCandidate`,
`DocumentClassification`, hallazgos y decisiones. Los adaptadores v1 cubren
Formulario 220, certificado financiero multipropósito, deuda, saldos, intereses
de vivienda, cesantías y predial; un octavo extractor concepto–valor actúa como
fallback de baja confianza.

La contraseña vive solo en estado de UI durante el intento. No se persisten
buffers, workers, objetos PDF ni texto completo; la evidencia se limita a un
fragmento. Marcar el documento obsoleto elimina binario, sesiones y candidatos.
La prueba de navegador afirma cero solicitudes HTTP fuera del origen local
durante la extracción.

### Validaciones exactas

| Paso                                                                              | Resultado                                                                    |
| --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `pnpm typecheck`                                                                  | OK; 7 de 8 proyectos del workspace, 0 errores                                |
| `pnpm test`                                                                       | OK; 153/153 pruebas (11 dominio, 26 Aegis, 14 documentos, 43 parser, 59 web) |
| `pnpm lint`                                                                       | OK; 0 warnings / 0 errors                                                    |
| `NEXUSTAX_NEXT_DIST_DIR=.next-build pnpm build`                                   | OK; compilación y 5 páginas generadas                                        |
| `PLAYWRIGHT_BASE_URL=http://localhost:3000 pnpm --filter @nexus-tax/web test:e2e` | OK; 2/2 Chromium                                                             |
| Visual                                                                            | capturas sintéticas de revisión a 1280 px y 390 px, sin overflow             |

El build aislado evita competir con el `pnpm dev` activo en `.next`. Los tests
PDF usan archivos sintéticos creados en memoria; no se añadió información
tributaria real.

### Riesgos, no soportado y siguiente paso

- PDF.js advierte en fixtures Node sobre `standardFontDataUrl`; no afecta la
  extracción de texto, pero debe configurarse si futuros adaptadores dependen de
  renderizado o fuentes estándar.
- No hay OCR: PDF escaneado, imagen, estructura dañada o cifrado no resuelto
  termina con salida recuperable y registro manual. Tampoco hay anotación visual
  exacta, IA, backend ni cálculo del Formulario 210.
- Los adaptadores son genéricos; variantes de emisores reales deben incorporarse
  únicamente mediante fixtures anonimizados/sintéticos y reglas versionadas.
- La comparación entre ejecuciones existe en datos, pero la UI solo muestra la
  última por documento; una comparación lado a lado queda pendiente.

**Siguiente paso exacto:** probar localmente certificados sintéticos con tablas
y etiquetas partidas en varios bloques, ampliar fixtures por adaptador y diseñar
una comparación de ejecuciones antes de evaluar OCR local.

## 16. Identidad visual: icono y marca de cabecera (2026-08-01)

Se incorporaron los PNG entregados por el propietario del proyecto: el isotipo
vive como `apps/web/src/app/icon.png` y Next lo publica como icono de pestaña; la
marca horizontal vive en `apps/web/public/branding/nexustax-home.png` y reemplaza
la marca anterior en la cabecera global. Los originales conservan transparencia
y no se modificaron; la cabecera recorta visualmente sus márgenes con CSS y
superpone el subtítulo usando tokens semánticos para mantener contraste en ambos
temas.

Validación: typecheck web OK, lint web sin advertencias, ruta `rel="icon"`
generada por Next y smoke responsive Chromium OK sin desbordamiento horizontal.

## 17. Corrección: descarte y extracción financiera por producto (2026-08-01)

### Problemas reproducidos

- Rechazar, marcar duplicado o dejar un candidato como informativo guardaba la
  decisión, pero la tarjeta seguía ocupando la revisión activa.
- Una frase explicativa sobre el artículo 115 ET producía el falso importe
  `$115`; numeraciones, años y porcentajes también podían parecer dinero.
- Los certificados financieros con tablas perdían la relación entre producto,
  columna e importe. Una carga posterior resultaba poco clara porque la sesión
  anterior seguía dominando visualmente la revisión.

### Implementación y decisiones

- Los estados descartados se ocultan de inmediato y quedan en una sección
  plegable, restaurable y trazable. Los obsoletos permanecen como evidencia de
  una ejecución sustituida, sin acción de restauración.
- El adaptador financiero sube a 1.1.0. El detector monetario excluye referencias
  normativas, porcentajes, años y numeración de apartados; además evita duplicar
  totales cuando ya existen filas de detalle.
- La posición de los bloques PDF permite reconstruir columnas y encabezados de
  una o varias líneas. Cada candidato conserva `productLabel`, evidencia, regla,
  página y columna conceptual; la UI muestra los productos detectados.
- El pipeline intenta asociar el producto detectado con los productos del caso
  mediante tipo, etiqueta y entidad. La sugerencia nunca confirma ni crea un
  hecho automáticamente.
- El flujo E2E carga dos PDFs sintéticos consecutivos y comprueba que la segunda
  sesión presenta sus propios valores. No se añadieron documentos tributarios
  reales al repositorio.

### Cobertura incorporada

Se añadieron fixtures sintéticos para referencias legales, certificados de
fondos de empleados, tablas financieras posicionadas, encabezados partidos y
asociación de producto. El navegador valida rechazo, ocultamiento, restauración
y sustitución por una nueva carga.

### Validaciones exactas

| Paso                                                                                                         | Resultado                                                                    |
| ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| `pnpm typecheck`                                                                                             | OK; 7 de 8 proyectos del workspace, 0 errores                                |
| `pnpm test`                                                                                                  | OK; 158/158 pruebas (11 dominio, 26 Aegis, 19 documentos, 43 parser, 59 web) |
| `pnpm lint`                                                                                                  | OK; 0 warnings / 0 errors                                                    |
| `NEXUSTAX_NEXT_DIST_DIR=.next-build pnpm build`                                                              | OK; compilación y 6 rutas generadas                                          |
| `PLAYWRIGHT_BASE_URL=http://localhost:3000 pnpm --filter @nexus-tax/web test:e2e -- tests-e2e/smoke.spec.ts` | OK; 2/2 Chromium                                                             |

### Riesgos y siguiente paso

El motor sigue siendo local y determinista, sin OCR ni IA. Un PDF escaneado o
una tabla cuya capa de texto no conserve posiciones requiere registro manual.
Los formatos nuevos deben incorporarse con ejemplos anonimizados o fixtures
sintéticos; no se deben codificar nombres de emisores ni datos personales.

**Siguiente paso exacto:** validar documentos reales únicamente en el navegador
del usuario, registrar qué columnas o etiquetas no se reconocen y convertir
esas variantes en fixtures sintéticos antes de extender otra regla.

---

## Sprint 2.1.1 — estabilización documental y pendientes accionables

### Estado

- El extractor ya no corta candidatos en `maxCandidates`; registra advertencia y conserva el total.
- La sesión audita páginas, bloques, secciones, candidatos generados/persistidos y estados.
- La revisión pagina 10/20/50/100, filtra, conserva historial y soporta decisiones masivas.
- El rechazo exige motivo y el reproceso empareja por firma estable para no reactivar descartes.
- La identidad separa NIT, razón social, marca, grupo y producto; Bancolombia, Fiduciaria
  Bancolombia y Nequi conservan entidades independientes.
- Los requisitos cubiertos por otros soportes se ocultan por defecto y coberturas inválidas se
  recalculan al reemplazar u obsoletar.
- `CaseTask` y la vista `Pendientes del expediente` entregan acciones con destino concreto.
- Obligación legal y preparación operativa se presentan como conceptos independientes.

### Decisiones y riesgos

La detección de tabla es deliberadamente simple y determinista; no sustituye revisión humana. El
catálogo de alias es versionado y nunca fusiona NIT diferentes. Las tareas son derivadas: cuando una
causa desaparece se marcan resueltas para preservar auditoría. No se incorporaron OCR, red, backend
ni IA externa.

### Validación

Fixtures exclusivamente sintéticos cubren 550 candidatos sin pérdida, líneas/columnas/secciones,
productos ambiguos, identidad Grupo Bancolombia, tareas, persistencia, rechazo, restauración y
reproceso. El smoke Playwright añade un PDF de 55 candidatos, paginación y operación masiva.

Validación cerrada: `pnpm typecheck`, `pnpm test` (165 pruebas), `pnpm lint`, `pnpm build` y
`pnpm --filter @nexus-tax/web test:e2e` (2 escenarios Chromium) finalizan correctamente. El smoke
incluye capturas de escritorio/móvil, ausencia de scroll horizontal y revisión paginada de 55
candidatos.

**Siguiente paso exacto:** validar documentos reales únicamente en el navegador del usuario y
convertir cualquier nueva variante observada en un fixture sintético antes de modificar reglas.

## 18. Diseño previo — Sprint 2.2: laboratorio documental, OCR local y calibración (2026-08-02)

### Por qué existe esta sección

AGENTS.md exige no avanzar hacia OCR sin diseñarlo y validarlo antes. Esta entrada es ese diseño:
se escribió y se acordó con el propietario del proyecto antes de tocar código, sobre la rama
`feature/sprint-2.2-document-lab-ocr` creada desde `main` (limpio, con Sprint 2.1.1 ya integrado).

### Estado real encontrado (evita repetir trabajo)

- Ya existe modelo geométrico completo (bloques, líneas, columnas, secciones, tablas simples) desde
  2.1.1 en `packages/document-intelligence/src/structure.ts` y `contracts.ts`. El diagnóstico por
  página de este sprint se **extiende** sobre ese modelo, no lo reemplaza.
- `DocumentPageRepresentation.readConfidence` ya distingue `high/low/insufficient`, pero el valor
  `medium` está declarado en el tipo y nunca se asignaba en `reader.ts`; el diagnóstico de tipo de
  PDF debe corregir ese hueco.
- La extracción posicional "por producto" (Sprint 2.1.1, adaptador financiero 1.1.0) ya reconstruye
  columnas por coordenadas x/y; el futuro laboratorio de zonas se apoyará en esa heurística existente.
- `CaseTask` no tiene campo de página; las tareas del tipo "página requiere OCR" necesitarán una
  migración de esquema, no solo una regla nueva.
- Los adaptadores comparten una única constante de versión y `selectAdapter` no usa
  `activationSignals`; "perfil documental" (fases futuras) es un concepto nuevo, no una extensión
  del adaptador actual.
- No existe hoy worker para PDF (el análisis corre en el hilo principal); solo el parser de exógena
  usa Web Worker (`apps/web/src/workers/parser.worker.ts`), que sirve de patrón a replicar.
- `DocumentExtractionSessionSchema.textPersisted` es `z.literal(false)`: OCR y laboratorio deben
  seguir sin persistir texto completo.

### Decisión técnica: OCR

**Tesseract.js** (Apache-2.0), vendorizado localmente sin CDN igual que `pdfjs-dist` (assets en
`apps/web/public/vendor/tesseract`, copiados en `predev`/`prebuild`), con `spa.traineddata` variante
"fast" (~2.2 MB) como opción por defecto; una variante de mayor calidad queda para una fase futura y
solo bajo pedido explícito del usuario, nunca descarga automática. El motor de OCR se orquesta desde
`apps/web` (worker de aplicación); `packages/document-intelligence` se mantiene puro y solo define el
contrato unificado de tokens y las funciones de comparación nativo/OCR — nunca instancia un Worker ni
toca el DOM.

### Alcance de este bloque (Fases A, B y C)

El pedido completo (34 secciones: diagnóstico, OCR, laboratorio visual, perfiles documentales,
feedback de calibración, tareas, métricas, exportación, corpus sintético, E2E) excede un solo bloque
de trabajo razonable. Se ejecuta en fases dentro de la misma rama, cada una con su propio commit y
validación (`pnpm typecheck/lint/test/build`):

- **Fase A** — Corrección de codificación: script `check:encoding` (detecta mojibake en
  ts/tsx/js/json/md/yml) y auditoría real del repo.
- **Fase B** — Diagnóstico de tipo de PDF y de página (textual/escaneado/híbrido/protegido/dañado),
  usando y corrigiendo `readConfidence`, expuesto en `DocumentExtractionSession` (migración Dexie).
- **Fase C** — OCR local bajo demanda: Tesseract.js vendorizado, worker con progreso/cancelación/
  watchdog, contrato unificado texto nativo/OCR, comparación de fuentes, preprocesamiento de imagen,
  auditoría de cero solicitudes de red.

Fases D (laboratorio documental visual), E (perfiles y calibración), F (tareas/métricas/exportación/
fallos) y G (corpus sintético completo, E2E de 14 pasos, rendimiento, documentación final) quedan
para bloques posteriores, documentadas en la conversación de diseño pero no implementadas aún.

### Riesgos identificados antes de implementar

- Tesseract.js no reduce automáticamente el tamaño de imagen antes de procesarla y su heap WASM solo
  crece (nunca decrece) durante la vida del worker; hay que limitar resolución y recrear el worker
  entre documentos grandes, especialmente en móvil.
- Cualquier variante de mayor calidad del modelo de español pesa ~13 MB; no debe descargarse nunca
  automáticamente ni desde un CDN en tiempo de ejecución.
- La migración Dexie debe ser aditiva (no romper sesiones de extracción ya persistidas de 2.1.1).

### Cierre de Fases A, B y C (2026-08-02)

**Fase A** — `scripts/check-encoding.mjs` (Node puro) detecta mojibake por patrón de bytes
(UTF-8 reinterpretado como Latin-1/Windows-1252, carácter de reemplazo Unicode) y se expone como
`pnpm check:encoding`. Encontró y permitió corregir 31 coincidencias reales de codificación dañada
en 6 archivos (tildes/eñes/¿?/· rotos) que venían de un editor o copia intermedia anterior; ninguna
eran datos tributarios, solo texto de interfaz y mensajes.

**Fase B** — `diagnosePdfDocument` (`document-intelligence`) clasifica documento y página como
textual/escaneado/texto insuficiente/dañado a partir de `readConfidence` (que por fin asigna
`'medium'`, declarado desde 2.1.1 pero nunca usado) y los errores de lectura existentes. Se expone
como campo opcional de `DocumentExtractionSession`; no requirió migración de Dexie. La detección de
imágenes grandes por página queda fuera de este cambio (ver más abajo).

**Fase C** — Se agregó `tesseract.js` 7.0.0 vendorizado sin CDN (`docs/ARCHITECTURE.md` documenta la
justificación) y `OcrClient` en `apps/web`, que reutiliza el Web Worker interno de Tesseract con
watchdog, timeout, cancelación por `AbortSignal` y un único trabajo local concurrente (el heap WASM
de Tesseract solo crece durante la vida del worker). Escribir las pruebas de `OcrClient` encontró y
corrigió dos bugs reales antes de que llegaran a producción: el watchdog comparaba con `>` en vez de
`>=` (nunca disparaba en el límite exacto) y una señal de cancelación ya abortada antes de registrar
el listener de `abort` nunca rechazaba la promesa. `document-intelligence` gana `UnifiedTextToken`
(contrato común nativo/OCR), `compareTextSources` (los seis estados del punto 9 del pedido original,
sin fusionar nunca dos valores en conflicto), preprocesamiento de imagen puro (escala, contraste,
escala de grises, binarización, rotación en múltiplos de 90°, recorte de márgenes, mediana 3x3 para
ruido) y `recommendOcrPages` (recomienda página por página sin ejecutar OCR automáticamente, con
estimación cualitativa rápida/moderada/intensiva).

**Deliberadamente fuera de este bloque** (para no entregar código sin poder verificarlo):

- **Detección de imágenes grandes por página**: requiere interpretar el `operatorList` de PDF.js con
  su pila de transformaciones geométricas; se evaluó y se decidió no improvisarla sin poder
  verificarla visualmente. El diagnóstico de página usa señales de cobertura de texto, que ya
  distinguen escaneado/textual de forma confiable.
- **Renderizado de página a `<canvas>` para alimentar OCR real sobre un PDF**: `reader.ts` solo
  extrae texto hoy, nunca renderiza píxeles. Esta pieza conecta naturalmente con la Fase D (el
  laboratorio documental necesita renderizar la página de todos modos para mostrarla), así que se
  deja para entonces en vez de construirla sin una vista que la ejercite.
- Como consecuencia de lo anterior, **`reader.ts` sigue lanzando `no_text` cuando ninguna página
  tiene texto**: un PDF totalmente escaneado nunca llega a generar una `DocumentRepresentation` hoy.
  Antes de que el flujo de OCR bajo demanda sea utilizable de punta a punta, ese `throw` debe
  relajarse (Fase D), porque hoy le impide a `diagnosePdfDocument` siquiera evaluar ese caso.
- Corrección automática de orientación: requeriría el motor "legacy" de Tesseract (`osd`); se dejó
  `rotateQuarterTurns` como corrección manual seleccionada por el analista.

### Validación exacta (2026-08-02)

| Paso | Resultado |
| --- | --- |
| `pnpm typecheck` | OK; 7 de 8 proyectos del workspace, 0 errores |
| `pnpm lint` | OK; 0 warnings / 0 errors |
| `pnpm test` | OK; 204/204 pruebas (11 dominio, 26 Aegis, 55 document-intelligence, 44 parser, 68 web) |
| `NEXUSTAX_NEXT_DIST_DIR=.next-build pnpm build` | OK; compilación y 7 rutas generadas |
| `pnpm check:encoding` | OK; 236 archivos revisados, 0 mojibake |

No se ejecutó `pnpm --filter @nexus-tax/web test:e2e` en este cierre: no se tocó ninguna vista ni
flujo de UI en las Fases A-C (todo el trabajo fue dominio, paquete puro y un cliente de aplicación sin
componentes React), así que no hay superficie nueva que el E2E existente pueda ejercitar; se retoma en
la Fase D, que sí agrega UI.

**Siguiente paso exacto:** con aprobación explícita, continuar con la Fase D (laboratorio documental),
que debe primero relajar el `throw` de `no_text` en `reader.ts` y agregar el renderizado de página a
`<canvas>` antes de construir la vista, ya que ambas piezas se necesitan para que el flujo de OCR bajo
demanda sea utilizable de punta a punta.

## 19. Entrega: Fases D y E — laboratorio documental, OCR real y perfiles (2026-08-02)

### Fase D — Laboratorio documental

Se relajó el `throw` de `no_text` en `reader.ts` (bloqueaba que `diagnosePdfDocument` evaluara el
caso más común de un documento escaneado) y se agregó `apps/web/src/lib/pdfPageRenderer.ts`, que
renderiza una página específica a píxeles usando el mismo módulo vendorizado de PDF.js que ya usa el
lector de texto.

Nueva vista `laboratorio` en la etapa Organización (`DocumentLabPanel.tsx`): selección de documento y
página, diagnóstico por página, modo básico/avanzado, ejecución de OCR local bajo demanda (con
progreso, cancelación y comparación de texto nativo contra OCR vía `compareTextSources`), overlay SVG
de capas (tokens nativos, tokens OCR, candidatos, con bordes sólidos/punteados/círculos para no
depender solo del color) y selección manual de campo que crea un `DocumentFactCandidate` real vía
`createManualDocumentCandidate` (nueva función en `repository.ts`), pasando por la revisión normal.

**Bugs reales encontrados y corregidos durante la verificación en navegador** (no solo compilación):

- Un servidor de Playwright de una validación anterior quedó vivo en el puerto 3101 tras un `kill`
  que no llegó al proceso real (particularidad de Windows/Git Bash con procesos hijos); el nuevo
  intento de arranque fallaba en silencio y el servidor viejo servía un build ya borrado, devolviendo
  500 en todos los assets. Se diagnosticó con capturas de consola del navegador antes de asumir un bug
  de código, y se documenta aquí porque puede repetirse: verificar `netstat` por el PID real antes de
  reintentar un `next start` en un puerto que debería estar libre.
- La vista previa de página ocupaba toda la altura del PDF (rectángulo casi vacío enorme en páginas
  con poco contenido); se limitó a `max-h-[70vh]` con scroll interno tras verlo en una captura real.
- `getByLabel('Concepto')` en el E2E coincidía también con el `<select>` de "Campo" porque Playwright
  arma el nombre accesible de un `<label>` concatenando el texto de todas sus opciones internas; se
  corrigió usando `getByRole` con el rol específico de cada campo.
- De paso, se corrigieron tres aserciones obsoletas en `smoke.spec.ts` (preexistentes, no
  relacionadas con este sprint): la pregunta de responsabilidad de IVA pasó de un `<select>` a tres
  botones en un sprint anterior sin actualizar el E2E.

### Fase E — Perfiles documentales y calibración

`DocumentProfile` y `ExtractionFeedback` (`packages/domain`), Dexie v10. Ambas tablas viven a nivel de
instalación, no de expediente: un perfil debe reconocerse en expedientes de años distintos, así que
`caseId` se dejó fuera deliberadamente (`entityId` queda como indicio, no como clave estable entre
expedientes). El catálogo de "campo capturable" (entidad/NIT/producto/fecha/concepto/valor/
retención/saldo/deuda/ingreso/otro) se movió a `DocumentCapturedFieldSchema` en el dominio para que el
candidato manual y los perfiles compartan la misma fuente de verdad.

`computeDocumentProfileSignals` y `matchDocumentProfiles` (`document-intelligence`, puro) comparan
dimensiones, número de páginas, secciones y encabezado con pesos fijos y explicables (25% cada uno);
nunca asocian solo por nombre de archivo y excluyen perfiles obsoletos. El laboratorio muestra las
coincidencias con su confianza y motivos, y permite crear un perfil en borrador desde el documento
actual — activarlo, probarlo u obsoletarlo sigue siendo una acción aparte
(`updateDocumentProfileStatus`), nunca automática. La selección manual de campo ahora también registra
un `ExtractionFeedback` con el alcance que el analista elige (solo este documento / sugerencia para
similares / actualización de perfil); ninguna de las tres opciones aplica nada por sí sola.

**Deliberadamente fuera de este bloque:**

- Editor de zonas por arrastre (dibujar un rectángulo a mano): las zonas de un perfil existen en el
  modelo (`DocumentProfileZone`, coordenadas relativas 0-1) pero hoy no hay UI para crearlas
  dibujando; un perfil nuevo se crea con `zones: []`. Encaja mejor como iteración sobre el overlay ya
  construido que como trabajo nuevo desde cero.
- Aplicar automáticamente las zonas de un perfil activo para pre-rellenar candidatos: el perfil se
  sugiere y se puede crear, pero todavía no alimenta la extracción — es el siguiente enganche natural
  una vez que existan perfiles reales probados con documentos similares.
- Registrar feedback desde las acciones de corrección/rechazo de `DocumentExtractionReviewPanel.tsx`
  (el panel de revisión ya existente y muy probado): se priorizó no tocar ese componente bajo presión
  de tiempo. El feedback sí se registra desde la selección manual de campo del laboratorio (mismo
  espíritu, menor riesgo de regresión).
- Precedencia de estrategias expuesta al usuario (perfil exacto > adaptador específico > genérico >
  OCR/manual): existe como orden conceptual documentado, pero no hay todavía un campo visible que
  diga "este candidato salió de un perfil" — los candidatos manuales sí distinguen
  `adapterId: 'manual.lab'` como estrategia identificable.

### Validación exacta (2026-08-02)

| Paso | Resultado |
| --- | --- |
| `pnpm typecheck` | OK; 7 de 8 proyectos del workspace, 0 errores |
| `pnpm lint` | OK; 0 warnings / 0 errors |
| `pnpm test` | OK; 219/219 pruebas (13 dominio, 26 Aegis, 61 document-intelligence, 44 parser, 75 web) |
| `NEXUSTAX_NEXT_DIST_DIR=.next-build pnpm build` | OK; compilación y 7 rutas generadas |
| `pnpm --filter @nexus-tax/web test:e2e` (servidor aislado, puerto 3101) | OK; 4/4 escenarios Chromium, incluyendo OCR real (no mockeado) |
| `pnpm check:encoding` | OK; 244 archivos revisados, 0 mojibake |
| Visual | capturas Playwright reales: escritorio 1280, móvil 390, tema claro — sin desbordamiento horizontal, contraste correcto en ambos temas |

**Siguiente paso exacto:** con aprobación explícita, evaluar si conviene un editor de zonas por
arrastre antes o después de conectar un perfil activo a la extracción automática — ambos dependen del
mismo overlay ya construido, y decidir el orden evita construir la UI de zonas dos veces.
