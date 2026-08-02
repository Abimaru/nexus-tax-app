import { describe, expect, it } from 'vitest';
import { caseTaskPriorityRank } from './caseTaskPriority';

describe('prioridad operativa de tareas', () => {
  it('pone un bloqueo medio antes de una tarea alta no bloqueante', () => {
    expect(caseTaskPriorityRank({ blocking: true, priority: 'medium' })).toBeLessThan(
      caseTaskPriorityRank({ blocking: false, priority: 'high' }),
    );
  });

  it('deja prioridad baja al final aunque sea bloqueante', () => {
    expect(caseTaskPriorityRank({ blocking: true, priority: 'low' })).toBe(4);
  });
});
