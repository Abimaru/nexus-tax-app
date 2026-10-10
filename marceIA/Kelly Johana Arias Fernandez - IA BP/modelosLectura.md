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
![IMAGEN](Imagenes\ModeloEntrada.png)
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
![IMAGEN](Imagenes\ModeloSalida.png) 
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
![IMAGEN](Imagenes\Politica.png) 

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
![IMAGEN](Imagenes\ExcepciondeNegocio(MensajedeExcepción).png) 
![IMAGEN](Imagenes\EjemploExcepciondeNegocio(MensajedeExcepción).png)
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
![IMAGEN](Imagenes\Pendientes.png) 

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
![IMAGEN](Imagenes\Concepto.png) 

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