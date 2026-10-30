#### API-004 - Capa de Despliegue de la API principal

**Resumen oficial:** Valida que la API principal declarada como MCI tenga la Capa de Despliegue requerida según su tipo de exposición.

**Aplica a:** API principal con tipo arquitectónico y rol certificados, declarada como MCI.

**Criterio:** Cuando la API principal está declarada como MCI, la Capa de Despliegue exigida depende de su tipo de exposición:

- una API `private` debe tener asociadas una Capa de Arquitectura y un Flujo Transaccional;
- una API `partner` debe tener asociada una Capa de Arquitectura y no requiere Flujo Transaccional;
- una API `public` no requiere Capa de Arquitectura ni Flujo Transaccional.

Las asociaciones requeridas deben pertenecer inequívocamente a la API principal y no pueden establecerse únicamente por cercanía, alineación, superposición, contención visual o ubicación dentro del mismo contenedor.

Cuando la API principal está declarada como no MCI, no se exige Capa de Arquitectura, Flujo Transaccional ni la declaración Federado.

Las API invocadas se excluyen de esta regla, independientemente de su condición MCI o de los elementos de despliegue que presenten. Las Capas de Arquitectura y Flujos Transaccionales asociados a API invocadas no demuestran ni incumplen la Capa de Despliegue de la API principal.

**Precedencia de asociaciones:** aplicar `00-procedimiento.md §4.1`.

Una asociación resuelta cuyo `associatedComponentId` corresponde a la API principal demuestra pertenencia.

Una asociación resuelta con otro componente demuestra únicamente la pertenencia a ese otro componente. No demuestra por sí sola que la API principal carezca de Capa de Despliegue.

Una Capa de Arquitectura, un Flujo Transaccional o una pareja Capa-Flujo con cualquiera de las siguientes condiciones se considera candidata:

- `associatedComponentId: null`;
- estado pendiente, ambiguo o en conflicto;
- `PENDING_NO_COMMON_SUPERIOR_GROUP`;
- propietario no determinado;
- evidencia insuficiente para certificar el componente propietario.

La asociación candidata produce **No verificable** mientras no pueda determinarse si pertenece a la API principal o a otro componente. Para este estado no importa qué figura esté contenida dentro de la Capa o del Flujo ni qué elemento aparezca en `candidateIds`. Una figura interna, un evento BPMN, un grupo o cualquier otro candidato no demuestra por sí mismo que la asociación pertenezca o no pertenezca a la API principal.

Un arreglo vacío en `components[].deploymentAssociations` no demuestra ausencia cuando `pages[].deploymentAssociations` contiene una Capa, un Flujo o una pareja Capa-Flujo pendiente de propietario.

La ausencia solo queda certificada cuando se cumplen conjuntamente estas condiciones:

- la cobertura de asociaciones de despliegue de la página es completa;
- no existe una asociación resuelta con la API principal;
- no existe una Capa, un Flujo o una pareja Capa-Flujo pendiente, ambigua, en conflicto o sin propietario;
- no existen candidatos cuya propiedad esté pendiente de resolver;
- la evidencia permite demostrar que los elementos obligatorios no existen o pertenecen inequívocamente a otros componentes.

La imposibilidad de demostrar pertenencia no equivale a demostrar ausencia.

**Evidencia mínima:** Identificación certificada de la API principal, tipo de exposición obtenido de la tercera sección o declarado por la analista, condición MCI o no MCI declarada por la analista e inventario completo de asociaciones de despliegue de la página.

Para demostrar cumplimiento, las asociaciones requeridas deben estar resueltas inequívocamente con la API principal.

Para demostrar incumplimiento por ausencia, la cobertura debe ser completa y no deben existir asociaciones candidatas pendientes que puedan corresponder a la API principal. La declaración de la analista determina la exposición o condición MCI cuando corresponda, pero no sustituye la evidencia de existencia ni asociación de la Capa o del Flujo.

- **Cumple:** La API principal está declarada como MCI, su exposición está determinada y presenta toda la Capa de Despliegue exigida mediante asociaciones resueltas inequívocamente con la API principal: Capa de Arquitectura y Flujo Transaccional para `private`, o Capa de Arquitectura para `partner`. Una API `public` cumple sin necesidad de Capa ni Flujo.

- **No cumple:** La API principal está declarada como MCI, su exposición está determinada, la cobertura de asociaciones es completa, no existen Capas, Flujos o parejas Capa-Flujo pendientes, ambiguas, en conflicto o sin propietario que puedan corresponderle, y se demuestra la ausencia de al menos un elemento obligatorio. También corresponde este estado cuando la evidencia certifica que todos los elementos existentes pertenecen a otros componentes y no existe ningún candidato pendiente que pueda pertenecer a la API principal.

- **No verificable:** No puede certificarse cuál es la API principal; falta la declaración de su condición MCI; no puede determinarse su exposición; existe una Capa de Arquitectura, un Flujo Transaccional o una pareja Capa-Flujo pendiente, ambigua, en conflicto o con `associatedComponentId: null`; no puede determinarse el propietario de una asociación; o la cobertura es insuficiente para demostrar pertenencia o ausencia. Este estado aplica aunque la asociación candidata contenga un evento BPMN, grupo, figura intermedia u otro componente, porque el contenido interno no resuelve por sí mismo la propiedad de la Capa de Despliegue.

- **No aplica:** La API principal está declarada como no MCI; el componente corresponde a una API invocada; o la página no contiene una API principal ni candidatos pendientes de identificación para ese rol.