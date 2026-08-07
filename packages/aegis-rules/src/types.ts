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

/**
 * Referencia canónica a una fuente oficial que respalda una regla tributaria.
 * Superconjunto retro-compatible de `FilingRuleSource`: cualquier referencia
 * antigua puede tratarse como `OfficialSourceReference` con `taxYear` opcional.
 * Fuentes aceptadas: DIAN, Estatuto Tributario, decretos, resoluciones,
 * formularios oficiales e instructivos.
 */
export type OfficialSourceAuthority =
  | 'DIAN'
  | 'Estatuto Tributario'
  | 'Congreso'
  | 'MinHacienda'
  | 'Presidencia';

export interface OfficialSourceReference {
  /** Identificador estable, usado desde las reglas por `sourceId`. */
  id: string;
  authority: OfficialSourceAuthority;
  title: string;
  url: string;
  /** Fecha del documento oficial (ISO). Opcional cuando no aplica. */
  documentDate?: string;
  /** Fecha en que un humano verificó la fuente durante desarrollo (ISO). */
  verifiedAt: string;
  /** Año gravable al que aplica; puede ser transversal (`null`). */
  taxYear: number | null;
  /** Alcance en lenguaje breve: p. ej. "Obligación de declarar", "UVT". */
  scope: string;
  /**
   * Números de casilla del Formulario 210 relacionadas, cuando la fuente
   * ampare específicamente reglas de casilla.
   */
  relatedBoxNumbers?: readonly number[];
  /**
   * Huella opcional (p. ej. SHA-256 del PDF descargado en desarrollo) para
   * detectar cambios silenciosos en la publicación oficial. No se descarga en
   * tiempo de ejecución del usuario.
   */
  checksum?: string;
}

/**
 * Definición central del valor de la Unidad de Valor Tributario (UVT) para un
 * año gravable. Todas las reglas y cálculos deben consumir el UVT desde aquí,
 * nunca literalizarlo, para evitar duplicaciones cuando cambia anualmente.
 */
export interface TaxUnitDefinition {
  taxYear: number;
  /** Valor en pesos colombianos (COP) del UVT vigente para el año. */
  valueCop: number;
  /** Id de la fuente oficial (ver `OfficialSourceReference`). */
  officialSourceId: string;
  /** Fecha en que un humano verificó el valor durante desarrollo (ISO). */
  verifiedAt: string;
}

/**
 * Rango de la tabla progresiva de renta. Cada rango declara su tarifa marginal
 * y el impuesto acumulado hasta el piso del rango, en UVT. El cálculo aplica:
 *
 *   impuesto_uvt = (base_gravable_uvt - fromUvt) * marginalRate + baseTaxUvt
 *
 * Cuando `toUvt` está definido, el rango termina en ese valor (inclusive
 * conceptualmente por el diseño oficial). Cuando es `undefined` el rango es el
 * último y aplica sin cota superior.
 */
export interface ProgressiveTaxBracket {
  /** Piso del rango, en UVT (inclusive). */
  fromUvt: number;
  /** Techo del rango, en UVT (inclusive). Undefined = rango final abierto. */
  toUvt?: number;
  /** Tarifa marginal aplicada al exceso sobre `fromUvt` (0..1). */
  marginalRate: number;
  /** Impuesto acumulado en UVT al comenzar el rango. */
  baseTaxUvt: number;
}

/** Tabla completa aplicable a un año gravable, con su fuente oficial. */
export interface ProgressiveTaxTable {
  taxYear: number;
  officialSourceId: string;
  verifiedAt: string;
  brackets: readonly ProgressiveTaxBracket[];
}

/**
 * Regla de límite tributario declarativa. Cubre por ahora el patrón
 * "porcentaje de una base + tope en UVT" que aplica el art. 336 del Estatuto
 * Tributario a rentas exentas y deducciones de la cédula general.
 *
 * `componentBoxNumbers` son las casillas cuya suma se pretende deducir; el
 * resultado limitado nunca supera esa suma (no "infla" el beneficio).
 */
