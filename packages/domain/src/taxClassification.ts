import { z } from 'zod';

export const TaxNatureSchema = z.enum([
  'income',
  'asset',
  'liability',
  'tax_credit',
  'expense_indicator',
  'possible_deduction',
  'movement',
  'informational',
  'unclassified',
]);
export type TaxNature = z.infer<typeof TaxNatureSchema>;

export const TaxCategorySchema = z.enum([
  'employment_income',
  'employment_non_constitutive_income',
  'pension_income',
  'dividend_income',
  'financial_income',
  'other_income',
  'occasional_gain',
  'asset',
  'liability',
  'withholding',
  'bank_movement',
  'card_consumption',
  'purchase',
  'electronic_invoicing_total',
  'electronic_invoicing_benefit_base',
  'investment_movement',
  'investment_asset',
  'employment_reference',
  'social_security_contribution',
  'severance',
  'deduction_candidate',
  'prior_year_balance',
  'informational',
  'unclassified',
]);
export type TaxCategory = z.infer<typeof TaxCategorySchema>;

export const TaxTreatmentSchema = z.enum([
  'add_to_income',
  'add_to_assets',
  'add_to_liabilities',
  'subtract_from_tax',
  'review_as_deduction',
  'threshold_only',
  'do_not_aggregate',
  'requires_review',
  'support_purchases_threshold',
  'estimate_electronic_invoice_benefit',
  'add_to_employment_income',
  'analyze_investment_threshold',
  'reconcile_with_certificate',
  'income_not_constitutive',
]);
export type TaxTreatment = z.infer<typeof TaxTreatmentSchema>;

export const TaxConfidenceSchema = z.enum(['low', 'medium', 'high']);
export type TaxConfidence = z.infer<typeof TaxConfidenceSchema>;

export const ClassificationEvidenceSchema = z.object({
  kind: z.enum([
    'concept_code',
    'suggested_box',
    'detail',
    'entity_category',
    'product_type',
    'relationship_rule',
    'explicit_value_sign',
    'analyst_decision',
  ]),
  value: z.string(),
});
export type ClassificationEvidence = z.infer<typeof ClassificationEvidenceSchema>;

export const SuggestedBoxReferenceSchema = z.object({
  code: z.string().regex(/^R\d+$/),
  number: z.number().int().positive(),
  description: z.string().nullable(),
});
export type SuggestedBoxReference = z.infer<typeof SuggestedBoxReferenceSchema>;

export const SuggestedDeclarationUseSchema = z.object({
  originalText: z.string(),
  mentionedThresholds: z.array(z.number().int().nonnegative()),
  boxReferences: z.array(SuggestedBoxReferenceSchema),
  conditions: z.array(z.string()),
  conditionSignals: z.array(
    z.enum([
      'positive_balance',
      'negative_balance',
      'when_applicable',
      'primary_holder',
      'amount_paid',
      'amount_withheld',
      'closing_balance',
      'period_movement',
    ]),
  ),
  inferredTaxGroups: z.array(z.string()),
  possibleDestinations: z.array(
    z.object({
      boxCode: z.string().nullable(),
      group: z.string(),
      description: z.string().nullable(),
    }),
  ),
  multiplicity: z.enum([
    'single',
    'resolvable_condition',
    'compatible_multiple_uses',
    'real_ambiguity',
  ]),
  isAmbiguous: z.boolean(),
});
export type SuggestedDeclarationUse = z.infer<typeof SuggestedDeclarationUseSchema>;

export const IdentityMatchStatusSchema = z.enum(['matched', 'mismatched', 'unavailable']);
export type IdentityMatchStatus = z.infer<typeof IdentityMatchStatusSchema>;

export const SecondaryTaxUseSchema = z.enum([
  'income_threshold',
  'assets_reconciliation',
  'card_consumption_threshold',
  'deposits_and_investments_threshold',
  'purchases_threshold',
  'document_checklist',
  'electronic_invoice_benefit_base',
]);
export type SecondaryTaxUse = z.infer<typeof SecondaryTaxUseSchema>;

export const MultiplicityTypeSchema = z.enum([
  'single',
  'resolved_condition',
  'compatible_multiple_uses',
  'real_ambiguity',
]);
export type MultiplicityType = z.infer<typeof MultiplicityTypeSchema>;

export const ConsolidationDispositionSchema = z.enum([
  'included',
  'excluded',
  'informational',
  'pending',
]);
export type ConsolidationDisposition = z.infer<typeof ConsolidationDispositionSchema>;
