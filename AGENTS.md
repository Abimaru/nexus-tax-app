# AGENTS.md — Guía para agentes (Codex y compatibles)

Instrucciones operativas para agentes automáticos que contribuyan a NexusTax.
Comparte principios con `CLAUDE.md`; aquí se enfatizan las convenciones de
ejecución y verificación.

## Contexto

NexusTax es una estación **local y privada** de análisis tributario para
Colombia (exógena → normalización → hallazgos → checklist → export JSON). Sin
backend, IA ni cálculo tributario en el Sprint 1. Motor futuro: **Aegis Engine**.

## Reglas que no se negocian

- **Local first**: sin subir archivos, sin red para procesar, sin persistir el
  archivo original.
- **Evidencia y trazabilidad** en cada dato y hallazgo (hoja/fila/columna/valor).
- **Recomendaciones, no obligaciones**: nunca declarar un documento como
  legalmente obligatorio (`isLegallyRequired: false`).
- **Determinismo** del parser (IDs por hash estable, orden explícito).
- **Nada de datos tributarios reales** en el repositorio.

## Estructura

```
apps/web (Next.js)  ·  apps/api (RESERVADO)
packages/domain (Zod)  ·  packages/exogenous-parser (motor puro)
packages/ui (presentación)  ·  packages/config (constantes/tsconfig)
```

Frontera dura: la lógica de parsing/dominio no entra en componentes React.

## Cómo trabajar

1. **Explora antes de editar.** No borres configuración existente.
2. **Cambios mínimos y localizados.** Componentes pequeños, funciones puras.
3. **Pruebas.** Si tocas `exogenous-parser` o `domain`, añade/ajusta tests en
   Vitest. Usa fixtures sintéticos (`samples/generate-sample.mjs` o builders
   en memoria), nunca datos reales.
4. **Verifica y reporta resultados exactos**:
   ```bash
   pnpm install
   pnpm typecheck
   pnpm lint
   pnpm test
   ```
   Para procesos largos, emite señales de actividad y aplica timeouts
   controlados; distingue trabajo activo de bloqueo.
5. **Documenta.** Actualiza `docs/PROJECT_HANDOFF.md` (estado, decisiones,
   pendientes, siguiente paso, riesgos) al cerrar tu tarea.

## Calidad

- TypeScript estricto, sin `any` injustificado.
- Manejo explícito de errores; estados vacío/carga/éxito/fallo cubiertos.
- Accesibilidad: teclado, foco visible, alternativas textuales, respeto a
  `prefers-reduced-motion`.
- Sin dependencias nuevas sin justificar su función.

## Límite de alcance

No avanzar hacia backend, IA, PDFs o cálculo tributario sin cerrar y validar el
alcance del Sprint 1. `apps/api` permanece reservado y sin lógica.
