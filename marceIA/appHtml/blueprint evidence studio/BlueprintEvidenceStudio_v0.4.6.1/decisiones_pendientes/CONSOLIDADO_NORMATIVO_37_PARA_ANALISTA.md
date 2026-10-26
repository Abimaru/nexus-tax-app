# CONSOLIDADO NORMATIVO — 37 REGLAS — PARA REVISIÓN DE LA ANALISTA

> **Documento de revisión. No es normativa aprobada.** El texto de las 37 reglas es la obligación literal de la analista; todas las decisiones abiertas se presentan como **abiertas**. Nada de lo que sigue crea o modifica una obligación.

Fecha: 26/10/2026 · Estado: **CANDIDATO PARA REVISIÓN** · Huella SHA-256 del texto normativo literal (37 reglas × 8 campos): `1f3583a09cafb8fbd4772a9694587254774efb715df50746720e8c3c4297a5c1`

## Contenido

1. Objetivo · 2. Antecedentes · 3. Resumen de cambios 41 → 37 · 4. Catálogo de las 37 reglas · 5. Cambios normativos importantes · 6. Decisiones ya incorporadas · 7. Decisiones pendientes · 8. Ejemplos representativos · 9. Matriz de aprobación

## 1. Objetivo

Que la analista **revise y apruebe** (a) el texto de las 37 reglas, tal como lo entregó, (b) los cambios respecto del catálogo histórico de 41 reglas y (c) las decisiones que siguen abiertas, con la evidencia necesaria para decidirlas. Este documento no es una descripción técnica de la Skill: la arquitectura de la futura Skill v12 (siete archivos por familia, una sola fuente normativa) solo se menciona en el apartado final como consecuencia de la aprobación.

## 2. Antecedentes

- La analista revisó el catálogo de 41 reglas y entregó un paquete con **37 reglas activas** en siete archivos normativos (01 a 07), más procedimiento, manifiesto y material de apoyo. SRV-001 y SRV-002 se mantienen activas con el criterio pendiente de ajuste.
- Dos auditorías independientes y su reconciliación produjeron 20 decisiones ya cerradas (sección 6) y 13 pendientes (sección 7).
- Se verificó que el texto de este documento coincide **carácter por carácter** (salvo espacios) con el de los siete archivos de la analista: 37 reglas, 296 campos, 0 diferencias.
- El paquete de la analista contiene material que no es de las 37 reglas (un CSV de 41, un contrato compacto antiguo, títulos «v11.2.1»); se trata en C-02 y no afecta al texto de las reglas.
- Corpus usado como evidencia: 7 blueprints reales (14 páginas operativas). Se citan solo cifras agregadas; los ejemplos de la sección 8 son sintéticos.

## 3. Resumen de cambios 41 → 37

El mapeo se hizo **por significado**, no por ID (44 filas: 41 reglas históricas y 3 nuevas). Resultado:

| Tipo de cambio | Cantidad | Reglas |
|---|---:|---|
| Conservan su ID (casi todas con el contenido modificado; SRV-001 y SRV-002 sin cambio textual) | 28 | CNT-001, CNT-002, CNT-003, CNT-004, CNT-005, EXT-001, GW-001, API-001, API-002, API-003, API-004, SRV-001, SRV-002, SRV-003, EVT-001, EVT-002, EVT-003, CA-001, FT-001, E1-001, E2-001, E3-001, MOD-001, COM-001, COM-002, COM-003, COM-004, MQ-001 |
| Renumeradas | 5 | EVT-005 → EVT-004, EVT-006 → EVT-005, EVT-007 → EVT-006, EVT-008 → EVT-007, MQ-005 → MQ-003 |
| Fusionadas | 2 históricas → 1 vigente | MQ-003 + MQ-004 → MQ-002 (MQ-003 histórica se fusiona y su ID pasa a otra regla) |
| Retiradas (sin destino 1:1) | 6 | CNT-006, EXT-002, EVT-004, CA-002, FT-002, MQ-002 |
| Nuevas | 3 | EXT-002, SRV-004, COM-005 |
| **Vigentes** | **37** | 28 + 5 + 1 (la fusión) + 3 |

Comprobación aritmética: Históricas: 28 (mismo ID) + 5 (renumeradas) + 2 (fusionadas) + 6 (retiradas) = 41 de 41. Vigentes: 28 + 5 + 1 (MQ-002, resultado de la fusión) + 3 (nuevas) = 37.

**IDs reutilizados con otro significado** (peligro al leer resultados históricos): EXT-002, EVT-004, EVT-005, EVT-006, EVT-007, MQ-002, MQ-003. Por ejemplo, el EVT-004 vigente (Capa de Tópicos) no es el EVT-004 histórico (despliegue del evento), y el MQ-002 vigente (Capa de Despliegue del gestor) no es el MQ-002 histórico (ubicación del gestor).

### 3.1 Tabla de trazabilidad 41 → 37

| ID histórico | Título histórico | Destino vigente | Relación | Riesgo |
|---|---|---|---|---|
| CNT-001 | Contenedores padre requeridos | CNT-001 | MODIFICADA | MEDIO |
| CNT-002 | Estructura del contenedor hijo | CNT-002 | MODIFICADA | MEDIO |
| CNT-003 | Contenido permitido en INTEGRACIÓN | CNT-003 | MODIFICADA | MEDIO |
| CNT-004 | Contenido permitido en dominio productor | CNT-004 | MODIFICADA | MEDIO |
| CNT-005 | Contenido permitido en SISTEMAS EXTERNOS | CNT-005 | MODIFICADA | MEDIO |
| CNT-006 | Exclusividad de padre directo | (retirada) | RETIRADA | BAJO |
| EXT-001 | Sistema externo auxiliar válido | EXT-001 | MODIFICADA | MEDIO |
| EXT-002 | Conexión mediante auxiliar externo | (retirada) → conexiones en COM-002..005 y MQ-003 | RETIRADA | ALTO |
| GW-001 | Caminos alternos del gateway | GW-001 | MODIFICADA | ALTO |
| API-001 | Nombramiento y versión de API | API-001 | MODIFICADA | MEDIO |
| API-002 | Operación de API | API-002 | MODIFICADA | MEDIO |
| API-003 | Tipo y modelo de servicio de API | API-003 | MODIFICADA | MEDIO |
| API-004 | Detalle de despliegue de API | API-004 | MODIFICADA | MEDIO |
| SRV-001 | Nombramiento y versión opcional de servicio | SRV-001 | SIN CAMBIO TEXTUAL (pendiente) | MEDIO |
| SRV-002 | Operación del servicio | SRV-002 | SIN CAMBIO TEXTUAL (pendiente) | MEDIO |
| SRV-003 | Modelo de servicio | SRV-003 | MODIFICADA | ALTO |
| EVT-001 | Nombramiento y versión del evento | EVT-001 | MODIFICADA | MEDIO |
| EVT-002 | Operación del evento | EVT-002 | MODIFICADA | MEDIO |
| EVT-003 | Tipo y clasificación del evento | EVT-003 | MODIFICADA | MEDIO |
| EVT-004 | Detalle de despliegue del evento | (retirada) | RETIRADA | ALTO |
| EVT-005 | Contenedor de tópicos | EVT-004 | RENUMERADA + MODIFICADA | ALTO |
| EVT-006 | Cantidad y roles de tópicos | EVT-005 | RENUMERADA + MODIFICADA | ALTO |
| EVT-007 | Nombramiento de tópicos | EVT-006 | RENUMERADA + MODIFICADA | ALTO |
| EVT-008 | Conexiones del evento | EVT-007 | RENUMERADA + MODIFICADA | ALTO |
| CA-001 | Existencia y nombramiento de Capa | CA-001 | MODIFICADA | MEDIO |
| CA-002 | Asociación de Capa | (retirada) → API-004, SRV-004, MQ-002 | RETIRADA | BAJO |
| FT-001 | Existencia y nombramiento de Flujo | FT-001 | MODIFICADA | MEDIO |
| FT-002 | Asociación de Flujo | (retirada) → API-004, SRV-004, MQ-002 | RETIRADA | BAJO |
| E1-001 | Estructura integral E1 | E1-001 | MODIFICADA | MEDIO |
| E2-001 | Estructura integral E2 | E2-001 | MODIFICADA | MEDIO |
| E3-001 | Estructura integral E3 | E3-001 | MODIFICADA | MEDIO |
| MOD-001 | Modelos de entrada y salida | MOD-001 | MODIFICADA | MEDIO |
| COM-001 | Nombramiento de comandos | COM-001 | MODIFICADA (refinamiento) | BAJO |
| COM-002 | Conexión comando con API invocada | COM-002 | MODIFICADA (refinamiento) | BAJO |
| COM-003 | Conexión comando con servicio invocado | COM-003 | MODIFICADA (refinamiento) | BAJO |
| COM-004 | Conexión comando con gestor de colas | COM-004 | MODIFICADA (refinamiento) | BAJO |
| MQ-001 | Identificación y nombramiento del gestor | MQ-001 | MODIFICADA | MEDIO |
| MQ-002 | Ubicación del gestor | (retirada) → CNT-003/004/005, EXT-001 | RETIRADA | ALTO |
| MQ-003 | Modelo de despliegue del gestor | MQ-002 (fusión con MQ-004) | FUSIONADA + RENUMERADA | ALTO |
| MQ-004 | Detalle de despliegue del gestor | MQ-002 (fusión con MQ-003) | FUSIONADA | ALTO |
| MQ-005 | Conexión gestor con servicio invocado | MQ-003 | RENUMERADA + AMPLIADA | ALTO |

## 4. Catálogo de las 37 reglas

Texto literal de la analista (bloque «Texto normativo»). Debajo de cada regla, la **nota de revisión** es una anotación del equipo técnico: no es norma. La huella de 12 caracteres identifica el texto de esa regla.

---

### CNT-001 — Contenedores padre requeridos

| | |
|---|---|
| Familia | CNT |
| Origen histórico | CNT-001 |
| Tipo de cambio | MODIFICADA |
| Riesgo de trazabilidad | MEDIO |
| Estado de la definición | Definida |
| Decisiones abiertas que la afectan | — (y, para todas, las condiciones globales C-02 y C-03) |
| Huella del texto | 409776bc1435 |

**Texto normativo (literal de la analista)**

**Resumen oficial:** Valida la existencia de los dominios arquitectónicos obligatorios según el patrón estructural E1, E2 o E3 aplicable a la página.

**Población (Aplica a):** Páginas evaluables en las que pueda determinarse un patrón estructural E1, E2 o E3, aunque el cumplimiento integral del escenario no esté confirmado.

**Obligación (Criterio):** En E1 deben existir al menos un dominio de INTEGRACIÓN y un DOMINIO PRODUCTOR; en E2 debe existir al menos un dominio de INTEGRACIÓN; y en E3 debe existir al menos un DOMINIO PRODUCTOR. Puede existir más de un dominio del mismo tipo. Los dominios opcionales y su ausencia no afectan al cumplimiento. La regla evalúa exclusivamente la existencia y clasificación de los dominios obligatorios, independientemente de que tengan un nombre literal, derivado o personalizado; no evalúa su contenido, las relaciones de contención de sus componentes ni las demás condiciones necesarias para confirmar integralmente el escenario.

**Evidencia mínima:** Patrón estructural E1, E2 o E3 determinado e inventario completo de contenedores padre. Los dominios obligatorios deben tener una clasificación arquitectónica certificada. Los nombres personalizados son válidos siempre que exista evidencia suficiente para clasificar el dominio como INTEGRACIÓN o DOMINIO PRODUCTOR, según corresponda.

- **Cumple:** Puede determinarse el patrón estructural aplicable y existen todos los dominios arquitectónicos obligatorios para dicho patrón, con clasificación certificada.
- **No cumple:** Puede determinarse el patrón estructural aplicable, la cobertura del inventario es completa y se demuestra la ausencia de al menos uno de los dominios arquitectónicos obligatorios.
- **No verificable:** No existe evidencia suficiente para determinar el patrón estructural aplicable; el inventario de contenedores no tiene cobertura suficiente; o existe una clasificación indeterminada, ambigua o contradictoria que impide confirmar la existencia de un dominio obligatorio. La falta de certificación de otras condiciones del escenario, como el subtipo Inicio de un evento BPMN, no afecta por sí sola la evaluación de esta regla.
- **No aplica:** La página no es evaluable porque corresponde exclusivamente a una plantilla o leyenda, o no contiene una estructura susceptible de corresponder a E1, E2 o E3.

> **Nota de revisión (no normativa).** Qué cambió respecto de los 41: De «INTEGRACIÓN y demás padres aplicables» a dominios obligatorios por patrón; nombres libres.

---

### CNT-002 — Existencia, nombre y ubicación del contenedor hijo principal

| | |
|---|---|
| Familia | CNT |
| Origen histórico | CNT-002 |
| Tipo de cambio | MODIFICADA |
| Riesgo de trazabilidad | MEDIO |
| Estado de la definición | Definida |
| Decisiones abiertas que la afectan | C-09 (y, para todas, las condiciones globales C-02 y C-03) |
| Huella del texto | f335f54de7ce |

**Texto normativo (literal de la analista)**

**Resumen oficial:** Valida que exista un único contenedor hijo principal, que tenga un nombre específico y que esté ubicado en el dominio arquitectónico correspondiente al patrón estructural aplicable.

**Población (Aplica a):** Páginas evaluables con una estructura susceptible de corresponder a E1, E2 o E3, aunque el cumplimiento integral del escenario no esté confirmado.

**Obligación (Criterio):** Debe existir un único contenedor hijo principal por página. El hijo debe tener un nombre visible, funcional y específico que permita identificar el servicio que representa; no se admiten nombres ausentes, vacíos, genéricos ni textos de plantilla. No se exige un formato, idioma, versión, capitalización ni estructura de palabras particular.

En E1 y E3, el hijo principal debe estar ubicado en el DOMINIO PRODUCTOR; en E2, debe estar ubicado en INTEGRACIÓN. La regla no evalúa los componentes contenidos en el hijo, su condición de gestionado o no gestionado, los eventos BPMN de su interior, sus modelos internos ni las demás condiciones necesarias para confirmar integralmente el escenario.

**Evidencia mínima:** Patrón estructural E1, E2 o E3 identificable, inventario completo de contenedores, identificación certificada de un único contenedor hijo principal, texto completo de su nombre y clasificación certificada del dominio arquitectónico en el que está ubicado. No se requiere identificar ni certificar un evento BPMN de Inicio para evaluar esta regla.

- **Cumple:** Puede determinarse el patrón estructural aplicable, existe un único contenedor certificado como hijo principal, tiene un nombre visible, funcional, específico y diferente de un texto de plantilla, y está ubicado en el dominio arquitectónico exigido por dicho patrón.
- **No cumple:** El patrón estructural aplicable y la cobertura del inventario están certificados, y se demuestra al menos una de las siguientes situaciones: no existe un contenedor hijo principal; existe más de uno; el único hijo principal está ubicado en un dominio arquitectónico diferente del exigido; o su nombre está ausente, vacío, compuesto únicamente por espacios, es genérico o corresponde a un texto de plantilla.
- **No verificable:** No existe evidencia suficiente para determinar el patrón estructural aplicable; el inventario no tiene cobertura suficiente; no puede certificarse cuál es el hijo principal; existen varios candidatos sin que pueda determinarse cuál cumple ese rol; el texto de su nombre no está disponible o está incompleto por pérdida de evidencia; no puede determinarse razonablemente si el nombre es específico o de plantilla; o la ubicación o clasificación de su dominio arquitectónico es indeterminada, ambigua o contradictoria. La falta de certificación del subtipo Inicio de un evento BPMN no afecta la evaluación de esta regla. Si existe al menos un incumplimiento certificado, prevalece **No cumple** aunque otra condición sea no verificable.
- **No aplica:** La página no es evaluable porque corresponde exclusivamente a una plantilla o leyenda, o no contiene componentes ni candidatos pendientes que puedan configurar un hijo principal de E1, E2 o E3.

> **Nota de revisión (no normativa).** Qué cambió respecto de los 41: Añade unicidad y nombre específico; retira «gestionado/no gestionado» (F-13); no exige Inicio. Decisiones abiertas: C-09 (ver sección 7).

---

### CNT-003 — Contenido permitido en INTEGRACIÓN

| | |
|---|---|
| Familia | CNT |
| Origen histórico | CNT-003; absorbe: MQ-002 antiguo (Ubicación del gestor; retirada) |
| Tipo de cambio | MODIFICADA |
| Riesgo de trazabilidad | MEDIO |
| Estado de la definición | Condicionada a una decisión abierta |
| Decisiones abiertas que la afectan | C-06, C-11 (y, para todas, las condiciones globales C-02 y C-03) |
| Huella del texto | 3d111720e570 |

**Texto normativo (literal de la analista)**

**Resumen oficial:** Valida que los componentes ubicados en INTEGRACIÓN correspondan al contenido permitido para el nivel padre y, cuando exista un hijo principal dentro de este dominio, para el nivel hijo.

**Población (Aplica a):** Dominios clasificados como INTEGRACIÓN y sus componentes contenidos, exista o no un contenedor hijo principal.

**Obligación (Criterio):** En el nivel padre de INTEGRACIÓN se permiten API, eventos de integración de tipo Aplicación o Empresarial, servicios, modelos de entrada, modelos de salida, conceptos, pendientes, gestores de colas, sistemas externos auxiliares, anotaciones y capas de despliegue MCI o Federado. No se permiten compuertas, eventos BPMN operativos, políticas ni comandos. Cuando INTEGRACIÓN contenga un hijo principal, dentro de este se permiten compuertas, eventos BPMN operativos, modelos de entrada, modelos de salida, conceptos, pendientes, políticas, comandos y anotaciones; no se permiten API, eventos de integración de tipo Aplicación o Empresarial, servicios, gestores de colas, sistemas externos auxiliares ni capas de despliegue MCI o Federado. Los componentes encapsulados dentro de un sistema externo auxiliar se excluyen de esta regla y se evalúan mediante EXT-001.

**Evidencia mínima:** Identificación certificada del dominio de INTEGRACIÓN, inventario completo de sus componentes, identificación del hijo principal cuando exista, jerarquía estructural suficiente para establecer si cada componente está en el nivel padre, dentro del hijo principal o encapsulado dentro de un sistema externo auxiliar, y clasificación certificada de los componentes evaluados. Para los eventos BPMN operativos no se requiere determinar si corresponden específicamente a Inicio, Fin, Señal, Mensaje, Excepción, Mensaje de Excepción u otro subtipo cuando dicha información no esté disponible.

- **Cumple:** La clasificación de INTEGRACIÓN y la cobertura de su contenido están certificadas, y todos los componentes evaluados están permitidos en el nivel en el que se encuentran: nivel padre o nivel hijo. Los componentes encapsulados dentro de sistemas externos auxiliares no se consideran para este resultado.
- **No cumple:** La clasificación de INTEGRACIÓN y la cobertura de su contenido están certificadas, y existe al menos un componente con clasificación certificada ubicado en un nivel en el que no está permitido. El contenido interno de un sistema externo auxiliar no genera incumplimiento en esta regla.
- **No verificable:** Existe uno o más contenedores que podrían corresponder a INTEGRACIÓN, pero su clasificación es indeterminada, ambigua o contradictoria; el contenido del dominio no tiene cobertura suficiente; no puede determinarse si un componente está en el nivel padre, dentro del hijo principal o dentro de un sistema externo auxiliar; o la clasificación de algún componente es indeterminada, ambigua o contradictoria y sus posibles clasificaciones incluyen categorías permitidas y no permitidas para su ubicación. La imposibilidad de determinar el subtipo específico de un evento BPMN operativo no genera por sí sola este estado cuando puede certificarse que no corresponde a un evento de integración.
- **No aplica:** Se ha certificado que la página no contiene un dominio de INTEGRACIÓN ni contenedores pendientes de clasificación que puedan corresponder a este dominio.

