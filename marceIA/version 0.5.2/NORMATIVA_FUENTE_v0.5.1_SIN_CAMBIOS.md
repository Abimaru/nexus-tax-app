# NORMATIVA UNIFICADA — EVALUADOR DE BLUEPRINTS

**Versión del paquete:** v0.5.1 (prueba simultánea de JSON + evidencia visual + estándar integrado).  
**Alcance:** Reúne íntegramente los 17 Markdown normativos consolidados con correcciones aprobadas integradas; no sustituye reglas por resúmenes.  
**Uso:** Este archivo es la fuente NORMATIVA de la evaluación; el catálogo visual forma parte del mismo PDF integrado después del texto normativo; sus figuras son evidencia ilustrativa, no agregan reglas.

## PROTOCOLO DE EVALUACIÓN SIMULTÁNEA — ANEXO METODOLÓGICO v0.5.1

**Naturaleza:** procedimiento de lectura, NO es una norma arquitectónica nueva. Las reglas técnicas de los 17 documentos conservan su autoridad.

### A. Tres archivos en el primer mensaje
1. Recibir conjuntamente **JSON original de Lucidchart**, **blueprint visual de la misma operación** (PNG, PDF o SVG renombrado TXT) y **ESTÁNDAR INTEGRADO (este PDF)**, que contiene reglas e imágenes.
2. Verificar recepción y legibilidad real de cada archivo. No afirmar lectura de iconos, colores o páginas sin evidencia.
3. **Antes de auditar**, preguntar o confirmar explícitamente cinco datos al analista: escenario E1/E2/E3; objeto API privada/pública/partner o servicio; presencia de eventos de comportamiento; comunicación síncrona/asíncrona/mixta; modelo MCI/federado. Mostrar sugerencias pero esperar confirmación. Si contexto ya fue confirmado en este mismo chat, no insistir.
4. El JSON puede contener varias páginas y operaciones: **delimitar por página y operación que corresponde al archivo visual**. Excluir leyenda NOTACIÓN, bibliotecas de símbolos, BDD y páginas no solicitadas.

### B. Dos análisis independientes y conciliación
5. Construir **Inventario J (JSON)**: elementos semánticos, textos, ID, clases, página, relaciones explícitas, sin asumir atributos gráficos no presentes.
6. Construir **Inventario V (imagen/PDF/TXT)**: forma, posición, jerarquía, color aparente, icono, borde, conector y textos visibles. No copiar conclusiones del JSON como si fueran hallazgos visuales.
7. Conciliar ambos: confirmado por dos evidencias, solo JSON, solo visual, discrepante, no observable. En discrepancias materiales, no resolver por votación ni por repetición del modelo.
8. **No emitir dictamen ni porcentajes antes de confirmar contexto y completar ambos inventarios**. Si alguno no es legible, indicar limitación y emitir exclusivamente resultado provisional delimitado.

### C. Clasificación estricta
- E2 únicamente si se demuestra un **servicio gestionado dentro de INTEGRACIÓN** distinto de la API y de las capas MCI. Identificar texto o ID y conexión correspondiente.
- E1: API en INTEGRACIÓN conecta al backend/servicio no gestionado en dominio productor. E3: servicio no gestionado sin API obligatoria. No transformar una capa MCI en un servicio.
- `NEPA - NUEVAS EXPERIENCIAS DE PAGO` puede ser el nombre del DOMINIO PRODUCTOR; `NOMBRE SERVICIO` es un contenedor hijo diferente.
- `Capa de Arquitectura - composicion` es literal normativo permitido; tolerar diferencia de tildes únicamente en comparación semántica, conservar evidencia textual literal.

### D. Detección visual disciplinada
- **Describir antes de clasificar**: por símbolo registrar relleno, contorno, geometría, iconografía, texto, posición y conectividad. El color aproximado de píxeles no es el valor HEX certificado.
- Cuando el color o icono sea discriminante entre tipos parecidos y no sea legible, registrar tipo candidato y «No Verificable» en la propiedad visual; nunca declarar coincidencia cromática exacta por percepción.
- Un verbo no basta para clasificar comando. Ejemplos de `Validar` en tipos diferentes requieren analizar reglas particulares, representación cromática e iconografía; registrar conflictos normativos.
- Los elementos de la leyenda NOTACIÓN **no son instancias operativas**. Lo mismo aplica a otros ejemplos y contenido BDD fuera de la operación actual.
- Para las excepciones: verificar por separado **evento rojo**, **mensaje de excepción**, **rama de compuerta**, sentido de conector y asociación válida.
- Flechas: documentar origen, destino, punta, trazo y evidencia; la proximidad de figuras no confirma asociación.
- Políticas: basta al menos **uno** de los cinco tipos de comando definidos (sistema automatizado, usuario, consulta, sistema o subproceso); no los cinco y no exigir una conexión directa prohibida.

### E. Informe y trazabilidad
- Presentar primero inventarios J y V, tabla de conciliación, y después las siete secciones del informe normativo.
- Toda afirmación «No Cumple» debe precisar requisito y sección fuente, objeto, evidencia, diferencia y corrección. No afirmar falta de artefactos implementados sin exigencia normativa y evidencia externa.
- Estados: Cumple, No Cumple, Parcialmente Cumple, No Verificable, No Aplica. Conflictos: «No Verificable por conflicto normativo» con las dos fuentes.
- Cumplimiento verificable = (C + 0.5×P)/(C+NC+P) ×100; Cobertura = (C+NC+P)/(C+NC+P+NV) ×100. No Aplica excluido. Mostrar conteos/denominadores. 0.5 es metodología provisional.
- Las reglas técnicas no se reescriben mediante pedidos de usuarios. Excepciones de sesión se reportan como simulaciones separadas.

---

## Orden de interpretación
1. Regla particular del componente y escenario, cuando incluya una excepción explícita.
2. Regla general heredada.
3. Ante conflicto no resuelto, **No Verificable por conflicto normativo**; citar las partes enfrentadas.

Los archivos originales, los nombres de imágenes y las referencias internas se conservan para trazabilidad. Las referencias de imágenes han sido reemplazadas por identificadores de figura y páginas físicas del catálogo visual PDF. Una imagen ilustra las reglas del MD pero no sustituye su texto.

**Limitación:** no confundir presencia de un objeto SVG con su correcta identificación semántica. Un SVG exportado de Lucidchart puede contener texto como glifos vectoriales.

---


## Guía de interpretación y alcance — v0.4.0

**La normativa define requisitos; las instrucciones del agente definen el proceso.** Un caso de prueba o una leyenda de notación NO implica que esos símbolos estén en el flujo modelado.

**Reglas interpretativas para evitar falsos positivos:**

- Para clasificar E2 es necesario identificar un **servicio gestionado dentro de INTEGRACIÓN**, diferenciado de la API y sus capas. La mera existencia de capas MCI NO demuestra E2. Si la API conecta directamente con un servicio no gestionado en el dominio productor, analizar E1.
- `DOMINIO PRODUCTOR` puede llamarse con el nombre del equipo/dominio, por ejemplo `NEPA - NUEVAS EXPERIENCIAS DE PAGO`. Distinguir contenedor principal y contenedor hijo `NOMBRE SERVICIO`; no atribuir la etiqueta hija al contenedor padre.
- `Capa de Arquitectura - composicion` es una **categoría normativa** de capa MCI, NO un marcador pendiente. Comparar tildes y mayúsculas de manera tolerante al buscar coincidencia semántica; conservar la grafía encontrada para pruebas literales.
- Solo el texto `NOMBRE SERVICIO` visible en el contenedor hijo podrá reportarse como nombre de plantilla pendiente, si aplica la norma correspondiente. No exigir correspondencia con repositorios/servicios desplegados sin regla y evidencia externas.
- Separar símbolos de `NOTACIÓN` (leyenda visual), notas explicativas y páginas BDD de los **objetos presentes en el flujo activo**. Una figura listada en NOTACIÓN no cuenta como implementada.
- Inventariar comandos/actividades, políticas, compuertas, excepciones, inicio/fin, modelos y conexiones, aunque sean secundarios respecto de la API. Las **excepciones de negocio BPMN** no equivalen a componentes de mensajería con/sin respuesta.
- La asociación contextual entre Política y un comando permitido satisface la condición aprobada si se demuestra la relación y el resto de normas; no exigir simultáneamente los cinco comandos ni un conector directo prohibido.
- Ante falta de una prueba visual o textual: `No Verificable` (no es una brecha del diseño). Toda brecha debe citar fuente concreta, componente y evidencia; prohibidos hallazgos genéricos de «trazabilidad» o «capas indeterminadas».
- El PDF visual referencia los ejemplos de diseño. La normativa escrita prima sobre una ilustración ambigua. Ver **Índice visual** al final del catálogo PDF.

**Control de fuente:** las modificaciones por conversación son simulaciones temporales, no cambian el archivo normativo. Para institucionalizar una corrección se debe editar y publicar una nueva versión aprobada del documento.

---

## ÍNDICE DE DOCUMENTOS INTEGRADOS

