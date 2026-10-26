# PROPUESTA DE PREGUNTAS PARA LA ANALISTA

> **Documento de revisión. No es normativa aprobada.** El texto de las 37 reglas es la obligación literal de la analista; todas las decisiones abiertas se presentan como **abiertas**. Nada de lo que sigue crea o modifica una obligación.

Cada ficha trae el problema, las reglas afectadas, la evidencia encontrada, las alternativas, la recomendación del equipo técnico, la pregunta concreta y un espacio para responder. Las recomendaciones son técnicas y **no** son decisiones. No se incluyen las 20 decisiones ya cerradas (sección 6 del consolidado).

## Índice

| Orden | ID | Tema | Prioridad | Reglas | Bloquea |
|---:|---|---|---|---|---|
| 1 | C-01 | SRV-001 y SRV-002: criterio y población | P0 | SRV-001, SRV-002 | Sí |
| 2 | C-02 | Paquete cerrado y versionado | P0 | Todas (condición global) | Sí |
| 3 | C-04 | Certificar API, servicio o evento de integración en figuras no principales | P1 | API-001, API-002, API-003, EXT-002, SRV-003, COM-002, COM-003, EVT-001, EVT-002, EVT-003, MQ-003 | No |
| 4 | C-05 | Definición de «invocado» | P1 | SRV-003, COM-002, COM-003, MQ-003 | No |
| 5 | C-06 | Cómo se reconocen las figuras de la norma | P1 | EVT-001, EVT-002, EVT-003, EVT-004, EVT-005, EVT-006, EVT-007, MQ-002, CNT-003, CNT-004, CNT-005 | No |
| 6 | C-07 | Convención de subtipos BPMN | P1 | E1-001, E2-001, E3-001, EVT-007, MQ-003 | No |
| 7 | C-08 | E1/E2/E3-001: violación estructural certificada con Inicio sin certificar | P1 | E1-001, E2-001, E3-001 | No |
| 8 | C-03 | Cobertura completa, ausencia demostrada y «No aplica» uniforme | P2 | Todas (condición global) | No |
| 9 | C-09 | Criterios subjetivos (específico, genérico, plantilla, idioma, infinitivo) | P2 | CNT-002, GW-001, API-001, API-002, API-003, SRV-003, EVT-001, EVT-002, COM-001, MQ-001 | No |
| 10 | C-10 | EXT-001 y CNT-005 frente a diagramas reales | P2 | EXT-001, CNT-005 | No |
| 11 | C-12 | Comandos: «relación identificable» y «atribución inequívoca» | P2 | COM-001, COM-005 | No |
| 12 | C-13 | MOD-001: ¿un grupo compartido es asociación inequívoca? | P2 | MOD-001 | No |
| 13 | C-11 | Erratas y precisiones editoriales (lote) | P3 | EXT-002, API-003, API-004, EVT-005, EVT-006, EVT-007, CNT-003, CNT-004, SRV-003 | Sí |
| 14 | Q-CNT-002 | CNT-002 con un hijo defectuoso (vinculada a C-03) | P2 | CNT-001, CNT-002 | No |

## A. Preguntas normativas

---

### Pregunta 1 — C-01 · SRV-001 y SRV-002: criterio y población

Clase: Normativa (analista) · Prioridad: P0 · Estado: **ABIERTA**

**Reglas afectadas:** SRV-001, SRV-002

**Problema.** La analista declara estas dos reglas pendientes. El texto vigente es el heredado de la versión anterior («Servicios principal e invocados») y no permite decidir a quién se aplica ni qué se exige.

**Evidencia encontrada.** En el corpus de 7 blueprints reales hay 5 componentes SERVICIO reconocidos por el prefijo «ms». Los nombres de los hijos principales son heterogéneos (con prefijo en la mayoría; en otros casos nombre descriptivo sin prefijo). El contenedor hijo tiene una sola sección de texto: no existe segunda sección (operación). SRV-003 ya excluye al hijo principal y SRV-004 lo trata como «servicio principal» (Ejemplo A).

