# CLAUDE.md — Reglas permanentes de NexusTax

Guía para Claude Code al trabajar en este repositorio. Complementa (no
reemplaza) la documentación de `docs/`.

## Qué es este proyecto

NexusTax: estación **personal y local** de análisis tributario para Colombia.
Ayuda a un humano a organizar información exógena, conciliar fuentes y preparar
la declaración de renta de persona natural. Hoy ya **clasifica** cada registro,
construye una **matriz de análisis** con conciliación preliminar contra topes y
**evalúa de forma orientativa** la obligación de declarar (AG 2025) con reglas
versionadas. Todo es **orientativo y sujeto a revisión humana**: **no** presenta
ante la DIAN ni liquida el impuesto (no calcula el Formulario 210). Motor de
reglas: **Aegis Engine** (`packages/aegis-rules`).

## Principios inviolables

1. **Privacidad y ejecución local.** Nada de subir archivos ni llamadas de red
   para procesar documentos. Un binario solo se persiste en IndexedDB cuando el
   usuario elige explícitamente conservarlo; por defecto se guardan metadatos y
   nunca se exportan binarios.
2. **Trazabilidad y evidencia.** Todo dato normalizado conserva hoja + fila; todo
   hallazgo, tope y decisión muestran evidencia (hoja/fila/columna/valor). El
   valor, entidad, texto y ubicación **originales son inmutables**.
3. **Revisión humana y lenguaje prudente.** El sistema **sugiere**; nunca afirma
   obligaciones legales. `isLegallyRequired` siempre es `false` en el checklist.
   La clasificación y la obligación de declarar son **orientativas**, no verdad
   tributaria.
4. **Determinismo.** El parser y las reglas producen la misma salida para las
   mismas entradas (IDs por hash estable, orden explícito).
5. **Sin datos reales en Git.** Solo fixtures sintéticos.

## Alcance actual (qué hace hoy)

- **Lectura robusta de Excel**: deriva `fullRows` de las celdas reales (no confía
  en `worksheet['!ref']`); `previewRows` es proyección exclusiva de UI.
- **Reportes seccionados** (formato DIAN): metadatos → encabezado → resumen de
  **topes** (variable) → **detalle** de terceros. Límites detectados por
  contenido, **filas 1-based** revisables en Inspección.
- **Identidad del consultante**: extrae y **enmascara** el documento, distingue
  los dos NIT jerárquicos (quien reporta / persona reportada) y valida la
  coincidencia por registro.
- **Clasificación tributaria v1** (categoría / naturaleza / tratamiento +
  confianza y evidencia): prioridad código → casilla sugerida → detalle → tipo de
  entidad. Orientativa.
- **Matriz de análisis**: relaciones entre registros (subconjunto, resumen,
  movimiento, posible duplicado…), disposiciones de consolidación que **evitan
  doble conteo**, y conciliación preliminar contra los topes.
- **Resolución humana**: el analista confirma/modifica/excluye con historial;
  las decisiones viven en Dexie (`analyses`), sobreviven recargas y se marcan
  **obsoletas** si cambia el registro o la clasificación automática.
- **Obligación de declarar (Aegis, AG 2025)**: evalúa offline seis criterios
  (cinco topes + condición de IVA), usa el monto oficial redondeado conservando
  el UVT exacto, y calcula el vencimiento 2026 por los dos últimos dígitos. Con
  explicación, evidencia, versión y **fuentes DIAN**.
- **Biblioteca documental** con metadatos por defecto y almacenamiento binario
  local opcional, explícito y eliminable; nunca se envía ni exporta por defecto.
- **Aegis Document Intelligence**: lee PDF con texto en el navegador, **diagnostica**
  el tipo de PDF y de cada página (textual/escaneado/texto insuficiente/dañado),
  clasifica orientativamente, ejecuta adaptadores versionados y crea candidatos.
  Solo una confirmación humana crea un hecho `assisted`; no hay IA conectada.
- **OCR local bajo demanda**: Tesseract.js vendorizado sin CDN, corre en el
  navegador y **nunca automáticamente**; nunca hace solicitudes de red durante el
  reconocimiento; compara texto nativo contra OCR y muestra contradicciones sin
  fusionarlas.
- **Laboratorio documental**: diagnóstico por página, overlay de capas (tokens
  nativos/OCR/candidatos), modo básico/avanzado y candidatos manuales asistidos
  que pasan por la revisión normal (nunca alimentan la matriz directo).
- **Perfiles documentales**: reconocen el mismo formato entre expedientes por
  señales estructurales (nunca por nombre de archivo); activarlos siempre exige
  confirmación explícita. El feedback de calibración registra el alcance que
  elige el analista (solo el documento / similares / actualización de perfil).
- **Persistencia local** en IndexedDB y **exportación JSON** versionada.

## Límites de arquitectura (no cruzar)

- La **lógica de dominio, de parsing y de reglas NO vive en componentes React**.
  Va en `packages/domain` (tipos/Zod), `packages/exogenous-parser` (motor puro) y
  `packages/aegis-rules` (reglas puras versionadas).
