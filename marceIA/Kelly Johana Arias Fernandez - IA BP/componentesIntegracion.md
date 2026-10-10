# REGLAS BLUEPRINT API

## Componentes de Integración


### 1. **Gestor de Colas - Queue Manager (MQ):**
![IMAGEN](Imagenes\GestordeColas-QueueManager(MQ).png)

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
    ![IMAGEN](Imagenes\ComandoGestorColas.png)
    - El gestor de colas puede enlazarse con un **comando de sistema automatizado** (Ver documento `componenteServicioBase.md`) a través de dos lineas discontínuas donde:
        - La primera linea debe ir desde el componente de servicio usando el circulo sin relleno hacia el gestor de colas usando el triangulo sin relleno.
        - La segunda linea debe ir al contrario, es decir, desde gestor de colas usando el circulo sin relleno hacia el componente de servicio usando el triangulo sin relleno.

    #### Evento tipo mensaje de recepción 
    ![IMAGEN](Imagenes\EventoMensajeGestorColas.png)      
    - El gestor de colas puede enlazarse con un **evento tipo mensaje de recepción** a través de una linea discontínua desde el evento tipo mensaje usando el circulo sin relleno hacia el gestor de colas usando el triangulo sin relleno.

    #### Evento tipo mensaje de envío     
    - El gestor de colas puede enlazarse  con un evento tipo mensaje de envío (Ver documento `eventos.md`) a través de una linea discontínua desde el evento tipo mensaje usando el circulo sin relleno hacia el gestor de colas usando el triangulo sin relleno.

    #### Gestor de colas del backend
    ![IMAGEN](Imagenes\GestorColasAGestorColas.png)    
    - El gestor de colas puede enlazarse con otro **gestor de colas** ubicado en el backend a través de dos lineas discontínuas donde:
        - La primera linea debe ir desde el gestor de colas origen usando el circulo sin relleno hacia el gestor de colas del backend usando el triangulo sin relleno.
        - La segunda linea debe ir al contrario, es decir, desde gestor de colas del backend usando el circulo sin relleno hacia el gestor de colas origen usando el triangulo sin relleno.
    - El gestor de colas del backend debe estar ubicado exclusivamente en el contenedor padre de DOMINIO PRODUCTOR.
    - El gestor de colas del backend no está obligado a tener las capas de despliegue asociadas.
    - El gestor de colas del backend debe estar enlazado a un servicio no gestionado

    #### Servicio no gestionado
    ![IMAGEN](Imagenes\GestorColasServicioNoGestionado.png)  
    - El gestor de colas puede enlazarse con un servicio no gestionado con dos lineas discontínuas:
        - La primera linea debe ir desde el gestor de colas usando el circulo sin relleno hacia el servicio no gestionado usando el triangulo sin relleno.
        - La segunda linea debe ir al contrario, es decir, desde el servicio no gestionado usando el circulo sin relleno hacia el gestor de colas usando el triangulo sin relleno.
    - El servicio no gestionado debe tener alrededor un contenedor sin relleno y de borde negro con puntas redondeadas con el nombre de la cola.


### 2. **Parametrizador de Equivalencias (PEQ):**
![IMAGEN](Imagenes\Equivalencias.png) 
**Condiciones**:
- Debe representarse como un comando de tipo sistema (Ver documento `comandos.md`) bajo el nombre de "Homologar Datos".
- Debe ir acompañado obligatoriamente de un modelo de datos de entrada (Ver documento `modelosLectura.md`)
- Debe estar ubicado obligatoriamente en el contenedor hijo del servicio de integración asociado al contenedor padre de INTEGRACIÓN (Ver documento `contenedores.md`)


### 3. **Parametrizador de Códigos de Respuesta (SPR) :**
![IMAGEN](Imagenes\SPR.png)
**Condiciones**:
- Debe representarse como un comando de tipo sistema (Ver documento `comandos.md`) bajo el nombre de "Homologar Excepciones".
- El comando de tipo sistema debe estar enlazado en uno de sus extremos al resultado fallido de la compuerta exclusiva con una linea contínua, y el otro extremo debe estar enlazada a un evento tipo simple de excepción (Ver documento `eventos.md`.)
- Debe estar ubicado obligatoriamente en el contenedor hijo del servicio de integración asociado al contenedor padre de INTEGRACIÓN (Ver documento `contenedores.md`)  


### 4. **Transformación de Mensajería :**
![IMAGEN](Imagenes\TransformacióndeMensajería.png) 

**Condiciones**:
- Se representa en las flechas de consumo indicando el formato de mensaje de origen y el de destino 
- Deben estar separados por una barra diagonal (por ejemplo: JSON/XML) 
- Se puede complementar con una observación adicional para detallar aspectos relevantes de la conversión  



