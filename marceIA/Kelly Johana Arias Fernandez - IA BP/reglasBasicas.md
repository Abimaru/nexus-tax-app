# REGLAS BLUEPRINT API

## Escenarios de Integración

### Descripción general

- Lo primero que se debe validar es el escenario de integración del blueprint que se quiere modelar. La cantidad de contenedores que debe tener el blueprint depende exclusivamente del escenario de integración que se quiera modelar. Los escenarios de integración son:
    1. API directo al backend
    2. API con servicio de integración
    3. Servicio no gestionado
-
#### Escenario de integración 1: API directo al backend
- Debe visualizarse al menos el contenedor padre INTEGRACION y DOMINIO PRODUCTOR.
- Puede existir otro contenedor padre INTEGRACION ubicado al lado derecho del DOMINIO PRODUCTOR,pero es opcional.
- Puede existir un contenedor padre SISTEMAS EXTERNOS ubicado como último contenedor al lado derecho, pero es opcional.
- El contenedor padre INTEGRACION no debe tener un contenedor hijo asociado.
- El contenedor padre INTEGRACION debe tener por lo menos un componente API que:
    - Permanezca dentro de ese contenedor
    - Las capas de despliegue son obligatorias (Flujo transaccional y capa de arquitectura).
    - Tenga una linea continua que la conecte con un simbolo de inicio ubicado en el contenedor hijo del DOMINIO PRODUCTOR.
- El contenedor padre DOMINIO PRODUCTOR debe tener un contenedor hijo que representa el servicio no gestionado que se está modelando. 
- El nombre del contenedor hijo del contenedor DOMINIO PRODUCTOR, debe reemplazarse por el nombre del servicio no gestionado que se está modelando. 
- El nombre del contenedor DOMINIO PRODUCTOR puede conservarse o reemplazarse por el nombre del equipo productor del backend.
- Las capas de despliegue del contenedor hijo del contenedor DOMINIO PRODUCTOR son opcionales.

#### Escenario de integración 2: API con servicio de integración
- Debe visualizarse al menos el contenedor padre INTEGRACION y DOMINIO PRODUCTOR.
- Puede existir otro contenedor padre INTEGRACION ubicado al lado derecho del DOMINIO PRODUCTOR,pero es opcional.
- Puede existir un contenedor padre SISTEMAS EXTERNOS ubicado como último contenedor al lado derecho, pero es opcional.
- El contenedor padre INTEGRACION debe tener un contenedor hijo que representa el servicio gestionado que se está modelando.
- El contenedor padre INTEGRACION tener un componente API que:
    - Permanezca dentro de este contenedor.
    - Las capas de despliegue son obligatorias (Flujo transaccional y capa de arquitectura).
    - Debe estar ubicada por fuera del contenedor hijo.
    - Debe estar ubicada al lado izquierdo del contenedor hijo.
    - Tenga una linea contínua que la conecte con un simbolo de inicio ubicado en el contenedor hijo del mismo contenedor.
- El nombre del contenedor hijo del contenedor INTEGRACIÓN debe reemplazarse por el nombre del servicio gestionado que se está modelando. 
- El contenedor hijo del servicio gestionado puede tener las capas de despliegue (Flujo transaccional y capa de arquitectura), pero es opcional.
- El contenedor padre DOMINIO PRODUCTOR no debe tener un contenedor hijo asociado.


#### Escenario de integración 3: Servicio no gestionado
- Debe visualizarse al menos el contenedor padre DOMINIO PRODUCTOR.
- Puede existir otro contenedor padre INTEGRACION ubicado al lado derecho del DOMINIO PRODUCTOR,pero es opcional.
- Puede existir un contenedor padre SISTEMAS EXTERNOS ubicado como último contenedor al lado derecho, pero es opcional.
- El contenedor padre DOMINIO PRODUCTOR debe tener un contenedor hijo que representa el servicio no gestionado que se está modelando. 
- El nombre del contenedor hijo del contenedor DOMINIO PRODUCTOR, debe reemplazarse por el nombre del servicio no gestionado que se está modelando. 
- El nombre del contenedor DOMINIO PRODUCTOR puede conservarse o reemplazarse por el nombre del equipo productor del backend.
- El contenedor padre DOMINIO PRODUCTOR debe tener un componente de servicio que:
    - Permanezca dentro de este contenedor.
    - Debe estar ubicado por fuera del contenedor hijo.
    - Debe estar ubicado al lado izquierdo del contenedor hijo.
    - Tenga una linea contínua que lo conecte con un simbolo de inicio ubicado en el contenedor hijo del mismo contenedor.
    - Las capas de despliegue son opcionales (Flujo transaccional y capa de arquitectura).


