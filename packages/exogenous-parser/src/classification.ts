import type {
  ClassificationEvidence,
  ConsolidationDisposition,
  EntityCategory,
  MultiplicityType,
  SecondaryTaxUse,
  SuggestedDeclarationUse,
  TaxCategory,
  TaxConfidence,
  TaxNature,
  TaxTreatment,
} from '@nexus-tax/domain';
import { normalizeForCompare } from './text';

export const CLASSIFICATION_VERSION = '2.3.0';

export interface TaxClassification {
  classificationVersion: string;
  nature: TaxNature;
  category: TaxCategory;
  treatment: TaxTreatment;
  confidence: TaxConfidence;
  classificationEvidence: ClassificationEvidence[];
  secondaryUses: SecondaryTaxUse[];
  multiplicityType: MultiplicityType;
  multiplicityExplanation: string | null;
  consolidationDisposition: ConsolidationDisposition;
  consolidationReason: string;
}

interface ClassificationInput {
  conceptCode: string | null;
  detail: string | null;
  suggestedUse: SuggestedDeclarationUse | null;
  entityCategory: EntityCategory;
  originalValueHasExplicitNegative?: boolean;
}

interface ClassificationCore {
  nature: TaxNature;
  category: TaxCategory;
  treatment: TaxTreatment;
  confidence: TaxConfidence;
  secondaryUses: SecondaryTaxUse[];
  disposition: ConsolidationDisposition;
  reason: string;
}

const CODE_RULES: Record<string, ClassificationCore> = {
  '1001': core('asset', 'asset', 'add_to_assets', 'high', ['assets_reconciliation']),
  '2001': core('liability', 'liability', 'add_to_liabilities', 'high'),
  '5001': core('income', 'employment_income', 'add_to_employment_income', 'high', [
    'income_threshold',
  ]),
  '5002': core('income', 'financial_income', 'add_to_income', 'high', ['income_threshold']),
  '6001': core('tax_credit', 'withholding', 'subtract_from_tax', 'high'),
};

function core(
  nature: TaxNature,
  category: TaxCategory,
  treatment: TaxTreatment,
  confidence: TaxConfidence,
  secondaryUses: SecondaryTaxUse[] = [],
  disposition: ConsolidationDisposition = 'included',
  reason = 'Clasificación determinista incluida en su grupo principal.',
): ClassificationCore {
  return { nature, category, treatment, confidence, secondaryUses, disposition, reason };
}

