import type { EntityCategory } from '@nexus-tax/domain';
import { normalizeForCompare } from './text';

/**
 * Inferencia de categoría de entidad a partir de señales textuales.
 * Es una HEURÍSTICA orientativa (no una afirmación): combina el nombre de la
 * entidad y los conceptos asociados. Preparada para evolucionar al Aegis Engine.
 */

const KEYWORDS: Record<Exclude<EntityCategory, 'other' | 'unknown'>, string[]> = {
  bank: [
    'banco',
    'bancolombia',
    'davivienda',
    'bbva',
    'bank',
    'financiera',
    'cooperativa',
    'colpatria',
    'itau',
    'scotiabank',
    'av villas',
    'financ',
  ],
  pension: [
    'pension',
    'pensiones',
    'cesantias',
    'porvenir',
    'colfondos',
    'proteccion',
    'skandia',
    'colpensiones',
    'old mutual',
  ],
  housing: [
    'hipotecario',
    'vivienda',
    'fondo nacional del ahorro',
    'fna',
    'leasing habitacional',
    'credito de vivienda',
  ],
  employer: ['empleador', 'nomina', 'salario', 'salarios', 'laboral', 'honorarios'],
};

const EMPLOYER_CONCEPT_HINTS = [
  'salario',
  'salarios',
  'nomina',
  'laboral',
  'honorarios',
  'servicios',
];

/**
 * Determina la categoría combinando el nombre y los conceptos observados.
 * Orden de prioridad: banco > pensión > vivienda > empleador > desconocido.
 */
export function inferEntityCategory(
  entityName: string | null,
  conceptLabels: readonly (string | null)[],
): EntityCategory {
  const name = entityName ? normalizeForCompare(entityName) : '';
  const concepts = conceptLabels
    .filter((c): c is string => Boolean(c))
    .map((c) => normalizeForCompare(c));

  const nameHas = (keys: string[]) => keys.some((k) => name.includes(k));

  if (nameHas(KEYWORDS.bank)) return 'bank';
  if (nameHas(KEYWORDS.pension)) return 'pension';
  if (nameHas(KEYWORDS.housing)) return 'housing';

  const conceptSuggestsEmployer = concepts.some((c) =>
    EMPLOYER_CONCEPT_HINTS.some((h) => c.includes(h)),
  );
  if (nameHas(KEYWORDS.employer) || conceptSuggestsEmployer) return 'employer';

  return name ? 'other' : 'unknown';
}
