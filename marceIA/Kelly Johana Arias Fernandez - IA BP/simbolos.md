# REGLAS BLUEPRINT API

## Simbolos

Se utilizan para representar el inicio, fin, conectar elementos y agregar comentarios en el flujo del proceso.

### 1. **Inicio :**
![IMAGEN](Imagenes\Inicio.png)

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
![IMAGEN](Imagenes\EjemploInicio2.png) 
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
![IMAGEN](Imagenes\EjemploInicio.png)
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
![IMAGEN](Imagenes\EjemploInicioNoGestionado.png)
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
![IMAGEN](Imagenes\Fin.png) 

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
![IMAGEN](Imagenes\Flujomensaje.png)

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
    ![IMAGEN](Imagenes\InteracciónAPI.png) 
    ![IMAGEN](Imagenes\EjemploFlujoMensaje.png).
    - Para conectar un comando de sistema automatizado (Ver documento `artefactos.md`) hacia una API privada, pública o partner (Ver documento `componenteApiBase.md` en la sección conexiones).
    - Para conectar un comando de consulta (Ver documento `artefactos.md`) hacia una API privada, pública o partner (Ver documento `componenteApiBase.md` en la sección conexiones)
    - Para conectar un comando de consulta (Ver documento `artefactos.md`) hacia un servicio no gestionado (Ver documento `componenteServicioBase.md` en la sección conexiones).
    - Para conectar un evento de tipo señal envío o recepción (Ver documento `eventos.md`) hacia un componente de evento con o sin respuesta (Ver documento `componenteEventoBase.md` en la sección conexiones).
    - Para conectar un comando de sistema automatizado o de consulta (Ver documento `artefactos.md`) hacia un gestor de colas (Ver documento `componentesIntegracion.md`).
    - Para conectar dos gestores de colas (Ver documento `componentesIntegracion.md`).


### 4. **Anotación :**
![IMAGEN](Imagenes\Anotación.png)
![IMAGEN](Imagenes\Anotaciónenchufe.png) 
**Condiciones**:
- Este tipo de símbolo debe tener un comentario y/o observación y puede estar en cualquier parte del flujo.
- Puede estar ubicado en cualquiera de los contenedores del blueprint para dar claridad a algo relacionado. Ver documento `contenedores.md`
- Debe estar conectado

### 5. **Linea contínua:**
![IMAGEN](Imagenes\Herencia.png) 

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