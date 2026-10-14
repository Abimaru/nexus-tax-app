# ESTÁNDAR CORPORATIVO DE BLUEPRINTS — NORMATIVA CONSOLIDADA

**Versión de preparación:** 0.8.1 · **Estado:** propuesta revisada, pendiente de aprobación normativa · **Fuente:** 18 Markdown entregados por la analista y correcciones aceptadas.

## Cómo utilizar este documento

- Este archivo es la **única fuente textual de requisitos** propuesta para Copilot. No depende de archivos gráficos ni contiene referencias a imágenes.
- Cada capítulo indica el Markdown de origen. Los nombres de archivos se mantienen como **trazabilidad documental**, no como vínculos externos necesarios para evaluar.
- La ausencia de evidencia cromática, geométrica, de iconografía o dirección de flechas **no prueba un incumplimiento**: se informa `No Verificable` e identifica el requisito.
- Para decidir E1/E2/E3 se necesitan pertenencia estructural, tipo y ubicación del servicio principal y conexión API → Inicio cuando aplique. Las cinco respuestas del analista son contexto declarado, no evidencia de que el dibujo cumpla.
- Una regla de un componente solo se aplica cuando dicho componente existe y el escenario la requiere. No inventar componentes ni exigir todos los tipos de política o de evento.
- Si dos disposiciones vigentes no pueden conciliarse, informar `No Verificable por conflicto normativo`, citar los dos pasajes y solicitar decisión del responsable. No decidir por interpretación arbitraria.

## Definiciones y precedencia obligatorias

### D-01. Servicio principal y componentes de servicio adicionales

El **contenedor hijo azul** denominado con el nombre real del servicio es la representación del **servicio principal** que contiene el flujo BPMN. No se exige dentro de ese mismo hijo otra figura de servicio con tres secciones. Las figuras de **servicios adicionales invocados** sí se rigen por las reglas de Servicio base y sus especializaciones (forma de tres secciones, versiones, modelos y conectividad cuando corresponda). Esta distinción prevalece sobre frases genéricas de los apartados heredados que intenten aplicar la figura de tres secciones al propio contenedor hijo.

### D-02. Escenarios

- **E1 — API directa al backend:** existen INTEGRACIÓN y DOMINIO PRODUCTOR (el segundo puede llevar nombre del equipo, p. ej. NEPA). API y capas correspondientes en INTEGRACIÓN, sin hijo azul del servicio principal allí. El servicio principal **no gestionado** se modela en hijo azul de DOMINIO PRODUCTOR con evento de Inicio; API conectada a ese Inicio mediante línea continua.
- **E2 — API con servicio de integración:** existen INTEGRACIÓN y DOMINIO PRODUCTOR. En INTEGRACIÓN se encuentran API y el hijo azul del servicio principal **gestionado**, con sus capas aplicables al modelo. API se conecta por línea continua al Inicio situado dentro de ese hijo. El hijo en DOMINIO PRODUCTOR **es opcional**. La existencia de capas, por sí sola, no demuestra E2.
- **E3 — Servicio no gestionado:** el principal **no gestionado** y su flujo BPMN se encuentran en hijo azul de DOMINIO PRODUCTOR. No se exige API si no se está modelando una.

### D-03. Sistema Externo anidado

`Sistema Externo` es un **contenedor anidado** dentro de INTEGRACIÓN o SISTEMAS EXTERNOS; **debe contener por lo menos una API o un servicio**. No es un contenedor padre adicional ni el hijo azul del servicio principal. No confundir su contenido con el requisito de que el padre SISTEMAS EXTERNOS tenga un hijo azul. Evaluar sus características de forma, texto y conexión en el capítulo de Contenedores.

### D-04. Alcance de la evidencia

La salida de Evidence Studio puede demostrar texto, IDs, contención JSON/CSV y relaciones estructurales; sus colores globales SVG y candidatos de iconos no quedan vinculados a un componente solo por coexistir en el archivo. No atribuir un HEX o tipo de icono a un ID sin emparejamiento certificado.

### D-05. Reglas de interpretación acordadas

- En `componenteServicioGestionado` el título vigente es **Servicio gestionado**; en `componenteServicioNoGestionado` el título vigente es **Servicio no gestionado**.
- Referencias heredadas `APIBase`, `APIPrivada` y `APIPartnerPublica` corresponden respectivamente a los capítulos API base, privada y pública/partner.
- Para un `Command` con respuesta se requieren señales de envío y recepción; sin respuesta, solo la señal aplicable de envío o de recepción. No inferir la modalidad sin evidencia.
- En la suscripción del evento sin respuesta, el triángulo sin relleno apunta al evento de señal de **recepción**.
- La versión con prefijo `v` exige que el **primer número sea mayor o igual a 1**, además del resto del formato normativo.
- La política admite **cualquiera de los cinco comandos permitidos**, no exige los cinco simultáneamente.

---

---

## Contenedores, escenarios y sistemas externos

**Origen:** `contenedores.md`

# REGLAS BLUEPRINT API

## Contenedores y Carriles

> **Regla interpretativa vigente — servicio principal frente a servicio invocado**
> El **contenedor hijo azul** representa el servicio principal cuyo BPMN se modela. **No necesita** duplicar dentro de sí una figura de tres secciones. La figura de servicio de tres secciones se aplica a **servicios adicionales invocados**, según `componenteServicioBase.md` y sus especializaciones. Este criterio prevalece sobre frases genéricas del documento que parezcan exigir ambas representaciones para el mismo servicio.



### Descripción general
- Todos los contenedores deben encapsular componentes o partes del flujo.
- Existen dos tipos de contenedores:
    1. Padres o principales
    2. Hijos o secundarios

#### Contenedor Padre
IMAGEN

**Colores**

Borde:
- HEX: #000000
- RGB: 0, 0, 0

Relleno:
- HEX: #f2f3f5
- RGB: 242, 243, 245

Texto:
- HEX: #000000
- RGB: 0, 0, 0

**Condiciones**
- Tiene forma rectangular.
- Tiene esquinas redondeadas.
- Tiene borde negro de línea continua.
- Tiene relleno gris claro.
- No contiene divisiones internas obligatorias.
- Debe conservar una orientación vertical.
- Debe estar nombrado como INTEGRACIÓN, DOMINIO PRODUCTOR o SISTEMAS EXTERNOS.
- Los títulos deben ir en mayusculas.
- El contenedor de INTEGRACIÓN puede tener asociado un contenedor hijo pero no es obligatorio, dependiendo del escenario de integración (Ver sección "Contenedores y escenarios de integración").
- El contenedor INTEGRACION debe estar ubicado siempre al lado izquierdo como primer contenedor. Sin embargo puede repetirse y estar ubicado adicionalmente al lado derecho del contenedor DOMINIO PRODUCTOR.
- El contenedor DOMINIO PRODUCTOR debe estar al lado derecho del contenedor INTEGRACIÓN y no puede repetirse.
- En E1 y E3 DOMINIO PRODUCTOR debe contener un hijo azul del servicio principal; en E2 el hijo de DOMINIO PRODUCTOR es opcional.
- SISTEMAS EXTERNOS no debe confundirse con el contenedor anidado «Sistema Externo». Puede alojar componentes de Sistema Externo conforme a «Otros contenedores»; no se exige un hijo azul del servicio principal allí.
- Los componentes directamente alojados en un contenedor principal se rigen por el escenario, incluidos las APIs, servicios invocados, eventos, gestores de colas, modelos de concepto o definición y el contenedor anidado Sistema Externo cuando corresponda. Los hijos azules y las capas dependen de las reglas de su propio escenario.

#### Contenedor Hijo

**Colores**

Borde:
- HEX: #000000
- RGB: 0, 0, 0

Relleno:
- HEX: #edf5ff
- RGB: 237, 245, 255

Texto:
- HEX: #000000
- RGB: 0, 0, 0

**Condiciones**
- Tiene forma rectangular.
- Tiene esquinas redondeadas.
- Tiene borde negro de línea continua.
- Tiene relleno azul muy claro.
- No contiene divisiones internas obligatorias.
- Debe estar ubicado completamente dentro del contenedor padre.
- Debe estar nombrado con el nombre del servicio gestionado o no gestionado según aplique.
- Debe estar siempre contenido dentro del contenedor padre de INTEGRACION o DOMINIO PRODUCTOR.
- El hijo del servicio principal aloja el flujo BPMN: inicio, actividades, compuertas y eventos BPMN. No exige duplicar el servicio principal mediante una figura de Servicio de tres secciones. APIs, servicios adicionales invocados y gestores de colas deben evaluarse conforme a sus reglas específicas y al contexto del flujo.


### Contenedores y escenarios de integración
- La cantidad de contenedores que debe tener el blueprint depende exclusivamente del escenario de integración que se quiera modelar:
    1. API directo al backend
    2. API con servicio de integración
    3. Servicio no gestionado
-
#### Escenario de integración 1: API directo al backend
- Deben existir como mínimo los contenedores principales INTEGRACIÓN y DOMINIO PRODUCTOR (este último puede usar el nombre propio del equipo productor, por ejemplo NEPA).
- INTEGRACIÓN contiene la API y sus capas/modelos aplicables, **sin hijo azul del servicio principal**.
- DOMINIO PRODUCTOR contiene un hijo azul denominado con el **nombre real del servicio no gestionado principal**, con su BPMN y evento de Inicio.
- La API se conecta con **línea continua** al símbolo de Inicio situado en ese hijo; esta relación debe comprobarse, no inferirse de proximidad.
- El contenedor hijo principal no requiere divisiones internas de tres secciones ni capas propias obligatorias. Los servicios **adicionales invocados** sí siguen las reglas de los componentes de servicio correspondientes.
- SISTEMAS EXTERNOS y otras integraciones se aplican cuando el diagrama las incluya, sin alterar el criterio principal E1.

#### Escenario de integración 2: API con servicio de integración
- Deben existir como mínimo INTEGRACIÓN y DOMINIO PRODUCTOR.
- INTEGRACIÓN contiene API, sus capas/modelos aplicables y un **hijo azul que representa el servicio gestionado principal**; este hijo usa el nombre real del servicio.
- La API se conecta por **línea continua** al símbolo de Inicio ubicado **dentro del hijo del servicio gestionado de INTEGRACIÓN**.
- El hijo del servicio gestionado debe contar con las capas de despliegue correspondientes al modelo arquitectónico aplicable; aplicarlas según `capasDespliegue.md` y el modelo confirmado. No deducir E2 solo por la presencia de capas.
- El contenedor hijo del servicio principal no requiere la figura interna de tres secciones ni divisiones horizontales.
- DOMINIO PRODUCTOR **puede tener o no** un contenedor hijo del servicio no gestionado, conforme al diseño; no exigirlo ni prohibirlo de manera absoluta.
- Las figuras de servicios adicionales invocados cumplen `componenteServicioGestionado.md` o `componenteServicioNoGestionado.md` según su naturaleza y ubicación.

#### Escenario de integración 3: Servicio no gestionado
- DOMINIO PRODUCTOR contiene un hijo azul que modela el servicio **no gestionado principal** y su BPMN; debe llevar el nombre real del servicio.
- No se exige insertar dentro del hijo una segunda figura de Servicio de tres secciones para representar el mismo servicio.
- Cuando el escenario tenga otros contenedores o componentes consumidores, se evalúan sus conexiones por la normativa correspondiente; no asumir que existe API si no se modela.
- Los servicios adicionales invocados, si aparecen, siguen la normativa específica de componentes de servicio.

### Otros contenedores

#### 1. **Sistema Externo:**
**Colores**

Relleno:
- HEX: #ffcce6
- RGB: 255, 204, 230
- Opacidad: 80 %

Borde:
- HEX: #c40062
- RGB: 196, 0, 98

**Condiciones**:
- Se usa para encapsular componentes externos que no son propios del dominio que se está modelando. **Debe contener al menos una API o un servicio**; un evento por sí solo no satisface este requisito. Puede contener eventos adicionales cuando correspondan.
- Tiene forma rectangular.
- Tiene esquinas redondeadas.
- Tiene borde de línea discontinua.
- El borde utiliza segmentos largos separados por espacios.
- El borde tiene color magenta oscuro.
- El relleno es rosado claro y semitransparente.
- No contiene divisiones internas.
- No contiene íconos internos.
- Debe conservar una orientación horizontal.
- Debe ubicarse **dentro del contenedor padre INTEGRACIÓN o SISTEMAS EXTERNOS**. Es un **contenedor anidado de sistema externo**, no un contenedor padre ni un contenedor hijo azul de servicio principal.
- Las conexiones hacia las APIs, servicios o eventos deben ser con lineas discontinuas.
- Debe tener un texto asociado que permita identificar el sistema externo. Este texto debe ser diferente a las palabras "Sistema Externo".


---

## Capas de despliegue

**Origen:** `capasDespliegue.md`

## Capas de Despliegue

### Contenedores de la Capa de Despliegue


Las APIs (Este componente hereda todas las condiciones definidas en el documento `componenteApiPrivada.md`, excepto aquellas reemplazadas explícitamente en el presente documento), Servicios ((Este componente hereda todas las condiciones definidas en el documento `componenteServicioGestionado.md`, excepto aquellas reemplazadas explícitamente en el presente documento)) y Eventos ((Este componente hereda todas las condiciones definidas en el documento `eventos.md`, excepto aquellas reemplazadas explícitamente en el presente documento)) se deben clasificar en un Flujo Transaccional (Monetario, No Monetario, Operativo, Transversal), y en una Capa de Arquitectura (Experiencia, Composición y Sistema).

### Como se modela la capa de despliegue

- El contenedor de la capa es el rectángulo exterior más grande que encapsula todo el contenido del API, Servicio, Evento, Representa la Capa de Despliegue API Partner, es decir, el límite arquitectónico dentro del cual se ubican los flujos, operaciones y componentes relacionados.

En la Vista de la Capa de despliegue se debe agregar los componentes de despliegue encima (superpuesto) de cada API, Servicio, Evento, MQ, etc.

El dominio de valores para los flujos y capas son los siguientes:

Flujos Transaccionales:

* monetario
* no-monetario
* operativo
* transversal

Capas de Arquitectura:

* experiencia
* composicion
* sistema

  - Si los nombres son diferentes a los que están en este listado que es experiencia, composicion o sistema, tal cual está escrito es considerado un error.
  
### Capa de despliegue para API Privada
La capa de despliegue esta conformada por el Flujo Transaccional y dentro de este se encuentra la Capa de Arquitectura
#### Colores:

* Borde:
    HEX: #000000 (negro).
* Fondo: Transparente (fill="none")

**Condiciones**:

La estructura jerarquica debe ser de esta manera:

 FLUJO TRANSACCIONAL
│
└── CAPA DE ARQUITECTURA
    │
    └── API INTERNA

- El Flujo Transaccional es el contenedor más externo y sus caracteristicas son:
 * Borde negro.
 * Estilo punteado/segmentado.
 * Esquinas redondeadas.
 * Sin color de fondo (transparente).
 * Contiene todos los demás elementos que son la Capa de Arquitectura.
 * El nombre del flujo se ubica normalmente en la parte superior izquierda del contenedor externo
 * El Flujo Transaccional debe tener cualquiera de estos nombres despues del termino "Flujo Transaccional -" y debe ser tal cual esta escrito a continuación en minusculas y sin tildes, si no esta definido de esta forma es una inconsistencia:

    * monetario
    * no-monetario
    * operativo
    * transversal

  * El texto debe cumplir con la siguiente estructura: `"Flujo Transaccional - <tipo>"`
  * `<tipo>` debe corresponder a uno de los valores permitidos en el estándar: `monetario`, `no-monetario`, `operativo` o `transversal`.
  * El tipo debe estar en minúscula.
  * Ejemplos válidos: `Flujo Transaccional - monetario`, `Flujo Transaccional - no-monetario`, `Flujo Transaccional - operativo`, `Flujo Transaccional - transversal`. 

