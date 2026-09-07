import type {
  CaseProduct,
  DocumentFactCandidate,
  DocumentaryRequirement,
  NormalizedExogenousRecord,
  ReportingEntity,
} from '@nexus-tax/domain';
import { evaluateNumericReconciliation } from '@nexus-tax/domain';
import { comparableText } from './normalize';
import { detectMonetaryAnomalies } from './money';
import { detectSemanticContradiction } from './semanticGate';

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
    ? input.entities.filter((entity) => {
        const aliases = [entity.name, entity.legalName, entity.brandName]
          .filter((value): value is string => Boolean(value))
          .map(comparableText);
        return aliases.some(
          (alias) => alias.includes(candidateName) || candidateName.includes(alias),
        );
      })
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
    .filter(
      (product) => !candidate.proposedEntityId || product.entityId === candidate.proposedEntityId,
    )
    .map((product) => {
      let score = product.type === candidate.productType ? 30 : 0;
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
    productId:
      ranked[0] && (!ranked[1] || ranked[0].score > ranked[1].score) ? ranked[0].product.id : null,
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
      const anomalies = candidate.amount
        ? detectMonetaryAnomalies(candidate.amount, record.reportedValue)
        : [];
      if (difference === 0) {
        score += 30;
        reasons.push('Mismo valor.');
      } else if (difference / Math.max(Math.abs(record.reportedValue ?? 0), 1) <= 0.01) {
        score += 15;
        reasons.push('Valor cercano.');
      }
      if (anomalies.length) {
        score = Math.min(score, 49);
        reasons.push(...anomalies.map((anomaly) => anomaly.message));
      }
      return { record, score, reasons, difference, anomalies };
    })
    .filter((item) => item.score >= 35)
    .sort((a, b) => b.score - a.score || a.record.id.localeCompare(b.record.id));
  const top = ranked.slice(0, 3);
  const isAmbiguous = top.length > 1 && top[0]!.score === top[1]!.score;
  return top.map((item) => {
    const documentDecimalValue = candidate.amount?.decimalValue ?? candidate.extractedValue;
    const exogenousValue = item.record.reportedValue ?? 0;
    // Política numérica única (Sprint 2.4, Fase F.3 — Unified
    // Reconciliation & Coverage Hardening): exact/rounding/minor/relevant
    // ya NO se redefinen aquí — se derivan de
    // `evaluateNumericReconciliation` (`@nexus-tax/domain`), la misma
    // fuente que usa `evaluateReconciliationDifference` (matriz/topes) y
    // `ReconciliationsPanel` (hechos↔exógena). Tolerancia de redondeo de
    // $1 (redondeo simple de centavos), como en el comportamiento previo.
    const numericPolicy = evaluateNumericReconciliation({
      documentDecimalValue,
      exogenousValue,
      roundingToleranceCop: 1,
    });
    // Gate semántico (Sprint 2.4, Fase F.2, §6 de docs/EVIDENCE_MATCHING.md):
    // se calcula por PAR candidato↔registro (no solo por candidato) para
    // detectar también la contradicción CRUZADA — el propio texto del
    // candidato puede contradecir la categoría del REGISTRO exógeno
    // aunque el adaptador ya haya categorizado correctamente al
    // candidato (defensa en profundidad ante el caso real del benchmark,
    // §6/§8 del prompt). `igualdad numérica ≠ equivalencia tributaria`.
    const semanticContradiction = detectSemanticContradiction({
      originalConcept: candidate.originalConcept,
      normalizedConcept: candidate.normalizedConcept,
      proposedCategory: candidate.proposedCategory,
      referenceCategories: [item.record.category],
    });
    const rawStatus: DocumentFactCandidate['suggestedExogenousMatches'][number]['status'] =
      isAmbiguous
        ? 'ambiguous'
        : numericPolicy.status === 'exact'
          ? 'exact_match'
          : numericPolicy.status === 'rounding'
            ? 'rounding_match'
            : numericPolicy.status === 'minor'
              ? 'minor_difference'
              : item.score >= 50
                ? 'possible_match'
                : item.difference > 0
                  ? 'contradiction'
                  : 'no_match';
    // Match gate semántico (Fase F.2, §6): una contradicción fuerte NUNCA
    // puede quedar como `exact_match`/`rounding_match` con capacidad de
    // confirmación en bloque — la semántica tiene precedencia sobre la
    // igualdad/redondeo numérico (Fase F.3, §6 del prompt: "semantic
    // compatibility + numeric reconciliation policy = final match
    // status", con la semántica siempre primero). Se degrada como máximo
    // a `possible_match` (nunca se oculta el candidato, §7).
    const downgradedBySemanticGate =
      semanticContradiction.contradictory &&
      (rawStatus === 'exact_match' || rawStatus === 'rounding_match');
    const status = downgradedBySemanticGate ? 'possible_match' : rawStatus;
    const reasons = downgradedBySemanticGate
      ? [...item.reasons, semanticContradiction.reason!]
      : numericPolicy.status === 'rounding'
        ? [
            ...item.reasons.filter((reason) => reason !== 'Valor cercano.'),
            'El valor documental redondea exactamente al valor de la exógena.',
          ]
        : item.reasons;
    const anomalyCodes = downgradedBySemanticGate
      ? [...item.anomalies.map((anomaly) => anomaly.code), 'semantic_concept_contradiction' as const]
      : item.anomalies.map((anomaly) => anomaly.code);
    return {
      recordId: item.record.id,
      status,
      reasons,
      exogenousValue,
      documentDecimalValue: candidate.amount?.decimalValue ?? candidate.extractedValue,
      roundedTaxValue: candidate.amount?.roundedTaxValue ?? Math.round(candidate.extractedValue),
      difference: item.difference,
      differencePercentage: numericPolicy.differencePercentage,
      possibleScaleFactor:
        item.anomalies.find((anomaly) => anomaly.possibleScaleFactor)?.possibleScaleFactor ?? null,
      recommendedSource:
        downgradedBySemanticGate || item.anomalies.length
          ? ('human_review' as const)
          : item.difference <= 1
            ? ('both' as const)
            : candidate.amount?.confidence === 'high'
              ? ('document' as const)
              : ('human_review' as const),
      recommendationReason: downgradedBySemanticGate
        ? semanticContradiction.reason!
        : item.anomalies.length
          ? 'La diferencia puede provenir de la interpretación monetaria; confirma el texto original.'
        : item.difference <= 1
          ? 'Las fuentes coinciden después de considerar centavos y redondeo al peso.'
          : 'La fuente documental conserva evidencia directa, pero requiere revisión humana.',
      anomalyCodes,
    };
  });
}

