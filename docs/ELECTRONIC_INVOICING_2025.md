# Deducción por facturas electrónicas — motor del 1 % (AG 2025)

_Última actualización: 2026-09-06 — Sprint 2.4, revisión normativa puntual (posterior a Fase D)._

> Este documento cubre únicamente el motor puro del 1 % (art. 336 num. 5 ET).
> El reporte DIAN detallado (CUFE, notas crédito/débito, deduplicación,
> conciliación contra Tope 5, decisiones por factura, UI) se documenta en
> [`ELECTRONIC_INVOICE_REPORT_2025.md`](./ELECTRONIC_INVOICE_REPORT_2025.md).

## 1. Alcance

`packages/aegis-rules` modela la deducción especial por compras soportadas
con factura electrónica y pagadas con medios electrónicos, según el
**numeral 5 del artículo 336 del Estatuto Tributario** (texto introducido
por el art. 7 de la Ley 2277 de 2022, que sustituyó el artículo 336
completo). `packages/form-210` la consume desde el builder.

Todo es orientativo. NexusTax no verifica los requisitos legales de la
factura (soporte electrónico, medio de pago, titularidad): esa clasificación
la aporta el analista o, desde la Fase D, el reporte DIAN detallado más las
decisiones tributarias por factura.

## ⚠️ Historial de correcciones normativas

Este beneficio ha requerido **dos correcciones sucesivas** en el mismo
Sprint 2.4, ambas verificadas con múltiples fuentes independientes:

### Corrección 1 (Fase D): destino incorrecto en la casilla 39

La implementación original (Fase B0/G del Sprint 2.3.1) cableaba esta
deducción a la **casilla 39** ("Otras deducciones imputables"), que
alimenta la casilla 40 y, de ahí, entra al candidato "componente" del
límite conjunto del 40 %/1.340 UVT en la casilla 41
(`min(40 % × 34, 1.340 UVT, 37 + 40)`) — exponiéndola indirectamente a un
límite del que la norma la exime expresamente.

### Corrección 2 (revisión normativa puntual posterior a Fase D): fundamento legal y casilla real incorrectos

Al corregir el destino en la Fase D, se asumió erróneamente que:

1. El fundamento legal era el **"artículo 336-1 ET"**.
2. La casilla oficial correcta era la **141** (componente de R92, junto a
   R138/R139 de dependientes), con R140 como base informativa.

Ambos supuestos eran incorrectos, verificados con múltiples fuentes
independientes (Estatuto.co, Gerencie, Consultor Contable, Connotar, y
cobertura de prensa específica de la temporada de declaración AG2025/2026):

- El **artículo 336-1 ET** (adicionado por el art. 60 de la Ley 2277 de
  2022) es una norma **completamente distinta**: estimación de costos y
  gastos deducibles (tope indicativo del 60 % de ingresos brutos de rentas
  de trabajo, u otro que fije la DIAN por actividad económica). Su exceso
  se informa marcando la **casilla 140** — un **indicador booleano**
  ("marque X"), nunca un valor monetario.
- La **casilla 141** del Formulario 210 corresponde al **impuesto
  voluntario del art. 244-1 ET** — sin relación alguna con dependientes ni
  con facturación electrónica.