- La capa de Arquitectura se encuentra completamente dentro del Flujo Transaccional, Sus características son:
 * Rectángulo con esquinas redondeadas.
 * Borde negro.
 * Sin color de fondo (transparente).
 * Debe envolver todo el flujo o servicio modelado.
 * Visualmente funciona como un marco arquitectónico
 * Dentro de la capa se ubica el componente API Interna representado como un segundo contenedor
 * La Capa de Despliegue siempre debe ser más grande que el componente API.
 * La API Interna debe estar completamente contenida dentro de la capa.
 * Debe existir un margen visual entre el borde de la capa y el borde de la API.
 * La capa no debe superponerse parcialmente al componente; debe contenerlo totalmente.
 * El nombre de la capa se ubica normalmente en la parte superior izquierda del contenedor externo
 * En términos de Blueprint, la Capa de Despliegue representa el contexto o dominio donde vive la API Interna, mientras que el componente API representa el flujo o servicio específico contenido dentro de esa capa
 * Asi como se muestra la imagen debe estar el API Interna con la capa de despliegue inlcuyendo el Flujo Transaccional y la Capa de Arquitectura
 * La capa de Arquiectura debe tener cualquiera de estos nombres despues del termino "Capa de Arquitectura -" y debe ser tal cual esta escrito a continuación en minusculas y sin tildes, si no esta definido de esta forma es una inconsistencia:

  * experiencia
  * composicion
  * sistema

* El texto debe cumplir con la siguiente estructura: `"Capa de Arquitectura - <tipo>"`
*  `<tipo>` debe corresponder a uno de los valores permitidos en el estándar: `experiencia`, `composicion`,  o `sistema`.
* El tipo debe estar en minúscula.
* Ejemplos válidos: `Capa de Arquitectura - experiencia`, `Capa de Arquitectura - composicion`, `Capa de Arquitectura - sistema`. 


### Capa de despliegue para API Publica o Partner
#### Colores:

* Borde:
    HEX: #000000 (negro).
* Fondo: Transparente (fill="none")


**Condiciones**:

La estructura jerarquica debe ser de esta manera:

CAPA DE ARQUITECTURA
    │
    └── API PUBLIC O PARTNER

- La capa de Arquitectura se encuentra completamente dentro del Flujo Transaccional, Sus características son:
 * Rectángulo con esquinas redondeadas.
 * Borde negro.
 * Sin color de fondo (transparente).
 * Debe envolver todo el flujo o servicio modelado.
 * Visualmente funciona como un marco arquitectónico
 * Dentro de la capa se ubica el componente API Interna representado como un segundo contenedor
 * La Capa de Despliegue siempre debe ser más grande que el componente API.
 * La API Interna debe estar completamente contenida dentro de la capa.
 * Debe existir un margen visual entre el borde de la capa y el borde de la API.
 * La capa no debe superponerse parcialmente al componente; debe contenerlo totalmente.
 * El nombre de la capa se ubica normalmente en la parte superior izquierda del contenedor externo
 * En términos de Blueprint, la Capa de Despliegue representa el contexto o dominio donde vive la API Interna, mientras que el componente API representa el flujo o servicio específico contenido dentro de esa capa
 * Asi como se muestra la imagen debe estar el API Interna con la capa de despliegue inlcuyendo el Flujo Transaccional y la Capa de Arquitectura
 * La capa de Arquiectura debe tener cualquiera de estos nombres despues del termino "Capa de Arquitectura -" y debe ser tal cual esta escrito a continuación en minusculas y sin tildes, si no esta definido de esta forma es una inconsistencia:

  * experiencia
  * composicion
  * sistema

* El texto debe cumplir con la siguiente estructura: `"Capa de Arquitectura - <tipo>"`
*  `<tipo>` debe corresponder a uno de los valores permitidos en el estándar: `experiencia`, `composicion`,  o `sistema`.
* El tipo debe estar en minúscula.
* Ejemplos válidos: `Capa de Arquitectura - experiencia`, `Capa de Arquitectura - composicion`, `Capa de Arquitectura - sistema`. 

- Asi como se muestra la imagen debe estar el API Pública o Partner con la capa de despliegue inlcuyendo solamente la Capa de Arquitectura

### Capa de despliegue para Evento Comportamiento Con Respuesta
#### Colores:

* Borde:
    HEX: #000000 (negro).
* Fondo: Transparente (fill="none")

**Condiciones**:

La estructura jerarquica debe ser de esta manera:

Flujo Transaccional
    │
    └── Capa de Arquitectura
        │
        └── Evento con Respuesta (nombreTopicoPublicacion y nombreTopicoSuscripcion)


- El Flujo Transaccional es el contenedor más externo y sus caracteristicas son:
 * Borde negro.
 * Estilo punteado/segmentado.
 * Esquinas redondeadas.
 * Sin color de fondo (transparente).
 * Contiene todos los demás elementos que son la Capa de Arquitectura.
 * El nombre del flujo se ubica normalmente en la parte superior izquierda del contenedor externo
 * El Flujo Transaccional debe tener cualquiera de estos nombres despues del termino "Flujo Transaccional -" y debe ser tal cual esta escrito a continuación en minusculas y sin tildes, si no esta definido de esta forma es una inconsistencia:

    * monetario
    * no-monetario
    * operativo
    * transversal
  * El texto debe cumplir con la siguiente estructura: `"Flujo Transaccional - <tipo>"`
  * `<tipo>` debe corresponder a uno de los valores permitidos en el estándar: `monetario`, `no-monetario`, `operativo` o `transversal`.
  * El tipo debe estar en minúscula.
  * Ejemplos válidos: `Flujo Transaccional - monetario`, `Flujo Transaccional - no-monetario`, `Flujo Transaccional - operativo`, `Flujo Transaccional - transversal`. 


- La capa de Arquitectura se encuentra completamente dentro del Flujo Transaccional, Sus características son:
 * Rectángulo con esquinas redondeadas.
 * Borde negro.
 * Sin color de fondo (transparente).
 * Debe envolver todo el flujo o servicio modelado.
 * Visualmente funciona como un marco arquitectónico
 * Dentro de la capa se ubica el componente API Interna representado como un segundo contenedor
 * La Capa de Despliegue siempre debe ser más grande que el componente API.
 * La API Interna debe estar completamente contenida dentro de la capa.
 * Debe existir un margen visual entre el borde de la capa y el borde de la API.
 * La capa no debe superponerse parcialmente al componente; debe contenerlo totalmente.
 * El nombre de la capa se ubica normalmente en la parte superior izquierda del contenedor externo
 * En términos de Blueprint, la Capa de Despliegue representa el contexto o dominio donde vive la API Interna, mientras que el componente API representa el flujo o servicio específico contenido dentro de esa capa
 * Asi como se muestra la imagen debe estar el API Interna con la capa de despliegue inlcuyendo el Flujo Transaccional y la Capa de Arquitectura
 * La capa de Arquiectura debe tener cualquiera de estos nombres despues del termino "Capa de Arquitectura -" y debe ser tal cual esta escrito a continuación en minusculas y sin tildes, si no esta definido de esta forma es una inconsistencia:

  * experiencia
  * composicion
  * sistema

* El texto debe cumplir con la siguiente estructura: `"Capa de Arquitectura - <tipo>"`
*  `<tipo>` debe corresponder a uno de los valores permitidos en el estándar: `experiencia`, `composicion`,  o `sistema`.
* El tipo debe estar en minúscula.
* Ejemplos válidos: `Capa de Arquitectura - experiencia`, `Capa de Arquitectura - composicion`, `Capa de Arquitectura - sistema`. 

- Asi como se muestra la imagen debe estar el API Interna con la capa de despliegue incluyendo el Flujo Transaccional y la Capa de Arquitectura
- El Evento comportamiento con respuesta debe tener el nombre del Tópico de publicacion y debe estar dentro del 3 recuadro que se encuentra en la capa de despliegue
- El Evento comportamiento con respuesta debe tener el nombre del Tópico de suscripcion y debe estar dentro del 3 recuadro que se encuentra en la capa de despliegue


### Capa de despliegue para Evento Comportamiento Sin Respuesta
#### Colores:

* Borde:
    HEX: #000000 (negro).
* Fondo: Transparente (fill="none")

**Condiciones**:

La estructura jerarquica debe ser de esta manera:

Flujo Transaccional
    │
    └── Capa de Arquitectura
        │
        └── Evento con Respuesta (nombreTopicoPublicacion y nombreTopicoSuscripcion)


- El Flujo Transaccional es el contenedor más externo y sus caracteristicas son:
 * Borde negro.
 * Estilo punteado/segmentado.
 * Esquinas redondeadas.
 * Sin color de fondo (transparente).
 * Contiene todos los demás elementos que son la Capa de Arquitectura.
 * El nombre del flujo se ubica normalmente en la parte superior izquierda del contenedor externo
 * El Flujo Transaccional debe tener cualquiera de estos nombres despues del termino "Flujo Transaccional -" y debe ser tal cual esta escrito a continuación en minusculas y sin tildes, si no esta definido de esta forma es una inconsistencia:

    * monetario
    * no-monetario
    * operativo
    * transversal
  * El texto debe cumplir con la siguiente estructura: `"Flujo Transaccional - <tipo>"`
  * `<tipo>` debe corresponder a uno de los valores permitidos en el estándar: `monetario`, `no-monetario`, `operativo` o `transversal`.
  * El tipo debe estar en minúscula.
  * Ejemplos válidos: `Flujo Transaccional - monetario`, `Flujo Transaccional - no-monetario`, `Flujo Transaccional - operativo`, `Flujo Transaccional - transversal`. 


- La capa de Arquitectura se encuentra completamente dentro del Flujo Transaccional, Sus características son:
 * Rectángulo con esquinas redondeadas.
 * Borde negro.
 * Sin color de fondo (transparente).
 * Debe envolver todo el flujo o servicio modelado.
 * Visualmente funciona como un marco arquitectónico
 * Dentro de la capa se ubica el componente API Interna representado como un segundo contenedor
 * La Capa de Despliegue siempre debe ser más grande que el componente API.
 * La API Interna debe estar completamente contenida dentro de la capa.
 * Debe existir un margen visual entre el borde de la capa y el borde de la API.
 * La capa no debe superponerse parcialmente al componente; debe contenerlo totalmente.
 * El nombre de la capa se ubica normalmente en la parte superior izquierda del contenedor externo
 * En términos de Blueprint, la Capa de Despliegue representa el contexto o dominio donde vive la API Interna, mientras que el componente API representa el flujo o servicio específico contenido dentro de esa capa
 * Asi como se muestra la imagen debe estar el API Interna con la capa de despliegue inlcuyendo el Flujo Transaccional y la Capa de Arquitectura
 * La capa de Arquiectura debe tener cualquiera de estos nombres despues del termino "Capa de Arquitectura -" y debe ser tal cual esta escrito a continuación en minusculas y sin tildes, si no esta definido de esta forma es una inconsistencia:

  * experiencia
  * composicion
  * sistema

* El texto debe cumplir con la siguiente estructura: `"Capa de Arquitectura - <tipo>"`
*  `<tipo>` debe corresponder a uno de los valores permitidos en el estándar: `experiencia`, `composicion`,  o `sistema`.
* El tipo debe estar en minúscula.
* Ejemplos válidos: `Capa de Arquitectura - experiencia`, `Capa de Arquitectura - composicion`, `Capa de Arquitectura - sistema`. 

- Asi como se muestra la imagen debe estar el API Interna con la capa de despliegue incluyendo el Flujo Transaccional y la Capa de Arquitectura
- El Evento comportamiento con respuesta debe tener el nombre del Tópico de publicacion y debe estar dentro del 3 recuadro que se encuentra en la capa de despliegue


### Capa de despliegue para Servicio
- Asi como se muestra la imagen debe estar el servicio con la capa de despliegue inlcuyendo el Flujo Transaccional y la Capa de Arquitectura

#### Colores:

* Borde:
    HEX: #000000 (negro).
* Fondo: Transparente (fill="none")

**Condiciones**:

La estructura jerarquica debe ser de esta manera:

 FLUJO TRANSACCIONAL
│
└── CAPA DE ARQUITECTURA
    │
    └── SERVICIO


- El Flujo Transaccional es el contenedor más externo y sus caracteristicas son:
 * Borde negro.
 * Estilo punteado/segmentado.
 * Esquinas redondeadas.
 * Sin color de fondo (transparente).
 * Contiene todos los demás elementos que son la Capa de Arquitectura.
 * El nombre del flujo se ubica normalmente en la parte superior izquierda del contenedor externo
 * El Flujo Transaccional debe tener cualquiera de estos nombres despues del termino "Flujo Transaccional -" y debe ser tal cual esta escrito a continuación en minusculas y sin tildes, si no esta definido de esta forma es una inconsistencia:

    * monetario
    * no-monetario
    * operativo
    * transversal

  * El texto debe cumplir con la siguiente estructura: `"Flujo Transaccional - <tipo>"`
  * `<tipo>` debe corresponder a uno de los valores permitidos en el estándar: `monetario`, `no-monetario`, `operativo` o `transversal`.
  * El tipo debe estar en minúscula.
  * Ejemplos válidos: `Flujo Transaccional - monetario`, `Flujo Transaccional - no-monetario`, `Flujo Transaccional - operativo`, `Flujo Transaccional - transversal`. 
*

- La capa de Arquitectura se encuentra completamente dentro del Flujo Transaccional, Sus características son:
 * Rectángulo con esquinas redondeadas.
 * Borde negro.
 * Sin color de fondo (transparente).
 * Debe envolver todo el flujo o servicio modelado.
 * Visualmente funciona como un marco arquitectónico
 * Dentro de la capa se ubica el componente API Interna representado como un segundo contenedor
 * La Capa de Despliegue siempre debe ser más grande que el componente API.
 * La API Interna debe estar completamente contenida dentro de la capa.
 * Debe existir un margen visual entre el borde de la capa y el borde de la API.
 * La capa no debe superponerse parcialmente al componente; debe contenerlo totalmente.
 * El nombre de la capa se ubica normalmente en la parte superior izquierda del contenedor externo
 * En términos de Blueprint, la Capa de Despliegue representa el contexto o dominio donde vive la API Interna, mientras que el componente API representa el flujo o servicio específico contenido dentro de esa capa
 * Asi como se muestra la imagen debe estar el API Interna con la capa de despliegue inlcuyendo el Flujo Transaccional y la Capa de Arquitectura
 * La capa de Arquiectura debe tener cualquiera de estos nombres despues del termino "Capa de Arquitectura -" y debe ser tal cual esta escrito a continuación en minusculas y sin tildes, si no esta definido de esta forma es una inconsistencia:

  * experiencia
  * composicion
  * sistema

* El texto debe cumplir con la siguiente estructura: `"Capa de Arquitectura - <tipo>"`
*  `<tipo>` debe corresponder a uno de los valores permitidos en el estándar: `experiencia`, `composicion`,  o `sistema`.
* El tipo debe estar en minúscula.
* Ejemplos válidos: `Capa de Arquitectura - experiencia`, `Capa de Arquitectura - composicion`, `Capa de Arquitectura - sistema`. 
- Asi como se muestra la imagen debe estar el API Interna con la capa de despliegue incluyendo el Flujo Transaccional y la Capa de Arquitectura

