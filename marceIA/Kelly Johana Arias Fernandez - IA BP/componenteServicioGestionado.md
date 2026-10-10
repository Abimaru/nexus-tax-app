## REGLAS BLUEPRINT API

### Servicio no gestionado

#### Especificación base

Este componente hereda todas las condiciones definidas en el documento `componenteServicioBase.md`, excepto aquellas reemplazadas explícitamente en el presente documento.

Deben aplicarse sin modificación las reglas base relacionadas con:

- Colores permitidos para la API.
- Forma y estructura del componente.
- Identificación y versión del servicio.
- Nombre de la operación.
- Formato camelCase.
- Modelo de servicio.
- Modelo de Datos de Entrada.
- Modelo de Datos de Salida.
- Ubicación general de los elementos.
- Esquemas de conexión.
- Líneas discontinuas.

#### Descripción general

- Representa un servicio asociado a la API que se está modelando.
- El componente está conformado por:
    - Un servicio.
    - Un Modelo de Datos de Entrada.
    - Un Modelo de Datos de Salida.
    - Una conexión de línea discontinua o dos conexiones de línea discontinua, según el escenario de modelamiento.

#### Capas de despliegue aplicables

- Cuando la API privada esté modelada bajo el modelo MCI, debe estar enmarcada por las siguientes capas de despliegue: Flujo transaccional y Capa de arquitectura.
- Cuando el servicio no esté modelado bajo MCI, debe estar enmarcada por la capa correspondiente al modelo federado.
- La ausencia de cualquiera de estas capas (MCI o federado) debe reportarse como incumplimiento.
- Las condiciones visuales, textuales y estructurales de estas capas se heredan del estándar correspondiente y no se redefinen en este documento.


### Ubicación dentro del blueprint

- Debe estar ubicado obligatoriamente en el contenedor de INTEGRACION.
- Bajo ningún motivo debe estar asociado al contenedor de DOMINIO PRODUCTOR.

#### Condiciones heredadas

Todas las demás condiciones definidas en `componenteServicioBase.md` deben cumplirse sin modificación.