## REGLAS BLUEPRINT API

### API Pública o partner

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

- Representa una API expuesta para ser consumida por clientes externos o socios.
- El componente está conformado por:
  - Una API.
  - Un identificador circular verde.
  - Un Modelo de Datos de Entrada.
  - Un Modelo de Datos de Salida.
  - Una capa de arquitectura.
  - Una conexión de línea continua o dos conexiones de línea discontinua, según el escenario de modelamiento.

#### Tercera sección: tipo y modelo de servicio

- Debe contener el tipo de la API y su modelo de servicio.
- El texto debe cumplir con la siguiente estructura: `"Tipo - Modelo de servicio"`
- El tipo debe corresponder a uno de los siguientes valores:`public` o `partner`.
- El modelo de servicio debe corresponder a uno de los siguientes valores: `entidad`, `utilidad` o `tarea`.
- El tipo y el modelo de servicio deben escribirse completamente en minúsculas.
- Ejemplos válidos: `public - entidad`, `public - utilidad`, `public - tarea`, `partner - entidad`, `partner - utilidad`, `partner - tarea`.
- Ejemplos no válidos: `private - entidad`, `Public - utilidad`, `PARTNER - tarea`, `public entidad`, `partner - servicio`.

#### Capas de despliegue aplicables

![IMAGEN](Imagenes\APIExternaMCI.png)
- Cuando la API pública o partner esté modelada bajo el modelo MCI, debe estar enmarcada únicamente por una capa de arquitectura.
- El flujo transaccional no aplica para APIs de tipo `public` o `partner`.
- La ausencia de flujo transaccional no debe reportarse como incumplimiento.
- Si se identifica un flujo transaccional asociado a una API de tipo `public` o `partner`, debe reportarse como incumplimiento.
- Las condiciones visuales, textuales y estructurales de la capa de arquitectura se heredan del estándar correspondiente y no se redefinen en este documento.

#### Diferencias respecto a la API privada

Las siguientes reglas reemplazan las condiciones equivalentes de la API privada:

1. El tipo `private` no es válido para una API pública.
2. El tipo debe ser `public` o `partner`.
3. La API pública requiere únicamente una capa de arquitectura.
4. La API pública no requiere flujo transaccional.

Todas las demás condiciones definidas en `APIBase.md` deben cumplirse sin modificación.