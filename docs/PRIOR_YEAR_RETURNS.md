# Declaraciones anteriores (Sprint 2.4 — Fase B)

_Última actualización: 2026-09-05._

## 1. Alcance

La declaración de renta de un año anterior es **evidencia histórica** y
**fuente de arrastres explícitos** confirmados por el analista. **Nunca** es
una plantilla para copiar automáticamente la declaración del año actual:
ningún valor histórico se traslada sin una decisión humana trazable.

Todo es orientativo. NexusTax no verifica la exactitud de la declaración
anterior cargada — solo la lee, la compara con el expediente actual y ofrece
candidatos de arrastre cuando corresponde.

## 2. Contratos (`@nexus-tax/domain`)

`packages/domain/src/priorYearReturn.ts`:

- `PriorYearTaxReturn`: `id`, `caseId`, `taxYear`, `filingYear`, `formType`
  (`'210'`), `formNumber`, `previousFormNumber` (si corrige otra), `status`
  (`submitted`/`draft`/`amended`/`unknown`), `identityMatch`
  (`match`/`mismatch`/`unknown`), `replaces`/`replacedBy` (historial de
  correcciones, nunca se borra), `isCurrentVersion`, `boxes: Record<string,
  PriorYearBoxValue>` (claves = número de casilla como texto),
  `extractionConfidence`, `parserVersion`.
- `PriorYearBoxValue`: `boxNumber`, `rawValue`, `normalizedValueCop`,
  `extractionMethod` (`native_text`/`geometry`/`ocr`/`manual`), `confidence`,
  `role` (`carry_forward_candidate` / `calculation_input` /
  `historical_reference` / `comparison_only` / `context_prefill` /
  `not_reusable`), `page`, `evidence` (fragmento corto, nunca el PDF completo).
- `PriorYearCarryForwardCandidate`: candidato trazable de arrastre de una
  casilla del año anterior a una del año actual, con `decision`
  (`pending`/`confirmed`/`corrected`/`rejected`/`source_replaced`) que
  **siempre inicia en `pending`**, y — solo para el arrastre de saldo a favor
  — `refundOrCompensationRequested` (`yes`/`no`/`unknown`).

## 3. Parser de PDF (`@nexus-tax/document-intelligence`)

`packages/document-intelligence/src/form210PriorYear.ts` expone
`extractPriorYearForm210(representation)`, que reutiliza la misma
`DocumentRepresentation` que el resto del motor documental (mismo
lector/diagnóstico de PDF, mismo módulo `parseMoneyAmount`). No lee el PDF
por sí mismo ni corre OCR — cuando una página tiene `readConfidence`
`insufficient`/`low`, lo señala en `warnings` para que `apps/web` decida si
ofrece OCR de respaldo.

Detección (`Form210PriorYearDetection`): busca señales de "Formulario 210",
año gravable, número de formulario, identidad (enmascarada de inmediato,
nunca se conserva completa), fecha de presentación y evidencia de
corrección. **Nunca afirma `submitted` solo porque el texto se parece a un
F-210**: exige evidencia estructural (fecha de presentación) y solo entonces
asigna ese estado.

Extracción de casillas: patrón determinista "número de casilla + etiqueta +
valor monetario al final de línea", aplicado sobre cualquier posición del
documento (no asume coordenadas de un PDF único). Cuando una casilla aparece
repetida en más de una página, se conserva la de mayor confianza y se
advierte.

Verificado contra el oráculo anonimizado del Formulario 210 AG2024 (adenda
Sprint 2.4, Fase B, punto 17): 23 casillas extraídas exactamente
(`packages/document-intelligence/tests/form210PriorYear.test.ts`). Los
valores del oráculo son evidencia de prueba — **nunca** se convierten en
reglas productivas del ruleset 2025.

## 4. Motor de arrastres y comparación (`@nexus-tax/form-210`)

`packages/form-210/src/prior-year.ts`:

