# CLAUDE.md — Reglas permanentes de NexusTax

Guía para Claude Code al trabajar en este repositorio. Complementa (no
reemplaza) la documentación de `docs/`.

## Qué es este proyecto

NexusTax: estación **personal y local** de análisis tributario para Colombia.
Ayuda a un humano a organizar exógena y preparar la declaración de renta. **No**
presenta ante la DIAN ni calcula impuestos todavía. Motor futuro: **Aegis Engine**.

## Principios inviolables

1. **Privacidad y ejecución local.** Nada de subir archivos ni llamadas de red
   para procesar documentos. No persistir el archivo original.
2. **Trazabilidad y evidencia.** Todo dato normalizado conserva hoja + fila; todo
   hallazgo muestra evidencia (hoja/fila/columna/valor).
3. **Revisión humana.** El sistema sugiere; nunca afirma obligaciones legales.
   `isLegallyRequired` siempre es `false` en los requisitos del checklist.
4. **Determinismo.** El parser produce la misma salida para las mismas entradas.
5. **Sin datos reales en Git.** Solo fixtures sintéticos.

## Límites de arquitectura (no cruzar)

- La **lógica de dominio y de parsing NO vive en componentes React**. Va en
  `packages/domain` (tipos/Zod) y `packages/exogenous-parser` (motor puro).
- `packages/exogenous-parser` es **puro**: sin DOM, sin red, sin React.
- `packages/ui` es **solo presentación**.
- `apps/api` está **reservado**: no agregar lógica backend en Sprint 1.

## Convenciones de código (§17)

- TypeScript **estricto**; sin `any` injustificado (usa tipos precisos o Zod).
- Componentes pequeños; funciones puras cuando sea posible.
- Manejo explícito de errores y de los estados vacío / carga / éxito / fallo.
- Nombres claros en español para el dominio; sin código muerto.
- **Sin datos simulados presentados como reales**; **sin cálculos tributarios**.
- Respetar `prefers-reduced-motion` en toda animación.

## Flujo de trabajo esperado

1. Antes de modificar: inspecciona el repo y no destruyas configuración.
2. Cambios acompañados de pruebas cuando toquen el parser o el dominio.
3. Ejecuta y reporta **resultados exactos**: `pnpm typecheck`, `pnpm lint`,
   `pnpm test`. Para tareas largas, muestra actividad y usa timeouts.
4. Actualiza `docs/PROJECT_HANDOFF.md` al cerrar un bloque de trabajo.

## Dependencias

No agregar dependencias sin justificar su función. El stack aprobado está en
`docs/ARCHITECTURE.md` y en los `package.json` del workspace.

## Comandos rápidos

```bash
pnpm install · pnpm dev · pnpm build · pnpm lint · pnpm typecheck · pnpm test
```

## Al terminar

El entregable debe permitir: crear expediente, cargar Excel, inspeccionar hojas,
normalizar, ver resumen y gráficas, revisar hallazgos, obtener checklist,
guardar localmente y exportar JSON. **No avanzar a backend o IA** sin cerrar y
validar este alcance.
