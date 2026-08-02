import type { DocumentClassification, DocumentKind } from '@nexus-tax/domain';
import type { DocumentRepresentation } from './contracts';
import { comparableText } from './normalize';

interface ClassifierDefinition {
  kind: DocumentKind;
  signals: readonly { pattern: RegExp; label: string; weight: number }[];
}

const DEFINITIONS: readonly ClassifierDefinition[] = [
  definition('form_220', [
    ['formulario 220', 5],
    ['certificado de ingresos y retenciones', 4],
    ['pagos por salarios', 2],
    ['aportes obligatorios a salud', 2],
  ]),
  definition('consolidated_tax_certificate', [
    ['certificado tributario', 4],
    ['informacion tributaria', 3],
    ['saldos.*rendimientos.*retenciones', 5],
    ['productos financieros', 2],
  ]),
  definition('debt_certificate', [
    ['certificado de deuda', 5],
    ['saldo de capital', 3],
    ['saldo total.*obligacion', 3],
  ]),
  definition('balance_certificate', [
    ['certificado de saldos', 5],
    ['saldo (?:al|a) 31 de diciembre', 4],
    ['cuenta de ahorros', 2],
  ]),
  definition('income_withholding_certificate', [
    ['rendimientos.*retenciones', 5],
    ['retencion en la fuente', 3],
    ['gravamen.*movimientos financieros|gmf', 2],
  ]),
  definition('housing_interest_certificate', [
    ['intereses de vivienda', 5],
    ['credito hipotecario', 3],
    ['correccion monetaria', 2],
  ]),
  definition('severance_certificate', [
    ['certificado de cesantias', 5],
    ['fondo de cesantias', 3],
    ['retiros de cesantias', 2],
  ]),
  definition('property_tax_certificate', [
    ['certificado predial|impuesto predial', 5],
    ['avaluo catastral', 4],
    ['identificacion predial', 3],
  ]),
  definition('prize_certificate', [
    ['certificado de premio', 5],
    ['ganancia ocasional', 4],
    ['premio pagado', 3],
  ]),
  definition('prior_year_return', [
    ['declaracion de renta', 4],
    ['formulario 210', 5],
  ]),
  definition('annual_cost_report', [
    ['reporte anual de costos', 5],
    ['relacion de compras y gastos', 4],
  ]),
];

function definition(
  kind: DocumentKind,
  entries: readonly [string, number][],
): ClassifierDefinition {
  return {
    kind,
    signals: entries.map(([source, weight]) => ({
      pattern: new RegExp(source, 'i'),
      label: source.replaceAll('.*', ' + '),
      weight,
    })),
  };
}

function confidence(score: number): DocumentClassification['confidence'] {
  if (score >= 8) return 'high';
  if (score >= 5) return 'medium';
  if (score >= 2) return 'low';
  return 'insufficient';
}

export function classifyDocument(document: DocumentRepresentation): DocumentClassification {
  const text = comparableText(
    [document.metadata.title ?? '', ...document.pages.map((page) => page.normalizedText)].join(
      '\n',
    ),
  );
  const ranked = DEFINITIONS.map((entry) => {
    const matches = entry.signals.filter((signal) => signal.pattern.test(text));
    return {
      kind: entry.kind,
      score: matches.reduce((sum, signal) => sum + signal.weight, 0),
      signals: matches.map((signal) => `Se detectó “${signal.label}”.`),
    };
  }).sort((a, b) => b.score - a.score || a.kind.localeCompare(b.kind));
  const winner = ranked[0]!;
  const level = confidence(winner.score);
  const proposedKind = level === 'insufficient' ? 'other' : winner.kind;
  return {
    proposedKind,
    confidence: level,
    alternatives: ranked
      .filter((item) => item.score > 0 && item.kind !== winner.kind)
      .slice(0, 3)
      .map((item) => ({ kind: item.kind, confidence: confidence(item.score) })),
    supportingSignals: winner.signals,
    opposingSignals:
      level === 'insufficient' ? ['No se encontraron suficientes señales del catálogo.'] : [],
    requiresReview: level !== 'high',
    correctedKind: null,
  };
}
