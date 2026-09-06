# Cierre confiable del expediente

La vista **Revisión final** resume la hoja por secciones y presenta **¿Qué me
falta?** desde tareas persistidas. Solo indica listo para revisión humana si no
hay bloqueos automáticos ni tareas bloqueantes.

NexusTax nunca indica que la declaración fue presentada. El traslado y la
presentación continúan siendo manuales. Desde el Sprint 2.4 (Fase B1), si el
expediente tiene una declaración anterior vigente, Revisión final reconoce
sus pendientes (identidad, arrastres, anomalías de escala) como tareas con
deep-link a `Declaraciones anteriores`; si no existe ninguna, no se genera
ninguna tarea ni se mezclan saldos históricos — agregar una declaración
anterior nunca es obligatorio.

Desde el Sprint 2.4 (Fase C), Revisión final también reconoce los pendientes
de **Beneficios y deducciones — Dependientes** (soportes faltantes,
evaluaciones pendientes o marcadas obsoletas por cambio de reglas, elección
de beneficio requerida para independientes) como tareas `source: 'dependent'`
con deep-link a la tarjeta exacta del dependiente. Si el analista confirmó
"No tengo dependientes", tampoco se genera ninguna tarea: ese estado cierra
la sección sin exigir registros.

`Form210RegressionComparison` es una herramienta exclusiva de tests: compara
casilla, esperado sintético, calculado, diferencia y estado exacto, redondeo,
revisión o fallo. No completa datos ni altera reglas productivas. Las
diferencias reales pendientes no se fuerzan a cero.