function detailRule(detail: string): ClassificationCore | null {
  if (/factur.*(?:susceptible|beneficio)|(?:susceptible|beneficio).*factur/.test(detail)) {
    return core(
      'possible_deduction',
      'electronic_invoicing_benefit_base',
      'estimate_electronic_invoice_benefit',
      'high',
      ['electronic_invoice_benefit_base', 'purchases_threshold'],
      'excluded',
      'La base susceptible forma parte del total facturado y no se suma nuevamente.',
    );
  }
  if (/total.*factur|factur.*(?:tras|despues|ajuste|nota)/.test(detail)) {
    return core(
      'expense_indicator',
      'electronic_invoicing_total',
      'support_purchases_threshold',
      'high',
      ['purchases_threshold'],
      'included',
      'Total neto facturado usado como soporte y conciliación del tope de compras.',
    );
  }
  if (
    /(?:ingreso )?laboral.*promedio.*(?:seis|6) meses|promedio.*laboral.*(?:seis|6) meses|promedio.*(?:seis|6) meses.*laboral/.test(
      detail,
    )
  ) {
    return core(
      'informational',
      'employment_reference',
      'do_not_aggregate',
      'high',
      [],
      'informational',
      'Referencia promedio: no representa un ingreso adicional.',
    );
  }
  if (
    /cdt.*inversion (?:efectuada|realizada)|inversion (?:efectuada|realizada).*cdt/.test(detail)
  ) {
    return core(
      'movement',
      'investment_movement',
      'analyze_investment_threshold',
      'high',
      ['deposits_and_investments_threshold'],
      'included',
      'Movimiento de inversión del período; no se trata como saldo final del activo.',
    );
  }
  if (/saldo.*fondo.*inversion colectiva|fondo.*inversion colectiva.*saldo/.test(detail)) {
    return core(
      'asset',
      'investment_asset',
      'reconcile_with_certificate',
      'high',
      ['assets_reconciliation', 'document_checklist'],
      'included',
      'Saldo de inversión al cierre, sujeto a conciliación con certificado.',
    );
  }
  if (/patrimonio bruto.*(?:autorreport|declarad|reportad)/.test(detail)) {
    return core(
      'asset',
      'asset',
      'requires_review',
      'medium',
      ['assets_reconciliation'],
      'pending',
      'Resumen patrimonial autorreportado: no se suma junto con sus componentes.',
    );
  }
  if (/total.*activo|resumen.*activo|patrimonio bruto/.test(detail)) {
    return core('asset', 'asset', 'add_to_assets', 'high', ['assets_reconciliation']);
  }
  if (
    /cuenta(?:s)? por pagar|deuda|pasivo|saldo.*tarjeta.*credito|obligacion financiera/.test(detail)
  ) {
    return core('liability', 'liability', 'add_to_liabilities', 'high');
  }
  if (/cuenta(?:s)? por cobrar|saldo.*(?:cuenta|banco)|inversion.*(?:saldo|cierre)/.test(detail)) {
    return core('asset', 'asset', 'add_to_assets', 'high', [
      'assets_reconciliation',
      'document_checklist',
    ]);
  }
  if (/otros pagos.*rentas? de trabajo|prestaciones sociales/.test(detail)) {
    return core('income', 'employment_income', 'add_to_employment_income', 'high', [
      'income_threshold',
    ]);
  }
  if (/retencion|retefuente/.test(detail)) {
    return core('tax_credit', 'withholding', 'subtract_from_tax', 'high');
  }
  if (/salario|pago laboral|nomina|empleado/.test(detail)) {
    return core('income', 'employment_income', 'add_to_employment_income', 'high', [
      'income_threshold',
    ]);
  }
  if (/rendimiento|interes(?:es)? financiero/.test(detail)) {
    return core('income', 'financial_income', 'add_to_income', 'high', ['income_threshold']);
  }
  if (/premio|loteria|rifa|ganancia ocasional/.test(detail)) {
    return core('income', 'occasional_gain', 'add_to_income', 'high', ['income_threshold']);
  }
  if (/movimiento|consignacion|deposito|inversion efectuada/.test(detail)) {
    return core('movement', 'bank_movement', 'do_not_aggregate', 'high', [
      'deposits_and_investments_threshold',
    ]);
  }
  if (/tarjeta|consumo/.test(detail)) {
    return core('expense_indicator', 'card_consumption', 'threshold_only', 'high', [
      'card_consumption_threshold',
    ]);
  }
  if (/compra|adquisicion/.test(detail)) {
    return core('expense_indicator', 'purchase', 'support_purchases_threshold', 'high', [
      'purchases_threshold',
    ]);
  }
  if (
    /aporte.*(?:obligatorio|trabajador).*(?:salud|pension)|(?:salud|pension).*cargo.*trabajador|fondo.*solidaridad/.test(
      detail,
    )
  ) {
    return core(
      'informational',
      'employment_non_constitutive_income',
      'income_not_constitutive',
      /empleador|laboral|nomina|formulario 220|vacaciones|prestaciones/.test(detail)
        ? 'high'
        : 'medium',
      ['document_checklist'],
      'pending',
      'Aporte laboral obligatorio propuesto para rentas de trabajo; requiere confirmación humana.',
    );
  }
  if (/aporte.*(?:salud|pension)|seguridad social/.test(detail)) {
    return core(
      'expense_indicator',
      'social_security_contribution',
      'review_as_deduction',
      'high',
      ['document_checklist'],
      'pending',
      'Requiere revisión antes de cualquier tratamiento como deducción.',
    );
  }
  if (/cesantia/.test(detail)) {
    return core(
      'informational',
      'severance',
      'requires_review',
      'high',
      ['document_checklist'],
      'informational',
      'Registro informativo identificado; no se consolida automáticamente.',
    );
  }
  if (/deducci/.test(detail)) {
    return core(
      'possible_deduction',
      'deduction_candidate',
      'review_as_deduction',
      'medium',
      ['document_checklist'],
      'pending',
      'Posible deducción pendiente de soporte y revisión.',
    );
  }
  if (/saldo.*ano anterior|vigencia anterior/.test(detail)) {
    return core(
      'informational',
      'prior_year_balance',
      'do_not_aggregate',
      'medium',
      [],
      'informational',
      'Saldo de referencia de otra vigencia; no se consolida.',
    );
  }
  return null;
}

