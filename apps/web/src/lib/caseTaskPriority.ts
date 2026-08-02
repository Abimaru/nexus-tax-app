import type { CaseTask } from '@nexus-tax/domain';

/** Orden operativo documentado para que un bloqueo medio preceda una tarea alta no bloqueante. */
export function caseTaskPriorityRank(task: Pick<CaseTask, 'blocking' | 'priority'>): number {
  if (task.blocking && task.priority === 'high') return 0;
  if (task.blocking && task.priority === 'medium') return 1;
  if (!task.blocking && task.priority === 'high') return 2;
  if (!task.blocking && task.priority === 'medium') return 3;
  return 4;
}

export function compareCaseTasks(a: CaseTask, b: CaseTask): number {
  return caseTaskPriorityRank(a) - caseTaskPriorityRank(b) || a.title.localeCompare(b.title, 'es');
}
