# Fuentes aceptadas del expediente

Un valor puede proceder de información exógena, documento, registro manual,
dato importado, cálculo determinista o resolución del analista. La fuente
asistida por IA está reservada y no se usa en este sprint.

Cada aceptación conserva fuente primaria y secundarias, método de captura,
confianza, estado, evidencia, fecha, autor local, regla e historial. Los
identificadores internos permanecen estables; la interfaz usa los catálogos en
`presentationCatalogs.ts` y nunca muestra el enum crudo.

## Estados

- Pendiente de revisión.
- Aceptado provisionalmente.
- Confirmado por el analista.
- Pendiente de soporte.
- Respaldado o reemplazado por documento.
- Contradicho por documento.
- No comparable.
- Rechazado o excluido con justificación.

Una aceptación provisional anota el registro exógeno que ya existe en la
matriz. No crea otro hecho sumable y, por tanto, no duplica su valor.

## Requisito no emitido

`RequirementSourceDecision` distingue un soporte relevante que la entidad no
emite de un requisito que realmente no aplica. Conserva motivo, fecha, canal,
observación, evidencia opcional y decisión sobre la fuente alternativa. Puede
quedar cubierto por fuente alternativa, pendiente de soporte, en revisión o no
disponible justificado.
