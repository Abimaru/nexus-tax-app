import type {
  MatrixEntryDisposition,
  RecordRelationType,
  ReconciliationStatus,
  ResolutionStatus,
  TaxCategory,
  TaxNature,
  TaxTreatment,
  TaxConfidence,
  IdentityMatchStatus,
} from '@nexus-tax/domain';

export const CONFIDENCE_LABEL: Record<TaxConfidence, string> = {
  high: 'Alta',
  medium: 'Media',
  low: 'Baja',
};

export const IDENTITY_LABEL: Record<IdentityMatchStatus, string> = {
  matched: 'Coincide',
  mismatched: 'No coincide',
  unavailable: 'No disponible',
};

export const CATEGORY_LABEL: Record<TaxCategory, string> = {
  employment_income: 'Ingresos laborales',
  employment_non_constitutive_income: 'Aportes laborales no constitutivos de renta',
  pension_income: 'Ingresos por pensiones',
  dividend_income: 'Dividendos y participaciones',
  financial_income: 'Rendimientos financieros',
  other_income: 'Otros ingresos',
  occasional_gain: 'Ganancia ocasional',
  asset: 'Activo',
  liability: 'Pasivo',
  withholding: 'Retención',
  bank_movement: 'Movimiento bancario',
  card_consumption: 'Consumo con tarjeta',
  purchase: 'Compra',
  electronic_invoicing_total: 'Total facturación electrónica',
  electronic_invoicing_benefit_base: 'Base susceptible factura electrónica',
  investment_movement: 'Movimiento de inversión',
  investment_asset: 'Activo de inversión',
  employment_reference: 'Referencia laboral',
  social_security_contribution: 'Seguridad social',
  severance: 'Cesantías',
  deduction_candidate: 'Posible deducción',
  prior_year_balance: 'Saldo año anterior',
  informational: 'Informativo',
  unclassified: 'Sin clasificar',
};

export const NATURE_LABEL: Record<TaxNature, string> = {
  income: 'Ingreso',
  asset: 'Activo',
  liability: 'Pasivo',
  tax_credit: 'Crédito tributario',
  expense_indicator: 'Indicador de compras o gastos',
  possible_deduction: 'Posible deducción',
  movement: 'Movimiento',
  informational: 'Informativo',
  unclassified: 'Sin clasificar',
};

export const TREATMENT_LABEL: Record<TaxTreatment, string> = {
  add_to_income: 'Sumar a ingresos',
  add_to_assets: 'Sumar a activos',
  add_to_liabilities: 'Sumar a pasivos',
  subtract_from_tax: 'Restar como retención',
  review_as_deduction: 'Revisar como deducción',
  threshold_only: 'Solo análisis de topes',
  do_not_aggregate: 'No consolidar',
  requires_review: 'Requiere revisión',
  support_purchases_threshold: 'Soporte y conciliación de compras',
  estimate_electronic_invoice_benefit: 'Estimación preliminar del 1 %',
  add_to_employment_income: 'Sumar a ingresos laborales',
  analyze_investment_threshold: 'Analizar tope de movimientos',
  reconcile_with_certificate: 'Conciliar con certificado',
  income_not_constitutive: 'Ingreso no constitutivo de renta',
};

export const RESOLUTION_LABEL: Record<ResolutionStatus, string> = {
  automatically_resolved: 'Resuelto automáticamente',
  analyst_confirmed: 'Confirmado por el analista',
  analyst_modified: 'Modificado por el analista',
  pending_review: 'Pendiente de revisión',
  excluded_justified: 'Excluido con justificación',
  ignored_justified: 'Ignorado con justificación',
};

export const RELATION_LABEL: Record<RecordRelationType, string> = {
  subset_of: 'Subconjunto de',
  component_of: 'Componente de',
  summary_of: 'Resumen de',
  related_movement: 'Movimiento relacionado con',
  informational_basis_of: 'Base informativa de',
  possible_duplicate_of: 'Posible duplicado de',
};

export const DISPOSITION_LABEL: Record<MatrixEntryDisposition, string> = {
  included: 'Incluido',
  excluded: 'Excluido',
  informational: 'Informativo',
  pending: 'Pendiente',
};

export const RECONCILIATION_LABEL: Record<ReconciliationStatus, string> = {
  reconciled: 'Conciliado',
  rounding_difference: 'Diferencia menor por redondeo',
  minor_difference: 'Diferencia menor aceptable',
  relevant_difference: 'Diferencia relevante',
  incomplete: 'Incompleto',
  not_comparable: 'No comparable',
  pending_documents: 'Pendiente de documentos',
  contradicted: 'Contradicho',
};
