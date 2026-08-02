import type {
  CaseProduct,
  DocumentFactCandidate,
  DocumentaryRequirement,
  NormalizedExogenousRecord,
  ReportingEntity,
} from '@nexus-tax/domain';
import { comparableText } from './normalize';

export function suggestEntity(input: {
  candidate: DocumentFactCandidate;
  entities: readonly ReportingEntity[];
  documentEntityIds?: readonly string[];
}): { entityId: string | null; reasons: string[]; ambiguous: boolean } {
  const documentMatches = input.entities.filter((entity) =>
    input.documentEntityIds?.includes(entity.id),
  );
  if (documentMatches.length === 1) {
    return {
      entityId: documentMatches[0]!.id,
      reasons: ['Entidad asociada al documento.'],
      ambiguous: false,
    };
  }
  const candidateName = comparableText(input.candidate.entityName ?? '');
  const nameMatches = candidateName
    ? input.entities.filter(
        (entity) =>
          comparableText(entity.name).includes(candidateName) ||
          candidateName.includes(comparableText(entity.name)),
      )
    : [];
  return {
    entityId: nameMatches.length === 1 ? nameMatches[0]!.id : null,
    reasons: nameMatches.length === 1 ? ['Nombre normalizado coincidente.'] : [],
    ambiguous: documentMatches.length > 1 || nameMatches.length > 1,
  };
}

export function suggestRequirements(
  candidate: DocumentFactCandidate,
  requirements: readonly DocumentaryRequirement[],
): string[] {
  const entity = comparableText(candidate.entityName ?? '');
  const concept = comparableText(candidate.originalConcept);
  return requirements
    .filter((requirement) => {
      const sameEntity = !entity || comparableText(requirement.entityName).includes(entity);
      const reason = comparableText(`${requirement.documentName} ${requirement.reason}`);
      const categoryWords = comparableText(candidate.proposedCategory).split(' ');
      return (
        sameEntity &&
        (categoryWords.some((word) => reason.includes(word)) ||
          concept.split(' ').some((word) => word.length > 4 && reason.includes(word)))
      );
    })
    .map((requirement) => requirement.id);
}

export function suggestProduct(
  candidate: DocumentFactCandidate,
  products: readonly CaseProduct[],
): { productId: string | null; ambiguous: boolean } {
  const label = comparableText(candidate.productLabel ?? '');
  const ranked = products
    .filter((product) => product.status !== 'obsolete')
    .map((product) => {
      let score = product.type === candidate.productType ? 50 : 0;
      const productLabel = comparableText(product.label);
      if (label && (label.includes(productLabel) || productLabel.includes(label))) score += 50;
      else if (
        label &&
        label.split(' ').some((word) => word.length > 4 && productLabel.includes(word))
      )
        score += 20;
      if (candidate.proposedEntityId && product.entityId === candidate.proposedEntityId)
        score += 20;
      return { product, score };
    })
    .filter((item) => item.score >= 50)
    .sort((a, b) => b.score - a.score || a.product.id.localeCompare(b.product.id));
  return {
    productId: ranked[0]?.product.id ?? null,
    ambiguous: Boolean(ranked[1] && ranked[0]?.score === ranked[1].score),
  };
}

export function suggestExogenousMatches(
  candidate: DocumentFactCandidate,
  records: readonly NormalizedExogenousRecord[],
): DocumentFactCandidate['suggestedExogenousMatches'] {
  const ranked = records
    .filter((record) => record.reportedValue !== null)
    .map((record) => {
      let score = 0;
      const reasons: string[] = [];
      if (record.category === candidate.proposedCategory) {
        score += 35;
        reasons.push('Misma categoría propuesta.');
      }
      const entityName = candidate.entityName;
      if (entityName && comparableText(record.entityName ?? '') === comparableText(entityName)) {
        score += 30;
        reasons.push('Misma entidad normalizada.');
      }
      const difference = Math.abs((record.reportedValue ?? 0) - candidate.extractedValue);
      if (difference === 0) {
        score += 30;
        reasons.push('Mismo valor.');
      } else if (difference / Math.max(Math.abs(record.reportedValue ?? 0), 1) <= 0.01) {
        score += 15;
        reasons.push('Valor cercano.');
      }
      return { record, score, reasons, difference };
    })
    .filter((item) => item.score >= 35)
    .sort((a, b) => b.score - a.score || a.record.id.localeCompare(b.record.id));
  const top = ranked.slice(0, 3);
  return top.map((item) => ({
    recordId: item.record.id,
    status:
      top.length > 1 && top[0]!.score === top[1]!.score
        ? 'multiple_candidates'
        : item.score >= 65
          ? 'strong_match'
          : item.score >= 50
            ? 'probable_match'
            : item.difference > 0
              ? 'possible_contradiction'
              : 'no_match',
    reasons: item.reasons,
  }));
}