### Capa de despliegue para Componentes Tecnológicos de Integración

####  Gestor de Colas (Queue Manager)

#### Colores:

* Borde:
    HEX: #000000 (negro).
* Fondo: Transparente (fill="none")

**Condiciones**:

La estructura jerarquica debe ser de esta manera:

 FLUJO TRANSACCIONAL
│
└── CAPA DE ARQUITECTURA
    │
    └── GESTOR DE COLAS


- El Flujo Transaccional es el contenedor más externo y sus caracteristicas son:
 * Borde negro.
 * Estilo punteado/segmentado.
 * Esquinas redondeadas.
 * Sin color de fondo (transparente).
 * Contiene todos los demás elementos que son la Capa de Arquitectura.
 * El nombre del flujo se ubica normalmente en la parte superior izquierda del contenedor externo
 * El Flujo Transaccional debe tener cualquiera de estos nombres despues del termino "Flujo Transaccional -" y debe ser tal cual esta escrito a continuación en minusculas y sin tildes, si no esta definido de esta forma es una inconsistencia:

    * monetario
    * no-monetario
    * operativo
    * transversal

  * El texto debe cumplir con la siguiente estructura: `"Flujo Transaccional - <tipo>"` 
  *  `<tipo>` debe corresponder a uno de los valores permitidos en el estándar: `monetario`, `no-monetario`, `operativo` o `transversal`.
  * El tipo debe estar en minúscula.
  * Ejemplos válidos: `Flujo Transaccional - monetario`, `Flujo Transaccional - no-monetario`, `Flujo Transaccional - operativo`, `Flujo Transaccional - transversal`. 

- La capa de Arquitectura se encuentra completamente dentro del Flujo Transaccional, Sus características son:
 * Rectángulo con esquinas redondeadas.
 * Borde negro.
 * Sin color de fondo (transparente).
 * Debe envolver todo el flujo o servicio modelado.
 * Visualmente funciona como un marco arquitectónico
 * Dentro de la capa se ubica el componente API Interna representado como un segundo contenedor
 * La Capa de Despliegue siempre debe ser más grande que el componente API.
 * La API Interna debe estar completamente contenida dentro de la capa.
 * Debe existir un margen visual entre el borde de la capa y el borde de la API.
 * La capa no debe superponerse parcialmente al componente; debe contenerlo totalmente.
 * El nombre de la capa se ubica normalmente en la parte superior izquierda del contenedor externo
 * En términos de Blueprint, la Capa de Despliegue representa el contexto o dominio donde vive la API Interna, mientras que el componente API representa el flujo o servicio específico contenido dentro de esa capa
 * Asi como se muestra la imagen debe estar el API Interna con la capa de despliegue inlcuyendo el Flujo Transaccional y la Capa de Arquitectura
 * La capa de Arquiectura debe tener cualquiera de estos nombres despues del termino "Capa de Arquitectura -" y debe ser tal cual esta escrito a continuación en minusculas y sin tildes, si no esta definido de esta forma es una inconsistencia:

  * experiencia
  * composicion
  * sistema

  * El texto debe cumplir con la siguiente estructura: `"Capa de Arquitectura - <tipo>"`
*  `<tipo>` debe corresponder a uno de los valores permitidos en el estándar: `experiencia`, `composicion`,  o `sistema`.
* El tipo debe estar en minúscula.
* Ejemplos válidos: `Capa de Arquitectura - experiencia`, `Capa de Arquitectura - composicion`, `Capa de Arquitectura - sistema`. 

- Asi como se muestra la imagen debe estar el API Interna con la capa de despliegue incluyendo el Flujo Transaccional y la Capa de Arquitectura
#### APIS, Servicios y Gestores de Cola no Federedos
- Si existe algun componente como un API, Servicio o Gestor de colas que no se encuentra en la infraestructra centralizada no debe tener la capa de despliegue porque aun se encuentra en una infraestuctura federada, pero si debe tener un recuadro con lineas discontinuas indicando que es Federado.
- Los servicios que aún residen en la infraestructura federada no incluyen flujo transaccional ni capa de arquitectura, ya que no están desplegados en la infraestructura centralizada. No obstante, si el mecanismo de consumo se realiza a través de colas de mensajería en el Gestor de Colas (Queue Manager) de Integración, se complementa con la capa genérica "Federado" y los nombres de las colas de petición y respuesta utilizadas para la comunicación.

### Ejemplo Modelo de BluePrint en Infrestructura de Modelo Centralizado de integración
### Ejemplo Modelo de BluePrint en Infrestructura Federada


---

## API — reglas base

**Origen:** `componenteApiBase.md`

# REGLAS BLUEPRINT API

## API
### Descripción general

- Representa una API cuya responsabilidad funcional pertenece al mismo dominio en el que se encuentra modelada.
- El componente está conformado por:
    - Una API.
    - Un identificador circular verde.
    - Un Modelo de Datos de Entrada.
    - Un Modelo de Datos de Salida.
    - Las capas de despliegue (flujo transaccional y capa de arquitectura), cuando aplique.
    - Una conexión de línea continua o dos conexiones de línea discontinua, según el escenario de modelamiento.

### API

#### Colores

La API puede presentarse en color azul, gris o verde. En las tres variantes debe conservar el borde exterior, las líneas divisorias internas y el texto en color negro.

###### Elementos comunes para las tres variantes

Borde exterior:
- HEX: #000000
- RGB: 0, 0, 0

Líneas divisorias internas:
- HEX: #000000
- RGB: 0, 0, 0

Texto:
- HEX: #000000
- RGB: 0, 0, 0

###### API azul

Relleno:
Gradiente lineal compuesto por:
- HEX: #98d4e6
- RGB: 152, 212, 230
- HEX: #d0d8fe
- RGB: 208, 216, 254

###### API gris

Relleno:
Gradiente lineal compuesto por:
- HEX: #808080
- RGB: 128, 128, 128
- HEX: #e6e6e6
- RGB: 230, 230, 230

###### API verde

Relleno:
Gradiente lineal compuesto por:
- HEX: #97d077
- RGB: 151, 208, 119
- HEX: #99ffcc
- RGB: 153, 255, 204

#### Forma y estructura

- Tiene forma rectangular con esquinas redondeadas.
- Tiene borde negro de línea continua.
- Debe conservar una orientación horizontal.
- Está dividida mediante líneas horizontales en tres secciones:
    1. Identificación y versión de la API.
    2. Operación de la API.
    3. Tipo y modelo de servicio de la API.
- La API puede utilizar una de las siguientes variantes de color: azul, gris o verde.
- El color utilizado debe corresponder completamente a una de las paletas definidas en la sección **Colores**.
- No se permite combinar en una misma API colores de dos o más variantes.
- Independientemente de la variante seleccionada, el borde exterior, las líneas divisorias internas y el texto deben conservarse en color negro.

#### Primera sección: identificación y versión

- Debe contener el nombre del producto, el nombre de la API y su versión.
- El texto debe cumplir con la siguiente estructura: `"Nombre Producto - Nombre API v#.#.#"` 
- Los textos `"Nombre Producto"` y `"Nombre API"` deben reemplazarse por los nombres reales del producto y de la API.
- El nombre del producto y el nombre de la API deben escribirse con la letra inicial de cada palabra en mayúscula.
- El nombre del producto y el nombre de la API deben estar separados por un único guion.
- El nombre del producto y el nombre de la API deben estar en inglés.
- No se deben utilizar guiones adicionales como parte de esta estructura. 
- Ejemplo válido: Cash Out Operations - Withdrawal Request v1.0.2
- La versión debe cumplir con el formato `v#.#.#`.
- El número inmediatamente posterior a la letra `v` debe ser un dígito mayor a 1.
- Los dos números restantes deben ser dígitos igual o mayores a 0.
- Ejemplos válidos versión: v1.0.0, v1.0.2, v2.3.1, v2.13.0
- Ejemplos no válidos: v0.1.0, V1.0.0, v1.0, 1.0.0, v1.00.02

#### Segunda sección: operación de la API

- Debe contener el nombre de la operación expuesta por la API.
- El nombre de la operación debe escribirse en formato `camelCase`.
- El nombre de la operación debe estar en inglés.
- Debe iniciar con letra minúscula.
- No debe contener espacios, guiones ni guiones bajos. 
- Ejemplos válidos: enableWithdrawal, validate, createCustomer, retrieveCreditHistory 
- Ejemplos no válidos: EnableWithdrawal, enable withdrawal, enable-withdrawal, enable_withdrawal

#### Tercera sección: tipo y modelo de servicio

- Debe contener el tipo de la API y su modelo de servicio.
- El texto debe cumplir con la siguiente estructura: `"Tipo - Modelo de servicio"`
- El tipo debe corresponder a uno de los siguientes valores: private, public o partner. Esto depende del tipo de API.
- El modelo de servicio debe corresponder a uno de los siguientes valores: entidad, utilidad o tarea.
- El tipo y el modelo de servicio deben escribirse completamente en minúsculas.


### Identificador circular verde

#### Colores

Borde de la circunferencia exterior:
- HEX: #000000
- RGB: 0, 0, 0

Borde de la circunferencia interior:
- HEX: #000000
- RGB: 0, 0, 0

Relleno:
Gradiente lineal compuesto por:
- HEX: #d4ffa3
- RGB: 212, 255, 163
- HEX: #99ffcc
- RGB: 153, 255, 204

Triángulo interno:

Borde:
- HEX: #000000
- RGB: 0, 0, 0

Relleno:
- HEX: #ffffff
- RGB: 255, 255, 255

#### Forma y ubicación

- Tiene forma circular.
- Tiene doble circunferencia.
- Tiene borde negro de línea continua.
- Contiene un triángulo interno de color blanco.
- El triángulo interno apunta hacia arriba.
- Debe estar asociado visualmente a la API.
- Debe estar ubicado en la esquina superior derecha de la API.

### Modelos de datos asociados

- La API debe tener asociado un Modelo de Datos de Entrada.
- La API debe tener asociado un Modelo de Datos de Salida.

### Capas de despliegue

- Cuando la API esté modelada bajo el modelo MCI, debe estar enmarcada por las capas de despliegue definidas para su tipo.
- Las capas de despliegue aplicables deben especificarse en el documento particular del componente:`APIPrivada.md`, `APIPartnerPublica.md`
- Cuando la API no esté modelada bajo el modelo MCI, las capas de despliegue no serán obligatorias y su ausencia no deberá reportarse como incumplimiento.
- La forma, los colores, los textos, la ubicación y las demás condiciones de cada capa de despliegue deben validarse según el estándar específico de capas.

### Ubicación dentro del blueprint

- La API debe estar ubicada obligatoriamente dentro del contenedor gris denominado `"INTEGRACIÓN"`.
- Si dentro del contenedor `"INTEGRACIÓN"` existe un contenedor azul que representa el servicio de integración:

    - La API debe permanecer dentro del contenedor `"INTEGRACIÓN"`.
    - La API debe estar ubicada por fuera del contenedor azul.
    - La API debe estar ubicada al lado izquierdo del contenedor azul.
### Conexiones

- La API puede tener uno de los siguientes esquemas de conexión:
    1. Una línea continua.
    2. Dos líneas discontinuas.

- Los dos esquemas son excluyentes.
- La API no debe estar sin conexiones.
- Si no tiene una línea continua, debe tener obligatoriamente las dos líneas discontinuas.

#### Escenario 1: conexión mediante línea continua
- La línea continua debe estar ubicada en el lado derecho de la API.
- La flecha final de la línea continua debe conectarse con el símbolo de inicio asociado a la API.

#### Escenario 2: conexión mediante dos líneas discontinuas
- Deben existir exactamente dos líneas discontinuas asociadas a la API.
- En la primera línea discontinua, el triángulo sin relleno debe apuntar hacia la API.
- En la segunda línea discontinua, el círculo sin relleno debe apuntar hacia la API.
- Los extremos opuestos de ambas líneas discontinuas deben conectarse con un comando de tipo consulta o con un comando de tipo sistema automatizado.


---

## API privada

**Origen:** `componenteApiPrivada.md`

### API Privada

#### Especificación base

Este componente hereda todas las condiciones definidas en el documento `componenteApiBase.md`, excepto aquellas reemplazadas explícitamente en el presente documento.

Deben aplicarse sin modificación las reglas base relacionadas con:

- Colores permitidos para la API.
- Forma y estructura del componente.
- Identificación y versión de la API.
- Nombre de la operación.
- Formato camelCase.
- Modelo de servicio.
- Identificador circular verde.
- Modelo de Datos de Entrada.
- Modelo de Datos de Salida.
- Ubicación general de los elementos.
- Esquemas de conexión.
- Líneas continuas y discontinuas.

#### Descripción general

- Representa una API privada cuya responsabilidad funcional pertenece al mismo dominio en el que se encuentra modelada.
- El componente está conformado por:
    - Una API.
    - Un identificador circular verde.
    - Un Modelo de Datos de Entrada.
    - Un Modelo de Datos de Salida.
    - Las capas de despliegue (flujo transaccional y capa de arquitectura), cuando aplique.
    - Una conexión de línea continua o dos conexiones de línea discontinua, según el escenario de modelamiento.

#### Tercera sección: tipo y modelo de servicio

- Debe contener el tipo de la API y su modelo de servicio.
- El texto debe cumplir con la siguiente estructura: `"Tipo - Modelo de servicio"`
- El tipo debe ser `private`.
- El modelo de servicio debe corresponder a uno de los siguientes valores: `entidad`, `utilidad` o `tarea`.
- El tipo y el modelo de servicio deben escribirse completamente en minúsculas.
- Ejemplos válidos: `private - entidad`, `private - utilidad`, `private - tarea`.
- Ejemplos no válidos: `public - entidad`, `Private - utilidad`, `PARTNER - tarea`.

#### Capas de despliegue aplicables
- Cuando la API privada esté modelada bajo el modelo MCI, debe estar enmarcada por las siguientes capas de despliegue: Flujo transaccional y Capa de arquitectura.
- La ausencia de cualquiera de estas capas debe reportarse como incumplimiento.
- Las condiciones visuales, textuales y estructurales de estas capas se heredan del estándar correspondiente y no se redefinen en este documento.

##### Flujo transaccional

- El texto debe cumplir con la siguiente estructura: `"Flujo Transaccional - <tipo>"`
- `<tipo>` debe corresponder a uno de los valores permitidos en el estándar: `monetario`, `no-monetario`, `operativo` o `transversal`.
- El tipo debe estar en minúscula.
- Ejemplos válidos: `Flujo Transaccional - monetario`, `Flujo Transaccional - no-monetario`, `Flujo Transaccional - operativo`, `Flujo Transaccional - transversal`.

##### Capa de arquitectura

- El texto debe cumplir con la siguiente estructura: `"Capa de Arquitectura - <tipo>"`
- `<tipo>` debe corresponder a uno de los valores permitidos en el estándar de capas de arquitectura.
- El valor utilizado debe coincidir exactamente con uno de los valores definidos en dicho estándar.

#### Condiciones heredadas

Todas las demás condiciones definidas en `APIBase.md` deben cumplirse sin modificación.


---

## API pública y partner

**Origen:** `componenteApiPartnerPublica.md`

### API Pública o partner

#### Especificación base

Este componente hereda todas las condiciones definidas en el documento `componenteApiBase.md`, excepto aquellas reemplazadas explícitamente en el presente documento.

Deben aplicarse sin modificación las reglas base relacionadas con:

