import type { ExogenousThreshold } from '@nexus-tax/domain';

export type FilingCriterionId =
  | 'gross_income'
  | 'gross_assets'
  | 'credit_card_consumption'
  | 'deposits_and_investments'
  | 'purchases_and_consumption'
  | 'vat_responsible_at_year_end';

export type FilingThresholdCriterionId = Exclude<FilingCriterionId, 'vat_responsible_at_year_end'>;

export type FilingOperator = 'gt' | 'gte' | 'eq';

export interface FilingRuleSource {
  id: string;
  authority: 'DIAN';
  title: string;
  url: string;
  verifiedAt: string;
}

export interface FilingCriterion {
  id: FilingCriterionId;
  label: string;
  inputKind: 'threshold' | 'boolean';
  operator: FilingOperator;
  uvtAmount?: number;
  exactAmount?: number;
  officialRoundedAmount?: number;
  sourceId: string;
}

export interface ThresholdEvidence {
  originalLabel: string;
  normalizedLabel: string;
  source: ExogenousThreshold['source'];
}

export interface FilingCriterionResult {
  criterionId: FilingCriterionId;
  label: string;
  operator: FilingOperator;
  sourceId: string;
  result: 'met' | 'not_met' | 'not_evaluable';
  observedValue: number | boolean | null;
  uvtAmount?: number;
  exactAmount?: number;
  officialRoundedAmount?: number;
  evidence: ThresholdEvidence | { kind: 'user_input'; label: string } | null;
  explanation: string;
}

export interface FilingDeadlineResult {
  status: 'available' | 'missing_document';
  lastTwoDigits: string | null;
  dueDate: string | null;
  sourceId: string;
  explanation: string;
}

export interface FilingObligationAssessment {
  taxYear: number;
  filingYear: number;
  status: 'required' | 'not_required' | 'pending_information';
  reasons: FilingCriterionResult[];
  missingInputs: string[];
  deadline: FilingDeadlineResult;
  evaluatedAt: string;
  ruleVersion: string;
}

export interface FilingObligationInputs {
  thresholds: ExogenousThreshold[];
  isVatResponsibleAtYearEnd: boolean | null;
  document: string | null;
  documentType?: string | null;
  evaluatedAt: string;
}

export interface MappedThreshold {
  criterionId: FilingThresholdCriterionId;
  threshold: ExogenousThreshold;
}