- `derivePriorYearCarryForwardCandidates(priorReturn)`: genera únicamente los
  dos arrastres "suficientemente definidos" (adenda Sprint 2.4, punto 13):
  - **Anticipo**: casilla 133 del año anterior → candidato para la casilla
    130 del año actual.
  - **Saldo a favor**: casilla 137 del año anterior → candidato para la
    casilla 131 del año actual, condicionado a la respuesta de
    `resolveRefundCarryForwardAnswer` sobre si ya fue solicitado en
    devolución o compensación (art. 850 ET). `yes` descarta el arrastre;
    `no` lo habilita; `unknown` lo deja pendiente.
  - Si `priorReturn.identityMatch !== 'match'`, **no se genera ningún
    candidato** (hallazgo bloqueante primero).
  - Patrimonio, deudas, ingresos, costos, deducciones, rentas exentas,
    retenciones, ganancias ocasionales, dependientes y saldos bancarios
    **nunca se arrastran**: solo sirven de contexto histórico.
- `compareTaxEvolution(priorReturn, currentBoxValuesCop)`: compara doce
  métricas (patrimonio bruto/deudas/líquido, ingresos por cédula, renta
  líquida gravable de la cédula general, ganancias ocasionales, impuesto
  neto, retenciones, saldo a favor, anticipo) y devuelve un estado por
  métrica: `stable` (≤2 % de diferencia), `increase`, `decrease`,
  `relevant_variation` (>20 %), `incomplete` (falta un lado) o
  `not_comparable` (sin declaración anterior). **Nunca** etiqueta una
  variación como error.
- `detectHistoricalScaleAnomalies(metrics)`: reutiliza
  `detectMonetaryAnomalies` (protecciones monetarias de Sprint 2.3.2, mismo
  detector ×10/×100/×1000) para señalar saltos de escala entre el valor
  anterior y el actual de cada métrica. Genera un hallazgo orientativo, nunca
  corrige el valor automáticamente.

## 5. Catálogo de casillas F-210 2025 (Fase B0)

`FORM_210_BOXES_2025` se completó con casillas **estructurales** (sin
fórmula verificada) para las secciones de consolidación de la cédula general
y liquidación del impuesto: 89, 91, 92, 93, 111, 126, 127, 129, 133, 137,
138, 139, 140, 141. Cada una declara `implementationStatus`
(`not_implemented`/`requires_review`/`implemented_unverified`) y
`legalBasisSourceIds`. Las casillas 126, 127, 129, 133 y 137 se cablean
**informativamente** en `buildForm210Draft` con valores ya calculados por
motores probados (`incomeTax`, `occasionalGainsTax`, `totalTaxDueCop`,
`nextYearAdvance`, `netBalanceCop`) — la numeración exacta de casilla oficial
queda marcada como no verificada hasta confirmarse contra el instructivo
DIAN. Las casillas 138/139 (adición de 72 UVT por dependientes, art. 336 ET)
quedan sin calcular: son responsabilidad de la Fase C.

**Hallazgo abierto (Fase B0)**: la aritmética de los fixtures de referencia
sugiere que existe una subcédula de "rentas de trabajo sin relación laboral"
(honorarios/servicios, aprox. casillas 43-57) que el motor actual no modela;
por eso la casilla 89 queda en `requires_review` sin fórmula automática.

## 6. Fuera de alcance de esta fase

- El motor del beneficio de 72 UVT por dependiente (art. 336 ET) y las
  casillas 138/139 — Fase C.
- Facturación electrónica DIAN, inmuebles, administración de propiedad
  horizontal y medicina prepagada — secciones D-G del Sprint 2.4 original,
  no iniciadas.

## 7. Integración UX (Sprint 2.4, Fase B1)

Completa funcionalmente el flujo descrito en la Fase B1: un analista puede
cargar, confirmar, comparar y trasladar valores **únicamente desde la UI**,
sin tocar Dexie ni fixtures.

### Componentes

- `apps/web/src/lib/priorYearReturns.ts`: orquesta lectura local del PDF
  (`readPdfText`, reutilizado) → `extractPriorYearForm210` → construcción del
  contrato `PriorYearTaxReturn` con identidad ya enmascarada
  (`checkPriorYearIdentity` compara el expediente contra el PDF por los
  últimos dígitos visibles).