**Alternativas.**

- (1) Población = servicios invocados + componente principal de E3; formato paralelo a API-001/API-002, con el prefijo «ms» como señal convencional. El hijo principal se valida por nombre en CNT-002.
- (2) Incluir también al hijo principal de E1/E2: SRV-002 no sería evaluable en un contenedor sin operación (quedaría No verificable).
- (3) Retirar ambas reglas y absorber el nombramiento en otra regla.

**Recomendación técnica (no es una decisión).** Alternativa (1).

**Pregunta concreta.** ¿A qué componentes se aplican SRV-001 y SRV-002 (servicio principal de E3, servicios invocados, hijo principal de E1/E2)? ¿Qué formato de nombre y de operación se exige, y es el prefijo «ms» obligatorio o solo convencional? ¿Se mantienen ambas reglas?

**Si no se resuelve.** Dos de las 37 reglas darán siempre «No verificable: criterio pendiente» y bajarán el porcentaje sin sustento normativo.

**Ejemplo:** A (sección 8 del consolidado).

**Respuesta de la analista:**

☐ Acepta la recomendación · ☐ Elige otra alternativa: ______ · ☐ Responde con texto:

_______________________________________________

Fecha y firma: ______________

---

### Pregunta 2 — C-02 · Paquete cerrado y versionado

Clase: Normativa (analista) y de versionado (Andrés) · Prioridad: P0 · Estado: **ABIERTA**

**Reglas afectadas:** Todas (condición global)

**Problema.** El paquete entregado por la analista mezcla material de 37 y de 41 reglas y su etiqueta de versión colisiona con la nuestra.

**Evidencia encontrada.** El CSV del paquete contiene las 41 reglas históricas y su nombre difiere del que cita el manifiesto; el contrato compacto y las instrucciones piden «41 filas»; los siete archivos de reglas se titulan «v11.2.1»; el manifiesto lista un recurso («catalogo-reglas-vigente.csv») que no existe.

**Alternativas.**

- (a) Una versión única del paquete (propuesta: v12.0.0-rc.1).
- (b) Versión normativa (N) separada de la versión de procedimiento (P).
- (c) Combinar: paquete único con un registro de N, P y del hash del texto normativo.

**Recomendación técnica (no es una decisión).** Alternativa (c).

**Pregunta concreta.** ¿Confirma que el contenido normativo del paquete son exactamente las 37 reglas y los principios generales de este documento, sin el CSV de 41 reglas ni el resto de material histórico? La nomenclatura de versiones la decide Andrés (ver sección de implementación).

**Si no se resuelve.** Colisión de etiquetas, resultados no reproducibles y regreso de referencias a 41 reglas.



**Respuesta de la analista:**

☐ Acepta la recomendación · ☐ Elige otra alternativa: ______ · ☐ Responde con texto:

_______________________________________________

Fecha y firma: ______________

---

### Pregunta 3 — C-04 · Certificar API, servicio o evento de integración en figuras no principales

Clase: Normativa (analista) · Prioridad: P1 · Estado: **ABIERTA**

**Reglas afectadas:** API-001, API-002, API-003, EXT-002, SRV-003, COM-002, COM-003, EVT-001, EVT-002, EVT-003, MQ-003

**Problema.** Las reglas exigen un «tipo arquitectónico certificado», pero hoy solo se certifica la API o el servicio principal. Las figuras UMLClassBlock restantes quedan sin tipo.

**Evidencia encontrada.** 62 UMLClassBlock sin tipo en el corpus. Tercera sección: «entidad» sola en 30; plantillas de leyenda en 24; «Empresarial - Event/Query» en 5; otras en 3. Las APIs principales llevan «private - entidad» o «entidad». La guía de lectura dice que ni «Private/Public/Partner» demuestran API ni «Entidad/Utilidad/Tarea» demuestran servicio (Ejemplo B).

**Alternativas.**