- Colores permitidos para la API.
- Forma y estructura del componente.
- Identificación y versión de la API.
- Nombre de la operación.
- Formato camelCase.
- Modelo de servicio.
- Identificador circular verde.
- Modelo de Datos de Entrada.
- Modelo de Datos de Salida.
- Ubicación general de los elementos.
- Esquemas de conexión.
- Líneas continuas y discontinuas.

#### Descripción general

- Representa una API expuesta para ser consumida por clientes externos o socios.
- El componente está conformado por:
  - Una API.
  - Un identificador circular verde.
  - Un Modelo de Datos de Entrada.
  - Un Modelo de Datos de Salida.
  - Una capa de arquitectura.
  - Una conexión de línea continua o dos conexiones de línea discontinua, según el escenario de modelamiento.

#### Tercera sección: tipo y modelo de servicio

- Debe contener el tipo de la API y su modelo de servicio.
- El texto debe cumplir con la siguiente estructura: `"Tipo - Modelo de servicio"`
- El tipo debe corresponder a uno de los siguientes valores:`public` o `partner`.
- El modelo de servicio debe corresponder a uno de los siguientes valores: `entidad`, `utilidad` o `tarea`.
- El tipo y el modelo de servicio deben escribirse completamente en minúsculas.
- Ejemplos válidos: `public - entidad`, `public - utilidad`, `public - tarea`, `partner - entidad`, `partner - utilidad`, `partner - tarea`.
- Ejemplos no válidos: `private - entidad`, `Public - utilidad`, `PARTNER - tarea`, `public entidad`, `partner - servicio`.

#### Capas de despliegue aplicables
- Cuando la API pública o partner esté modelada bajo el modelo MCI, debe estar enmarcada únicamente por una capa de arquitectura.
- El flujo transaccional no aplica para APIs de tipo `public` o `partner`.
- La ausencia de flujo transaccional no debe reportarse como incumplimiento.
- Si se identifica un flujo transaccional asociado a una API de tipo `public` o `partner`, debe reportarse como incumplimiento.
- Las condiciones visuales, textuales y estructurales de la capa de arquitectura se heredan del estándar correspondiente y no se redefinen en este documento.

#### Diferencias respecto a la API privada

Las siguientes reglas reemplazan las condiciones equivalentes de la API privada:

1. El tipo `private` no es válido para una API pública.
2. El tipo debe ser `public` o `partner`.
3. La API pública requiere únicamente una capa de arquitectura.
4. La API pública no requiere flujo transaccional.

Todas las demás condiciones definidas en `APIBase.md` deben cumplirse sin modificación.


---

## Servicio invocado — reglas base

**Origen:** `componenteServicioBase.md`

# REGLAS BLUEPRINT API

## SERVICIO

> **Ámbito:** las reglas de rectángulo de **tres secciones** descritas aquí aplican a un **componente de servicio adicional invocado** dentro del blueprint. NO aplican al **contenedor hijo azul** que representa el servicio principal modelado mediante un flujo BPMN (E1, E2 o E3). La coincidencia semántica de la palabra «servicio» no implica duplicación gráfica.
### Descripción general

- Representa un servicio asociado a la API que se está modelando.
- El componente está conformado por:
    - Un Servicio
    - Un Modelo de Datos de Entrada.
    - Un Modelo de Datos de Salida.
    - Las capas de despliegue (flujo transaccional y capa de arquitectura), cuando aplique.
    - Dos conexiones de línea discontinua.

### SERVICIO

#### Colores

El servicio puede presentarse en color azul, gris o verde. En las tres variantes debe conservar el borde exterior, las líneas divisorias internas y el texto en color negro.

###### Elementos comunes para las tres variantes

Borde exterior:
- HEX: #000000
- RGB: 0, 0, 0

Líneas divisorias internas:
- HEX: #000000
- RGB: 0, 0, 0

Texto:
- HEX: #000000
- RGB: 0, 0, 0

###### Servicio azul

Relleno:
Gradiente lineal compuesto por:
- HEX: #98d4e6
- RGB: 152, 212, 230
- HEX: #d0d8fe
- RGB: 208, 216, 254

###### Servicio gris

Relleno:
Gradiente lineal compuesto por:
- HEX: #808080
- RGB: 128, 128, 128
- HEX: #e6e6e6
- RGB: 230, 230, 230

###### Servicio verde

Relleno:
Gradiente lineal compuesto por:
- HEX: #97d077
- RGB: 151, 208, 119
- HEX: #99ffcc
- RGB: 153, 255, 204

#### Forma y estructura

- Tiene forma rectangular con esquinas redondeadas.
- Tiene borde negro de línea continua.
- Debe conservar una orientación horizontal.
- Está dividida mediante líneas horizontales en tres secciones:
    1. Nombre del servicio
    2. Nombre funcional del método
    3. Clasificación de la lógica
- El servicio puede utilizar una de las siguientes variantes de color: azul, gris o verde.
- El color utilizado debe corresponder completamente a una de las paletas definidas en la sección **Colores**.
- No se permite combinar en un mismo servicio colores de dos o más variantes.
- Independientemente de la variante seleccionada, el borde exterior, las líneas divisorias internas y el texto deben conservarse en color negro.

#### Primera sección: nombre del servicio

- Debe contener el nombre servicio.
- El texto debe cumplir con la siguiente estructura: `"Nombre Servicio"`.
- Los textos `"Nombre Servicio"` deben reemplazarse por los nombres reales del servicio.
- El nombre del servicio debe escribirse con la letra inicial de cada palabra en mayúscula.
- No se deben utilizar guiones adicionales como parte de esta estructura.

#### Segunda sección: nombre funcional del método

- Debe contener el nombre de la operación expuesta por el servicio.
- El nombre de la operación debe escribirse en formato `camelCase`.
- El nombre de la operación debe estar en inglés.
- Debe iniciar con letra minúscula.
- No debe contener espacios, guiones ni guiones bajos.
- Ejemplos válidos: enableWithdrawal, validate, createCustomer, retrieveCreditHistory.
- Ejemplos no válidos: EnableWithdrawal, enable withdrawal, enable-withdrawal, enable_withdrawal

#### Tercera sección: clasificación de la lógica

- Debe contener el modelo de servicio.
- El modelo de servicio debe corresponder a uno de los siguientes valores: entidad, utilidad o tarea.
- El modelo de servicio deben escribirse completamente en minúsculas.


### Modelos de datos asociados

- El servicio debe tener asociado un Modelo de Datos de Entrada.
- El servicio debe tener asociado un Modelo de Datos de Salida.

### Capas de despliegue
- Cuando el servicio esté modelado bajo el modelo MCI, debe estar enmarcada por las capas de despliegue definidas para su tipo.
- Las capas de despliegue aplicables deben especificarse en el documento particular del componente:`componenteServicioNoGestionado.md`, `componenteServicioGestionado.md`
- La forma, los colores, los textos, la ubicación y las demás condiciones de cada capa de despliegue deben validarse según el estándar específico de capas.

### Conexiones

- El servicio puede tener uno de los siguientes esquemas de conexión:
    1. Una línea discontinua.
    2. Dos líneas discontinuas.

- Los dos esquemas son excluyentes.
- El servicio no debe estar sin conexiones.

#### Escenario 1: conexión mediante una línea discontinua

- La línea discontinua debe estar ubicada en alguno de sus laterales.
- El triangulo sin relleno de la linea discontínua, debe apuntar hacia un componente de integración como un gestor de colas.
- El circulo sin rellano de la linea discontínua, debe apuntar hacia el servicio. 

#### Escenario 2: conexión mediante dos líneas discontinuas

- Deben existir exactamente dos líneas discontinuas asociadas al servicio.
- En la primera línea discontinua, el triángulo sin relleno debe apuntar hacia el servicio.
- En la segunda línea discontinua, el círculo sin relleno debe apuntar hacia el servicio.
- Los extremos opuestos de ambas líneas discontinuas deben conectarse con un comando de tipo consulta o con un comando de tipo sistema automatizado.


---

## Servicio gestionado invocado

**Origen:** `componenteServicioGestionado.md`

> **Ámbito vigente:** este documento describe un **componente de servicio invocado**, no el contenedor hijo azul que contiene el BPMN del servicio principal. El componente invocado hereda la estructura de tres secciones de `componenteServicioBase.md`; el hijo del principal no la hereda.

## REGLAS BLUEPRINT API

### Servicio gestionado

#### Especificación base

Este componente hereda todas las condiciones definidas en el documento `componenteServicioBase.md`, excepto aquellas reemplazadas explícitamente en el presente documento.

Deben aplicarse sin modificación las reglas base relacionadas con:

- Colores permitidos para la API.
- Forma y estructura del componente.
- Identificación y versión del servicio.
- Nombre de la operación.
- Formato camelCase.
- Modelo de servicio.
- Modelo de Datos de Entrada.
- Modelo de Datos de Salida.
- Ubicación general de los elementos.
- Esquemas de conexión.
- Líneas discontinuas.

#### Descripción general

- Representa un servicio asociado a la API que se está modelando.
- El componente está conformado por:
    - Un servicio.
    - Un Modelo de Datos de Entrada.
    - Un Modelo de Datos de Salida.
    - Una conexión de línea discontinua o dos conexiones de línea discontinua, según el escenario de modelamiento.

#### Capas de despliegue aplicables

- Cuando el servicio invocado esté modelado bajo MCI, debe contar con las capas de despliegue aplicables según `capasDespliegue.md`; no confundirlas con las del servicio principal.
- Cuando el servicio no esté modelado bajo MCI, debe estar enmarcada por la capa correspondiente al modelo federado.
- La ausencia de cualquiera de estas capas (MCI o federado) debe reportarse como incumplimiento.
- Las condiciones visuales, textuales y estructurales de estas capas se heredan del estándar correspondiente y no se redefinen en este documento.


### Ubicación dentro del blueprint

- El componente de servicio **gestionado invocado** se ubica según su naturaleza y las reglas aplicables de integración. El servicio gestionado **principal de E2** se representa mediante el hijo azul de INTEGRACIÓN.
- Bajo ningún motivo debe estar asociado al contenedor de DOMINIO PRODUCTOR.

#### Condiciones heredadas

Todas las demás condiciones definidas en `componenteServicioBase.md` deben cumplirse sin modificación.


---

## Servicio no gestionado invocado

**Origen:** `componenteServicioNoGestionado.md`

> **Ámbito vigente:** este documento describe un **componente de servicio invocado**, no el contenedor hijo azul que contiene el BPMN del servicio principal. El componente invocado hereda la estructura de tres secciones de `componenteServicioBase.md`; el hijo del principal no la hereda.

## REGLAS BLUEPRINT API

### Servicio no gestionado

#### Especificación base

Este componente hereda todas las condiciones definidas en el documento `componenteServicioBase.md`, excepto aquellas reemplazadas explícitamente en el presente documento.

Deben aplicarse sin modificación las reglas base relacionadas con:

- Colores permitidos para el servicio invocado.
- Forma y estructura del componente.
- Identificación y versión del servicio.
- Nombre de la operación.
- Formato camelCase.
- Modelo de servicio.
- Modelo de Datos de Entrada.
- Modelo de Datos de Salida.
- Ubicación general de los elementos.
- Esquemas de conexión.
- Líneas discontinuas.

#### Descripción general

- Representa un servicio asociado a la API que se está modelando.
- El componente está conformado por:
    - Un servicio.
    - Un Modelo de Datos de Entrada.
    - Un Modelo de Datos de Salida.
    - Una conexión de línea discontinua o dos conexiones de línea discontinua, según el escenario de modelamiento.

#### Capas de despliegue aplicables

- No es obligatorio que el servicio esté enmarcado por capas de despliegue: Flujo transaccional y Capa de arquitectura.
- La ausencia de cualquiera de estas capas no debe reportarse como incumplimiento.
- Las condiciones visuales, textuales y estructurales de estas capas se heredan del estándar correspondiente y no se redefinen en este documento.

### Ubicación dentro del blueprint

- Debe estar ubicado obligatoriamente en el contenedor del DOMINIO PRODUCTOR.
- Si dentro del contenedor de DOMINIO PRODUCTOR se encuentra otro contenedor de color azul, el servicio siempre debe estar ubicado fuera del contenedor azul.

#### Condiciones heredadas

Todas las demás condiciones definidas en `componenteServicioBase.md` deben cumplirse sin modificación.


---

## Evento de comportamiento — reglas base

**Origen:** `componenteEventoBase.md`

# REGLAS BLUEPRINT API

## EVENTOS CON O SIN RESPUESTA

### Descripción general

- Cuando este componente se identifica en el blueprint se debe garantizar que existan los siguientes elementos:
    - Un EVENTO.
    - Un Modelo de Datos de Entrada y/o Salida, dependiendo de la clasificación del evento.
    - Las capas de despliegue.
    - Las capas de tópicos
    - Descripción funcional del evento
    - Las conexiones con lineas discontinuas, dependiendo de la clasificación del evento.
- El evento tiene una de estas clasificaciones lo cual determina los modelos de respuesta a visualizar, las conexiones y los tópicos a evaluar:
    1. Query: se denominan evento con respuesta
    2. Command: se denominan evento con o sin respuesta
    3. Event: se denominan evento sin respuesta
- Cuando el evento es con respuesta (query o command) adicional a los elementos obligatarios indicados, se debe garantizar que exista una conexión con un evento de tipo señal envío y un evento de tipo señal recepción.
- Cuando el evento es sin respuesta (command o event) adicional a los elementos obligatarios indicados, se debe garantizar que exista una conexión con un evento de tipo señal envío o un evento de tipo señal recepción. No pueden existir las dos señales.

#### Colores

El evento puede presentarse en color azul o gris. En las dos variantes debe conservar el borde exterior, las líneas divisorias internas y el texto en color negro.

###### Elementos comunes para las dos variantes

Borde exterior:
- HEX: #000000
- RGB: 0, 0, 0

Líneas divisorias internas:
- HEX: #000000
- RGB: 0, 0, 0

Texto:
- HEX: #000000
- RGB: 0, 0, 0

###### Evento azul

Relleno:
Gradiente lineal compuesto por:
- HEX: #98d4e6
- RGB: 152, 212, 230
- HEX: #d0d8fe
- RGB: 208, 216, 254

###### Evento gris

Relleno:
Gradiente lineal compuesto por:
- HEX: #808080
- RGB: 128, 128, 128
- HEX: #e6e6e6
- RGB: 230, 230, 230

#### Forma y estructura

- Tiene forma rectangular con esquinas redondeadas.
- Tiene borde negro de línea continua.
- Debe conservar una orientación horizontal.
- Está dividida mediante líneas horizontales en tres secciones:
    1. Nombre del evento
    2. Nombre de la operación
    3. Tipo y clasificación del evento
- El evento puede utilizar una de las siguientes variantes de color: azul o gris.
- El color utilizado debe corresponder completamente a una de las paletas definidas en la sección **Colores**.
- No se permite combinar en un mismo evento colores de dos o más variantes.
- Independientemente de la variante seleccionada, el borde exterior, las líneas divisorias internas y el texto deben conservarse en color negro.

#### Primera sección: nombre del evento