> **Nota de revisión (no normativa).** Qué cambió respecto de los 41: Listas cerradas por nivel (padre/hijo). Decisiones abiertas: C-06, C-11 (ver sección 7).

---

### CNT-004 — Contenido permitido en DOMINIO PRODUCTOR

| | |
|---|---|
| Familia | CNT |
| Origen histórico | CNT-004; absorbe: MQ-002 antiguo (Ubicación del gestor; retirada) |
| Tipo de cambio | MODIFICADA |
| Riesgo de trazabilidad | MEDIO |
| Estado de la definición | Condicionada a una decisión abierta |
| Decisiones abiertas que la afectan | C-06, C-11 (y, para todas, las condiciones globales C-02 y C-03) |
| Huella del texto | 7271d4affea3 |

**Texto normativo (literal de la analista)**

**Resumen oficial:** Valida que los componentes ubicados en el DOMINIO PRODUCTOR correspondan al contenido permitido para el nivel padre y, cuando exista un hijo principal dentro de este dominio, para el nivel hijo.

**Población (Aplica a):** Dominios clasificados como DOMINIO PRODUCTOR y sus componentes contenidos, exista o no un contenedor hijo principal.

**Obligación (Criterio):** En el nivel padre del DOMINIO PRODUCTOR se permiten eventos de integración de tipo Aplicación o Empresarial, servicios, modelos de entrada, modelos de salida, conceptos, pendientes, gestores de colas, anotaciones y capas de despliegue MCI o Federado. No se permiten API, sistemas externos auxiliares, compuertas, eventos BPMN operativos, políticas ni comandos. Cuando el DOMINIO PRODUCTOR contenga un hijo principal, dentro de este se permiten compuertas, eventos BPMN operativos, modelos de entrada, modelos de salida, conceptos, pendientes, políticas, comandos y anotaciones; no se permiten API, eventos de integración de tipo Aplicación o Empresarial, servicios, gestores de colas, sistemas externos auxiliares ni capas de despliegue MCI o Federado. La regla evalúa la ubicación de los componentes según el nivel en el que se encuentran, sin exigir la identificación del subtipo específico de los eventos BPMN operativos cuando la evidencia disponible no permita determinarlo.

**Evidencia mínima:** Identificación certificada del DOMINIO PRODUCTOR, inventario completo de sus componentes, identificación del hijo principal cuando exista, jerarquía estructural suficiente para establecer si cada componente está fuera o dentro del hijo y clasificación certificada de los componentes evaluados. Para los eventos BPMN operativos no se requiere determinar si corresponden específicamente a Inicio, Fin, Señal, Mensaje, Excepción, Mensaje de Excepción u otro subtipo cuando dicha información no esté disponible.

- **Cumple:** La clasificación del DOMINIO PRODUCTOR y la cobertura de su contenido están certificadas, y todos sus componentes están permitidos en el nivel en el que se encuentran: nivel padre o nivel hijo.
- **No cumple:** La clasificación del DOMINIO PRODUCTOR y la cobertura de su contenido están certificadas, y existe al menos un componente con clasificación certificada ubicado en un nivel en el que no está permitido.
- **No verificable:** Existe uno o más contenedores que podrían corresponder al DOMINIO PRODUCTOR, pero su clasificación es indeterminada, ambigua o contradictoria; el contenido del dominio no tiene cobertura suficiente; no puede determinarse si un componente está fuera o dentro del hijo principal; o la clasificación de algún componente es indeterminada, ambigua o contradictoria y sus posibles clasificaciones incluyen categorías permitidas y prohibidas para el nivel en el que se encuentra. La imposibilidad de determinar el subtipo específico de un evento BPMN operativo no genera por sí sola este estado cuando puede certificarse que no corresponde a un evento de integración.
- **No aplica:** Se ha certificado que la página no contiene un DOMINIO PRODUCTOR ni contenedores pendientes de clasificación que puedan corresponder a este dominio.

> **Nota de revisión (no normativa).** Qué cambió respecto de los 41: Ídem para DOMINIO PRODUCTOR. Decisiones abiertas: C-06, C-11 (ver sección 7).

---

### CNT-005 — Contenido permitido en SISTEMAS EXTERNOS

| | |
|---|---|
| Familia | CNT |
| Origen histórico | CNT-005; absorbe: MQ-002 antiguo (Ubicación del gestor; retirada) |
| Tipo de cambio | MODIFICADA |
| Riesgo de trazabilidad | MEDIO |
| Estado de la definición | Condicionada a una decisión abierta |
| Decisiones abiertas que la afectan | C-06, C-10 (y, para todas, las condiciones globales C-02 y C-03) |
| Huella del texto | 400bf46e948f |

**Texto normativo (literal de la analista)**

**Resumen oficial:** Valida que los componentes ubicados directamente en SISTEMAS EXTERNOS correspondan al contenido permitido para este dominio.

**Población (Aplica a):** Dominios clasificados como SISTEMAS EXTERNOS y a los componentes contenidos directamente en ellos.

**Obligación (Criterio):** En SISTEMAS EXTERNOS se permiten API, servicios, modelos de entrada, modelos de salida, pendientes, conceptos, sistemas externos auxiliares y anotaciones. No se permiten eventos de integración de tipo Aplicación o Empresarial, gestores de colas, capas de despliegue MCI o Federado, compuertas, eventos BPMN operativos, políticas ni comandos. Los componentes encapsulados dentro de un sistema externo auxiliar se excluyen de esta regla y se evalúan mediante EXT-001.

**Evidencia mínima:** Identificación certificada del dominio de SISTEMAS EXTERNOS, inventario completo de sus componentes, jerarquía estructural suficiente para diferenciar los componentes ubicados directamente en el dominio de aquellos encapsulados dentro de un sistema externo auxiliar, y clasificación certificada de los componentes evaluados. Para los eventos BPMN operativos no se requiere determinar si corresponden específicamente a Inicio, Fin, Señal, Mensaje, Excepción, Mensaje de Excepción u otro subtipo cuando dicha información no esté disponible.

- **Cumple:** La clasificación del dominio de SISTEMAS EXTERNOS y la cobertura de su contenido están certificadas, y todos los componentes evaluados corresponden a categorías permitidas. Los componentes encapsulados dentro de sistemas externos auxiliares no se consideran para este resultado.
- **No cumple:** La clasificación del dominio de SISTEMAS EXTERNOS y la cobertura de su contenido están certificadas, y existe al menos un componente con clasificación certificada ubicado directamente en el dominio que corresponde a una categoría no permitida. El contenido interno de un sistema externo auxiliar no genera incumplimiento en esta regla.
- **No verificable:** Existe uno o más contenedores que podrían corresponder a SISTEMAS EXTERNOS, pero su clasificación es indeterminada, ambigua o contradictoria; el contenido del dominio no tiene cobertura suficiente; no puede determinarse si un componente está ubicado directamente en el dominio o encapsulado dentro de un sistema externo auxiliar; o la clasificación de algún componente es indeterminada, ambigua o contradictoria y sus posibles clasificaciones incluyen categorías permitidas y no permitidas. La imposibilidad de determinar el subtipo específico de un evento BPMN operativo no genera por sí sola este estado cuando puede certificarse que no corresponde a un evento de integración.
- **No aplica:** Se ha certificado que la página no contiene un dominio de SISTEMAS EXTERNOS ni contenedores pendientes de clasificación que puedan corresponder a este dominio.

> **Nota de revisión (no normativa).** Qué cambió respecto de los 41: Ídem para SISTEMAS EXTERNOS. Decisiones abiertas: C-06, C-10 (ver sección 7).

---

### EXT-001 — Identificación y contenido del sistema externo auxiliar

| | |
|---|---|
| Familia | EXT |
| Origen histórico | EXT-001; absorbe: MQ-002 antiguo (Ubicación del gestor; retirada) |
| Tipo de cambio | MODIFICADA |
| Riesgo de trazabilidad | MEDIO |
| Estado de la definición | Definida |
| Decisiones abiertas que la afectan | C-10 (y, para todas, las condiciones globales C-02 y C-03) |
| Huella del texto | f58630105612 |

**Texto normativo (literal de la analista)**

**Resumen oficial:** Valida que cada sistema externo auxiliar tenga un nombre y encapsule únicamente componentes permitidos.

**Población (Aplica a):** Componentes certificados como sistemas externos auxiliares, independientemente del nombre visible utilizado para identificarlos.

**Obligación (Criterio):** Todo sistema externo auxiliar debe tener un nombre visible y no vacío; se admite cualquier nombre, incluido “Sistema Externo”. Puede encapsular API, servicios, pendientes, conceptos y anotaciones. También puede encapsular capas de despliegue MCI o Federado, pero únicamente cuando el auxiliar esté ubicado en el nivel padre de INTEGRACIÓN. Cualquier otro tipo de componente está prohibido. Un componente identificado únicamente como BPMNEvent no debe considerarse automáticamente permitido ni prohibido, debido a que su función específica no puede determinarse a partir de la figura. La regla evalúa el nombre y el contenido encapsulado por el auxiliar, pero no las conexiones que llegan al auxiliar o a sus componentes internos.

**Evidencia mínima:** Identificación certificada del sistema externo auxiliar, texto completo de su nombre, inventario completo de los componentes encapsulados, clasificación certificada de dichos componentes y ubicación estructural certificada del auxiliar cuando contenga una capa de despliegue MCI o Federado.

- **Cumple:** El sistema externo auxiliar tiene un nombre visible y no vacío, encapsula al menos un componente y todos los componentes encapsulados están permitidos. Si contiene una capa de despliegue MCI o Federado, está certificado que el auxiliar se encuentra en el nivel padre de INTEGRACIÓN.
- **No cumple:** La evidencia y la cobertura están certificadas, y se presenta al menos una de las siguientes situaciones: el nombre del auxiliar está ausente, vacío o compuesto únicamente por espacios; contiene un componente certificado en una categoría no permitida; o contiene una capa de despliegue MCI o Federado sin estar ubicado en el nivel padre de INTEGRACIÓN.
- **No verificable:** No puede determinarse si el auxiliar tiene un nombre debido a evidencia textual incompleta; el auxiliar no encapsula componentes o no puede certificarse si encapsula alguno; el inventario de su contenido no tiene cobertura suficiente; no puede determinarse la clasificación de uno o más componentes encapsulados y sus posibles clasificaciones incluyen categorías permitidas y prohibidas; se identifica dentro del auxiliar un componente clasificado únicamente como BPMNEvent; o no puede determinarse la ubicación del auxiliar cuando contiene una capa de despliegue MCI o Federado. Requiere revisión manual del analista.
- **No aplica:** La página no contiene componentes certificados como sistemas externos auxiliares ni candidatos pendientes de clasificación como tales.

> **Nota de revisión (no normativa).** Qué cambió respecto de los 41: Nombre obligatorio y contenido permitido; eventos y gestores ya no se admiten dentro. Decisiones abiertas: C-10 (ver sección 7).

---

### EXT-002 — Ubicación de sistemas externos auxiliares EVC, EPC o LDC

| | |
|---|---|
| Familia | EXT |
| Origen histórico | — (nueva en nuestro catálogo; el manifiesto la llama «antigua EXT-003») |
| Tipo de cambio | NUEVA · **ID reutilizado con otro significado** |
| Riesgo de trazabilidad | ALTO |
| Estado de la definición | Definida |
| Decisiones abiertas que la afectan | C-04, C-11 (y, para todas, las condiciones globales C-02 y C-03) |
| Huella del texto | 6a0be71c8070 |

**Texto normativo (literal de la analista)**

**Resumen oficial:** Valida que un sistema externo auxiliar identificado como EVC, EPC o LDC y que encapsule una API esté ubicado en INTEGRACIÓN y no en SISTEMAS EXTERNOS.

**Población (Aplica a):** Sistemas externos auxiliares cuyo nombre contenga EVC, EPC o LDC y que encapsulen al menos un componente certificado como API.

**Obligación (Criterio):** Un sistema externo auxiliar cuyo nombre contenga EVC, EPC o LDC, sin distinguir mayúsculas y minúsculas, y que encapsule al menos una API debe estar ubicado en el nivel padre de INTEGRACIÓN. No puede estar ubicado directamente en SISTEMAS EXTERNOS ni dentro de otro sistema externo auxiliar. La regla evalúa exclusivamente la ubicación del auxiliar; el nombre y el contenido permitido dentro de este se evalúan mediante EXT-001, sus conexiones se evalúan mediante EXT-002 y el nombramiento de la API encapsulada se evalúa mediante API-001.

**Evidencia mínima:** Identificación certificada del sistema externo auxiliar, texto completo de su nombre, identificación certificada de al menos una API encapsulada y jerarquía estructural suficiente para determinar el dominio arquitectónico y el nivel en el que está ubicado el auxiliar.

- **Cumple:** El nombre del auxiliar contiene EVC, EPC o LDC, encapsula al menos una API certificada y está ubicado en el nivel padre de INTEGRACIÓN.
- **No cumple:** El nombre del auxiliar contiene EVC, EPC o LDC, encapsula al menos una API certificada y está ubicado directamente en SISTEMAS EXTERNOS, dentro de otro sistema externo auxiliar o en cualquier ubicación distinta del nivel padre de INTEGRACIÓN.
- **No verificable:** No puede determinarse el nombre completo del auxiliar; no puede establecerse si contiene EVC, EPC o LDC; no puede certificarse que el componente encapsulado sea una API; no puede certificarse que la API esté contenida por el auxiliar; o la ubicación o el dominio arquitectónico del auxiliar es indeterminado, ambiguo o contradictorio.
- **No aplica:** No existen sistemas externos auxiliares cuyo nombre contenga EVC, EPC o LDC y que encapsulen una API certificada. También aplica este estado cuando existen auxiliares con dichas expresiones, pero se certifica que no contienen API.

> **Nota de revisión (no normativa).** Qué cambió respecto de los 41: Nueva: ubicación de auxiliares EVC/EPC/LDC (sin antecedente en el catálogo de 41). Decisiones abiertas: C-04, C-11 (ver sección 7).

---

### GW-001 — Coherencia textual de los caminos de la compuerta

| | |
|---|---|
| Familia | GW |
| Origen histórico | GW-001 |
| Tipo de cambio | MODIFICADA |
| Riesgo de trazabilidad | ALTO |
| Estado de la definición | Definida |
| Decisiones abiertas que la afectan | C-09 (y, para todas, las condiciones globales C-02 y C-03) |
| Huella del texto | c9d69a4a84b6 |

**Texto normativo (literal de la analista)**

**Resumen oficial:** Valida la coherencia entre el texto de una compuerta BPMN y las respuestas o etiquetas de sus caminos conectados.

**Población (Aplica a):** Componentes certificados como compuertas BPMN.

**Obligación (Criterio):** Cuando una compuerta contiene una pregunta o texto de decisión, sus caminos deben incluir respuestas o etiquetas que permitan reconocer de forma coherente las alternativas resultantes. Una pregunta binaria puede utilizar respuestas como “Sí” y “No”; cuando existan más de dos alternativas, cada camino debe tener una etiqueta que permita distinguir la opción que representa. También es válido que una compuerta no tenga texto y que sus caminos no tengan respuestas o etiquetas, siempre que no exista información parcial que requiera relacionarlos. La regla no evalúa el subtipo de la compuerta ni las condiciones BPMN específicas de compuertas paralelas, exclusivas, basadas en eventos o paralelas basadas en eventos.

**Evidencia mínima:** Identificación certificada de la compuerta BPMN, texto completo de la compuerta cuando exista, inventario completo de sus caminos conectados y texto de las respuestas o etiquetas asociadas a dichos caminos. No se requiere identificar el subtipo de la compuerta.

- **Cumple:** La compuerta y sus caminos tienen cobertura suficiente, y se presenta alguna de las siguientes situaciones: la compuerta contiene una pregunta o decisión y sus caminos tienen respuestas o etiquetas coherentes que permiten distinguir las alternativas; o la compuerta no contiene texto y sus caminos tampoco contienen respuestas o etiquetas que requieran interpretación.
- **No cumple:** La evidencia textual y la cobertura de los caminos están certificadas, y las respuestas o etiquetas contradicen el texto de la compuerta, no corresponden a la pregunta planteada o no permiten distinguir los caminos cuando existen varias alternativas que requieren identificación.
- **No verificable:** No puede determinarse el texto completo de la compuerta o de sus caminos; no se tiene cobertura suficiente de las conexiones; la compuerta contiene una pregunta o decisión, pero faltan las respuestas o etiquetas necesarias para interpretar sus alternativas; los caminos contienen respuestas o etiquetas, pero falta el texto que permita establecer su significado; o la información disponible no permite concluir si el conjunto es coherente. La imposibilidad de identificar el subtipo de la compuerta no genera por sí sola este estado.
- **No aplica:** La página no contiene componentes certificados como compuertas BPMN ni candidatos pendientes de clasificación como tales.

> **Nota de revisión (no normativa).** Qué cambió respecto de los 41: Cambia de semántica: de caminos reconstruibles a coherencia texto↔etiquetas. Decisiones abiertas: C-09 (ver sección 7).

---

### API-001 — Nombramiento y versión de API

| | |
|---|---|
| Familia | API |
| Origen histórico | API-001 |
| Tipo de cambio | MODIFICADA |
| Riesgo de trazabilidad | MEDIO |
| Estado de la definición | Definida |
| Decisiones abiertas que la afectan | C-04, C-09 (y, para todas, las condiciones globales C-02 y C-03) |
| Huella del texto | 790602e9d28f |

**Texto normativo (literal de la analista)**

**Resumen oficial:** Valida el nombre y la versión de la primera sección de una API según el dominio arquitectónico en el que se encuentre.

**Población (Aplica a):** API principales e invocadas con tipo arquitectónico certificado.

**Obligación (Criterio):** Para una API ubicada en INTEGRACIÓN, directamente o dentro de un sistema externo auxiliar, la primera sección debe seguir el formato `Nombre Producto - Nombre API vMayor.Menor.Parche`. No debe contener espacios antes de la primera letra. El producto y la API deben tener nombres reales, funcionales, específicos, no genéricos, diferentes de textos de plantilla y escritos en inglés. Cada palabra significativa debe iniciar en mayúscula; los artículos, preposiciones y conjunciones pueden permanecer en minúscula cuando la nomenclatura inglesa lo permita. Debe existir un único guion estructural entre el nombre del producto y el nombre de la API, sin evaluar la cantidad de espacios a su alrededor. La versión debe iniciar con `v` o `V` y contener exactamente tres segmentos numéricos: Mayor mayor o igual que 1, Menor mayor o igual que 0 y Parche mayor o igual que 0.

Para una API ubicada en SISTEMAS EXTERNOS, directamente o dentro de un sistema externo auxiliar, solo se exige que la primera sección contenga un nombre real, funcional, específico, no genérico y diferente de un texto de plantilla. No se evalúan el formato corporativo, el idioma, la capitalización ni la versión. La restricción de ubicación de los auxiliares identificados como EVC, EPC o LDC se evalúa mediante EXT-002.

**Evidencia mínima:** Clasificación certificada del componente como API, texto completo de la primera sección y dominio arquitectónico certificado. Para las API ubicadas en INTEGRACIÓN se requieren el nombre del producto, el nombre de la API, el separador estructural y la versión. Los espacios repetidos y situados en los extremos se normalizan, excepto los espacios anteriores a la primera letra, que constituyen incumplimiento. Los guiones propios de nombres o marcas no se consideran automáticamente separadores estructurales. El idioma no se determina únicamente por siglas, marcas, nombres propios, términos técnicos ni palabras compartidas por varios idiomas.

