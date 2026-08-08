# Flujo de resolución guiada

Cada tarea de casilla explica qué falta, por qué importa, valor actual, fuente
esperada, destino exacto y opciones disponibles. `destinationLabel` y
`formBoxNumber` abren la casilla concreta.

Las opciones incluyen confirmar/corregir, elegir/reemplazar fuente, excluir,
aceptar exógena provisionalmente, usar documento, registrar valor manual,
marcar no aplicable, confirmar cero, revisar documento, rechazar sugerencia y
restaurar cálculo. La UI explica el efecto antes de persistir.

Las casillas distinguen propuesta, provisional, revisión, confirmación,
cálculo, no aplica, cero confirmado y bloqueo. Las decisiones son reversibles
y el árbol muestra fuentes incluidas/excluidas, original, transformación y
confianza.

Rechazar una conciliación persiste `rejected` con `suggestionId`, motivo, fecha
y versión. Restaurar persiste `restored`. Una conciliación humana confirmada
puede reemplazar la exógena al construir el F-210, evitando doble conteo y
conservándola en `excludedSources`.