/**
 * Traduce un `CandidateExogenousMatchStatus` a un mensaje humano SIN
 * exponer scores crudos (§11 de docs/EVIDENCE_MATCHING.md). Es la única
 * superficie que la Guided Review debe usar para describir una
 * coincidencia; el score interno de `suggestExogenousMatches` nunca debe
 * llegar a la UI.
 */
export function describeMatchConfidence(
  status: DocumentFactCandidate['suggestedExogenousMatches'][number]['status'],
): { label: string; description: string } {
  switch (status) {
    case 'exact_match':
      return { label: 'Coincide exactamente', description: 'El valor documental es idéntico al reportado en la exógena.' };
    case 'rounding_match':
      return {
        label: 'Coincide por redondeo al peso',
        description: 'El valor documental (con centavos) redondea exactamente al valor reportado en la exógena.',
      };
    case 'minor_difference':
      return {
        label: 'Diferencia menor',
        description: 'Los valores difieren por menos de un peso; probablemente sea la misma fuente.',
      };
    case 'possible_match':
      return {
        label: 'Posible coincidencia',
        description: 'Varias señales coinciden, pero el monto no permite confirmar automáticamente.',
      };
    case 'ambiguous':
      return {
        label: 'Ambiguo: requiere elegir',
        description: 'Dos o más registros de la exógena empatan; una persona debe elegir cuál corresponde.',
      };
    case 'contradiction':
      return {
        label: 'Contradicción',
        description: 'La diferencia es relevante y contradice el dato documental.',
      };
    case 'no_match':
    default:
      return { label: 'Sin relación suficiente', description: 'No hay evidencia suficiente para relacionar este valor con la exógena.' };
  }
}