- [capasDespliegue.md](#capasdesplieguemd)
- [comandos.md](#comandosmd)
- [componenteApiBase.md](#componenteapibasemd)
- [componenteApiPartnerPublica.md](#componenteapipartnerpublicamd)
- [componenteApiPrivada.md](#componenteapiprivadamd)
- [componenteEventoBase.md](#componenteeventobasemd)
- [componenteEventoConRespuesta.md](#componenteeventoconrespuestamd)
- [componenteEventoSinRespuesta.md](#componenteeventosinrespuestamd)
- [componenteServicioBase.md](#componenteserviciobasemd)
- [componenteServicioGestionado.md](#componenteserviciogestionadomd)
- [componenteServicioNoGestionado.md](#componenteservicionogestionadomd)
- [componentesIntegracion.md](#componentesintegracionmd)
- [compuertas.md](#compuertasmd)
- [contenedores.md](#contenedoresmd)
- [eventos.md](#eventosmd)
- [modelosLectura.md](#modeloslecturamd)
- [simbolos.md](#simbolosmd)

---

## PROMPT MAESTRO ORIGINAL (REFERENCIA DE SALIDA)

Evaluación de Blueprint Arquitectónico
Voy a proporcionarte:
Un blueprint en formato txt,exportado desde la herramienta de Lucidchart.
Un conjunto de reglas y estándares definidos en un documento markdown
Objetivo
Analiza el blueprint y determina su nivel de cumplimiento respecto a las reglas definidas.
Importante:
Utiliza únicamente la información visible en el blueprint y las reglas proporcionadas.
No hagas suposiciones.
Si no existe evidencia suficiente, marca el resultado como "No Verificable".
Si encuentras un componente que no hace parte de lo que está definido márcalo como componente no especificado.
Validar cada una de las reglas definidas en el archivo markdown para cada uno de los componentes, ser muy específico con cada validación y para cada una de las reglas definidas
Fase 1: Comprensión del Blueprint
Identifica y describe:
Componentes visibles.
Servicios, aplicaciones, APIs, bases de datos y procesos.
Integraciones, flujos y dependencias.
Capas arquitectónicas existentes.
Elementos no visibles o ambiguos (marcarlos como No Verificable).
Cuando identifiques una API, indica:
Producto
API
Operación
Incluye una breve descripción de la arquitectura representada.
Fase 2: Evaluación de Reglas
Evalúa cada regla individualmente e indica:
ID de la regla
Nombre de la regla
Estado: 
Cumple
No Cumple
Parcialmente Cumple
No Verificable
Evidencia encontrada
Justificación técnica
Nivel de confianza: 
Alto
Medio
Bajo
Fase 3: Hallazgos
Genera una tabla con el siguiente formato:
Fase 4: Brechas
Identifica:
Componentes faltantes.
Relaciones faltantes.
Controles faltantes.
Información insuficiente.
Ambigüedades del diagrama.
Fase 5: Recomendaciones
Para cada una de las reglas que no cumpla o que cumpla parcialmente, indica:
Qué debe modificarse.
Cómo debería reflejarse en el blueprint.
Prioridad: 
Alta
Media
Baja
Fase 6: Resultado Ejecutivo
Presenta:
Total de reglas evaluadas.
Reglas que cumplen.
Reglas que no cumplen.
Reglas parcialmente cumplidas.
Reglas no verificables.
Porcentaje estimado de cumplimiento.
Entregable
La respuesta debe contener las siguientes secciones:
Resumen Ejecutivo.
Componentes Identificados.
Matriz de Cumplimiento.
Hallazgos y Evidencias.
Brechas Detectadas.
Recomendaciones.
Conclusión General.
No infieras información que no esté presente en el blueprint. Toda conclusión debe estar respaldada por evidencia visible o documental.

---

# REGLAS TÉCNICAS COMPLETAS (VERSIÓN CONSOLIDADA)



---

<a id="capasdesplieguemd"></a>

# ARCHIVO: capasDespliegue.md

## Capas de Despliegue

### Contenedores de la Capa de Despliegue


Las APIs (Este componente hereda todas las condiciones definidas en el documento `componenteApiPrivada.md`, excepto aquellas reemplazadas explícitamente en el presente documento), Servicios ((Este componente hereda todas las condiciones definidas en el documento `componenteServicioGestionado.md`, excepto aquellas reemplazadas explícitamente en el presente documento)) y Eventos ((Este componente hereda todas las condiciones definidas en el documento `eventos.md`, excepto aquellas reemplazadas explícitamente en el presente documento)) se deben clasificar en un Flujo Transaccional (Monetario, No Monetario, Operativo, Transversal), y en una Capa de Arquitectura (Experiencia, Composición y Sistema).

### Como se modela la capa de despliegue

- El contenedor de la capa es el rectángulo exterior más grande que encapsula todo el contenido del API, Servicio, Evento, Representa la Capa de Despliegue API Partner, es decir, el límite arquitectónico dentro del cual se ubican los flujos, operaciones y componentes relacionados.

En la Vista de la Capa de despliegue se debe agregar los componentes de despliegue encima (superpuesto) de cada API, Servicio, Evento, MQ, etc.

El dominio de valores para los flujos y capas son los siguientes:

Flujos Transaccionales:

* monetario
* no-monetario
* operativo
* transversal

Capas de Arquitectura:

* experiencia
* composicion
* sistema

  - Si los nombres son diferentes a los que están en este listado que es experiencia, composicion o sistema, tal cual está escrito es considerado un error.
  
### Capa de despliegue para API Privada
**Referencia visual:** Catálogo visual PDF, figura CV-009, página física 10 (`CapaDespliegueAPIInterna.png`).


La capa de despliegue esta conformada por el Flujo Transaccional y dentro de este se encuentra la Capa de Arquitectura
#### Colores:

* Borde:
    HEX: #000000 (negro).
* Fondo: Transparente (fill="none")

**Condiciones**:

La estructura jerarquica debe ser de esta manera:

 FLUJO TRANSACCIONAL
│
└── CAPA DE ARQUITECTURA
    │
    └── API INTERNA

- El Flujo Transaccional es el contenedor más externo y sus caracteristicas son:
 * Borde negro.
 * Estilo punteado/segmentado.
 * Esquinas redondeadas.
 * Sin color de fondo (transparente).
 * Contiene todos los demás elementos que son la Capa de Arquitectura.
 * El nombre del flujo se ubica normalmente en la parte superior izquierda del contenedor externo
 * El Flujo Transaccional debe tener cualquiera de estos nombres despues del termino "Flujo Transaccional -" y debe ser tal cual esta escrito a continuación en minusculas y sin tildes, si no esta definido de esta forma es una inconsistencia:

    * monetario
    * no-monetario
    * operativo
    * transversal

  * El texto debe cumplir con la siguiente estructura: `"Flujo Transaccional - <tipo>"`
  * `<tipo>` debe corresponder a uno de los valores permitidos en el estándar: `monetario`, `no-monetario`, `operativo` o `transversal`.
  * El tipo debe estar en minúscula.
  * Ejemplos válidos: `Flujo Transaccional - monetario`, `Flujo Transaccional - no-monetario`, `Flujo Transaccional - operativo`, `Flujo Transaccional - transversal`. 

- La capa de Arquitectura se encuentra completamente dentro del Flujo Transaccional, Sus características son:
 * Rectángulo con esquinas redondeadas.
 * Borde negro.
 * Sin color de fondo (transparente).
 * Debe envolver todo el flujo o servicio modelado.
 * Visualmente funciona como un marco arquitectónico
 * Dentro de la capa se ubica el componente API Interna representado como un segundo contenedor
 * La Capa de Despliegue siempre debe ser más grande que el componente API.
 * La API Interna debe estar completamente contenida dentro de la capa.
 * Debe existir un margen visual entre el borde de la capa y el borde de la API.
 * La capa no debe superponerse parcialmente al componente; debe contenerlo totalmente.
 * El nombre de la capa se ubica normalmente en la parte superior izquierda del contenedor externo
 * En términos de Blueprint, la Capa de Despliegue representa el contexto o dominio donde vive la API Interna, mientras que el componente API representa el flujo o servicio específico contenido dentro de esa capa
 * Asi como se muestra la imagen debe estar el API Interna con la capa de despliegue inlcuyendo el Flujo Transaccional y la Capa de Arquitectura
 * La capa de Arquiectura debe tener cualquiera de estos nombres despues del termino "Capa de Arquitectura -" y debe ser tal cual esta escrito a continuación en minusculas y sin tildes, si no esta definido de esta forma es una inconsistencia:

  * experiencia
  * composicion
  * sistema

* El texto debe cumplir con la siguiente estructura: `"Capa de Arquitectura - <tipo>"`
*  `<tipo>` debe corresponder a uno de los valores permitidos en el estándar: `experiencia`, `composicion`,  o `sistema`.
* El tipo debe estar en minúscula.
* Ejemplos válidos: `Capa de Arquitectura - experiencia`, `Capa de Arquitectura - composicion`, `Capa de Arquitectura - sistema`. 


### Capa de despliegue para API Publica o Partner
**Referencia visual:** Catálogo visual PDF, figura CV-010, página física 11 (`CapaDespliegueAPIPartner.png`).

#### Colores:

* Borde:
    HEX: #000000 (negro).
* Fondo: Transparente (fill="none")


**Condiciones**:

La estructura jerarquica debe ser de esta manera:

CAPA DE ARQUITECTURA
    │
    └── API PUBLIC O PARTNER

- La capa de Arquitectura se encuentra completamente dentro del Flujo Transaccional, Sus características son:
 * Rectángulo con esquinas redondeadas.
 * Borde negro.
 * Sin color de fondo (transparente).
 * Debe envolver todo el flujo o servicio modelado.
 * Visualmente funciona como un marco arquitectónico
 * Dentro de la capa se ubica el componente API Interna representado como un segundo contenedor
 * La Capa de Despliegue siempre debe ser más grande que el componente API.
 * La API Interna debe estar completamente contenida dentro de la capa.
 * Debe existir un margen visual entre el borde de la capa y el borde de la API.
 * La capa no debe superponerse parcialmente al componente; debe contenerlo totalmente.
 * El nombre de la capa se ubica normalmente en la parte superior izquierda del contenedor externo
 * En términos de Blueprint, la Capa de Despliegue representa el contexto o dominio donde vive la API Interna, mientras que el componente API representa el flujo o servicio específico contenido dentro de esa capa
 * Asi como se muestra la imagen debe estar el API Interna con la capa de despliegue inlcuyendo el Flujo Transaccional y la Capa de Arquitectura
 * La capa de Arquiectura debe tener cualquiera de estos nombres despues del termino "Capa de Arquitectura -" y debe ser tal cual esta escrito a continuación en minusculas y sin tildes, si no esta definido de esta forma es una inconsistencia:

  * experiencia
  * composicion
  * sistema

* El texto debe cumplir con la siguiente estructura: `"Capa de Arquitectura - <tipo>"`
*  `<tipo>` debe corresponder a uno de los valores permitidos en el estándar: `experiencia`, `composicion`,  o `sistema`.
* El tipo debe estar en minúscula.
* Ejemplos válidos: `Capa de Arquitectura - experiencia`, `Capa de Arquitectura - composicion`, `Capa de Arquitectura - sistema`. 

- Asi como se muestra la imagen debe estar el API Pública o Partner con la capa de despliegue inlcuyendo solamente la Capa de Arquitectura

### Capa de despliegue para Evento Comportamiento Con Respuesta
**Referencia visual:** Catálogo visual PDF, figura CV-011, página física 12 (`CapaDespliegueeventoConRespuesta.png`).

#### Colores:

* Borde:
    HEX: #000000 (negro).
* Fondo: Transparente (fill="none")

**Condiciones**:

La estructura jerarquica debe ser de esta manera:

Flujo Transaccional
    │
    └── Capa de Arquitectura
        │
        └── Evento con Respuesta (nombreTopicoPublicacion y nombreTopicoSuscripcion)


- El Flujo Transaccional es el contenedor más externo y sus caracteristicas son:
 * Borde negro.
 * Estilo punteado/segmentado.
 * Esquinas redondeadas.
 * Sin color de fondo (transparente).
 * Contiene todos los demás elementos que son la Capa de Arquitectura.
 * El nombre del flujo se ubica normalmente en la parte superior izquierda del contenedor externo
 * El Flujo Transaccional debe tener cualquiera de estos nombres despues del termino "Flujo Transaccional -" y debe ser tal cual esta escrito a continuación en minusculas y sin tildes, si no esta definido de esta forma es una inconsistencia:

    * monetario
    * no-monetario
    * operativo
    * transversal
  * El texto debe cumplir con la siguiente estructura: `"Flujo Transaccional - <tipo>"`
  * `<tipo>` debe corresponder a uno de los valores permitidos en el estándar: `monetario`, `no-monetario`, `operativo` o `transversal`.
  * El tipo debe estar en minúscula.
  * Ejemplos válidos: `Flujo Transaccional - monetario`, `Flujo Transaccional - no-monetario`, `Flujo Transaccional - operativo`, `Flujo Transaccional - transversal`. 


- La capa de Arquitectura se encuentra completamente dentro del Flujo Transaccional, Sus características son:
 * Rectángulo con esquinas redondeadas.
 * Borde negro.
 * Sin color de fondo (transparente).
 * Debe envolver todo el flujo o servicio modelado.
 * Visualmente funciona como un marco arquitectónico
 * Dentro de la capa se ubica el componente API Interna representado como un segundo contenedor
 * La Capa de Despliegue siempre debe ser más grande que el componente API.
 * La API Interna debe estar completamente contenida dentro de la capa.
 * Debe existir un margen visual entre el borde de la capa y el borde de la API.
 * La capa no debe superponerse parcialmente al componente; debe contenerlo totalmente.
 * El nombre de la capa se ubica normalmente en la parte superior izquierda del contenedor externo
 * En términos de Blueprint, la Capa de Despliegue representa el contexto o dominio donde vive la API Interna, mientras que el componente API representa el flujo o servicio específico contenido dentro de esa capa
 * Asi como se muestra la imagen debe estar el API Interna con la capa de despliegue inlcuyendo el Flujo Transaccional y la Capa de Arquitectura
 * La capa de Arquiectura debe tener cualquiera de estos nombres despues del termino "Capa de Arquitectura -" y debe ser tal cual esta escrito a continuación en minusculas y sin tildes, si no esta definido de esta forma es una inconsistencia:

  * experiencia
  * composicion
  * sistema

* El texto debe cumplir con la siguiente estructura: `"Capa de Arquitectura - <tipo>"`
*  `<tipo>` debe corresponder a uno de los valores permitidos en el estándar: `experiencia`, `composicion`,  o `sistema`.
* El tipo debe estar en minúscula.
* Ejemplos válidos: `Capa de Arquitectura - experiencia`, `Capa de Arquitectura - composicion`, `Capa de Arquitectura - sistema`. 

- Asi como se muestra la imagen debe estar el API Interna con la capa de despliegue incluyendo el Flujo Transaccional y la Capa de Arquitectura
- El Evento comportamiento con respuesta debe tener el nombre del Tópico de publicacion y debe estar dentro del 3 recuadro que se encuentra en la capa de despliegue
- El Evento comportamiento con respuesta debe tener el nombre del Tópico de suscripcion y debe estar dentro del 3 recuadro que se encuentra en la capa de despliegue


### Capa de despliegue para Evento Comportamiento Sin Respuesta
**Referencia visual:** Catálogo visual PDF, figura CV-012, página física 13 (`CapaDespliegueeventoSinRespuesta.png`).

#### Colores:

* Borde:
    HEX: #000000 (negro).
* Fondo: Transparente (fill="none")

**Condiciones**:

La estructura jerarquica debe ser de esta manera:

Flujo Transaccional
    │
    └── Capa de Arquitectura
        │
        └── Evento con Respuesta (nombreTopicoPublicacion y nombreTopicoSuscripcion)


- El Flujo Transaccional es el contenedor más externo y sus caracteristicas son:
 * Borde negro.
 * Estilo punteado/segmentado.
 * Esquinas redondeadas.
 * Sin color de fondo (transparente).
 * Contiene todos los demás elementos que son la Capa de Arquitectura.
 * El nombre del flujo se ubica normalmente en la parte superior izquierda del contenedor externo
 * El Flujo Transaccional debe tener cualquiera de estos nombres despues del termino "Flujo Transaccional -" y debe ser tal cual esta escrito a continuación en minusculas y sin tildes, si no esta definido de esta forma es una inconsistencia:

    * monetario
    * no-monetario
    * operativo
    * transversal
  * El texto debe cumplir con la siguiente estructura: `"Flujo Transaccional - <tipo>"`
  * `<tipo>` debe corresponder a uno de los valores permitidos en el estándar: `monetario`, `no-monetario`, `operativo` o `transversal`.
  * El tipo debe estar en minúscula.
  * Ejemplos válidos: `Flujo Transaccional - monetario`, `Flujo Transaccional - no-monetario`, `Flujo Transaccional - operativo`, `Flujo Transaccional - transversal`. 


- La capa de Arquitectura se encuentra completamente dentro del Flujo Transaccional, Sus características son:
 * Rectángulo con esquinas redondeadas.
 * Borde negro.
 * Sin color de fondo (transparente).
 * Debe envolver todo el flujo o servicio modelado.
 * Visualmente funciona como un marco arquitectónico
 * Dentro de la capa se ubica el componente API Interna representado como un segundo contenedor
 * La Capa de Despliegue siempre debe ser más grande que el componente API.
 * La API Interna debe estar completamente contenida dentro de la capa.
 * Debe existir un margen visual entre el borde de la capa y el borde de la API.
 * La capa no debe superponerse parcialmente al componente; debe contenerlo totalmente.
 * El nombre de la capa se ubica normalmente en la parte superior izquierda del contenedor externo
 * En términos de Blueprint, la Capa de Despliegue representa el contexto o dominio donde vive la API Interna, mientras que el componente API representa el flujo o servicio específico contenido dentro de esa capa
 * Asi como se muestra la imagen debe estar el API Interna con la capa de despliegue inlcuyendo el Flujo Transaccional y la Capa de Arquitectura
 * La capa de Arquiectura debe tener cualquiera de estos nombres despues del termino "Capa de Arquitectura -" y debe ser tal cual esta escrito a continuación en minusculas y sin tildes, si no esta definido de esta forma es una inconsistencia:

  * experiencia
  * composicion
  * sistema

* El texto debe cumplir con la siguiente estructura: `"Capa de Arquitectura - <tipo>"`
*  `<tipo>` debe corresponder a uno de los valores permitidos en el estándar: `experiencia`, `composicion`,  o `sistema`.
* El tipo debe estar en minúscula.
* Ejemplos válidos: `Capa de Arquitectura - experiencia`, `Capa de Arquitectura - composicion`, `Capa de Arquitectura - sistema`. 

- Asi como se muestra la imagen debe estar el API Interna con la capa de despliegue incluyendo el Flujo Transaccional y la Capa de Arquitectura
- El Evento comportamiento con respuesta debe tener el nombre del Tópico de publicacion y debe estar dentro del 3 recuadro que se encuentra en la capa de despliegue


### Capa de despliegue para Servicio
**Referencia visual:** Catálogo visual PDF, figura CV-012, página física 13 (`CapaDespliegueeventoSinRespuesta.png`).

- Asi como se muestra la imagen debe estar el servicio con la capa de despliegue inlcuyendo el Flujo Transaccional y la Capa de Arquitectura

#### Colores:

* Borde:
    HEX: #000000 (negro).
* Fondo: Transparente (fill="none")

**Condiciones**:

La estructura jerarquica debe ser de esta manera:

 FLUJO TRANSACCIONAL
│
└── CAPA DE ARQUITECTURA
    │
    └── SERVICIO


- El Flujo Transaccional es el contenedor más externo y sus caracteristicas son:
 * Borde negro.
 * Estilo punteado/segmentado.
 * Esquinas redondeadas.
 * Sin color de fondo (transparente).
 * Contiene todos los demás elementos que son la Capa de Arquitectura.
 * El nombre del flujo se ubica normalmente en la parte superior izquierda del contenedor externo
 * El Flujo Transaccional debe tener cualquiera de estos nombres despues del termino "Flujo Transaccional -" y debe ser tal cual esta escrito a continuación en minusculas y sin tildes, si no esta definido de esta forma es una inconsistencia:

    * monetario
    * no-monetario
    * operativo
    * transversal

  * El texto debe cumplir con la siguiente estructura: `"Flujo Transaccional - <tipo>"`
  * `<tipo>` debe corresponder a uno de los valores permitidos en el estándar: `monetario`, `no-monetario`, `operativo` o `transversal`.
  * El tipo debe estar en minúscula.
  * Ejemplos válidos: `Flujo Transaccional - monetario`, `Flujo Transaccional - no-monetario`, `Flujo Transaccional - operativo`, `Flujo Transaccional - transversal`. 
*

- La capa de Arquitectura se encuentra completamente dentro del Flujo Transaccional, Sus características son:
 * Rectángulo con esquinas redondeadas.
 * Borde negro.
 * Sin color de fondo (transparente).
 * Debe envolver todo el flujo o servicio modelado.
 * Visualmente funciona como un marco arquitectónico
 * Dentro de la capa se ubica el componente API Interna representado como un segundo contenedor
 * La Capa de Despliegue siempre debe ser más grande que el componente API.
 * La API Interna debe estar completamente contenida dentro de la capa.
 * Debe existir un margen visual entre el borde de la capa y el borde de la API.
 * La capa no debe superponerse parcialmente al componente; debe contenerlo totalmente.
 * El nombre de la capa se ubica normalmente en la parte superior izquierda del contenedor externo
 * En términos de Blueprint, la Capa de Despliegue representa el contexto o dominio donde vive la API Interna, mientras que el componente API representa el flujo o servicio específico contenido dentro de esa capa
 * Asi como se muestra la imagen debe estar el API Interna con la capa de despliegue inlcuyendo el Flujo Transaccional y la Capa de Arquitectura
 * La capa de Arquiectura debe tener cualquiera de estos nombres despues del termino "Capa de Arquitectura -" y debe ser tal cual esta escrito a continuación en minusculas y sin tildes, si no esta definido de esta forma es una inconsistencia:

  * experiencia
  * composicion
  * sistema

* El texto debe cumplir con la siguiente estructura: `"Capa de Arquitectura - <tipo>"`
*  `<tipo>` debe corresponder a uno de los valores permitidos en el estándar: `experiencia`, `composicion`,  o `sistema`.
* El tipo debe estar en minúscula.
* Ejemplos válidos: `Capa de Arquitectura - experiencia`, `Capa de Arquitectura - composicion`, `Capa de Arquitectura - sistema`. 
- Asi como se muestra la imagen debe estar el API Interna con la capa de despliegue incluyendo el Flujo Transaccional y la Capa de Arquitectura

### Capa de despliegue para Componentes Tecnológicos de Integración

####  Gestor de Colas (Queue Manager)

#### Colores:

* Borde:
    HEX: #000000 (negro).
* Fondo: Transparente (fill="none")

**Condiciones**:

La estructura jerarquica debe ser de esta manera:

 FLUJO TRANSACCIONAL
│
└── CAPA DE ARQUITECTURA
    │
    └── GESTOR DE COLAS


- El Flujo Transaccional es el contenedor más externo y sus caracteristicas son:
 * Borde negro.
 * Estilo punteado/segmentado.
 * Esquinas redondeadas.
 * Sin color de fondo (transparente).
 * Contiene todos los demás elementos que son la Capa de Arquitectura.
 * El nombre del flujo se ubica normalmente en la parte superior izquierda del contenedor externo
 * El Flujo Transaccional debe tener cualquiera de estos nombres despues del termino "Flujo Transaccional -" y debe ser tal cual esta escrito a continuación en minusculas y sin tildes, si no esta definido de esta forma es una inconsistencia:

    * monetario
    * no-monetario
    * operativo
    * transversal

  * El texto debe cumplir con la siguiente estructura: `"Flujo Transaccional - <tipo>"` 
  *  `<tipo>` debe corresponder a uno de los valores permitidos en el estándar: `monetario`, `no-monetario`, `operativo` o `transversal`.
  * El tipo debe estar en minúscula.
  * Ejemplos válidos: `Flujo Transaccional - monetario`, `Flujo Transaccional - no-monetario`, `Flujo Transaccional - operativo`, `Flujo Transaccional - transversal`. 

- La capa de Arquitectura se encuentra completamente dentro del Flujo Transaccional, Sus características son:
 * Rectángulo con esquinas redondeadas.
 * Borde negro.
 * Sin color de fondo (transparente).
 * Debe envolver todo el flujo o servicio modelado.
 * Visualmente funciona como un marco arquitectónico
 * Dentro de la capa se ubica el componente API Interna representado como un segundo contenedor
 * La Capa de Despliegue siempre debe ser más grande que el componente API.
 * La API Interna debe estar completamente contenida dentro de la capa.
 * Debe existir un margen visual entre el borde de la capa y el borde de la API.
 * La capa no debe superponerse parcialmente al componente; debe contenerlo totalmente.
 * El nombre de la capa se ubica normalmente en la parte superior izquierda del contenedor externo
 * En términos de Blueprint, la Capa de Despliegue representa el contexto o dominio donde vive la API Interna, mientras que el componente API representa el flujo o servicio específico contenido dentro de esa capa
 * Asi como se muestra la imagen debe estar el API Interna con la capa de despliegue inlcuyendo el Flujo Transaccional y la Capa de Arquitectura
 * La capa de Arquiectura debe tener cualquiera de estos nombres despues del termino "Capa de Arquitectura -" y debe ser tal cual esta escrito a continuación en minusculas y sin tildes, si no esta definido de esta forma es una inconsistencia:

  * experiencia
  * composicion
  * sistema

  * El texto debe cumplir con la siguiente estructura: `"Capa de Arquitectura - <tipo>"`
*  `<tipo>` debe corresponder a uno de los valores permitidos en el estándar: `experiencia`, `composicion`,  o `sistema`.
* El tipo debe estar en minúscula.
* Ejemplos válidos: `Capa de Arquitectura - experiencia`, `Capa de Arquitectura - composicion`, `Capa de Arquitectura - sistema`. 

- Asi como se muestra la imagen debe estar el API Interna con la capa de despliegue incluyendo el Flujo Transaccional y la Capa de Arquitectura

**Referencia visual:** Catálogo visual PDF, figura CV-013, página física 14 (`CapaDespliegueGestorColas.png`).


#### APIS, Servicios y Gestores de Cola no Federedos

**Referencia visual:** Catálogo visual PDF, figura CV-014, página física 15 (`CapaDespliegueGestorColasFederado.png`).
**Referencia visual:** Catálogo visual PDF, figura CV-016, página física 17 (`CapaDespliegueServicioFederado.png`).


- Si existe algun componente como un API, Servicio o Gestor de colas que no se encuentra en la infraestructra centralizada no debe tener la capa de despliegue porque aun se encuentra en una infraestuctura federada, pero si debe tener un recuadro con lineas discontinuas indicando que es Federado.
- Los servicios que aún residen en la infraestructura federada no incluyen flujo transaccional ni capa de arquitectura, ya que no están desplegados en la infraestructura centralizada. No obstante, si el mecanismo de consumo se realiza a través de colas de mensajería en el Gestor de Colas (Queue Manager) de Integración, se complementa con la capa genérica "Federado" y los nombres de las colas de petición y respuesta utilizadas para la comunicación.

### Ejemplo Modelo de BluePrint en Infrestructura de Modelo Centralizado de integración

**Referencia visual:** Catálogo visual PDF, figura CV-029, página física 30 (`EjemploBPMCI.png`).


### Ejemplo Modelo de BluePrint en Infrestructura Federada

**Referencia visual:** Catálogo visual PDF, figura CV-038, página física 39 (`EjemploModeloFederado.png`).



---

<a id="comandosmd"></a>

# ARCHIVO: comandos.md

# REGLAS BLUEPRINT API

## Comandos y Subprocesos

Representan intenciones/acciones/decisiones o consultas que se debe ejecutar durante un flujo.

### 1. **Comando de consulta:**
**Referencia visual:** Catálogo visual PDF, figura CV-017, página física 18 (`ComandoConsulta.png`).

#### Colores:

* Fondo:#CED4DB (gris claro azulado).
    HEX: #ced4db
    RGB: (206, 212, 219)
* Borde:
    HEX: #6F7681 (gris oscuro azulado).
    RGB:  (111, 118, 129)
* Color relleno engranaje: #FFFFFF
    HEX:#FFFFFF
 
**Condiciones**:
- El objeto comando de tipo consulta esta representado por un un rectángulo con esquinas redondeadas
- El comando de tipo consulta dentro del contenedor aparecen dos símbolos tipo engranaje superpuestos blancos con borde negro ubicados en la parte superior izquierda del contenedor. 
- Cada engranaje tiene un círculo central
- Este comando de tipo consulta representa una actividad que obtiene o consulta informacion especifica.
- El comando de tipo consulta se nombra con verbo infinitivo + un sustantivo. Ejemplo: “Consultar cuenta”, “Consultar pago” o “Consultar saldo”.
- Los colores utilizado en el comando de tipo consulta deben corresponder completamente a una de las paletas definidas en la sección **Colores**.
- Este comando de tipo sistema debe tener 2 lineas que pueden comunicarse con otro comando o proceso, estas lineas interlineadas deben ser 2 e ir en ambos sentidos
- El texto que se incluye en el comando de tipo consulta debe iniciar siempre en mayúsculas
- El comando de tipo consulta siempre debe tener el piñon y cumplir con el icono de la imagen
- Todo lo que tenga terminos similares a consulta, consultar consultas, validar, validacion debe ser incluidos en este objeto comando tipo consulta en color gris con valor hexadecimal  #CED4DB si está en otro color debe notificarse como un no cumplimiento.
-

### 2. **Sistema Automatizado:**
**Referencia visual:** Catálogo visual PDF, figura CV-019, página física 20 (`ComandoSistema.png`).

#### Colores:

* Fondo:#DAE8FC (gris claro azulado).
    HEX: DAE8FC
    RGB: (218,232,252)
* Borde:
    HEX: #6C8EBF (gris oscuro azulado).
    RGB:  (108,142,191)
* Color relleno engranaje: #FFFFFF
    HEX:#FFFFFF
 
**Condiciones**:
- Este comando tipo Sistema Automatizado esta representado por un Rectángulo con esquinas redondeadas
- Este comando tipo Sistema Automatizado se identifican dos engranajes superpuestos blancos con borde negro ubicados en la parte superior izquierda del contenedor.
- Este comando tipo Sistema Automatizado representa una actividad que puede ser sistematizada a través de una capacidad de API o Servicio
- El comando de tipo Sistema Automatizado con engranaje se nombra con verbo infinitivo + un sustantivo. Ejemplo: “Debitar cuenta”, “Validar cuenta” o “Realizar pago” 
- Los colores utilizados en el comando de tipo Sistema Automatizado deben corresponder completamente a una de las paletas definidas en la sección **Colores**.
- Este comando de tipo sistema debe tener 2 lineas que pueden comunicarse con otro comando o proceso, estas lineas interlineadas deben ser 2 e ir en ambos sentidos
- El texto que se incluye en el comando tipo Sistema Automatizado con engranaje debe iniciar en mayúsculas
- Este comando de tipo Sistema Automatizado debe tener 2 lineas que pueden comunicarse con otro comando o proceso, estas lineas deben ser interlineadas y deben ser 2 e ir en ambos sentidos


### 3. **Usuario:**
**Referencia visual:** Catálogo visual PDF, figura CV-022, página física 23 (`ComandoUsuario.png`).

#### Colores:

* Fondo:#DAE8FC (gris claro azulado).
    HEX: DAE8FC
    RGB: (218, 232, 252)
* Borde:
    HEX: #6C8EBF (gris oscuro azulado).
    RGB:  (108,142,191)
* Color relleno engranaje: #FFFFFF
    HEX:#FFFFFF

**Condiciones:**
- Este comando de tipo usuario es un contenedor rectangular con esquinas redondeadas.
- Este comando de tipo usuario  cuenta con un ícono de usuario/persona en la parte superior izquierda.
- Este comando de tipo usuario representa una actividad que requiere la interaccion del usuario de forma manual
- El texto que se incluye en el comando de tipo usuario debe iniciar siempre en Mayúscula
- El comando de tipo usuario se nombra con verbo infinitivo + un sustantivo. Ejemplo: “Revisar Reporte”, “Validar Información”.
- Este comando de tipo sistema debe tener 2 lineas que pueden comunicarse con otro comando o proceso, estas lineas interlineadas deben ser 2 e ir en ambos sentidos
- Los colores utilizados en el comando de tipo usuario deben corresponder completamente a una de las paletas definidas en la sección **Colores**.


### 4. **Sistema:**
**Referencia visual:** Catálogo visual PDF, figura CV-020, página física 21 (`ComandoSistema2.png`).

#### Colores:

* Fondo:#DAE8FC (gris claro azulado).
    HEX: DAE8FC
    RGB: (218, 232, 252)
* Borde:
    HEX: #6C8EBF (gris oscuro azulado).
    RGB:  (108,142,191)
* Color relleno engranaje: #FFFFFF
    HEX:#FFFFFF

**Condiciones:**
- Este comando de tipo sistema es un contenedor rectangular con esquinas redondeadas.
- Este comando de tipo sistema  es un contenedor vacio sin iconos
- Este comando de tipo sistema representa una actividad de sistema que no implica interaccion de usuario ni uso de APIS o servicios, es usado para representar conexiones a Bases de datos
- El texto que se incluye en el comando de tipo sistema debe iniciar siempre en Mayúscula
- Este comando de tipo sistema debe tener 2 lineas que pueden comunicarse con otro comando o proceso, estas lineas interlineadas deben ser 2 e ir en ambos sentidos
- Este comando de tipo Sistema siempre debe ir en color azul su valor hexadecimal debe ser #DAE8FC.
- Los colores utilizados en el comando de tipo Sistema deben corresponder completamente a una de las paletas definidas en la sección **Colores**.

### 5. **Subproceso:**
**Referencia visual:** Catálogo visual PDF, figura CV-021, página física 22 (`ComandoSubproceso.png`).

#### Colores:

* Fondo:#DAE8FC (gris claro azulado).
    HEX: DAE8FC
    RGB: (218, 232, 252)
* Borde:
    HEX: #6C8EBF (gris oscuro azulado).
    RGB:  (108,142,191)
* Color relleno engranaje: #FFFFFF
    HEX:#FFFFFF

**Condiciones:**
- Este comando de tipo subproceso es un contenedor rectangular con esquinas redondeadas.
- Este comando de tipo subproceso  es un contenedor con un icono con un símbolo "+" dentro de un cuadrado, típico de BPMN que Se encuentra en la parte inferior-central del artefacto
- Este comando de tipo subproceso encapsula un subconjunto de actividades que se realizan para cumplir un objetivo dentro de un proceso mas grande
- Los colores utilizados en el comando de tipo subproceso deben corresponder completamente a una de las paletas definidas en la sección **Colores**.
- El texto que se incluye en el comando de tipo subproceso debe iniciar siempre en Mayúscula
- Este comando de tipo subproceso debe tener 2 lineas que pueden comunicarse con otro comando o proceso, estas lineas interineadas deben ser 2 e ir en ambos sentidos


---

<a id="componenteapibasemd"></a>

# ARCHIVO: componenteApiBase.md

> ACLARACIÓN APROBADA: el componente mayor de versión en `v#.#.#` debe ser >= 1; `v1.0.0` es válida.

# REGLAS BLUEPRINT API

## API

**Referencia visual:** Catálogo visual PDF, figura CV-003, página física 4 (`APIBase.png`).

### Descripción general

- Representa una API cuya responsabilidad funcional pertenece al mismo dominio en el que se encuentra modelada.
- El componente está conformado por:
    - Una API.
    - Un identificador circular verde.
    - Un Modelo de Datos de Entrada.
    - Un Modelo de Datos de Salida.
    - Las capas de despliegue (flujo transaccional y capa de arquitectura), cuando aplique.
    - Una conexión de línea continua o dos conexiones de línea discontinua, según el escenario de modelamiento.

### API

#### Colores

La API puede presentarse en color azul, gris o verde. En las tres variantes debe conservar el borde exterior, las líneas divisorias internas y el texto en color negro.

###### Elementos comunes para las tres variantes

Borde exterior:
- HEX: #000000
- RGB: 0, 0, 0

Líneas divisorias internas:
- HEX: #000000
- RGB: 0, 0, 0

Texto:
- HEX: #000000
- RGB: 0, 0, 0

###### API azul

Relleno:
Gradiente lineal compuesto por:
- HEX: #98d4e6
- RGB: 152, 212, 230
- HEX: #d0d8fe
- RGB: 208, 216, 254

###### API gris

Relleno:
Gradiente lineal compuesto por:
- HEX: #808080
- RGB: 128, 128, 128
- HEX: #e6e6e6
- RGB: 230, 230, 230

###### API verde

Relleno:
Gradiente lineal compuesto por:
- HEX: #97d077
- RGB: 151, 208, 119
- HEX: #99ffcc
- RGB: 153, 255, 204

#### Forma y estructura

- Tiene forma rectangular con esquinas redondeadas.
- Tiene borde negro de línea continua.
- Debe conservar una orientación horizontal.
- Está dividida mediante líneas horizontales en tres secciones:
    1. Identificación y versión de la API.
    2. Operación de la API.
    3. Tipo y modelo de servicio de la API.
- La API puede utilizar una de las siguientes variantes de color: azul, gris o verde.
- El color utilizado debe corresponder completamente a una de las paletas definidas en la sección **Colores**.
- No se permite combinar en una misma API colores de dos o más variantes.
- Independientemente de la variante seleccionada, el borde exterior, las líneas divisorias internas y el texto deben conservarse en color negro.

#### Primera sección: identificación y versión

- Debe contener el nombre del producto, el nombre de la API y su versión.
- El texto debe cumplir con la siguiente estructura: `"Nombre Producto - Nombre API v#.#.#"` 
- Los textos `"Nombre Producto"` y `"Nombre API"` deben reemplazarse por los nombres reales del producto y de la API.
- El nombre del producto y el nombre de la API deben escribirse con la letra inicial de cada palabra en mayúscula.
- El nombre del producto y el nombre de la API deben estar separados por un único guion.
- El nombre del producto y el nombre de la API deben estar en inglés.
- No se deben utilizar guiones adicionales como parte de esta estructura. 
- Ejemplo válido: Cash Out Operations - Withdrawal Request v1.0.2
- La versión debe cumplir con el formato `v#.#.#`.
- El número inmediatamente posterior a la letra `v` debe ser un dígito mayor a 1.
- Los dos números restantes deben ser dígitos igual o mayores a 0.
- Ejemplos válidos versión: v1.0.0, v1.0.2, v2.3.1, v2.13.0
- Ejemplos no válidos: v0.1.0, V1.0.0, v1.0, 1.0.0, v1.00.02

#### Segunda sección: operación de la API

- Debe contener el nombre de la operación expuesta por la API.
- El nombre de la operación debe escribirse en formato `camelCase`.
- El nombre de la operación debe estar en inglés.
- Debe iniciar con letra minúscula.
- No debe contener espacios, guiones ni guiones bajos. 
- Ejemplos válidos: enableWithdrawal, validate, createCustomer, retrieveCreditHistory 
- Ejemplos no válidos: EnableWithdrawal, enable withdrawal, enable-withdrawal, enable_withdrawal

#### Tercera sección: tipo y modelo de servicio

- Debe contener el tipo de la API y su modelo de servicio.
- El texto debe cumplir con la siguiente estructura: `"Tipo - Modelo de servicio"`
- El tipo debe corresponder a uno de los siguientes valores: private, public o partner. Esto depende del tipo de API.
- El modelo de servicio debe corresponder a uno de los siguientes valores: entidad, utilidad o tarea.
- El tipo y el modelo de servicio deben escribirse completamente en minúsculas.


### Identificador circular verde

#### Colores

Borde de la circunferencia exterior:
- HEX: #000000
- RGB: 0, 0, 0

Borde de la circunferencia interior:
- HEX: #000000
- RGB: 0, 0, 0

Relleno:
Gradiente lineal compuesto por:
- HEX: #d4ffa3
- RGB: 212, 255, 163
- HEX: #99ffcc
- RGB: 153, 255, 204

Triángulo interno:

Borde:
- HEX: #000000
- RGB: 0, 0, 0

Relleno:
- HEX: #ffffff
- RGB: 255, 255, 255

#### Forma y ubicación

- Tiene forma circular.
- Tiene doble circunferencia.
- Tiene borde negro de línea continua.
- Contiene un triángulo interno de color blanco.
- El triángulo interno apunta hacia arriba.
- Debe estar asociado visualmente a la API.
- Debe estar ubicado en la esquina superior derecha de la API.

### Modelos de datos asociados

- La API debe tener asociado un Modelo de Datos de Entrada.
- La API debe tener asociado un Modelo de Datos de Salida.

### Capas de despliegue

- Cuando la API esté modelada bajo el modelo MCI, debe estar enmarcada por las capas de despliegue definidas para su tipo.
- Las capas de despliegue aplicables deben especificarse en el documento particular del componente:`componenteApiPrivada.md`, `componenteApiPartnerPublica.md`
- Cuando la API no esté modelada bajo el modelo MCI, las capas de despliegue no serán obligatorias y su ausencia no deberá reportarse como incumplimiento.
- La forma, los colores, los textos, la ubicación y las demás condiciones de cada capa de despliegue deben validarse según el estándar específico de capas.

### Ubicación dentro del blueprint

- La API debe estar ubicada obligatoriamente dentro del contenedor gris denominado `"INTEGRACIÓN"`.

    **Referencia visual:** Catálogo visual PDF, figura CV-008, página física 9 (`APIPrivadaSinServInt.png`).

- Si dentro del contenedor `"INTEGRACIÓN"` existe un contenedor azul que representa el servicio de integración:

    - La API debe permanecer dentro del contenedor `"INTEGRACIÓN"`.
    - La API debe estar ubicada por fuera del contenedor azul.
    - La API debe estar ubicada al lado izquierdo del contenedor azul.
    **Referencia visual:** Catálogo visual PDF, figura CV-005, página física 6 (`APIPrivadaConServInt.png`).

### Conexiones

- La API puede tener uno de los siguientes esquemas de conexión:
    1. Una línea continua.
    2. Dos líneas discontinuas.

- Los dos esquemas son excluyentes.
- La API no debe estar sin conexiones.
- Si no tiene una línea continua, debe tener obligatoriamente las dos líneas discontinuas.

#### Escenario 1: conexión mediante línea continua
**Referencia visual:** Catálogo visual PDF, figura CV-008, página física 9 (`APIPrivadaSinServInt.png`).
**Referencia visual:** Catálogo visual PDF, figura CV-005, página física 6 (`APIPrivadaConServInt.png`).
- La línea continua debe estar ubicada en el lado derecho de la API.
- La flecha final de la línea continua debe conectarse con el símbolo de inicio asociado a la API.

#### Escenario 2: conexión mediante dos líneas discontinuas
**Referencia visual:** Catálogo visual PDF, figura CV-006, página física 7 (`APIPrivadaConsumida.png`).
- Deben existir exactamente dos líneas discontinuas asociadas a la API.
- En la primera línea discontinua, el triángulo sin relleno debe apuntar hacia la API.
- En la segunda línea discontinua, el círculo sin relleno debe apuntar hacia la API.
- Los extremos opuestos de ambas líneas discontinuas deben conectarse con un comando de tipo consulta o con un comando de tipo sistema automatizado.


---

<a id="componenteapipartnerpublicamd"></a>

# ARCHIVO: componenteApiPartnerPublica.md

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

**Referencia visual:** Catálogo visual PDF, figura CV-004, página física 5 (`APIExternaMCI.png`).
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

Todas las demás condiciones definidas en `componenteApiBase.md` deben cumplirse sin modificación.


---

<a id="componenteapiprivadamd"></a>

# ARCHIVO: componenteApiPrivada.md

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

**Referencia visual:** Catálogo visual PDF, figura CV-007, página física 8 (`APIPrivadaDominioPropio.png`).
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

Todas las demás condiciones definidas en `componenteApiBase.md` deben cumplirse sin modificación.


---

<a id="componenteeventobasemd"></a>

# ARCHIVO: componenteEventoBase.md

# REGLAS BLUEPRINT API

## EVENTOS CON O SIN RESPUESTA

### Descripción general

- Cuando este componente se identifica en el blueprint se debe garantizar que existan los siguientes elementos:
    - Un EVENTO.
    - Un Modelo de Datos de Entrada y/o Salida, dependiendo de la clasificación del evento.
    - Las capas de despliegue.
    - Las capas de tópicos
    - Descripción funcional del evento
    - Las conexiones con lineas discontinuas, dependiendo de la clasificación del evento.
- El evento tiene una de estas clasificaciones lo cual determina los modelos de respuesta a visualizar, las conexiones y los tópicos a evaluar:
    1. Query: se denominan evento con respuesta
    2. Command: se denominan evento con o sin respuesta
    3. Event: se denominan evento sin respuesta
- Cuando el evento es con respuesta (query o command) adicional a los elementos obligatarios indicados, se debe garantizar que exista una conexión con un evento de tipo señal envío y un evento de tipo señal recepción.
- Cuando el evento es sin respuesta (command o event) adicional a los elementos obligatarios indicados, se debe garantizar que exista una conexión con un evento de tipo señal envío o un evento de tipo señal recepción. No pueden existir las dos señales.

#### Colores

El evento puede presentarse en color azul o gris. En las dos variantes debe conservar el borde exterior, las líneas divisorias internas y el texto en color negro.

###### Elementos comunes para las dos variantes

Borde exterior:
- HEX: #000000
- RGB: 0, 0, 0

Líneas divisorias internas:
- HEX: #000000
- RGB: 0, 0, 0

Texto:
- HEX: #000000
- RGB: 0, 0, 0

###### Evento azul

Relleno:
Gradiente lineal compuesto por:
- HEX: #98d4e6
- RGB: 152, 212, 230
- HEX: #d0d8fe
- RGB: 208, 216, 254

###### Evento gris

Relleno:
Gradiente lineal compuesto por:
- HEX: #808080
- RGB: 128, 128, 128
- HEX: #e6e6e6
- RGB: 230, 230, 230

#### Forma y estructura

- Tiene forma rectangular con esquinas redondeadas.
- Tiene borde negro de línea continua.
- Debe conservar una orientación horizontal.
- Está dividida mediante líneas horizontales en tres secciones:
    1. Nombre del evento
    2. Nombre de la operación
    3. Tipo y clasificación del evento
- El evento puede utilizar una de las siguientes variantes de color: azul o gris.
- El color utilizado debe corresponder completamente a una de las paletas definidas en la sección **Colores**.
- No se permite combinar en un mismo evento colores de dos o más variantes.
- Independientemente de la variante seleccionada, el borde exterior, las líneas divisorias internas y el texto deben conservarse en color negro.

#### Primera sección: nombre del evento

- Debe contener el nombre del producto, el nombre de la capacidad y su versión.
- El texto debe cumplir con la siguiente estructura: `"Nombre Producto - Nombre Capacidad_v#.#.#"` 
- Los textos `"Nombre Producto"` y `"Nombre Capacidad"` deben reemplazarse por los nombres reales del producto y de la capacidad.
- El nombre del producto y el nombre de la capacidad deben escribirse con la letra inicial de cada palabra en mayúscula.
- El nombre del producto y el nombre de la capacidad deben estar separados por un único guion (-).
- El nombre del producto y el nombre de la capacidad deben estar en inglés.
- El nombre de la capacidad y la versión deben estar unidos por un único guion bajo (_).
- No se deben utilizar guiones adicionales como parte de esta estructura. 
- Ejemplo válido: Credit Card Statement - Retrieve Credit Card Transactions_v1.0.2
- La versión debe cumplir con el formato `v#.#.#`.
- El número inmediatamente posterior a la letra `v` debe ser un dígito mayor a 1.
- Los dos números restantes deben ser dígitos igual o mayores a 0.
- Ejemplos válidos versión: v1.0.0, v1.0.2, v2.3.1, v2.13.0
- Ejemplos no válidos: v0.1.0, V1.0.0, v1.0, 1.0.0, v1.00.02

#### Segunda sección: operación de la operación

- Debe contener el nombre de la operación expuesta por el evento.
- Solo si la clasificación del evento es `event`, el nombre de la operación debe iniciar con la palabra on.
- El nombre de la operación debe escribirse en formato `camelCase`.
- El nombre de la operación debe estar en inglés.
- Debe iniciar con letra minúscula.
- No debe contener espacios, guiones ni guiones bajos.
- Ejemplos válidos: onCreditLimitChanged, modifyCreditLimit, retrieveWithdrawal
- Ejemplos no válidos: RetrieveWithdrawal, retrieve Withdrawal, modify-CreditLimit

#### Tercera sección: tipo y clasificación del evento

- Debe contener el tipo y clasificación del evento.
- El texto debe cumplir con la siguiente estructura: `"Tipo - Clasificacion"`
- El tipo debe corresponder a uno de los siguientes valores: Aplicacion o Empresarial.
- La clasificación del evento debe corresponder a uno de los siguientes valores: Query, Command o Event
- El tipo y la clasificación deben escribirse solo con su inicial en mayúscula.
- Ejemplos válidos: Aplicacion - Query, Aplicacion - Command, Aplicacion - Event, Empresarial - Query, Empresarial - Command, Empresarial - Event.


### Modelos de datos asociados

- El evento debe tener asociado un Modelo de Datos de Entrada y/o de Salida dependiendo de su clasificación indicada en el documento de cada uno `eventosSinRespuesta.md`, `eventosConRespuesta.md`c.
- Todo evento debe tener asociado una descripción del evento.

### Capas de despliegue

- El evento debe estar siempre enmarcado por las capas de despliegue: Flujo Transaccional y Capa de Arquitectura y cumplir el lineamiento indicado en XXXXX.
- La ausencia de estas capas deberá reportarse como incumplimiento.
- La forma, los colores, los textos, la ubicación y las demás condiciones de cada capa de despliegue deben validarse según el estándar específico de capas.

### Capas de tópicos

- El evento debe estar siempre enmarcado por una capa adicional luego de las dos capas de despliegue, la cual corresponde para los topicos de envío y/o recepción según la clasificación del tipo de evento.
- La ausencia de esta capa deberá reportarse como incumplimiento.
- Los textos que deben aparecer en esta capa dependen de la clasificación del evento:
    1. Evento con respuesta
    2. Evento sin respuesta

#### Escenario 1: Evento con respuesta
- Deben existir dos tópicos: uno para la publicación del evento y otro para la respuesta del evento.
- Ambos tópicos deben garantizar la siguiente estructura: 
    - **Publicación:** p.nombreProducto.nombreCapacidad.v1 
    - **Respuesta:** s.nombreProducto.nombreCapacidad.v1 
- El nombramiento del tópico debe estar en camelCase.
- El nombramiento del tópico solo debe tener como único caracter especial el punto (.)

#### Escenario 2: Evento sin respuesta
- Deben existir un único tópico bien sea para la publicación del evento o para la respuesta del evento.
- Independiente del tópico se debe garantizar la siguiente estructura: 
    - **Publicación:** p.nombreProducto.nombreCapacidad.v1 
    - **Suscripción:** s.nombreProducto.nombreCapacidad.v1 
- La aparición de los tópicos debe ser excluyente. 
- El nombramiento del tópico debe estar en camelCase.
- El nombramiento del tópico solo debe tener como único caracter especial el punto (.)

### Ubicación dentro del blueprint

- El evento debe estar ubicadqo obligatoriamente dentro del contenedor gris denominado `"INTEGRACIÓN"`.
- Si dentro del contenedor `"INTEGRACIÓN"` existe un contenedor azul que representa el servicio de integración:

    - El evento debe permanecer dentro del contenedor `"INTEGRACIÓN"`.
    - El evento debe estar ubicada por fuera del contenedor azul.
    - El evento debe estar ubicada al lado izquierdo del contenedor azul.

### Conexiones

- El evento puede tener como esquema de conexión una o dos lineas discontinuas según el escenario.
    1. Evento con respuesta
    2. Evento sin respuesta

#### Escenario 1: Evento con respuesta
- Se detalla en el documento `eventosConRespuesta.md` en la sección de Conexiones.

#### Escenario 2: Evento sin respuesta
- Se detalla en el documento `eventosSinRespuesta.md` en la sección de Conexiones.


---

<a id="componenteeventoconrespuestamd"></a>

# ARCHIVO: componenteEventoConRespuesta.md

> ACLARACIÓN APROBADA: el rótulo `Command` es válido con y sin respuesta. Dos señales envío/recepción para con respuesta; una señal envío o recepción para sin respuesta.

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

**Referencia visual:** Catálogo visual PDF, figura CV-045, página física 46 (`EventoConRespuesta.png`).

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
**Referencia visual:** Catálogo visual PDF, figura CV-046, página física 47 (`EventoConRespuestaEnvio.png`).
- El triángulo sin relleno debe apuntar hacia el componente de evento tipo query o command descrito en este documento.
- El círculo sin relleno debe conectarse con el evento de tipo señal envio indicado en el documento `eventos.md`.

#### Linea discontinua 2: Recepción de respuesta al evento
**Referencia visual:** Catálogo visual PDF, figura CV-047, página física 48 (`EventoConRespuestaRecepcion.png`).
- El círculo sin relleno debe apuntar hacia el componente de evento tipo query o command descrito en este documento.
- El triangulo sin relleno conectarse con el evento de tipo señal recepción indicado en el documento `eventos.md`.


---

<a id="componenteeventosinrespuestamd"></a>

# ARCHIVO: componenteEventoSinRespuesta.md

> ACLARACIÓN APROBADA: el rótulo `Command` es válido con y sin respuesta. Dos señales envío/recepción para con respuesta; una señal envío o recepción para sin respuesta.

> ACLARACIÓN APROBADA: en el caso de suscripción, el triángulo sin relleno apunta a la señal de recepción descrita en `eventos.md`. Si una frase posterior contradice esto, prevalece esta aclaración.

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

**Referencia visual:** Catálogo visual PDF, figura CV-049, página física 50 (`EventoSinRespuesta.png`).

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
**Referencia visual:** Catálogo visual PDF, figura CV-050, página física 51 (`EventoSinRespuestaEnvio.png`).
- Aplica solo cuando el evento de tipo señal es envío y el componente de evento es de tipo event o command exclusivamente.
- La linea discontinua debe conectar el evento de tipo señal con el componente de evento aqui descrito.
- El círculo sin relleno de la linea discontinua debe conectarse con el evento de tipo seña envio indicado en el documento `eventos.md`
- El triángulo sin relleno debe apuntar hacia el componente de evento tipo event o command descrito en este documento.


#### Escenario 2: Suscripción o recepción de evento
**Referencia visual:** Catálogo visual PDF, figura CV-051, página física 52 (`EventoSinRespuestaRecepcion.png`).
- Aplica solo cuando el evento de tipo señal es recepción y el componente de evento es de tipo event o command exclusivamente.
- La linea discontinua debe conectar el evento de tipo señal con el componente de evento aqui descrito.
- El círculo sin relleno de la linea discontinua debe apuntar hacia el componente de evento tipo event o command descrito en este documento.
- El triángulo sin relleno debe apuntar hacia el evento de tipo señal envio indicado en el documento `eventos.md`


---

<a id="componenteserviciobasemd"></a>

# ARCHIVO: componenteServicioBase.md

# REGLAS BLUEPRINT API

## SERVICIO

**Referencia visual:** Catálogo visual PDF, figura CV-003, página física 4 (`APIBase.png`).

### Descripción general

- Representa un servicio asociado a la API que se está modelando.
- El componente está conformado por:
    - Un Servicio
    - Un Modelo de Datos de Entrada.
    - Un Modelo de Datos de Salida.
    - Las capas de despliegue (flujo transaccional y capa de arquitectura), cuando aplique.
    - Dos conexiones de línea discontinua.

### SERVICIO

#### Colores

El servicio puede presentarse en color azul, gris o verde. En las tres variantes debe conservar el borde exterior, las líneas divisorias internas y el texto en color negro.

###### Elementos comunes para las tres variantes

Borde exterior:
- HEX: #000000
- RGB: 0, 0, 0

Líneas divisorias internas:
- HEX: #000000
- RGB: 0, 0, 0

Texto:
- HEX: #000000
- RGB: 0, 0, 0

###### Servicio azul

Relleno:
Gradiente lineal compuesto por:
- HEX: #98d4e6
- RGB: 152, 212, 230
- HEX: #d0d8fe
- RGB: 208, 216, 254

###### Servicio gris

Relleno:
Gradiente lineal compuesto por:
- HEX: #808080
- RGB: 128, 128, 128
- HEX: #e6e6e6
- RGB: 230, 230, 230

###### Servicio verde

Relleno:
Gradiente lineal compuesto por:
- HEX: #97d077
- RGB: 151, 208, 119
- HEX: #99ffcc
- RGB: 153, 255, 204

#### Forma y estructura

- Tiene forma rectangular con esquinas redondeadas.
- Tiene borde negro de línea continua.
- Debe conservar una orientación horizontal.
- Está dividida mediante líneas horizontales en tres secciones:
    1. Nombre del servicio
    2. Nombre funcional del método
    3. Clasificación de la lógica
- El servicio puede utilizar una de las siguientes variantes de color: azul, gris o verde.
- El color utilizado debe corresponder completamente a una de las paletas definidas en la sección **Colores**.
- No se permite combinar en un mismo servicio colores de dos o más variantes.
- Independientemente de la variante seleccionada, el borde exterior, las líneas divisorias internas y el texto deben conservarse en color negro.

#### Primera sección: nombre del servicio

- Debe contener el nombre servicio.
- El texto debe cumplir con la siguiente estructura: `"Nombre Servicio"`.
- Los textos `"Nombre Servicio"` deben reemplazarse por los nombres reales del servicio.
- El nombre del servicio debe escribirse con la letra inicial de cada palabra en mayúscula.
- No se deben utilizar guiones adicionales como parte de esta estructura.

#### Segunda sección: nombre funcional del método

- Debe contener el nombre de la operación expuesta por el servicio.
- El nombre de la operación debe escribirse en formato `camelCase`.
- El nombre de la operación debe estar en inglés.
- Debe iniciar con letra minúscula.
- No debe contener espacios, guiones ni guiones bajos.
- Ejemplos válidos: enableWithdrawal, validate, createCustomer, retrieveCreditHistory.
- Ejemplos no válidos: EnableWithdrawal, enable withdrawal, enable-withdrawal, enable_withdrawal

#### Tercera sección: clasificación de la lógica

- Debe contener el modelo de servicio.
- El modelo de servicio debe corresponder a uno de los siguientes valores: entidad, utilidad o tarea.
- El modelo de servicio deben escribirse completamente en minúsculas.


### Modelos de datos asociados

- El servicio debe tener asociado un Modelo de Datos de Entrada.
- El servicio debe tener asociado un Modelo de Datos de Salida.

### Capas de despliegue
**Referencia visual:** Catálogo visual PDF, figura CV-007, página física 8 (`APIPrivadaDominioPropio.png`).
- Cuando el servicio esté modelado bajo el modelo MCI, debe estar enmarcada por las capas de despliegue definidas para su tipo.
- Las capas de despliegue aplicables deben especificarse en el documento particular del componente:`componenteServicioNoGestionado.md`, `componenteServicioGestionado.md`
- La forma, los colores, los textos, la ubicación y las demás condiciones de cada capa de despliegue deben validarse según el estándar específico de capas.

### Conexiones

- El servicio puede tener uno de los siguientes esquemas de conexión:
    1. Una línea discontinua.
    2. Dos líneas discontinuas.

- Los dos esquemas son excluyentes.
- El servicio no debe estar sin conexiones.

#### Escenario 1: conexión mediante una línea discontinua

- La línea discontinua debe estar ubicada en alguno de sus laterales.
- El triangulo sin relleno de la linea discontínua, debe apuntar hacia un componente de integración como un gestor de colas.
- El circulo sin rellano de la linea discontínua, debe apuntar hacia el servicio. 

#### Escenario 2: conexión mediante dos líneas discontinuas

- Deben existir exactamente dos líneas discontinuas asociadas al servicio.
- En la primera línea discontinua, el triángulo sin relleno debe apuntar hacia el servicio.
- En la segunda línea discontinua, el círculo sin relleno debe apuntar hacia el servicio.
- Los extremos opuestos de ambas líneas discontinuas deben conectarse con un comando de tipo consulta o con un comando de tipo sistema automatizado.


---

<a id="componenteserviciogestionadomd"></a>

# ARCHIVO: componenteServicioGestionado.md

## REGLAS BLUEPRINT API

### Servicio gestionado

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

- Cuando el servicio esté modelado bajo el modelo MCI, debe estar enmarcada por las siguientes capas de despliegue: Flujo transaccional y Capa de arquitectura.
- Cuando el servicio no esté modelado bajo MCI, debe estar enmarcada por la capa correspondiente al modelo federado.
- La ausencia de cualquiera de estas capas (MCI o federado) debe reportarse como incumplimiento.
- Las condiciones visuales, textuales y estructurales de estas capas se heredan del estándar correspondiente y no se redefinen en este documento.


### Ubicación dentro del blueprint

- Debe estar ubicado obligatoriamente en el contenedor de INTEGRACION.
- Bajo ningún motivo debe estar asociado al contenedor de DOMINIO PRODUCTOR.

#### Condiciones heredadas

Todas las demás condiciones definidas en `componenteServicioBase.md` deben cumplirse sin modificación.


---

<a id="componenteservicionogestionadomd"></a>

# ARCHIVO: componenteServicioNoGestionado.md

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

- No es obligatorio que el servicio esté enmarcado por capas de despliegue: Flujo transaccional y Capa de arquitectura.
- La ausencia de cualquiera de estas capas no debe reportarse como incumplimiento.
- Las condiciones visuales, textuales y estructurales de estas capas se heredan del estándar correspondiente y no se redefinen en este documento.

### Ubicación dentro del blueprint

- Debe estar ubicado obligatoriamente en el contenedor del DOMINIO PRODUCTOR.
- Si dentro del contenedor de DOMINIO PRODUCTOR se encuentra otro contenedor de color azul, el servicio siempre debe estar ubicado fuera del contenedor azul.

#### Condiciones heredadas

Todas las demás condiciones definidas en `componenteServicioBase.md` deben cumplirse sin modificación.


---

<a id="componentesintegracionmd"></a>

# ARCHIVO: componentesIntegracion.md

# REGLAS BLUEPRINT API

## Componentes de Integración


### 1. **Gestor de Colas - Queue Manager (MQ):**
**Referencia visual:** Catálogo visual PDF, figura CV-063, página física 64 (`GestordeColas-QueueManager(MQ).png`).

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
    **Referencia visual:** Catálogo visual PDF, figura CV-018, página física 19 (`ComandoGestorColas.png`).
    - El gestor de colas puede enlazarse con un **comando de sistema automatizado** (Ver documento `componenteServicioBase.md`) a través de dos lineas discontínuas donde:
        - La primera linea debe ir desde el componente de servicio usando el circulo sin relleno hacia el gestor de colas usando el triangulo sin relleno.
        - La segunda linea debe ir al contrario, es decir, desde gestor de colas usando el circulo sin relleno hacia el componente de servicio usando el triangulo sin relleno.

    #### Evento tipo mensaje de recepción 
    **Referencia visual:** Catálogo visual PDF, figura CV-048, página física 49 (`EventoMensajeGestorColas.png`).      
    - El gestor de colas puede enlazarse con un **evento tipo mensaje de recepción** a través de una linea discontínua desde el evento tipo mensaje usando el circulo sin relleno hacia el gestor de colas usando el triangulo sin relleno.

    #### Evento tipo mensaje de envío     
    - El gestor de colas puede enlazarse  con un evento tipo mensaje de envío (Ver documento `eventos.md`) a través de una linea discontínua desde el evento tipo mensaje usando el circulo sin relleno hacia el gestor de colas usando el triangulo sin relleno.

    #### Gestor de colas del backend
    **Referencia visual:** Catálogo visual PDF, figura CV-061, página física 62 (`GestorColasAGestorColas.png`).    
    - El gestor de colas puede enlazarse con otro **gestor de colas** ubicado en el backend a través de dos lineas discontínuas donde:
        - La primera linea debe ir desde el gestor de colas origen usando el circulo sin relleno hacia el gestor de colas del backend usando el triangulo sin relleno.
        - La segunda linea debe ir al contrario, es decir, desde gestor de colas del backend usando el circulo sin relleno hacia el gestor de colas origen usando el triangulo sin relleno.
    - El gestor de colas del backend debe estar ubicado exclusivamente en el contenedor padre de DOMINIO PRODUCTOR.
    - El gestor de colas del backend no está obligado a tener las capas de despliegue asociadas.
    - El gestor de colas del backend debe estar enlazado a un servicio no gestionado

    #### Servicio no gestionado
    **Referencia visual:** Catálogo visual PDF, figura CV-062, página física 63 (`GestorColasServicioNoGestionado.png`).  
    - El gestor de colas puede enlazarse con un servicio no gestionado con dos lineas discontínuas:
        - La primera linea debe ir desde el gestor de colas usando el circulo sin relleno hacia el servicio no gestionado usando el triangulo sin relleno.
        - La segunda linea debe ir al contrario, es decir, desde el servicio no gestionado usando el circulo sin relleno hacia el gestor de colas usando el triangulo sin relleno.
    - El servicio no gestionado debe tener alrededor un contenedor sin relleno y de borde negro con puntas redondeadas con el nombre de la cola.


### 2. **Parametrizador de Equivalencias (PEQ):**
**Referencia visual:** Catálogo visual PDF, figura CV-041, página física 42 (`Equivalencias.png`). 
**Condiciones**:
- Debe representarse como un comando de tipo sistema (Ver documento `comandos.md`) bajo el nombre de "Homologar Datos".
- Debe ir acompañado obligatoriamente de un modelo de datos de entrada (Ver documento `modelosLectura.md`)
- Debe estar ubicado obligatoriamente en el contenedor hijo del servicio de integración asociado al contenedor padre de INTEGRACIÓN (Ver documento `contenedores.md`)


### 3. **Parametrizador de Códigos de Respuesta (SPR) :**
**Referencia visual:** Catálogo visual PDF, figura CV-072, página física 73 (`SPR.png`).
**Condiciones**:
- Debe representarse como un comando de tipo sistema (Ver documento `comandos.md`) bajo el nombre de "Homologar Excepciones".
- El comando de tipo sistema debe estar enlazado en uno de sus extremos al resultado fallido de la compuerta exclusiva con una linea contínua, y el otro extremo debe estar enlazada a un evento tipo simple de excepción (Ver documento `eventos.md`.)
- Debe estar ubicado obligatoriamente en el contenedor hijo del servicio de integración asociado al contenedor padre de INTEGRACIÓN (Ver documento `contenedores.md`)  


### 4. **Transformación de Mensajería :**
**Referencia visual:** Catálogo visual PDF, figura CV-073, página física 74 (`TransformacióndeMensajería.png`). 

**Condiciones**:
- Se representa en las flechas de consumo indicando el formato de mensaje de origen y el de destino 
- Deben estar separados por una barra diagonal (por ejemplo: JSON/XML) 
- Se puede complementar con una observación adicional para detallar aspectos relevantes de la conversión  






---

<a id="compuertasmd"></a>

# ARCHIVO: compuertas.md

# REGLAS BLUEPRINT API

## Compuertas

Las compuertas o puertas de enlace son puntos de decisión que pueden ajustar la ruta de un flujo según ciertas condiciones.

- Los tipos de compuertas son:
    1. Exclusiva
    2. Paralela
    3. Basada en Eventos
    4. Paralela Basada en Eventos

### 1. **Compuerta exclusiva:**
**Referencia visual:** Catálogo visual PDF, figura CV-024, página física 25 (`CompuertaExclusiva.png`). 

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
**Referencia visual:** Catálogo visual PDF, figura CV-030, página física 31 (`EjemploCompuertaExclusiva.png`).

### 2. **Compuerta Paralela:**
**Referencia visual:** Catálogo visual PDF, figura CV-025, página física 26 (`CompuertaParalela.png`). 

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
**Referencia visual:** Catálogo visual PDF, figura CV-031, página física 32 (`EjemploCompuertaParalela.png`). ponerla


### 3. **Compuerta Basada en Eventos:**
**Referencia visual:** Catálogo visual PDF, figura CV-023, página física 24 (`CompuertaBasadaenEventos.png`).

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
**Referencia visual:** Catálogo visual PDF, figura CV-026, página física 27 (`CompuertaParalelaBasadaenEventos.png`).

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


---

<a id="contenedoresmd"></a>

# ARCHIVO: contenedores.md

# REGLAS BLUEPRINT API

## Contenedores y Carriles

### Descripción general
**Referencia visual:** Catálogo visual PDF, figura CV-028, página física 29 (`Contenedores.png`).
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
- El contenedor DOMINIO PRODUCTOR puede tener asociado un contenedor hijo, pero no es obligatorio; depende del escenario de integración y de sus reglas particulares.
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
**Referencia visual:** Catálogo visual PDF, figura CV-042, página física 43 (`EscenarioIntegracion1.png`).
- Debe visualizarse al menos el contenedor padre INTEGRACION y DOMINIO PRODUCTOR.
- El contenedor padre INTEGRACION no debe tener un contenedor hijo asociado.
- El contenedor padre DOMINIO PRODUCTOR debe a su vez tener el contenedor hijo con el nombre del servicio no gestionado que se está modelando.
- El nombre del contenedor DOMINIO PRODUCTOR puede conservarse o reemplazarse por el nombre del equipo productor del backend.
-
#### Escenario de integración 2: API con servicio de integración
**Referencia visual:** Catálogo visual PDF, figura CV-043, página física 44 (`EscenarioIntegracion2.png`).
- Debe visualizarse al menos el contenedor padre INTEGRACION y DOMINIO PRODUCTOR.
- El contenedor padre INTEGRACION debe a su vez tener el contenedor hijo con el nombre del servicio gestionado que se está modelando.
- El contenedor hijo del servicio no gestionado debe tener las capas de despliegue (Ver documento capasDespliegue.md).
- El contenedor padre DOMINIO PRODUCTOR puede tener o no un contenedor hijo asociado en el escenario 2, según los servicios representados.

#### Escenario de integración 3: Servicio no gestionado
**Referencia visual:** Catálogo visual PDF, figura CV-044, página física 45 (`EscenarioIntegracion3.png`).
- Debe visualizarse al menos el contenedor padre DOMINIO PRODUCTOR.
- El contenedor padre DOMINIO PRODUCTOR debe a su vez tener el contenedor hijo con el nombre del servicio no gestionado que se está modelando.
- El nombre del contenedor DOMINIO PRODUCTOR puede conservarse o reemplazarse por el nombre del equipo productor del backend.

### Otros contenedores

#### 1. **Sistema Externo:**
**Referencia visual:** Catálogo visual PDF, figura CV-071, página física 72 (`SistemaExterno.png`).
**Referencia visual:** Catálogo visual PDF, figura CV-040, página física 41 (`EjemploSistemaExterno.png`). 

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


---

<a id="eventosmd"></a>

# ARCHIVO: eventos.md

# REGLAS BLUEPRINT API

## Eventos

### Descripción general
- Un evento es un suceso significativo que ocurre en un sistema en un momento específico y que merece ser capturado y procesado.
- Los tipos de eventos son: 
    1. Simples
    2. Señal
    3. Mensaje
- Los eventos simples pueden ser de dominio o excepción.
- Los eventos de señal y mensaje pueden ser de recepción o envío.

### 1. **Evento tipo simple de dominio**
**Referencia visual:** Catálogo visual PDF, figura CV-052, página física 53 (`EventoTipoDominio.png`).

**Colores**

Borde:
- HEX: #bd7000
- RGB: 189,112,0

Relleno:
Gradiente radial compuesto por:
- #ffcd6a
- #ffad0b
- #d08b00

**Condiciones**:
- Reflejan un cambio de estado relevante en el sistema o funcionalidad modelada.
- Tiene forma circular
- Tiene borde simple
- No debe contener íconos internos.
- Debe utilizar los colores definidos en la sección **Colores**.
- Debe estar conectado mediante una línea contínua en sus extremos.
- La conexión de un extremo debe provenir de una compuerta exclusiva, paralela, un comando de tipo sistema automatizado, un comando de tipo sistema.
- La conexión del otro extremo debe estar unida a otro componente o artefacto del blueprint.
- Debe representar una operación completada exitosamente sobre una entidad o activo del dominio.
- El texto asociado al evento debe construirse utilizando la siguiente estructura: "Entidad o Activo" + "Verbo en pasado".
- Ejemplos válidos: Cliente creado, Cuenta creada, Cuenta eliminada, Cliente modificado, Inversión actualizada, Crédito actualizado.
- Ejemplos no válidos: Crear cliente, Crear cuenta, Eliminar cuenta, Actualización de crédito.
- Debe estar ubicado exlusivamente dentro de un contenedor hijo correspondiente al servicio gestionado o no gestionado que se este modelando (Ver documento `contenedores.md`).

### 2. **Evento tipo simple de excepción**
**Referencia visual:** Catálogo visual PDF, figura CV-053, página física 54 (`EventoTipoExcepcion.png`).

**Colores**

Borde:
- HEX: #bf0808
- RGB: 191,8,8

Relleno:
Gradiente radial compuesto por:
- #ff8f8f
- #e81313
- #bf0808

Icono interno:
- Rayo de color rojo.
- HEX: #bf0808
- RGB: 191,8,8

**Condiciones**:
- Refleja que el sistema ha generado un fallo o una condición inesperada que impide continuar normalmente la ejecución del proceso.
- Tiene forma circular.
- Tiene borde simple de color rojo.
- Contiene un icono interno de rayo.
- Debe utilizar los colores definidos en la sección **Colores**.
- Debe estar conectado mediante una línea continua en uno de sus extremos (vertical u horizontal) a un componente o artefacto.
- La conexión principal puede provenir de un comando de tipo sistema que representa un SPR (Ver documento `componentesIntegracion.md`.) o de compuerta exclusiva (Ver documento `compuertas.md`.) cuya evaluación a la pregunta asociada resulte en una condición de fallo, error o incumplimiento de una validación requerida para continuar el proceso.
- En el extremo opuesto a la conexión principal, debe estar asociado obligatoriamente a un modelo de mensaje de excepción. Sus colores, formas y textos válidos se encuentran en el documento `modelosLectura.md`.
- Debe estar ubicado exlusivamente dentro de un contenedor hijo correspondiente al servicio gestionado o no gestionado que se este modelando (Ver documento `contenedores.md`).



### 3. **Evento tipo señal de recepción**
**Referencia visual:** Catálogo visual PDF, figura CV-057, página física 58 (`EventoTipoSeñalRecepcion.png`).

**Colores**

Borde:
- HEX: #bd7000
- RGB: 189,112,0

Relleno:
Gradiente radial compuesto por:
- #ffcd6a
- #ffad0b
- #d08b00

Icono interno:
- Triángulo color blanco.
- HEX: #ffffff
- RGB: 255,255,255

**Condiciones:**
- Refleja que el sistema está esperando recibir algo para continuar con el proceso.
- Se utiliza para modelar recepción de eventos exclusivamente. Estos pueden ser de tipo query, command o event.
- Tiene forma circular.
- Tiene borde simple color dorado.
- Contiene un triángulo interno color blanco.
- Debe utilizar los colores definidos en la sección **Colores**.
- Debe estar conectado mediante una línea continua vertical superior y una línea continua vertical inferior.
- Adicionalmente debe existir una línea discontinua conectada por uno de sus laterales.
- En la línea discontinua, el triángulo sin relleno debe apuntar hacia el evento tipo señal recepción.
- El círculo sin relleno debe apuntar hacia el componente utilizado para modelar eventos tipo query, event o command que genera la señal.
- La conexión superior debe provenir de una compuerta basada en eventos o paralela basada en eventos.
- La conexión inferior debe estar unida a otro componente o artefacto del blueprint.
- El componente debe tener un texto asociado.
- El texto asociado al evento debe describir el resultado recibido por el proceso.
- El texto asociado al evento debe construirse utilizando la siguiente estructura: Activo que tuvo el cambio de estado + verbo en pasado.
- Cuando la señal corresponda a la respuesta de un query o command, el texto debe representar el resultado recibido por el proceso. Ejemplos válidos: Historial crediticio consultado, Cupo actualizado, Cliente creado, Tarjeta cancelada.
- Cuando la señal corresponda a una suscripción de un evento, el texto debe corresponder al nombre del evento recibido. Ejemplos válidos: Cliente creado, Tarjeta cancelada.
- Ejemplos no válidos: Consultar historial crediticio, Actualizar cupo, Crear cliente.
- Debe estar ubicado exlusivamente dentro de un contenedor hijo correspondiente al servicio gestionado o no gestionado que se este modelando (Ver documento `contenedores.md`).


### 4. **Evento tipo señal de envío**
**Referencia visual:** Catálogo visual PDF, figura CV-056, página física 57 (`EventoTipoSeñalEnvio.png`).

**Colores**

Borde:
- HEX: #bd7000
- RGB: 189,112,0

Relleno:
Gradiente radial compuesto por:
- #ffcd6a
- #ffad0b
- #d08b00

Icono interno:
- Triángulo color negro.
- HEX: #000000
- RGB: 0,0,0

**Condiciones:**
- Refleja que el sistema envía una señal o un cambio de estado para que sea tomado por otro sistema.
- Se utiliza para modelar el envío de señales asociadas a eventos de tipo query, command o event.
- Tiene forma circular.
- Tiene borde simple color dorado.
- Contiene un triángulo interno color negro.
- Debe utilizar los colores definidos en la sección **Colores**.
- Debe estar conectado mediante una línea continua vertical superior y una línea continua vertical inferior.
- Adicionalmente debe existir una línea discontinua conectada por uno de sus laterales.
- En la línea discontinua, el triángulo sin relleno debe apuntar hacia el componente utilizado para modelar eventos tipo query, command o event.
- El círculo sin relleno debe apuntar hacia el evento tipo señal envío.
- La conexión superior debe provenir de cualquier componente o artefacto del blueprint.
- La conexión inferior debe estar unida a otro componente o artefacto del blueprint cuando el componente al que se encuentra relacionado la linea discontinua corresponda al modelamiento de un evento de tipo event o command.
- Si el componente al que se encuentra relacionado la linea discontinua corresponde al modelamiento de un evento de tipo query, la conexión inferior debe estar unida a una compuesta basada en eventos.
- El componente debe tener un texto asociado.
- El texto debe describir la señal o evento enviado por el proceso.
- Cuando el componente al que se encuentra relacionado la linea discontinua corresponda al modelamiento de un evento de tipo query o command, el texto asociado al evento debe construirse utilizando la siguiente estructura: verbo en infinitivo + activo sobre el cual se realizará la acción. Ejemplos válidos: Consultar historia crediticio, Actualizar cupo, Crear cliente.
- Cuando el componente al que se encuentra relacionado la linea discontinua corresponda al modelamiento de un evento de tipo event, el texto asociado al evento debe construirse utilizando la siguiente estructura: Activo que tuvo el cambio de estado + verbo en pasado. Ejemplos válidos: Cupo actualizado, Cliente creado, Tarjeta cancelada.
- Debe estar ubicado exlusivamente dentro de un contenedor hijo correspondiente al servicio gestionado o no gestionado que se este modelando (Ver documento `contenedores.md`).

### 5. **Evento tipo mensaje de recepción**
**Referencia visual:** Catálogo visual PDF, figura CV-055, página física 56 (`EventoTipoMensajeRecepcion.png`).

**Colores**

Borde del evento:
- HEX: #bd7000
- RGB: 189,112,0

Relleno del evento:
Gradiente radial compuesto por:
- #ffcd6a
- #ffad0b
- #d08b00

Icono interno (sobre):

Borde:
- HEX: #bd7000
- RGB: 189,112,0

Relleno:
- HEX: #ffffff
- RGB: 255,255,255

**Condiciones:**
- Refleja que el sistema está esperando recibir algo para continuar con el proceso.
- Se utiliza para modelar recepción de mensajes asíncronos diferentes a eventos como callbacks.
- No debe utilizarse para modelar eventos de negocio publicados o suscritos.
- Tiene forma circular.
- Tiene borde simple color dorado.
- Contiene un sobre interno color blanco.
- Debe utilizar los colores definidos en la sección **Colores**.
- Debe estar conectado mediante una línea continua vertical superior y una línea continua vertical inferior.
- Adicionalmente debe existir una línea discontinua conectada por uno de sus laterales.
- En la línea discontinua, el triángulo sin relleno debe apuntar hacia el componente de integración desde donde se va a leer el mensaje, como por ejemplo un gestor de colas.
- El círculo sin relleno del otro extremo de la linea discontinua, debe apuntar hacia el evento de tipo mensaje de recepción.
- La conexión superior debe provenir de una compuerta basada en eventos o paralela basada en eventos.
- La conexión inferior debe estar unida a otro componente o artefacto del blueprint.
- El componente debe tener un texto asociado.
- El texto asociado al mensaje debe describir el mensaje recibido por el proceso como resultado de una solicitud previamente enviada o de una notificación asíncrona.
- El texto asociado al mensaje debe construirse utilizando la siguiente estructura: Activo que tuvo el cambio de estado + verbo en pasado.
- Ejemplos válidos: Callback recibido, Llaves registradas consultadas
- Ejemplos no válidos: Consultar llaves registradas, Consultar QR.
- Debe estar ubicado exlusivamente dentro de un contenedor hijo correspondiente al servicio gestionado o no gestionado que se este modelando (Ver documento `contenedores.md`).


### 6. **Evento tipo mensaje de envio**
**Referencia visual:** Catálogo visual PDF, figura CV-054, página física 55 (`EventoTipoMensajeEnvio.png`).

**Colores**

Borde del evento:
- HEX: #bd7000
- RGB: 189,112,0

Relleno del evento:
Gradiente radial compuesto por:
- #ffcd6a
- #ffad0b
- #d08b00

Icono interno (sobre):

Borde:
- HEX: #bd7000
- RGB: 189,112,0

Líneas internas del sobre:
- HEX: #ffffff
- RGB: 255,255,255

**Condiciones:**
- Refleja que el sistema envía un mensaje y sigue su curso tras la entrega.
- Se utiliza para modelar envío de mensajes asíncronos diferentes a eventos.
- No debe utilizarse para modelar eventos de negocio publicados o suscritos.
- Tiene forma circular.
- Tiene borde simple color dorado.
- Contiene un sobre interno color negro.
- Debe utilizar los colores definidos en la sección **Colores**.
- Debe estar conectado mediante una línea continua vertical superior y una línea continua vertical inferior.
- Adicionalmente debe existir una línea discontinua conectada por uno de sus laterales.
- En la línea discontinua, el triángulo sin relleno debe apuntar hacia el componente de integración donde se va a escribir o enviar el mensaje, como por ejemplo un gestor de colas.
- El círculo sin relleno del otro extremo de la linea discontinua, debe apuntar hacia el evento de tipo mensaje de envío.
- La conexión superior debe estar unida a otro componente o artefacto del blueprint.
- La conexión inferior debe estar unida a otro componente o artefacto del blueprint.
- El componente debe tener un texto asociado.
- El texto asociado al mensaje debe describir el mensaje a enviar por el proceso.
- El texto asociado al mensaje debe construirse utilizando la siguiente estructura: Verbo en initivo + Activo afectado
- Ejemplos válidos: Consultar saldo, Consultar llaves.
- Debe estar ubicado exlusivamente dentro de un contenedor hijo correspondiente al servicio gestionado o no gestionado que se este modelando (Ver documento `contenedores.md`).





---

<a id="modeloslecturamd"></a>

# ARCHIVO: modelosLectura.md

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
**Referencia visual:** Catálogo visual PDF, figura CV-067, página física 68 (`ModeloEntrada.png`).
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
**Referencia visual:** Catálogo visual PDF, figura CV-069, página física 70 (`ModeloSalida.png`). 
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
**Referencia visual no localizada en catálogo:** `Politica.png` (revisión manual; no inventar correspondencia) 

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
- Debe estar acompañada de **al menos uno** de los siguientes tipos de comando, según la lógica modelada: sistema automatizado, usuario, consulta, sistema o subproceso.
- Los cinco tipos son **alternativas válidas**, no requisitos simultáneos. Es suficiente identificar uno de ellos asociado a la política; pueden aparecer varios.
- La asociación debe sustentarse en el contexto y proximidad representada en el blueprint; no se exige línea directa entre política y comando, porque este mismo estándar prohíbe conexiones de líneas desde la política.
- Puede ir al lado de las compuertas exclusivas pero no es obligatorio.
- Puede ir al lado de las compuertas paralelas pero no es obligatorio.
- Puede ir al lado de las compuertas basada en eventos pero no es obligatorio.
- Puede ir al lado de las compuertas paralela basada en eventos pero no es obligatorio.
- Cuando la politica se ubica al lado de una compuerta exclusiva, el texto incluido en ella debe tener sentido con la pregunta asociada a la compuerta.
- Este modelo debe estar ubicado exlusivamente dentro de un contenedor hijo correspondiente al servicio gestionado o no gestionado que se este modelando (Ver documento `contenedores.md`).


### 4. **Mensaje de Excepción:**
**Referencia visual:** Catálogo visual PDF, figura CV-058, página física 59 (`ExcepciondeNegocio(MensajedeExcepción).png`). 
**Referencia visual:** Catálogo visual PDF, figura CV-032, página física 33 (`EjemploExcepciondeNegocio(MensajedeExcepción).png`).
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
**Referencia visual:** Catálogo visual PDF, figura CV-070, página física 71 (`Pendientes.png`). 

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
**Referencia visual:** Catálogo visual PDF, figura CV-027, página física 28 (`Concepto.png`). 

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


---

<a id="simbolosmd"></a>

# ARCHIVO: simbolos.md

# REGLAS BLUEPRINT API

## Simbolos

Se utilizan para representar el inicio, fin, conectar elementos y agregar comentarios en el flujo del proceso.

### 1. **Inicio :**
**Referencia visual:** Catálogo visual PDF, figura CV-065, página física 66 (`Inicio.png`).

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
**Referencia visual:** Catálogo visual PDF, figura CV-036, página física 37 (`EjemploInicio2.png`). 
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
**Referencia visual:** Catálogo visual PDF, figura CV-035, página física 36 (`EjemploInicio.png`).
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
**Referencia visual:** Catálogo visual PDF, figura CV-037, página física 38 (`EjemploInicioNoGestionado.png`).
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
**Referencia visual:** Catálogo visual PDF, figura CV-059, página física 60 (`Fin.png`). 

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
**Referencia visual:** Catálogo visual PDF, figura CV-060, página física 61 (`FlujoMensaje.png`).

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
    **Referencia visual:** Catálogo visual PDF, figura CV-066, página física 67 (`InteracciónAPI.png`). 
    **Referencia visual:** Catálogo visual PDF, figura CV-033, página física 34 (`EjemploFlujoMensaje.png`)..
    - Para conectar un comando de sistema automatizado (Ver documento `artefactos.md`) hacia una API privada, pública o partner (Ver documento `componenteApiBase.md` en la sección conexiones).
    - Para conectar un comando de consulta (Ver documento `artefactos.md`) hacia una API privada, pública o partner (Ver documento `componenteApiBase.md` en la sección conexiones)
    - Para conectar un comando de consulta (Ver documento `artefactos.md`) hacia un servicio no gestionado (Ver documento `componenteServicioBase.md` en la sección conexiones).
    - Para conectar un evento de tipo señal envío o recepción (Ver documento `eventos.md`) hacia un componente de evento con o sin respuesta (Ver documento `componenteEventoBase.md` en la sección conexiones).
    - Para conectar un comando de sistema automatizado o de consulta (Ver documento `artefactos.md`) hacia un gestor de colas (Ver documento `componentesIntegracion.md`).
    - Para conectar dos gestores de colas (Ver documento `componentesIntegracion.md`).


### 4. **Anotación :**
**Referencia visual:** Catálogo visual PDF, figura CV-001, página física 2 (`Anotación.png`).
**Referencia visual:** Catálogo visual PDF, figura CV-002, página física 3 (`Anotaciónenchufe.png`). 
**Condiciones**:
- Este tipo de símbolo debe tener un comentario y/o observación y puede estar en cualquier parte del flujo.
- Puede estar ubicado en cualquiera de los contenedores del blueprint para dar claridad a algo relacionado. Ver documento `contenedores.md`
- Debe estar conectado

### 5. **Linea contínua:**
**Referencia visual:** Catálogo visual PDF, figura CV-064, página física 65 (`Herencia.png`). 

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
