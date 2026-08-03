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
