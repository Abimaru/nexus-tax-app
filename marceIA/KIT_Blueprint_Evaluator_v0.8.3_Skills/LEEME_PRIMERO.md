# Blueprint Evaluator v0.8.3 — piloto Skill normativa

## Cambio principal
No se usa Azure. Se incorpora `blueprint-corporate-standard.zip` con un `SKILL.md` reducido y una referencia Markdown íntegra en `references/`. Las otras tres Skills conservan sus responsabilidades, con aclaración de fuente y escenarios. El HTML es v0.3.3 sin cambios.

## Riesgo de plataforma
El hecho de que Agent Builder acepte un ZIP con referencias **no prueba** que el agente pueda recuperar sus archivos internos al ejecutar una Skill. Es una **hipótesis por validar**. En el primer chat pide que cite literalmente un pasaje de D-06, E3 y Sistema Externo del archivo de referencia. Si no puede, utiliza `NORMATIVA_BLUEPRINTS_CONSOLIDADA_v0.8.3.md` como tercer adjunto, sin afirmar acceso a la normativa de la Skill.

## Instalación
1. Reemplaza instrucciones con `INSTRUCCIONES_AGENT_BUILDER_v0.8.3.txt`.
2. Instala por separado los cuatro ZIP de `skills/` (la Skill normativa primero); si la cuenta permite menos, usa solo la normativa junto a las tres que realmente admita.
3. Opción A: PDF+JSON de Evidence Studio, tras comprobar que puede leer la normativa empaquetada.
4. Opción B, de respaldo: PDF+JSON de Evidence Studio y Markdown normativo como tercer adjunto.
5. Inicia chat nuevo, responde los **cuatro parámetros** que definió la analista y verifica contraste declaración/estructura e informe de siete secciones.

## Evidencia del error anterior
El informe de Copilot inicialmente sugirió E2 para `ms_retrieve_keys` por orquestación/consumos. Luego reconoció que el único hijo principal estaba en NUEVAS EXPERIENCIAS DE PAGO y no en INTEGRACIÓN; por tanto la estructura sugiere E1. No se deben inferir escenarios por el número de consumos.

## Versiones
Normativa v0.8.3 pendiente de validación formal; instrucciones v0.8.3; Evidence Studio v0.3.3 sin cambios. No publicadas por nuestra parte en el entorno corporativo.
