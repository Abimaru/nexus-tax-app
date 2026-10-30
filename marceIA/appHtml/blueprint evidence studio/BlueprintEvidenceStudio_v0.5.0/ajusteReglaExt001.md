#### EXT-001 - Identificación y contenido del sistema externo auxiliar

**Resumen oficial:** Valida que cada sistema externo auxiliar tenga un nombre y encapsule únicamente componentes permitidos para su ubicación.

**Aplica a:** Componentes certificados como sistemas externos auxiliares, independientemente del nombre visible utilizado para identificarlos.

**Criterio:** Todo sistema externo auxiliar debe tener un nombre visible y no vacío; se admite cualquier nombre, incluido “Sistema Externo”. Puede encapsular API, servicios, pendientes, conceptos y anotaciones.

Puede encapsular gestores de colas cuando el auxiliar esté ubicado en el nivel padre de INTEGRACIÓN o en el nivel padre del DOMINIO PRODUCTOR; no puede encapsularlos cuando esté ubicado en SISTEMAS EXTERNOS, dentro del hijo principal o dentro de otro sistema externo auxiliar.

Puede encapsular capas de despliegue MCI o Federado únicamente cuando esté ubicado en el nivel padre de INTEGRACIÓN. Los eventos de integración se admiten según el dominio arquitectónico raíz y el nivel estructural del auxiliar mediante CNT-003, CNT-004 o CNT-005. Cualquier otro tipo de componente está prohibido.

##### BPMNEvent candidato a marcador de API dentro de un auxiliar

Una figura `BPMNEvent` independiente encapsulada en un sistema externo auxiliar ubicado en el nivel padre de INTEGRACIÓN o en el nivel padre de SISTEMAS EXTERNOS se considera candidata a marcador de una API encapsulada cuando se cumplen conjuntamente estas condiciones:

- no tiene conexiones;
- no tiene subtipo BPMN operativo certificado;
- no contiene texto funcional que permita identificar un comportamiento operativo;
- no pertenece al flujo BPMN de un hijo principal;
- el auxiliar contiene una API certificada o existe una API candidata cuya clasificación está pendiente;
- el JSON no certifica formalmente que el BPMNEvent pertenezca o represente a esa API.

Estas condiciones no certifican que la figura sea un marcador de API. Solo impiden tratarla automáticamente como contenido prohibido del auxiliar.

Los BPMNEvent registrados en `omittedComponents` con `reason: API_MARKER_EVENT` se consideran marcadores certificados por el Studio, se excluyen del inventario operativo del auxiliar y no generan incertidumbre ni incumplimiento.

La ausencia de conexiones por sí sola no demuestra que un BPMNEvent sea marcador de API. Si permanece como figura independiente dentro del auxiliar y su función no está certificada, corresponde **No verificable**.

Un componente identificado únicamente como `BPMNEvent`, pero que no cumple las condiciones de candidato a marcador de API, debe evaluarse con la evidencia disponible. Si su clasificación incluye categorías permitidas y prohibidas o su función no puede determinarse, corresponde **No verificable**.

La regla evalúa el nombre y el contenido encapsulado por el auxiliar, pero no sus conexiones. Las conexiones se utilizan únicamente como evidencia para distinguir un posible marcador sin función operativa de un evento con comportamiento operativo. La ubicación general del auxiliar se evalúa mediante EXT-002.

**Evidencia mínima:** Identificación certificada del sistema externo auxiliar, texto completo de su nombre, inventario completo de componentes encapsulados, clasificación certificada de dichos componentes y ubicación estructural y dominio raíz certificados cuando contenga gestores de colas, eventos de integración, BPMNEvent o capas de despliegue.

Para excluir un BPMNEvent como marcador de API se requiere que el Studio lo registre en `omittedComponents` con `reason: API_MARKER_EVENT` o entregue otra evidencia explícita equivalente. La posición, cercanía, alineación, superposición o contención dentro del mismo auxiliar no certifican su relación con una API.

- **Cumple:** El auxiliar tiene nombre visible y no vacío, encapsula al menos un componente y todos sus componentes están permitidos para su ubicación. Los BPMNEvent registrados por el Studio en `omittedComponents` con `reason: API_MARKER_EVENT` se excluyen de la población operativa. No existen figuras BPMNEvent independientes cuya función esté pendiente de determinar.

- **No cumple:** La evidencia y cobertura están certificadas, y el nombre está ausente o vacío; el auxiliar contiene una categoría no permitida; contiene un gestor de colas fuera del nivel padre de INTEGRACIÓN o PRODUCTOR; contiene una capa de despliegue fuera del nivel padre de INTEGRACIÓN; o contiene un evento de integración prohibido para el dominio raíz y nivel estructural. Para un BPMNEvent corresponde este estado cuando tiene conexiones operativas, pertenece al flujo BPMN de un hijo, tiene subtipo BPMN operativo certificado o existe otra evidencia que demuestra que cumple una función operativa no permitida dentro del auxiliar.

- **No verificable:** Existe un BPMNEvent independiente dentro de un auxiliar de INTEGRACIÓN o SISTEMAS EXTERNOS, sin conexiones, sin subtipo BPMN operativo certificado, sin texto funcional y sin pertenencia al flujo de un hijo, que puede acompañar a una API encapsulada, pero el JSON no certifica formalmente esa función. También corresponde este estado cuando el auxiliar no encapsula componentes o no puede certificarse si encapsula alguno; el inventario no tiene cobertura suficiente; el tipo de un componente no está determinado; su clasificación incluye categorías permitidas y prohibidas; o no puede determinarse la ubicación o el dominio raíz cuando condiciona el contenido permitido. Si existe además un incumplimiento certificado independiente, prevalece **No cumple**.

- **No aplica:** La página no contiene sistemas externos auxiliares certificados ni candidatos pendientes de clasificación como tales.