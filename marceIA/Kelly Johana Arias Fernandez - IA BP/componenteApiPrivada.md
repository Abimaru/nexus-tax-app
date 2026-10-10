## REGLAS BLUEPRINT API

### API Privada

#### Especificación base

Este componente hereda todas las condiciones definidas en el documento `componenteApiBase.md`, excepto aquellas reemplazadas explícitamente en el presente documento.

Deben aplicarse sin modificación las reglas base relacionadas con:

- Colores permitidos para la API.
- Forma y estructura del componente.
- Identificación y versión de la API.
- Nombre de la operación.
- Formato camelCase.
- Modelo de servicio.
- Identificador circular verde.
- Modelo de Datos de Entrada.
- Modelo de Datos de Salida.
- Ubicación general de los elementos.
- Esquemas de conexión.
- Líneas continuas y discontinuas.

#### Descripción general

- Representa una API privada cuya responsabilidad funcional pertenece al mismo dominio en el que se encuentra modelada.
- El componente está conformado por:
    - Una API.
    - Un identificador circular verde.
    - Un Modelo de Datos de Entrada.
    - Un Modelo de Datos de Salida.
    - Las capas de despliegue (flujo transaccional y capa de arquitectura), cuando aplique.
    - Una conexión de línea continua o dos conexiones de línea discontinua, según el escenario de modelamiento.

#### Tercera sección: tipo y modelo de servicio

- Debe contener el tipo de la API y su modelo de servicio.
- El texto debe cumplir con la siguiente estructura: `"Tipo - Modelo de servicio"`
- El tipo debe ser `private`.
- El modelo de servicio debe corresponder a uno de los siguientes valores: `entidad`, `utilidad` o `tarea`.
- El tipo y el modelo de servicio deben escribirse completamente en minúsculas.
- Ejemplos válidos: `private - entidad`, `private - utilidad`, `private - tarea`.
- Ejemplos no válidos: `public - entidad`, `Private - utilidad`, `PARTNER - tarea`.

#### Capas de despliegue aplicables

![IMAGEN](Imagenes\APIPrivadaDominioPropio.png)
- Cuando la API privada esté modelada bajo el modelo MCI, debe estar enmarcada por las siguientes capas de despliegue: Flujo transaccional y Capa de arquitectura.
- La ausencia de cualquiera de estas capas debe reportarse como incumplimiento.
- Las condiciones visuales, textuales y estructurales de estas capas se heredan del estándar correspondiente y no se redefinen en este documento.

##### Flujo transaccional

- El texto debe cumplir con la siguiente estructura: `"Flujo Transaccional - <tipo>"`
- `<tipo>` debe corresponder a uno de los valores permitidos en el estándar: `monetario`, `no-monetario`, `operativo` o `transversal`.
- El tipo debe estar en minúscula.
- Ejemplos válidos: `Flujo Transaccional - monetario`, `Flujo Transaccional - no-monetario`, `Flujo Transaccional - operativo`, `Flujo Transaccional - transversal`.

##### Capa de arquitectura

- El texto debe cumplir con la siguiente estructura: `"Capa de Arquitectura - <tipo>"`
- `<tipo>` debe corresponder a uno de los valores permitidos en el estándar de capas de arquitectura.
- El valor utilizado debe coincidir exactamente con uno de los valores definidos en dicho estándar.

#### Condiciones heredadas

Todas las demás condiciones definidas en `APIBase.md` deben cumplirse sin modificación.