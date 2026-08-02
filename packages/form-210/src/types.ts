import type {
  DocumentFact,
  NormalizedExogenousRecord,
  TaxCategory,
  TaxResolutionDecision,
} from '@nexus-tax/domain';

export type Form210Section =
  | 'patrimony'
  | 'employment_income'
  | 'capital_income'
  | 'non_labor_income'
  | 'pensions'
  | 'dividends'
  | 'occasional_gains'
  | 'private_settlement';

export type Form210BoxStatus =
  | 'no_data'
  | 'suggested'
  | 'incomplete'
  | 'requires_decision'
  | 'confirmed'
  | 'calculated'
  | 'contradicted'
  | 'not_applicable';

export type Form210SourceType =
  | 'exogenous'
  | 'document'
  | 'manual_fact'
  | 'resolution'
  | 'calculation'
  | 'prior_return'
  | 'provisional_source';

export interface Form210SourceTrace {
  type: Form210SourceType;
  sourceId: string;
  recordId: string | null;
  documentId: string | null;
  factId: string | null;
  label: string;
  value: number;
  evidence: string;
}

export interface Form210BoxDefinition {
  number: number;
  name: string;
  section: Form210Section;
  formula: string | null;
  dependencies: number[];
  ruleComplete: boolean;
}

export interface Form210BoxValue extends Form210BoxDefinition {
  suggestedValue: number | null;
  confirmedValue: number | null;
  sources: Form210SourceTrace[];
  includedSourceIds: string[];
  excludedSourceIds: string[];
  confidence: 'high' | 'medium' | 'low';
  status: Form210BoxStatus;
  warnings: string[];
  resolutionId: string | null;
  ruleVersion: string;
}

export interface Form210ValidationFinding {
  id: string;
  severity: 'error' | 'warning' | 'information';
  code:
    | 'dependency_exceeds_base'
    | 'inconsistent_net_worth'
    | 'costs_exceed_income'
    | 'withholding_without_support'
    | 'occasional_gain_in_general_bucket'
    | 'unsupported_deduction'
    | 'double_counting'
    | 'provisional_source'
    | 'incompatible_year'
    | 'wrong_cutoff_date'
    | 'confirmed_with_pending_records'
    | 'implausible_value';
  message: string;
  boxNumbers: number[];
  sourceIds: string[];
}

export interface Form210DraftStatus {
  status: 'not_started' | 'building' | 'with_pending_items' | 'ready_for_review' | 'reviewed';
  confirmedBoxes: number;
  calculatedBoxes: number;
  pendingBoxes: number;
  blockers: number;
}

export interface Form210Draft {
  id: string;
  caseId: string;
  taxYear: 2025;
  filingYear: 2026;
  formVersion: string;
  ruleVersion: string;
  generatedAt: string;
  notice: 'Borrador de trabajo — no presentado ante la DIAN';
  boxes: Form210BoxValue[];
  findings: Form210ValidationFinding[];
  status: Form210DraftStatus;
  resolutionIds: string[];
  includesBinaryData: false;
  presentationStatus: 'out_of_scope';
}

export interface Form210BuildInput {
  caseId: string;
  taxYear: number;
  records: readonly NormalizedExogenousRecord[];
  facts: readonly DocumentFact[];
  resolutions?: readonly TaxResolutionDecision[];
  recordStates?: readonly {
    recordId: string;
    category: TaxCategory;
    disposition: 'included' | 'excluded' | 'informational' | 'pending';
  }[];
  provisionalRecordIds?: readonly string[];
  generatedAt?: string;
}
