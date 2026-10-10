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

![IMAGEN](Imagenes\EventoSinRespuesta.png)

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
![IMAGEN](Imagenes\EventoSinRespuestaEnvio.png)
- Aplica solo cuando el evento de tipo señal es envío y el componente de evento es de tipo event o command exclusivamente.
- La linea discontinua debe conectar el evento de tipo señal con el componente de evento aqui descrito.
- El círculo sin relleno de la linea discontinua debe conectarse con el evento de tipo seña envio indicado en el documento `eventos.md`
- El triángulo sin relleno debe apuntar hacia el componente de evento tipo event o command descrito en este documento.


#### Escenario 2: Suscripción o recepción de evento
![IMAGEN](Imagenes\EventoSinRespuestaRecepcion.png)
- Aplica solo cuando el evento de tipo señal es recepción y el componente de evento es de tipo event o command exclusivamente.
- La linea discontinua debe conectar el evento de tipo señal con el componente de evento aqui descrito.
- El círculo sin relleno de la linea discontinua debe apuntar hacia el componente de evento tipo event o command descrito en este documento.
- El triángulo sin relleno debe apuntar hacia el evento de tipo señal envio indicado en el documento `eventos.md`