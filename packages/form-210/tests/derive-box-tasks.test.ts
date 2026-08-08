import { describe, expect, it } from 'vitest';
import type { TaxResolutionDecision } from '@nexus-tax/domain';
import { UVT_2025 } from '@nexus-tax/aegis-rules';
import { buildForm210Draft, deriveForm210BoxTasks } from '../src';

function makeAdjust(caseId: string, id: string, box: number, value: number): TaxResolutionDecision {
  return {
    id,
    caseId,
    type: 'adjust_form_box',
    objectType: 'form_box',
    objectId: String(box),
    previousState: 'automatic',
    finalState: 'confirmed',
    selectedAlternative: 'Prueba',
    originalValue: null,
    finalValue: value,
    originalCategory: null,
    finalCategory: null,
    proposedBox: box,
    reason: 'test',
    note: '',
    evidence: [],
    localAuthor: 'test',
    decidedAt: '2026-08-08T00:00:00.000Z',
    ruleVersion: 'test',
    reversible: true,
    replacesDecisionId: null,
  };
}

describe('deriveForm210BoxTasks (Fase S)', () => {
  it('genera tareas para casillas sin datos', () => {
    const draft = buildForm210Draft({
      caseId: 'case-empty',
      taxYear: 2025,
      records: [],
      facts: [],
    });
    const tasks = deriveForm210BoxTasks(draft);
    // Todas las casillas del ruleset arrancan en `no_data`, así que
    // se genera una tarea por cada una.
    expect(tasks.length).toBeGreaterThan(0);
    expect(tasks.every((task) => task.type === 'resolve_form_box')).toBe(true);
    expect(tasks[0]!.priority).toBe('medium');
    expect(tasks[0]!.blocking).toBe(false);
    expect(tasks[0]!.source).toBe('filing');
    expect(tasks[0]!.stage).toBe('declaracion');
    expect(tasks[0]!.view).toBe('formulario-210');
  });

  it('no genera tarea para casillas confirmadas o calculadas', () => {
    const draft = buildForm210Draft({
      caseId: 'case-confirmed',
      taxYear: 2025,
      records: [],
      facts: [],
      resolutions: [makeAdjust('case-confirmed', 'dec-42', 42, 3_000 * UVT_2025)],
    });
    const tasks = deriveForm210BoxTasks(draft);
    // La casilla 42 quedó `confirmed`; no debe generar tarea.
    expect(tasks.find((task) => task.formBoxNumber === 42)).toBeUndefined();
  });

  it('incluye la casilla en el título y en el ruleId', () => {
    const draft = buildForm210Draft({
      caseId: 'case-titles',
      taxYear: 2025,
      records: [],
      facts: [],
    });
    const tasks = deriveForm210BoxTasks(draft);
    const box35 = tasks.find((task) => task.formBoxNumber === 35);
    expect(box35).toBeDefined();
    expect(box35!.title).toContain('35');
    expect(box35!.ruleId).toBe('form-210:box:35');
  });
});