- **Cumple:** La clasificación y ubicación de la API están certificadas y la primera sección satisface todas las condiciones aplicables. En INTEGRACIÓN cumple el formato completo, y en SISTEMAS EXTERNOS contiene un nombre real, funcional, específico, no genérico y diferente de un texto de plantilla.
- **No cumple:** La clasificación, ubicación y primera sección están certificadas, y se incumple al menos una condición aplicable. En INTEGRACIÓN esto incluye espacios antes de la primera letra, estructura u orden incorrectos, nombre genérico o de plantilla, separador estructural inválido, capitalización incorrecta, idioma diferente del inglés o versión ausente o inválida. En SISTEMAS EXTERNOS esto incluye un nombre ausente, genérico, no funcional o correspondiente a un texto de plantilla.
- **No verificable:** No puede certificarse si el componente es una API; no puede determinarse si está ubicado en INTEGRACIÓN o SISTEMAS EXTERNOS; la primera sección está incompleta; no puede distinguirse el guion estructural de los guiones propios de los nombres; o no puede verificarse razonablemente alguna condición aplicable. Si existe al menos un incumplimiento certificado, prevalece **No cumple** aunque otra condición sea no verificable.
- **No aplica:** La página no contiene API certificadas ni componentes candidatos cuya clasificación como API esté pendiente.

> **Nota de revisión (no normativa).** Qué cambió respecto de los 41: Dos modalidades por dominio. Decisiones abiertas: C-04, C-09 (ver sección 7).

---

### API-002 — Operación de API

| | |
|---|---|
| Familia | API |
| Origen histórico | API-002 |
| Tipo de cambio | MODIFICADA |
| Riesgo de trazabilidad | MEDIO |
| Estado de la definición | Definida |
| Decisiones abiertas que la afectan | C-04, C-09 (y, para todas, las condiciones globales C-02 y C-03) |
| Huella del texto | 4c09be6f6134 |

**Texto normativo (literal de la analista)**

**Resumen oficial:** Valida la operación declarada en la segunda sección de una API según el dominio arquitectónico en el que se encuentre.

**Población (Aplica a):** API principales e invocadas con tipo arquitectónico certificado.

**Obligación (Criterio):** Para una API ubicada en INTEGRACIÓN, directamente o dentro de un sistema externo auxiliar, la segunda sección debe contener únicamente el nombre de la operación expuesta por la API. La operación debe estar escrita en inglés y en formato `camelCase`: debe comenzar con una letra minúscula, contener únicamente letras y números, no incluir espacios, guiones ni guiones bajos, y utilizar una letra mayúscula inicial para cada palabra posterior a la primera cuando el nombre tenga varias palabras.

Para una API ubicada en SISTEMAS EXTERNOS, directamente o dentro de un sistema externo auxiliar, no se exige el idioma inglés ni el formato `camelCase`; la segunda sección debe contener una operación funcional, específica, no genérica y diferente de un texto de plantilla. La presencia de EVC, EPC o LDC en el nombre del auxiliar no modifica la modalidad de nombramiento de la operación; la restricción de ubicación del auxiliar se evalúa mediante EXT-002.

**Evidencia mínima:** Clasificación certificada del componente como API, dominio arquitectónico certificado y texto completo de la segunda sección. Para las API ubicadas en INTEGRACIÓN, el texto debe permitir comprobar que existe una única operación, que está escrita en inglés y que cumple el formato `camelCase`. Para las API ubicadas en SISTEMAS EXTERNOS, el texto debe permitir comprobar que la operación es funcional, específica, no genérica y diferente de un texto de plantilla. La operación no debe deducirse a partir del nombre de la API ni de otra sección.

- **Cumple:** La clasificación y ubicación de la API están certificadas y la segunda sección satisface todas las condiciones aplicables. En INTEGRACIÓN contiene únicamente una operación en inglés y en formato `camelCase`. En SISTEMAS EXTERNOS contiene una operación funcional, específica, no genérica y diferente de un texto de plantilla.
- **No cumple:** La clasificación, ubicación y segunda sección están certificadas y se incumple al menos una condición aplicable. En INTEGRACIÓN esto incluye una operación ausente, genérica, de plantilla, escrita en un idioma diferente del inglés, fuera del formato `camelCase`, acompañada de texto adicional o con más de una operación. En SISTEMAS EXTERNOS esto incluye una operación ausente, genérica, no funcional o correspondiente a un texto de plantilla.
- **No verificable:** No puede certificarse si el componente es una API; no puede determinarse si está ubicado en INTEGRACIÓN o SISTEMAS EXTERNOS; la segunda sección está ausente o incompleta por falta de evidencia; no puede verificarse razonablemente el idioma cuando se exige la validación rigurosa; o cualquier ambigüedad impide determinar si el texto corresponde exactamente a una operación válida. Si existe al menos un incumplimiento certificado, prevalece **No cumple** aunque otra condición sea no verificable.
- **No aplica:** La página no contiene API certificadas ni componentes candidatos cuya clasificación como API esté pendiente.

> **Nota de revisión (no normativa).** Qué cambió respecto de los 41: Dos modalidades por dominio. Decisiones abiertas: C-04, C-09 (ver sección 7).

---

### API-003 — Tipo y modelo de servicio de API

| | |
|---|---|
| Familia | API |
| Origen histórico | API-003 |
| Tipo de cambio | MODIFICADA |
| Riesgo de trazabilidad | MEDIO |
| Estado de la definición | Definida |
| Decisiones abiertas que la afectan | C-04, C-09, C-11 (y, para todas, las condiciones globales C-02 y C-03) |
| Huella del texto | d6fdad7c3d96 |

**Texto normativo (literal de la analista)**

**Resumen oficial:** Valida el tipo de API y el modelo de servicio declarados en la tercera sección, según el dominio arquitectónico en el que se encuentre la API.

**Población (Aplica a):** API principales e invocadas con tipo arquitectónico certificado.

**Obligación (Criterio):** Para una API ubicada en INTEGRACIÓN, directamente o dentro de un sistema externo auxiliar, la tercera sección debe seguir la estructura `tipo - modelo de servicio`. El valor anterior al guion debe ser exactamente `private`, `public` o `partner`, y el valor posterior debe ser exactamente `entidad`, `utilidad` o `tarea`. Ambos valores deben estar completamente en minúsculas y separados por un único guion estructural. No se admiten abreviaturas, traducciones, mayúsculas ni valores diferentes.

Para una API ubicada en SISTEMAS EXTERNOS, directamente o dentro de un sistema externo auxiliar, no se exige la estructura corporativa, los tipos ni los modelos del catálogo. La tercera sección debe contener información funcional, específica, no genérica y diferente de un texto de plantilla. La presencia de EVC, EPC o LDC en el nombre del auxiliar no modifica esta modalidad; la restricción de ubicación del auxiliar se evalúa mediante EXT-002.

**Evidencia mínima:** Clasificación certificada del componente como API, dominio arquitectónico certificado y texto completo de la tercera sección. Antes de evaluar, se eliminan los espacios iniciales y finales y se normalizan los espacios repetidos como un solo espacio. No se evalúa la cantidad de espacios antes o después del guion. Para las API ubicadas en INTEGRACIÓN debe ser posible identificar inequívocamente el tipo, el guion estructural y el modelo de servicio. Una exposición declarada por el analista puede utilizarse en API-004, pero no sustituye el tipo que debe estar escrito en la tercera sección para API-003.

- **Cumple:** La clasificación y ubicación de la API están certificadas y la tercera sección satisface todas las condiciones aplicables. En INTEGRACIÓN presenta exactamente un tipo permitido y un modelo de servicio permitido, en minúsculas y separados por un único guion estructural. En SISTEMAS EXTERNOS contiene información funcional, específica, no genérica y diferente de un texto de plantilla.
- **No cumple:** La clasificación, ubicación y tercera sección están certificadas y se incumple al menos una condición aplicable. En INTEGRACIÓN esto incluye la ausencia del tipo, del modelo de servicio o del guion estructural; un valor fuera de los catálogos permitidos; el uso de mayúsculas, abreviaturas o traducciones; un orden incorrecto; o más de un guion estructural. La declaración posterior del tipo por parte del analista no corrige este incumplimiento. En SISTEMAS EXTERNOS esto incluye una sección ausente, genérica, no funcional o correspondiente a un texto de plantilla.
- **No verificable:** No puede certificarse si el componente es una API; no puede determinarse si está ubicado en INTEGRACIÓN o en SISTEMAS EXTERNOS; el texto de la tercera sección no está disponible o está incompleto por falta de evidencia; no puede distinguirse inequívocamente el guion estructural de un guion perteneciente a un valor; o cualquier ambigüedad impide evaluar una condición aplicable. Si la sección está disponible y se certifica que falta el tipo, el modelo o el guion, corresponde **No cumple**, no **No verificable**. Si existe al menos un incumplimiento certificado, prevalece **No cumple** aunque otra condición sea no verificable.
- **No aplica:** La página no contiene API certificadas ni componentes candidatos cuya clasificación como API esté pendiente.

> **Nota de revisión (no normativa).** Qué cambió respecto de los 41: `tipo - modelo` en minúsculas; la declaración no corrige. Decisiones abiertas: C-04, C-09, C-11 (ver sección 7).

---

### API-004 — Capa de Despliegue de la API principal

| | |
|---|---|
| Familia | API |
| Origen histórico | API-004; absorbe: CA-002 antiguo (Asociación de Capa; retirada); FT-002 antiguo (Asociación de Flujo; retirada) |
| Tipo de cambio | MODIFICADA |
| Riesgo de trazabilidad | MEDIO |
| Estado de la definición | Definida |
| Decisiones abiertas que la afectan | C-11 (y, para todas, las condiciones globales C-02 y C-03) |
| Huella del texto | 220dcfc3b886 |

**Texto normativo (literal de la analista)**

**Resumen oficial:** Valida que la API principal declarada como MCI tenga la capa de despliegue requerido según su tipo de exposición.

**Población (Aplica a):** API principal con tipo arquitectónico y rol certificados, declarada como MCI.

**Obligación (Criterio):** Cuando la API principal está declarada como MCI, la capa de despliegue exigido depende de su tipo de exposición: una API `private` debe tener asociadas una Capa de Arquitectura y un Flujo Transaccional; una API `partner` debe tener asociada una Capa de Arquitectura y no requiere Flujo Transaccional; una API `public` no requiere Capa de Arquitectura ni Flujo Transaccional. Las asociaciones requeridas deben pertenecer inequívocamente a la API principal y no pueden establecerse únicamente por cercanía, alineación, superposición o ubicación dentro del mismo contenedor.

Cuando la API principal está declarada como no MCI, no se exige Capa de Arquitectura, Flujo Transaccional ni la declaración `Federado`. Las API invocadas se excluyen de esta regla, independientemente de su condición MCI o de los elementos de despliegue que presenten.

**Evidencia mínima:** Identificación certificada de la API principal, tipo de exposición obtenido de la tercera sección o declarado por la analista, condición MCI o no MCI declarada por la analista y asociaciones estructurales suficientes para determinar si la Capa de Arquitectura y el Flujo Transaccional requeridos pertenecen a la API principal. La declaración de la analista determina la exposición o condición MCI cuando corresponda, pero no sustituye la evidencia de asociación de la Capa o del Flujo.

- **Cumple:** La API principal está declarada como MCI, su tipo de exposición está determinado y presenta todo la capa de despliegue exigido: Capa de Arquitectura y Flujo Transaccional para `private`, o Capa de Arquitectura para `partner`. Una API `public` cumple sin necesidad de Capa ni Flujo.
- **No cumple:** La API principal está declarada como MCI, su tipo de exposición y las asociaciones de despliegue están suficientemente certificadas, y falta al menos uno de los elementos obligatorios según su exposición: Capa o Flujo para `private`, o Capa para `partner`.
- **No verificable:** No puede certificarse cuál es la API principal; falta la declaración de su condición MCI cuando esta cambia la aplicabilidad; no puede determinarse su tipo de exposición mediante la tercera sección ni mediante una declaración de la analista; o existe una Capa o un Flujo candidato, pero no puede certificarse que esté asociado a la API principal. La presencia visual, cercanía o pertenencia al mismo contenedor no constituye evidencia suficiente de asociación.
- **No aplica:** La API principal está declarada como no MCI; el componente corresponde a una API invocada; o la página no contiene una API principal ni candidatos pendientes de identificación para ese rol.

> **Nota de revisión (no normativa).** Qué cambió respecto de los 41: Condicionada a MCI declarado; invocadas excluidas. Decisiones abiertas: C-11 (ver sección 7).

---

### SRV-001 — Nombramiento y versión opcional de servicio

| | |
|---|---|
| Familia | SRV |
| Origen histórico | SRV-001 |
| Tipo de cambio | SIN CAMBIO TEXTUAL (criterio pendiente) |
| Riesgo de trazabilidad | MEDIO |
| Estado de la definición | Pendiente (criterio sin delimitar) |
| Decisiones abiertas que la afectan | C-01 (y, para todas, las condiciones globales C-02 y C-03) |
| Huella del texto | 4bc7a933bd10 |

**Texto normativo (literal de la analista)**

**Resumen oficial:** Valida el nombre específico y la versión opcional del servicio.

**Población (Aplica a):** Servicios principal e invocados

**Obligación (Criterio):** Puede iniciar por ms; admite -, _ o espacios. Si hay versión, V/v y tres segmentos.

**Evidencia mínima:** Primera sección completa.

- **Cumple:** evidencia suficiente y criterio satisfecho.
- **No cumple:** Nombre genérico o versión presente con formato inválido.
- **No verificable:** Clasificación o texto no certificados.
- **No aplica:** Fuera de la población evaluable.

> **Nota de revisión (no normativa).** Qué cambió respecto de los 41: Texto idéntico; población ambigua frente al nuevo modelo. Decisiones abiertas: C-01 (ver sección 7).

---

### SRV-002 — Operación del servicio

| | |
|---|---|
| Familia | SRV |
| Origen histórico | SRV-002 |
| Tipo de cambio | SIN CAMBIO TEXTUAL (criterio pendiente) |
| Riesgo de trazabilidad | MEDIO |
| Estado de la definición | Pendiente (criterio sin delimitar) |
| Decisiones abiertas que la afectan | C-01 (y, para todas, las condiciones globales C-02 y C-03) |
| Huella del texto | 72b0b5928f43 |

**Texto normativo (literal de la analista)**

**Resumen oficial:** Valida operación obligatoria, específica y en camelCase.

**Población (Aplica a):** Servicios principal e invocados

**Obligación (Criterio):** No deducir operación del nombre.

**Evidencia mínima:** Segunda sección completa.

- **Cumple:** evidencia suficiente y criterio satisfecho.
- **No cumple:** Operación ausente, genérica o fuera de camelCase.
- **No verificable:** Sección incompleta o servicio no certificado.
- **No aplica:** Fuera de la población evaluable.

> **Nota de revisión (no normativa).** Qué cambió respecto de los 41: Ídem. Decisiones abiertas: C-01 (ver sección 7).

---

### SRV-003 — Modelo del servicio invocado

| | |
|---|---|
| Familia | SRV |
| Origen histórico | SRV-003 |
| Tipo de cambio | MODIFICADA |
| Riesgo de trazabilidad | ALTO |
| Estado de la definición | Condicionada a una decisión abierta |
| Decisiones abiertas que la afectan | C-04, C-05, C-09, C-11 (y, para todas, las condiciones globales C-02 y C-03) |
| Huella del texto | 86604193e98c |

**Texto normativo (literal de la analista)**

**Resumen oficial:** Valida que la tercera sección de un servicio invocado declare un modelo de servicio permitido.

**Población (Aplica a):** Componentes certificados como servicios invocados.

**Obligación (Criterio):** La tercera sección debe declarar obligatoriamente uno de los siguientes modelos de servicio: `entidad`, `utilidad` o `tarea`. Se aceptan diferencias de mayúsculas y minúsculas, pero no se admiten traducciones, abreviaturas, valores distintos de los permitidos ni textos de plantilla.

Esta regla se aplica únicamente a servicios invocados. El contenedor hijo principal representa el servicio principal del escenario y no se evalúa mediante esta regla. La clasificación del componente como servicio invocado debe estar certificada; las palabras `entidad`, `utilidad` o `tarea` no demuestran por sí solas que el componente sea un servicio.

**Evidencia mínima:** Clasificación certificada del componente como servicio invocado y texto completo de su tercera sección. Antes de evaluar, se eliminan los espacios iniciales y finales. La evidencia debe permitir determinar que la sección declara un único modelo de servicio perteneciente al catálogo permitido.

- **Cumple:** Todos los servicios invocados evaluables declaran en su tercera sección exactamente uno de los modelos permitidos: `entidad`, `utilidad` o `tarea`, sin importar el uso de mayúsculas o minúsculas.
- **No cumple:** El componente está certificado como servicio invocado y la tercera sección está disponible y completa, pero el modelo está ausente, corresponde a un texto de plantilla, contiene un valor diferente de `entidad`, `utilidad` o `tarea`, utiliza una traducción o abreviatura, declara más de un modelo o contiene texto adicional que impide reconocer un único valor permitido.
- **No verificable:** No puede determinarse si el componente es una API o un servicio invocado; no puede certificarse su rol como invocado; la tercera sección no está disponible o está incompleta por pérdida de evidencia; o existe una ambigüedad que impide determinar el modelo declarado. Las palabras `entidad`, `utilidad` o `tarea`, sin evidencia arquitectónica adicional, no permiten clasificar el componente como servicio. Si existe al menos un incumplimiento certificado, prevalece **No cumple** aunque otro servicio sea no verificable.
- **No aplica:** La página no contiene servicios invocados certificados ni componentes candidatos cuya clasificación como servicio invocado esté pendiente. El contenedor hijo principal no hace aplicable esta regla.

> **Nota de revisión (no normativa).** Qué cambió respecto de los 41: Se restringe a servicios invocados; el hijo principal queda excluido. Decisiones abiertas: C-04, C-05, C-09, C-11 (ver sección 7).

---

### SRV-004 — Detalle de despliegue del servicio principal

| | |
|---|---|
| Familia | SRV |
| Origen histórico | — (nueva); absorbe: CA-002 antiguo (Asociación de Capa; retirada); FT-002 antiguo (Asociación de Flujo; retirada) |
| Tipo de cambio | NUEVA |
| Riesgo de trazabilidad | BAJO |
| Estado de la definición | Definida |
| Decisiones abiertas que la afectan | — (y, para todas, las condiciones globales C-02 y C-03) |
| Huella del texto | 514d58f56bc1 |

**Texto normativo (literal de la analista)**

**Resumen oficial:** Valida que el servicio principal representado por el contenedor hijo tenga asociados una Capa de Arquitectura y un Flujo Transaccional cuando corresponda a los escenarios E1 o E2 y esté declarado como MCI.

**Población (Aplica a):** Contenedor hijo principal de los escenarios E1 y E2, entendido como representación del servicio principal del escenario.

**Obligación (Criterio):** En los escenarios E1 y E2, cuando el contenedor hijo principal esté declarado como MCI, debe tener asociados una Capa de Arquitectura y un Flujo Transaccional. Ambas figuras deben pertenecer inequívocamente al hijo principal; la asociación no puede establecerse únicamente por cercanía, alineación, superposición o ubicación dentro del mismo contenedor.

Cuando el hijo principal esté declarado como no MCI, no se exigen Capa de Arquitectura, Flujo Transaccional ni la declaración `Federado`. En el escenario E3 no se evalúa la capa de despliegue del hijo principal mediante esta regla. Para esta evaluación, el hijo principal representa el servicio principal del escenario y no se requiere que el JSON lo clasifique adicionalmente como servicio principal. El nombramiento de las figuras existentes se evalúa mediante CA-001 y FT-001.