- (A) Declaración de la analista por componente (exige relajar la restricción de la guía para este uso).
- (B) La tercera sección determina el tipo (los datos reales lo refutan en parte: 30 componentes dicen solo «Entidad»).
- (C) El formato de la primera sección: «Producto - Nombre vX.Y.Z» ⇒ candidato a API; prefijo «ms» ⇒ servicio.
- (D) Mantener No verificable.

**Recomendación técnica (no es una decisión).** Pedir el discriminador a la analista; mientras tanto, (D).

**Pregunta concreta.** ¿Cómo se distingue en un diagrama una API, un servicio y un evento de integración que no son el componente principal? Indique el rasgo gráfico o textual determinante.

**Si no se resuelve.** API-001/002/003 (invocadas), SRV-003, COM-002/003, EXT-002, MQ-003 y EVT-001/002/003 quedan «No verificable» de forma sistemática.

**Ejemplo:** B (sección 8 del consolidado).

**Respuesta de la analista:**

☐ Acepta la recomendación · ☐ Elige otra alternativa: ______ · ☐ Responde con texto:

_______________________________________________

Fecha y firma: ______________

---

### Pregunta 4 — C-05 · Definición de «invocado»

Clase: Normativa (analista) · Prioridad: P1 · Estado: **ABIERTA**

**Reglas afectadas:** SRV-003, COM-002, COM-003, MQ-003

**Problema.** SRV-003, COM-002, COM-003 y MQ-003 hablan de API o servicio «invocado» sin definirlo. La implementación actual lo entiende de una forma que contradice el patrón bidireccional que las propias reglas COM exigen.

**Evidencia encontrada.** El rol INVOCADO se emite solo si el componente es API o servicio, recibe conexión y no tiene ninguna conexión saliente. El patrón normativo de COM-002/003 usa dos líneas (una por sentido), de modo que siempre hay conexión saliente. En el corpus: 0 componentes con rol INVOCADO y 56 pares comando-componente bidireccionales frente a 5 de un solo sentido (Ejemplo C).

**Alternativas.**

- (a) Invocado = componente que no es principal y está relacionado con un comando por conexión.
- (b) Invocado = no principal y no hijo, con el tipo certificado según C-04, sin usar un rol.
- (c) Mantener la definición actual y aceptar «No verificable».

**Recomendación técnica (no es una decisión).** (a) o (b), según lo que se decida en C-04. Sin cambios de código hasta que la analista lo apruebe.

**Pregunta concreta.** ¿Qué es un servicio o API «invocado»? ¿Basta que no sea el principal ni el hijo y esté conectado con un comando?

**Si no se resuelve.** El rol que las reglas necesitan nunca se emite en el patrón que ellas mismas exigen.

**Ejemplo:** C (sección 8 del consolidado).

**Respuesta de la analista:**

☐ Acepta la recomendación · ☐ Elige otra alternativa: ______ · ☐ Responde con texto:

_______________________________________________

Fecha y firma: ______________

---

### Pregunta 5 — C-06 · Cómo se reconocen las figuras de la norma

Clase: Normativa (analista) · Prioridad: P1 · Estado: **ABIERTA**

**Reglas afectadas:** EVT-001, EVT-002, EVT-003, EVT-004, EVT-005, EVT-006, EVT-007, MQ-002, CNT-003, CNT-004, CNT-005

**Problema.** Las listas de contenido permitido y las reglas de eventos y de gestor dependen de reconocer figuras (evento de integración, Capa de Tópicos, tópico, «Federado», concepto, pendiente, política) para las que no existe una representación acordada.

**Evidencia encontrada.** «Federado»: contenedor o texto con el literal exacto, 8 casos, asociación al gestor sin definir. Evento de integración: UMLClassBlock con «Empresarial - Event/Query» (5 casos), sin tipo. Capa de Tópicos y tópicos: 1 ocurrencia en todo el corpus. Concepto, pendiente y política: no se identificaron.

**Alternativas.**

- Reconocer por clase de figura de la herramienta.
- Reconocer por texto literal.
- Reconocer por datos personalizados (customData).

**Recomendación técnica (no es una decisión).** Que la analista confirme o complete la tabla de reconocimiento (siete filas abiertas).