export interface TaxLimitRule {
  id: string;
  description: string;
  type: 'percentage_and_uvt_cap';
  /** Casilla cuya renta líquida sirve de base para el porcentaje. */
  baseBoxNumber: number;
  /** Casillas cuya suma es el componente candidato a limitar. */
  componentBoxNumbers: readonly number[];
  /** Porcentaje sobre la base (0..1). */
  percentageOfBase: number;
  /** Tope absoluto en UVT que no se puede superar. */
  uvtCap: number;
  /** Casilla del formulario que recibe el resultado limitado. */
  targetBoxNumber: number;
  /** Ids de fuentes oficiales que amparan la regla. */
  legalSourceIds: readonly string[];
}

/**
 * Detalle explicable del resultado de aplicar una `TaxLimitRule`. La UI puede
 * mostrar cuál de los tres candidatos (porcentaje, tope en UVT, componente
 * detectado) fue el limitante efectivo.
 */
export interface TaxLimitComputation {
  ruleId: string;
  taxYear: number;
  baseBoxNumber: number;
  targetBoxNumber: number;
  baseValueCop: number;
  componentValueCop: number;
  percentageCandidateCop: number;
  uvtCapValueCop: number;
  appliedValueCop: number;
  bindingCandidate: 'percentage' | 'uvt_cap' | 'component';
  formula: string;
  legalSourceIds: readonly string[];
}

/**
 * Detalle de un cálculo progresivo, para explicar el resultado paso a paso en
 * la UI (rango aplicado, tarifa, aritmética, redondeos).
 */
export interface ProgressiveTaxComputation {
  taxYear: number;
  taxableIncomeCop: number;
  taxableIncomeUvt: number;
  bracket: ProgressiveTaxBracket;
  excessUvt: number;
  marginalTaxUvt: number;
  totalTaxUvt: number;
  totalTaxCopRounded: number;
  ruleSourceId: string;
  formula: string;
}

/**
 * Tipo de ganancia ocasional según su tarifa aplicable en Colombia.
 * - `general`: tarifa general del 15 % (art. 314 ET, reformado por la Ley
 *   2277 de 2022). Aplica a la mayoría de ganancias ocasionales de personas
 *   naturales residentes: venta de activos fijos poseídos por más de 2 años,
 *   herencias por encima de la parte exenta, indemnizaciones por seguros de
 *   vida, etc.
 * - `lottery`: 20 % (art. 317 ET). Aplica a loterías, rifas, apuestas y
 *   similares. En la realidad la retención en la fuente es equivalente y el
 *   impuesto se puede considerar como una retención definitiva.
 */
export type OccasionalGainKind = 'general' | 'lottery';

/** Definición de una tarifa aplicable a ganancias ocasionales. */
export interface OccasionalGainRate {
  kind: OccasionalGainKind;
  /** Tarifa entre 0 y 1. */
  rate: number;
  /** Id en el catálogo de fuentes oficiales. */
  officialSourceId: string;
  description: string;
}

/** Detalle de un componente de ganancia ocasional dentro del cálculo total. */
export interface OccasionalGainComponent {
  kind: OccasionalGainKind;
  baseCop: number;
  rate: number;
  taxCop: number;
  officialSourceId: string;
}

/**
 * Resultado explicable del impuesto de ganancias ocasionales para un año
 * gravable. Cada componente conserva la fuente que lo respalda para que la UI
 * pueda mostrarlo separado. `formula` es un texto legible; `totalTaxCop` está
 * redondeado a pesos.
 */
export interface OccasionalGainsTaxComputation {
  taxYear: number;
  components: readonly OccasionalGainComponent[];
  totalBaseCop: number;
  totalTaxCop: number;
  formula: string;
  ruleSourceIds: readonly string[];
}

