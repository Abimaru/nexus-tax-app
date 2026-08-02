# UX / UI — NexusTax

## Identidad

- **Nombre:** NexusTax
- **Subtítulo:** Estación personal de análisis tributario
- **Motor futuro:** Aegis Engine
- **Temas:** **oscuro** (por defecto) y **claro**, conmutables desde la cabecera.
- **Acentos:** cian (`#22d3ee`), azul eléctrico (`#3b82f6`), violeta (`#8b5cf6`);
  se conservan en ambos temas.
- **Superficies:** en oscuro, fondos profundos con glassmorphism moderado e
  iluminación sutil (halos de acento); en claro, superficies claras con las
  mismas formas y halos más tenues.

## Sistema de tema (claro/oscuro)

El color es **semántico y tema-consciente** mediante variables CSS en
`apps/web/src/app/globals.css`, expuestas como colores de Tailwind:

| Token Tailwind                               | Significado                                                                   |
| -------------------------------------------- | ----------------------------------------------------------------------------- |
| `surface-base` / `surface-raised`            | fondo de app / paneles                                                        |
| `surface-glass`                              | superficie con glassmorphism                                                  |
| `overlay/<n>`                                | superposición translúcida (bordes, hovers): blanca en oscuro, oscura en claro |
| `content` / `-strong/-muted/-subtle`         | escala de texto                                                               |
| `tone-{cyan,blue,violet,rose,amber,emerald}` | texto/íconos/badges de estado: vívidos en oscuro, profundos en claro          |

**Regla para desarrolladores:** usa siempre estos tokens. **Nunca** `text-slate-*`,
`bg-white/x` ni `border-white/x` fijos: rompen el modo claro.

- **`ThemeProvider`** (`components/theme/ThemeProvider.tsx`) fija `data-theme` en
  `<html>`, abre en oscuro por defecto y persiste la elección en `localStorage`.
- Un **script inline anti-parpadeo** aplica el tema antes de pintar (sin FOUC).
- **`ThemeToggle`** (sol/luna) vive en la cabecera; es accesible y evita
  desajustes de hidratación.
- Cambiar `tailwind.config.ts` requiere **reiniciar `pnpm dev`**.

## Lo que evitamos

Estética de videojuego, exceso de neón, animaciones distractoras, formularios
extensos, tablas ilegibles y apariencia genérica de dashboard administrativo.

## Lo que usamos

- Animaciones sutiles de entrada (Framer Motion) y **contadores animados**.
- Estados de carga claros: **skeletons** y **progreso por fases** (no spinners
  infinitos).
- **Drag and drop** para cargar archivos.
- **`FileDropzone` compartido** para exógena, documentos, evidencia y archivos
  opcionales: clic, teclado, arrastre, formato, tamaño, error, reemplazo y carga.
- **Empty states orientativos** (explican qué hacer).
- **Mensajes de error accionables**.
- **Puntos de estado de color** (además de texto) para identidad/resolución.
- Respeto por `prefers-reduced-motion` (global en `globals.css` y por componente).

## Pantallas

El expediente usa seis etapas visibles en grilla adaptable: **Fuente,
Extracción, Organización, Conciliación, Declaración y Exportación**. Cada una
muestra solo sus vistas contextuales, un estado textual y la siguiente acción.
En móvil se reemplaza la grilla por selectores nativos; nunca se exige desplazar
horizontalmente una barra de pestañas.

1. **Inicio** — identidad, descripción, expedientes recientes, botón _Crear
   expediente_, aviso de privacidad.
2. **Crear expediente** — alias, año gravable, notas, validación inmediata (Zod).
3. **Cargar exógena** — drag & drop, formatos admitidos, aviso de procesamiento
   local, progreso real por fases, cancelar.
4. **Inspección del libro** — nombre, tamaño, hojas, dimensiones, selección de
   hoja, vista previa, fila de encabezados y **detección de secciones**
   (metadatos / rango de topes / inicio del detalle) revisable antes de procesar.
5. **Identidad del contribuyente** — documento **enmascarado**, distinción de los
   dos NIT jerárquicos y coincidencia por registro.
6. **Resumen** — tarjetas (registros, entidades, conceptos, total, hallazgos) y
   gráficas (valores por entidad, distribución por concepto, calidad). El total
   separa métricas homogéneas de la suma bruta no consolidada.
7. **Registros** — tabla paginada con **barra de filtros en grilla** (búsqueda +
   entidad, categoría, identidad, naturaleza, tratamiento, resolución, relación,
   consolidación) y **Limpiar filtros**. Columna **Clasificación** con badge +
   puntos de estado; detalle de fila **por secciones** (Clasificación,
   Trazabilidad, Consolidación, Relaciones, Uso sugerido, Columnas adicionales).
   Exportación JSON.
8. **Matriz de análisis** — grupos tributarios, conciliación preliminar contra
   los topes, diferencias, confianza y prevención de doble conteo.
9. **Hallazgos** — severidad, descripción, evidencia, acción sugerida, navegación
   al registro afectado y **resolución humana** (confirmar/modificar/excluir con
   justificación, vía _drawer_).
10. **Checklist documental** — requisitos por entidad, con motivo, estado, origen
    y nivel de confianza; **adjuntar PDF** guarda solo metadatos.
11. **Obligación de declarar** — evaluación orientativa AG 2025: criterios,
    evidencia, condición de IVA, vencimiento, versión y **fuentes DIAN**.
12. **Exportación** — estado de integridad y manifiesto local; comunica de forma
    explícita cuando el expediente todavía está incompleto.

## Accesibilidad (§14)

- Navegación por teclado y **foco visible** en toda la app.
- Etiquetas asociadas (`label`/`aria-*`), enlace "Saltar al contenido".
- Estados **no dependientes solo del color** (iconos + texto + puntos de estado).
- Gráficas con **alternativa textual** (tabla desplegable / desglose numérico).
- Contraste suficiente en **ambos temas** (claro y oscuro).

## Localización y quality gate

Los identificadores internos pueden permanecer en inglés para estabilidad, pero
la interfaz usa catálogos en español con etiqueta y descripción. Nunca interpola
un enum. Un valor desconocido muestra “Estado no reconocido” y produce un
hallazgo técnico sin exponer el identificador crudo.

Toda pantalla nueva o modificada debe superar
[`UX_QUALITY_GATE.md`](UX_QUALITY_GATE.md), incluida revisión Playwright y
capturas sintéticas localmente en escritorio y móvil. El tono y las decisiones
de texto siguen [`MICROCOPY_GUIDE.md`](MICROCOPY_GUIDE.md).

## Componentes compartidos (`packages/ui`)

`BrandMark`, `Button`, `Badge`, `GlassPanel`, `StatCard`, `AnimatedCounter`,
`SeverityBadge`, `ProgressBar`, `Spinner`, `Skeleton`, `EmptyState`,
`PrivacyNotice`. Todos de presentación pura, sin reglas de negocio. El control de
tema (`ThemeProvider`, `ThemeToggle`) vive en `apps/web/src/components/theme`.
