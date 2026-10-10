# REGLAS BLUEPRINT API

## Contenedores y Carriles

### Descripción general
![IMAGEN](Imagenes\Contenedores.png)
- Todos los contenedores deben encapsular componentes o partes del flujo.
- Existen dos tipos de contenedores:
    1. Padres o principales
    2. Hijos o secundarios

#### Contenedor Padre
IMAGEN

**Colores**

Borde:
- HEX: #000000
- RGB: 0, 0, 0

Relleno:
- HEX: #f2f3f5
- RGB: 242, 243, 245

Texto:
- HEX: #000000
- RGB: 0, 0, 0

**Condiciones**
- Tiene forma rectangular.
- Tiene esquinas redondeadas.
- Tiene borde negro de línea continua.
- Tiene relleno gris claro.
- No contiene divisiones internas obligatorias.
- Debe conservar una orientación vertical.
- Debe estar nombrado como INTEGRACIÓN, DOMINIO PRODUCTOR o SISTEMAS EXTERNOS.
- Los títulos deben ir en mayusculas.
- El contenedor de INTEGRACIÓN puede tener asociado un contenedor hijo pero no es obligatorio, dependiendo del escenario de integración (Ver sección "Contenedores y escenarios de integración").
- El contenedor INTEGRACION debe estar ubicado siempre al lado izquierdo como primer contenedor. Sin embargo puede repetirse y estar ubicado adicionalmente al lado derecho del contenedor DOMINIO PRODUCTOR.
- El contenedor DOMINIO PRODUCTOR debe estar al lado derecho del contenedor INTEGRACIÓN y no puede repetirse.
- El contenedor DOMINIO PRODUCTOR siempre debe tener asociado un contenedor hijo.
- El contenedor SISTEMAS EXTERNOS no puede tener asociado un contenedor hijo y no puede repetirse.
- Los Únicos componentes que pueden estar directamente en el contenedor padre de INTEGRACION, DOMINIO PRODUCTO o SISTEMAS EXTERNOS son: APIs, Servicios, Eventos, Gestores de colas, modelos tipo concepto o modelos tipo definición.

#### Contenedor Hijo

**Colores**

Borde:
- HEX: #000000
- RGB: 0, 0, 0

Relleno:
- HEX: #edf5ff
- RGB: 237, 245, 255

Texto:
- HEX: #000000
- RGB: 0, 0, 0

**Condiciones**
- Tiene forma rectangular.
- Tiene esquinas redondeadas.
- Tiene borde negro de línea continua.
- Tiene relleno azul muy claro.
- No contiene divisiones internas obligatorias.
- Debe estar ubicado completamente dentro del contenedor padre.
- Debe estar nombrado con el nombre del servicio gestionado o no gestionado según aplique.
- Debe estar siempre contenido dentro del contenedor padre de INTEGRACION o DOMINIO PRODUCTOR.
- No puede contener componentes como APIs, Servicios, Eventos o Gestores de colas.


### Contenedores y escenarios de integración
- La cantidad de contenedores que debe tener el blueprint depende exclusivamente del escenario de integración que se quiera modelar:
    1. API directo al backend
    2. API con servicio de integración
    3. Servicio no gestionado
-
#### Escenario de integración 1: API directo al backend
![IMAGEN](Imagenes\EscenarioIntegracion1.png)
- Debe visualizarse al menos el contenedor padre INTEGRACION y DOMINIO PRODUCTOR.
- El contenedor padre INTEGRACION no debe tener un contenedor hijo asociado.
- El contenedor padre DOMINIO PRODUCTOR debe a su vez tener el contenedor hijo con el nombre del servicio no gestionado que se está modelando.
- El nombre del contenedor DOMINIO PRODUCTOR puede conservarse o reemplazarse por el nombre del equipo productor del backend.
-
#### Escenario de integración 2: API con servicio de integración
![IMAGEN](Imagenes\EscenarioIntegracion2.png)
- Debe visualizarse al menos el contenedor padre INTEGRACION y DOMINIO PRODUCTOR.
- El contenedor padre INTEGRACION debe a su vez tener el contenedor hijo con el nombre del servicio gestionado que se está modelando.
- El contenedor hijo del servicio no gestionado debe tener las capas de despliegue (Ver documento XXXXXXX).
- El contenedor padre DOMINIO PRODUCTOR no debe tener un contenedor hijo asociado.

#### Escenario de integración 3: Servicio no gestionado
![IMAGEN](Imagenes\EscenarioIntegracion3.png)
- Debe visualizarse al menos el contenedor padre DOMINIO PRODUCTOR.
- El contenedor padre DOMINIO PRODUCTOR debe a su vez tener el contenedor hijo con el nombre del servicio no gestionado que se está modelando.
- El nombre del contenedor DOMINIO PRODUCTOR puede conservarse o reemplazarse por el nombre del equipo productor del backend.

### Otros contenedores

#### 1. **Sistema Externo:**
![IMAGEN](Imagenes\SistemaExterno.png)
![IMAGEN](Imagenes\EjemploSistemaExterno.png) 

**Colores**

Relleno:
- HEX: #ffcce6
- RGB: 255, 204, 230
- Opacidad: 80 %

Borde:
- HEX: #c40062
- RGB: 196, 0, 98

**Condiciones**:
- Se usa para encapsular componentes APIs, servicios o eventos que no son propios del dominio que se está modelando.
- Tiene forma rectangular.
- Tiene esquinas redondeadas.
- Tiene borde de línea discontinua.
- El borde utiliza segmentos largos separados por espacios.
- El borde tiene color magenta oscuro.
- El relleno es rosado claro y semitransparente.
- No contiene divisiones internas.
- No contiene íconos internos.
- Debe conservar una orientación horizontal.
- Debe ubicarse en el contenedor de INTEGRACIÓN y/o SISTEMAS EXTERNOS.
- Las conexiones hacia las APIs, servicios o eventos deben ser con lineas discontinuas.
- Debe tener un texto asociado que permita identificar el sistema externo. Este texto debe ser diferente a las palabras "Sistema Externo".