# REGLAS BLUEPRINT API

## Compuertas

Las compuertas o puertas de enlace son puntos de decisión que pueden ajustar la ruta de un flujo según ciertas condiciones.

- Los tipos de compuertas son:
    1. Exclusiva
    2. Paralela
    3. Basada en Eventos
    4. Paralela Basada en Eventos

### 1. **Compuerta exclusiva:**
![IMAGEN](Imagenes\CompuertaExclusiva.png) 

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
![IMAGEN](Imagenes\EjemploCompuertaExclusiva.png)

### 2. **Compuerta Paralela:**
![IMAGEN](Imagenes\CompuertaParalela.png) 

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
![IMAGEN](Imagenes\EjemploCompuertaParalela.png) ponerla


### 3. **Compuerta Basada en Eventos:**
![IMAGEN](Imagenes/CompuertaBasadaenEventos.png)

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
![IMAGEN](Imagenes\CompuertaParalelaBasadaenEventos.png)

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