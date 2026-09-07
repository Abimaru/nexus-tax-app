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
    // Sprint 2.4, Fase F.3 (§10): "certificado tributario" (singular) no
    // reconocía la redacción real plural "Certificados tributarios" — el
    // patrón exigía la palabra exacta "certificado" seguida de espacio,
    // que nunca aparece cuando el documento dice "certificados". Esta es
    // la causa raíz real de la miscategorización a `debt_certificate`
    // encontrada en el benchmark (Fase F.1): sin esta señal, el
    // documento perdía su score más alto y una señal más estrecha
    // (`debt_certificate`, "saldo de capital") ganaba por defecto.
    ['certificados? tributarios?', 4],
    ['informacion tributaria', 3],
    ['saldos.*rendimientos.*retenciones', 5],
    ['productos financieros', 2],
    // Señales estructurales (§10/§11 del prompt de Fase F.3): un
    // certificado que menciona VARIOS de estos conceptos a la vez —
    // saldo, rendimiento, retención, GMF — es evidencia de un documento
    // multipropósito/multiproducto, nunca del nombre del banco/NIT/
    // archivo. Cada señal pesa poco por sí sola, pero su combinación
    // permite que un documento genuinamente consolidado supere a una
    // clasificación más estrecha (p. ej. `debt_certificate`) que solo
    // detecta una de sus secciones.
    ['\\bsaldo', 1],
    ['rendimiento|interes', 1],
    ['retencion', 1],
    ['gravamen.*movimientos financieros|gmf', 1],
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
    ['intereses de vivienda', 4],
    ['credito hipotecario', 4],
    // Sprint 2.4, Fase F.2 (§12): vocabulario adicional — una entidad no
    // bancaria (fondo de empleados, cooperativa) también certifica
    // vivienda sin decir literalmente "crédito hipotecario". Ninguna
    // señal aislada basta por sí sola para confianza alta (§16): se
    // requiere combinación (tipo de crédito + intereses + saldo/período).
    ['prestamo.*vivienda', 3],
    ['financiacion.*vivienda', 3],
    ['credito.*(?:adquisicion|compra).*vivienda', 3],
    ['intereses (?:pagados|causados|del periodo)', 3],
    ['saldo.*(?:obligacion|credito|deuda)', 2],
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
  // Sprint 2.4, Fase G (§17): certificado/estado de cuenta de
  // administración de propiedad horizontal. Vocabulario sintético
  // estructural — nunca derivado de un documento real.
  definition('property_administration_certificate', [
    ['administracion.*(?:propiedad horizontal|copropiedad|conjunto residencial)', 5],
    ['cuota(?:s)? de administracion', 4],
    ['estado de cuenta.*administracion', 4],
    ['certificado.*administracion', 3],
    ['cuota(?:s)? (?:ordinaria|extraordinaria)', 2],
  ]),
  definition('prize_certificate', [
    ['certificado de premio', 5],
    ['ganancia ocasional', 4],
    ['premio pagado', 3],
  ]),
  // Sprint 2.4, Fase H (§12): certificado de medicina prepagada, seguro
  // de salud o plan adicional de salud. Vocabulario sintético
  // estructural — nunca derivado de un documento real.
  definition('complementary_health_certificate', [
    ['medicina prepagada', 5],
    ['seguro(?:s)? de salud', 4],
    ['plan(?:es)? adicional(?:es)? de salud', 4],
    ['certificado.*(?:medicina prepagada|seguro de salud)', 3],
    ['entidad vigilada', 2],
    ['superintendencia (?:nacional de salud|financiera)', 2],
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
