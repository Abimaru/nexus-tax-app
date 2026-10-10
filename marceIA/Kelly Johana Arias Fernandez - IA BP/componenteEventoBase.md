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