# Navegación por etapas

## Identificadores estables

| Etapa          | Vistas                                                       |
| -------------- | ------------------------------------------------------------ |
| `fuente`       | `cargar`, `estado`, `reemplazar`, `datos-basicos`            |
| `extraccion`   | `inspeccion`, `estructura`, `calidad`                        |
| `organizacion` | `resumen`, `registros`, `requisitos`, `documentos`, `hechos` |
| `conciliacion` | `matriz`, `hallazgos`, `conciliaciones`                      |
| `declaracion`  | `obligacion`, `calendario`, `formulario-210`                 |
| `exportacion`  | `estado`, `manifiesto`, `historial`                          |

`WorkflowStageId`, `WorkflowViewId` y `CaseNavigationState` pertenecen a
`@nexus-tax/domain`. Las etiquetas y la disponibilidad viven en el motor puro de
la aplicación, no dentro de componentes React.

## Resolución de destinos

1. Se validan `stage` y `view` con Zod en la ruta del App Router.
2. Se calcula la disponibilidad con `deriveWorkflowStages`.
3. Un destino bloqueado, desconocido o futuro redirige a
   `defaultWorkflowDestination`.
4. Si el estado persistido sigue disponible, se restaura.
5. La recomendación usa un orden fijo: cargar fuente, revisar extracción,
   procesar, organizar, conciliar, revisar declaración y exportar.

Esta secuencia es determinista. No depende del ancho de pantalla ni del orden en
que React monte los paneles.

## Responsive y accesibilidad

- Desde `md`, las seis etapas usan una grilla que puede ocupar varias filas; no
  hay carrusel horizontal.
- En móvil se usan selectores nativos para etapa y vista.
- `aria-current`, texto de estado, razón de bloqueo y foco visible acompañan el
  color y los iconos.
- Al cambiar de destino, el foco pasa al contenido principal.
- Las transiciones respetan `prefers-reduced-motion`.

## Pruebas de contrato

`workflow.test.ts` cubre progresión, modo manual, rutas inválidas y siguiente
acción. `WorkflowNavigation.test.tsx` cubre semántica accesible y activación. El
smoke Playwright recorre el expediente y verifica que no exista desbordamiento
horizontal en 1440, 1280, 1024, 768 y 390 px.
