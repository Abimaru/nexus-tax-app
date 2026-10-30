#### CNT-003 - Contenido permitido en INTEGRACIÓN

**Resumen oficial:** Valida que los componentes ubicados en INTEGRACIÓN correspondan al contenido permitido para el nivel padre y, cuando exista un hijo principal dentro de este dominio, para el nivel hijo.

**Aplica a:** Dominios clasificados como INTEGRACIÓN y sus componentes contenidos, exista o no un contenedor hijo principal.

**Criterio:** En el nivel padre de INTEGRACIÓN se permiten API, eventos de integración de tipo Aplicación o Empresarial, servicios, modelos de entrada, modelos de salida, conceptos, pendientes, gestores de colas, sistemas externos auxiliares, anotaciones y capas de despliegue MCI o Federado. No se permiten compuertas, eventos BPMN operativos, políticas ni comandos.

Cuando INTEGRACIÓN contenga un hijo principal, dentro de este se permiten compuertas, eventos BPMN operativos, modelos de entrada, modelos de salida, conceptos, pendientes, políticas, comandos y anotaciones; no se permiten API, eventos de integración de tipo Aplicación o Empresarial, servicios, gestores de colas, sistemas externos auxiliares ni capas de despliegue MCI o Federado.

Para los eventos de integración encapsulados dentro de un sistema externo auxiliar prima el dominio y el nivel estructural del auxiliar: si el auxiliar está ubicado en el nivel padre de INTEGRACIÓN, se permiten eventos de tipo Aplicación o Empresarial; si está dentro del hijo principal, no se permiten eventos de integración. Los demás componentes encapsulados dentro del auxiliar, incluidos gestores de colas, se evalúan mediante EXT-001; un gestor encapsulado es admisible en este nivel.

##### BPMNEvent candidato a marcador de API

Una figura `BPMNEvent` independiente ubicada en el nivel padre de INTEGRACIÓN se considera candidata a marcador de API cuando se cumplen conjuntamente estas condiciones:

- no tiene conexiones;
- no tiene subtipo BPMN operativo certificado;
- no contiene texto funcional que permita identificar un comportamiento operativo;
- no pertenece al flujo BPMN del hijo principal;
- no existe evidencia que certifique que ejecuta una función operativa;
- su ubicación o contención permite que pueda acompañar gráficamente a una API, pero el JSON no certifica formalmente esa relación.

Estas condiciones no certifican que la figura sea un marcador de API. Solo impiden tratarla automáticamente como un evento BPMN operativo prohibido.

Los BPMNEvent registrados en `omittedComponents` con `reason: API_MARKER_EVENT` se consideran marcadores certificados por el Studio, se excluyen de la población operativa y no generan incertidumbre ni incumplimiento. Al no existir como componentes independientes evaluables, no deben reclamarse ni contarse como eventos BPMN operativos.

La ausencia de conexiones por sí sola no demuestra que un BPMNEvent sea marcador de API. Si permanece como figura independiente y su función no está certificada, corresponde **No verificable**.

**Evidencia mínima:** Identificación certificada del dominio de INTEGRACIÓN, inventario completo de sus componentes, identificación del hijo principal cuando exista, jerarquía estructural suficiente para establecer si cada componente está en el nivel padre, dentro del hijo principal o encapsulado dentro de un sistema externo auxiliar, ubicación estructural del auxiliar y clasificación certificada de los componentes evaluados.

Para excluir un BPMNEvent como marcador de API se requiere que el Studio lo registre en `omittedComponents` con `reason: API_MARKER_EVENT` o entregue otra evidencia explícita equivalente. La posición, cercanía, alineación, superposición o contención dentro de una Capa de Despliegue no certifican por sí solas su relación con una API.

Para los eventos BPMN operativos no se requiere determinar su subtipo específico cuando puede certificarse por otra evidencia que son operativos. La falta de subtipo sí genera incertidumbre cuando la figura cumple las condiciones de candidata a marcador de API.

- **Cumple:** La clasificación de INTEGRACIÓN y la cobertura de su contenido están certificadas, y todos los componentes evaluados están permitidos en el nivel en el que se encuentran. Los BPMNEvent registrados por el Studio en `omittedComponents` con `reason: API_MARKER_EVENT` se excluyen de la población operativa. No existen figuras BPMNEvent independientes cuya función esté pendiente de determinar.

- **No cumple:** La clasificación de INTEGRACIÓN y la cobertura de su contenido están certificadas, y existe al menos un componente con clasificación certificada ubicado en un nivel en el que no está permitido. Para un BPMNEvent ubicado en el nivel padre corresponde este estado cuando tiene conexiones operativas, pertenece al flujo BPMN del hijo principal, tiene un subtipo BPMN operativo certificado o existe otra evidencia que demuestra que cumple una función operativa en el nivel padre.

- **No verificable:** Existe un BPMNEvent independiente en el nivel padre de INTEGRACIÓN, sin conexiones, sin subtipo BPMN operativo certificado, sin texto funcional y sin pertenencia al flujo del hijo principal, cuya ubicación permite considerarlo candidato a marcador de API, pero el JSON no certifica formalmente esa función. También corresponde este estado cuando el contenido del dominio no tiene cobertura suficiente, no puede determinarse el nivel estructural de un componente o su clasificación incluye categorías permitidas y no permitidas. Si existe además un incumplimiento certificado independiente, prevalece **No cumple**.

- **No aplica:** Se ha certificado que la página no contiene un dominio de INTEGRACIÓN ni contenedores pendientes de clasificación que puedan corresponder a este dominio.