**Evidencia mínima:** Patrón estructural E1 o E2 determinado, identificación certificada de un único contenedor hijo principal, condición MCI o no MCI declarada por la analista y evidencia estructural suficiente para demostrar la asociación del hijo con una Capa de Arquitectura y un Flujo Transaccional. La declaración MCI determina la aplicabilidad de la obligación, pero no demuestra por sí misma la existencia ni la asociación de las figuras de despliegue.

- **Cumple:** El patrón estructural aplicable es E1 o E2, el hijo principal está declarado como MCI y tiene asociados inequívocamente una Capa de Arquitectura y un Flujo Transaccional.
- **No cumple:** El patrón estructural aplicable es E1 o E2, el hijo principal está declarado como MCI, la cobertura de las figuras de despliegue y sus asociaciones está certificada, y falta la Capa de Arquitectura, el Flujo Transaccional o ambos.
- **No verificable:** No puede determinarse el patrón estructural E1 o E2; no puede identificarse inequívocamente un único contenedor hijo principal; falta la declaración de su condición MCI; la cobertura de las figuras de despliegue es insuficiente; o existen una Capa de Arquitectura o un Flujo Transaccional candidatos, pero no puede demostrarse que pertenezcan al hijo principal. La cercanía, alineación, superposición o ubicación dentro del mismo contenedor no constituyen evidencia suficiente de asociación.
- **No aplica:** El hijo principal de E1 o E2 está declarado como no MCI; el patrón estructural aplicable es E3; o la página no contiene un hijo principal ni candidatos pendientes de identificación para ese rol.

> **Nota de revisión (no normativa).** Qué cambió respecto de los 41: Nueva: Capa de Despliegue del hijo principal en E1/E2.

---

### EVT-001 — Nombramiento y versión del evento de integración

| | |
|---|---|
| Familia | EVT |
| Origen histórico | EVT-001 |
| Tipo de cambio | MODIFICADA |
| Riesgo de trazabilidad | MEDIO |
| Estado de la definición | Definida |
| Decisiones abiertas que la afectan | C-04, C-06, C-09 (y, para todas, las condiciones globales C-02 y C-03) |
| Huella del texto | 1cf90e035084 |

**Texto normativo (literal de la analista)**

**Resumen oficial:** Valida el nombre y la versión declarados en la primera sección de un evento de integración.

**Población (Aplica a):** Componentes certificados como eventos de integración de tipo Aplicación o Empresarial.

**Obligación (Criterio):** La primera sección debe seguir el formato `Nombre Producto - Nombre Capacidad_vMayor.Menor.Parche`. El nombre del producto y el nombre de la capacidad deben ser reales, funcionales, específicos, no genéricos, diferentes de textos de plantilla y estar escritos en inglés. Cada palabra significativa debe comenzar con letra mayúscula; los artículos, preposiciones y conjunciones pueden permanecer en minúscula cuando la nomenclatura inglesa lo permita.

Debe existir un único guion con función estructural entre el nombre del producto y el nombre de la capacidad. Los guiones que formen parte legítima de nombres propios, marcas o términos compuestos no se consideran automáticamente separadores estructurales. La versión debe estar precedida por un guion bajo, comenzar con `v` o `V` y contener exactamente tres segmentos numéricos: Mayor mayor o igual que 1, Menor mayor o igual que 0 y Parche mayor o igual que 0.

En la primera sección se permiten letras de la `a` a la `z`, en mayúsculas o minúsculas, números del `0` al `9`, espacios entre palabras, punto, guion bajo y guion. No se admiten otros caracteres especiales. La validación completa se aplica a todo evento de integración certificado, incluso cuando esté encapsulado dentro de un sistema externo auxiliar. La ubicación permitida del evento se evalúa en las reglas de contenedores y sistemas externos auxiliares, y no modifica la evaluación de su nomenclatura.

**Evidencia mínima:** Clasificación certificada del componente como evento de integración de tipo Aplicación o Empresarial y texto completo de la primera sección. La evidencia debe permitir identificar inequívocamente el nombre del producto, el guion estructural, el nombre de la capacidad, el guion bajo y la versión. Antes de evaluar, se eliminan los espacios iniciales y finales y se normalizan los espacios repetidos como un solo espacio. No se evalúa la cantidad de espacios alrededor del guion estructural. El idioma no se determina únicamente por siglas, marcas, nombres propios, términos técnicos ni palabras compartidas por varios idiomas.

- **Cumple:** El componente está certificado como evento de integración y la primera sección cumple todas las condiciones de estructura, especificidad, idioma, capitalización, caracteres permitidos y versión.
- **No cumple:** La clasificación del evento y el texto completo están certificados, y se incumple al menos una condición aplicable. Esto incluye un nombre ausente, genérico, no funcional o de plantilla; producto o capacidad ausentes o en orden incorrecto; idioma diferente del inglés; capitalización incorrecta; ausencia o invalidez del guion estructural; ausencia del guion bajo anterior a la versión; versión ausente o inválida; o presencia de caracteres no permitidos.
- **No verificable:** No puede certificarse que el componente sea un evento de integración de tipo Aplicación o Empresarial; la primera sección no está disponible o está incompleta por pérdida de evidencia; no puede distinguirse el guion estructural de los guiones propios de nombres o marcas; no puede verificarse razonablemente el idioma; o cualquier ambigüedad impide evaluar alguna condición aplicable. Si existe al menos un incumplimiento certificado, prevalece **No cumple** aunque otra condición sea no verificable.
- **No aplica:** La página no contiene eventos de integración certificados ni componentes candidatos cuya clasificación como evento de integración esté pendiente.

> **Nota de revisión (no normativa).** Qué cambió respecto de los 41: Guion bajo obligatorio; charset cerrado. Decisiones abiertas: C-04, C-06, C-09 (ver sección 7).

---

### EVT-002 — Operación del evento de integración

| | |
|---|---|
| Familia | EVT |
| Origen histórico | EVT-002 |
| Tipo de cambio | MODIFICADA |
| Riesgo de trazabilidad | MEDIO |
| Estado de la definición | Definida |
| Decisiones abiertas que la afectan | C-04, C-06, C-09 (y, para todas, las condiciones globales C-02 y C-03) |
| Huella del texto | 180c2d0260e7 |

**Texto normativo (literal de la analista)**

**Resumen oficial:** Valida la operación declarada en la segunda sección de un evento de integración.

**Población (Aplica a):** Componentes certificados como eventos de integración de tipo Aplicación o Empresarial.

**Obligación (Criterio):** La segunda sección debe contener únicamente el nombre de la operación del evento de integración. La operación debe estar escrita en inglés y en formato `camelCase`: debe comenzar con una letra minúscula, contener únicamente letras y números, no incluir espacios, guiones ni guiones bajos, y utilizar una letra mayúscula inicial para cada palabra posterior a la primera cuando el nombre tenga varias palabras. La operación debe ser funcional, específica, no genérica y diferente de un texto de plantilla.

La validación completa se aplica a todo evento de integración certificado, incluso cuando esté encapsulado dentro de un sistema externo auxiliar o esté ubicado directamente en SISTEMAS EXTERNOS. La ubicación permitida del evento se evalúa mediante las reglas de contenedores y sistemas externos auxiliares, y no modifica la evaluación de su operación.

**Evidencia mínima:** Clasificación certificada del componente como evento de integración de tipo Aplicación o Empresarial y texto completo de la segunda sección. El texto debe permitir comprobar que contiene únicamente una operación, que está escrita en inglés y que cumple el formato `camelCase`. La operación no debe deducirse a partir del nombre del evento, de su clasificación ni de otra sección.

- **Cumple:** El componente está certificado como evento de integración y la segunda sección contiene únicamente una operación funcional, específica, no genérica, diferente de un texto de plantilla, escrita en inglés y en formato `camelCase`.
- **No cumple:** La clasificación del evento y el texto completo de la segunda sección están certificados, y la operación está ausente, es genérica, no es funcional, corresponde a un texto de plantilla, está escrita en un idioma diferente del inglés, no cumple el formato `camelCase`, contiene caracteres no permitidos, incluye texto adicional o contiene más de una operación.
- **No verificable:** No puede certificarse que el componente sea un evento de integración de tipo Aplicación o Empresarial; la segunda sección no está disponible o está incompleta por pérdida de evidencia; no puede verificarse razonablemente el idioma; o existe una ambigüedad que impide determinar si el texto corresponde exactamente a una operación válida. Si existe al menos un incumplimiento certificado, prevalece **No cumple** aunque otra condición sea no verificable.
- **No aplica:** La página no contiene eventos de integración certificados ni componentes candidatos cuya clasificación como evento de integración esté pendiente.

> **Nota de revisión (no normativa).** Qué cambió respecto de los 41: PascalCase → camelCase. Decisiones abiertas: C-04, C-06, C-09 (ver sección 7).

---

### EVT-003 — Tipo y clasificación del evento de integración

| | |
|---|---|
| Familia | EVT |
| Origen histórico | EVT-003 |
| Tipo de cambio | MODIFICADA |
| Riesgo de trazabilidad | MEDIO |
| Estado de la definición | Definida |
| Decisiones abiertas que la afectan | C-04, C-06 (y, para todas, las condiciones globales C-02 y C-03) |
| Huella del texto | 8c106d0d25af |

**Texto normativo (literal de la analista)**

**Resumen oficial:** Valida el tipo y la clasificación declarados en la tercera sección de un evento de integración.

**Población (Aplica a):** Componentes certificados como eventos de integración.

**Obligación (Criterio):** La tercera sección debe seguir la estructura `Tipo - Clasificacion`. El valor anterior al guion estructural debe ser exactamente `Aplicacion` o `Empresarial`, y el valor posterior debe ser exactamente `Query`, `Command` o `Event`. Ambos valores deben respetar la capitalización indicada: letra inicial en mayúscula y letras restantes en minúscula. Debe existir un único guion con función estructural entre el tipo y la clasificación. No se admiten traducciones, abreviaturas, tildes, diferencias de mayúsculas o minúsculas ni valores distintos de los catálogos permitidos.

La validación completa se aplica a todo evento de integración certificado, independientemente de que esté ubicado directamente en un dominio o encapsulado dentro de un sistema externo auxiliar. La ubicación permitida del evento se evalúa mediante las reglas de contenedores y sistemas externos auxiliares, y no modifica la evaluación de su tipo y clasificación.

**Evidencia mínima:** Clasificación certificada del componente como evento de integración y texto completo de la tercera sección. Antes de evaluar, se eliminan los espacios iniciales y finales y se normalizan los espacios consecutivos como un solo espacio. Se permite cualquier cantidad de espacios alrededor del guion estructural. La evidencia debe permitir identificar inequívocamente el tipo, el guion estructural y la clasificación.

- **Cumple:** El componente está certificado como evento de integración y la tercera sección contiene exactamente un tipo y una clasificación permitidos, en el orden y con la capitalización exigidos, separados por un único guion estructural.
- **No cumple:** La clasificación del componente y el texto completo de la tercera sección están certificados, y se presenta al menos una de las siguientes situaciones: falta el tipo, la clasificación o el guion estructural; el orden es incorrecto; existe más de un guion estructural; alguno de los valores está fuera del catálogo permitido; se utiliza una traducción, abreviatura o tilde; o no se respeta la capitalización exigida.
- **No verificable:** No puede certificarse que el componente sea un evento de integración; la tercera sección no está disponible o está incompleta por pérdida de evidencia; no puede distinguirse inequívocamente el guion estructural de un guion perteneciente a otro texto; o existe una ambigüedad que impide evaluar alguna condición aplicable. Si la sección está disponible y se certifica que falta el tipo, la clasificación o el guion estructural, corresponde **No cumple**, no **No verificable**. Si existe al menos un incumplimiento certificado, prevalece **No cumple** aunque otra condición sea no verificable.
- **No aplica:** La página no contiene eventos de integración certificados ni componentes candidatos cuya clasificación como evento de integración esté pendiente.

> **Nota de revisión (no normativa).** Qué cambió respecto de los 41: Se retira la tolerancia de tilde. Decisiones abiertas: C-04, C-06 (ver sección 7).

---

### EVT-004 — Capa de Tópicos del evento de integración

| | |
|---|---|
| Familia | EVT |
| Origen histórico | EVT-005 (ID reutilizado: la EVT-004 anterior era despliegue) |
| Tipo de cambio | RENUMERADA (antes EVT-005) y MODIFICADA · **ID reutilizado con otro significado** |
| Riesgo de trazabilidad | ALTO |
| Estado de la definición | Definida |
| Decisiones abiertas que la afectan | C-06 (y, para todas, las condiciones globales C-02 y C-03) |
| Huella del texto | a16d8951b19a |

**Texto normativo (literal de la analista)**

**Resumen oficial:** Valida que cada evento de integración tenga asociada una única Capa de Tópicos.

**Población (Aplica a):** Componentes certificados como eventos de integración.

**Obligación (Criterio):** Todo evento de integración debe tener asociada exactamente una Capa de Tópicos. El nombre de la Capa de Tópicos no afecta al cumplimiento de esta regla. Tampoco se evalúan aquí la cantidad, los roles, el nombramiento ni las conexiones de los tópicos contenidos.

**Evidencia mínima:** Identificación certificada del evento de integración, inventario completo de las Capas de Tópicos y evidencia estructural suficiente para determinar cuántas están asociadas al evento. La asociación no debe inferirse únicamente por cercanía, alineación, superposición o pertenencia al mismo contenedor.

- **Cumple:** Cada evento de integración certificado tiene asociada inequívocamente una única Capa de Tópicos.
- **No cumple:** La cobertura de las Capas de Tópicos y sus asociaciones está certificada, y al menos un evento de integración no tiene ninguna Capa de Tópicos asociada o tiene más de una.
- **No verificable:** No puede certificarse que el componente sea un evento de integración; el inventario o las asociaciones no tienen cobertura suficiente; existen una o más Capas de Tópicos candidatas, pero no puede demostrarse su asociación con el evento; o la asociación es ambigua, parcial o contradictoria. Si se demuestra la ausencia o multiplicidad de Capas de Tópicos para un evento, prevalece **No cumple**.
- **No aplica:** La página no contiene eventos de integración certificados ni componentes candidatos cuya clasificación como evento de integración esté pendiente.

> **Nota de revisión (no normativa).** Qué cambió respecto de los 41: Contenedor de tópicos → única Capa de Tópicos. Decisiones abiertas: C-06 (ver sección 7).

---

### EVT-005 — Cantidad y roles de tópicos

| | |
|---|---|
| Familia | EVT |
| Origen histórico | EVT-006 |
| Tipo de cambio | RENUMERADA (antes EVT-006) y MODIFICADA · **ID reutilizado con otro significado** |
| Riesgo de trazabilidad | ALTO |
| Estado de la definición | Definida |
| Decisiones abiertas que la afectan | C-06, C-11 (y, para todas, las condiciones globales C-02 y C-03) |
| Huella del texto | 6bd9c218b6e7 |

**Texto normativo (literal de la analista)**

**Resumen oficial:** Valida la cantidad y los roles de los tópicos contenidos en la Capa de Tópicos de un evento de integración, según su clasificación.

**Población (Aplica a):** Eventos de integración con clasificación certificada como `Query`, `Command` o `Event` y con una única Capa de Tópicos asociada.

**Obligación (Criterio):** Los tópicos se identifican por su rol como publicación (`p`) o suscripción (`s`). Un evento clasificado como `Query` debe tener exactamente dos tópicos: uno de publicación y uno de suscripción. Un evento clasificado como `Command` debe tener exactamente uno de estos patrones: un tópico de publicación; un tópico de suscripción; o un tópico de publicación y uno de suscripción. Un evento clasificado como `Event` debe tener exactamente un tópico, que puede ser de publicación o de suscripción. La Capa de Tópicos no puede estar vacía. Esta regla evalúa únicamente la cantidad y los roles; el formato completo del nombre de cada tópico se evalúa mediante EVT-006.

**Evidencia mínima:** Clasificación certificada del evento como `Query`, `Command` o `Event`; asociación certificada con una única Capa de Tópicos; inventario completo de los tópicos contenidos en esa capa; y evidencia suficiente para determinar el rol de cada tópico como publicación (`p`) o suscripción (`s`).

- **Cumple:** La Capa de Tópicos contiene la cantidad y combinación exactas exigidas por la clasificación del evento: un tópico `p` y uno `s` para `Query`; un tópico `p`, un tópico `s`, o uno de cada rol para `Command`; o exactamente un tópico `p` o `s` para `Event`.
- **No cumple:** La clasificación, la asociación con la Capa de Tópicos y la cobertura de sus tópicos están certificadas, y la capa está vacía, falta un rol obligatorio, existe una combinación no permitida, la cantidad no corresponde a la clasificación del evento o hay tópicos adicionales a los admitidos.
- **No verificable:** No puede certificarse la clasificación del evento; no puede demostrarse la asociación con la Capa de Tópicos; el inventario de tópicos no tiene cobertura suficiente; no puede determinarse el rol de al menos un tópico; o el evento tiene más de una Capa de Tópicos y no existe una única capa sobre la cual evaluar la cantidad y los roles. Si se demuestra que la única capa está vacía o existe otro incumplimiento certificado, prevalece **No cumple**.
- **No aplica:** La página no contiene eventos de integración certificados ni candidatos pendientes de clasificación. Si existe un evento de integración, pero no tiene una Capa de Tópicos asociada, la ausencia se evalúa en EVT-004 y EVT-005 queda **No verificable**.

> **Nota de revisión (no normativa).** Qué cambió respecto de los 41: Cantidad y roles de tópicos. Decisiones abiertas: C-06, C-11 (ver sección 7).

---

### EVT-006 — Nombramiento de tópicos

| | |
|---|---|
| Familia | EVT |
| Origen histórico | EVT-007 |
| Tipo de cambio | RENUMERADA (antes EVT-007) y MODIFICADA · **ID reutilizado con otro significado** |
| Riesgo de trazabilidad | ALTO |
| Estado de la definición | Definida |
| Decisiones abiertas que la afectan | C-06, C-11 (y, para todas, las condiciones globales C-02 y C-03) |
| Huella del texto | 9f9218fdcd1a |

**Texto normativo (literal de la analista)**

**Resumen oficial:** Valida que el nombre de cada tópico asociado a un evento de integración cumpla uno de los patrones permitidos.

**Población (Aplica a):** Tópicos contenidos en la Capa de Tópicos asociada a un evento de integración.

**Obligación (Criterio):** El nombre de cada tópico debe cumplir exactamente uno de los siguientes patrones: `p.producto.capacidad.vX`, `s.producto.capacidad.vX`, `p.producto.capacidad.codigoAplicacion.vX` o `s.producto.capacidad.codigoAplicacion.vX`. El primer segmento debe ser `p` para publicación o `s` para suscripción. Los segmentos `producto` y `capacidad` son obligatorios, mientras que `codigoAplicacion` es opcional y, cuando exista, debe ubicarse después de `capacidad`. El último segmento debe seguir el formato `vX`, donde `v` es minúscula y `X` es un número entero mayor o igual que 1, sin ceros iniciales.

El nombre completo debe estar escrito en minúsculas. Los segmentos `producto`, `capacidad` y `codigoAplicacion` solo pueden contener letras de la `a` a la `z` y números del `0` al `9`; no pueden contener espacios, guiones, guiones bajos ni otros caracteres especiales. Los segmentos deben estar separados exclusivamente mediante puntos y no pueden estar vacíos.

**Evidencia mínima:** Asociación certificada del tópico con la Capa de Tópicos del evento y texto completo de su nombre. La evidencia debe permitir identificar inequívocamente el rol `p` o `s`, los segmentos obligatorios `producto` y `capacidad`, el segmento opcional `codigoAplicacion` cuando exista y la versión final `vX`.