- Debe contener el nombre del producto, el nombre de la capacidad y su versión.
- El texto debe cumplir con la siguiente estructura: `"Nombre Producto - Nombre Capacidad_v#.#.#"` 
- Los textos `"Nombre Producto"` y `"Nombre Capacidad"` deben reemplazarse por los nombres reales del producto y de la capacidad.
- El nombre del producto y el nombre de la capacidad deben escribirse con la letra inicial de cada palabra en mayúscula.
- El nombre del producto y el nombre de la capacidad deben estar separados por un único guion (-).
- El nombre del producto y el nombre de la capacidad deben estar en inglés.
- El nombre de la capacidad y la versión deben estar unidos por un único guion bajo (_).
- No se deben utilizar guiones adicionales como parte de esta estructura. 
- Ejemplo válido: Credit Card Statement - Retrieve Credit Card Transactions_v1.0.2
- La versión debe cumplir con el formato `v#.#.#`.
- El número inmediatamente posterior a la letra `v` debe ser un dígito mayor a 1.
- Los dos números restantes deben ser dígitos igual o mayores a 0.
- Ejemplos válidos versión: v1.0.0, v1.0.2, v2.3.1, v2.13.0
- Ejemplos no válidos: v0.1.0, V1.0.0, v1.0, 1.0.0, v1.00.02

#### Segunda sección: operación de la operación

- Debe contener el nombre de la operación expuesta por el evento.
- Solo si la clasificación del evento es `event`, el nombre de la operación debe iniciar con la palabra on.
- El nombre de la operación debe escribirse en formato `camelCase`.
- El nombre de la operación debe estar en inglés.
- Debe iniciar con letra minúscula.
- No debe contener espacios, guiones ni guiones bajos.
- Ejemplos válidos: onCreditLimitChanged, modifyCreditLimit, retrieveWithdrawal
- Ejemplos no válidos: RetrieveWithdrawal, retrieve Withdrawal, modify-CreditLimit

#### Tercera sección: tipo y clasificación del evento

- Debe contener el tipo y clasificación del evento.
- El texto debe cumplir con la siguiente estructura: `"Tipo - Clasificacion"`
- El tipo debe corresponder a uno de los siguientes valores: Aplicacion o Empresarial.
- La clasificación del evento debe corresponder a uno de los siguientes valores: Query, Command o Event
- El tipo y la clasificación deben escribirse solo con su inicial en mayúscula.
- Ejemplos válidos: Aplicacion - Query, Aplicacion - Command, Aplicacion - Event, Empresarial - Query, Empresarial - Command, Empresarial - Event.


### Modelos de datos asociados

- El evento debe tener asociado un Modelo de Datos de Entrada y/o de Salida dependiendo de su clasificación indicada en el documento de cada uno `eventosSinRespuesta.md`, `eventosConRespuesta.md`c.
- Todo evento debe tener asociado una descripción del evento.

### Capas de despliegue

- El evento debe estar siempre enmarcado por las capas de despliegue: Flujo Transaccional y Capa de Arquitectura y cumplir el lineamiento indicado en XXXXX.
- La ausencia de estas capas deberá reportarse como incumplimiento.
- La forma, los colores, los textos, la ubicación y las demás condiciones de cada capa de despliegue deben validarse según el estándar específico de capas.

### Capas de tópicos

- El evento debe estar siempre enmarcado por una capa adicional luego de las dos capas de despliegue, la cual corresponde para los topicos de envío y/o recepción según la clasificación del tipo de evento.
- La ausencia de esta capa deberá reportarse como incumplimiento.
- Los textos que deben aparecer en esta capa dependen de la clasificación del evento:
    1. Evento con respuesta
    2. Evento sin respuesta

#### Escenario 1: Evento con respuesta
- Deben existir dos tópicos: uno para la publicación del evento y otro para la respuesta del evento.
- Ambos tópicos deben garantizar la siguiente estructura: 
    - **Publicación:** p.nombreProducto.nombreCapacidad.v1 
    - **Respuesta:** s.nombreProducto.nombreCapacidad.v1 
- El nombramiento del tópico debe estar en camelCase.
- El nombramiento del tópico solo debe tener como único caracter especial el punto (.)

#### Escenario 2: Evento sin respuesta
- Deben existir un único tópico bien sea para la publicación del evento o para la respuesta del evento.
- Independiente del tópico se debe garantizar la siguiente estructura: 
    - **Publicación:** p.nombreProducto.nombreCapacidad.v1 
    - **Suscripción:** s.nombreProducto.nombreCapacidad.v1 
- La aparición de los tópicos debe ser excluyente. 
- El nombramiento del tópico debe estar en camelCase.
- El nombramiento del tópico solo debe tener como único caracter especial el punto (.)

### Ubicación dentro del blueprint

- El evento debe estar ubicadqo obligatoriamente dentro del contenedor gris denominado `"INTEGRACIÓN"`.
- Si dentro del contenedor `"INTEGRACIÓN"` existe un contenedor azul que representa el servicio de integración:

    - El evento debe permanecer dentro del contenedor `"INTEGRACIÓN"`.
    - El evento debe estar ubicada por fuera del contenedor azul.
    - El evento debe estar ubicada al lado izquierdo del contenedor azul.

### Conexiones

- El evento puede tener como esquema de conexión una o dos lineas discontinuas según el escenario.
    1. Evento con respuesta
    2. Evento sin respuesta

#### Escenario 1: Evento con respuesta
- Se detalla en el documento `eventosConRespuesta.md` en la sección de Conexiones.

#### Escenario 2: Evento sin respuesta
- Se detalla en el documento `eventosSinRespuesta.md` en la sección de Conexiones.


---

## Evento con respuesta

**Origen:** `componenteEventoConRespuesta.md`

# REGLAS BLUEPRINT API

## EVENTO CON RESPUESTA

#### Especificación base

Este componente hereda todas las condiciones definidas en el documento `componenteEventoBase.md`, excepto aquellas reemplazadas explícitamente en el presente documento.

Deben aplicarse sin modificación las reglas base relacionadas con:

- Colores permitidos para el evento.
- Forma y estructura del componente.
- Identificación y versión del evento.
- Nombre de la operación.
- Formato camelCase.
- Tipo y Clasificación.
- Modelo de Datos de Entrada y/o Salida.
- Ubicación general de los elementos.
- Esquemas de conexión.

### Descripción general

- El componente está conformado obligatoriamente por:
    - Un EVENTO.
    - Un Modelo de Datos de Entrada.
    - Un Modelo de Datos de Salida.
    - Las capas de despliegue.
    - La capa de tópicos
    - Descripción funcional del evento
    - Dos conexiones de líneas discontinuas.
- Aplica exclusivamente para la clasificación Query o Command.
#### Tercera sección: tipo y clasificación del evento

- Debe contener el tipo y clasificación del evento.
- El texto debe cumplir con la siguiente estructura: `"Tipo - Clasificacion"`
- El tipo debe corresponder a uno de los siguientes valores: Aplicacion o Empresarial.
- La clasificación del evento debe corresponder a uno de los siguientes valores: Query o Command
- El tipo y la clasificación deben escribirse solo con su inicial en mayúscula.
- Ejemplos válidos: Aplicacion - Query, Aplicacion - Command, Empresarial - Query, Empresarial - Command.

### Modelos de datos asociados

- El evento debe tener asociado un Modelo de Datos de Entrada.
- El evento debe tener asociado un Modelo de Datos de Salida.
- El evento debe tener asociado una descripción del evento.

### Capa de tópicos

- El evento debe estar siempre enmarcado por una capa adicional luego de las dos capas de despliegue, la cual corresponde para los topicos de envío y recepción.
- La ausencia de esta capa deberá reportarse como incumplimiento.
- La capa debe tener ambos tópicos de caracter obligatorio, uno debajo del otro:
    1. Publicación o envio de evento
    2. Recepción de respuesta al evento 

 #### Tópico 1: Publicación o envio de evento
 - El nombramiento del tópico de publicación debe tener la siguiente estructura: p.nombreProducto.nombreCapacidad.v1  
- El tópico debe iniciar con la letra p, en minúscula.
- El nombramiento del tópico debe estar en camelCase.
- El nombramiento del tópico solo debe tener como único caracter especial el punto (.)

 #### Tópico 2: Recepción de respuesta al evento
 - El nombramiento del tópico de respuesta debe tener la siguiente estructura: s.nombreProducto.nombreCapacidad.v1  
- El tópico de respuesta debe iniciar con la letra s, en minúscula.
- El nombramiento del tópico solo debe tener como único caracter especial el punto (.)

### Conexiones

- El evento debe tener como esquema de conexión dos lineas discontinuas obligatoriamente.
- El evento no debe estar sin conexiones.

#### Linea discontinua 1: Publicación o envio de evento
- El triángulo sin relleno debe apuntar hacia el componente de evento tipo query o command descrito en este documento.
- El círculo sin relleno debe conectarse con el evento de tipo señal envio indicado en el documento `eventos.md`.

#### Linea discontinua 2: Recepción de respuesta al evento
- El círculo sin relleno debe apuntar hacia el componente de evento tipo query o command descrito en este documento.
- El triangulo sin relleno conectarse con el evento de tipo señal recepción indicado en el documento `eventos.md`.


---

## Evento sin respuesta

**Origen:** `componenteEventoSinRespuesta.md`

# REGLAS BLUEPRINT API

## EVENTO SIN RESPUESTA

#### Especificación base

Este componente hereda todas las condiciones definidas en el documento `componenteEventoBase.md`, excepto aquellas reemplazadas explícitamente en el presente documento.

Deben aplicarse sin modificación las reglas base relacionadas con:

- Colores permitidos para el evento.
- Forma y estructura del componente.
- Identificación y versión del evento.
- Nombre de la operación.
- Formato camelCase.
- Tipo y Clasificación.
- Modelo de Datos de Entrada y/o Salida.
- Ubicación general de los elementos.
- Esquemas de conexión.

### Descripción general

- El componente está conformado obligatoriamente por:
    - Un EVENTO.
    - Un Modelo de Datos de Entrada.
    - Las capas de despliegue.
    - La capa de tópicos
    - Descripción funcional del evento
    - Una conexión con una línea discontinua.
- Aplica exclusivamente para la clasificación Event o Command.
#### Tercera sección: tipo y clasificación del evento

- Debe contener el tipo y clasificación del evento.
- El texto debe cumplir con la siguiente estructura: `"Tipo - Clasificacion"`
- El tipo debe corresponder a uno de los siguientes valores: Aplicacion o Empresarial.
- La clasificación del evento debe corresponder a uno de los siguientes valores: Command o Event
- El tipo y la clasificación deben escribirse solo con su inicial en mayúscula.
- Ejemplos válidos: Aplicacion - Command, Aplicacion - Event, Empresarial - Command, Empresarial - Event.

### Modelos de datos asociados

- El evento debe tener asociado un Modelo de Datos de Entrada.
- El evento debe tener asociado una descripción del evento.

### Capa de tópicos

- El evento debe estar siempre enmarcado por una capa adicional luego de las dos capas de despliegue, la cual corresponde para los topicos de envío o recepción.
- La ausencia de esta capa deberá reportarse como incumplimiento.
- La capa debe tener alguno de los tópicos dependiendo del escenario. Los tópicos son excluyentes:
    1. Publicación o envio de evento
    2. Suscripción o recepción de evento 

#### Escenario 1: Publicación o envio de evento
- El nombramiento del tópico de publicación debe tener la siguiente estructura: p.nombreProducto.nombreCapacidad.v1 
- El nombramiento del tópico de publicación debe iniciar con la letra p, en minúscula.
- El nombramiento del tópico debe estar en camelCase.
- El nombramiento del tópico solo debe tener como único caracter especial el punto (.)

#### Escenario 2: Suscripción o recepción de evento 
- El nombramiento del tópico de recepción debe tener la siguiente estructura: s.nombreProducto.nombreCapacidad.v1  
- El tópico de respuesta debe iniciar con la letra s, en minúscula.
- El nombramiento del tópico debe estar en camelCase.
- El nombramiento del tópico solo debe tener como único caracter especial el punto (.)

### Conexiones

- El evento debe tener como esquema de conexión una linea discontinua según el escenario.
    1. Publicación o envio de evento
    2. Suscripción o recepción de evento
- El evento no debe estar sin conexiones.

#### Escenario 1: Publicación o envío de evento
- Aplica solo cuando el evento de tipo señal es envío y el componente de evento es de tipo event o command exclusivamente.
- La linea discontinua debe conectar el evento de tipo señal con el componente de evento aqui descrito.
- El círculo sin relleno de la linea discontinua debe conectarse con el evento de tipo seña envio indicado en el documento `eventos.md`
- El triángulo sin relleno debe apuntar hacia el componente de evento tipo event o command descrito en este documento.


#### Escenario 2: Suscripción o recepción de evento
- Aplica solo cuando el evento de tipo señal es recepción y el componente de evento es de tipo event o command exclusivamente.
- La linea discontinua debe conectar el evento de tipo señal con el componente de evento aqui descrito.
- El círculo sin relleno de la linea discontinua debe apuntar hacia el componente de evento tipo event o command descrito en este documento.
- El triángulo sin relleno debe apuntar hacia el evento de tipo señal envio indicado en el documento `eventos.md`


---

## Componentes de integración

**Origen:** `componentesIntegracion.md`

# REGLAS BLUEPRINT API

## Componentes de Integración


### 1. **Gestor de Colas - Queue Manager (MQ):**
**Colores**

Borde exterior:
- HEX: #000000
- RGB: 0, 0, 0

Relleno: 
Gradiente lineal compuesto por:
- HEX: #808080
- RGB: 128, 128, 128
- HEX: #e6e6e6
- RGB: 230, 230, 230

Líneas divisorias internas:
- HEX: #000000
- RGB: 0, 0, 0

Texto:
- HEX: #000000
- RGB: 0, 0, 0

**Condiciones**:
- El texto "Nombre Gestor de colas" debe ser reemplazado por el nombre real del gestor.
- Debe tener los colores indicados en la sección de **Colores**.
- Debe estar ubicado en el contenedor padre de INTEGRACIÓN o DOMINIO PRODUCTOR, más no en sus contenedores hijos.
- Si el gestor de colas está ubicado en el contenedor padre de INTEGRACIÓN debe tener las capas de despliegue como se mencionan en el documento `capasDespliegue.md`

**Conexiones**
- Debe estar enlazado en sus extremos con algún artefacto o componente obligatoriamente:
    - En uno de sus extremos debe asociarse con cualquiera de los artefactos mencionados posteriormente.
    - El otro extremo debe asociarse con otro gestor de colas o un servicio no gestionado.

- Como se mencionó en el punto de arriba, uno de sus extremos debe estar asociado con cualquiera de estos artefactos en la siguiente dirección:

    #### Comando de sistema automatizado
- El gestor de colas puede enlazarse con un **comando de sistema automatizado** (Ver documento `componenteServicioBase.md`) a través de dos lineas discontínuas donde:
        - La primera linea debe ir desde el componente de servicio usando el circulo sin relleno hacia el gestor de colas usando el triangulo sin relleno.
        - La segunda linea debe ir al contrario, es decir, desde gestor de colas usando el circulo sin relleno hacia el componente de servicio usando el triangulo sin relleno.

    #### Evento tipo mensaje de recepción 
- El gestor de colas puede enlazarse con un **evento tipo mensaje de recepción** a través de una linea discontínua desde el evento tipo mensaje usando el circulo sin relleno hacia el gestor de colas usando el triangulo sin relleno.

    #### Evento tipo mensaje de envío     
    - El gestor de colas puede enlazarse  con un evento tipo mensaje de envío (Ver documento `eventos.md`) a través de una linea discontínua desde el evento tipo mensaje usando el circulo sin relleno hacia el gestor de colas usando el triangulo sin relleno.

    #### Gestor de colas del backend
