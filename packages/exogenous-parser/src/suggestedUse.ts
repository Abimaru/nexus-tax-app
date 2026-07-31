import type { SuggestedDeclarationUse } from '@nexus-tax/domain';
import { normalizeForCompare } from './text';

const BOX_GROUPS: Record<number, string> = {
  29: 'assets',
  30: 'liabilities',
  32: 'income',
  33: 'income_adjustment',
  36: 'deduction_candidate',
  51: 'income',
  58: 'income',
  59: 'deduction_candidate',
  67: 'income',
  76: 'income',
  84: 'deduction_candidate',
  100: 'occasional_gain',
  112: 'tax_credit',
  131: 'tax_credit',
  132: 'tax_credit',
};

function inferGroups(text: string, boxNumbers: number[]): string[] {
  const normalized = normalizeForCompare(text);
  const groups = new Set<string>();
  for (const number of boxNumbers) {
    const group = BOX_GROUPS[number];
    if (group) groups.add(group);
  }
  if (normalized.includes('patrimonio')) groups.add('assets');
  if (normalized.includes('deuda') || normalized.includes('pasivo')) groups.add('liabilities');
  if (normalized.includes('retencion')) groups.add('tax_credit');
  if (normalized.includes('ingreso') || normalized.includes('renta')) groups.add('income');
  if (normalized.includes('deduccion')) groups.add('deduction_candidate');
  return Array.from(groups).sort();
}

function detectConditionSignals(text: string): SuggestedDeclarationUse['conditionSignals'] {
  const normalized = normalizeForCompare(text);
  const signals = new Set<SuggestedDeclarationUse['conditionSignals'][number]>();
  if (/saldo.*positivo|si.*positivo/.test(normalized)) signals.add('positive_balance');
  if (/saldo.*negativo|si.*negativo/.test(normalized)) signals.add('negative_balance');
  if (/cuando corresponda|si corresponde|cuando aplique/.test(normalized)) {
    signals.add('when_applicable');
  }
  if (/titular principal/.test(normalized)) signals.add('primary_holder');
  if (/valor pagado/.test(normalized)) signals.add('amount_paid');
  if (/valor retenido/.test(normalized)) signals.add('amount_withheld');
  if (/saldo al cierre|saldo.*31 de diciembre/.test(normalized)) signals.add('closing_balance');
  if (/movimiento.*periodo|durante el periodo/.test(normalized)) signals.add('period_movement');
  return Array.from(signals).sort();
}

export function parseSuggestedUse(value: string | null): SuggestedDeclarationUse | null {
  if (!value || value.trim() === '') return null;
  const originalText = value.trim();
  const mentionedThresholds = Array.from(
    new Set(Array.from(originalText.matchAll(/\btope\s*(\d+)\b/gi), (match) => Number(match[1]))),
  ).sort((a, b) => a - b);

  const boxReferences = Array.from(
    originalText.matchAll(/\bR\s*(\d+)\s*([^|]*?)(?=\bR\s*\d+|\||$)/gi),
    (match) => {
      const number = Number(match[1]);
      const description = match[2]?.trim().replace(/^[-:]+\s*/, '') || null;
      return { code: `R${number}`, number, description };
    },
  );
  const conditions = originalText
    .split('|')
    .map((part) => part.trim())
    .filter(
      (part) =>
        part !== '' &&
        (/\b(?:si|cuando|en caso|segun)\b/i.test(normalizeForCompare(part)) ||
          !/\b(?:tope\s*\d+|R\s*\d+)\b/i.test(part)),
    );
  const inferredTaxGroups = inferGroups(
    originalText,
    boxReferences.map((reference) => reference.number),
  );
  const principalGroups = inferredTaxGroups.filter((group) =>
    ['assets', 'liabilities', 'income', 'tax_credit', 'occasional_gain'].includes(group),
  );
  const conditionSignals = detectConditionSignals(originalText);
  const possibleDestinations = boxReferences.map((reference) => ({
    boxCode: reference.code,
    group: BOX_GROUPS[reference.number] ?? 'unknown',
    description: reference.description,
  }));
  const distinctPrincipalGroups = new Set(principalGroups);
  const hasSignCondition =
    conditionSignals.includes('positive_balance') && conditionSignals.includes('negative_balance');
  const multiplicity =
    distinctPrincipalGroups.size > 1
      ? hasSignCondition
        ? 'resolvable_condition'
        : 'real_ambiguity'
      : possibleDestinations.length > 1 ||
          inferredTaxGroups.length > 1 ||
          (mentionedThresholds.length > 0 && inferredTaxGroups.length > 0)
        ? 'compatible_multiple_uses'
        : 'single';

  return {
    originalText,
    mentionedThresholds,
    boxReferences,
    conditions,
    conditionSignals,
    inferredTaxGroups,
    possibleDestinations,
    multiplicity,
    isAmbiguous: multiplicity === 'real_ambiguity',
  };
}
