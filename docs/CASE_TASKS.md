# Tareas accionables del expediente

## Modelo

`CaseTask` representa un pendiente derivado y trazable. Incluye origen, prioridad, estado, bloqueo,
destino seguro dentro del flujo, referencias opcionales a entidad/documento/página/sesión de
extracción/perfil/requisito/candidato/conciliación/matriz, regla y evidencia.

Los estados son `pending`, `in_progress`, `resolved`, `discarded` y `blocked`. Dexie v9 persiste la
bandeja. La sincronización conserva estados gestionados por el usuario y marca como resueltas las
tareas que dejan de derivarse, en vez de borrarlas.

## Derivación

Se generan tareas para candidatos pendientes, requisitos sin cobertura o parciales,
conciliaciones/matriz abiertas e IVA sin confirmar. Sprint 2.2 agrega páginas recomendadas para OCR,
contradicciones nativo/OCR, fallos recuperables y perfiles en borrador vinculados al expediente. La
lista se ordena por prioridad y luego por título para mantener determinismo.

## Navegación

`Pendientes del expediente` abre el destino exacto de la tarea. El siguiente paso recomendado usa la
tarea activa de mayor prioridad, muestra cuántas quedan y coloca foco en un contexto resaltado. Las
tareas OCR seleccionan automáticamente el documento y la página del laboratorio. El
retorno a la bandeja no usa datos sensibles en la URL.

## Prioridad y resolución en Sprint 2.3

Se agregan tareas de casillas incompletas y decisiones tributarias. El orden operativo es:
bloqueante alta, bloqueante media, no bloqueante alta, no bloqueante media y baja; luego título e
identificador para mantener determinismo.

El Centro de resolución consume la misma lista: ofrece alternativas compatibles, exige motivo,
conserva evidencia e historial y abre el destino exacto. Una decisión activa suprime el pendiente;
una restauración o reversión permite derivarlo nuevamente.

## Declaraciones anteriores (Sprint 2.4, Fase B1)

Cinco tipos nuevos con `source: 'prior_year_return'` y destino
`declaracion/declaraciones-anteriores`: identidad no coincidente (bloqueante),
casillas no reconocidas con confianza suficiente, dos declaraciones vigentes
para el mismo año sin indicar corrección, arrastre pendiente de confirmación
(anticipo o saldo a favor, incluida la pregunta de devolución/compensación) y
anomalía de escala frente al año anterior (nunca corrige el valor, solo
advierte). Se generan en `buildCaseTasks` a partir de las declaraciones y
candidatos de arrastre vigentes; la Revisión final ("¿Qué me falta?") las
muestra como cualquier otra tarea, con deep-link a la tarjeta exacta.

## Dependientes económicos (Sprint 2.4, Fase C)

Ocho tipos nuevos con `source: 'dependent'`, campo `dependentId` para
trazabilidad y destino `declaracion/beneficios-dependientes`: soporte
documental faltante o parcial, evaluación de elegibilidad pendiente de
revisión (`pending_review`/`requires_support`), evaluación marcada
`stale_due_to_rule_change` tras un cambio de reglas o del registro base,
elección de beneficio requerida cuando el contribuyente es independiente y un
dependiente califica para ambos beneficios (art. 387 y art. 336 num. 3), y
naturaleza de ingresos laborales sin confirmar (bloquea la resolución de
coexistencia). Se derivan en `buildCaseTasks` recorriendo `taxDependents`,
`dependentEvaluations` y `dependentsCaseContext` del expediente. Ver
`docs/DEPENDENTS_BENEFITS_2025.md` para el detalle normativo de cada
beneficio.

## Facturación electrónica (Sprint 2.4, Fase D)

Ocho tipos nuevos con `source: 'electronic_invoice'`, campos
`electronicInvoicePurchaseId`/`electronicInvoiceReportId` para trazabilidad y
destino `declaracion/facturacion-electronica`: reporte no conciliado contra
el Tope 5 de la exógena, factura con CUFE duplicado y valores conflictivos
(bloquea la consolidación automática de esa factura), factura sin CUFE,
medio de pago reportado como "Error en datos", factura pendiente de decisión
tributaria (posible uso en otro beneficio), diferencia relevante contra el
Tope 5, base susceptible del 1 % sin ninguna decisión revisada por el
analista, y archivo no reconocido como reporte DIAN (esta última se muestra
como error inmediato en la UI, no como tarea persistida, porque no hay
reporte/factura que anclar como evidencia). Se derivan en `buildCaseTasks`
recorriendo el reporte y las facturas activas del expediente. Ver
`docs/ELECTRONIC_INVOICE_REPORT_2025.md` para el detalle normativo completo.

## Evidence Matching & Guided Review (Sprint 2.4, Fase E)

Dos tipos nuevos con `source: 'candidate'`, derivados directamente en
`buildCaseTasks` (no en la capa de orquestación `evidenceReview.ts`, para
evitar un ciclo de importación con `entityForRecord`), sin tocar la
generación existente por candidato (`confirm_candidate`/`identify_product`/
`associate_entity`):

- `evidence_ambiguous_match`: un candidato abierto tiene al menos una
  sugerencia de emparejamiento en estado `ambiguous` (dos o más registros
  exógenos empatan); apunta a `organizacion/revision-documental`.
- `evidence_missing_expected`: un registro exógeno con valor reportado no
  está cubierto por ningún candidato con relación útil ni por ninguna
  conciliación preliminar existente; recomienda capturar manualmente desde
  la revisión guiada.

Ver `docs/EVIDENCE_MATCHING.md` para el detalle completo del clasificador,
el matcher evolucionado y la UI de revisión guiada.

### Fallback guiado de vivienda sin exógena (Sprint 2.4, Fase F.2)

`evidence_missing_expected` se reutiliza (mismo tipo, **no** se creó uno
nuevo) para un segundo origen que NO depende de ningún registro exógeno: si
un documento se clasificó como `housing_interest_certificate`
(`DocumentExtractionSession.classification.proposedKind`) y ningún candidato
de ese documento tiene `proposedCategory: 'housing_interest'`, se genera la
tarea `task:housing-interest-missing:<documentId>` con
`ruleId: 'case-task.housing-interest-missing.v1'`, `documentId` apuntando al
documento (no a un registro), y el mismo `recommendedAction: 'Capturar
manualmente desde la revisión guiada'`. La deducción de intereses de vivienda
nunca se reporta como información exógena (§15 del prompt de Fase F.2), así
que esta rama es la única forma de que el expediente ofrezca captura guiada
para ese beneficio cuando la extracción automática no encuentra el valor.

### Menos expectativas falsas y routing documental (Sprint 2.4, Fase F.3)

`evidence_missing_expected` derivado de la exógena ya no se genera para 5 categorías
estructuralmente sin certificado esperado (`card_consumption`, `bank_movement`,
`investment_movement`, `electronic_invoicing_total`, `electronic_invoicing_benefit_base`) — ver
`docs/EVIDENCE_MATCHING.md` §Fase F.3 §16. Esto reduce falsos `unresolved` sin tocar el mecanismo
de tareas.

Cuando un documento se enruta como declaración anterior o extracto bancario transaccional
(`decideDocumentRouting`, `packages/document-intelligence/src/documentRouting.ts`), no se generan
tareas de tipo `confirm_candidate`/`identify_product`/`associate_entity` para ese documento (no hay
candidatos) — el motivo queda documentado en el `DocumentExtractionFinding` de la sesión
(`code: 'requires_specialized_route'`), visible en modo avanzado.