- **Cumple:** Todos los tópicos evaluados cumplen exactamente uno de los cuatro patrones permitidos, están escritos completamente en minúsculas, contienen los segmentos obligatorios en el orden establecido, utilizan únicamente letras y números dentro de cada segmento y terminan con una versión `vX` cuyo número es mayor o igual que 1 y no contiene ceros iniciales.
- **No cumple:** El inventario y los nombres completos de los tópicos están certificados, y al menos un tópico presenta una de las siguientes situaciones: no cumple ninguno de los patrones permitidos; utiliza un prefijo diferente de `p` o `s`; omite `producto`, `capacidad` o la versión; ubica `codigoAplicacion` en una posición incorrecta; contiene segmentos adicionales o vacíos; utiliza mayúsculas, espacios, guiones, guiones bajos u otros caracteres especiales; no separa los segmentos mediante puntos; utiliza una `V` mayúscula; o declara una versión igual a cero, no numérica o con ceros iniciales.
- **No verificable:** No puede demostrarse la asociación del tópico con la Capa de Tópicos del evento; el nombre del tópico no está disponible o está incompleto por pérdida de evidencia; el inventario de tópicos no tiene cobertura suficiente; o existe una ambigüedad que impide separar o interpretar sus segmentos. Si existe al menos un incumplimiento certificado, prevalece **No cumple** aunque otro tópico sea no verificable.
- **No aplica:** No existen tópicos asociados a eventos de integración ni candidatos pendientes de identificación. Si existe un evento de integración, pero falta su Capa de Tópicos o no puede determinarse su contenido, la regla queda **No verificable**, no **No aplica**.

> **Nota de revisión (no normativa).** Qué cambió respecto de los 41: Nombre del tópico. Decisiones abiertas: C-06, C-11 (ver sección 7).

---

### EVT-007 — Conexiones del evento de integración

| | |
|---|---|
| Familia | EVT |
| Origen histórico | EVT-008 |
| Tipo de cambio | RENUMERADA (antes EVT-008) y MODIFICADA · **ID reutilizado con otro significado** |
| Riesgo de trazabilidad | ALTO |
| Estado de la definición | Definida |
| Decisiones abiertas que la afectan | C-06, C-07, C-11 (y, para todas, las condiciones globales C-02 y C-03) |
| Huella del texto | 45caed132748 |

**Texto normativo (literal de la analista)**

**Resumen oficial:** Valida la existencia, el sentido, las terminaciones y el tipo de `BPMNEvent` de las conexiones asociadas a los tópicos de un evento de integración.

**Población (Aplica a):** Eventos de integración con clasificación certificada y tópicos identificados con rol de publicación (`p`) o suscripción (`s`).

**Obligación (Criterio):** Cada tópico debe tener una conexión acorde con su rol. Un tópico de publicación (`p`) exige una conexión desde un `BPMNEvent` de tipo Señal de Envío hacia el evento de integración, con `CircleOpen` en el origen y `Generalization` en el destino. Un tópico de suscripción (`s`) exige una conexión desde el evento de integración hacia un `BPMNEvent` de tipo Señal de Recepción, con `Generalization` en el origen y `CircleOpen` en el destino.

Para un evento `Query` deben existir las conexiones correspondientes a los tópicos `p` y `s`. Para un evento `Command` se exigen ambas conexiones cuando tenga tópicos `p` y `s`, o únicamente la conexión correspondiente cuando tenga solo `p` o solo `s`. Para un evento `Event` se exige la conexión correspondiente al único tópico `p` o `s`.

La conexión puede terminar directamente en el evento de integración, en su Capa de Tópicos o en una Capa de Despliegue inequívocamente asociada al evento. Cuando se utilice una capa como extremo, debe demostrarse que pertenece al evento de integración.

**Evidencia mínima:** Clasificación certificada del evento de integración; inventario completo de sus tópicos y roles `p` o `s`; identificación certificada del `BPMNEvent` como Señal de Envío o Señal de Recepción, según corresponda; y conexiones completas con participantes, sentido y terminaciones. Cuando una conexión termine en la Capa de Tópicos o en una Capa de Despliegue, debe estar certificada su asociación con el evento.

- **Cumple:** Para cada tópico existe la conexión exigida por su rol. Los tópicos `p` están relacionados con un `BPMNEvent` de tipo Señal de Envío mediante una conexión dirigida hacia el evento, con `CircleOpen` en el origen y `Generalization` en el destino. Los tópicos `s` están relacionados con un `BPMNEvent` de tipo Señal de Recepción mediante una conexión dirigida desde el evento, con `Generalization` en el origen y `CircleOpen` en el destino. Los extremos alternativos utilizados pertenecen inequívocamente al evento.
- **No cumple:** La clasificación, los roles, el tipo de `BPMNEvent` y la cobertura de las conexiones están certificados, y falta una conexión obligatoria, el sentido no corresponde al rol del tópico, el tipo de `BPMNEvent` es incompatible con dicho rol, las terminaciones son incorrectas o la conexión termina en un componente certificado que no representa ni pertenece al evento de integración.
- **No verificable:** No puede certificarse el tipo del `BPMNEvent` como Señal de Envío o Señal de Recepción; no puede determinarse el rol de un tópico; la clasificación del evento es indeterminada; la dirección, las terminaciones o los participantes de una conexión son ambiguos o contradictorios; la cobertura no permite demostrar su existencia o ausencia; o no puede demostrarse que la capa utilizada como extremo pertenece al evento. La identificación genérica de una figura como `BPMNEvent` no es suficiente para declarar cumplimiento. Si existe al menos un incumplimiento certificado, prevalece **No cumple** aunque otra conexión sea no verificable.
- **No aplica:** La página no contiene eventos de integración certificados ni componentes candidatos cuya clasificación como evento de integración esté pendiente. Si existe un evento, pero faltan la Capa de Tópicos, los tópicos, sus roles o el subtipo de los `BPMNEvent`, la regla queda **No verificable**, no **No aplica**.

> **Nota de revisión (no normativa).** Qué cambió respecto de los 41: Conexiones; exige subtipo Señal de Envío/Recepción. Decisiones abiertas: C-06, C-07, C-11 (ver sección 7).

---

### CA-001 — Nombramiento de Capa de Arquitectura

| | |
|---|---|
| Familia | CA |
| Origen histórico | CA-001 (la existencia pasa a otras reglas; CA-002 retirada) |
| Tipo de cambio | MODIFICADA |
| Riesgo de trazabilidad | MEDIO |
| Estado de la definición | Definida |
| Decisiones abiertas que la afectan | — (y, para todas, las condiciones globales C-02 y C-03) |
| Huella del texto | 102b728a2fa9 |

**Texto normativo (literal de la analista)**

**Resumen oficial:** Valida el nombre de las figuras certificadas como Capa de Arquitectura.

**Población (Aplica a):** Figuras certificadas como Capas de Arquitectura, independientemente del componente al que estén asociadas.

**Obligación (Criterio):** El nombre debe seguir exactamente la estructura `Capa de Arquitectura - tipo`. El valor anterior al guion estructural debe ser `Capa de Arquitectura` y el valor posterior debe ser exactamente `composicion`, `experiencia` o `sistema`. Los tipos deben escribirse completamente en minúsculas y sin tildes. Debe existir un único guion con función estructural entre el nombre de la figura y el tipo. No se admiten abreviaturas, traducciones, variaciones de mayúsculas o minúsculas, tildes, valores diferentes de los permitidos ni texto adicional.

Antes de evaluar, se eliminan los espacios iniciales y finales y se normalizan los espacios consecutivos como un solo espacio. No se evalúa la cantidad de espacios alrededor del guion estructural. La existencia obligatoria de una Capa de Arquitectura se evalúa en la regla específica del componente que la requiere; esta regla evalúa únicamente el nombre de las capas existentes.

**Evidencia mínima:** Identificación certificada de la figura como Capa de Arquitectura y texto completo de su nombre. La evidencia debe permitir distinguir inequívocamente la expresión `Capa de Arquitectura`, el guion estructural y el tipo. No es necesario conocer el componente propietario para evaluar el nombramiento.

- **Cumple:** Todas las Capas de Arquitectura existentes y evaluables siguen exactamente la estructura `Capa de Arquitectura - tipo` y utilizan uno de los tipos permitidos: `composicion`, `experiencia` o `sistema`.
- **No cumple:** La figura y su texto completo están certificados, y al menos una Capa de Arquitectura incumple alguna condición aplicable: falta la expresión `Capa de Arquitectura`, el tipo o el guion estructural; el orden es incorrecto; existe más de un guion estructural; el tipo está fuera del catálogo permitido; se utilizan tildes, abreviaturas, traducciones, mayúsculas no permitidas o texto adicional.
- **No verificable:** No puede certificarse que la figura sea una Capa de Arquitectura; su nombre no está disponible o está incompleto por pérdida de evidencia; no puede distinguirse inequívocamente el guion estructural de un guion perteneciente al texto; o alguna ambigüedad impide evaluar el nombre. La falta de identificación del componente propietario no impide evaluar esta regla. Si existe al menos un incumplimiento certificado, prevalece **No cumple** aunque otra Capa sea no verificable.
- **No aplica:** La página no contiene figuras certificadas como Capas de Arquitectura ni figuras candidatas pendientes de clasificación como tales.

> **Nota de revisión (no normativa).** Qué cambió respecto de los 41: Solo nombre; la existencia pasa a API-004/SRV-004/MQ-002.

---

### FT-001 — Nombramiento de Flujo Transaccional

| | |
|---|---|
| Familia | FT |
| Origen histórico | FT-001 (FT-002 retirada) |
| Tipo de cambio | MODIFICADA |
| Riesgo de trazabilidad | MEDIO |
| Estado de la definición | Definida |
| Decisiones abiertas que la afectan | — (y, para todas, las condiciones globales C-02 y C-03) |
| Huella del texto | df871dece9be |

**Texto normativo (literal de la analista)**

**Resumen oficial:** Valida el nombre de las figuras certificadas como Flujo Transaccional.

**Población (Aplica a):** Figuras certificadas como Flujos Transaccionales, independientemente del componente al que estén asociadas.

**Obligación (Criterio):** El nombre debe seguir exactamente la estructura `Flujo Transaccional - tipo`. El valor anterior al guion estructural debe ser exactamente `Flujo Transaccional` y el valor posterior debe ser exactamente `monetario`, `no-monetario`, `operativo` o `transversal`. Los tipos deben escribirse completamente en minúsculas. Debe existir un único guion con función estructural entre el nombre de la figura y el tipo. El guion de `no-monetario` forma parte del valor permitido y no se considera un separador estructural adicional. No se admiten abreviaturas, traducciones, variaciones de mayúsculas o minúsculas, valores diferentes de los permitidos ni texto adicional.

Antes de evaluar, se eliminan los espacios iniciales y finales y se normalizan los espacios consecutivos como un solo espacio. No se evalúa la cantidad de espacios alrededor del guion estructural. La existencia obligatoria de un Flujo Transaccional se evalúa en la regla específica del componente que lo requiere; esta regla evalúa únicamente el nombre de los flujos existentes.

**Evidencia mínima:** Identificación certificada de la figura como Flujo Transaccional y texto completo de su nombre. La evidencia debe permitir distinguir inequívocamente la expresión `Flujo Transaccional`, el guion estructural y el tipo. No es necesario conocer el componente propietario para evaluar el nombramiento.

- **Cumple:** Todos los Flujos Transaccionales existentes y evaluables siguen exactamente la estructura `Flujo Transaccional - tipo` y utilizan uno de los tipos permitidos: `monetario`, `no-monetario`, `operativo` o `transversal`.
- **No cumple:** La figura y su texto completo están certificados, y al menos un Flujo Transaccional incumple alguna condición aplicable: falta la expresión `Flujo Transaccional`, el tipo o el guion estructural; el orden es incorrecto; existe más de un guion estructural, sin contar el guion propio de `no-monetario`; el tipo está fuera del catálogo permitido; se utilizan abreviaturas, traducciones, mayúsculas no permitidas o texto adicional.
- **No verificable:** No puede certificarse que la figura sea un Flujo Transaccional; su nombre no está disponible o está incompleto por pérdida de evidencia; no puede distinguirse inequívocamente el guion estructural de un guion perteneciente al texto; o alguna ambigüedad impide evaluar el nombre. La falta de identificación del componente propietario no impide evaluar esta regla. Si existe al menos un incumplimiento certificado, prevalece **No cumple** aunque otro Flujo sea no verificable.
- **No aplica:** La página no contiene figuras certificadas como Flujos Transaccionales ni figuras candidatas pendientes de clasificación como tales.

> **Nota de revisión (no normativa).** Qué cambió respecto de los 41: Solo nombre.

---

### E1-001 — Estructura integral E1

| | |
|---|---|
| Familia | E1 |
| Origen histórico | E1-001 |
| Tipo de cambio | MODIFICADA |
| Riesgo de trazabilidad | MEDIO |
| Estado de la definición | Condicionada a una decisión abierta |
| Decisiones abiertas que la afectan | C-07, C-08 (y, para todas, las condiciones globales C-02 y C-03) |
| Huella del texto | c80c13702320 |

**Texto normativo (literal de la analista)**

**Resumen oficial:** Valida que el escenario E1 esté conformado por una API principal ubicada en INTEGRACIÓN, un hijo principal ubicado en el DOMINIO PRODUCTOR y una conexión desde la API hacia el evento BPMN de Inicio del hijo.

**Población (Aplica a):** Páginas evaluables con patrón estructural candidato a E1: API principal que consume el servicio representado por el hijo principal ubicado en el DOMINIO PRODUCTOR.

**Obligación (Criterio):** El escenario E1 debe tener una API principal ubicada en INTEGRACIÓN y un único hijo principal ubicado en el DOMINIO PRODUCTOR. La API principal debe estar conectada con un evento BPMN de tipo Inicio perteneciente al hijo principal. La conexión debe dirigirse desde la API hacia el evento de Inicio, con terminación `None` en el extremo de la API y `Arrow` en el extremo del evento.

La identificación genérica de una figura como `BPMNEvent` no permite confirmar que corresponda a un evento de Inicio. Mientras el subtipo Inicio no pueda certificarse, esta regla debe evaluarse como **No verificable**, aunque la ubicación de la API principal y del hijo principal estén correctamente demostradas. Esta incertidumbre no afecta por sí sola los resultados independientes de CNT-001, CNT-002, CNT-003 o CNT-004.

**Evidencia mínima:** Identificación certificada de la API principal, identificación certificada de un único hijo principal, dominio arquitectónico efectivo de ambos componentes, identificación certificada de un evento BPMN de tipo Inicio perteneciente al hijo y conexión completa entre la API y dicho evento, con participantes, sentido y terminaciones verificables. No se debe inferir el subtipo Inicio únicamente por la figura genérica, el texto visible, la posición o la ubicación dentro del hijo.

- **Cumple:** La API principal está ubicada en INTEGRACIÓN; existe un único hijo principal ubicado en el DOMINIO PRODUCTOR; se certifica dentro del hijo un evento BPMN de tipo Inicio; y existe una conexión desde la API hacia dicho evento, con terminación `None` en el extremo de la API y `Arrow` en el extremo del evento.
- **No cumple:** La identidad de los participantes, sus dominios, el subtipo Inicio del evento y la cobertura de la conexión están certificados, y se demuestra al menos una de las siguientes situaciones: la API principal no está ubicada en INTEGRACIÓN; el hijo principal no está ubicado en el DOMINIO PRODUCTOR; la API no está conectada con el evento de Inicio del hijo; la conexión tiene el sentido contrario; o sus terminaciones no corresponden a `None` en la API y `Arrow` en el evento.
- **No verificable:** No puede identificarse inequívocamente la API principal o el hijo principal; no puede certificarse el dominio arquitectónico efectivo de alguno de ellos; el evento está identificado únicamente como `BPMNEvent` y no puede certificarse como evento de Inicio; no puede demostrarse que el evento pertenezca al hijo principal; o la existencia, el sentido, las terminaciones o los participantes de la conexión son insuficientes, ambiguos o contradictorios. Si el único dato pendiente es el subtipo Inicio del `BPMNEvent`, la regla permanece **No verificable**, aunque las demás condiciones estén demostradas.
- **No aplica:** Se certifica que el patrón estructural de la página corresponde a E2 o E3 y no existen candidatos pendientes que puedan configurar un escenario E1. Las páginas exclusivamente de plantilla o leyenda también quedan fuera de la población.

> **Nota de revisión (no normativa).** Qué cambió respecto de los 41: Inicio certificado y None→Arrow; sin «gestionado». Decisiones abiertas: C-07, C-08 (ver sección 7).

---

### E2-001 — Estructura integral E2

| | |
|---|---|
| Familia | E2 |
| Origen histórico | E2-001 |
| Tipo de cambio | MODIFICADA |
| Riesgo de trazabilidad | MEDIO |
| Estado de la definición | Condicionada a una decisión abierta |
| Decisiones abiertas que la afectan | C-07, C-08 (y, para todas, las condiciones globales C-02 y C-03) |
| Huella del texto | b0eb53af2b60 |

**Texto normativo (literal de la analista)**

**Resumen oficial:** Valida que el escenario E2 esté conformado por una API principal y un hijo principal ubicados en INTEGRACIÓN, con una conexión desde la API hacia el evento BPMN de Inicio del hijo.

**Población (Aplica a):** Páginas evaluables con patrón estructural candidato a E2: API principal que consume el servicio representado por el hijo principal ubicado en INTEGRACIÓN.

**Obligación (Criterio):** El escenario E2 debe tener una API principal y un hijo principal ubicados en INTEGRACIÓN. La API y el hijo deben ser componentes estructuralmente separados. La API principal debe estar conectada con un evento BPMN de tipo Inicio perteneciente al hijo principal. La conexión debe dirigirse desde la API hacia el evento de Inicio, con terminación `None` en el extremo de la API y `Arrow` en el extremo del evento.

La validación del subtipo Inicio se realiza exclusivamente en esta regla para el escenario E2. La identificación genérica de una figura como `BPMNEvent` no permite confirmar esta condición. Mientras el subtipo Inicio no pueda certificarse, la regla queda **No verificable**, sin afectar por sí sola las reglas independientes de dominios, contenedores o contenido.

**Evidencia mínima:** Identificación certificada de la API principal y del hijo principal, dominio arquitectónico efectivo de ambos componentes, evidencia estructural de que son componentes separados, identificación certificada de un evento BPMN de tipo Inicio perteneciente al hijo y conexión completa entre la API y dicho evento, con participantes, sentido y terminaciones verificables. No se debe inferir el subtipo Inicio únicamente por la figura genérica, el texto visible, la posición o la ubicación dentro del hijo.

- **Cumple:** La API principal y el hijo principal están ubicados en INTEGRACIÓN y son componentes estructuralmente separados; se certifica dentro del hijo un evento BPMN de tipo Inicio; y existe una conexión desde la API hacia dicho evento, con terminación `None` en el extremo de la API y `Arrow` en el extremo del evento.
- **No cumple:** La identidad de los participantes, sus dominios, su separación estructural, el subtipo Inicio y la cobertura de la conexión están certificados, y se demuestra al menos una de las siguientes situaciones: la API principal o el hijo principal no están ubicados en INTEGRACIÓN; la API está contenida dentro del hijo; la API no está conectada con el evento de Inicio del hijo; la conexión tiene el sentido contrario; o sus terminaciones no corresponden a `None` en la API y `Arrow` en el evento.
- **No verificable:** No puede identificarse inequívocamente la API principal o el hijo principal; no puede certificarse el dominio arquitectónico efectivo de alguno de ellos; no puede demostrarse que sean componentes estructuralmente separados; el evento está identificado únicamente como `BPMNEvent` y no puede certificarse como evento de Inicio; no puede demostrarse que el evento pertenezca al hijo principal; o la existencia, el sentido, las terminaciones o los participantes de la conexión son insuficientes, ambiguos o contradictorios. Si el único dato pendiente es el subtipo Inicio del `BPMNEvent`, la regla permanece **No verificable**, aunque las demás condiciones estén demostradas.
- **No aplica:** Se certifica que el patrón estructural de la página corresponde a E1 o E3 y no existen candidatos pendientes que puedan configurar un escenario E2. Las páginas exclusivamente de plantilla o leyenda también quedan fuera de la población.

