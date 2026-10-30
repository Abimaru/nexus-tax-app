#### CNT-005 - Contenido permitido en SISTEMAS EXTERNOS

**Resumen oficial:** Valida que los componentes ubicados directamente en SISTEMAS EXTERNOS correspondan al contenido permitido para este dominio.

**Aplica a:** Dominios clasificados como SISTEMAS EXTERNOS y a los componentes contenidos directamente en ellos.

**Criterio:** En SISTEMAS EXTERNOS se permiten API, servicios, modelos de entrada, modelos de salida, pendientes, conceptos, sistemas externos auxiliares y anotaciones. No se permiten eventos de integración de tipo Aplicación o Empresarial, gestores de colas, capas de despliegue MCI o Federado, compuertas, eventos BPMN operativos, políticas ni comandos.

Los eventos de integración encapsulados dentro de un sistema externo auxiliar ubicado en SISTEMAS EXTERNOS tampoco están permitidos, porque prima el dominio arquitectónico raíz. Los demás componentes encapsulados dentro del auxiliar se excluyen de esta regla y se evalúan mediante EXT-001. Un gestor de colas encapsulado en un auxiliar ubicado en SISTEMAS EXTERNOS está prohibido por EXT-001.

##### BPMNEvent candidato a marcador de API

Una figura `BPMNEvent` independiente ubicada directamente en SISTEMAS EXTERNOS se considera candidata a marcador de API cuando se cumplen conjuntamente estas condiciones:

- no tiene conexiones;
- no tiene subtipo BPMN operativo certificado;
- no contiene texto funcional que permita identificar una actividad o comportamiento operativo;
- no pertenece a un flujo BPMN certificado;
- no existe evidencia que demuestre que cumple una función operativa;
- su ubicación permite que pueda acompañar gráficamente a una API, pero el JSON no certifica formalmente esa relación.

Estas condiciones no certifican que la figura sea un marcador de API. Solo impiden tratarla automáticamente como un evento BPMN operativo prohibido.

Los BPMNEvent registrados en `omittedComponents` con `reason: API_MARKER_EVENT` se consideran marcadores certificados por el Studio, se excluyen de la población operativa y no generan incertidumbre ni incumplimiento.

La ausencia de conexiones por sí sola no demuestra que un BPMNEvent sea marcador de API. Si permanece como figura independiente y su función no está certificada, corresponde **No verificable**.

**Evidencia mínima:** Identificación certificada del dominio de SISTEMAS EXTERNOS, inventario completo de sus componentes, jerarquía estructural suficiente para diferenciar los componentes ubicados directamente en el dominio de aquellos encapsulados dentro de un sistema externo auxiliar y clasificación certificada de los componentes evaluados.

Para excluir un BPMNEvent como marcador de API se requiere que el Studio lo registre en `omittedComponents` con `reason: API_MARKER_EVENT` o entregue otra evidencia explícita equivalente. La posición, cercanía, alineación o contención visual respecto de una API no certifican esa relación.

- **Cumple:** La clasificación del dominio de SISTEMAS EXTERNOS y la cobertura de su contenido están certificadas, y todos los componentes evaluados corresponden a categorías permitidas. Los BPMNEvent registrados por el Studio en `omittedComponents` con `reason: API_MARKER_EVENT` se excluyen de la población operativa. No existen figuras BPMNEvent independientes cuya función esté pendiente de determinar.

- **No cumple:** La clasificación del dominio de SISTEMAS EXTERNOS y la cobertura de su contenido están certificadas, y existe al menos un componente con clasificación certificada ubicado directamente en el dominio que corresponde a una categoría no permitida. Para un BPMNEvent corresponde este estado cuando tiene conexiones operativas, pertenece a un flujo BPMN certificado, tiene un subtipo BPMN operativo certificado o existe otra evidencia que demuestra que cumple una función operativa dentro de SISTEMAS EXTERNOS.

- **No verificable:** Existe un BPMNEvent independiente en SISTEMAS EXTERNOS, sin conexiones, sin subtipo BPMN operativo certificado, sin texto funcional y sin pertenencia a un flujo BPMN certificado, cuya ubicación permite considerarlo candidato a marcador de API, pero el JSON no certifica formalmente esa función. También corresponde este estado cuando el contenido del dominio no tiene cobertura suficiente, no puede determinarse si un componente está directamente en el dominio o encapsulado en un auxiliar, o su clasificación incluye categorías permitidas y no permitidas. Si existe además un incumplimiento certificado independiente, prevalece **No cumple**.

- **Contenedor con roles posibles PRODUCTOR y SISTEMAS EXTERNOS:** mientras no pueda certificarse cuál de los dos es, esta regla queda **No verificable** aunque CNT-001 cumpla. No se declara No aplica porque el contenedor es candidato a este dominio.

- **No aplica:** Se ha certificado que la página no contiene un dominio de SISTEMAS EXTERNOS ni contenedores pendientes de clasificación que puedan corresponder a este dominio.