# Exportación consolidada del F-210 (Fase U)

_Última actualización: 2026-08-08 — Fase U del Sprint 2.3.1._

## 1. Alcance

`packages/form-210` expone `buildForm210ExportBundle` y
`serializeForm210ExportBundle`. Empaquetan el borrador del F-210 junto
con los metadatos del ruleset y **solo las fuentes oficiales realmente
citadas** por los motores. Un revisor externo puede auditar los
cálculos sin acceso al repositorio.

Todo es local y determinista: la función es pura y produce el mismo
JSON para las mismas entradas y el mismo `generatedAt`.

## 2. Contrato

```ts
export interface Form210ExportBundle {
  schema: 'nexustax.form210.export-bundle';
  schemaVersion: '1.0.0';
  generatedAt: string;
  notice: 'Exportación local orientativa — no presentada ante la DIAN';
  ruleset: {
    ruleVersion: string;      // 'co.dian.form210.2025.v1'
    formVersion: string;
    verifiedAt: string;
    taxYear: 2025;
    filingYear: 2026;
  };
  officialSources: readonly OfficialSourceReference[];
  draft: Form210Draft;
}

export function buildForm210ExportBundle(
  draft: Form210Draft,
  options?: { generatedAt?: string },
): Form210ExportBundle;

export function serializeForm210ExportBundle(bundle: Form210ExportBundle): string;
```

## 3. Selección de fuentes

`collectSourceIds` recorre `preliminaryLiquidation` y recolecta un
`Set<string>` de `ruleSourceId`s citados:

- `employmentLimit.legalSourceIds`, `capitalLimit.legalSourceIds`,
  `nonLaborLimit.legalSourceIds` — arts. 336 ET.
- `incomeTax.ruleSourceId` — art. 241 ET.
- `occasionalGainsTax.ruleSourceIds` — arts. 314 / 317 ET.
- `nextYearAdvance.ruleSourceId` — art. 807 ET.
- `dependentsDeduction.ruleSourceId` — art. 387 ET.
- `electronicInvoicingDeduction.ruleSourceId` — art. 336-1 ET.
- `individualDeductionLimits[].ruleSourceIds` — arts. 126-1, 126-4, 119,
  387 ET.
- `priorYearBalance.ruleSourceId` — art. 850 ET.
- `withholdings.ruleSourceId` — art. 373 ET.

Luego filtra `OFFICIAL_SOURCES_2025` para incluir sólo las citadas. Cada
fuente conserva `url`, `verifiedAt`, `scope` y `relatedBoxNumbers`.

## 4. Integración en la app

Dos botones "Exportar bundle" con `downloadTextFile`:

- `Form210DraftPanel` (vista **Borrador Formulario 210**): reemplaza al
  antiguo "Exportar JSON" que serializaba solo el draft.
- `PreliminaryLiquidationPanel` (vista **Liquidación preliminar**): botón
  al lado del saldo neto.

Nombres de archivo:

- `<alias>-borrador-210.json` desde el panel del borrador.
- `<alias>-liquidacion-210.json` desde el panel de liquidación.

Ambos generan el mismo bundle: el archivo contiene el borrador completo,
así que uno solo basta para auditar todo.

## 5. Verificación

Motor puro — `packages/form-210/tests/export-bundle.test.ts` (5 fixtures):

- Empaquetado mínimo cuando no hay fuentes citadas (solo aparece
  `et-art-373` de retenciones, siempre presente vía `withholdings`).
- Cálculo pleno cita las 11 fuentes esperadas.
- Salida determinista con `generatedAt` fijo.
- Serialización JSON válida con la advertencia visible.
- Deduplicación de fuentes cuando el mismo id aparece varias veces
  (dependientes y medicina comparten `et-art-387`).

Verificación real en dev server con expediente del usuario:

- `filename: 'prueba-fase-p-liquidacion-210.json'`
- `size: 54.145 bytes`
- `schema: 'nexustax.form210.export-bundle'`
- `ruleVersion: 'co.dian.form210.2025.v1'`
- `sourceCount: 4` (`et-art-241`, `et-art-336`, `et-art-314`,
  `et-art-373`)
- `netBalanceCop: 11.499.393` — idéntico al panel.

Sweep local: `pnpm -r typecheck` verde; `pnpm -r test` = 371 tests OK
(form-210 44 con 5 nuevos, resto sin regresiones).

## 6. Fuera de alcance

- **Firma criptográfica** del bundle. La integridad se puede verificar
  reproduciendo `buildForm210Draft` con las mismas entradas.
- **Presentación ante la DIAN** o cualquier forma de envío remoto. El
  bundle es exclusivamente para auditoría local o compartir por canales
  del contribuyente.
- **Formato oficial DIAN** del formulario. Este JSON es un artefacto de
  trabajo de NexusTax, no el formulario oficial.
