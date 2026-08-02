# Centro de resolución

El Centro de resolución reúne los pendientes tributarios accionables del expediente. No reemplaza
las vistas de evidencia: permite decidir desde una cola única y abrir el contexto original cuando
sea necesario.

## Decisiones

`TaxResolutionDecision` es un evento inmutable y versionado. Conserva expediente, objeto afectado,
alternativa elegida, estado anterior/final, valores y categorías cuando aplican, casilla propuesta,
motivo obligatorio, nota, evidencia, autor local, fecha, versión y referencia a la decisión que
reemplaza. Revertir crea un nuevo evento; nunca borra el anterior.

Los objetos admitidos son registro, grupo de matriz, conciliación, candidato, requisito y casilla
del Formulario 210. Las alternativas se limitan por tipo de objeto para evitar combinaciones sin
sentido. Una decisión solo cierra la tarea derivada cuando no es `leave_pending`, restauración o
reversión.

## Prioridad operativa

El orden central es: bloqueante alta, bloqueante media, no bloqueante alta, no bloqueante media y
baja. Dentro del nivel se conserva orden determinista por título e identificador. La evidencia se
mantiene navegable y la interfaz nunca muestra enums internos.

## Persistencia

Dexie v11 agrega `resolutionDecisions`. La tabla se incluye en borrado del expediente y limpieza
total. El manifiesto 2.3.0 exporta el historial sin binarios. Las decisiones que afectan matriz o
casillas provocan reconstrucción del derivado correspondiente.