- `apps/web/src/lib/priorYearBoxLabels.ts`: catálogo puro de etiquetas
  humanas y roles de casilla (`roleForPriorYearBox`), compartido entre la
  orquestación de carga y la derivación de tareas.
- `apps/web/src/components/case/PriorYearReturnsPanel.tsx`: sección
  `Declaraciones anteriores` dentro de la etapa Declaración — listado por
  año (con soporte para correcciones múltiples y marca `Vigente`), carga con
  estados humanos (`Analizando documento…` / `Formulario reconocido` /
  `Requiere revisión` / `No reconocido`), drawer de detalle con modo avanzado
  de procedencia, tarjetas de arrastre de anticipo/saldo a favor (con la
  pregunta de devolución/compensación del art. 850 ET) y la vista de
  evolución tributaria con hallazgos de anomalía de escala descartables.
- `buildCaseTasks` (`apps/web/src/lib/taxCaseAnalysis.ts`) deriva tareas de
  identidad no coincidente, casillas no reconocidas, conflicto entre
  declaraciones del mismo año, arrastres pendientes y anomalías de escala.
  La Revisión final las muestra con deep-link (`onNavigate`) igual que el
  resto de tareas del expediente.

### Aplicación de arrastres al Formulario 210

Al confirmar un arrastre, el panel reutiliza el mecanismo YA probado de
ajuste de casilla (`saveTaxResolutionDecision` con
`type: 'adjust_form_box'`), que ya recalcula el borrador
(`rebuildForm210Draft`) y la liquidación preliminar. **Limitación conocida**:
esto es una simplificación deliberada — el motor puro también expone un
input dedicado `Form210BuildInput.priorYearBalance` (con
`hasPendingCompensationOrRefundRequest`) para el saldo a favor, pero
`rebuildForm210Draft` todavía no lo persiste ni lo lee; usar el ajuste
genérico de casilla evita construir esa persistencia adicional sin revisión
previa. Queda como trabajo futuro conectar `priorYearBalance` de forma
nativa si se necesita la trazabilidad completa de esa nuance normativa en
`preliminaryLiquidation`.

### Privacidad

El documento se registra como `DocumentKind = 'prior_year_return'` con el
modo de almacenamiento que elija el analista (por defecto solo metadatos).
La identidad detectada se enmascara de inmediato (`taxpayerIdentityMasked`)
y nunca se muestra completa en tarjetas generales; el modo avanzado del
drawer expone evidencia de extracción (fragmento corto, página, método) pero
nunca el PDF completo.

### Pruebas

- `apps/web/src/lib/taxCaseAnalysis.test.ts`: deriva correctamente las 5
  tareas nuevas (identidad, conflicto, arrastre con/sin valor).
- `apps/web/src/components/case/PriorYearReturnsPanel.test.tsx`: estado
  vacío, tarjeta de año, tarjeta de arrastre y bloqueo por identidad.
- `apps/web/src/lib/repository.test.ts`: persistencia, historial de
  correcciones y no duplicación de candidatos de arrastre.
- `apps/web/tests-e2e/prior-year-returns.spec.ts`: dos escenarios E2E
  completos (flujo feliz con arrastre de anticipo aplicado y verificado en
  el borrador F-210, más evolución tributaria; y bloqueo por identidad no
  coincidente), con capturas desktop (1280 px) y móvil (390 px). Usa un PDF
  sintético generado en texto plano (sin datos reales, sin acentos por
  limitación del generador de PDF de prueba) con valores anonimizados
  derivados del oráculo AG2024.

### Pendiente explícito de esta fase

- Facturación electrónica DIAN, inmuebles, administración de propiedad
  horizontal, medicina prepagada y el motor de 72 UVT (Fase C) — fuera de
  alcance por instrucción explícita.
- Conexión nativa de `priorYearBalance` (ver limitación arriba).