function fromSuggestedBox(use: SuggestedDeclarationUse | null): ClassificationCore | null {
  const boxes = use?.boxReferences.map((reference) => reference.number) ?? [];
  if (boxes.includes(29) && !boxes.includes(30)) {
    return core('asset', 'asset', 'add_to_assets', 'medium', ['assets_reconciliation']);
  }
  if (boxes.includes(30) && !boxes.includes(29)) {
    return core('liability', 'liability', 'add_to_liabilities', 'medium');
  }
  if (boxes.some((box) => box === 131 || box === 132)) {
    return core('tax_credit', 'withholding', 'subtract_from_tax', 'medium');
  }
  return null;
}

function buildResult(
  classification: ClassificationCore,
  evidence: ClassificationEvidence,
  use: SuggestedDeclarationUse | null,
): TaxClassification {
  const conflictingSuggestion =
    use?.multiplicity === 'real_ambiguity' || use?.multiplicity === 'resolvable_condition';
  const resolvedByStrongerEvidence = conflictingSuggestion && evidence.kind !== 'suggested_box';
  const compatible = use?.multiplicity === 'compatible_multiple_uses';
  return {
    classificationVersion: CLASSIFICATION_VERSION,
    nature: classification.nature,
    category: classification.category,
    treatment: classification.treatment,
    confidence: classification.confidence,
    classificationEvidence: [evidence],
    secondaryUses: [...classification.secondaryUses].sort(),
    multiplicityType: resolvedByStrongerEvidence
      ? 'resolved_condition'
      : compatible
        ? 'compatible_multiple_uses'
        : 'single',
    multiplicityExplanation: resolvedByStrongerEvidence
      ? 'El detalle o código inequívoco resolvió los destinos sugeridos incompatibles.'
      : compatible
        ? 'El registro participa en varios análisis compatibles sin duplicar su valor.'
        : null,
    consolidationDisposition: classification.disposition,
    consolidationReason: classification.reason,
  };
}

export function classifyTaxRecord(input: ClassificationInput): TaxClassification {
  const code = input.conceptCode?.trim() ?? '';
  const byCode = CODE_RULES[code];
  if (byCode) return buildResult(byCode, { kind: 'concept_code', value: code }, input.suggestedUse);

  const detail = normalizeForCompare(input.detail ?? '');
  const byDetail = detailRule(detail);
  if (byDetail) {
    return buildResult(
      byDetail,
      {
        kind: byDetail.category.includes('investment') ? 'product_type' : 'detail',
        value: input.detail ?? '',
      },
      input.suggestedUse,
    );
  }

  const boxes = input.suggestedUse?.boxReferences.map((reference) => reference.number) ?? [];
  if (
    boxes.includes(29) &&
    boxes.includes(30) &&
    input.suggestedUse?.conditionSignals.includes('negative_balance') &&
    input.originalValueHasExplicitNegative
  ) {
    return buildResult(
      core('liability', 'liability', 'add_to_liabilities', 'high'),
      { kind: 'explicit_value_sign', value: 'signo negativo explícito' },
      input.suggestedUse,
    );
  }

  const byBox = fromSuggestedBox(input.suggestedUse);
  if (byBox) {
    const box = input.suggestedUse?.boxReferences[0]?.code ?? 'casilla sugerida';
    return buildResult(byBox, { kind: 'suggested_box', value: box }, input.suggestedUse);
  }

  if (input.entityCategory === 'employer') {
    return buildResult(
      core(
        'income',
        'employment_income',
        'requires_review',
        'low',
        ['income_threshold'],
        'pending',
        'La entidad sugiere ingreso laboral, pero falta evidencia conceptual suficiente.',
      ),
      { kind: 'entity_category', value: input.entityCategory },
      input.suggestedUse,
    );
  }

  return {
    classificationVersion: CLASSIFICATION_VERSION,
    nature: 'unclassified',
    category: 'unclassified',
    treatment: 'requires_review',
    confidence: 'low',
    classificationEvidence: [],
    secondaryUses: [],
    multiplicityType: 'real_ambiguity',
    multiplicityExplanation:
      'El valor, incluso si es positivo, no aporta evidencia suficiente para determinar su naturaleza.',
    consolidationDisposition: 'pending',
    consolidationReason: 'Registro fuera del consolidado hasta decisión del analista.',
  };
}
