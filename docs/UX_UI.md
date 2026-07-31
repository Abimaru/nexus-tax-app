# UX / UI — NexusTax

## Identidad

- **Nombre:** NexusTax
- **Subtítulo:** Estación personal de análisis tributario
- **Motor futuro:** Aegis Engine
- **Modo principal:** oscuro
- **Acentos:** cian (`#22d3ee`), azul eléctrico (`#3b82f6`), violeta (`#8b5cf6`)
- **Superficies:** fondos oscuros profundos con glassmorphism moderado e
  iluminación sutil (halos de acento en el fondo).

Los tokens viven en `packages/config` (`BRAND_TOKENS`) y se reflejan en
`apps/web/tailwind.config.ts`.

## Lo que evitamos

Estética de videojuego, exceso de neón, animaciones distractoras, formularios
extensos, tablas ilegibles y apariencia genérica de dashboard administrativo.

## Lo que usamos

- Animaciones sutiles de entrada (Framer Motion) y **contadores animados**.
- Estados de carga claros: **skeletons** y **progreso por fases** (no spinners
  infinitos).
- **Drag and drop** para cargar archivos.
- **Empty states orientativos** (explican qué hacer).
- **Mensajes de error accionables**.
- Respeto por `prefers-reduced-motion` (global en `globals.css` y en cada
  componente animado).

## Pantallas (Sprint 1)

1. **Inicio** — identidad, descripción, expedientes recientes, botón _Crear
   expediente_, aviso de privacidad.
2. **Crear expediente** — alias, año gravable, notas, validación inmediata (Zod).
3. **Cargar exógena** — drag & drop, formatos admitidos, aviso de procesamiento
   local, progreso real por fases, cancelar.
4. **Inspección del libro** — nombre, tamaño, hojas, dimensiones, selección de
   hoja, vista previa, selección de fila de encabezados, mapeo manual.
5. **Resumen** — tarjetas (registros, entidades, conceptos, total, hallazgos) y
   gráficas (valores por entidad, distribución por concepto, calidad).
6. **Registros** — tabla paginada con búsqueda, filtros, ordenamiento, detalle de
   fila con referencia al origen y exportación JSON.
7. **Checklist documental** — requisitos agrupados por entidad, con motivo,
   estado y origen de la recomendación.
8. **Hallazgos** — severidad, descripción, evidencia, acción sugerida y
   navegación al registro afectado.

## Accesibilidad (§14)

- Navegación por teclado y **foco visible** en toda la app.
- Etiquetas asociadas (`label`/`aria-*`), enlace "Saltar al contenido".
- Estados **no dependientes solo del color** (iconos + texto en severidades).
- Gráficas con **alternativa textual** (tabla desplegable / desglose numérico).
- Contraste suficiente sobre superficies oscuras.

## Componentes compartidos (`packages/ui`)

`BrandMark`, `Button`, `Badge`, `GlassPanel`, `StatCard`, `AnimatedCounter`,
`SeverityBadge`, `ProgressBar`, `Spinner`, `Skeleton`, `EmptyState`,
`PrivacyNotice`. Todos son de presentación pura, sin reglas de negocio.
