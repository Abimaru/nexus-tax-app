import type {
  ConfidenceLevel,
  DocumentaryRequirement,
  NormalizedExogenousRecord,
  ReportingEntity,
} from '@nexus-tax/domain';
import { prefixedId } from './ids';
import { normalizeForCompare } from './text';

export interface RequirementTemplate {
  documentName: string;
  documentCategory: string;
  reason: string;
  confidence: ConfidenceLevel;
}

export interface ChecklistRule {
  id: string;
  matches: (record: NormalizedExogenousRecord) => boolean;
  requirement: RequirementTemplate;
}

function recordText(record: NormalizedExogenousRecord): string {
  return normalizeForCompare(
    [record.conceptCode, record.conceptLabel, record.suggestedUse?.originalText]
      .filter(Boolean)
      .join(' '),
  );
}

export const DEFAULT_CHECKLIST_RULES: ChecklistRule[] = [
  {
    id: 'concept.housing-interest.v2',
    matches: (record) => /interes(?:es)? de vivienda|credito hipotecario/.test(recordText(record)),
    requirement: {
      documentName: 'Certificado de intereses de vivienda',
      documentCategory: 'Vivienda',
      reason: 'Se detectaron intereses o un crédito de vivienda que conviene soportar.',
      confidence: 'high',
    },
  },
  {
    id: 'concept.bank-balance.v2',
    matches: (record) =>
      record.category === 'asset' && /saldo|cuenta|deposito|banc/.test(recordText(record)),
    requirement: {
      documentName: 'Certificado de saldos',
      documentCategory: 'Financiero',
      reason: 'Se detectó un saldo financiero o bancario que conviene conciliar.',
      confidence: 'high',
    },
  },
  {
    id: 'concept.financial-income.v2',
    matches: (record) =>
      record.category === 'financial_income' || record.category === 'withholding',
    requirement: {
      documentName: 'Certificado tributario y de rendimientos',
      documentCategory: 'Financiero',
      reason: 'Se detectaron rendimientos o retenciones con relevancia tributaria inicial.',
      confidence: 'high',
    },
  },
  {
    id: 'concept.liability.v2',
    matches: (record) => record.category === 'liability',
    requirement: {
      documentName: 'Certificado de deuda',
      documentCategory: 'Pasivos',
      reason: 'Se detectó un registro clasificado inicialmente como deuda o pasivo.',
      confidence: 'high',
    },
  },
  {
    id: 'concept.severance.v2',
    matches: (record) => record.category === 'severance',
    requirement: {
      documentName: 'Certificado del fondo de cesantías',
      documentCategory: 'Pensiones y cesantías',
      reason: 'Se detectó información relacionada con cesantías.',
      confidence: 'high',
    },
  },
  {
    id: 'concept.labor-assets.v2',
    matches: (record) => /activo laboral|saldo laboral|prestacion social/.test(recordText(record)),
    requirement: {
      documentName: 'Certificado de saldos laborales',
      documentCategory: 'Laboral',
      reason: 'Se detectaron activos o saldos de origen laboral.',
      confidence: 'medium',
    },
  },
  {
    id: 'concept.prize.v2',
    matches: (record) =>
      record.category === 'occasional_gain' && /premio|loteria|rifa/.test(recordText(record)),
    requirement: {
      documentName: 'Certificado de premio o ganancia ocasional',
      documentCategory: 'Ganancias ocasionales',
      reason: 'Se detectó un premio o señal de posible ganancia ocasional.',
      confidence: 'high',
    },
  },
  {
    id: 'concept.property.v2',
    matches: (record) => /predial|inmueble|avaluo catastral/.test(recordText(record)),
    requirement: {
      documentName: 'Certificado predial',
      documentCategory: 'Patrimonio',
      reason: 'Se detectó información de un inmueble o avalúo que requiere soporte.',
      confidence: 'high',
    },
  },
  {
    id: 'concept.annual-costs.v2',
    matches: (record) =>
      ['purchase', 'electronic_invoicing_total'].includes(record.category) &&
      /compra|costo|gasto|factur/.test(recordText(record)),
    requirement: {
      documentName: 'Reporte anual de costos o gastos',
      documentCategory: 'Costos y gastos',
      reason: 'Se detectaron compras o costos con evidencia conceptual específica.',
      confidence: 'medium',
    },
  },
];

export function buildChecklist(
  entities: ReportingEntity[],
  records: NormalizedExogenousRecord[],
  rules: ChecklistRule[] = DEFAULT_CHECKLIST_RULES,
): DocumentaryRequirement[] {
  const requirements: DocumentaryRequirement[] = [];
  const seen = new Set<string>();

  for (const entity of entities) {
    const entityRecords = records.filter(
      (record) =>
        (entity.taxId !== null && record.reportingEntityDocument === entity.taxId) ||
        (entity.taxId === null && record.entityName === entity.name),
    );
    for (const rule of rules) {
      if (!entityRecords.some(rule.matches)) continue;
      const uniqueKey = `${entity.id}|${rule.requirement.documentName}`;
      if (seen.has(uniqueKey)) continue;
      seen.add(uniqueKey);
      requirements.push({
        id: prefixedId('req', [entity.id, rule.id, rule.requirement.documentName]),
        entityName: entity.name,
        entityCategory: entity.category,
        ...rule.requirement,
        status: 'pending',
        recommendationSource: rule.id,
        isLegallyRequired: false,
        attachment: null,
      });
    }
    const entityRequirements = requirements.filter(
      (requirement) => requirement.entityName === entity.name,
    );
    const financialRequirementCount = entityRequirements.filter((requirement) =>
      ['Financiero', 'Pasivos', 'Vivienda', 'Pensiones y cesantías'].includes(
        requirement.documentCategory,
      ),
    ).length;
    if (financialRequirementCount >= 2) {
      const documentName = 'Certificado tributario consolidado';
      const uniqueKey = `${entity.id}|${documentName}`;
      if (!seen.has(uniqueKey)) {
        seen.add(uniqueKey);
        requirements.push({
          id: prefixedId('req', [entity.id, 'entity.consolidated-certificate.v2', documentName]),
          entityName: entity.name,
          entityCategory: entity.category,
          documentName,
          documentCategory: 'Financiero multipropósito',
          reason: `La entidad presenta ${financialRequirementCount} necesidades financieras que un certificado consolidado podría cubrir sin duplicar archivos.`,
          status: 'pending',
          recommendationSource: 'entity.consolidated-certificate.v2',
          confidence: 'high',
          isLegallyRequired: false,
          attachment: null,
        });
      }
    }
  }

  requirements.sort(
    (a, b) =>
      a.entityName.localeCompare(b.entityName, 'es') ||
      a.documentName.localeCompare(b.documentName, 'es'),
  );
  return requirements;
}
