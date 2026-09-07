/**
 * Evaluador de elegibilidad potencial de gastos de inmueble (Sprint 2.4,
 * Fase G — Inmuebles, renta inmobiliaria y administración de propiedad
 * horizontal).
 *
 * Principio inviolable (§2 del prompt de Fase G):
 *
 *   `propiedad del inmueble != gasto deducible`
 *
 * Este motor es puro y conservador: nunca produce un booleano
 * `deductible = true/false`. Siempre devuelve uno de los estados de
 * `PropertyExpenseEligibilityStatus` (`@nexus-tax/domain`), acompañado de
 * razones explicables. La confirmación final de deducibilidad SIEMPRE es
 * una decisión humana posterior (`PropertyExpense.decisionStatus`), y este
 * motor nunca escribe directamente al Formulario 210 (§25): produce un
 * candidato, no un hecho tributario aplicado.
 *
 * Fundamento normativo (ver `docs/PROPERTY_INCOME_EXPENSES_2025.md` y
 * `official-sources.ts` para el detalle completo):
 *
 * - ET art. 107: causalidad, necesidad y proporcionalidad de cualquier
 *   costo/deducción asociado a una actividad productora de renta.
 * - ET art. 743: la idoneidad de un soporte depende de lo que la ley exija
 *   para ese hecho — no exige un único tipo de documento (p. ej. factura)
 *   cuando la ley no lo exige expresamente.
 * - Decreto 1625 de 2016, art. 1.3.1.13.5 + Oficio DIAN 912878 de 2021: las
 *   cuotas de administración de propiedad horizontal son un aporte a
 *   capital, no facturable — su soporte idóneo es la cuenta de cobro,
 *   certificado o comprobante de pago de la copropiedad, NUNCA una
 *   factura electrónica.
 */
import type {
  PropertyExpenseEligibilityStatus,
  PropertyExpenseType,
  PropertyAllocationMethod,
  PropertySupportStatus,
  PropertyUse,
} from '@nexus-tax/domain';

export const PROPERTY_EXPENSE_ELIGIBILITY_SOURCE_IDS = [
  'et-art-107',
  'et-art-743',
  'decreto-1625-2016-art-1-3-1-13-5',
  'dian-oficio-912878-2021',
] as const;
export const PROPERTY_EXPENSE_ELIGIBILITY_ENGINE_VERSION = 'co.property.expense-eligibility.2025.v1';

/**
 * Tipos de soporte suficientes para administración de propiedad horizontal
 * (§7/§8 del prompt): la cuenta de cobro, el certificado de la
 * copropiedad, un recibo o un comprobante/extracto de pago — NUNCA se
 * exige una factura electrónica (fundamento: Decreto 1625/2016 art.
 * 1.3.1.13.5 + Oficio DIAN 912878/2021, la cuota no es un hecho
 * generador de IVA ni una venta/servicio facturable).
 */
export const ADMINISTRATION_FEE_SUFFICIENT_SUPPORT_TYPES = [
  'administration_account_statement',
  'copropiedad_certificate',
  'receipt',
  'payment_proof',
] as const;

export interface PropertyExpenseEligibilityInput {
  taxYear: number;
  propertyUse: PropertyUse;
  expenseType: PropertyExpenseType;
  /** `true` cuando existe al menos un ingreso por arrendamiento asociado y conciliado para el mismo período (§11 del prompt). */
  hasCompatibleRentalIncome: boolean;
  /** `true` cuando el inmueble tiene un período de arrendamiento definido (§4/§13). `null` si aún no se ha registrado ningún período. */
  hasRentalPeriodDefined: boolean | null;
  supportStatus: PropertySupportStatus;
  supportTypes: readonly string[];
  allocationMethod: PropertyAllocationMethod;
  allocationPercentage: number | null;
  /** Cuota extraordinaria de administración: nunca se mezcla con la ordinaria (§19). */
  isExtraordinary: boolean;
  /** `true` cuando el motor detectó un posible duplicado (otro gasto o un `DocumentFact` ya confirmado) (§26). */
  hasPossibleDuplicate: boolean;
}

export interface PropertyExpenseEligibilityResult {
  status: PropertyExpenseEligibilityStatus;
  reasons: readonly string[];
  ruleSourceIds: readonly string[];
  ruleVersion: string;
}

function result(
  status: PropertyExpenseEligibilityStatus,
  reasons: readonly string[],
  ruleSourceIds: readonly string[] = PROPERTY_EXPENSE_ELIGIBILITY_SOURCE_IDS,
): PropertyExpenseEligibilityResult {
  return { status, reasons, ruleSourceIds, ruleVersion: PROPERTY_EXPENSE_ELIGIBILITY_ENGINE_VERSION };
}

/**
 * Evalúa la elegibilidad potencial de un gasto de inmueble para el año
 * gravable 2025. Orden de evaluación (§10-§13/§19/§26 del prompt):
 *
 *   1. posible duplicado (§26) → siempre requiere revisión antes que nada;
 *   2. cuota extraordinaria (§19) → siempre requiere revisión;
 *   3. contexto de uso (§10/§11/§12) → residencia personal nunca es
 *      elegible salvo otro contexto explícito; uso desconocido/vacante/
 *      otro requiere contexto; uso mixto requiere asignación;
 *   4. período de arrendamiento (§13) → sin período definido, requiere
 *      contexto (no se asume 12 meses);
 *   5. ingreso compatible (§11) → sin ingreso conciliado, requiere
 *      contexto;
 *   6. soporte (§7/§8/§9) → sin soporte suficiente, requiere soporte;
 *   7. si todo lo anterior se cumple → potencialmente deducible.
 */
