# Clasificacion y resolucion

La clasificacion automatica es determinista y versionada. Conserva siempre el
registro y texto original; una resolucion cambia unicamente la interpretacion
aplicada a la matriz.

## Evidencia y multiplicidad

La precedencia es codigo conocido, detalle inequivoco, casilla sugerida unica,
tipo de producto y decision del analista. Un valor positivo no prueba por si
solo que exista un activo. El signo se usa solo cuando el texto original
conserva explicitamente un negativo.

Se distinguen:

- condicion resuelta: una evidencia mas fuerte elige el destino;
- usos compatibles: un solo valor participa en analisis secundarios sin
  duplicarse;
- ambiguedad real: el registro permanece pendiente y fuera del consolidado.

## Relaciones

`subset_of`, `component_of`, `summary_of`, `related_movement`,
`informational_basis_of` y `possible_duplicate_of` conservan origen, destino,
confianza, evidencia, regla/version y estado de revision. No alteran el valor
extraido.

## Decisiones manuales

El drawer de Hallazgos permite confirmar, modificar, dejar pendiente, marcar
informativo, excluir, ignorar o restaurar la propuesta automatica. Entidad,
valor, texto y ubicacion son inmutables. Una modificacion sustancial, exclusion
o ignorado exige justificacion.

IndexedDB conserva la clasificacion automatica/final, observacion,
justificacion, fecha, version, registros/relaciones afectados e historial. Al
reprocesar, una decision se marca obsoleta si desaparece el registro o cambia la
regla/clasificacion automatica; nunca se elimina silenciosamente.

## Centro de resolución 2.3

La resolución transversal se registra en `TaxResolutionDecision`; cada evento conserva motivo y
evidencia y una reversión crea otro evento. El Centro limita alternativas según registro, matriz,
conciliación, candidato, requisito o casilla. Las resoluciones antiguas del drawer siguen vigentes y
alimentan la matriz; el nuevo historial las complementa sin mutar evidencia original. Detalle en
[RESOLUTION_CENTER.md](./RESOLUTION_CENTER.md).
