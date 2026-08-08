# Retenciones consolidadas (AG 2025)

_Última actualización: 2026-08-07 — Fase N del Sprint 2.3.1._

## 1. Alcance

`packages/aegis-rules` expone `consolidateWithholdings`: función pura que
recibe la lista de retenciones normalizadas (con NIT del retenedor y flag
de soporte documental) y devuelve la consolidación con desglose opcional
por origen, conteo de retenciones sin certificado y pares sospechosos de
duplicidad. `packages/form-210` la consume desde el builder y ajusta
`withholdingsCop` y `withholdings` en la liquidación preliminar.

Sustento normativo: art. 373 del Estatuto Tributario — los valores
retenidos se imputan al impuesto sobre la renta del contribuyente.

## 2. Regla

La consolidación NO decide el origen de cada retención (esa clasificación
la aporta el analista mediante `breakdown`); solo:

- Suma retenciones normalizando negativos a cero.
- Cuenta retenciones sin certificado documental (`hasDocumentSupport = false`).
- Detecta pares con **mismo `entityTaxId`** y diferencia relativa
  ≤ 1 % (`WITHHOLDING_DUPLICATE_RELATIVE_TOLERANCE`).
- Verifica que la suma del desglose coincida con el total reportado.

## 3. Contrato del motor

`packages/aegis-rules/src/colombia/individual-income-tax/2025/withholdings.ts`:

```ts
export const WITHHOLDINGS_SOURCE_ID = 'et-art-373';
export const WITHHOLDING_DUPLICATE_RELATIVE_TOLERANCE = 0.01;

export function consolidateWithholdings(input: {
  taxYear: number;
  sources: readonly WithholdingSource[];
  breakdown?: WithholdingOriginBreakdown;
}): WithholdingConsolidation;
```

Tipos clave (ver `packages/aegis-rules/src/types.ts`):

```ts
interface WithholdingSource {
  sourceId: string;
  label: string;
  valueCop: number;
  entityTaxId: string | null;
  hasDocumentSupport: boolean;
}

type WithholdingOrigin =
  | 'employment' | 'capital' | 'non_labor'
  | 'occasional_gain' | 'dividends' | 'other';

interface WithholdingOriginBreakdown {
  employmentCop: number;
  capitalCop: number;
  nonLaborCop: number;
  occasionalGainCop: number;
  dividendsCop: number;
  otherCop: number;
}
```

`WithholdingConsolidation` expone `totalReportedCop`, `entriesCount`,
`entriesWithoutSupportCount` con sus ids, `breakdown` (o `null`),
`breakdownTotalCop`, `breakdownMatchesReported`, `breakdownDifferenceCop`,
`suspectedDuplicates[]`, `formula` y `ruleSourceId`.

## 4. Integración en el borrador del F-210

`Form210BuildInput` acepta un campo opcional:

```ts
buildForm210Draft({
  caseId: 'case-1',
  taxYear: 2025,
  records,
  facts,
  withholdingsBreakdown: {
    employmentCop: 7_000_000,
    capitalCop: 2_000_000,
    nonLaborCop: 0,
    occasionalGainCop: 0,
    dividendsCop: 0,
    otherCop: 1_000_000,
  },
});
```

Comportamiento del builder:

1. Toma los records de `category === 'withholding'` que estén incluidos y
   los convierte en `WithholdingSource[]` con `entityTaxId` del record.
2. Si la casilla 132 tiene un valor manualmente ajustado que excede la
   suma de records, agrega una fuente sintética `box:132:manual` por la
   diferencia para no perder el total.
3. Ejecuta `consolidateWithholdings`. El total sustituye al viejo
   `withholdingsCop` en la fórmula del `netBalanceCop`.
4. `preliminaryLiquidation.withholdings` conserva la consolidación
   completa.
5. Warnings automáticos:
   - Retenciones sin certificado documental ⇒ warning con conteo.
   - Cada par sospechoso de duplicidad ⇒ warning con labels y razón.
   - Desglose que no cuadra ⇒ warning con la diferencia.

## 5. Verificación

Motor puro — `packages/aegis-rules/tests/withholdings.test.ts` (10
fixtures):

- Total cero sin retenciones.
- Suma y conteo de retenciones sin soporte.
- Normalización de negativos.
- Detección de duplicados con mismo retenedor y valor similar.
- No marca duplicados si el retenedor es distinto.
- Ignora entradas sin `entityTaxId` en la detección de duplicados.
- Desglose que coincide con el total.
- Desglose con discrepancia.
- Rechazo de años no modelados.

Integración F-210 — `packages/form-210/tests/preliminary-liquidation.test.ts`
(3 fixtures nuevos):

- Consolida records con `entityTaxId`, detecta duplicados y emite
  warnings de soporte y doble conteo.
- Valida desglose contra total reportado y emite warning si difiere.
- Respeta ajustes manuales al box 132 vía fuente sintética.

Sweep local: `pnpm -r typecheck` verde; `pnpm -r test` = 366 tests OK
(aegis 118, form-210 39, resto sin regresiones).

## 6. Fuera de alcance

- **Inferencia automática del origen** de cada retención. Hoy el
  desglose lo aporta el analista; el clasificador de exógena podría
  proveerlo en fases posteriores usando `secondaryUses`.
- **Cruce automático con certificados documentales**. `hasDocumentSupport`
  se marca hoy como `false` para todos los records; el enlace con el
  fact/documento correspondiente se hará cuando el modelo de dominio
  exponga esa relación de manera estable.
- **Retenciones especiales de dividendos** (art. 246-1 ET) con tarifa
  propia. Se agregarán como una regla independiente que actualice el
  total al descontar del impuesto.
- **Numeración oficial de las casillas de retención por cédula** en el
  formulario. Sólo se conserva la casilla 132 como total; el desglose
  por origen vive en `preliminaryLiquidation.withholdings.breakdown`.
