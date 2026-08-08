# Cierre confiable del expediente

La vista **Revisión final** resume la hoja por secciones y presenta **¿Qué me
falta?** desde tareas persistidas. Solo indica listo para revisión humana si no
hay bloqueos automáticos ni tareas bloqueantes.

NexusTax nunca indica que la declaración fue presentada. El traslado y la
presentación continúan siendo manuales. Si no existe declaración anterior, el
comparativo se declara no disponible y no se mezclan saldos históricos.

`Form210RegressionComparison` es una herramienta exclusiva de tests: compara
casilla, esperado sintético, calculado, diferencia y estado exacto, redondeo,
revisión o fallo. No completa datos ni altera reglas productivas. Las
diferencias reales pendientes no se fuerzan a cero.