**Pregunta concreta.** Para cada figura de la tabla: ¿cómo se reconoce en Lucidchart (clase, texto o dato personalizado) y cómo se asocia «Federado» a su gestor?

**Si no se resuelve.** CNT-003/004/005, EVT-001…007 y MQ-002 darán «No verificable» aunque el literal exista en el diagrama.

**Ejemplo:** B (sección 8 del consolidado).

**Respuesta de la analista:**

☐ Acepta la recomendación · ☐ Elige otra alternativa: ______ · ☐ Responde con texto:

_______________________________________________

Fecha y firma: ______________

---

### Pregunta 6 — C-07 · Convención de subtipos BPMN

Clase: Normativa (analista) · Prioridad: P1 · Estado: **ABIERTA**

**Reglas afectadas:** E1-001, E2-001, E3-001, EVT-007, MQ-003

**Problema.** Las reglas piden subtipos concretos de evento BPMN (Inicio, Señal de Envío, Señal de Recepción, Mensaje) que la exportación de Lucidchart no distingue.

**Evidencia encontrada.** 260 eventos en el corpus; la exportación no trae ninguna propiedad de subtipo; ninguno tiene datos personalizados; el texto «FIN» aparece en 19. «Mensaje» y «Señal» aparecen solo en leyendas y páginas de requisitos. El catálogo propuesto por el equipo técnico (inicio, fin, señal, recepción, excepción) no cubre Mensaje ni Envío (Ejemplo D).

**Alternativas.**

- (a) Declarar el subtipo con una convención de datos personalizados, ampliando el catálogo.
- (b) Otro mecanismo de la herramienta: descartado, el export no lo contiene.
- (c) Texto convencional: contradice la regla (el texto no certifica).
- (d) Aceptar «No verificable» permanente.

**Recomendación técnica (no es una decisión).** (a) solo si el estándar corporativo ya lo exige; si no, (d).

**Pregunta concreta.** ¿Existe un estándar corporativo para marcar el subtipo de un evento BPMN en Lucidchart? Si existe, ¿cuál es la convención exacta (propiedad y valores)?

**Si no se resuelve.** E1-001, E2-001, E3-001, EVT-007 y MQ-003 (Mensaje) no pueden dar «Cumple».

**Ejemplo:** D (sección 8 del consolidado).

**Respuesta de la analista:**

☐ Acepta la recomendación · ☐ Elige otra alternativa: ______ · ☐ Responde con texto:

_______________________________________________

Fecha y firma: ______________

---

### Pregunta 7 — C-08 · E1/E2/E3-001: violación estructural certificada con Inicio sin certificar

Clase: Normativa (analista) · Prioridad: P1 · Estado: **ABIERTA**

**Reglas afectadas:** E1-001, E2-001, E3-001

**Problema.** El texto se contradice: el principio de prioridad dice que un incumplimiento certificado prevalece, pero la viñeta «No cumple» de cada regla exige además el subtipo Inicio certificado.

**Evidencia encontrada.** 12 escenarios reales; ninguno con Inicio certificado. Con la lectura literal de la viñeta, ninguna violación estructural puede dar «No cumple» mientras el Inicio no se certifique.

**Alternativas.**

- (a) «No cumple» si la violación estructural está certificada, aunque el Inicio no lo esté.
- (b) «No verificable» mientras el Inicio no esté certificado (lectura literal).

**Recomendación técnica (no es una decisión).** (a), ajustando la viñeta «No cumple».

**Pregunta concreta.** En E1, E2 o E3, si la estructura contradice el escenario de forma certificada pero el Inicio no está certificado, ¿el resultado es «No cumple» o «No verificable»?

**Si no se resuelve.** Resultados distintos para la misma página entre ejecuciones.

**Ejemplo:** D (sección 8 del consolidado).

**Respuesta de la analista:**

☐ Acepta la recomendación · ☐ Elige otra alternativa: ______ · ☐ Responde con texto:

_______________________________________________

Fecha y firma: ______________

