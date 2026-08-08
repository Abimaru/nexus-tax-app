import { describe, expect, it } from 'vitest';
import type { FilingObligationAssessment } from '@nexus-tax/aegis-rules';
import { UVT_2025 } from '@nexus-tax/aegis-rules';
import type { TaxResolutionDecision } from '@nexus-tax/domain';
import { buildForm210Draft, composeForm210FilingStates } from '../src';

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

const OBLIGATION_REQUIRED: FilingObligationAssessment = {
  taxYear: 2025,
  filingYear: 2026,
  status: 'required',
  reasons: [],
  missingInputs: [],
  deadline: {
    status: 'missing_document',
    lastTwoDigits: null,
    dueDate: null,
    sourceId: 'dian-calendario-tributario-2026',
    explanation: '',
  },
  evaluatedAt: '2026-08-08T00:00:00.000Z',
  ruleVersion: 'co-renta-pn-2025.1.0.0',
};

describe('composeForm210FilingStates (Fase O)', () => {
  it('devuelve etiquetas neutras cuando no hay entradas', () => {
    const states = composeForm210FilingStates({});
    expect(states.stages).toHaveLength(4);
    expect(states.stages[0]!.id).toBe('obligation');
    expect(states.stages[0]!.status).toBe('unevaluated');
    expect(states.stages[1]!.status).toBe('not_started');
    expect(states.stages[2]!.status).toBe('unavailable');
    expect(states.stages[3]!.status).toBe('out_of_scope');
  });

  it('refleja obligación requerida con tono amber', () => {
    const states = composeForm210FilingStates({ obligation: OBLIGATION_REQUIRED });
    const obligation = states.stages.find((stage) => stage.id === 'obligation')!;
    expect(obligation.status).toBe('required');
    expect(obligation.tone).toBe('amber');
    expect(obligation.statusLabel).toContain('Obligado');
  });

  it('refleja liquidación refund cuando el saldo es a favor', () => {
    const caseId = 'case-refund';
    const draft = buildForm210Draft({
      caseId,
      taxYear: 2025,
      records: [],
      facts: [],
      resolutions: [
        makeAdjust(caseId, 'dec-42', 42, 3_000 * UVT_2025),
        makeAdjust(caseId, 'dec-132', 132, 50_000_000),
      ],
    });
    const states = composeForm210FilingStates({ draft });
    const liquidation = states.stages.find((stage) => stage.id === 'liquidation')!;
    expect(liquidation.status).toBe('refund');
    expect(liquidation.tone).toBe('emerald');
  });

  it('mantiene presentation en out_of_scope sin importar los otros estados', () => {
    const states = composeForm210FilingStates({ obligation: OBLIGATION_REQUIRED });
    const presentation = states.stages.find((stage) => stage.id === 'presentation')!;
    expect(presentation.status).toBe('out_of_scope');
    expect(presentation.description).toMatch(/NexusTax no presenta/i);
  });
});
