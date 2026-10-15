# Informe de normalización — Blueprint v0.8.3

Fuente leída: `NORMATIVA_BLUEPRINTS_CONSOLIDADA_v0.8.3(1).md` (consolidado de 18 documentos).

**483 reglas propuestas**, 268 verificables potencialmente con JSON, 215 no verificables con JSON solamente y 0 pendientes. 12 asuntos de revisión.

**Alcance:** el catálogo registra obligaciones textuales extraídas y normalizadas con trazabilidad. Los identificadores son nuevos, no corporativos. La clasificación de verificabilidad es potencial y no es un dictamen de un blueprint. Los segmentos cromáticos HEX pueden estar agrupados dentro de la obligación visual descrita y no siempre se separan como un ID por cada canal de color.

## R-001 · CONTRADICCION

**IDs:** GEN-081; GEN-428

**Fuentes:** D-05; componenteApiBase.md > Primera sección (v#.#.#)

D-05 exige primer número >=1. API base afirma 'dígito mayor a 1', pero da v1.0.0 como ejemplo válido; además 'dígito' no describe versiones 10+.

**Acción:** Confirmar umbral y formato exacto; no resolver por inferencia.

## R-002 · CONTRADICCION

**IDs:** GEN-315

**Fuentes:** componenteServicioBase.md > Descripción general / Conexiones

La descripción exige dos conexiones discontinuas mientras el apartado Conexiones admite uno o dos esquemas excluyentes.

**Acción:** Confirmar si la descripción general es genérica o restrictiva.

## R-003 · CONTRADICCION

**IDs:** GEN-360; GEN-361; GEN-426

**Fuentes:** capasDespliegue.md > Capa de despliegue para Evento Comportamiento Sin Respuesta

El esquema rotulado sin respuesta menciona literalmente Evento con Respuesta y tópicos de publicación/suscripción.

**Acción:** Determinar si es error de copia; no trasladar como exigencia a eventos sin respuesta.

## R-004 · AMBIGUEDAD

**IDs:** ESC-E3-015; GEN-034; GEN-035; GEN-037; GEN-038; GEN-041; GEN-048; GEN-049; GEN-121; GEN-127; GEN-128; GEN-129; GEN-130; GEN-133; GEN-134; GEN-187; ESC-E1,E2-001

**Fuentes:** D-06; capasDespliegue.md; componenteApiPartnerPublica.md

Para MCI la disposición general cita Flujo + Capa, pero la especialización API public/partner exige solo Capa y prohíbe Flujo; preservar la especialización y confirmar alcance.

**Acción:** Validar precedencia textual para cada tipo de API.

## R-005 · AMBIGUEDAD

**IDs:** ESC-E2-004; ESC-E3-015; ESC-E3-016; GEN-101; GEN-102; GEN-121; GEN-147; GEN-148; GEN-157; GEN-187; GEN-188; GEN-208; GEN-221; GEN-234; GEN-248

**Fuentes:** contenedores.md E3; capasDespliegue.md; D-06

E3 declara opcionales las capas del servicio principal; otras reglas MCI podrían aplicar dependiendo de componente y caso.

**Acción:** Revisar alcance E3 versus MCI.

## R-006 · AMBIGUEDAD

**IDs:** GEN-103; GEN-267

**Fuentes:** comandos.md > Comando consulta / Sistema Automatizado

El verbo Validar puede aparecer en comandos de distintas categorías; no clasificar por texto sin iconografía/función.

**Acción:** Definir criterios suficientes de distinción.

## R-007 · AMBIGUEDAD

**IDs:** ESC-E1-004; ESC-E2-003; ESC-E3-012; ESC-E3-013; GEN-024; GEN-069; GEN-070; GEN-071; GEN-072; GEN-095; GEN-103; GEN-114; GEN-136; GEN-137; GEN-164; GEN-167; GEN-

**Fuentes:** Varios capítulos; D-04

La clasificación visual requiere correspondencia SVG-JSON por figura y trazados verificables; JSON de Lucidchart no acredita HEX por instancia.

**Acción:** Mantener NO_VERIFICABLE si falta emparejamiento.

## R-008 · DUPLICADO_CONSOLIDADO

**IDs:** GEN-037; GEN-038; GEN-048; GEN-049

**Fuentes:** capasDespliegue.md > APIs, eventos, servicios, gestores

Nomenclatura de flujos y capas y propiedades de contención se repiten en distintas secciones. Se reutilizaron IDs para redacciones estrictamente equivalentes; variantes condicionadas se conservan.

**Acción:** Verificar equivalencias semánticas antes de publicar el catálogo.

## R-009 · DUPLICADO_ORIGEN

**IDs:** D-01; D-02; D-06; D-07

**Fuentes:** reglasBasicas.md y capítulos especializados consolidados

reglasBasicas.md fue compendio duplicado por diseño; se conservó trazabilidad mediante disposiciones D y capítulos especializados, sin crear IDs por archivo.

**Acción:** Aprobación humana de normalización.

## R-010 · PENDIENTE_ID

**IDs:** CATALOGO NUEVO

**Fuentes:** Consolidado v0.8.3

No se proporcionó catálogo anterior con IDs oficializados; los IDs son una línea base propuesta y deberán persistirse sin reasignación en versiones futuras.

**Acción:** Aprobar y congelar identificadores antes de emplearlos en producción.

## R-011 · PENDIENTE_COMPROBACION

**IDs:** TODAS LAS REGLAS NO_VERIFICABLE

**Fuentes:** Normativa v0.8.3

VERIFICABLE significa comprobable potencialmente con JSON suficiente, no que se haya evaluado un blueprint particular.

**Acción:** Separar verificabilidad potencial de dictamen por instancia.

## R-012 · AMBIGUEDAD

**IDs:** ESC-E3-025

**Fuentes:** D-07; contenedores.md E3; componenteServicioBase.md

E3 requiere figura de servicio principal fuera del hijo azul; a diferencia de figuras de servicios adicionales invocados, su alcance preciso de tres secciones debe interpretarse con la excepción D-07.

**Acción:** Aprobar representación específica E3.