/**
 * Método elegido para calcular la base del anticipo del art. 807 ET.
 * - `current_only`: usa el impuesto neto del año que se declara (aplicable
 *   siempre; obligatorio cuando es la primera vez que declara).
 * - `average_of_two`: usa el promedio del impuesto neto del año actual y del
 *   inmediatamente anterior (permitido a partir de la segunda declaración,
 *   siempre que se conozca el impuesto neto del año anterior).
 */
export type AdvancePaymentBaseMethod = 'current_only' | 'average_of_two';

/** Reglamentación del art. 807 ET según el conteo de declaraciones. */
export interface AdvancePaymentBracket {
  /**
   * Número de veces que ha declarado el contribuyente, contando la que se
   * está preparando. 1 = primera declaración; 2 = segunda; 3 = tercera o
   * más.
   */
  filingCountIncludingCurrent: 1 | 2 | 3;
  /** Porcentaje aplicado sobre la base elegida. */
  rate: number;
  description: string;
}

/**
 * Detalle explicable del anticipo del impuesto sobre la renta (art. 807 ET)
 * calculado para el año siguiente al que se está declarando.
 *
 * El resultado conserva la tarifa aplicada, la base elegida y por qué se
 * eligió (`baseMethod`, `rationale`) para que la UI pueda mostrarlo paso a
 * paso. Las retenciones del año declarado se descuentan del anticipo bruto:
 * el anticipo neto nunca es negativo (el impuesto no se convierte en crédito
 * a favor por esta vía).
 */
export interface AdvancePaymentComputation {
  taxYear: number;
  bracket: AdvancePaymentBracket;
  currentNetIncomeTaxCop: number;
  priorNetIncomeTaxCop: number | null;
  baseMethod: AdvancePaymentBaseMethod;
  baseCop: number;
  grossAdvanceCop: number;
  withholdingsAppliedCop: number;
  netAdvanceCop: number;
  formula: string;
  rationale: string;
  ruleSourceId: string;
}

/**
 * Tipo de dependiente calificado según el art. 387 del Estatuto Tributario.
 * El motor NO verifica la elegibilidad (edad, ingresos, certificaciones); esa
 * clasificación la aporta el analista y se conserva por trazabilidad. Los
 * valores son:
 * - `child_minor`: hijos hasta 18 años.
 * - `child_studying_18_23`: hijos entre 18 y 23 años estudiando.
 * - `child_disabled`: hijos mayores de 18 en situación de dependencia física
 *   o psicológica debidamente certificada.
 * - `spouse_no_income`: cónyuge o compañero(a) permanente sin ingresos o con
 *   ingresos anuales inferiores a 260 UVT.
 * - `parent_or_sibling_low_income`: padres y hermanos económicamente
 *   dependientes cuyos ingresos anuales sean inferiores a 260 UVT.
 */
export type DependentKind =
  | 'child_minor'
  | 'child_studying_18_23'
  | 'child_disabled'
  | 'spouse_no_income'
  | 'parent_or_sibling_low_income';

/** Dependiente calificado para la deducción del art. 387 ET. */
export interface DependentDeclaration {
  id: string;
  kind: DependentKind;
  /** Meses del año calificado (1..12). Se clampa al rango [0, 12]. */
  monthsClaimed: number;
  /** Nota libre del analista (opcional). */
  notes?: string;
}

/**
 * Detalle por dependiente dentro del cálculo, con el aporte al tope mensual.
 */
export interface DependentDeductionDetail {
  id: string;
  kind: DependentKind;
  monthsClaimed: number;
  /** Tope mensual del dependiente: `monthsClaimed × 32 UVT` en pesos. */
  monthlyCapContributionCop: number;
}

/**
 * Resultado explicable de la deducción por dependientes (art. 387 ET). Sigue
 * el patrón "porcentaje + tope UVT + candidato observado": la UI muestra qué
 * candidato limita el beneficio (`percentage`, `monthly_cap`, `annual_cap`).
 *
 * Convenciones:
 * - El motor cuenta hasta cuatro dependientes (`dependentsEligibleCount`); si
 *   se declaran más, los primeros cuatro se toman y el resto genera warning
 *   informativo.
 * - `annualCap` y `monthlyCap` respetan los 32 UVT mensuales y 384 UVT
 *   anuales POR DEPENDIENTE que fija la doctrina DIAN.
 * - `appliedDeductionCop` nunca es negativo ni excede la suma de los
 *   candidatos.
 */