- El gestor de colas puede enlazarse con otro **gestor de colas** ubicado en el backend a través de dos lineas discontínuas donde:
        - La primera linea debe ir desde el gestor de colas origen usando el circulo sin relleno hacia el gestor de colas del backend usando el triangulo sin relleno.
        - La segunda linea debe ir al contrario, es decir, desde gestor de colas del backend usando el circulo sin relleno hacia el gestor de colas origen usando el triangulo sin relleno.
    - El gestor de colas del backend debe estar ubicado exclusivamente en el contenedor padre de DOMINIO PRODUCTOR.
    - El gestor de colas del backend no está obligado a tener las capas de despliegue asociadas.
    - El gestor de colas del backend debe estar enlazado a un servicio no gestionado

    #### Servicio no gestionado
- El gestor de colas puede enlazarse con un servicio no gestionado con dos lineas discontínuas:
        - La primera linea debe ir desde el gestor de colas usando el circulo sin relleno hacia el servicio no gestionado usando el triangulo sin relleno.
        - La segunda linea debe ir al contrario, es decir, desde el servicio no gestionado usando el circulo sin relleno hacia el gestor de colas usando el triangulo sin relleno.
    - El servicio no gestionado debe tener alrededor un contenedor sin relleno y de borde negro con puntas redondeadas con el nombre de la cola.


### 2. **Parametrizador de Equivalencias (PEQ):**
**Condiciones**:
- Debe representarse como un comando de tipo sistema (Ver documento `comandos.md`) bajo el nombre de "Homologar Datos".
- Debe ir acompañado obligatoriamente de un modelo de datos de entrada (Ver documento `modelosLectura.md`)
- Debe estar ubicado obligatoriamente en el contenedor hijo del servicio de integración asociado al contenedor padre de INTEGRACIÓN (Ver documento `contenedores.md`)


### 3. **Parametrizador de Códigos de Respuesta (SPR) :**
**Condiciones**:
- Debe representarse como un comando de tipo sistema (Ver documento `comandos.md`) bajo el nombre de "Homologar Excepciones".
- El comando de tipo sistema debe estar enlazado en uno de sus extremos al resultado fallido de la compuerta exclusiva con una linea contínua, y el otro extremo debe estar enlazada a un evento tipo simple de excepción (Ver documento `eventos.md`.)
- Debe estar ubicado obligatoriamente en el contenedor hijo del servicio de integración asociado al contenedor padre de INTEGRACIÓN (Ver documento `contenedores.md`)  


### 4. **Transformación de Mensajería :**
**Condiciones**:
- Se representa en las flechas de consumo indicando el formato de mensaje de origen y el de destino 
- Deben estar separados por una barra diagonal (por ejemplo: JSON/XML) 
- Se puede complementar con una observación adicional para detallar aspectos relevantes de la conversión


---

## Comandos y actividades

**Origen:** `comandos.md`

# REGLAS BLUEPRINT API

## Comandos y Subprocesos

Representan intenciones/acciones/decisiones o consultas que se debe ejecutar durante un flujo.

### 1. **Comando de consulta:**
#### Colores:

* Fondo:#CED4DB (gris claro azulado).
    HEX: #ced4db
    RGB: (206, 212, 219)
* Borde:
    HEX: #6F7681 (gris oscuro azulado).
    RGB:  (111, 118, 129)
* Color relleno engranaje: #FFFFFF
    HEX:#FFFFFF
 
**Condiciones**:
- El objeto comando de tipo consulta esta representado por un un rectángulo con esquinas redondeadas
- El comando de tipo consulta dentro del contenedor aparecen dos símbolos tipo engranaje superpuestos blancos con borde negro ubicados en la parte superior izquierda del contenedor. 
- Cada engranaje tiene un círculo central
- Este comando de tipo consulta representa una actividad que obtiene o consulta informacion especifica.
- El comando de tipo consulta se nombra con verbo infinitivo + un sustantivo. Ejemplo: “Consultar cuenta”, “Consultar pago” o “Consultar saldo”.
- Los colores utilizado en el comando de tipo consulta deben corresponder completamente a una de las paletas definidas en la sección **Colores**.
- Este comando de tipo sistema debe tener 2 lineas que pueden comunicarse con otro comando o proceso, estas lineas interlineadas deben ser 2 e ir en ambos sentidos
- El texto que se incluye en el comando de tipo consulta debe iniciar siempre en mayúsculas
- El comando de tipo consulta siempre debe tener el piñon y cumplir con el icono de la imagen
- Todo lo que tenga terminos similares a consulta, consultar consultas, validar, validacion debe ser incluidos en este objeto comando tipo consulta en color gris con valor hexadecimal  #CED4DB si está en otro color debe notificarse como un no cumplimiento.
-

### 2. **Sistema Automatizado:**
#### Colores:

* Fondo:#DAE8FC (gris claro azulado).
    HEX: DAE8FC
    RGB: (218,232,252)
* Borde:
    HEX: #6C8EBF (gris oscuro azulado).
    RGB:  (108,142,191)
* Color relleno engranaje: #FFFFFF
    HEX:#FFFFFF
 
**Condiciones**:
- Este comando tipo Sistema Automatizado esta representado por un Rectángulo con esquinas redondeadas
- Este comando tipo Sistema Automatizado se identifican dos engranajes superpuestos blancos con borde negro ubicados en la parte superior izquierda del contenedor.
- Este comando tipo Sistema Automatizado representa una actividad que puede ser sistematizada a través de una capacidad de API o Servicio
- El comando de tipo Sistema Automatizado con engranaje se nombra con verbo infinitivo + un sustantivo. Ejemplo: “Debitar cuenta”, “Validar cuenta” o “Realizar pago” 
- Los colores utilizados en el comando de tipo Sistema Automatizado deben corresponder completamente a una de las paletas definidas en la sección **Colores**.
- Este comando de tipo sistema debe tener 2 lineas que pueden comunicarse con otro comando o proceso, estas lineas interlineadas deben ser 2 e ir en ambos sentidos
- El texto que se incluye en el comando tipo Sistema Automatizado con engranaje debe iniciar en mayúsculas
- Este comando de tipo Sistema Automatizado debe tener 2 lineas que pueden comunicarse con otro comando o proceso, estas lineas deben ser interlineadas y deben ser 2 e ir en ambos sentidos


### 3. **Usuario:**
#### Colores:

* Fondo:#DAE8FC (gris claro azulado).
    HEX: DAE8FC
    RGB: (218, 232, 252)
* Borde:
    HEX: #6C8EBF (gris oscuro azulado).
    RGB:  (108,142,191)
* Color relleno engranaje: #FFFFFF
    HEX:#FFFFFF

**Condiciones:**
- Este comando de tipo usuario es un contenedor rectangular con esquinas redondeadas.
- Este comando de tipo usuario  cuenta con un ícono de usuario/persona en la parte superior izquierda.
- Este comando de tipo usuario representa una actividad que requiere la interaccion del usuario de forma manual
- El texto que se incluye en el comando de tipo usuario debe iniciar siempre en Mayúscula
- El comando de tipo usuario se nombra con verbo infinitivo + un sustantivo. Ejemplo: “Revisar Reporte”, “Validar Información”.
- Este comando de tipo sistema debe tener 2 lineas que pueden comunicarse con otro comando o proceso, estas lineas interlineadas deben ser 2 e ir en ambos sentidos
- Los colores utilizados en el comando de tipo usuario deben corresponder completamente a una de las paletas definidas en la sección **Colores**.


### 4. **Sistema:**
#### Colores:

* Fondo:#DAE8FC (gris claro azulado).
    HEX: DAE8FC
    RGB: (218, 232, 252)
* Borde:
    HEX: #6C8EBF (gris oscuro azulado).
    RGB:  (108,142,191)
* Color relleno engranaje: #FFFFFF
    HEX:#FFFFFF

**Condiciones:**
- Este comando de tipo sistema es un contenedor rectangular con esquinas redondeadas.
- Este comando de tipo sistema  es un contenedor vacio sin iconos
- Este comando de tipo sistema representa una actividad de sistema que no implica interaccion de usuario ni uso de APIS o servicios, es usado para representar conexiones a Bases de datos
- El texto que se incluye en el comando de tipo sistema debe iniciar siempre en Mayúscula
- Este comando de tipo sistema debe tener 2 lineas que pueden comunicarse con otro comando o proceso, estas lineas interlineadas deben ser 2 e ir en ambos sentidos
- Este comando de tipo Sistema siempre debe ir en color azul su valor hexadecimal debe ser #DAE8FC.
- Los colores utilizados en el comando de tipo Sistema deben corresponder completamente a una de las paletas definidas en la sección **Colores**.

### 5. **Subproceso:**
#### Colores:

* Fondo:#DAE8FC (gris claro azulado).
    HEX: DAE8FC
    RGB: (218, 232, 252)
* Borde:
    HEX: #6C8EBF (gris oscuro azulado).
    RGB:  (108,142,191)
* Color relleno engranaje: #FFFFFF
    HEX:#FFFFFF

**Condiciones:**
- Este comando de tipo subproceso es un contenedor rectangular con esquinas redondeadas.
- Este comando de tipo subproceso  es un contenedor con un icono con un símbolo "+" dentro de un cuadrado, típico de BPMN que Se encuentra en la parte inferior-central del artefacto
- Este comando de tipo subproceso encapsula un subconjunto de actividades que se realizan para cumplir un objetivo dentro de un proceso mas grande
- Los colores utilizados en el comando de tipo subproceso deben corresponder completamente a una de las paletas definidas en la sección **Colores**.
- El texto que se incluye en el comando de tipo subproceso debe iniciar siempre en Mayúscula
- Este comando de tipo subproceso debe tener 2 lineas que pueden comunicarse con otro comando o proceso, estas lineas interineadas deben ser 2 e ir en ambos sentidos


---

## Compuertas

**Origen:** `compuertas.md`

# REGLAS BLUEPRINT API

## Compuertas

Las compuertas o puertas de enlace son puntos de decisión que pueden ajustar la ruta de un flujo según ciertas condiciones.

- Los tipos de compuertas son:
    1. Exclusiva
    2. Paralela
    3. Basada en Eventos
    4. Paralela Basada en Eventos

### 1. **Compuerta exclusiva:**
**Condiciones**:
- Debe ir con una pregunta que permita una respuesta binaria de SI o NO.
- Debe estar ubicada:
    - Dentro del contenedor de servicio gestionado en el contenedor padre de integración
    - Dentro del contenedor de servicio no gestionado en el contenedor padre de dominio productor. 
- Debe ir acompañada de tres (3) lineas contínuas en sus extremos. Cada una de las lineas debe enlazar con alguno de estos artefactos:
    - El inicio del proceso modelado.
    - Un comando de usuario, sistema, consulta, sistema automatizado. Ver documento `comandos.md`.
    - Otra compuerta paralela o exclusiva.
    - Una compuerta basada en eventos.
    - Un evento de tipo excepción de negocio, un evento de tipo señal, un evento de tipo mensaje. Ver documento `eventos.md`.
    - O la finalización del proceso.
- Ninguna de las lineas contínuas debe estar unida con una compuerta paralela basada en eventos. 
- Las lineas continuas que acompañan la compuerta deben tener asociadas las palabras SI o NO, dependiendo de la pregunta realizada. Debe ser coherente.
- Si la compuerta exclusiva está asociada al inicio del proceso modelado en uno de sus extremos y en el otro tiene asociado un comando de tipo sistema cuya secuencia conduce al fin del proceso, la tercer línea contínua que conecta la compuerta con el flujo del proceso y no con una finalización inmediata deberá tener asociado el texto "ASYNC".
### 2. **Compuerta Paralela:**
**Condiciones**:
- La compuerta puede tener asociado un comentario que permita dividir el proceso que se está modelando en dos o más caminos diferentes.
- Debe estar ubicada:
    - Dentro del contenedor de servicio gestionado en el contenedor padre de integración
    - Dentro del contenedor de servicio no gestionado en el contenedor padre de dominio productor. 
- Debe ir acompañada de al menos tres (3) lineas continuas en sus extremos. Cada una de las lineas debe enlazar con alguno de estos artefactos:
    - El inicio del proceso modelado.
    - Un comando de usuario, sistema, consulta, sistema automatizado. Ver documento `comandos.md`.
    - Una compuerta exclusiva, compuerta basada en eventos    - 
    - Un un evento de tipo excepción de negocio, evento de tipo señal, un evento de tipo mensaje. Ver documento `eventos.md`.
    - O la finalización del proceso.
- Ninguna de las lineas contínuas debe estar unida a una compuerta paralela o una compuerta paralela basada en eventos.
ponerla


### 3. **Compuerta Basada en Eventos:**
**Condiciones:**
- Puede tener asociado un comentario
- Debe estar ubicada:
    - Dentro del contenedor de servicio gestionado en el contenedor padre de integración.
    - Dentro del contenedor de servicio no gestionado en el contenedor padre de dominio productor. 
- Este tipo de compuerta exclusiva debe ir acompañada de una línea continua y 
- Debe ir acompañada de mínimo dos (2) lineas continuas o más en sus extremos. Cada una de las lineas debe enlazar con alguno de estos artefactos:
    - El inicio del proceso modelado.
    - Un comando de usuario, sistema, consulta, sistema automatizado. Ver documento `comandos.md`.
    - Un un evento de tipo excepción de negocio, un evento de tipo señal, un evento de tipo mensaje. Ver documento `eventos.md`.
    - Una compuerta paralela.
    - O la finalización del proceso.
- Ninguna de las lineas contínuas debe estar unida con una compuerta paralela basada en eventos u otra compuerta basada en eventos.    
- Si la compuerta en dos de sus extremos conecta con un evento de tipo señal envío y evento de tipo señal recepción, se debe garantizar que la compuerta lleve un texto asociado con el nombre "Resultado" y adicional en las demás lineas contínuas que la acompañan esten bajo el nombre Exitoso y Fallido.


### 4. **Compuerta Paralela Basada en Eventos :**
**Condiciones:**
- Puede tener asociado un comentario
- Debe estar ubicada:
    - Dentro del contenedor de servicio gestionado en el contenedor padre de integración.
    - Dentro del contenedor de servicio no gestionado en el contenedor padre de dominio productor. 
- Debe ir acompañada de tres (3) lineas continuas en sus extremos. Cada una de las lineas debe enlazar con alguno de estos artefactos:
    - El inicio del proceso modelado.
    - Un comando de usuario, sistema, consulta, sistema automatizado. Ver documento `comandos.md`.
    - Un compuerta exclusiva
    - Un un evento de tipo señal, un evento de tipo mensaje. Ver documento `eventos.md`.
    - O la finalización del proceso.
- Ninguna de las lineas contínuas debe estar unida con una compuerta paralela, compuerta paralela basada en eventos u otra compuerta basada en eventos.


---

## Eventos y señales

**Origen:** `eventos.md`

# REGLAS BLUEPRINT API

## Eventos

### Descripción general
- Un evento es un suceso significativo que ocurre en un sistema en un momento específico y que merece ser capturado y procesado.
- Los tipos de eventos son: 
    1. Simples
    2. Señal
    3. Mensaje
- Los eventos simples pueden ser de dominio o excepción.
- Los eventos de señal y mensaje pueden ser de recepción o envío.

### 1. **Evento tipo simple de dominio**
**Colores**

Borde:
- HEX: #bd7000
- RGB: 189,112,0

Relleno:
Gradiente radial compuesto por:
- #ffcd6a
- #ffad0b
- #d08b00