- La deducción del 1 % tiene su **propia casilla oficial: la 28** (sección
  de datos informativos, previa a patrimonio), confirmada explícitamente
  por Connotar ("Nueva casilla 28 del formulario 210 para informar el 1 %
  de las compras personales") y por cobertura de prensa del calendario
  AG2025/2026 ("el valor correspondiente al 1 % debe registrarse en la
  casilla 28 del formulario").

### Corrección aplicada

La deducción del numeral 5 del art. 336 ET se cablea ahora a su **casilla
propia (28)**, completamente separada de R39, R92, R140 y R141. R140 y R141
recuperan su significado oficial correcto (indicador de costos/gastos
estimados y impuesto voluntario, respectivamente) y ninguno recibe valores
de este motor. R28 nunca participa de ninguna fórmula de consolidación
cedular (R91/R92/R93): el numeral 5 exime expresamente esta deducción del
límite del 40 %/1.340 UVT del numeral 3 del mismo artículo.

## 2. Regla

El numeral 5 del art. 336 ET permite tomar como deducción, **fuera del
límite conjunto del 40 %/1.340 UVT**:

```
appliedDeductionCop = min(
  1 % × compras_con_factura_electrónica,
  240 UVT
)
```

Requisitos (validados por el analista o por decisión tributaria por
factura, no automáticamente por el motor):

- Las compras cuentan con **factura electrónica de venta** vigente,
  expedida por un sujeto obligado a facturar electrónicamente.
- Se pagaron con **tarjeta débito, crédito o cualquier otro medio de pago
  electrónico** vigilado por la Superintendencia Financiera (transferencia,
  PSE, etc.), dentro del mismo período gravable.
- La factura contiene el **NIT o número de identificación** del
  contribuyente.
- La compra no debe haberse usado como costo, deducción, IVA descontable,
  ingreso no constitutivo, renta exenta, descuento tributario u otro
  beneficio (evita doble beneficio — ver `ELECTRONIC_INVOICE_REPORT_2025.md`).

Para 2025 el tope absoluto son `240 × 49.799 = 11.951.760` pesos.

## 3. Contrato del motor

`packages/aegis-rules/src/colombia/individual-income-tax/2025/electronic-invoicing.ts`
(el cálculo puro ya era correcto desde su creación; solo el `sourceId` y su
cableado en `form-210` necesitaban corrección):

```ts
export const ELECTRONIC_INVOICING_SOURCE_ID = 'et-art-336-num-5';
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

El catálogo `OFFICIAL_SOURCES_2025` (`packages/aegis-rules/src/colombia/individual-income-tax/2025/official-sources.ts`)
registra ahora **tres fuentes separadas** para evitar la confusión que
originó la Corrección 2:

| id | Norma | Casilla | Naturaleza |
|---|---|---|---|
| `et-art-336-num-5` | Art. 336 num. 5 ET | 28 | Deducción monetaria del 1 % |
| `et-art-336-1` | Art. 336-1 ET | 140 | Indicador booleano (exceso de costos/gastos) |
| `et-art-244-1` | Art. 244-1 ET | 141 | Impuesto voluntario (no modelado) |

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

`apps/web` nunca declara este valor manualmente: lo deriva
`buildElectronicInvoicingInput` (`apps/web/src/lib/electronicInvoiceEngine.ts`)
a partir de la base explicable del reporte DIAN
(`ElectronicInvoiceBenefitBase.baseConsideredCop`) — ver
`docs/ELECTRONIC_INVOICE_REPORT_2025.md` §6-7.

Cuando `purchasesWithElectronicInvoiceCop > 0` y `appliedDeductionCop > 0`,
el builder ejecuta `computeElectronicInvoicingDeduction` y cablea:

- Casilla **28** ← `appliedDeductionCop` (única fuente; dato informativo
  previo a patrimonio).

**Nunca** se agrega a la casilla 39, ni participa de la fórmula de R92
(`92 = 41 + 65 + 82 + 139`). La computación completa queda en
`preliminaryLiquidation.electronicInvoicingDeduction`.

## 5. Verificación

Motor puro — `packages/aegis-rules/tests/electronic-invoicing.test.ts` (8
tests, +1 de la revisión puntual que verifica el catálogo de fuentes):

- Constantes normativas verificadas.
- El `sourceId` resuelve a `et-art-336-num-5` en el catálogo oficial, con
  `relatedBoxNumbers: [28]`; el id real `et-art-336-1` resuelve por
  separado con `relatedBoxNumbers: [140]` y nunca menciona "factura
  electrónica" en su título (guardarraíl contra una futura confusión).
- Sin compras ⇒ deducción 0.
- 1 % por debajo del tope ⇒ `bindingCandidate = 'percentage'`.
- 1 % por encima del tope ⇒ `bindingCandidate = 'uvt_cap'` y aplicado
  igual al tope en pesos.
- Bases negativas normalizadas a cero.
- Redondeo al peso más cercano.
- Año no modelado ⇒ excepción.

Integración F-210 — `packages/form-210/tests/preliminary-liquidation.test.ts`
(reescritos en la revisión puntual, incluye un bloque `describe`
"GUARDARRAÍL" con 4 tests dedicados):

- Cablea 1 % a la casilla **28** (nunca 39, nunca 140/141) y a
  `preliminaryLiquidation.electronicInvoicingDeduction` con
  `ruleSourceId = 'et-art-336-num-5'`.
- Tope 240 UVT respetado cuando el 1 % lo excede
  (`bindingCandidate = 'uvt_cap'`), reflejado en la casilla 28.
- Dependientes (art. 387, casilla 39) y facturación electrónica (casilla
  28) nunca se mezclan en la misma casilla.
- **Guardarraíles explícitos**: R140 nunca se trata como importe COP (sus
  `sources` permanecen vacíos incluso con facturación electrónica
  declarada); R141 nunca se usa para esta deducción; el 1 % nunca vuelve a
  cablearse en R39; el 1 % nunca queda sujeto al límite del 40 %/1.340 UVT
  (verificado forzando R41 = 0 por un tope de deducciones agotado y
  confirmando que R28 conserva su valor íntegro).

Sweep local (revisión puntual): `pnpm -r typecheck` verde; `pnpm -r test` =
566 tests OK en todo el monorepo (aegis-rules 175, form-210 93, domain 19,
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
- **El indicador de exceso de costos/gastos (casilla 140, art. 336-1 ET)**
  no se modela en esta fase: la casilla permanece `not_implemented` para
  no inventar un valor booleano sin un motor que lo respalde.
- **El impuesto voluntario (casilla 141, art. 244-1 ET)** no se modela en
  esta fase.

