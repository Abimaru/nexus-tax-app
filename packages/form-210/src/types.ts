import type {
  DocumentFact,
  NormalizedExogenousRecord,
  TaxCategory,
  TaxResolutionDecision,
} from '@nexus-tax/domain';
import type {
  AdvancePaymentComputation,
  OccasionalGainsTaxComputation,
  ProgressiveTaxComputation,
  TaxLimitComputation,
} from '@nexus-tax/aegis-rules';

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
  /**
   * Liquidación preliminar orientativa. Se genera cuando el borrador tiene
   * datos suficientes para calcular renta líquida gravable, impuesto de renta
   * y saldo. Nunca reemplaza la revisión humana ni se presenta ante la DIAN.
   */
  preliminaryLiquidation: Form210PreliminaryLiquidation | null;
}

/**
 * Estado de la liquidación preliminar. Se conserva separado del estado del
 * borrador porque los datos suficientes para calcular impuesto no equivalen
 * a un borrador listo para presentar (nunca lo estarán en este proyecto).
 */
export type Form210PreliminaryLiquidationStatus =
  | 'insufficient_data'
  | 'zero'
  | 'refund'
  | 'to_pay';

/**
 * Resultado explicable de la liquidación privada preliminar.
 *
 * El objeto acompaña al borrador para que la UI pueda mostrar cada valor con
 * su fórmula, la fuente normativa que la respalda y las advertencias que
 * afectan la confianza. La numeración de casillas oficiales se conserva solo
 * para las que están fijadas por el instructivo (41, 65, 82 vía art. 336 ET);
 * los importes derivados (impuesto de renta, ganancias ocasionales, total a
 * cargo, saldo) NO se atribuyen a una casilla oficial concreta hasta que su
 * numeración se verifique con el formulario DIAN.
 */
export interface Form210PreliminaryLiquidation {
  ruleVersion: string;
  generatedAt: string;

  /** Suma de las rentas líquidas ordinarias de las tres sub-cédulas (42+66+83). */
  generalCedularTaxableIncomeCop: number;
  /** Base gravable de la cédula general en UVT (informativo). */
  generalCedularTaxableIncomeUvt: number;

  /** Detalle del límite art. 336 aplicado a la casilla 41 (trabajo). */
  employmentLimit: TaxLimitComputation | null;
  /** Detalle del límite art. 336 aplicado a la casilla 65 (capital). */
  capitalLimit: TaxLimitComputation | null;
  /** Detalle del límite art. 336 aplicado a la casilla 82 (no laboral). */
  nonLaborLimit: TaxLimitComputation | null;

  /** Cálculo progresivo (art. 241 ET) sobre `generalCedularTaxableIncomeCop`. */
  incomeTax: ProgressiveTaxComputation | null;

  /**
   * Base de ganancias ocasionales gravables (casilla 115). Se conserva
   * separada porque la tarifa aplicable no es la progresiva del art. 241.
   */
  occasionalGainsTaxableCop: number;
  /**
   * Detalle del impuesto de ganancias ocasionales calculado por el motor puro
   * (`computeOccasionalGainsTax`). El desglose por tipo (general 15 %, loterías
   * 20 %) se toma de las bases informadas y conserva la fuente por componente.
   * Es `null` cuando no hay base gravable (casilla 115 y loterías en cero).
   */
  occasionalGainsTax: OccasionalGainsTaxComputation | null;

  /** Total impuesto a cargo = impuesto renta + impuesto GO. */
  totalTaxDueCop: number;

  /** Créditos que reducen el saldo. Se toman de las casillas del F-210. */
  priorYearAdvanceCop: number; // Casilla 130
  priorYearBalanceCop: number; // Casilla 131
  withholdingsCop: number; // Casilla 132

  /**
   * Anticipo del impuesto de renta del año siguiente (art. 807 ET). Se
   * calcula con `computeAdvancePayment` si el input incluye el conteo de
   * declaraciones. `null` cuando no hay datos suficientes o cuando el
   * impuesto de renta es cero. Se **suma** al saldo (aumenta lo a pagar).
   */
  nextYearAdvance: AdvancePaymentComputation | null;

