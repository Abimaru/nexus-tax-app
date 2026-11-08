# Prompt maestro para analistas - v2

Uso: adjuntar el `<Nombre>-ENRIQUECIDO.json` al chat del agente (BlueGuard), copiar y pegar el texto de abajo sin cambiarlo y enviar. Responder las preguntas MCI que haga el agente. Al final descargar el Excel (o pegar el bloque de texto en Excel desde A1).

Alineado con: Skill 11.8.7, instrucciones del agente v11.8.7, ejemplo `Ejemplo_ParaPrompt.xlsx` (43 columnas).

---

```text
Analiza el blueprint cuyo JSON enriquecido (<Nombre>-ENRIQUECIDO.json) va adjunto a este mensaje, con la Skill validar-blueprint-integracion y tus instrucciones. Sigue este orden, sin saltarte pasos:

1. Verifica que tienes la Skill y el JSON. Si falta algo o el contrato no coincide, dilo y detente.

2. Haz en un solo mensaje las preguntas que la Skill exige (condición MCI y exposición de la API) y espera mis respuestas. Pregunta una sola vez por cada nombre de API aunque se repita en varias páginas; el hijo principal de E2 se pregunta por cada hijo; en E1 no preguntes por el hijo (se da por no MCI) y en E3 no hagas preguntas. Si no hay preguntas, continúa sin pedirme confirmación.

3. Evalúa las 38 reglas en cada página evaluable, tal como las define la Skill. No cambies ni reinterpretes reglas, fichas, tipos, roles ni estados, y no inventes figuras ni conexiones. Una página no evaluable (plantilla, leyenda o requisitos) no genera resultados: no va en el Excel; solo menciónala al final con su motivo.

4. Entrega el informe de la Skill: por página, el escenario (E1, E2 o E3), el porcentaje de cumplimiento, los conteos y el resultado de cada regla con su justificación, citando toda figura y línea como «Nombre (id)».

5. Entrega después un archivo Excel (.xlsx) para descargar, con una sola hoja, con estas especificaciones:

Fila 1, encabezados exactos y en este orden (43 columnas):
Nombre BP | Operacion | Escenario | Porcentaje de cumplimiento | Tipo Resultado | CNT-001 | CNT-002 | CNT-003 | CNT-004 | CNT-005 | EXT-001 | EXT-002 | GW-001 | API-001 | API-002 | API-003 | API-004 | SRV-001 | SRV-002 | SRV-003 | SRV-004 | SRV-005 | EVT-001 | EVT-002 | EVT-003 | EVT-004 | EVT-005 | EVT-006 | EVT-007 | CA-001 | FT-001 | E1-001 | E2-001 | E3-001 | MOD-001 | COM-001 | COM-002 | COM-003 | COM-004 | COM-005 | MQ-001 | MQ-002 | MQ-003

Una fila por cada página evaluable, en el orden del JSON: si hay 3 páginas evaluables, 3 filas de datos. Sin filas de totales ni de notas, sin celdas combinadas y sin columnas adicionales.

Contenido de cada fila:
- Nombre BP: el nombre del archivo JSON enriquecido sin la extensión .json y sin el sufijo -ENRIQUECIDO. Es el mismo valor en todas las filas.
- Operacion: el nombre (título) de la página evaluada, tal como viene en el JSON.
- Escenario: E1, E2 o E3, el que determinaste para esa página.
- Porcentaje de cumplimiento: la métrica de la Skill para esa página (Cumple dividido entre Cumple + No cumple + No verificable; No aplica no cuenta), escrita como texto con una decimal y coma, por ejemplo 56,7%. Si el denominador es cero, escribe No calculable.
- Tipo Resultado: siempre Automático.
- Una columna por regla, con el código de la regla como encabezado: el estado que entregaste para esa regla en esa página, escrito exactamente como Cumple, No cumple, No verificable o No aplica. Ninguna celda de regla queda vacía.

Antes de entregar el archivo, verifica que cada fila tenga las 38 reglas, que los estados sean idénticos a los del informe y que el porcentaje de cada fila coincida con sus estados. Si algo no coincide, corrígelo primero.

Si no puedes generar un archivo descargable, entrega la misma tabla (encabezados y filas) como un único bloque de código con las columnas separadas por tabuladores, sin barras verticales ni formato Markdown, para pegarla en Excel desde la celda A1.

No me pidas confirmación para generar el Excel ni añadas más contenido después de él.
```