**Condiciones**:
- Reflejan un cambio de estado relevante en el sistema o funcionalidad modelada.
- Tiene forma circular
- Tiene borde simple
- No debe contener íconos internos.
- Debe utilizar los colores definidos en la sección **Colores**.
- Debe estar conectado mediante una línea contínua en sus extremos.
- La conexión de un extremo debe provenir de una compuerta exclusiva, paralela, un comando de tipo sistema automatizado, un comando de tipo sistema.
- La conexión del otro extremo debe estar unida a otro componente o artefacto del blueprint.
- Debe representar una operación completada exitosamente sobre una entidad o activo del dominio.
- El texto asociado al evento debe construirse utilizando la siguiente estructura: "Entidad o Activo" + "Verbo en pasado".
- Ejemplos válidos: Cliente creado, Cuenta creada, Cuenta eliminada, Cliente modificado, Inversión actualizada, Crédito actualizado.
- Ejemplos no válidos: Crear cliente, Crear cuenta, Eliminar cuenta, Actualización de crédito.
- Debe estar ubicado exlusivamente dentro de un contenedor hijo correspondiente al servicio gestionado o no gestionado que se este modelando (Ver documento `contenedores.md`).

### 2. **Evento tipo simple de excepción**
**Colores**

Borde:
- HEX: #bf0808
- RGB: 191,8,8

Relleno:
Gradiente radial compuesto por:
- #ff8f8f
- #e81313
- #bf0808

Icono interno:
- Rayo de color rojo.
- HEX: #bf0808
- RGB: 191,8,8

**Condiciones**:
- Refleja que el sistema ha generado un fallo o una condición inesperada que impide continuar normalmente la ejecución del proceso.
- Tiene forma circular.
- Tiene borde simple de color rojo.
- Contiene un icono interno de rayo.
- Debe utilizar los colores definidos en la sección **Colores**.
- Debe estar conectado mediante una línea continua en uno de sus extremos (vertical u horizontal) a un componente o artefacto.
- La conexión principal puede provenir de un comando de tipo sistema que representa un SPR (Ver documento `componentesIntegracion.md`.) o de compuerta exclusiva (Ver documento `compuertas.md`.) cuya evaluación a la pregunta asociada resulte en una condición de fallo, error o incumplimiento de una validación requerida para continuar el proceso.
- En el extremo opuesto a la conexión principal, debe estar asociado obligatoriamente a un modelo de mensaje de excepción. Sus colores, formas y textos válidos se encuentran en el documento `modelosLectura.md`.
- Debe estar ubicado exlusivamente dentro de un contenedor hijo correspondiente al servicio gestionado o no gestionado que se este modelando (Ver documento `contenedores.md`).



### 3. **Evento tipo señal de recepción**
**Colores**

Borde:
- HEX: #bd7000
- RGB: 189,112,0

Relleno:
Gradiente radial compuesto por:
- #ffcd6a
- #ffad0b
- #d08b00

Icono interno:
- Triángulo color blanco.
- HEX: #ffffff
- RGB: 255,255,255

**Condiciones:**
- Refleja que el sistema está esperando recibir algo para continuar con el proceso.
- Se utiliza para modelar recepción de eventos exclusivamente. Estos pueden ser de tipo query, command o event.
- Tiene forma circular.
- Tiene borde simple color dorado.
- Contiene un triángulo interno color blanco.
- Debe utilizar los colores definidos en la sección **Colores**.
- Debe estar conectado mediante una línea continua vertical superior y una línea continua vertical inferior.
- Adicionalmente debe existir una línea discontinua conectada por uno de sus laterales.
- En la línea discontinua, el triángulo sin relleno debe apuntar hacia el evento tipo señal recepción.
- El círculo sin relleno debe apuntar hacia el componente utilizado para modelar eventos tipo query, event o command que genera la señal.
- La conexión superior debe provenir de una compuerta basada en eventos o paralela basada en eventos.
- La conexión inferior debe estar unida a otro componente o artefacto del blueprint.
- El componente debe tener un texto asociado.
- El texto asociado al evento debe describir el resultado recibido por el proceso.
- El texto asociado al evento debe construirse utilizando la siguiente estructura: Activo que tuvo el cambio de estado + verbo en pasado.
- Cuando la señal corresponda a la respuesta de un query o command, el texto debe representar el resultado recibido por el proceso. Ejemplos válidos: Historial crediticio consultado, Cupo actualizado, Cliente creado, Tarjeta cancelada.
- Cuando la señal corresponda a una suscripción de un evento, el texto debe corresponder al nombre del evento recibido. Ejemplos válidos: Cliente creado, Tarjeta cancelada.
- Ejemplos no válidos: Consultar historial crediticio, Actualizar cupo, Crear cliente.
- Debe estar ubicado exlusivamente dentro de un contenedor hijo correspondiente al servicio gestionado o no gestionado que se este modelando (Ver documento `contenedores.md`).


### 4. **Evento tipo señal de envío**
**Colores**

Borde:
- HEX: #bd7000
- RGB: 189,112,0

Relleno:
Gradiente radial compuesto por:
- #ffcd6a
- #ffad0b
- #d08b00

Icono interno:
- Triángulo color negro.
- HEX: #000000
- RGB: 0,0,0

**Condiciones:**
- Refleja que el sistema envía una señal o un cambio de estado para que sea tomado por otro sistema.
- Se utiliza para modelar el envío de señales asociadas a eventos de tipo query, command o event.
- Tiene forma circular.
- Tiene borde simple color dorado.
- Contiene un triángulo interno color negro.
- Debe utilizar los colores definidos en la sección **Colores**.
- Debe estar conectado mediante una línea continua vertical superior y una línea continua vertical inferior.
- Adicionalmente debe existir una línea discontinua conectada por uno de sus laterales.
- En la línea discontinua, el triángulo sin relleno debe apuntar hacia el componente utilizado para modelar eventos tipo query, command o event.
- El círculo sin relleno debe apuntar hacia el evento tipo señal envío.
- La conexión superior debe provenir de cualquier componente o artefacto del blueprint.
- La conexión inferior debe estar unida a otro componente o artefacto del blueprint cuando el componente al que se encuentra relacionado la linea discontinua corresponda al modelamiento de un evento de tipo event o command.
- Si el componente al que se encuentra relacionado la linea discontinua corresponde al modelamiento de un evento de tipo query, la conexión inferior debe estar unida a una compuesta basada en eventos.
- El componente debe tener un texto asociado.
- El texto debe describir la señal o evento enviado por el proceso.
- Cuando el componente al que se encuentra relacionado la linea discontinua corresponda al modelamiento de un evento de tipo query o command, el texto asociado al evento debe construirse utilizando la siguiente estructura: verbo en infinitivo + activo sobre el cual se realizará la acción. Ejemplos válidos: Consultar historia crediticio, Actualizar cupo, Crear cliente.
- Cuando el componente al que se encuentra relacionado la linea discontinua corresponda al modelamiento de un evento de tipo event, el texto asociado al evento debe construirse utilizando la siguiente estructura: Activo que tuvo el cambio de estado + verbo en pasado. Ejemplos válidos: Cupo actualizado, Cliente creado, Tarjeta cancelada.
- Debe estar ubicado exlusivamente dentro de un contenedor hijo correspondiente al servicio gestionado o no gestionado que se este modelando (Ver documento `contenedores.md`).

### 5. **Evento tipo mensaje de recepción**
**Colores**

Borde del evento:
- HEX: #bd7000
- RGB: 189,112,0

Relleno del evento:
Gradiente radial compuesto por:
- #ffcd6a
- #ffad0b
- #d08b00

Icono interno (sobre):

Borde:
- HEX: #bd7000
- RGB: 189,112,0

Relleno:
- HEX: #ffffff
- RGB: 255,255,255

**Condiciones:**
- Refleja que el sistema está esperando recibir algo para continuar con el proceso.
- Se utiliza para modelar recepción de mensajes asíncronos diferentes a eventos como callbacks.
- No debe utilizarse para modelar eventos de negocio publicados o suscritos.
- Tiene forma circular.
- Tiene borde simple color dorado.
- Contiene un sobre interno color blanco.
- Debe utilizar los colores definidos en la sección **Colores**.
- Debe estar conectado mediante una línea continua vertical superior y una línea continua vertical inferior.
- Adicionalmente debe existir una línea discontinua conectada por uno de sus laterales.
- En la línea discontinua, el triángulo sin relleno debe apuntar hacia el componente de integración desde donde se va a leer el mensaje, como por ejemplo un gestor de colas.
- El círculo sin relleno del otro extremo de la linea discontinua, debe apuntar hacia el evento de tipo mensaje de recepción.
- La conexión superior debe provenir de una compuerta basada en eventos o paralela basada en eventos.
- La conexión inferior debe estar unida a otro componente o artefacto del blueprint.
- El componente debe tener un texto asociado.
- El texto asociado al mensaje debe describir el mensaje recibido por el proceso como resultado de una solicitud previamente enviada o de una notificación asíncrona.
- El texto asociado al mensaje debe construirse utilizando la siguiente estructura: Activo que tuvo el cambio de estado + verbo en pasado.
- Ejemplos válidos: Callback recibido, Llaves registradas consultadas
- Ejemplos no válidos: Consultar llaves registradas, Consultar QR.
- Debe estar ubicado exlusivamente dentro de un contenedor hijo correspondiente al servicio gestionado o no gestionado que se este modelando (Ver documento `contenedores.md`).


### 6. **Evento tipo mensaje de envio**
**Colores**

Borde del evento:
- HEX: #bd7000
- RGB: 189,112,0

Relleno del evento:
Gradiente radial compuesto por:
- #ffcd6a
- #ffad0b
- #d08b00

Icono interno (sobre):

Borde:
- HEX: #bd7000
- RGB: 189,112,0

Líneas internas del sobre:
- HEX: #ffffff
- RGB: 255,255,255

**Condiciones:**
- Refleja que el sistema envía un mensaje y sigue su curso tras la entrega.
- Se utiliza para modelar envío de mensajes asíncronos diferentes a eventos.
- No debe utilizarse para modelar eventos de negocio publicados o suscritos.
- Tiene forma circular.
- Tiene borde simple color dorado.
- Contiene un sobre interno color negro.
- Debe utilizar los colores definidos en la sección **Colores**.
- Debe estar conectado mediante una línea continua vertical superior y una línea continua vertical inferior.
- Adicionalmente debe existir una línea discontinua conectada por uno de sus laterales.
- En la línea discontinua, el triángulo sin relleno debe apuntar hacia el componente de integración donde se va a escribir o enviar el mensaje, como por ejemplo un gestor de colas.
- El círculo sin relleno del otro extremo de la linea discontinua, debe apuntar hacia el evento de tipo mensaje de envío.
- La conexión superior debe estar unida a otro componente o artefacto del blueprint.
- La conexión inferior debe estar unida a otro componente o artefacto del blueprint.
- El componente debe tener un texto asociado.
- El texto asociado al mensaje debe describir el mensaje a enviar por el proceso.
- El texto asociado al mensaje debe construirse utilizando la siguiente estructura: Verbo en initivo + Activo afectado
- Ejemplos válidos: Consultar saldo, Consultar llaves.
- Debe estar ubicado exlusivamente dentro de un contenedor hijo correspondiente al servicio gestionado o no gestionado que se este modelando (Ver documento `contenedores.md`).


---

## Modelos, políticas y excepciones

**Origen:** `modelosLectura.md`

# REGLAS BLUEPRINT API

## Modelos

### Descripción general
- Cada tipo de modelo se representa con un color específico para facilitar la identificación visual durante el diseño, en línea con el marco de trabajo DDD.
- Los tipos de modelo son: 
    1. Modelo datos de entrada
    2. Modelo datos de Salida
    3. Política
    4. Excepción
    5. Concepto
    6. Pendiente

### 1. **Modelo datos de entrada:**
**Colores**

Borde:
- HEX: #82b366
- RGB: 130, 179, 102

Relleno:
- HEX: #d5e8d4
- RGB: 213, 232, 212

Texto:
- HEX: #000000
- RGB: 0, 0, 0

**Condiciones**:
- Tiene forma rectangular.
- Tiene esquinas rectas.
- Tiene borde verde de línea continua de acuerdo a lo definido en la sección **Colores**.
- Tiene relleno verde claro de acuerdo a lo definido en la sección **Colores**.
- No contiene divisiones internas.
- No contiene íconos internos.
- No contiene ninguna linea contínua o discontinúa que lo una a un componente o artefacto.
- El texto debe estar ubicado dentro del rectángulo.
- El texto puede distribuirse en dos o más líneas.
- El componente puede cambiar de tamaño, pero debe conservar su forma rectangular, sus colores y el borde continuo.
- Este modelo debe estar junto a un componende de servicio, API o Evento con o sin respuesta.
- Este modelo debe estar ubicado exlusivamente dentro de un contenedor padre de INTEGRACIÓN, DOMINIO PRODUCTOR o SISTEMAS EXTERNOS (Ver documento `contenedores.md`)

### 2. **Modelo datos de salida:**
**Colores**

Borde:
- HEX: #82b366
- RGB: 130, 179, 102

Relleno:
- HEX: #d5e8d4
- RGB: 213, 232, 212

Texto:
- HEX: #000000
- RGB: 0, 0, 0

**Condiciones**:
- Tiene forma rectangular.
- Tiene esquinas rectas.
- Tiene borde verde de línea discontinua de acuerdo a lo definido en la sección **Colores**.
- Tiene relleno verde claro de acuerdo a lo definido en la sección **Colores**.
- No contiene divisiones internas.
- No contiene íconos internos.
- No contiene ninguna linea contínua o discontinúa que lo una a un componente o artefacto.
- El texto debe estar ubicado dentro del rectángulo.
- El texto puede distribuirse en dos o más líneas.
- El componente puede cambiar de tamaño, pero debe conservar su forma rectangular, sus colores y el borde continuo.
- Este modelo debe estar junto a un componende de servicio, API o Evento con respuesta.
- No debe estar presente en el componente de Evento sin respuesta.
- Este modelo debe estar ubicado exlusivamente dentro de un contenedor padre de INTEGRACIÓN, DOMINIO PRODUCTOR o SISTEMAS EXTERNOS (Ver documento `contenedores.md`)

### 3. **Política:**

**Colores**

Borde:
- HEX: #9673a6
- RGB: 150, 115, 166

Relleno:
- HEX: #e1d5e7
- RGB: 225, 213, 231

Texto:
- HEX: #000000
- RGB: 0, 0, 0

**Condiciones**:
- Tiene forma rectangular.
- Tiene esquinas rectas.
- Tiene borde morado de línea continua de acuerdo a lo definido en la sección **Colores**.
- Tiene relleno morado claro de acuerdo a lo definido en la sección **Colores**.
- No contiene divisiones internas.
- No contiene íconos internos.
- No contiene ninguna linea contínua o discontinúa que lo una a un componente o artefacto.
- El texto debe estar ubicado dentro del rectángulo.
- Debe estar acompañado de un comando de sistema automatizado 
- Debe estar acompañado de un comando de usuario 
- Debe estar acompañado de un comando de consulta 
- Ddebe estar acompañado de un comando de sistema 
- Debe estar acompañado de un comando de un subproceso  
- Puede ir al lado de las compuertas exclusivas pero no es obligatorio.
- Puede ir al lado de las compuertas paralelas pero no es obligatorio.
- Puede ir al lado de las compuertas basada en eventos pero no es obligatorio.
- Puede ir al lado de las compuertas paralela basada en eventos pero no es obligatorio.
- Cuando la politica se ubica al lado de una compuerta exclusiva, el texto incluido en ella debe tener sentido con la pregunta asociada a la compuerta.
- Este modelo debe estar ubicado exlusivamente dentro de un contenedor hijo correspondiente al servicio gestionado o no gestionado que se este modelando (Ver documento `contenedores.md`).


