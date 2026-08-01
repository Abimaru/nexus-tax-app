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
