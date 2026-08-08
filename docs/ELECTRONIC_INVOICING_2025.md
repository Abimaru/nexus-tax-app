# Deducción por facturas electrónicas (AG 2025)

_Última actualización: 2026-08-07 — Fase G del Sprint 2.3.1._

## 1. Alcance

`packages/aegis-rules` modela la deducción imputable a la cédula general por
facturas electrónicas soportadas con medios de pago electrónicos, según el
art. 336-1 del Estatuto Tributario (incorporado por el art. 61 de la
Ley 2277 de 2022). `packages/form-210` la consume desde el builder: cablea
la deducción calculada a la casilla 39 y la conserva en
`preliminaryLiquidation.electronicInvoicingDeduction` con los dos candidatos
limitantes para trazabilidad.

Todo es orientativo. NexusTax no verifica los requisitos legales de la
factura (soporte electrónico, medio de pago, titularidad): esa clasificación
la aporta el analista.

## 2. Regla

El art. 336-1 ET permite tomar como deducción imputable a la cédula general:

```
appliedDeductionCop = min(
  1 % × compras_con_factura_electrónica,
  240 UVT
)
```

Requisitos (validados por el analista, no por el motor):

- Las compras cuentan con **factura electrónica de venta** vigente.
- Se pagaron con **tarjeta débito, crédito o cualquier otro medio de pago
  electrónico** (transferencia, PSE, etc.).
- La factura contiene el **NIT o número de identificación** del
  contribuyente.

Para 2025 el tope absoluto son `240 × 49.799 = 11.951.760` pesos.

## 3. Contrato del motor

`packages/aegis-rules/src/colombia/individual-income-tax/2025/electronic-invoicing.ts`:

```ts
export const ELECTRONIC_INVOICING_SOURCE_ID = 'et-art-336-1';
export const ELECTRONIC_INVOICING_PERCENTAGE = 0.01;
export const ELECTRONIC_INVOICING_ANNUAL_CAP_UVT = 240;

export function computeElectronicInvoicingDeduction(input: {
  taxYear: number;
  purchasesWithElectronicInvoiceCop: number;
}): ElectronicInvoicingDeductionComputation;
```

`ElectronicInvoicingDeductionComputation` (ver
`packages/aegis-rules/src/types.ts`) expone `purchasesBaseCop`,
`percentageRate`, `percentageCandidateCop`, `uvtCapUvt`,
`uvtCapCandidateCop`, `appliedDeductionCop`, `bindingCandidate` (`percentage`
o `uvt_cap`), `formula` y `ruleSourceId`.

Bases negativas se tratan como cero. El resultado se redondea al peso más
cercano por candidato.

## 4. Integración en el borrador del F-210

`Form210BuildInput` acepta un campo opcional:

```ts
buildForm210Draft({
  caseId: 'case-1',
  taxYear: 2025,
  records,
  facts,
  electronicInvoicing: {
    purchasesWithElectronicInvoiceCop: 50_000_000,
  },
});
```

Cuando `purchasesWithElectronicInvoiceCop > 0`, el builder ejecuta
`computeElectronicInvoicingDeduction` y agrega una fuente de tipo
`calculation` con `sourceId = 'calc:electronic-invoicing-336-1'` a la
casilla 39. La deducción se suma con la de dependientes (art. 387) y con
otras `possible_deduction` que ya alimentaran la casilla. La computación
queda en `preliminaryLiquidation.electronicInvoicingDeduction`.

## 5. Verificación

Motor puro — `packages/aegis-rules/tests/electronic-invoicing.test.ts` (7
fixtures):

- Constantes normativas verificadas.
- Sin compras ⇒ deducción 0.
- 1 % por debajo del tope ⇒ `bindingCandidate = 'percentage'`.
- 1 % por encima del tope ⇒ `bindingCandidate = 'uvt_cap'` y aplicado
  igual al tope en pesos.
- Bases negativas normalizadas a cero.
- Redondeo al peso más cercano.
- Año no modelado ⇒ excepción.

Integración F-210 — `packages/form-210/tests/preliminary-liquidation.test.ts`
(3 fixtures nuevos):

- Cablea 1 % a la casilla 39 y a
  `preliminaryLiquidation.electronicInvoicingDeduction` con
  `ruleSourceId = 'et-art-336-1'`.
- Tope 240 UVT respetado cuando el 1 % lo excede
  (`bindingCandidate = 'uvt_cap'`).
- Coexistencia con dependientes: casilla 39 acumula ambas deducciones
  (2 fuentes).

Sweep local: `pnpm -r typecheck` verde; `pnpm -r test` = 331 tests OK
(aegis 91, form-210 31, resto sin regresiones).

## 6. Fuera de alcance

- **Verificación de requisitos legales** (factura vigente, medio de pago
  electrónico, NIT del contribuyente en la factura). La base la aporta el
  analista ya filtrada.
- **Cruce con la exógena** para inferir la base automáticamente. Las
  categorías `electronic_invoicing_total` y
  `electronic_invoicing_benefit_base` ya existen en el dominio; su
  integración con este motor queda para una fase posterior.
- **Distribución entre cédulas** de trabajo, capital y no laboral. El
  motor asume que la deducción se aplica a la cédula general vía casilla
  39 (rentas de trabajo). Si el contribuyente distribuye la base entre
  cédulas, debe recomputar manualmente.
- **Interacción con el límite del art. 336 ET**. La deducción entra a la
  casilla 39 → 40 y se somete al tope conjunto de rentas exentas y
  deducciones (40 % + 1.340 UVT) ya modelado en la Fase D.
