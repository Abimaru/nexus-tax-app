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

![IMAGEN](Imagenes\EventoConRespuesta.png)

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
![IMAGEN](Imagenes\EventoConRespuestaEnvio.png)
- El triángulo sin relleno debe apuntar hacia el componente de evento tipo query o command descrito en este documento.
- El círculo sin relleno debe conectarse con el evento de tipo señal envio indicado en el documento `eventos.md`.

#### Linea discontinua 2: Recepción de respuesta al evento
![IMAGEN](Imagenes\EventoConRespuestaRecepcion.png)
- El círculo sin relleno debe apuntar hacia el componente de evento tipo query o command descrito en este documento.
- El triangulo sin relleno conectarse con el evento de tipo señal recepción indicado en el documento `eventos.md`.