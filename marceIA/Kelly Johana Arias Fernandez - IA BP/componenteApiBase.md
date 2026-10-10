# REGLAS BLUEPRINT API

## API

![IMAGEN](Imagenes\APIBase.png)

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

    ![IMAGEN](Imagenes\APIPrivadaSinServInt.png)

- Si dentro del contenedor `"INTEGRACIÓN"` existe un contenedor azul que representa el servicio de integración:

    - La API debe permanecer dentro del contenedor `"INTEGRACIÓN"`.
    - La API debe estar ubicada por fuera del contenedor azul.
    - La API debe estar ubicada al lado izquierdo del contenedor azul.
    ![IMAGEN](Imagenes\APIPrivadaConServInt.png)

### Conexiones

- La API puede tener uno de los siguientes esquemas de conexión:
    1. Una línea continua.
    2. Dos líneas discontinuas.

- Los dos esquemas son excluyentes.
- La API no debe estar sin conexiones.
- Si no tiene una línea continua, debe tener obligatoriamente las dos líneas discontinuas.

#### Escenario 1: conexión mediante línea continua
![IMAGEN](Imagenes\APIPrivadaSinServInt.png)
![IMAGEN](Imagenes\APIPrivadaConServInt.png)
- La línea continua debe estar ubicada en el lado derecho de la API.
- La flecha final de la línea continua debe conectarse con el símbolo de inicio asociado a la API.

#### Escenario 2: conexión mediante dos líneas discontinuas
![IMAGEN](Imagenes\APIPrivadaConsumida.png)
- Deben existir exactamente dos líneas discontinuas asociadas a la API.
- En la primera línea discontinua, el triángulo sin relleno debe apuntar hacia la API.
- En la segunda línea discontinua, el círculo sin relleno debe apuntar hacia la API.
- Los extremos opuestos de ambas líneas discontinuas deben conectarse con un comando de tipo consulta o con un comando de tipo sistema automatizado.