---

### Pregunta 8 — C-03 · Cobertura completa, ausencia demostrada y «No aplica» uniforme

Clase: Normativa (analista) · Prioridad: P2 · Estado: **ABIERTA**

**Reglas afectadas:** Todas (condición global)

**Problema.** Casi todas las reglas condicionan «No cumple» por ausencia y «No aplica» a una «cobertura completa» o «suficiente» que ningún archivo define.

**Evidencia encontrada.** El contrato publica contadores, incidencias (issues), páginas omitidas y estado de los grupos, pero no existe una definición de cobertura ni una tabla incidencia → regla. Las incidencias que publica el motor se han catalogado (identificadores duplicados o ausentes, referencias de contención inexistentes, ciclos, padres en conflicto, datos personalizados malformados, nombres reservados ambiguos, conflictos de grupo, líneas con extremos inexistentes, escenario no determinado y páginas omitidas).

**Alternativas.**

- (a) Una definición general: inventario completo = contadores coherentes con el inventario y ninguna incidencia sobre los componentes implicados ni sobre su cadena de contención.
- (b) Una definición por regla.

**Recomendación técnica (no es una decisión).** Alternativa (a), más la tabla incidencia → regla; la redacta el equipo técnico y la aprueba la analista.

**Pregunta concreta.** ¿Acepta una definición única de «cobertura completa» como la propuesta? ¿Una incidencia estructural que afecta a un componente impide siempre «No cumple» por ausencia (y deja la regla en «No verificable»)?

**Si no se resuelve.** «No cumple» por ausencia sin criterio uniforme; ya se observó variabilidad entre ejecuciones.



**Respuesta de la analista:**

☐ Acepta la recomendación · ☐ Elige otra alternativa: ______ · ☐ Responde con texto:

_______________________________________________

Fecha y firma: ______________

---

### Pregunta 9 — C-09 · Criterios subjetivos (específico, genérico, plantilla, idioma, infinitivo)

Clase: Normativa (analista) · Prioridad: P2 · Estado: **ABIERTA**

**Reglas afectadas:** CNT-002, GW-001, API-001, API-002, API-003, SRV-003, EVT-001, EVT-002, COM-001, MQ-001

**Problema.** Las reglas usan juicios («específico», «genérico», «texto de plantilla», «funcional», idioma inglés, verbo en infinitivo) sin listas cerradas que permitan aplicarlos de forma repetible.

**Evidencia encontrada.** Los términos aparecen decenas de veces en las 37 reglas. El motor solo conoce una lista cerrada de textos de plantilla. En la validación de la versión anterior, CNT-002 y CNT-004 variaron entre ejecuciones.

**Alternativas.**

- Listas cerradas aprobadas.
- Juicio del evaluador con justificación obligatoria.
- No verificable cuando no haya certeza.

**Recomendación técnica (no es una decisión).** Listas cerradas de plantilla y de términos genéricos; el resto, juicio justificado; sin certeza, «No verificable».

**Pregunta concreta.** ¿Aprueba una lista cerrada de textos de plantilla y de nombres genéricos (por ejemplo «NOMBRE SERVICIO», «Service», «Servicio»)? ¿Qué reglas deben quedar fuera de las listas y resolverse por juicio?

**Si no se resuelve.** Discrepancias entre ejecuciones en al menos 10 reglas (CNT-002, GW-001, API-001, API-002, API-003, SRV-003, EVT-001/002, COM-001, MQ-001).



**Respuesta de la analista:**

☐ Acepta la recomendación · ☐ Elige otra alternativa: ______ · ☐ Responde con texto:

_______________________________________________

Fecha y firma: ______________

---

### Pregunta 10 — C-10 · EXT-001 y CNT-005 frente a diagramas reales

Clase: Normativa (analista) · Prioridad: P2 · Estado: **ABIERTA**

**Reglas afectadas:** EXT-001, CNT-005

**Problema.** Las listas de contenido permitido de EXT-001 (auxiliares) y CNT-005 (SISTEMAS EXTERNOS) no coinciden con lo que contienen los diagramas reales; además un gestor externo ya no tiene ubicación válida.