> **Nota de revisión (no normativa).** Qué cambió respecto de los 41: Ídem. Decisiones abiertas: C-07, C-08 (ver sección 7).

---

### E3-001 — Estructura integral E3

| | |
|---|---|
| Familia | E3 |
| Origen histórico | E3-001 |
| Tipo de cambio | MODIFICADA |
| Riesgo de trazabilidad | MEDIO |
| Estado de la definición | Condicionada a una decisión abierta |
| Decisiones abiertas que la afectan | C-07, C-08 (y, para todas, las condiciones globales C-02 y C-03) |
| Huella del texto | ebd3ce278b41 |

**Texto normativo (literal de la analista)**

**Resumen oficial:** Valida que el escenario E3 esté conformado por un componente principal y un hijo principal ubicados en el DOMINIO PRODUCTOR, con una conexión desde el componente principal hacia el evento BPMN de Inicio del hijo.

**Población (Aplica a):** Páginas evaluables con patrón estructural candidato a E3: componente principal que consume el servicio representado por el hijo principal, ambos ubicados en el DOMINIO PRODUCTOR.

**Obligación (Criterio):** El escenario E3 debe tener un componente principal y un hijo principal ubicados en el mismo DOMINIO PRODUCTOR y estructuralmente separados. El componente principal debe estar conectado con un evento BPMN de tipo Inicio perteneciente al hijo principal. La conexión debe dirigirse desde el componente principal hacia el evento de Inicio, con terminación `None` en el extremo del componente principal y `Arrow` en el extremo del evento.

La validación del subtipo Inicio se realiza exclusivamente en esta regla para el escenario E3. La identificación genérica de una figura como `BPMNEvent` no permite confirmar esta condición. Mientras el subtipo Inicio no pueda certificarse, la regla queda **No verificable**, sin afectar por sí sola las reglas independientes de dominios, contenedores o contenido.

**Evidencia mínima:** Identificación certificada del componente principal y del hijo principal, dominio arquitectónico efectivo de ambos componentes, evidencia estructural de que están ubicados en el mismo DOMINIO PRODUCTOR y son componentes separados, identificación certificada de un evento BPMN de tipo Inicio perteneciente al hijo y conexión completa entre el componente principal y dicho evento, con participantes, sentido y terminaciones verificables. No se debe inferir el subtipo Inicio únicamente por la figura genérica, el texto visible, la posición o la ubicación dentro del hijo.

- **Cumple:** El componente principal y el hijo principal están ubicados en el mismo DOMINIO PRODUCTOR y son componentes estructuralmente separados; se certifica dentro del hijo un evento BPMN de tipo Inicio; y existe una conexión desde el componente principal hacia dicho evento, con terminación `None` en el extremo del componente principal y `Arrow` en el extremo del evento.
- **No cumple:** La identidad de los participantes, sus dominios, su separación estructural, el subtipo Inicio y la cobertura de la conexión están certificados, y se demuestra al menos una de las siguientes situaciones: el componente principal o el hijo principal no están ubicados en el DOMINIO PRODUCTOR; pertenecen a dominios productores diferentes; el componente principal está contenido dentro del hijo; no existe conexión con el evento de Inicio del hijo; la conexión tiene el sentido contrario; o sus terminaciones no corresponden a `None` en el componente principal y `Arrow` en el evento.
- **No verificable:** No puede identificarse inequívocamente el componente principal o el hijo principal; no puede certificarse el dominio arquitectónico efectivo de alguno de ellos; no puede demostrarse que estén ubicados en el mismo DOMINIO PRODUCTOR y sean componentes separados; el evento está identificado únicamente como `BPMNEvent` y no puede certificarse como evento de Inicio; no puede demostrarse que el evento pertenezca al hijo principal; o la existencia, el sentido, las terminaciones o los participantes de la conexión son insuficientes, ambiguos o contradictorios. Si el único dato pendiente es el subtipo Inicio del `BPMNEvent`, la regla permanece **No verificable**, aunque las demás condiciones estén demostradas.
- **No aplica:** Se certifica que el patrón estructural de la página corresponde a E1 o E2 y no existen candidatos pendientes que puedan configurar un escenario E3. Las páginas exclusivamente de plantilla o leyenda también quedan fuera de la población.

> **Nota de revisión (no normativa).** Qué cambió respecto de los 41: Ídem. Decisiones abiertas: C-07, C-08 (ver sección 7).

---

### MOD-001 — Modelos de entrada y salida

| | |
|---|---|
| Familia | MOD |
| Origen histórico | MOD-001 |
| Tipo de cambio | MODIFICADA |
| Riesgo de trazabilidad | MEDIO |
| Estado de la definición | Condicionada a una decisión abierta |
| Decisiones abiertas que la afectan | C-13 (y, para todas, las condiciones globales C-02 y C-03) |
| Huella del texto | 667118ea8376 |

**Texto normativo (literal de la analista)**

**Resumen oficial:** Valida la existencia y asociación de los modelos de entrada y salida obligatorios para la API principal, el servicio principal modelado en E3 y los eventos de integración ubicados en INTEGRACIÓN.

**Población (Aplica a):** API principal de los escenarios E1 y E2, componente principal del escenario E3 y eventos de integración ubicados en INTEGRACIÓN.

**Obligación (Criterio):** La API principal de los escenarios E1 y E2 debe tener asociados un modelo de entrada y un modelo de salida. El componente principal del escenario E3 debe tener asociados un modelo de entrada y un modelo de salida.

Para los eventos de integración ubicados en INTEGRACIÓN, los modelos obligatorios dependen de los roles de sus tópicos: cuando el evento tenga tópicos de publicación (`p`) y suscripción (`s`), debe tener asociados un modelo de entrada y un modelo de salida; cuando tenga únicamente un tópico de publicación (`p`), debe tener asociado un modelo de entrada; y cuando tenga únicamente un tópico de suscripción (`s`), debe tener asociado un modelo de salida.

El contenedor hijo principal no tiene modelos obligatorios en esta regla. La presencia o ausencia de modelos dentro del hijo no afecta al cumplimiento de MOD-001 y su ubicación se evalúa mediante las reglas CNT. Las API y los servicios invocados tampoco tienen modelos obligatorios en esta regla.

Los modelos exigidos deben estar asociados inequívocamente al componente evaluado. La asociación no puede establecerse únicamente por cercanía, alineación, superposición o pertenencia al mismo contenedor.

**Evidencia mínima:** Identificación certificada del patrón estructural y del componente principal aplicable; clasificación certificada de los modelos como entrada o salida; y evidencia estructural suficiente para demostrar su asociación con la API principal o el componente principal de E3. Para los eventos de integración se requiere además su ubicación certificada en INTEGRACIÓN, la asociación con su Capa de Tópicos y la identificación de los roles `p` y `s`. La evidencia debe permitir demostrar tanto la presencia como la ausencia de los modelos obligatorios.

- **Cumple:** Todos los componentes sujetos a esta regla presentan los modelos obligatorios y sus asociaciones están certificadas: entrada y salida para la API principal de E1/E2; entrada y salida para el componente principal de E3; entrada y salida para eventos con tópicos `p` y `s`; entrada para eventos con un único tópico `p`; y salida para eventos con un único tópico `s`.
- **No cumple:** La población, la cobertura de los modelos y sus asociaciones están certificadas, y falta al menos un modelo obligatorio para alguno de los componentes evaluados. También corresponde este estado cuando existe un modelo requerido, pero está certificadamente asociado a un componente diferente.
- **No verificable:** No puede identificarse inequívocamente el componente principal aplicable; no puede determinarse el patrón estructural; no puede clasificarse un modelo como entrada o salida; existen modelos candidatos, pero no puede demostrarse que estén asociados al componente evaluado; la cobertura no permite demostrar la presencia o ausencia de un modelo obligatorio; o, para un evento, no puede certificarse su ubicación en INTEGRACIÓN o el rol de sus tópicos. Si existe al menos un incumplimiento certificado, prevalece **No cumple** aunque otra obligación sea no verificable.
- **No aplica:** La página no contiene una API principal de E1/E2, un componente principal de E3 ni eventos de integración ubicados en INTEGRACIÓN, y tampoco existen candidatos pendientes que puedan pertenecer a esta población. El hijo principal y los componentes invocados no hacen aplicable la regla por sí solos.

> **Nota de revisión (no normativa).** Qué cambió respecto de los 41: Añade E3 y eventos de integración; hijo e invocados sin modelos obligatorios. Decisiones abiertas: C-13 (ver sección 7).

---

### COM-001 — Nombramiento de comandos

| | |
|---|---|
| Familia | COM |
| Origen histórico | COM-001 |
| Tipo de cambio | MODIFICADA (refinamiento) |
| Riesgo de trazabilidad | BAJO |
| Estado de la definición | Definida |
| Decisiones abiertas que la afectan | C-09, C-12 (y, para todas, las condiciones globales C-02 y C-03) |
| Huella del texto | 6780e886c609 |

**Texto normativo (literal de la analista)**

**Resumen oficial:** Valida el nombre de las actividades BPMN identificadas como comandos por su relación con una API, un servicio, un gestor de colas o un sistema externo auxiliar.

**Población (Aplica a):** Figuras `BPMNActivity` que tengan una relación identificable con una API, un servicio, un gestor de colas o un sistema externo auxiliar.

**Obligación (Criterio):** El nombre del comando debe estar escrito en español y comenzar con un verbo en infinitivo seguido de un complemento que identifique de manera clara, específica y coherente el objeto o propósito de la acción. El complemento es obligatorio; no se admiten nombres formados únicamente por un verbo, expresiones genéricas ni textos de plantilla. No se evalúa si la primera letra está escrita en mayúscula o minúscula.

Una `BPMNActivity` se considera candidata a comando únicamente cuando exista evidencia de una relación con una API, un servicio, un gestor de colas o un sistema externo auxiliar. No debe clasificarse como comando solo por su figura, texto, ubicación, cercanía o significado aparente. La misma actividad se evalúa una sola vez mediante esta regla, aunque esté relacionada con varios componentes. La validez de sus conexiones se evalúa mediante COM-002, COM-003, COM-004 o COM-005.

**Evidencia mínima:** Identificación certificada de la figura como `BPMNActivity`, texto completo de su nombre y evidencia suficiente de una relación con una API, un servicio, un gestor de colas o un sistema externo auxiliar. La relación debe permitir identificar la actividad como candidata a comando, aunque la corrección de la bidireccionalidad, el sentido o las terminaciones se evalúe en la regla de conexión correspondiente.

- **Cumple:** La actividad está identificada como candidata a comando y su nombre está escrito en español, comienza con un verbo en infinitivo y contiene un complemento claro, específico y coherente con la acción representada.
- **No cumple:** La actividad está identificada como candidata a comando y su nombre está ausente, corresponde a un texto de plantilla, es genérico, no comienza con un verbo en infinitivo, contiene únicamente el verbo sin complemento o presenta un complemento que no permite identificar de manera coherente la acción ejecutada. El uso de mayúscula o minúscula en la primera letra no afecta al resultado.
- **No verificable:** No puede certificarse que la figura sea una `BPMNActivity`; no puede identificarse una relación suficiente con una API, un servicio, un gestor de colas o un sistema externo auxiliar; el texto no está disponible o está incompleto por pérdida de evidencia; no puede determinarse razonablemente si la primera palabra corresponde a un verbo en infinitivo en español; o la información disponible no permite establecer la coherencia entre el verbo y su complemento. Si existe un incumplimiento certificado, prevalece **No cumple** aunque otra actividad sea no verificable.
- **No aplica:** La página no contiene actividades relacionadas con API, servicios, gestores de colas o sistemas externos auxiliares, ni relaciones pendientes que puedan identificar una `BPMNActivity` como candidata a comando.

> **Nota de revisión (no normativa).** Qué cambió respecto de los 41: Población incluye auxiliares. Decisiones abiertas: C-09, C-12 (ver sección 7).

---

### COM-002 — Conexión entre comando y API invocada

| | |
|---|---|
| Familia | COM |
| Origen histórico | COM-002; absorbe: EXT-002 antiguo (Conexión mediante auxiliar externo; retirada) |
| Tipo de cambio | MODIFICADA (refinamiento) |
| Riesgo de trazabilidad | BAJO |
| Estado de la definición | Condicionada a una decisión abierta |
| Decisiones abiertas que la afectan | C-04, C-05 (y, para todas, las condiciones globales C-02 y C-03) |
| Huella del texto | 685c58138a16 |

**Texto normativo (literal de la analista)**

**Resumen oficial:** Valida la conexión bidireccional entre un comando y una API invocada, independientemente de que la API esté o no encapsulada dentro de un sistema externo auxiliar.

**Población (Aplica a):** Relaciones identificables entre figuras `BPMNActivity` candidatas a comando y componentes certificados como API invocadas.

**Obligación (Criterio):** Todo comando relacionado con una API invocada debe tener dos conexiones entre los mismos participantes: una dirigida desde el comando hacia la API y otra dirigida desde la API hacia el comando. En cada conexión, el participante que actúa como origen debe utilizar `CircleOpen` y el participante que actúa como destino debe utilizar `Generalization`.

La regla se aplica tanto a las API ubicadas directamente en un dominio como a las API encapsuladas dentro de un sistema externo auxiliar, siempre que el extremo conectado sea la API o una figura que la represente inequívocamente. Si la conexión termina únicamente en el sistema externo auxiliar y no puede atribuirse directamente a una API encapsulada, la relación se evalúa mediante COM-005.

El nombramiento del comando se evalúa mediante COM-001 y no afecta al resultado de esta regla.

**Evidencia mínima:** Identificación certificada de la `BPMNActivity` candidata a comando y de la API invocada, junto con las conexiones completas entre ambos participantes. La evidencia debe permitir comprobar el origen, el destino y las terminaciones de cada conexión. Si la API está encapsulada dentro de un sistema externo auxiliar, debe estar certificada su pertenencia a dicho auxiliar.

- **Cumple:** Existen las dos conexiones requeridas entre el comando y la API invocada: una desde el comando hacia la API y otra desde la API hacia el comando. En ambas conexiones, el origen utiliza `CircleOpen` y el destino utiliza `Generalization`, sin conexiones duplicadas para la misma pareja y el mismo sentido.
- **No cumple:** Los participantes y la cobertura de las conexiones están certificados, y falta uno de los dos sentidos; una conexión está orientada incorrectamente; el origen no utiliza `CircleOpen`; el destino no utiliza `Generalization`; existen conexiones duplicadas para la misma pareja y el mismo sentido; o la conexión termina en un componente certificado que no corresponde ni representa a la API invocada.
- **No verificable:** No puede certificarse la actividad candidata a comando o la API invocada; no puede demostrarse que ambos sentidos correspondan a la misma pareja de participantes; la dirección o las terminaciones son indeterminadas, ambiguas o contradictorias; no puede determinarse si el extremo conectado corresponde a la API o únicamente al sistema externo auxiliar; o la cobertura no permite confirmar la presencia o ausencia de alguna conexión. Si existe un incumplimiento certificado, prevalece **No cumple** aunque otra conexión sea no verificable.
- **No aplica:** La página no contiene API invocadas relacionadas con actividades candidatas a comando ni conexiones pendientes que puedan configurar esta relación.

> **Nota de revisión (no normativa).** Qué cambió respecto de los 41: API encapsulada incluida. Decisiones abiertas: C-04, C-05 (ver sección 7).

---

### COM-003 — Conexión entre comando y servicio invocado

| | |
|---|---|
| Familia | COM |
| Origen histórico | COM-003; absorbe: EXT-002 antiguo (Conexión mediante auxiliar externo; retirada) |
| Tipo de cambio | MODIFICADA (refinamiento) |
| Riesgo de trazabilidad | BAJO |
| Estado de la definición | Condicionada a una decisión abierta |
| Decisiones abiertas que la afectan | C-04, C-05 (y, para todas, las condiciones globales C-02 y C-03) |
| Huella del texto | dd3c88d39903 |

**Texto normativo (literal de la analista)**

**Resumen oficial:** Valida la conexión bidireccional entre un comando y un servicio invocado, independientemente de que el servicio esté o no encapsulado dentro de un sistema externo auxiliar.

**Población (Aplica a):** Relaciones identificables entre figuras `BPMNActivity` candidatas a comando y componentes certificados como servicios invocados.

**Obligación (Criterio):** Todo comando relacionado con un servicio invocado debe tener dos conexiones entre los mismos participantes: una dirigida desde el comando hacia el servicio y otra dirigida desde el servicio hacia el comando. En cada conexión, el participante que actúa como origen debe utilizar `CircleOpen` y el participante que actúa como destino debe utilizar `Generalization`.

La regla se aplica tanto a los servicios ubicados directamente en un dominio como a los servicios encapsulados dentro de un sistema externo auxiliar, siempre que el extremo conectado sea el servicio o una figura que lo represente inequívocamente. Si la conexión termina únicamente en el sistema externo auxiliar y no puede atribuirse directamente a un servicio encapsulado, la relación se evalúa mediante COM-005.

El nombramiento del comando se evalúa mediante COM-001 y no afecta al resultado de esta regla.

**Evidencia mínima:** Identificación certificada de la `BPMNActivity` candidata a comando y del servicio invocado, junto con las conexiones completas entre ambos participantes. La evidencia debe permitir comprobar el origen, el destino y las terminaciones de cada conexión. Si el servicio está encapsulado dentro de un sistema externo auxiliar, debe estar certificada su pertenencia a dicho auxiliar.

- **Cumple:** Existen las dos conexiones requeridas entre el comando y el servicio invocado: una desde el comando hacia el servicio y otra desde el servicio hacia el comando. En ambas conexiones, el origen utiliza `CircleOpen` y el destino utiliza `Generalization`, sin conexiones duplicadas para la misma pareja y el mismo sentido.
- **No cumple:** Los participantes y la cobertura de las conexiones están certificados, y falta uno de los dos sentidos; una conexión está orientada incorrectamente; el origen no utiliza `CircleOpen`; el destino no utiliza `Generalization`; existen conexiones duplicadas para la misma pareja y el mismo sentido; o la conexión termina en un componente certificado que no corresponde ni representa al servicio invocado.
- **No verificable:** No puede certificarse la actividad candidata a comando o el servicio invocado; no puede demostrarse que ambos sentidos correspondan a la misma pareja de participantes; la dirección o las terminaciones son indeterminadas, ambiguas o contradictorias; no puede determinarse si el extremo conectado corresponde al servicio o únicamente al sistema externo auxiliar; o la cobertura no permite confirmar la presencia o ausencia de alguna conexión. Si existe un incumplimiento certificado, prevalece **No cumple** aunque otra conexión sea no verificable.
- **No aplica:** La página no contiene servicios invocados relacionados con actividades candidatas a comando ni conexiones pendientes que puedan configurar esta relación.

> **Nota de revisión (no normativa).** Qué cambió respecto de los 41: Servicio encapsulado incluido. Decisiones abiertas: C-04, C-05 (ver sección 7).

---

### COM-004 — Conexión entre comando y gestor de colas

| | |
|---|---|
| Familia | COM |
| Origen histórico | COM-004; absorbe: EXT-002 antiguo (Conexión mediante auxiliar externo; retirada) |
| Tipo de cambio | MODIFICADA (refinamiento) |
| Riesgo de trazabilidad | BAJO |
| Estado de la definición | Definida |
| Decisiones abiertas que la afectan | — (y, para todas, las condiciones globales C-02 y C-03) |
| Huella del texto | 5f748755d7cb |

