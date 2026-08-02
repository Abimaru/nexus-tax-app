import { normalizeForCompare } from './text';

export const ENTITY_ALIAS_CATALOG_VERSION = 'co.financial-entities.2026-08-02.v1';

export interface ResolvedEntityIdentity {
  legalName: string;
  displayName: string;
  brandName: string | null;
  groupName: string | null;
  canonicalKey: string;
  ruleVersion: string;
}

interface EntityAliasRule {
  id: string;
  patterns: readonly RegExp[];
  legalName: string;
  brandName: string;
  groupName: string;
}

const ENTITY_ALIAS_RULES: readonly EntityAliasRule[] = [
  {
    id: 'fiduciaria-bancolombia',
    patterns: [/\bfiduciaria bancolombia\b/, /\bfidubancolombia\b/],
    legalName: 'Fiduciaria Bancolombia S.A.',
    brandName: 'Fiduciaria Bancolombia',
    groupName: 'Grupo Bancolombia',
  },
  {
    id: 'nequi',
    patterns: [/\bnequi\b/],
    legalName: 'Entidad jurÃ­dica reportada para Nequi',
    brandName: 'Nequi',
    groupName: 'Grupo Bancolombia',
  },
  {
    id: 'bancolombia',
    patterns: [/\bbancolombia\b/, /\bbanco de colombia\b/],
    legalName: 'Bancolombia S.A.',
    brandName: 'Bancolombia',
    groupName: 'Grupo Bancolombia',
  },
];

export function resolveEntityIdentity(name: string | null): ResolvedEntityIdentity {
  const original = name?.trim() || 'Sin nombre';
  const normalized = normalizeForCompare(original);
  const rule = ENTITY_ALIAS_RULES.find((entry) =>
    entry.patterns.some((pattern) => pattern.test(normalized)),
  );
  if (!rule) {
    return {
      legalName: original,
      displayName: original,
      brandName: null,
      groupName: null,
      canonicalKey: normalized || '__sin_entidad__',
      ruleVersion: ENTITY_ALIAS_CATALOG_VERSION,
    };
  }
  return {
    legalName: rule.id === 'nequi' ? original : rule.legalName,
    displayName: rule.brandName,
    brandName: rule.brandName,
    groupName: rule.groupName,
    canonicalKey: rule.id,
    ruleVersion: ENTITY_ALIAS_CATALOG_VERSION,
  };
}
