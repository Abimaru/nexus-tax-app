# REGLAS BLUEPRINT API

## SERVICIO

![IMAGEN](Imagenes\APIBase.png)

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
![IMAGEN](Imagenes\APIPrivadaDominioPropio.png)
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