**Texto normativo (literal de la analista)**

**Resumen oficial:** Valida la conexión bidireccional entre un comando y un gestor de colas.

**Población (Aplica a):** Relaciones identificables entre figuras `BPMNActivity` candidatas a comando y componentes certificados como gestores de colas.

**Obligación (Criterio):** Todo comando relacionado con un gestor de colas debe tener dos conexiones entre los mismos participantes: una dirigida desde el comando hacia el gestor y otra dirigida desde el gestor hacia el comando. En cada conexión, el participante que actúa como origen debe utilizar `CircleOpen` y el participante que actúa como destino debe utilizar `Generalization`.

Esta relación se evalúa exclusivamente mediante COM-004 y no debe evaluarse nuevamente en las reglas MQ. El nombramiento del comando se evalúa mediante COM-001 y no afecta al resultado de esta regla.

**Evidencia mínima:** Identificación certificada de la `BPMNActivity` candidata a comando y del gestor de colas, junto con las conexiones completas entre ambos participantes. La evidencia debe permitir comprobar el origen, el destino y las terminaciones de cada conexión.

- **Cumple:** Existen las dos conexiones requeridas entre el comando y el gestor de colas: una desde el comando hacia el gestor y otra desde el gestor hacia el comando. En ambas conexiones, el origen utiliza `CircleOpen` y el destino utiliza `Generalization`, sin conexiones duplicadas para la misma pareja y el mismo sentido.
- **No cumple:** Los participantes y la cobertura de las conexiones están certificados, y falta uno de los dos sentidos; una conexión está orientada incorrectamente; el origen no utiliza `CircleOpen`; el destino no utiliza `Generalization`; existen conexiones duplicadas para la misma pareja y el mismo sentido; o la conexión termina en un componente certificado que no corresponde al gestor de colas.
- **No verificable:** No puede certificarse la actividad candidata a comando o el gestor de colas; no puede demostrarse que ambos sentidos correspondan a la misma pareja de participantes; la dirección o las terminaciones son indeterminadas, ambiguas o contradictorias; o la cobertura no permite confirmar la presencia o ausencia de alguna conexión. Si existe un incumplimiento certificado, prevalece **No cumple** aunque otra conexión sea no verificable.
- **No aplica:** La página no contiene gestores de colas relacionados con actividades candidatas a comando ni conexiones pendientes que puedan configurar esta relación.

> **Nota de revisión (no normativa).** Qué cambió respecto de los 41: Sin cambio de obligación.

---

### COM-005 — Conexión entre comando y sistema externo auxiliar

| | |
|---|---|
| Familia | COM |
| Origen histórico | — (nueva; en 41 un único candidato permitía atribuir la conexión al auxiliar); absorbe: EXT-002 antiguo (Conexión mediante auxiliar externo; retirada) |
| Tipo de cambio | NUEVA |
| Riesgo de trazabilidad | BAJO |
| Estado de la definición | Condicionada a una decisión abierta |
| Decisiones abiertas que la afectan | C-12 (y, para todas, las condiciones globales C-02 y C-03) |
| Huella del texto | 041ed0c35c2c |

**Texto normativo (literal de la analista)**

**Resumen oficial:** Valida la conexión bidireccional entre un comando y un sistema externo auxiliar cuando la relación no puede atribuirse directamente a un componente encapsulado.

**Población (Aplica a):** Relaciones identificables entre figuras `BPMNActivity` candidatas a comando y sistemas externos auxiliares que actúan como extremo gráfico de la conexión.

**Obligación (Criterio):** Cuando un comando se conecte directamente con un sistema externo auxiliar y la conexión no pueda atribuirse inequívocamente a una API o servicio encapsulado, deben existir dos conexiones entre los mismos participantes: una dirigida desde el comando hacia el auxiliar y otra dirigida desde el auxiliar hacia el comando. En cada conexión, el participante que actúa como origen debe utilizar `CircleOpen` y el participante que actúa como destino debe utilizar `Generalization`.

Si el extremo conectado es una API certificada contenida en el auxiliar, la relación se evalúa mediante COM-002. Si el extremo conectado es un servicio certificado contenido en el auxiliar, la relación se evalúa mediante COM-003. Una misma conexión no debe evaluarse en más de una regla COM.

**Evidencia mínima:** Identificación certificada de la `BPMNActivity` candidata a comando y del sistema externo auxiliar, junto con las conexiones completas entre ambos participantes. La evidencia debe permitir comprobar que el extremo gráfico es el auxiliar, que la relación no puede atribuirse inequívocamente a una API o servicio encapsulado y que los sentidos y terminaciones son verificables.

- **Cumple:** Existen las dos conexiones requeridas entre el comando y el sistema externo auxiliar: una desde el comando hacia el auxiliar y otra desde el auxiliar hacia el comando. En ambas conexiones, el origen utiliza `CircleOpen` y el destino utiliza `Generalization`, sin conexiones duplicadas para la misma pareja y el mismo sentido.
- **No cumple:** Los participantes y la cobertura de las conexiones están certificados, y falta uno de los dos sentidos; una conexión está orientada incorrectamente; el origen no utiliza `CircleOpen`; el destino no utiliza `Generalization`; existen conexiones duplicadas para la misma pareja y el mismo sentido; o la conexión termina en un componente certificado que no corresponde al auxiliar.
- **No verificable:** No puede certificarse la actividad candidata a comando o el sistema externo auxiliar; no puede determinarse si la conexión termina en el auxiliar o en un componente encapsulado; existen varios componentes internos y no puede atribuirse la conexión a uno de ellos; la dirección o las terminaciones son indeterminadas, ambiguas o contradictorias; o la cobertura no permite confirmar la presencia o ausencia de alguna conexión. Si existe un incumplimiento certificado, prevalece **No cumple** aunque otra conexión sea no verificable.
- **No aplica:** La página no contiene sistemas externos auxiliares relacionados directamente con actividades candidatas a comando ni conexiones pendientes que puedan configurar esta relación.

> **Nota de revisión (no normativa).** Qué cambió respecto de los 41: Nueva: comando↔auxiliar sin atribución inequívoca. Decisiones abiertas: C-12 (ver sección 7).

---

### MQ-001 — Identificación y nombramiento del gestor de colas

| | |
|---|---|
| Familia | MQ |
| Origen histórico | MQ-001 |
| Tipo de cambio | MODIFICADA |
| Riesgo de trazabilidad | MEDIO |
| Estado de la definición | Definida |
| Decisiones abiertas que la afectan | C-09 (y, para todas, las condiciones globales C-02 y C-03) |
| Huella del texto | e3a58078fc8a |

**Texto normativo (literal de la analista)**

**Resumen oficial:** Valida que toda figura identificada como gestor de colas tenga un nombre específico y diferente de un texto genérico o de plantilla.

**Población (Aplica a):** Figuras cuyo tipo Lucidchart esté certificado como `UMLActiveClassBlock`.

**Obligación (Criterio):** Toda figura `UMLActiveClassBlock` se considera un gestor de colas y debe tener un nombre visible, funcional y específico que permita identificarlo. No se admiten nombres ausentes, vacíos, genéricos ni textos de plantilla. No se exige un formato particular, idioma, versión, prefijo, capitalización ni estructura de palabras.

La regla evalúa exclusivamente la identificación y el nombramiento del gestor de colas. Su ubicación se evalúa mediante las reglas de contenido CNT; su Capa de Despliegue se evalúa mediante MQ-002; y las conexiones en las que participe se evalúan mediante las reglas COM o MQ que correspondan.

**Evidencia mínima:** Tipo Lucidchart certificado como `UMLActiveClassBlock` y texto completo del nombre visible de la figura. La clasificación como gestor de colas se determina mediante el tipo de figura y no debe inferirse únicamente por el texto, la ubicación, las conexiones o la cercanía con otros componentes.

- **Cumple:** Todas las figuras certificadas como `UMLActiveClassBlock` tienen un nombre visible, funcional, específico y diferente de un texto genérico o de plantilla.
- **No cumple:** La figura está certificada como `UMLActiveClassBlock` y su nombre está ausente, vacío, compuesto únicamente por espacios, es genérico o corresponde a un texto de plantilla.
- **No verificable:** No puede certificarse que la figura sea de tipo `UMLActiveClassBlock`; el texto del nombre no está disponible o está incompleto por pérdida de evidencia; o la información disponible no permite determinar razonablemente si el nombre es específico o corresponde a un texto genérico o de plantilla. Si existe al menos un incumplimiento certificado, prevalece **No cumple** aunque otro gestor sea no verificable.
- **No aplica:** La página no contiene figuras certificadas como `UMLActiveClassBlock` ni figuras candidatas pendientes de clasificación como tales.

> **Nota de revisión (no normativa).** Qué cambió respecto de los 41: UMLActiveClassBlock ⇒ gestor (de convención a norma). Decisiones abiertas: C-09 (ver sección 7).

---

### MQ-002 — Capa de Despliegue del gestor de colas

| | |
|---|---|
| Familia | MQ |
| Origen histórico | MQ-003 + MQ-004 (fusión; el ID MQ-002 anterior era ubicación); absorbe: CA-002 antiguo (Asociación de Capa; retirada); FT-002 antiguo (Asociación de Flujo; retirada); MQ-003 antiguo (Modelo de despliegue del gestor; fusionada + renumerada); MQ-004 antiguo (Detalle de despliegue del gestor; fusionada) |
| Tipo de cambio | FUSIONADA (MQ-003 + MQ-004 históricos) · **ID reutilizado con otro significado** |
| Riesgo de trazabilidad | ALTO |
| Estado de la definición | Definida |
| Decisiones abiertas que la afectan | C-06 (y, para todas, las condiciones globales C-02 y C-03) |
| Huella del texto | 769cd94f84c1 |

**Texto normativo (literal de la analista)**

**Resumen oficial:** Valida que todo gestor de colas ubicado en INTEGRACIÓN tenga asociada una Capa de Despliegue MCI o Federada.

**Población (Aplica a):** Gestores de colas ubicados en el nivel padre de INTEGRACIÓN.

**Obligación (Criterio):** Todo gestor de colas ubicado en INTEGRACIÓN debe tener asociada una Capa de Despliegue, que puede corresponder a una de las siguientes modalidades:

- **MCI:** debe estar representada por una Capa de Arquitectura y un Flujo Transaccional asociados inequívocamente al gestor.
- **Federada:** debe estar representada mediante el valor exacto `Federado`; en esta modalidad no se exigen Capa de Arquitectura ni Flujo Transaccional.

La modalidad debe poder determinarse inequívocamente y sus elementos deben pertenecer al gestor de colas evaluado. La asociación no puede establecerse únicamente por cercanía, alineación, superposición o ubicación dentro del mismo contenedor.

Cuando el gestor esté ubicado fuera de INTEGRACIÓN, esta regla no exige ni evalúa una Capa de Despliegue. La ubicación permitida del gestor se evalúa mediante las reglas CNT y EXT. El nombramiento de la Capa de Arquitectura y del Flujo Transaccional existentes se evalúa mediante CA-001 y FT-001.

**Evidencia mínima:** Identificación certificada del gestor mediante el tipo `UMLActiveClassBlock`, ubicación certificada en el nivel padre de INTEGRACIÓN y evidencia completa de la modalidad de Capa de Despliegue. Para MCI se requieren una Capa de Arquitectura y un Flujo Transaccional inequívocamente asociados al gestor. Para Federada se requiere el valor literal `Federado` inequívocamente asociado al gestor.

- **Cumple:** El gestor está ubicado en el nivel padre de INTEGRACIÓN y tiene asociada una Capa de Despliegue válida: una Capa de Arquitectura y un Flujo Transaccional para la modalidad MCI, o el valor exacto `Federado` para la modalidad Federada.
- **No cumple:** La ubicación del gestor, la modalidad de despliegue y la cobertura de sus elementos están certificadas, y se presenta al menos una de las siguientes situaciones: el gestor ubicado en INTEGRACIÓN no tiene Capa de Despliegue; la modalidad MCI carece de Capa de Arquitectura, Flujo Transaccional o ambos; la modalidad Federada no contiene el valor exacto `Federado`; o los elementos están certificadamente asociados a un componente diferente.
- **No verificable:** No puede certificarse la ubicación del gestor; no puede determinarse si la Capa de Despliegue es MCI o Federada; existen una Capa de Arquitectura, un Flujo Transaccional o un valor `Federado` candidatos, pero no puede demostrarse que pertenezcan al gestor; o la cobertura no permite confirmar la presencia o ausencia de los elementos obligatorios. La cercanía, alineación, superposición o pertenencia al mismo contenedor no constituyen evidencia suficiente de asociación. Si existe un incumplimiento certificado, prevalece **No cumple** aunque otra condición sea no verificable.
- **No aplica:** El gestor está certificadamente ubicado fuera de INTEGRACIÓN, o la página no contiene gestores de colas ni candidatos pendientes de clasificación como tales.

> **Nota de revisión (no normativa).** Qué cambió respecto de los 41: Modelo de despliegue; el ID MQ-003 pasa a Conexiones del gestor. / Detalle de despliegue. Decisiones abiertas: C-06 (ver sección 7).

---

### MQ-003 — Conexiones del gestor de colas

| | |
|---|---|
| Familia | MQ |
| Origen histórico | MQ-005 (ampliada; el ID MQ-003 anterior era modelo de despliegue); absorbe: EXT-002 antiguo (Conexión mediante auxiliar externo; retirada) |
| Tipo de cambio | RENUMERADA (antes MQ-005) y AMPLIADA · **ID reutilizado con otro significado** |
| Riesgo de trazabilidad | ALTO |
| Estado de la definición | Condicionada a una decisión abierta |
| Decisiones abiertas que la afectan | C-04, C-05, C-07 (y, para todas, las condiciones globales C-02 y C-03) |
| Huella del texto | b3d5381accec |

**Texto normativo (literal de la analista)**

**Resumen oficial:** Valida las conexiones del gestor de colas con otros gestores, servicios invocados y eventos BPMN de tipo Mensaje.

**Población (Aplica a):** Gestores de colas relacionados con otros gestores de colas, servicios invocados o eventos BPMN candidatos a tipo Mensaje.

**Obligación (Criterio):** Las conexiones admitidas para un gestor de colas dependen del tipo de participante relacionado:

- Entre dos gestores de colas, la relación debe ser bidireccional. Debe existir una conexión desde el primer gestor hacia el segundo y otra en sentido contrario. En cada conexión, el origen debe utilizar `CircleOpen` y el destino `Generalization`.
- Entre un servicio invocado y un gestor de colas, se admite una relación unidireccional desde el servicio hacia el gestor o una relación bidireccional entre ambos. La conexión desde el servicio hacia el gestor debe utilizar `CircleOpen` en el servicio y `Generalization` en el gestor. Cuando exista la conexión de retorno, debe utilizar `CircleOpen` en el gestor y `Generalization` en el servicio.
- Entre un evento BPMN de tipo Mensaje y un gestor de colas, la relación debe ser unidireccional desde el evento hacia el gestor, con `CircleOpen` en el evento y `Generalization` en el gestor.

La relación con un servicio invocado se evalúa mediante esta regla tanto si el servicio está ubicado directamente en un dominio como si está encapsulado dentro de un sistema externo auxiliar. Las conexiones entre un comando y un gestor de colas se excluyen de esta regla y se evalúan exclusivamente mediante COM-004.

**Evidencia mínima:** Identificación certificada del gestor de colas y del participante relacionado, junto con las conexiones completas, sus sentidos y terminaciones. Para relaciones con servicios debe estar certificada la clasificación del componente como servicio invocado. Si el servicio está encapsulado dentro de un sistema externo auxiliar, debe demostrarse su pertenencia al auxiliar. Para relaciones con eventos BPMN debe certificarse el subtipo Mensaje; la clasificación genérica como `BPMNEvent` no es suficiente.

- **Cumple:** Todas las conexiones evaluadas corresponden a uno de los patrones admitidos: relación bidireccional entre gestores; relación unidireccional desde el servicio hacia el gestor o bidireccional entre ambos; o relación unidireccional desde un evento BPMN de tipo Mensaje hacia el gestor. Cada conexión utiliza `CircleOpen` en el origen y `Generalization` en el destino.
- **No cumple:** Los participantes, sus tipos y la cobertura de las conexiones están certificados, y se presenta al menos una de las siguientes situaciones: falta alguno de los sentidos obligatorios entre dos gestores; una conexión tiene un sentido no permitido; una terminación es incorrecta; existe una conexión de retorno desde el gestor hacia un evento BPMN de tipo Mensaje; la relación servicio-gestor solo existe desde el gestor hacia el servicio; existen conexiones duplicadas para la misma pareja y el mismo sentido; o la conexión termina en un participante certificado que no corresponde al patrón evaluado.
- **No verificable:** No puede certificarse alguno de los participantes; un evento está identificado únicamente como `BPMNEvent` y no puede certificarse como evento de tipo Mensaje; no puede determinarse si el servicio está contenido en un sistema externo auxiliar; la dirección o las terminaciones son indeterminadas, ambiguas o contradictorias; o la cobertura no permite confirmar la presencia o ausencia de las conexiones obligatorias. Si existe un incumplimiento certificado, prevalece **No cumple** aunque otra relación sea no verificable.
- **No aplica:** La página no contiene gestores de colas relacionados con otros gestores, servicios invocados o eventos BPMN candidatos a tipo Mensaje, ni conexiones pendientes que puedan configurar alguna de estas relaciones.

> **Nota de revisión (no normativa).** Qué cambió respecto de los 41: Conexiones gestor↔gestor, servicio↔gestor y Mensaje→gestor. Decisiones abiertas: C-04, C-05, C-07 (ver sección 7).

---

## 5. Cambios normativos importantes

Los doce cambios que más alteran la lectura de un resultado (el detalle por regla está en la sección 4):

1. **Integridad del JSON fuera de las reglas.** CNT-006 se retira. La unicidad de identificadores y la coherencia de la contención pasan a controles previos al evaluar; una inconsistencia deja las reglas afectadas en «No verificable».
2. **Conexiones de comandos centralizadas.** EXT-002 histórica se retira. Toda conexión en la que participa un comando se evalúa una sola vez en la familia COM (COM-002 a COM-005); gestor-gestor, servicio-gestor y mensaje-gestor, en MQ-003.
3. **Despliegue repartido por componente.** CA-002 y FT-002 se retiran; CA-001 y FT-001 validan solo el nombre. La obligatoriedad y la asociación de la Capa de Despliegue se evalúan en API-004, SRV-004 (nueva) y MQ-002, condicionadas a la declaración MCI de la analista.
4. **Hijo principal de E1/E2.** SRV-004 es nueva. La pregunta MCI del hijo solo se hace en E1 y E2; desaparece la pregunta MCI del gestor.
5. **Eventos.** El despliegue del evento histórico se elimina; EVT-004 a EVT-007 se renumeran y modifican (Capa de Tópicos, tópicos, conexiones). Reversiones explícitas: guion bajo obligatorio (EVT-001), camelCase (EVT-002), sin tolerancia de tilde (EVT-003).
6. **Gestores de colas.** La ubicación del gestor se retira (la cubren CNT-003/004/005 y EXT-001). La Capa de Despliegue del gestor fusiona dos reglas en MQ-002. MQ-001 convierte en norma que toda figura UMLActiveClassBlock es un gestor.
7. **Compuertas.** GW-001 cambia de semántica: de reconstruir los caminos a la coherencia entre el texto de la compuerta y las etiquetas de sus salidas.
8. **Servicios.** SRV-003 se restringe a los servicios invocados (el hijo principal queda excluido). SRV-001 y SRV-002 conservan el texto heredado con criterio pendiente (C-01).
9. **Escenarios.** E1/E2/E3-001 exigen Inicio certificado y la conexión None → Arrow; se elimina la distinción gestionado / no gestionado.
10. **Contenedores.** CNT-001 pasa a exigir los dominios obligatorios por patrón (con nombres libres válidos); CNT-002 añade unicidad y nombre específico y no exige Inicio; CNT-003/004/005 pasan a listas cerradas de contenido por nivel.
11. **Auxiliares externos.** EXT-001 exige nombre y contenido permitido (ya no admite eventos ni gestores dentro). EXT-002 nueva: ubicación de auxiliares EVC, EPC o LDC que encapsulan una API.
12. **Modelos y comandos.** MOD-001 añade E3 y eventos de integración; el hijo y los invocados no exigen modelos. COM-001 incluye a los auxiliares; COM-002/003 incluyen la API o el servicio encapsulados; COM-005 es nueva.