export function evaluatePropertyExpenseEligibility(
  input: PropertyExpenseEligibilityInput,
): PropertyExpenseEligibilityResult {
  if (input.taxYear !== 2025) {
    throw new Error(
      `PROPERTY_EXPENSE_ELIGIBILITY aún no modela el año ${input.taxYear}. Añade el ruleset correspondiente.`,
    );
  }

  // §26: un posible duplicado siempre requiere revisión humana antes de
  // considerar cualquier otro criterio — nunca se resuelve solo.
  if (input.hasPossibleDuplicate) {
    return result('requires_review', [
      'Este gasto podría estar duplicado con otro gasto o con un hecho documental ya confirmado (p. ej. intereses de vivienda). Revísalo antes de continuar.',
    ]);
  }

  // §19: una cuota extraordinaria nunca se trata igual que la
  // administración ordinaria — siempre requiere revisión explícita.
  if (input.expenseType === 'administration_fee' && input.isExtraordinary) {
    return result('requires_review', [
      'Es una cuota extraordinaria de administración: no se asume el mismo tratamiento fiscal que una cuota ordinaria. Revísala por separado.',
    ]);
  }

  // §10: vivienda personal — la administración ordinaria (y, en general,
  // cualquier gasto del inmueble) NUNCA se sugiere automáticamente como
  // costo o deducción de renta cuando el uso es residencia personal.
  if (input.propertyUse === 'personal_residence') {
    return result(
      'not_applicable',
      [
        'El inmueble está registrado como vivienda personal: este gasto no se está usando como costo o deducción porque el inmueble no genera renta de arrendamiento.',
      ],
      ['et-art-107'],
    );
  }

  if (input.propertyUse === 'vacant' || input.propertyUse === 'other' || input.propertyUse === 'unknown') {
    return result(
      'requires_context',
      [
        'Falta definir un contexto tributario compatible (uso del inmueble) antes de evaluar este gasto.',
      ],
      ['et-art-107'],
    );
  }

  // §12: uso mixto exige asignación explícita — nunca 50 % por defecto ni
  // un cálculo sin contexto suficiente.
  if (input.propertyUse === 'mixed') {
    const hasAllocation =
      input.allocationMethod !== 'unknown' && input.allocationPercentage !== null;
    if (!hasAllocation) {
      return result(
        'requires_allocation',
        [
          'El inmueble tiene uso mixto: define el porcentaje o el período de la actividad generadora de renta antes de evaluar este gasto.',
        ],
        ['et-art-107'],
      );
    }
  }

  // §11/§13: solo se sigue evaluando la vía "arrendado" para
  // rented/mixed(ya con asignación)/business_use.
  if (input.propertyUse === 'rented' || input.propertyUse === 'mixed' || input.propertyUse === 'business_use') {
    if (input.hasRentalPeriodDefined === null || input.hasRentalPeriodDefined === false) {
      return result(
        'requires_context',
        [
          'Falta definir el período en que el inmueble generó renta (arrendamiento o actividad económica) para no atribuir automáticamente los 12 meses del año.',
        ],
        ['et-art-107'],
      );
    }
    if (!input.hasCompatibleRentalIncome) {
      return result(
        'requires_context',
        [
          'No hay un ingreso por arrendamiento conciliado para el mismo período: la relación de causalidad con la actividad generadora de renta aún no está confirmada.',
        ],
        ['et-art-107'],
      );
    }
  }

  // §7/§8: soporte. Para administración, NUNCA se exige factura —
  // cualquiera de los soportes idóneos listados basta.
  if (input.supportStatus === 'missing') {
    return result(
      'requires_support',
      input.expenseType === 'administration_fee'
        ? [
            'Las cuotas de administración no necesariamente se soportan con factura. Conserva evidencia idónea del cobro y del pago (cuenta de cobro, certificado de la copropiedad, recibo o comprobante de pago).',
          ]
        : ['Falta soporte idóneo para este gasto.'],
      input.expenseType === 'administration_fee'
        ? ['et-art-743', 'decreto-1625-2016-art-1-3-1-13-5', 'dian-oficio-912878-2021']
        : ['et-art-743'],
    );
  }
  if (input.supportStatus === 'partially_supported' || input.supportStatus === 'requires_review') {
    return result(
      'requires_support',
      ['El soporte disponible es parcial o requiere revisión antes de considerar este gasto.'],
      ['et-art-743'],
    );
  }

  // §11: relación con la actividad, período, proporcionalidad y soporte ya
  // se cumplen — queda como candidato potencial, sujeto a decisión humana.
  return result('potentially_deductible', [
    'El gasto tiene relación con la actividad generadora de renta, período definido, soporte suficiente y (si aplica) asignación resuelta. Sigue sujeto a revisión humana antes de aplicarse.',
  ]);
}