### 4. **Mensaje de Excepción:**
**Colores**

Borde:
- HEX: #9673a6
- RGB: 150, 115, 166

Relleno:
- HEX: #e1d5e7
- RGB: 225, 213, 231

Texto:
- HEX: #000000
- RGB: 0, 0, 0

**Condiciones**:
- Tiene forma rectangular.
- Tiene esquinas rectas.
- Tiene borde morado de línea discontinua de acuerdo a lo definido en la sección **Colores**.
- Tiene relleno morado claro de acuerdo a lo definido en la sección **Colores**.
- No contiene divisiones internas.
- No contiene íconos internos.
- No contiene ninguna linea contínua o discontinúa que lo una a un componente o artefacto.
- El texto debe estar ubicado dentro del rectángulo.
- El texto puede distribuirse en varias líneas.
- Este modelo tipo excepción de negocio debe ir al lado de un evento tipo simple de excepción (Ver documento `eventos.md`)
- El texto definido debe describir de forma explícita la excepción o condición de error ocurrida.
- El texto no debe corresponder a nombres genéricos como: "Excepción de Negocio", "Error", "Fallo" o "Excepción".
- El texto de la excepción debe ser específico respecto a la causa que originó la interrupción del proceso.
- Este modelo debe estar ubicado exlusivamente dentro de un contenedor hijo correspondiente al servicio gestionado o no gestionado que se este modelando (Ver documento `contenedores.md`).


### 5. **Pendientes :**
**Colores**

Borde:
- HEX: #a40b39
- RGB: 164, 11, 57

Relleno:
- HEX: #a40b39
- RGB: 164, 11, 57

Texto:
- HEX: #ffffff
- RGB: 255, 255, 255

**Condiciones**:
- Tiene forma rectangular.
- Tiene esquinas rectas.
- Tiene borde de línea continua.
- El borde y el relleno utilizan el mismo color rojo oscuro de acuerdo a lo definido en la sección **Colores**.
- No contiene divisiones internas.
- No contiene íconos internos.
- El texto debe estar ubicado dentro del rectángulo.
- Este modelo tipo pendiente se puede ubicar en cualquier parte del blueprint.

### 6. **Concepto:**
**Colores**

Borde:
- HEX: #d6b656
- RGB: 214, 182, 86

Relleno:
- HEX: #fff2cc
- RGB: 255, 242, 204

Texto:
- HEX: #000000
- RGB: 0, 0, 0

**Condiciones**:
- Tiene forma rectangular.
- Tiene esquinas rectas.
- Tiene borde amarillo oscuro o dorado de línea continua de acuerdo a lo definido en la sección **Colores**.
- Tiene relleno amarillo claro de acuerdo a lo definido en la sección **Colores**.
- No contiene divisiones internas.
- No contiene íconos internos.
- El texto debe estar ubicado dentro del rectángulo.
- Este modelo se puede ubicar en cualquier parte del blueprint.
- El texto debe contener la palabra que se quiere definir y su respectivo significado. Ejemplo: QR P2P Código QR generado y utilizado para la transferencia de persona a persona.


---

## Símbolos y conexiones

**Origen:** `simbolos.md`

# REGLAS BLUEPRINT API

## Simbolos

Se utilizan para representar el inicio, fin, conectar elementos y agregar comentarios en el flujo del proceso.

### 1. **Inicio :**
**Colores**

Borde
- HEX: #000000
- RGB: 0, 0, 0

Relleno:
Gradiente lineal compuesto por:
- #FFFFFF
- #FFF2CC

**Condiciones**:
- Representa el punto donde inicia el proceso modelado. 
- Tiene forma circular
- Tiene borde simple color negro.
- No debe contener íconos internos.
- Debe utilizar los colores definidos en la sección **Colores**.
- Debe estar asociado en sus extremos a dos (2) lineas continuas obligatoriamente. Una de las lineas debe estar asociada con el componente api (Ver documento `componenteApiBase.md`) o con el componente servicio (Ver documento `componenteServicioBase.md`)
- Su ubicación en el blueprint depende del escenario de integración que se esté modelando:
    1. API gestionada con servicio no gestionado
    2. API gestionada con servicio gestionado
    3. Servicio no gestionado

#### Escenario de integración 1: API gestionada con servicio no gestionado
- El símbolo de inicio debe estar dentro del contenedor azul correspondiente al servicio no gestionado dentro del contenedor padre DOMINIO PRODUCTOR. Ver documento `contenedores.md`.
- Debe estar asociado en sus extremos a dos (2) lineas continuas obligatoriamente:
    - Una de las lineas debe estar asociada con el componente api (Ver documento `componenteApiBase.md`).
    - La otra linea del extremo debe estar enlazada con alguno de estos artefactos:
        - Un comando de usuario, sistema, consulta, sistema automatizado. Ver documento `artefactos.md`.
        - Una compuerta exclusiva o paralela.
        - Una compuerta basada en eventos o paralela basada en eventos.
        - Un un evento de tipo señal, un evento de tipo mensaje. Ver documento `eventos.md`.
- Ninguna de las lineas contínuas debe estar unida con otro simbolo de inicio o de fin inmediatamente.

#### Escenario de integración 2: API gestionada con servicio gestionado
- El símbolo de inicio debe estar dentro del contenedor azul correspondiente al servicio gestionado dentro del contenedor padre INTEGRACIÓN. Ver documento `contenedores.md`.
- Debe estar asociado en sus extremos a dos (2) lineas continuas obligatoriamente:
    - Una de las lineas debe estar asociada con el componente api (Ver documento `componenteApiBase.md`).
    - La otra linea del extremo debe estar enlazada con alguno de estos artefactos:
        - Un comando de usuario, sistema, consulta, sistema automatizado. Ver documento `artefactos.md`.
        - Una compuerta exclusiva o paralela.
        - Una compuerta basada en eventos o paralela basada en eventos.
        - Un un evento de tipo señal, un evento de tipo mensaje. Ver documento `eventos.md`.
- Ninguna de las lineas contínuas debe estar unida con otro simbolo de inicio o de fin inmediatamente.

#### Escenario de integración 3: Servicio no gestionado
- El símbolo de inicio debe estar dentro del contenedor azul correspondiente al servicio no gestionado dentro del contenedor padre DOMINIO PRODUCTOR. Ver documento `contenedores.md`.
- Debe estar asociado en sus extremos a dos (2) lineas continuas obligatoriamente:
    - Una de las lineas debe estar asociada con el componente servicio (Ver documento `componenteServicioBase.md`).
    - La otra linea del extremo debe estar enlazada con alguno de estos artefactos:
        - Un comando de usuario, sistema, consulta, sistema automatizado. Ver documento `artefactos.md`.
        - Una compuerta exclusiva o paralela.
        - Una compuerta basada en eventos o paralela basada en eventos.
        - Un un evento de tipo señal, un evento de tipo mensaje. Ver documento `eventos.md`.
- Ninguna de las lineas contínuas debe estar unida con otro simbolo de inicio o de fin inmediatamente.


### 2. **Fin :**
**Colores**

Borde:
- HEX: #000000
- RGB: 0, 0, 0

Relleno: 
Gradiente lineal compuesto por:
- HEX: #ffffff
- RGB: 255, 255, 255
- HEX: #fff2cc
- RGB: 255, 242, 204

**Condiciones**:
- Representa el punto donde finaliza el proceso modelado. 
- Tiene forma circular
- Tiene borde negro de línea continua.
- El borde tiene un grosor aproximado de 5.33 unidades SVG.
- El borde es visualmente más grueso que el utilizado en otros componentes circulares.
- No debe contener íconos internos.
- Debe utilizar los colores definidos en la sección **Colores**.
- Debe tener asociado el texto FIN.
- Debe tener asociado al menos una (1) linea contínua que provenga de alguno de los siguientes artefactos:
    - Un comando de usuario o sistema.
    - Una compuerta exclusiva o paralela.
    - Un un evento de tipo señal, un evento de tipo mensaje. Ver documento `eventos.md`.   
 - Ninguna de las lineas contínuas debe estar unida con un simbolo de inicio, de fin, un comando de sistema automatizado, un comando de consulta, una compuerta basada en eventos o paralela basada en eventos.
- Su ubicación en el blueprint depende del escenario de integración que se esté modelando:
    1. API gestionada con servicio no gestionado
    2. API gestionada con servicio gestionado
    3. Servicio no gestionado

#### Escenario de integración 1: API gestionada con servicio no gestionado
- El símbolo de fin debe estar dentro del contenedor azul correspondiente al servicio no gestionado dentro del contenedor padre DOMINIO PRODUCTOR. Ver documento `contenedores.md`.

#### Escenario de integración 2: API gestionada con servicio gestionado
- El símbolo de fin debe estar dentro del contenedor azul correspondiente al servicio gestionado dentro del contenedor padre INTEGRACIÓN. Ver documento `contenedores.md`.

#### Escenario de integración 3: Servicio no gestionado
- El símbolo de fin debe estar dentro del contenedor azul correspondiente al servicio no gestionado dentro del contenedor padre DOMINIO PRODUCTOR. Ver documento `contenedores.md`.

### 3. **Lineas discontínuas:**
**Condiciones**:
- Está conformada por una línea recta discontinua.
- Tiene un círculo sin relleno en uno de sus extremos.
- Tiene un triángulo sin relleno en el extremo opuesto.
- El círculo y el triángulo deben estar unidos mediante la línea discontinua.
- El triángulo determina la dirección de la conexión y debe apuntar hacia el componente de destino.
- El círculo identifica el extremo opuesto de la conexión.
- La línea, el borde del círculo y el borde del triángulo deben ser de color negro.
- El círculo y el triángulo deben conservar el relleno blanco.
- No debe contener una punta de flecha sólida o completamente rellena.
- La línea puede presentarse de forma horizontal, vertical o con cambios de dirección, según la ubicación de los componentes relacionados.
- Independientemente de su orientación, debe conservar:
    - El círculo sin relleno en un extremo.
    - El triángulo sin relleno en el extremo opuesto.
    - El patrón de línea discontinua.
- Debe estar siempre ubicada dentro del contenedor azul correspondiente al servicio no gestionado dentro del contenedor padre DOMINIO PRODUCTOR o al servicio gestionado dentro del contenedor padre INTEGRACIÓN. Ver documento `contenedores.md`.
- Debe conectar exclusivamente componentes de tipo APIs, Servicios, Eventos con o sin respuesta, Gestores de colas, Comandos de sistema automatizado o Comandos de consulta.
- La conexión con los anteriores componentes y/o comandos debe darse de la siguiente manera:

    #### Una única linea discontínua
    - Para conectar un evento de tipo mensaje envío o recepción (Ver documento `eventos.md`) hacia un gestor de colas (Ver documento `componentesIntegracion.md`).

    #### Dos lineas discontínuas
.
    - Para conectar un comando de sistema automatizado (Ver documento `artefactos.md`) hacia una API privada, pública o partner (Ver documento `componenteApiBase.md` en la sección conexiones).
    - Para conectar un comando de consulta (Ver documento `artefactos.md`) hacia una API privada, pública o partner (Ver documento `componenteApiBase.md` en la sección conexiones)
    - Para conectar un comando de consulta (Ver documento `artefactos.md`) hacia un servicio no gestionado (Ver documento `componenteServicioBase.md` en la sección conexiones).
    - Para conectar un evento de tipo señal envío o recepción (Ver documento `eventos.md`) hacia un componente de evento con o sin respuesta (Ver documento `componenteEventoBase.md` en la sección conexiones).
    - Para conectar un comando de sistema automatizado o de consulta (Ver documento `artefactos.md`) hacia un gestor de colas (Ver documento `componentesIntegracion.md`).
    - Para conectar dos gestores de colas (Ver documento `componentesIntegracion.md`).


### 4. **Anotación :**
**Condiciones**:
- Este tipo de símbolo debe tener un comentario y/o observación y puede estar en cualquier parte del flujo.
- Puede estar ubicado en cualquiera de los contenedores del blueprint para dar claridad a algo relacionado. Ver documento `contenedores.md`
- Debe estar conectado

### 5. **Linea contínua:**
**Condiciones**:
- Está conformada por una línea continua.
- Tiene una punta de flecha sólida en uno de sus extremos.
- No contiene un círculo en el extremo de origen.
- La punta de flecha determina la dirección de la conexión y debe apuntar hacia el componente de destino.
- El extremo contrario a la punta de flecha corresponde al componente de origen.
- La línea debe conectar exactamente dos componentes o artefactos del blueprint.
- Ambos extremos deben quedar visualmente unidos a los componentes relacionados.
- No debe presentar extremos libres o sin un componente asociado.
- La línea y la punta de flecha deben conservar el mismo color.
- Puede presentarse de forma horizontal, vertical o con cambios de dirección.
- Puede apuntar hacia arriba, abajo, izquierda o derecha, según la ubicación del componente de destino.
- Independientemente de su orientación, debe conservar:
    - El trazo continuo.
    - La punta de flecha sólida.
    - La conexión entre un componente de origen y un componente de destino.
- Debe conectar los siguientes artefactos:
    - Un simbolo de inicio con un comando de usuario, sistema, consulta, sistema automatizado (Ver documento `artefactos.md`).
    - Un comando de usuario o sistema con un simbolo de fin.
    - Una compuerta paralela o exclusiva con un simbolo de fin.
    - Una compuerta exclusiva con un evento de tipo excepción de negocio, evento de tipo señal envío o recepción, evento de tipo mensaje de envío o recepción.
    - Una compuerta paralela o exclusiva con con un comando de usuario, sistema, consulta, sistema automatizado (Ver documento `artefactos.md`).
    - Un evento de tipo señal de envío o recepción con una compuerta basada en eventos o paralela basada en eventos.
    - Una compuerta basada en eventos y paralela basada en eventos con una señal de envío o recepción.
    - Un comando de usuario o de sistema con otros comandos.

---

## Trazabilidad y control de conflictos

El documento `reglasBasicas.md` fue tratado como **compendio duplicado** de los 17 capítulos especializados. Se incorporaron sus criterios E1/E2/E3 y aclaraciones aprobadas una sola vez en D-01 a D-05, y la especificación detallada se conserva en los capítulos de origen. No se duplica el compendio íntegro para evitar dobles requisitos idénticos en las matrices.

### Aspectos que deben resolverse por arquitectura cuando corresponda

1. **Capas del hijo E2:** confirmar el alcance preciso por modelo arquitectónico; no declarar obligatorio un tipo específico de capa si el modelo validado no lo exige.
2. **Comandos denominados «Validar»:** hay usos donde el verbo se superpone con categorías Consulta y Sistema Automatizado. Si no se pueden distinguir icono/color y función, no seleccionar categoría por verbo exclusivamente.
3. **Nombres genéricos de plantilla:** un valor como `NOMBRE SERVICIO` debe informarse como incumplimiento cuando se demuestra que es el nombre literal del hijo principal, no sustituirse por el nombre de otra figura.
4. **Reglas de tres secciones:** solo aplican a figuras de servicios adicionales invocados, no a los hijos BPMN principales; la excepción queda resuelta mediante D-01.
5. **Figuras e iconos:** las formas, colores, divisiones, señales y conectores se describen textualmente en sus capítulos. Su comprobación real exige que el formato de evidencia permita asociarlos a cada objeto.

**Gobernanza:** modificaciones durante una conversación son simulaciones locales; solamente la versión publicada y aprobada por responsables de arquitectura cambia la línea base de la organización.
