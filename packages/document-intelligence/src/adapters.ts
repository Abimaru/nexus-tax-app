import type { DocumentFactCandidate, DocumentKind } from '@nexus-tax/domain';
import type {
  AdapterRule,
  CandidateBuildContext,
  DocumentAdapter,
  DocumentRepresentation,
  ExtractionResult,
  PdfReadLimits,
} from './contracts';
import { comparableText, parseColombianAmount, stableDocumentId } from './normalize';

const VERSION = '1.0.0';

function rule(
  id: string,
  labels: string[],
  category: AdapterRule['category'],
  nature: AdapterRule['nature'],
  treatment: AdapterRule['treatment'],
  productType: AdapterRule['productType'] = 'unidentified',
): AdapterRule {
  return {
    id,
    labels: labels.map((label) => new RegExp(label, 'i')),
    category,
    nature,
    treatment,
    productType,
  };
}

function adapter(
  id: string,
  kinds: DocumentKind[],
  signals: string[],
  rules: AdapterRule[],
  limitations: string[] = [],
): DocumentAdapter {
  return {
    id,
    version: VERSION,
    documentKinds: kinds,
    compatibleEntities: [],
    activationSignals: signals.map((signal) => new RegExp(signal, 'i')),
    extractableFields: rules.map((item) => item.id),
    rules,
    limitations,
    confidence: 'medium',
  };
}