**Evidencia encontrada.** De 34 auxiliares reales, 21 contienen eventos BPMN y 11 contienen actividades (comandos); 4 auxiliares están vacíos; 28 grupos BPMN sin nombre, todos vacíos. EXT-001 deja «No verificable» ante un evento interno y dice «requiere revisión manual del analista» (Ejemplo G).

**Alternativas.**

- (a) Mantener la lista y aceptar que muchos diagramas reales darán «No cumple» o «No verificable».
- (b) Ampliar la lista (actividades, eventos) donde fue una omisión.
- (c) Definir la «revisión manual» como una pregunta autorizada.

**Recomendación técnica (no es una decisión).** Confirmar con casos reales.

**Pregunta concreta.** (1) ¿Los comandos y eventos dentro de un auxiliar están prohibidos, o se omitieron de la lista? (2) «Requiere revisión manual del analista»: ¿es una pregunta que el agente debe hacerle, o solo «No verificable»? (3) Un gestor de colas en SISTEMAS EXTERNOS no tiene ubicación válida: ¿es intencional?

**Si no se resuelve.** EXT-001 daría «No cumple» en diagramas reales por contenido que quizá la lista olvidó, o se pediría revisión manual sin protocolo.

**Ejemplo:** G (sección 8 del consolidado).

**Respuesta de la analista:**

☐ Acepta la recomendación · ☐ Elige otra alternativa: ______ · ☐ Responde con texto:

_______________________________________________

Fecha y firma: ______________

---

### Pregunta 11 — C-12 · Comandos: «relación identificable» y «atribución inequívoca»

Clase: Normativa (analista) · Prioridad: P2 · Estado: **ABIERTA**

**Reglas afectadas:** COM-001, COM-005

**Problema.** COM-001 habla de una «relación identificable» y COM-005 de una conexión que «no pueda atribuirse inequívocamente»; ninguna de las dos expresiones está definida.

**Evidencia encontrada.** 61 pares comando-componente por conexión en el corpus; en la versión anterior se atribuía cuando había un único candidato compatible (Ejemplo G).

**Alternativas.**

- (a) Relación = conexión directa (no pertenencia a un grupo). Atribución inequívoca = el auxiliar encapsula exactamente un componente compatible o la línea termina en el componente.
- (b) Una definición más amplia que incluya grupos.

**Recomendación técnica (no es una decisión).** (a).

**Pregunta concreta.** ¿Qué es una «relación identificable» entre un comando y otro componente? ¿Cuándo una conexión con un auxiliar «se atribuye inequívocamente» a un componente interno?

**Si no se resuelve.** Variabilidad en COM-001 y COM-005.

**Ejemplo:** G (sección 8 del consolidado).

**Respuesta de la analista:**

☐ Acepta la recomendación · ☐ Elige otra alternativa: ______ · ☐ Responde con texto:

_______________________________________________

Fecha y firma: ______________

---

### Pregunta 12 — C-13 · MOD-001: ¿un grupo compartido es asociación inequívoca?

Clase: Normativa (analista) · Prioridad: P2 · Estado: **ABIERTA**

**Reglas afectadas:** MOD-001

**Problema.** MOD-001 exige que los modelos de entrada y salida estén asociados a su API; la regla dice que la cercanía, la alineación o el mismo contenedor no bastan, pero no dice nada de los grupos.

**Evidencia encontrada.** En páginas evaluables: 20 modelos en un grupo único con el principal, 59 en grupos sin el principal y 43 sin grupo. En 10 de 14 páginas, ENTRADA y SALIDA del principal están en un grupo con él (Ejemplo E).

**Alternativas.**

- (a) Un grupo con el principal es asociación.
- (b) Un grupo no basta.
- (c) Basta solo si el grupo contiene un único propietario posible.

**Recomendación técnica (no es una decisión).** (c).

