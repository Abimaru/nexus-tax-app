# RESUMEN EJECUTIVO — CAMBIOS 41 → 37 REGLAS

> **Documento de revisión. No es normativa aprobada.** El texto de las 37 reglas es la obligación literal de la analista; todas las decisiones abiertas se presentan como **abiertas**. Nada de lo que sigue crea o modifica una obligación.

## En una página

- El catálogo pasa de **41 reglas históricas** a **37 vigentes**: 28 conservan ID, 5 se renumeran, 2 históricas se fusionan en una (MQ-002), 6 se retiran y 3 son nuevas (EXT-002, SRV-004, COM-005).
- **7 IDs significan ahora otra cosa** (EXT-002, EVT-004, EVT-005, EVT-006, EVT-007, MQ-002, MQ-003): un resultado histórico con ese ID no sirve para la regla actual.
- El texto de las 37 reglas coincide con el de la analista (296 campos, 0 diferencias). Este paquete **no modifica ninguna obligación**.

## Qué cambió de fondo

| Tema | Antes (41) | Ahora (37) |
|---|---|---|
| Integridad del JSON | Regla CNT-006 | Controles previos; lo afectado queda «No verificable» |
| Conexiones de comandos | EXT-002 y reglas MQ | Todas en COM-002…005 (una conexión, una regla); gestor-gestor y similares en MQ-003 |
| Capa de Despliegue | CA-002, FT-002 y detalles en EVT-004 y MQ | CA-001/FT-001 validan solo el nombre; la obligatoriedad vive en API-004, SRV-004 (nueva) y MQ-002 |
| Eventos | 8 reglas | 7: se elimina el despliegue del evento; tópicos y conexiones se renumeran |
| Gestores de colas | 5 reglas | 3: ubicación y despliegue se absorben; MQ-001 convierte en norma que UMLActiveClassBlock es un gestor |
| Escenarios | Hijo gestionado / no gestionado | Se elimina esa distinción; exigen Inicio certificado |
| Compuertas | Caminos reconstruibles | Coherencia entre el texto y las etiquetas de salida |

## Qué hay que decidir

| Prioridad | Decisiones | Efecto si no se deciden |
|---|---|---|
| **P0 — bloquean** | C-01 (SRV-001/002), C-02 (paquete) | La Skill llevaría 2 reglas sin criterio o mezclaría 37 y 41 |
| **P3 — bloquea (cambia texto)** | C-11 (erratas) | Texto con errores conocidos en el paquete |
| **P1 — definen cuántas reglas se pueden evaluar** | C-04, C-05, C-06, C-07, C-08 | Reglas de API/servicio/evento invocados, eventos y escenarios quedan en «No verificable» |
| **P2 — afinan el criterio** | C-03, C-09, C-10, C-12, C-13 | Variabilidad entre ejecuciones en coberturas, criterios subjetivos, auxiliares, comandos y modelos |

## Recomendación

Aprobar primero lo bloqueante (C-01, C-02, C-11 y el texto literal), y en la misma pasada **C-08**, que es una sola pregunta. Las demás pueden contestarse sin detener la generación de la Skill candidata: las reglas afectadas se informarán como «No verificable» con su causa hasta que se decidan.

Documentos del paquete: `CONSOLIDADO_NORMATIVO_37_PARA_ANALISTA.md` (completo), `MATRIZ_APROBACION_NORMATIVA.md` (casillas), `PROPUESTA_PREGUNTAS_ANALISTA.md` (preguntas con evidencia).