export const DOCUMENT_ADAPTERS: readonly DocumentAdapter[] = [
  adapter(
    'co.form-220.generic',
    ['form_220'],
    ['formulario 220|ingresos y retenciones'],
    [
      rule(
        'employment-income',
        ['ingresos laborales', 'pagos por salarios', 'total ingresos'],
        'employment_income',
        'income',
        'add_to_employment_income',
        'employment_income',
      ),
      rule(
        'severance',
        ['cesantias abonadas', 'cesantias pagadas'],
        'severance',
        'income',
        'requires_review',
        'severance',
      ),
      rule(
        'severance-interest',
        ['intereses de cesantias'],
        'severance',
        'income',
        'requires_review',
        'severance',
      ),
      rule(
        'health',
        ['aportes.*salud'],
        'social_security_contribution',
        'possible_deduction',
        'review_as_deduction',
        'employment_income',
      ),
      rule(
        'pension',
        ['aportes.*pension'],
        'social_security_contribution',
        'possible_deduction',
        'review_as_deduction',
        'employment_income',
      ),
      rule(
        'voluntary-pension',
        ['aportes voluntarios'],
        'deduction_candidate',
        'possible_deduction',
        'review_as_deduction',
        'employment_income',
      ),
      rule(
        'withholding',
        ['retencion(?:es)?.*(?:fuente|renta)', 'retenciones'],
        'withholding',
        'tax_credit',
        'subtract_from_tax',
        'employment_income',
      ),
    ],
    ['Los nombres y posiciones de renglones varían entre emisores.'],
  ),
  adapter(
    'co.financial.consolidated.generic',
    ['consolidated_tax_certificate', 'income_withholding_certificate'],
    ['certificado tributario|informacion tributaria'],
    [
      rule(
        'closing-balance',
        ['saldo(?:s)?.*(?:31 de diciembre|cierre)', 'saldo final'],
        'asset',
        'asset',
        'add_to_assets',
        'savings_account',
      ),
      rule(
        'debt',
        ['saldo.*(?:deuda|obligacion|capital)'],
        'liability',
        'liability',
        'add_to_liabilities',
        'consumer_loan',
      ),
      rule(
        'interest',
        ['intereses pagados|rendimientos financieros'],
        'financial_income',
        'income',
        'add_to_income',
        'savings_account',
      ),
      rule(
        'withholding',
        ['retencion(?:es)?.*(?:fuente|renta)'],
        'withholding',
        'tax_credit',
        'subtract_from_tax',
        'savings_account',
      ),
      rule(
        'gmf',
        ['gravamen.*movimientos financieros|gmf'],
        'deduction_candidate',
        'possible_deduction',
        'review_as_deduction',
        'checking_account',
      ),
      rule(
        'investment',
        ['saldo.*(?:inversion|cdt|fondo)'],
        'investment_asset',
        'asset',
        'add_to_assets',
        'investment_fund',
      ),
    ],
    ['Un consolidado puede mezclar productos y requiere confirmación independiente.'],
  ),
  adapter(
    'co.debt.generic',
    ['debt_certificate'],
    ['certificado de deuda|saldo de capital'],
    [
      rule(
        'capital-balance',
        ['saldo de capital'],
        'liability',
        'liability',
        'add_to_liabilities',
        'consumer_loan',
      ),
      rule(
        'interest',
        ['intereses pagados|intereses causados'],
        'deduction_candidate',
        'possible_deduction',
        'requires_review',
        'consumer_loan',
      ),
      rule(
        'total-balance',
        ['saldo total'],
        'liability',
        'liability',
        'requires_review',
        'consumer_loan',
      ),
    ],
  ),
  adapter(
    'co.balance.generic',
    ['balance_certificate'],
    ['certificado de saldos|saldo al cierre'],
    [
      rule(
        'closing-balance',
        ['saldo.*(?:cierre|31 de diciembre)', 'saldo final'],
        'asset',
        'asset',
        'add_to_assets',
        'savings_account',
      ),
    ],
  ),
  adapter(
    'co.housing-interest.generic',
    ['housing_interest_certificate'],
    ['intereses de vivienda|credito hipotecario'],
    [
      rule(
        'housing-interest',
        ['intereses pagados'],
        'deduction_candidate',
        'possible_deduction',
        'review_as_deduction',
        'mortgage_loan',
      ),
      rule(
        'monetary-correction',
        ['correccion monetaria'],
        'deduction_candidate',
        'possible_deduction',
        'requires_review',
        'mortgage_loan',
      ),
      rule(
        'loan-balance',
        ['saldo.*credito'],
        'liability',
        'liability',
        'add_to_liabilities',
        'mortgage_loan',
      ),
    ],
  ),
  adapter(
    'co.severance.generic',
    ['severance_certificate'],
    ['certificado de cesantias|fondo de cesantias'],
    [
      rule(
        'closing-balance',
        ['saldo.*cierre|saldo final'],
        'asset',
        'asset',
        'requires_review',
        'severance',
      ),
      rule(
        'credited',
        ['cesantias abonadas'],
        'severance',
        'income',
        'requires_review',
        'severance',
      ),
      rule('withdrawals', ['retiros'], 'severance', 'income', 'requires_review', 'severance'),
      rule('returns', ['rendimientos'], 'financial_income', 'income', 'add_to_income', 'severance'),
    ],
  ),
  adapter(
    'co.property.generic',
    ['property_tax_certificate'],
    ['avaluo catastral|impuesto predial'],
    [
      rule(
        'cadastral-value',
        ['avaluo catastral'],
        'asset',
        'asset',
        'requires_review',
        'property',
      ),
      rule(
        'property-tax',
        ['impuesto predial'],
        'informational',
        'informational',
        'do_not_aggregate',
        'property',
      ),
      rule(
        'ownership',
        ['porcentaje.*participacion'],
        'informational',
        'informational',
        'do_not_aggregate',
        'property',
      ),
    ],
    ['La extracción no determina por sí sola el valor fiscal declarable.'],
  ),
];

export const GENERIC_DOCUMENT_ADAPTER: DocumentAdapter = adapter(
  'co.generic.label-value',
  ['other'],
  [],
  [
    rule(
      'generic-value',
      ['valor|saldo|total|retencion|interes|ingreso|deuda|avaluo'],
      'unclassified',
      'unclassified',
      'requires_review',
    ),
  ],
  ['Usa coincidencias concepto–valor y siempre exige revisión.'],
);

export function selectAdapter(kind: DocumentKind): DocumentAdapter {
  return (
    DOCUMENT_ADAPTERS.find((item) => item.documentKinds.includes(kind)) ?? GENERIC_DOCUMENT_ADAPTER
  );
}

const VALUE_PATTERN = /(?:cop\s*)?\$?\s*-?\d[\d.,]*(?:,\d{1,2})?/gi;