## Contenedores y Carriles

### Descripción general
- Todos los contenedores deben encapsular componentes o partes del flujo.
- Existen dos tipos de contenedores:
    1. Padres o principales
    2. Hijos o secundarios

#### Contenedor Padre

##### Colores #####

Borde:
- HEX: #000000
- RGB: 0, 0, 0

Relleno:
- HEX: #f2f3f5
- RGB: 242, 243, 245

Texto:
- HEX: #000000
- RGB: 0, 0, 0

##### Condiciones #####
- Tiene forma rectangular.
- Tiene esquinas redondeadas.
- Tiene borde negro de línea continua.
- Tiene relleno gris claro.
- No contiene divisiones internas obligatorias.
- Debe conservar una orientación vertical.
- Debe estar nombrado como INTEGRACIÓN, DOMINIO PRODUCTOR o SISTEMAS EXTERNOS.
- El contenedor DOMINIO PRODUCTOR puede tener otro nombre correspondiente al equipo productor que contenga la logica de negocio.
- Los títulos deben ir en mayusculas.
- El contenedor INTEGRACION debe estar ubicado siempre al lado izquierdo como primer contenedor para los escenarios 1 y 2. En Caso de aplicar el escenario 3, se deben seguir las reglas alli definidas.
- El contenedor INTEGRACION puede repetirse y estar ubicado adicionalmente al lado derecho del contenedor DOMINIO PRODUCTOR.
- El contenedor DOMINIO PRODUCTOR debe estar al lado derecho del contenedor INTEGRACIÓN para los escenarios 1 y 2.En Caso de aplicar el escenario 3, se deben seguir las reglas alli definidas. Este contenedor no puede repetirse.
- El contenedor SISTEMAS EXTERNOS no puede tener asociado un contenedor hijo y no puede repetirse.
- Los Únicos componentes que pueden estar directamente en el contenedor padre de INTEGRACION, DOMINIO PRODUCTO o SISTEMAS EXTERNOS son: APIs, Servicios, Eventos, Gestores de colas, modelos tipo concepto o modelos tipo definición.

#### Contenedor Hijo

##### Colores #####

Borde:
- HEX: #000000
- RGB: 0, 0, 0

Relleno:
- HEX: #edf5ff
- RGB: 237, 245, 255

Texto:
- HEX: #000000
- RGB: 0, 0, 0

##### Condiciones #####
- Tiene forma rectangular.
- Tiene esquinas redondeadas.
- Tiene borde negro de línea continua.
- Tiene relleno azul muy claro.
- No contiene divisiones internas obligatorias.
- Debe estar ubicado completamente dentro del contenedor padre.
- Debe estar nombrado con el nombre del servicio gestionado o no gestionado según aplique.
- Debe estar siempre contenido dentro del contenedor padre de INTEGRACION o DOMINIO PRODUCTOR.
- No puede contener componentes como APIs, Servicios, Eventos o Gestores de colas.

## Componente API

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
- Las capas de despliegue corresponden a la indicada en la sección Capas Despliegue.
- Cuando la API no esté modelada bajo el modelo MCI, las capas de despliegue no serán obligatorias y su ausencia no deberá reportarse como incumplimiento.

### Ubicación dentro del blueprint

- La API debe estar ubicada obligatoriamente dentro del contenedor padre denominado `"INTEGRACIÓN"`.
- Debe seguir las reglas indicadas en el escenario de integración que corresponda.

## Componente SERVICIO

### Descripción general

- Representa un servicio asociado a la API que se está modelando.
- El componente está conformado por:
    - Un Servicio
    - Un Modelo de Datos de Entrada.
    - Un Modelo de Datos de Salida.
    - Las capas de despliegue (flujo transaccional y capa de arquitectura), cuando aplique.
    - Dos conexiones de línea discontinua.

### Servicio

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

### Ubicación dentro del blueprint

- El servicio debe estar ubicada obligatoriamente dentro del contenedor padre denominado `"DOMINIO PRODUCTOR"`.
- Debe seguir las reglas indicadas en el escenario de integración que corresponda.