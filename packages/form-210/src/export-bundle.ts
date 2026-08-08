import type { OfficialSourceReference } from '@nexus-tax/aegis-rules';
import { OFFICIAL_SOURCES_2025 } from '@nexus-tax/aegis-rules';
import { FORM_210_RULESET_2025 } from './ruleset-2025';
import type { Form210Draft, Form210PreliminaryLiquidation } from './types';

/**
 * Empaque autocontenido del borrador del F-210 para exportación local. A
 * diferencia de `serializeForm210Draft`, este bundle **incluye** las fuentes
 * oficiales citadas por el motor y los metadatos del ruleset, de modo que
 * cualquier revisor externo pueda auditar los cálculos sin acceso al
 * repositorio.
 *
 * Nada se envía por red: la función es pura y determinista. La responsabilidad
 * de guardar el JSON en disco queda del consumidor (habitualmente
 * `downloadTextFile` en la app web).
 */
export interface Form210ExportBundle {
  schema: 'nexustax.form210.export-bundle';
  schemaVersion: '1.0.0';
  generatedAt: string;
  notice: 'Exportación local orientativa — no presentada ante la DIAN';
  ruleset: {
    ruleVersion: string;
    formVersion: string;
    verifiedAt: string;
    taxYear: 2025;
    filingYear: 2026;
  };
  officialSources: readonly OfficialSourceReference[];
  draft: Form210Draft;
}

function collectSourceIds(draft: Form210Draft): string[] {
  const ids = new Set<string>();
  const liq: Form210PreliminaryLiquidation | null = draft.preliminaryLiquidation;
  if (liq) {
    if (liq.employmentLimit) for (const id of liq.employmentLimit.legalSourceIds) ids.add(id);
    if (liq.capitalLimit) for (const id of liq.capitalLimit.legalSourceIds) ids.add(id);
    if (liq.nonLaborLimit) for (const id of liq.nonLaborLimit.legalSourceIds) ids.add(id);
    if (liq.incomeTax) ids.add(liq.incomeTax.ruleSourceId);
    if (liq.occasionalGainsTax) for (const id of liq.occasionalGainsTax.ruleSourceIds) ids.add(id);
    if (liq.nextYearAdvance) ids.add(liq.nextYearAdvance.ruleSourceId);
    if (liq.dependentsDeduction) ids.add(liq.dependentsDeduction.ruleSourceId);
    if (liq.electronicInvoicingDeduction) ids.add(liq.electronicInvoicingDeduction.ruleSourceId);
    for (const item of liq.individualDeductionLimits) {
      for (const id of item.ruleSourceIds) ids.add(id);
    }
    if (liq.priorYearBalance) ids.add(liq.priorYearBalance.ruleSourceId);
    ids.add(liq.withholdings.ruleSourceId);
  }
  return Array.from(ids).sort();
}

/**
 * Construye el bundle exportable. `generatedAt` se puede fijar para tests
 * deterministas; en producción se omite y toma la hora actual.
 */
export function buildForm210ExportBundle(
  draft: Form210Draft,
  options: { generatedAt?: string } = {},
): Form210ExportBundle {
  const usedIds = new Set(collectSourceIds(draft));
  const officialSources = OFFICIAL_SOURCES_2025.filter((source) => usedIds.has(source.id));
  return {
    schema: 'nexustax.form210.export-bundle',
    schemaVersion: '1.0.0',
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    notice: 'Exportación local orientativa — no presentada ante la DIAN',
    ruleset: {
      ruleVersion: FORM_210_RULESET_2025.ruleVersion,
      formVersion: FORM_210_RULESET_2025.formVersion,
      verifiedAt: FORM_210_RULESET_2025.verifiedAt,
      taxYear: FORM_210_RULESET_2025.taxYear,
      filingYear: FORM_210_RULESET_2025.filingYear,
    },
    officialSources,
    draft,
  };
}

/** Serializa el bundle a JSON indentado, con orden de claves estable. */
export function serializeForm210ExportBundle(bundle: Form210ExportBundle): string {
  return JSON.stringify(bundle, null, 2);
}