export interface DependentsDeductionComputation {
  taxYear: number;
  grossEmploymentIncomeCop: number;
  dependentsProvidedCount: number;
  dependentsEligibleCount: number;
  percentageCandidateCop: number;
  monthlyCapCandidateCop: number;
  annualCapCandidateCop: number;
  appliedDeductionCop: number;
  bindingCandidate: 'percentage' | 'monthly_cap' | 'annual_cap';
  formula: string;
  ruleSourceId: string;
  dependents: readonly DependentDeductionDetail[];
}

/**
 * Fuente candidata para las validaciones de patrimonio. El motor puro no
 * conoce el modelo interno del F-210: recibe pares (sourceId, label, valor)
 * ya normalizados en pesos.
 */
export interface PatrimonySourceCandidate {
  sourceId: string;
  label: string;
  valueCop: number;
}

export interface LiabilityWithoutAssetCheckResult {
  triggered: boolean;
  grossPatrimonyCop: number;
  liabilitiesCop: number;
}

export interface MovementWithoutBalanceCheckResult {
  triggered: boolean;
  grossPatrimonyCop: number;
  movementTotalCop: number;
  thresholdCop: number;
  significantSourceIds: readonly string[];
}

export interface DuplicatePatrimonyPair {
  a: PatrimonySourceCandidate;
  b: PatrimonySourceCandidate;
  relativeDifference: number;
}

export interface DuplicatePatrimonyCheckResult {
  triggered: boolean;
  pairs: readonly DuplicatePatrimonyPair[];
}

/**
 * Resultado explicable de la deducción por facturas electrónicas (art. 336-1
 * ET, incorporado por la Ley 2277 de 2022). Sigue el patrón "porcentaje +
 * tope en UVT": la UI muestra qué candidato limitó el beneficio.
 */
export interface ElectronicInvoicingDeductionComputation {
  taxYear: number;
  purchasesBaseCop: number;
  percentageRate: number;
  percentageCandidateCop: number;
  uvtCapUvt: number;
  uvtCapCandidateCop: number;
  appliedDeductionCop: number;
  bindingCandidate: 'percentage' | 'uvt_cap';
  formula: string;
  ruleSourceId: string;
}

/**
 * Regla declarativa de límite individual (por concepto) aplicable a
 * deducciones y rentas exentas específicas del F-210. Sigue el patrón
 * "porcentaje sobre base + tope en UVT + valor declarado", donde:
 *
 *   - `percentageOfBase` puede ser `null` para conceptos sin porcentaje
 *     (por ejemplo, intereses de vivienda del art. 119: solo tope UVT).
 *   - `uvtCap` siempre está definido; es el tope absoluto anual.
 *   - `baseIncomeRequired` indica si la regla necesita el ingreso laboral
 *     o tributario del año para aplicar el porcentaje.
 */
export interface IndividualDeductionLimitRule {
  id: string;
  description: string;
  percentageOfBase: number | null;
  uvtCap: number;
  baseIncomeRequired: boolean;
  targetBoxNumber: number;
  legalSourceIds: readonly string[];
}

/** Detalle explicable del resultado de aplicar un `IndividualDeductionLimitRule`. */
export interface IndividualDeductionLimitComputation {
  ruleId: string;
  taxYear: number;
  targetBoxNumber: number;
  declaredCop: number;
  baseIncomeCop: number | null;
  percentageCandidateCop: number | null;
  uvtCapCandidateCop: number;
  appliedCop: number;
  bindingCandidate: 'declared' | 'percentage' | 'uvt_cap';
  formula: string;
  ruleSourceIds: readonly string[];
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