  /**
   * Saldo neto: positivo = a pagar; negativo = a favor. Fórmula:
   *   totalTaxDueCop + nextYearAdvance.netAdvanceCop
   *   − priorYearAdvanceCop − priorYearBalanceCop − withholdingsCop.
   */
  netBalanceCop: number;

  status: Form210PreliminaryLiquidationStatus;
  warnings: readonly string[];
  notice: 'Liquidación preliminar orientativa — no presentada ante la DIAN';
}

/**
 * Estado de validación normativa de una casilla del Formulario 210:
 *   - `verified`: la fórmula es literal del instructivo oficial y hay una
 *     fuente que la respalda; el cálculo se puede reportar como resultado.
 *   - `implemented_unverified`: la casilla se calcula, pero no está verificada
 *     por una regla oficial explícita (p. ej. agrupación por categoría). El
 *     valor es orientativo y NO se debe presentar como definitivo.
 *   - `requires_review`: hay implementación pero depende de una interpretación
 *     no confirmada; se crea una tarea y no se cierra la casilla.
 *   - `not_implemented`: la casilla existe en el modelo pero aún no se calcula.
 */
export type Form210RuleValidationStatus =
  | 'not_implemented'
  | 'implemented_unverified'
  | 'requires_review'
  | 'verified';

/** Ejemplo manual de cálculo, usado como caso de verificación de una regla. */
export interface Form210ValidationExample {
  description: string;
  inputs: Readonly<Record<string, number>>;
  expected: number;
}

/**
 * Fila de la matriz de validación normativa. Se emite por cada casilla del
 * ruleset y describe qué respalda la fórmula (fuente oficial), qué examples
 * verifican el cálculo y cuál es el estado actual de implementación.
 */
export interface Form210RuleValidation {
  boxNumber: number;
  ruleId: string;
  taxYear: number;
  filingYear: number;
  formulaDescription: string;
  /** Ids de fuentes oficiales (ver `OFFICIAL_SOURCES_2025` en aegis-rules). */
  legalBasisSourceIds: readonly string[];
  examples: readonly Form210ValidationExample[];
  implementationStatus: Form210RuleValidationStatus;
  verifiedAt?: string;
  notes?: string;
}

/**
 * Desglose orientativo de la base de ganancias ocasionales entre tarifa
 * general (15 %) y loterías (20 %). Se conserva como input explícito del
 * analista porque los adaptadores de exógena aún no distinguen loterías del
 * resto de ganancias ocasionales. Si el desglose no se provee, el motor asume
 * que toda la casilla 115 tributa a la tarifa general y emite una advertencia.
 */
export interface Form210OccasionalGainsBreakdown {
  /** Base sujeta a tarifa general (art. 314 ET). */
  generalBaseCop: number;
  /** Base sujeta a tarifa de loterías (art. 317 ET). */
  lotteryBaseCop: number;
}

/**
 * Contexto para calcular el anticipo del año siguiente (art. 807 ET). Todos
 * los campos son responsabilidad del analista: NexusTax no mantiene el
 * historial de declaraciones previas del contribuyente.
 */
export interface Form210AdvancePaymentContext {
  /**
   * Conteo de declaraciones incluida la que se está preparando. `1` primera
   * vez, `2` segunda, `3` tercera o siguientes.
   */
  filingCountIncludingCurrent: 1 | 2 | 3;
  /**
   * Impuesto neto de renta del año inmediatamente anterior, en pesos. `null`
   * si no está confirmado; el motor usará solo el impuesto neto del año
   * actual.
   */
  priorNetIncomeTaxCop: number | null;
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
  occasionalGainsBreakdown?: Form210OccasionalGainsBreakdown;
  advancePaymentContext?: Form210AdvancePaymentContext;
}
