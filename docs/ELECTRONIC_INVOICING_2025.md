# Deducción por facturas electrónicas — motor del 1 % (AG 2025)

_Última actualización: 2026-09-06 — Sprint 2.4, Fase D (corrección normativa)._

> Este documento cubre únicamente el motor puro del 1 % (art. 336-1 ET). El
> reporte DIAN detallado (CUFE, notas crédito/débito, deduplicación,
> conciliación contra Tope 5, decisiones por factura, UI) se documenta en
> [`ELECTRONIC_INVOICE_REPORT_2025.md`](./ELECTRONIC_INVOICE_REPORT_2025.md).

## 1. Alcance

`packages/aegis-rules` modela la deducción imputable a la cédula general por
facturas electrónicas soportadas con medios de pago electrónicos, según el
art. 336-1 del Estatuto Tributario (incorporado por el art. 61 de la
Ley 2277 de 2022). `packages/form-210` la consume desde el builder.

Todo es orientativo. NexusTax no verifica los requisitos legales de la
factura (soporte electrónico, medio de pago, titularidad): esa clasificación
la aporta el analista o, desde la Fase D, el reporte DIAN detallado más las
decisiones tributarias por factura.

## ⚠️ Corrección normativa (Sprint 2.4, Fase D)

La implementación anterior (Fase B0/G del Sprint 2.3.1) cableaba esta
deducción a la **casilla 39** ("Otras deducciones imputables"), que
alimenta la casilla 40 y, de ahí, entra al candidato "componente" del
límite conjunto del 40 %/1.340 UVT en la casilla 41 (`min(40 % × 34,
1.340 UVT, 37 + 40)`).

Esto era normativamente incorrecto. El Decreto 2231 de 2023 (que sustituye
el numeral 5 del art. 336 ET) establece textualmente:

> *"La deducción de que trata el presente numeral **no se encuentra
> sujeta al límite previsto en el numeral 3 del presente artículo** y no
> se tendrá en cuenta para el cálculo de la retención en la fuente, ni
> podrá dar lugar a pérdidas."*

El numeral 3 es exactamente el límite del 40 %/1.340 UVT que gobierna las
casillas 41/65/82. Cablear la deducción a la casilla 39 la exponía a ese
límite indirectamente (si el total de deducciones declaradas superaba el
tope, el candidato "componente" ya no era el limitante y el 1 % podía verse
recortado) — el mismo tipo de error ya corregido para R139 (72 UVT por
dependiente) en la Fase C.

**Corrección**: la deducción se mueve a ser **componente de la casilla 92**
(rentas exentas y deducciones limitadas de la cédula general), análogo a
R139, usando dos casillas informativas nuevas:

- **Casilla 140**: valor de compras con derecho a la deducción (base
  declarada, informativa).
- **Casilla 141**: deducción aplicada (1 % con tope de 240 UVT) —
  componente de la fórmula `92 = 41 + 65 + 82 + 139 + 141`. **Nunca** se
  suma a la casilla 39.

## 2. Regla

El art. 336-1 ET permite tomar como deducción, **fuera del límite conjunto
del 40 %/1.340 UVT**:

```
appliedDeductionCop = min(
  1 % × compras_con_factura_electrónica,
  240 UVT
)
```

Requisitos (validados por el analista o por decisión tributaria por
factura, no automáticamente por el motor):

- Las compras cuentan con **factura electrónica de venta** vigente.
- Se pagaron con **tarjeta débito, crédito o cualquier otro medio de pago
  electrónico** (transferencia, PSE, etc.).
- La factura contiene el **NIT o número de identificación** del
  contribuyente.

Para 2025 el tope absoluto son `240 × 49.799 = 11.951.760` pesos.

## 3. Contrato del motor

`packages/aegis-rules/src/colombia/individual-income-tax/2025/electronic-invoicing.ts`
(sin cambios de Fase D — el motor de cálculo puro ya era correcto; solo su
cableado en `form-210` estaba mal):

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

## 4. Integración en el borrador del F-210 (corregida)

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

Desde la Fase D, `apps/web` nunca declara este valor manualmente: lo deriva
`buildElectronicInvoicingInput` (`apps/web/src/lib/electronicInvoiceEngine.ts`)
a partir de la base explicable del reporte DIAN
(`ElectronicInvoiceBenefitBase.baseConsideredCop`) — ver
`docs/ELECTRONIC_INVOICE_REPORT_2025.md` §6-7.

Cuando `purchasesWithElectronicInvoiceCop > 0`, el builder ejecuta
`computeElectronicInvoicingDeduction` y cablea:

- Casilla **140** ← `purchasesBaseCop` (siempre, informativa).
- Casilla **141** ← `appliedDeductionCop` (solo si > 0; componente de R92).

**Nunca** se agrega a la casilla 39. La computación completa queda en
`preliminaryLiquidation.electronicInvoicingDeduction`.

## 5. Verificación

Motor puro — `packages/aegis-rules/tests/electronic-invoicing.test.ts` (7
fixtures, sin cambios en Fase D — el motor ya era correcto):

- Constantes normativas verificadas.
- Sin compras ⇒ deducción 0.
- 1 % por debajo del tope ⇒ `bindingCandidate = 'percentage'`.
- 1 % por encima del tope ⇒ `bindingCandidate = 'uvt_cap'` y aplicado
  igual al tope en pesos.
- Bases negativas normalizadas a cero.
- Redondeo al peso más cercano.
- Año no modelado ⇒ excepción.

Integración F-210 — `packages/form-210/tests/preliminary-liquidation.test.ts`
(reescritos en Fase D):

- Cablea 1 % a las casillas **140/141** (nunca 39) y a
  `preliminaryLiquidation.electronicInvoicingDeduction` con
  `ruleSourceId = 'et-art-336-1'`.
- Tope 240 UVT respetado cuando el 1 % lo excede
  (`bindingCandidate = 'uvt_cap'`), reflejado en la casilla 141.
- Dependientes (art. 387, casilla 39) y facturación electrónica (casilla 92
  vía 141) nunca se mezclan en la misma casilla.

Sweep local (Fase D): `pnpm -r typecheck` verde; `pnpm -r test` = 562 tests
OK en todo el monorepo (aegis-rules 174, form-210 89, domain 19,
document-intelligence 90, exogenous-parser 77, web 113).

## 6. Fuera de alcance de este documento

- **El reporte DIAN detallado** (CUFE, notas crédito/débito, deduplicación,
  conciliación contra Tope 5, decisiones por factura, doble beneficio, UI,
  tareas) — ver `docs/ELECTRONIC_INVOICE_REPORT_2025.md`.
- **Verificación de requisitos legales** (factura vigente, medio de pago
  electrónico, NIT del contribuyente en la factura) más allá de lo que el
  reporte DIAN y las decisiones del analista ya aportan.
- **Distribución entre cédulas** de trabajo, capital y no laboral. El
  motor asume que la deducción se aplica a la cédula general (rentas de
  trabajo). Si el contribuyente distribuye la base entre cédulas, debe
  recomputar manualmente.

