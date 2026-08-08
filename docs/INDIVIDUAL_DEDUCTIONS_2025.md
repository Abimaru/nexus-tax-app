# Limitaciones declarativas por concepto (AG 2025)

_Última actualización: 2026-08-07 — Fase E del Sprint 2.3.1._

## 1. Alcance

`packages/aegis-rules` modela límites individuales para tres conceptos con
tope explícito en el Estatuto Tributario: aportes voluntarios a fondos de
pensiones y AFC/AVC, intereses de crédito de vivienda y pagos por medicina
prepagada. `packages/form-210` los consume desde el builder: aplica el
tope, cablea la deducción efectiva a la casilla correspondiente y emite un
warning cuando el declarado excede el límite del ruleset.

Todo es orientativo. NexusTax no verifica soportes ni parentescos; la base
la aporta el analista.

## 2. Reglas incluidas

| Regla | Casilla | Tope | Base porcentual | Fuentes |
|---|---|---|---|---|
| `afc-fvp-avc-2025` | 35 | 3.800 UVT | 30 % del ingreso laboral | `et-art-126-1`, `et-art-126-4` |
| `housing-interest-2025` | 38 | 1.200 UVT anuales | — | `et-art-119` |
| `prepaid-medicine-2025` | 39 | 192 UVT anuales | — | `et-art-387` |

El motor devuelve `bindingCandidate ∈ {declared, percentage, uvt_cap}`
según qué candidato limita efectivamente el beneficio.

## 3. Contrato del motor

`packages/aegis-rules/src/colombia/individual-income-tax/2025/individual-deductions.ts`:

```ts
export const AFC_FVP_AVC_LIMIT_RULE_2025: IndividualDeductionLimitRule;
export const HOUSING_INTEREST_LIMIT_RULE_2025: IndividualDeductionLimitRule;
export const PREPAID_MEDICINE_LIMIT_RULE_2025: IndividualDeductionLimitRule;
export const INDIVIDUAL_DEDUCTION_LIMIT_RULES_2025: readonly IndividualDeductionLimitRule[];

export function getIndividualDeductionLimitRule(id: string): IndividualDeductionLimitRule;

export function applyIndividualDeductionLimit(
  rule: IndividualDeductionLimitRule,
  input: { taxYear: number; declaredCop: number; baseIncomeCop?: number | null },
): IndividualDeductionLimitComputation;
```

`IndividualDeductionLimitComputation` (ver
`packages/aegis-rules/src/types.ts`) expone la regla aplicada, el declarado,
los candidatos (`declared`, `percentage`, `uvt_cap`), el aplicado efectivo
y las fuentes normativas. Valores negativos se tratan como cero.

## 4. Integración en el borrador del F-210

`Form210BuildInput` acepta un campo opcional:

```ts
buildForm210Draft({
  caseId: 'case-1',
  taxYear: 2025,
  records,
  facts,
  individualDeductions: {
    afcFvpAvcCop: 20_000_000,
    housingInterestCop: 30_000_000,
    prepaidMedicineCop: 15_000_000,
  },
});
```

Para cada monto declarado positivo, el builder:

1. Ejecuta `applyIndividualDeductionLimit` con la regla correspondiente.
   Para AFC/AVC/FVP usa como `baseIncomeCop` los ingresos brutos ya
   acumulados en la casilla 32.
2. Añade una fuente `calculation` a la casilla destino:
   - `calc:afc-fvp-avc-126` → casilla 35.
   - `calc:housing-interest-119` → casilla 38.
   - `calc:prepaid-medicine-387` → casilla 39.
3. Conserva la computación completa en
   `preliminaryLiquidation.individualDeductionLimits`.
4. Si `bindingCandidate !== 'declared'` (hubo recorte), emite un
   `Form210ValidationFinding` de código `unsupported_deduction` con
   `severity: 'warning'` y la casilla afectada.

## 5. Verificación

Motor puro — `packages/aegis-rules/tests/individual-deductions.test.ts`
(11 fixtures):

- Declaración de las tres reglas y sus fuentes.
- AFC: declarado bajo, recorte por 30 %, recorte por tope 3.800 UVT y
  sin base disponible.
- Intereses de vivienda: bajo tope, recorte por tope, ausencia de base
  y porcentaje.
- Medicina prepagada: recorte al tope de 192 UVT.
- Normalización de negativos.
- Rechazo de años no modelados.

Integración F-210 — `packages/form-210/tests/preliminary-liquidation.test.ts`
(1 fixture nuevo):

- Con ingreso 50M y tres deducciones declaradas: AFC 20M ⇒ recorta al
  30 % (15M), vivienda 30M ⇒ aplica tal cual, medicina 15M ⇒ recorta al
  tope. Casilla 35 recibe 15M, se emiten al menos dos findings
  `unsupported_deduction` para los conceptos recortados.

Sweep local: `pnpm -r typecheck` verde; `pnpm -r test` = 342 tests OK
(aegis 102, form-210 32, resto sin regresiones).

## 6. Fuera de alcance

- **Verificación de soportes documentales** (certificados de aportes,
  extractos de crédito de vivienda, facturas médicas). El motor confía en
  el declarado.
- **Distribución entre cédulas**. AFC va a la 35 (rentas de trabajo) por
  defecto; el analista puede mover manualmente vía resolución si
  corresponde a otra cédula.
- **Interacción con el art. 336 ET**. Los aplicados entran a la casilla
  destino y luego al tope conjunto de rentas exentas y deducciones ya
  modelado por la Fase D vía casillas 41 / 65 / 82.
- **Otras deducciones/rentas exentas** (aportes voluntarios pensión
  obligatoria, cesantías, arts. 383 y ss.). Se sumarán en fases
  posteriores conforme se validen los topes contra el instructivo DIAN.