**Pregunta concreta.** ¿Se considera inequívocamente asociado un modelo que comparte grupo con su API? Si el grupo contiene más de un posible propietario, ¿qué resultado corresponde?

**Si no se resuelve.** MOD-001 no puede dar «Cumple» ni «No cumple» con un criterio estable.

**Ejemplo:** E (sección 8 del consolidado).

**Respuesta de la analista:**

☐ Acepta la recomendación · ☐ Elige otra alternativa: ______ · ☐ Responde con texto:

_______________________________________________

Fecha y firma: ______________

---

### Pregunta 13 — C-11 · Erratas y precisiones editoriales (lote)

Clase: Normativa (analista) · Prioridad: P3 · Estado: **ABIERTA**

**Reglas afectadas:** EXT-002, API-003, API-004, EVT-005, EVT-006, EVT-007, CNT-003, CNT-004, SRV-003

**Problema.** Hay erratas y ambigüedades menores en el texto vigente que no se corrigen sin aprobación de la analista.

**Evidencia encontrada.** Nueve puntos (ver pregunta).

**Alternativas.**

- Aceptar o rechazar cada corrección propuesta.

**Recomendación técnica (no es una decisión).** Una sola pasada de la analista.

**Pregunta concreta.** 1) EXT-002 se cita a sí misma («sus conexiones se evalúan mediante EXT-002»): ¿a qué regla debe remitir? 2) EXT-002: «contenga EVC, EPC o LDC», ¿palabra completa o subcadena? 3) API-004: «presenta todo la capa de despliegue» (¿«toda»?). 4) EVT-005, EVT-006, EVT-007: la viñeta «No aplica» contiene casos de «No verificable». 5) CNT-003 y CNT-004: el hijo principal no figura entre lo permitido en el nivel padre aunque la regla lo presupone. 6) SRV-003 admite cualquier capitalización y API-003 exige minúsculas: ¿es intencional? 7) El manifiesto menciona una «antigua EXT-003» que no existe en el catálogo de 41 reglas. 8) Catorce reglas no repiten «prevalece No cumple» y dependen de la regla global de prioridad: ¿es suficiente? 9) Para conocimiento (no es una pregunta): el equipo excluye de la evaluación las páginas plantilla, leyenda y de requisitos, sin filas ni porcentaje; la cláusula «No aplica» por plantilla de cada regla es equivalente en la métrica porque «No aplica» sale del denominador. La diferencia es de presentación: ¿prefiere ver las 37 filas «No aplica» o solo el motivo de exclusión?

**Si no se resuelve.** Ambigüedad menor, pero inestabiliza las pruebas. Es bloqueante para generar el paquete porque cambia texto normativo.



**Respuesta de la analista:**

☐ Acepta la recomendación · ☐ Elige otra alternativa: ______ · ☐ Responde con texto:

_______________________________________________

Fecha y firma: ______________

---

### Pregunta 14 — Q-CNT-002 · CNT-002 y CNT-001 con un hijo o un dominio defectuoso

Clase: Normativa (analista), vinculada a C-03 · Prioridad: P2 · Estado: **ABIERTA** · No modifica el texto de CNT-002 ni exige el Inicio.

**Reglas afectadas:** CNT-001, CNT-002

**Problema.** «No cumple» exige un patrón estructural E1, E2 o E3 certificado. Pero ese patrón se identifica a partir del propio hijo: si el hijo falta, está duplicado o está en un dominio no exigido, no hay patrón que certificar y la regla queda en «No verificable».

**Evidencia encontrada** (diagramas sintéticos, ejemplo F): con nombre vacío, solo espacios, genérico o plantilla, el patrón E1 se identifica (estado HIPOTESIS) y «No cumple» es demostrable. Con dos hijos, hijo en SISTEMAS EXTERNOS o sin hijo, el patrón no se publica. En ningún caso falta información en el diagrama: el contenedor, su evento, su línea y su dominio están presentes.

**Alternativas.**

