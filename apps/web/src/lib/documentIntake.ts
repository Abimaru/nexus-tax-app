import type { DocumentaryRequirement, RequirementCoverage } from '@nexus-tax/domain';

/**
 * Lógica pura de la pantalla "Sube tus documentos": clasifica archivos por
 * extensión y resume, en lenguaje llano, qué soportes sugiere la exógena y
 * cuáles ya están cubiertos. No decide obligaciones: solo recomienda.
 */

export type IntakeFileType = 'pdf' | 'sheet' | 'unsupported';

export function intakeFileType(fileName: string): IntakeFileType {
  const extension = fileName.includes('.') ? fileName.split('.').pop()!.toLowerCase() : '';
  if (extension === 'pdf') return 'pdf';
  if (extension === 'xlsx' || extension === 'xls') return 'sheet';
  return 'unsupported';
}

export interface ChecklistItem {
  name: string;
  total: number;
  covered: number;
  /** Entidades (máx. 3) que originan la sugerencia, para dar contexto. */
  entities: string[];
  extraEntities: number;
  complete: boolean;
}

export interface DocumentChecklist {
  items: ChecklistItem[];
  totalRequirements: number;
  coveredRequirements: number;
  pendingRequirements: number;
}

export function buildDocumentChecklist(
  requirements: readonly DocumentaryRequirement[],
  coverages: readonly RequirementCoverage[],
): DocumentChecklist {
  const coveredIds = new Set(
    coverages.filter((coverage) => coverage.status === 'covered').map((c) => c.requirementId),
  );
  const groups = new Map<string, { reqs: DocumentaryRequirement[]; covered: number }>();
  for (const requirement of requirements) {
    const group = groups.get(requirement.documentName) ?? { reqs: [], covered: 0 };
    group.reqs.push(requirement);
    if (coveredIds.has(requirement.id)) group.covered += 1;
    groups.set(requirement.documentName, group);
  }
  const items = Array.from(groups.entries())
    .map(([name, group]): ChecklistItem => {
      const entities = Array.from(new Set(group.reqs.map((item) => item.entityName)));
      return {
        name,
        total: group.reqs.length,
        covered: group.covered,
        entities: entities.slice(0, 3),
        extraEntities: Math.max(entities.length - 3, 0),
        complete: group.covered >= group.reqs.length,
      };
    })
    // Primero lo pendiente (más pendientes arriba), luego lo completo; desempate alfabético.
    .sort(
      (a, b) =>
        Number(a.complete) - Number(b.complete) ||
        b.total - b.covered - (a.total - a.covered) ||
        a.name.localeCompare(b.name, 'es'),
    );
  const covered = items.reduce((sum, item) => sum + item.covered, 0);
  return {
    items,
    totalRequirements: requirements.length,
    coveredRequirements: covered,
    pendingRequirements: requirements.length - covered,
  };
}