export function extractCandidates(
  document: DocumentRepresentation,
  kind: DocumentKind,
  context: CandidateBuildContext,
  limits: PdfReadLimits,
): ExtractionResult {
  const selected = selectAdapter(kind);
  const candidates: DocumentFactCandidate[] = [];
  const seen = new Set<string>();
  for (const page of document.pages) {
    const lines = page.normalizedText.split(/\n+/).filter(Boolean);
    for (const line of lines) {
      const normalizedLine = comparableText(line);
      for (const currentRule of selected.rules) {
        const label = currentRule.labels.find((pattern) => pattern.test(normalizedLine));
        if (!label) continue;
        const amounts = [...line.matchAll(VALUE_PATTERN)];
        for (const amount of amounts) {
          const value = parseColombianAmount(amount[0]);
          if (value === null) continue;
          const fingerprint = `${page.pageNumber}|${currentRule.id}|${value}|${normalizedLine}`;
          if (seen.has(fingerprint)) continue;
          seen.add(fingerprint);
          const excerpt = line.trim().slice(0, limits.maxEvidenceLength);
          const score = selected === GENERIC_DOCUMENT_ADAPTER ? 42 : 72;
          candidates.push({
            id: `candidate:${stableDocumentId(context.documentId, fingerprint)}`,
            caseId: context.caseId,
            documentId: context.documentId,
            extractionSessionId: context.sessionId,
            page: page.pageNumber,
            proposedEntityId: context.entityId ?? null,
            entityName: context.entityName ?? null,
            proposedProductId: null,
            productType: currentRule.productType,
            productLabel: null,
            originalConcept:
              line
                .slice(0, amount.index ?? line.length)
                .replace(/[:\-\s]+$/, '')
                .trim() || currentRule.id,
            normalizedConcept: normalizedLine,
            proposedCategory: currentRule.category,
            proposedNature: currentRule.nature,
            proposedTreatment: currentRule.treatment,
            correctedCategory: null,
            correctedNature: null,
            correctedTreatment: null,
            extractedValue: value,
            correctedValue: null,
            finalValue: null,
            currency: 'COP',
            period: detectPeriod(line),
            cutoffDate: detectDate(line),
            evidence: {
              page: page.pageNumber,
              excerpt,
              detectedLabel: currentRule.id,
              detectedValue: amount[0].slice(0, 80),
              location: `Página ${page.pageNumber}`,
            },
            adapterId: selected.id,
            adapterVersion: selected.version,
            ruleId: currentRule.id,
            confidence: {
              level: selected === GENERIC_DOCUMENT_ADAPTER ? 'low' : 'medium',
              score,
              reasons: [
                selected === GENERIC_DOCUMENT_ADAPTER
                  ? 'Coincidencia genérica de etiqueta y valor.'
                  : `Regla ${currentRule.id} del adaptador ${selected.id}.`,
              ],
            },
            warnings: selected.limitations.slice(),
            status: selected === GENERIC_DOCUMENT_ADAPTER ? 'requires_review' : 'pending',
            possibleDuplicateIds: [],
            suggestedRequirementIds: [...(context.requirementIds ?? [])],
            suggestedExogenousMatches: [],
            observation: '',
            factId: null,
            decisions: [],
            createdAt: context.timestamp,
            updatedAt: context.timestamp,
          });
          if (candidates.length >= limits.maxCandidates) {
            return {
              adapter: selected,
              candidates,
              warnings: ['Se alcanzó el límite de candidatos configurado.'],
            };
          }
        }
      }
    }
  }
  markDuplicates(candidates);
  return { adapter: selected, candidates, warnings: [] };
}

function detectPeriod(value: string): string | null {
  return value.match(/\b20\d{2}\b/)?.[0] ?? null;
}

function detectDate(value: string): string | null {
  const match = value.match(/\b(20\d{2})[-/]([01]?\d)[-/]([0-3]?\d)\b/);
  return match ? `${match[1]}-${match[2]!.padStart(2, '0')}-${match[3]!.padStart(2, '0')}` : null;
}

function markDuplicates(candidates: DocumentFactCandidate[]) {
  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index]!;
    const duplicates = candidates
      .slice(0, index)
      .filter(
        (prior) =>
          prior.extractedValue === candidate.extractedValue &&
          prior.proposedCategory === candidate.proposedCategory,
      )
      .map((prior) => prior.id);
    if (duplicates.length) {
      candidate.possibleDuplicateIds = duplicates;
      candidate.warnings.push('Existe otro candidato con el mismo valor y categoría.');
    }
  }
}