- (a) El patrón es identificable por la estructura general (API → evento → contenedor) aunque el hijo sea defectuoso; entonces «no existe», «más de uno» y «dominio distinto» son demostrables.
- (b) El patrón solo es identificable con un hijo único y bien ubicado; entonces esas tres situaciones son siempre «No verificable» (lectura actual).
- (c) Otra definición.

**Recomendación técnica (no es una decisión).** Alternativa (a), definiendo qué figura es «candidato a hijo principal».

**Pregunta concreta.** ¿Cuándo se considera identificable el patrón estructural si el hijo falta, está duplicado o está en un dominio no exigido? ¿Qué figura es un candidato a hijo principal: cualquier contenedor, o el que tiene un evento conectado con la API?

**Si no se resuelve.** Tres de las cuatro familias de «No cumple» de CNT-002 quedan siempre en «No verificable».

**Ejemplo:** F (sección 8 del consolidado).

**Respuesta de la analista:**

☐ Acepta la recomendación · ☐ Elige otra alternativa: ______ · ☐ Responde con texto:

_______________________________________________

Fecha y firma: ______________

## B. Propuestas técnicas

Las redacta el equipo técnico. Habilitadas por las respuestas anteriores.

| ID | Propuesta | Habilitada por | Quién decide |
|---|---|---|---|
| PT-01 | Definición única de cobertura completa y tabla incidencia → regla | C-03 | Redactada por el equipo técnico; la aprueba la analista |
| PT-02 | Listas cerradas de plantilla y de nombres genéricos (borrador) | C-09 | Borrador del equipo técnico; la aprueba la analista |
| PT-03 | Tabla de reconocimiento de figuras prellenada con ocurrencias reales | C-06 | Prellenada; la completa la analista |
| PT-04 | Convención de datos personalizados para el subtipo de evento | C-07 | Solo si el estándar corporativo ya lo exige |
| PT-05 | Redefinir el rol INVOCADO (EC-01) y clasificar figuras no principales (EC-06) | C-04, C-05 | Cambio de comportamiento del contrato; lo decide Andrés tras la analista |
| PT-06 | Publicar candidatos a hijo y patrón candidato aunque el escenario no esté determinado (EC-11) | Pregunta CNT-002 | Aditivo; lo decide Andrés tras la analista |
| PT-07 | Publicar Capa sin Flujo, «Federado» y el hijo por grupos (EC-04) | C-06 | Aditivo; Andrés |

## C. Decisiones de Andrés (no se piden a la analista)

| ID | Asunto | Momento |
|---|---|---|
| A-1 | Nomenclatura y versión del paquete (C-02) y fecha de cierre del catálogo | Bloquea la Skill v12 candidata |
| A-2 | Actualizar AGENTS.md: retirar F-13, pasar a 37 reglas, MCI del hijo solo en E1/E2, UMLActiveClassBlock como norma | Pendiente; no se hace en esta fase |
| A-3 | Adaptar la Skill vigente: retirar «no se extiende a CNT-002», «evaluar API-004/CA-001/FT-001 por separado», el criterio operativo de CNT-006 y la «duda de población» | Al generar la v12 |
| A-4 | Avisar a la analista del tratamiento de páginas plantilla (se incluye como nota en C-11, punto 9) | Informativo |
| A-5 | SKILL_VERSION en el código (hoy 11.2.1) y metadatos de versión | Al implementar |
| A-6 | Plan de migración del banco QA de 41 a 37 reglas | Al implementar |
| A-7 | Política de variabilidad para los criterios subjetivos (parte de C-09) | Tras la respuesta de la analista |
| A-8 | Aprobar o descartar los cambios técnicos EC-01…EC-11 del contrato y del motor | Tras las respuestas de la analista |

## D. Qué hacer con las respuestas

1. Una respuesta solo cambia el catálogo si la analista entrega un paquete nuevo de reglas; las respuestas de este cuestionario no modifican por sí mismas el texto.
2. Las respuestas a P1 y P2 se registran como decisiones de la analista y habilitan los cambios técnicos de la sección B.
3. Mientras una decisión siga abierta, las reglas afectadas se informan como «No verificable» con la causa; no se infiere nada.