- `packages/document-intelligence` es puro respecto de React y persistencia: no
  accede a IndexedDB, no consolida la matriz y no realiza solicitudes de red.
  El motor de OCR (Tesseract.js), el renderizado de página a `<canvas>` y su
  orquestación viven en `apps/web`; el paquete puro solo define el contrato
  unificado de tokens y las funciones de comparación/preprocesamiento.
- `packages/exogenous-parser` y `packages/aegis-rules` son **puros**: sin DOM, sin
  red, sin React. `aegis-rules` no consulta la DIAN en tiempo de ejecución.
- La **matriz y las resoluciones** se calculan en el paquete puro; la web solo
  **persiste la superposición** del analista y **re-invoca** el cálculo puro.
  React presenta; no contiene reglas tributarias.
- `packages/ui` es **solo presentación**.
- `apps/api` está **reservado**: no agregar lógica backend todavía.

## Convenciones de código (§17)

- TypeScript **estricto**; sin `any` injustificado (usa tipos precisos o Zod).
- Componentes pequeños; funciones puras cuando sea posible.
- Manejo explícito de errores y de los estados vacío / carga / éxito / fallo.
- Nombres claros en español para el dominio; sin código muerto.
- **Sin datos simulados presentados como reales**; **sin liquidación del
  impuesto** (no calcular el Formulario 210).
- **Tema claro/oscuro**: usa **tokens semánticos** de Tailwind
  (`surface`, `overlay`, `content`, `tone-*`), definidos por variables CSS en
  `globals.css`. **No** uses `text-slate-*`, `bg-white/x` ni `border-white/x`
  fijos: rompen el modo claro. Acentos de marca (cian/azul/violeta) se conservan.
- Respetar `prefers-reduced-motion` en toda animación.
- **Presentación humana:** los enums permanecen estables en el dominio, pero la
  interfaz siempre usa catálogos en español. Un valor desconocido muestra
  “Estado no reconocido” y genera un hallazgo técnico; nunca se interpola crudo.
- Antes de cerrar una pantalla aplica `docs/UX_QUALITY_GATE.md`: inspecciona el
  lenguaje visual existente, reutiliza patrones, valida teclado y responsive con
  Playwright y conserva capturas sintéticas locales de escritorio y móvil. Una
  pantalla no está terminada solo porque compile.

## Flujo de trabajo esperado

1. Antes de modificar: inspecciona el repo y no destruyas configuración.
2. Cambios acompañados de pruebas cuando toquen `exogenous-parser`, `aegis-rules`,
   `document-intelligence` o `domain`. Usa fixtures **sintéticos**.
3. Ejecuta y reporta **resultados exactos**: `pnpm typecheck`, `pnpm lint`,
   `pnpm test`, `pnpm build`. Para tareas largas, muestra actividad y timeouts.
4. Si cambias `tailwind.config.ts`, **reinicia `pnpm dev`** (la config TS no se
   recarga en caliente).
5. Actualiza `docs/PROJECT_HANDOFF.md` al cerrar un bloque de trabajo.

## Estandar de commits

Los commits deben cumplir `docs/COMMIT_CONVENTIONS.md`: formato
`ICONO CATEGORIA: descripcion`, categoria oficial, descripcion en presente
imperativo, una intencion principal, maximo recomendado de 72 caracteres y sin
punto final. Un cambio incompatible se explica con `BREAKING CHANGE` en el
cuerpo.

## Dependencias

No agregar dependencias sin justificar su función. El stack aprobado está en
`docs/ARCHITECTURE.md` y en los `package.json` del workspace.

## Comandos rápidos

```bash
pnpm install · pnpm dev · pnpm build · pnpm lint · pnpm typecheck · pnpm test
```

## Documentación de referencia

`docs/PRODUCT_VISION.md`, `ARCHITECTURE.md`, `DATA_MODEL.md`, `EXOGENOUS_PARSER.md`,
`TAX_RULES.md`, `CLASSIFICATION_RESOLUTION.md`, `RECONCILIATION.md`,
`AEGIS_RULES.md`, `DOCUMENT_INTELLIGENCE.md`, `PDF_PROCESSING.md`,
`DOCUMENT_ADAPTERS.md`, `DOCUMENT_EXTRACTION_REVIEW.md`, `UX_UI.md`,
`SECURITY_PRIVACY.md`, `ROADMAP.md`, `LOCAL_OCR.md`, `OCR_SECURITY.md`,
`OCR_PERFORMANCE.md`, `DOCUMENT_LAB.md`, `DOCUMENT_PROFILES.md`,
`EXTRACTION_FEEDBACK.md`,
`PROJECT_HANDOFF.md`.
Convenciones de cambios: `COMMIT_CONVENTIONS.md`. Validacion reproducible:
`SPRINT_2_VALIDATION.md`.

## Límite de alcance

El motor de reglas crece de forma **incremental, versionada y explicable**. La
lectura de PDF local y el **OCR local bajo demanda** (nunca automático, nunca
por red) ya están habilitados. No avanzar hacia backend obligatorio, IA
externa/en la nube o **liquidación del impuesto** sin diseñarlo y validarlo
antes. `apps/api` permanece reservado.
