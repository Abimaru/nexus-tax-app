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
