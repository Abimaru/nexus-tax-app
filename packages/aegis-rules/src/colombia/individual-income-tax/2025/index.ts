import { DEADLINE_SOURCE_ID, INDIVIDUAL_INCOME_TAX_DEADLINES_2026 } from './deadlines-2026';
import {
  FILING_CRITERIA_2025,
  FILING_YEAR,
  INDIVIDUAL_INCOME_TAX_2025_RULE_VERSION,
  TAX_YEAR,
  UVT_2025,
} from './filing-obligation';
import { FILING_RULE_SOURCES_2025, VERIFIED_AT } from './sources';

export const INDIVIDUAL_INCOME_TAX_RULESET_2025 = {
  taxYear: TAX_YEAR,
  filingYear: FILING_YEAR,
  uvt: {
    value: UVT_2025,
    sourceId: 'dian-resolucion-000193-2024',
  },
  criteria: FILING_CRITERIA_2025,
  deadlines: INDIVIDUAL_INCOME_TAX_DEADLINES_2026,
  deadlineSourceId: DEADLINE_SOURCE_ID,
  sources: FILING_RULE_SOURCES_2025,
  version: INDIVIDUAL_INCOME_TAX_2025_RULE_VERSION,
  verifiedAt: VERIFIED_AT,
} as const;

export * from './deadlines-2026';
export * from './filing-obligation';
export * from './sources';
export * from './official-sources';
export * from './tax-unit';
export * from './progressive-tax';
export * from './tax-limits';
export * from './occasional-gains';
export * from './advance-payment';
export * from './dependents';
export * from './patrimony-checks';
export * from './electronic-invoicing';
export * from './individual-deductions';
export * from './prior-year-balance';
export * from './withholdings';
export * from './cross-validations';