## 6. Decisiones ya incorporadas (no se vuelven a preguntar)

Cerradas porque el texto vigente de la analista las establece o porque Andrés o la evidencia del corpus las resolvieron antes. Se listan para que la analista pueda objetarlas, no para votarlas.

| # | Decisión | Quién la resolvió | Sustento |
|---|---|---|---|
| R-01 | La base es el catálogo de 37 reglas derivado de los siete archivos de la analista, no el CSV de 41 | Andrés | Instrucción de Andrés (26/10) |
| R-02 | CNT-002 y CNT-004 no dependen del escenario certificado ni del Inicio | La analista (texto vigente) | CNT-002: «No se requiere identificar ni certificar un evento BPMN de Inicio»; CNT-004 sin dependencia |
| R-03 | «Gestionado / no gestionado» (F-13) queda retirado | La analista (texto vigente) | CNT-002: «no evalúa… su condición de gestionado o no gestionado» |
| R-04 | «Conexión directa o declarada»: una línea `None→Arrow` entre la API y el evento | La analista y evidencia del corpus | Texto idéntico en E1/E2/E3-001; 12 de 12 escenarios reales usan `None->Arrow` |
| R-05 | Un productor identificado por evidencia estructural (casos del corpus) cuenta como DOMINIO PRODUCTOR | Andrés | Confirmación de Andrés (Q1); 3 casos del corpus con procedencia `STRUCTURAL_CHILD_EVENT_MAIN_PATH` |
| R-06 | El hijo principal representa el servicio principal del escenario; sigue sin ser `SERVICIO`/`INVOCADO` en el contrato | La analista (texto vigente) | MANIFEST, SRV-003 (lo excluye), SRV-004 |
| R-07 | Páginas plantilla/leyenda/BDD no se evalúan (sin filas ni porcentaje) | Andrés | Decisión de Andrés en v11.2.2 |
| R-08 | «No aplica» solo por el criterio individual de cada regla; la ausencia de la figura basta cuando la regla lo declara | La analista y Andrés | Cláusulas «No aplica» explícitas de la analista; principio de v11.2.2 |
| R-09 | Cascada EVT-004 → EVT-005/006/007 (Capa de Tópicos ausente = No cumple en EVT-004 y No verificable en las demás) | La analista (texto vigente) | EVT-005/006/007, viñeta «No aplica» |
| R-10 | Preguntas: MCI de la API principal; MCI del hijo solo en E1/E2; exposición opcional (solo API-004); se elimina la pregunta MCI del gestor | La analista (texto vigente) | MANIFEST «Respuestas humanas autorizadas» |
| R-11 | Los modelos ENTRADA/SALIDA se reconocen por `customData` literal; el nombre no los certifica | Evidencia del corpus y Andrés | 160 de 160 figuras preservadas; `MODELO` por nombre solo en 61; `GUIA-TEXTAREAS` del analista |
| R-12 | Un resultado por regla y página; el detalle por componente va en la justificación | Andrés | Procedimiento de la Skill y `AGENTS.md` |
| R-13 | Reversiones explícitas de la analista: guion bajo obligatorio (EVT-001), camelCase (EVT-002), sin tilde (EVT-003), sin eventos ni gestores dentro de auxiliares o SISTEMAS EXTERNOS | La analista (texto vigente) | Textos detallados de las reglas |
| R-14 | API-003: sección completa sin modelo = No cumple; la exposición declarada no la corrige | La analista (texto vigente) | API-003 |
| R-15 | API-004, CA-001 y FT-001 se separan (existencia en API-004/SRV-004/MQ-002; CA/FT solo nombres) | La analista (texto vigente) | 04 y 02 |
| R-16 | CNT-006 desaparece; la integridad del JSON pasa a controles previos | La analista (texto vigente) | MANIFEST |
| R-17 | Con `UMLActiveClassBlock` = gestor, «sin figura» da No aplica en MQ y en las reglas condicionales | La analista (texto vigente) | MQ-001 y cláusulas «No aplica» |
| R-18 | Cuatro estados, fórmula y prioridad `No cumple` > `No verificable` > `Cumple` > `No aplica` | Andrés y la analista | Skill y procedimiento §8 |
| R-19 | Las respuestas del analista solo se reutilizan entre páginas con confirmación explícita | Andrés | Decisión de Andrés |
| R-20 | CNT-001 y CNT-002 se evalúan con el patrón estructural identificado aunque el escenario siga en HIPOTESIS | La analista (texto vigente) | CNT-001/002: «aunque el cumplimiento integral del escenario no esté confirmado» |

## 7. Decisiones pendientes

Todas están **abiertas**. Se separan por quién decide. Las fichas completas (problema, evidencia, alternativas, recomendación, pregunta y espacio de aprobación) están en `PROPUESTA_PREGUNTAS_ANALISTA.md`.

### 7.1 Decisiones normativas de la analista

| ID | Tema | Prioridad | Reglas | Bloquea generar la Skill v12 candidata |
|---|---|---|---|---|
| C-01 | SRV-001 y SRV-002: criterio y población | P0 | SRV-001, SRV-002 | **Sí** |
| C-02 | Paquete cerrado y versionado | P0 | Todas (condición global) | **Sí** |
| C-04 | Certificar API, servicio o evento de integración en figuras no principales | P1 | API-001, API-002, API-003, EXT-002, SRV-003, COM-002, COM-003, EVT-001, EVT-002, EVT-003, MQ-003 | No (la regla queda «No verificable» hasta decidirla) |
| C-05 | Definición de «invocado» | P1 | SRV-003, COM-002, COM-003, MQ-003 | No (la regla queda «No verificable» hasta decidirla) |
| C-06 | Cómo se reconocen las figuras de la norma | P1 | EVT-001, EVT-002, EVT-003, EVT-004, EVT-005, EVT-006, EVT-007, MQ-002, CNT-003, CNT-004, CNT-005 | No (la regla queda «No verificable» hasta decidirla) |
| C-07 | Convención de subtipos BPMN | P1 | E1-001, E2-001, E3-001, EVT-007, MQ-003 | No (la regla queda «No verificable» hasta decidirla) |
| C-08 | E1/E2/E3-001: violación estructural certificada con Inicio sin certificar | P1 | E1-001, E2-001, E3-001 | No (la regla queda «No verificable» hasta decidirla) |
| C-03 | Cobertura completa, ausencia demostrada y «No aplica» uniforme | P2 | Todas (condición global) | No (la regla queda «No verificable» hasta decidirla) |
| C-09 | Criterios subjetivos (específico, genérico, plantilla, idioma, infinitivo) | P2 | CNT-002, GW-001, API-001, API-002, API-003, SRV-003, EVT-001, EVT-002, COM-001, MQ-001 | No (la regla queda «No verificable» hasta decidirla) |
| C-10 | EXT-001 y CNT-005 frente a diagramas reales | P2 | EXT-001, CNT-005 | No (la regla queda «No verificable» hasta decidirla) |
| C-12 | Comandos: «relación identificable» y «atribución inequívoca» | P2 | COM-001, COM-005 | No (la regla queda «No verificable» hasta decidirla) |
| C-13 | MOD-001: ¿un grupo compartido es asociación inequívoca? | P2 | MOD-001 | No (la regla queda «No verificable» hasta decidirla) |
| C-11 | Erratas y precisiones editoriales (lote) | P3 | EXT-002, API-003, API-004, EVT-005, EVT-006, EVT-007, CNT-003, CNT-004, SRV-003 | **Sí** |

### 7.2 Propuestas técnicas (las redacta el equipo técnico; la analista las aprueba o corrige)

| ID | Propuesta | Decisión que la habilita | Quién decide |
|---|---|---|---|
| PT-01 | Definición única de cobertura completa y tabla incidencia → regla | C-03 | Redactada por el equipo técnico; la aprueba la analista |
| PT-02 | Listas cerradas de plantilla y de nombres genéricos (borrador) | C-09 | Borrador del equipo técnico; la aprueba la analista |
| PT-03 | Tabla de reconocimiento de figuras prellenada con ocurrencias reales | C-06 | Prellenada; la completa la analista |
| PT-04 | Convención de datos personalizados para el subtipo de evento | C-07 | Solo si el estándar corporativo ya lo exige |
| PT-05 | Redefinir el rol INVOCADO (EC-01) y clasificar figuras no principales (EC-06) | C-04, C-05 | Cambio de comportamiento del contrato; lo decide Andrés tras la analista |
| PT-06 | Publicar candidatos a hijo y patrón candidato aunque el escenario no esté determinado (EC-11) | Pregunta CNT-002 | Aditivo; lo decide Andrés tras la analista |
| PT-07 | Publicar Capa sin Flujo, «Federado» y el hijo por grupos (EC-04) | C-06 | Aditivo; Andrés |

### 7.3 Decisiones de Andrés sobre implementación (no se piden a la analista)

| ID | Asunto | Momento |
|---|---|---|
| A-1 | Nomenclatura y versión del paquete (C-02) y fecha de cierre del catálogo | Bloquea la Skill v12 candidata |
| A-2 | Actualizar AGENTS.md: retirar F-13, pasar a 37 reglas, MCI del hijo solo en E1/E2, UMLActiveClassBlock como norma | Pendiente; no se hace en esta fase |
| A-3 | Adaptar la Skill vigente: retirar «no se extiende a CNT-002», «evaluar API-004/CA-001/FT-001 por separado», el criterio operativo de CNT-006 y la «duda de población» | Al generar la v12 |
| A-4 | Avisar a la analista del tratamiento de páginas plantilla (se incluye como nota en C-11, punto 9) | Informativo |
| A-5 | SKILL_VERSION en el código (hoy 11.2.1) y metadatos de versión | Al implementar |
| A-6 | Plan de migración del banco QA de 41 a 37 reglas | Al implementar |
| A-7 | Política de variabilidad para los criterios subjetivos (parte de C-09) | Tras la respuesta de la analista |
| A-8 | Aprobar o descartar los cambios técnicos EC-01…EC-11 del contrato y del motor | Tras las respuestas de la analista |

### 7.4 Pregunta adicional sobre CNT-002 (nueva, vinculada a C-03)

Al verificar CNT-002 con diagramas sintéticos se vio que «No cumple» por nombre ausente, vacío, genérico o de plantilla es demostrable, pero **no** lo son «no existe hijo», «existe más de uno» ni «dominio distinto», porque el patrón estructural no se puede determinar si el hijo falta, está duplicado o está en un dominio no exigido. No se pide cambiar el texto de CNT-002 ni exigir el Inicio: solo precisar cuándo se considera «identificable» el patrón (Ejemplo F y ficha en el cuestionario).

## 8. Ejemplos representativos

Diagramas **sintéticos** (no corporativos). «Qué publica la herramienta» describe lo que el exportador reconoce hoy de cada figura; no es un veredicto normativo.

### Ejemplo A — SRV-001 y SRV-002: ¿qué figuras entran en la población?

Ayuda a resolver: C-01.

**Diagrama:**
- Servicio invocado con prefijo: UMLClassBlock «ms-ledger | postEntry | Entidad»
- Servicio invocado sin prefijo: UMLClassBlock «Ledger Entry Service | postEntry | Entidad»
- Hijo principal: contenedor «ms-payment-status» (una sola sección de texto) en el DOMINIO PRODUCTOR

**Qué publica la herramienta:**
- «ms-ledger»: tipo SERVICIO (por el prefijo).
- «Ledger Entry Service»: sin tipo (el nombre no lleva prefijo).
- Contenedor hijo: tipo SERVICIO_HIJO y rol HIJO_PRINCIPAL; no es SERVICIO ni tiene operación.

**Duda que el ejemplo ilustra:** ¿SRV-001 se aplica a las tres figuras, solo a la primera o a las dos primeras? ¿SRV-002 puede exigir una operación al contenedor que no tiene segunda sección?

### Ejemplo B — API frente a servicio invocado frente a evento de integración

Ayuda a resolver: C-04 y C-06.

**Diagrama:**
- UMLClassBlock «Ledger - Account Balance v1.0.0 | getBalance | Entidad»
- UMLClassBlock «ms-ledger | postEntry | Entidad»
- UMLClassBlock «Payments - Payment Created_v1.0.0 | onPaymentCreated | Empresarial - Event»
- API principal «Payments - Payment Status v1.0.0 | getPaymentStatus | private - entidad»

**Qué publica la herramienta:**
- La API principal: tipo API y rol PRINCIPAL.
- Primera figura: sin tipo (el formato de API no basta; «Entidad» no demuestra servicio).
- Segunda: tipo SERVICIO solo por el prefijo.
- Tercera: sin tipo; la tercera sección «Empresarial - Event» no la certifica como evento de integración.

**Duda que el ejemplo ilustra:** Las tres figuras tienen el mismo aspecto gráfico. ¿Qué rasgo las distingue de forma determinante?

### Ejemplo C — INVOCADO con conexiones bidireccionales

Ayuda a resolver: C-05.

**Diagrama:**
- Comando «Consultar saldo» dentro del hijo
- Servicio «ms-ledger | getBalance | Entidad» en INTEGRACIÓN
- Variante 1: dos líneas entre ambos (cada una con CircleOpen en el origen y Generalization en el destino), como exige COM-003
- Variante 2: una sola línea

**Qué publica la herramienta:**
- Variante 1 (patrón normativo): servicio de tipo SERVICIO y rol sin resolver (null). Dos conexiones.
- Variante 2: servicio de tipo SERVICIO y rol INVOCADO.

**Duda que el ejemplo ilustra:** El patrón que exige la norma nunca produce el rol «invocado». ¿Qué es un servicio invocado: el que solo recibe conexión, o el que está relacionado con un comando en cualquier sentido?

### Ejemplo D — Evento BPMN sin subtipo certificado

Ayuda a resolver: C-07 y C-08.

**Diagrama:**
- Escenario E1: API en INTEGRACIÓN, hijo con un evento BPMN en el DOMINIO PRODUCTOR, línea API → evento (None → Arrow)
- El evento lleva el texto «Inicio» y ningún dato personalizado

**Qué publica la herramienta:**
- Escenario E1 en estado HIPOTESIS (patrón identificado, sin confirmar).
- Evento: subtipo sin determinar (NO_VERIFICABLE); el texto «Inicio» no certifica el subtipo.
- La conexión API → evento se verifica por sus terminaciones (None → Arrow).

**Duda que el ejemplo ilustra:** ¿Cómo se marca en Lucidchart que un evento es de Inicio? Y, si la estructura está mal pero el Inicio no está marcado, ¿es «No cumple» o «No verificable»?

### Ejemplo E — MOD-001: modelos asociados por grupo

Ayuda a resolver: C-13.

**Diagrama:**
- Actividad «paymentRequest» con dato personalizado ENTRADA; actividad «paymentResponse» con SALIDA; actividad «otherRequest» con ENTRADA
- Grupo g1 = {API principal, paymentRequest, paymentResponse}
- Grupo g2 = {otherRequest}

**Qué publica la herramienta:**
- Los tres modelos conservan su dato personalizado literal (sin tipo MODELO).
- Ambos grupos se resuelven sin conflicto.
- Contención: los tres modelos están en INTEGRACIÓN, igual que la API.

**Duda que el ejemplo ilustra:** ¿Los modelos de g1 quedan inequívocamente asociados a la API? ¿Y otherRequest, que está en un grupo sin la API?

### Ejemplo F — CNT-002 con un hijo defectuoso

Ayuda a resolver: Pregunta vinculada a C-03 (ver propuesta de preguntas).

**Diagrama:**
- Caso 1: hijo con nombre vacío
- Caso 2: dos hijos, cada uno con su evento y su línea desde la API, ambos en el DOMINIO PRODUCTOR
- Caso 3: hijo con su evento y su línea, pero en SISTEMAS EXTERNOS
- Caso 4: sin ningún hijo

**Qué publica la herramienta:**
- Caso 1: escenario E1/HIPOTESIS con hijo principal identificado y nombre vacío: el defecto es demostrable (No cumple).
- Caso 2: escenario sin determinar (varios candidatos): el patrón no se publica.
- Caso 3: escenario sin determinar; el contenedor figura con dominio SISTEMAS EXTERNOS pero sin rol.
- Caso 4: escenario sin determinar y página sin resolver.

**Duda que el ejemplo ilustra:** En los casos 2, 3 y 4 la norma pide «patrón estructural certificado» para dar No cumple, pero el patrón depende del propio hijo. ¿Cuándo se considera identificable el patrón si el hijo falta, está duplicado o está en un dominio no exigido?

### Ejemplo G — Auxiliar con comandos y eventos

Ayuda a resolver: C-10 y C-12.

**Diagrama:**
- Auxiliar «EVC Payments» en INTEGRACIÓN que contiene: un comando «Consultar saldo», un evento BPMN y una figura «Ledger - Account Balance v1.0.0 | getBalance | Entidad»

**Qué publica la herramienta:**
- El auxiliar: tipo SISTEMA_EXTERNO_AUXILIAR, dominio INTEGRACIÓN, con tres componentes contenidos.
- El evento interno: tipo EVENTO. El comando y la figura de API: sin tipo.

**Duda que el ejemplo ilustra:** EXT-001 no admite eventos dentro de un auxiliar y dice «requiere revisión manual»: ¿se esperaba que apareciera un evento aquí? Y si el comando se conecta con el auxiliar, ¿a cuál de los componentes internos se atribuye la conexión (COM-005)?

## 9. Matriz de aprobación

La matriz con casillas para cada regla, cada decisión y el cierre del catálogo está en `MATRIZ_APROBACION_NORMATIVA.md`. Resumen:

- 37 reglas para aprobar el texto literal (13 decisiones abiertas asociadas: C-01, C-02, C-03, C-04, C-05, C-06, C-07, C-08, C-09, C-10, C-11, C-12, C-13).
- 4 bloqueos para generar la Skill v12 candidata: C-01, C-02, C-11 y la aprobación del catálogo.
- 10 decisiones que no bloquean, pero cuyo resultado define cuántas reglas pueden evaluarse sin «No verificable».

## Qué debe aprobar la analista antes de generar la Skill v12 candidata

1. **El texto literal de las 37 reglas** (huella en la cabecera), incluido que SRV-001/002 viajan como reglas activas con criterio pendiente **o** el criterio definitivo de C-01.
2. **C-01:** población y criterio de SRV-001 y SRV-002.
3. **C-11:** el lote de erratas (cambia texto normativo).
4. **C-02:** que el contenido normativo del paquete son exactamente estas 37 reglas y los principios generales.
5. Recomendable antes de empezar a usar los resultados: **C-08** (una sola respuesta cambia el resultado de E1/E2/E3-001) y **C-04/C-05** (de ellas depende el tipo de los componentes no principales).
6. El resto (C-03, C-06, C-07, C-09, C-10, C-12, C-13) puede aprobarse después: mientras tanto las reglas afectadas se informan como «No verificable» con la causa.

---

Este documento no declara estable ni aprobada ninguna versión del catálogo ni de la Skill.