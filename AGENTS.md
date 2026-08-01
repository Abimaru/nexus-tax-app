# AGENTS.md — Guía para agentes (Codex y compatibles)

Instrucciones operativas para agentes automáticos que contribuyan a NexusTax.
Comparte principios con `CLAUDE.md`; aquí se enfatizan las convenciones de
ejecución y verificación.

## Contexto

NexusTax es una estación **local y privada** de análisis tributario para
Colombia. El flujo real hoy es:

```
exógena (Excel) → lectura robusta (fullRows) → detección de secciones
→ normalización + identidad DIAN → clasificación tributaria v1
→ agregación + matriz de análisis (relaciones, consolidación, conciliación)
→ hallazgos → resolución humana (con historial) → checklist + adjuntos PDF (metadatos)
→ obligación de declarar orientativa (Aegis, AG 2025) → IndexedDB → export JSON
```

Todo es **orientativo y revisado por un humano**. **No** hay backend ni IA, **no**
se presenta ante la DIAN y **no** se liquida el impuesto (no se calcula el
Formulario 210). Motor de reglas: **Aegis Engine** (`packages/aegis-rules`).

## Reglas que no se negocian

- **Local first**: sin subir archivos ni usar red para procesar. Los binarios
  solo pueden persistirse por decisión explícita del usuario en IndexedDB; por
  defecto se conservan metadatos y nunca se incluyen en exportaciones.
- **Evidencia y trazabilidad** en cada dato, hallazgo, tope y decisión
  (hoja/fila/columna/valor). El dato original es **inmutable**.
- **Recomendaciones, no obligaciones**: nunca declarar un documento como
  legalmente obligatorio (`isLegallyRequired: false`); clasificación y obligación
  de declarar son orientativas.
- **Determinismo** del parser y de las reglas (IDs por hash estable, orden
  explícito, reglas versionadas).
- **Nada de datos tributarios reales** en el repositorio (solo fixtures
  sintéticos).

## Estructura

```
apps/web (Next.js, App Router)      ·  apps/api (RESERVADO)
packages/domain (tipos + Zod)       ·  packages/exogenous-parser (motor puro)
packages/aegis-rules (reglas puras) ·  packages/ui (presentación)
packages/config (constantes/tsconfig)
```

Frontera dura: la lógica de parsing, dominio y **reglas tributarias** no entra en
componentes React. La web persiste la superposición del analista y **re-invoca**
el cálculo puro (matriz/resoluciones); React solo presenta.

## Cómo trabajar

1. **Explora antes de editar.** No borres configuración existente.
2. **Cambios mínimos y localizados.** Componentes pequeños, funciones puras.
3. **Pruebas.** Si tocas `exogenous-parser`, `aegis-rules` o `domain`,
   añade/ajusta tests en Vitest con fixtures sintéticos (builders en memoria o
   `samples/generate-sample.mjs`), nunca datos reales.
4. **Tema claro/oscuro.** Usa tokens semánticos de Tailwind (`surface`,
   `overlay`, `content`, `tone-*`); **nunca** `text-slate-*`, `bg-white/x` ni
   `border-white/x` fijos (rompen el modo claro). Respeta `prefers-reduced-motion`.
5. **Verifica y reporta resultados exactos**:
   ```bash
   pnpm install
   pnpm typecheck
   pnpm lint
   pnpm test
   pnpm build
   ```
   Si cambiaste `tailwind.config.ts`, **reinicia `pnpm dev`** (no hay recarga en
   caliente de la config TS). Para procesos largos, emite señales de actividad y
   aplica timeouts controlados.
6. **Documenta.** Actualiza `docs/PROJECT_HANDOFF.md` (estado, decisiones,
   pendientes, siguiente paso, riesgos) al cerrar tu tarea.

## Commits

Todo commit creado por un agente debe seguir `docs/COMMIT_CONVENTIONS.md`:
`ICONO CATEGORIA: descripcion`. Usa una categoria oficial, descripcion en
presente imperativo, una sola intencion y primera linea de maximo recomendado de
72 caracteres, sin punto final. Usa cuerpo y `BREAKING CHANGE` cuando aplique.

## Calidad

- TypeScript estricto, sin `any` injustificado.
- Manejo explícito de errores; estados vacío/carga/éxito/fallo cubiertos.
- Accesibilidad: teclado, foco visible, alternativas textuales, estados no
  dependientes solo del color, respeto a `prefers-reduced-motion`.
- Sin dependencias nuevas sin justificar su función.

## Límite de alcance

El motor de reglas evoluciona de forma **incremental, versionada y explicable**.
No avanzar hacia backend, IA, extracción avanzada de PDFs o **liquidación del
impuesto** sin diseñarlo y validarlo antes. `apps/api` permanece reservado.
