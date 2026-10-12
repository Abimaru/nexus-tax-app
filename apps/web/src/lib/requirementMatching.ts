import type { DocumentKind, DocumentaryRequirement, RequirementCoverage } from '@nexus-tax/domain';

/**
 * Propone a qué soporte sugerido por la exógena corresponde cada documento leído.
 * Es puramente una SUGERENCIA: nada se aplica sin confirmación humana. Es deliberadamente
 * conservador: exige que coincidan el tipo de documento y la entidad, y solo califica como
 * «segura» cuando el clasificador tiene confianza alta.
 */

export interface MatchDocument {
  id: string;
  fileName: string;
  kind: DocumentKind;
  status: string;
  entityIds: readonly string[];
}

export interface MatchSession {
  documentId: string;
  runNumber: number;
  classification: {
    proposedKind: DocumentKind;
    correctedKind: DocumentKind | null;
    confidence: 'high' | 'medium' | 'low' | 'insufficient';
  } | null;
}

export interface MatchCandidate {
  documentId: string;
  proposedEntityId: string | null;
}

export interface MatchEntity {
  id: string;
  name: string;
}

export type MatchStrength = 'strong' | 'possible';

export interface RequirementMatchSuggestion {
  key: string;
  documentId: string;
  documentFileName: string;
  requirementId: string;
  requirementName: string;
  entityName: string;
  entityId: string | null;
  strength: MatchStrength;
  reason: string;
}

/** Tipo de documento → nombres de requisito (checklist de la exógena) que puede soportar. */
const KIND_TO_REQUIREMENTS: Partial<Record<DocumentKind, readonly string[]>> = {
  housing_interest_certificate: ['Certificado de intereses de vivienda'],
  balance_certificate: ['Certificado de saldos'],
  consolidated_tax_certificate: [
    'Certificado tributario consolidado',
    'Certificado tributario y de rendimientos',
  ],
  income_withholding_certificate: ['Certificado tributario y de rendimientos'],
  debt_certificate: ['Certificado de deuda'],
  severance_certificate: ['Certificado del fondo de cesantías'],
  employee_fund_certificate: ['Certificado de saldos laborales'],
  prize_certificate: ['Certificado de premio o ganancia ocasional'],
  property_tax_certificate: ['Certificado predial'],
  annual_cost_report: ['Reporte anual de costos o gastos'],
};

function latestSession(
  sessions: readonly MatchSession[],
  documentId: string,
): MatchSession | undefined {
  return sessions
    .filter((session) => session.documentId === documentId)
    .sort((a, b) => b.runNumber - a.runNumber)[0];
}

function dominantEntityId(
  document: MatchDocument,
  candidates: readonly MatchCandidate[],
): string | null {
  if (document.entityIds.length > 0) return document.entityIds[0] ?? null;
  const counts = new Map<string, number>();
  for (const candidate of candidates) {
    if (candidate.documentId !== document.id || !candidate.proposedEntityId) continue;
    counts.set(candidate.proposedEntityId, (counts.get(candidate.proposedEntityId) ?? 0) + 1);
  }
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  if (ranked.length === 0) return null;
  // Si dos entidades empatan no se adivina.
  if (ranked.length > 1 && ranked[0]![1] === ranked[1]![1]) return null;
  return ranked[0]![0];
}

export function suggestRequirementMatches(input: {
  documents: readonly MatchDocument[];
  sessions: readonly MatchSession[];
  candidates: readonly MatchCandidate[];
  requirements: readonly DocumentaryRequirement[];
  coverages: readonly RequirementCoverage[];
  entities: readonly MatchEntity[];
}): RequirementMatchSuggestion[] {
  const coveredRequirementIds = new Set(
    input.coverages.filter((item) => item.status === 'covered').map((item) => item.requirementId),
  );
  const linkedPairs = new Set(
    input.coverages
      .filter((item) => item.documentId)
      .map((item) => `${item.documentId}|${item.requirementId}`),
  );
  const entityIdByName = new Map(input.entities.map((entity) => [entity.name, entity.id]));
  const suggestions: RequirementMatchSuggestion[] = [];

  for (const document of input.documents) {
    if (document.status !== 'active') continue;
    const classification = latestSession(input.sessions, document.id)?.classification ?? null;

    // Tipo efectivo: el ya adoptado por el documento o, si sigue como «otro», el propuesto.
    let kind: DocumentKind | null = null;
    let confident = false;
    if (document.kind !== 'other') {
      kind = document.kind;
      confident = true;
    } else if (classification) {
      const proposed = classification.correctedKind ?? classification.proposedKind;
      if (proposed !== 'other' && ['high', 'medium'].includes(classification.confidence)) {
        kind = proposed;
        confident = classification.confidence === 'high';
      }
    }
    const names = kind ? KIND_TO_REQUIREMENTS[kind] : undefined;
    if (!kind || !names) continue;

    const candidatesForKind = input.requirements.filter(
      (requirement) =>
        names.includes(requirement.documentName) && !coveredRequirementIds.has(requirement.id),
    );
    const documentEntityId = dominantEntityId(document, input.candidates);

    for (const requirement of candidatesForKind) {
      if (linkedPairs.has(`${document.id}|${requirement.id}`)) continue;
      const requirementEntityId = entityIdByName.get(requirement.entityName) ?? null;
      let strength: MatchStrength;
      let reason: string;
      if (documentEntityId) {
        if (requirementEntityId !== documentEntityId) continue;
        strength = confident ? 'strong' : 'possible';
        reason = `Coincide el tipo de documento y la entidad (${requirement.entityName}).`;
      } else {
        // Sin entidad legible solo se propone por descarte si el tipo es confiable y único.
        const sameTypeCount = candidatesForKind.filter(
          (item) => item.documentName === requirement.documentName,
        ).length;
        if (!confident || sameTypeCount !== 1) continue;
        strength = 'possible';
        reason =
          'Es el único soporte de este tipo que sugiere tu exógena; no pudimos leer la entidad.';
      }
      suggestions.push({
        key: `${document.id}|${requirement.id}`,
        documentId: document.id,
        documentFileName: document.fileName,
        requirementId: requirement.id,
        requirementName: requirement.documentName,
        entityName: requirement.entityName,
        entityId: requirementEntityId,
        strength,
        reason,
      });
    }
  }

  // Si varios documentos compiten por el mismo requisito, ninguno es «seguro»: lo decide la persona.
  const perRequirement = new Map<string, number>();
  for (const item of suggestions) {
    perRequirement.set(item.requirementId, (perRequirement.get(item.requirementId) ?? 0) + 1);
  }
  for (const item of suggestions) {
    if ((perRequirement.get(item.requirementId) ?? 0) > 1) {
      item.strength = 'possible';
      item.reason = 'Varios documentos podrían soportar este requisito; confirma el correcto.';
    }
  }

  return suggestions.sort(
    (a, b) =>
      Number(b.strength === 'strong') - Number(a.strength === 'strong') ||
      a.documentFileName.localeCompare(b.documentFileName, 'es') ||
      a.entityName.localeCompare(b.entityName, 'es'),
  );
}
