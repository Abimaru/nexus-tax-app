import { describe, expect, it } from 'vitest';
import {
  PriorYearBoxValueSchema,
  PriorYearCarryForwardCandidateSchema,
  PriorYearTaxReturnSchema,
} from '../src/index';

function priorYearBox(overrides: Partial<Parameters<typeof PriorYearBoxValueSchema.parse>[0]> = {}) {
  return {
    boxNumber: 133,
    rawValue: '79.000',
    normalizedValueCop: 79_000,
    extractionMethod: 'native_text' as const,
    confidence: 'high' as const,
    role: 'carry_forward_candidate' as const,
    page: 2,
    evidence: '133 Anticipo renta por el año gravable siguiente 79.000',
    ...overrides,
  };
}

describe('esquemas de declaraciones anteriores (Sprint 2.4, Fase B)', () => {
  it('valida una casilla histórica con rol de arrastre', () => {
    expect(PriorYearBoxValueSchema.parse(priorYearBox())).toMatchObject({
      boxNumber: 133,
      role: 'carry_forward_candidate',
    });
  });

  it('valida una declaración anterior completa con casillas indexadas por número', () => {
    const priorReturn = {
      id: 'prior-return:1',
      caseId: 'case:1',
      taxYear: 2024,
      filingYear: 2025,
      formType: '210' as const,
      formNumber: '1102345678901',
      previousFormNumber: null,
      taxpayerIdentityMasked: '***.***.789-0',
      submittedAt: '2025-05-10T00:00:00.000Z',
      sourceDocumentId: 'doc:prior-2024',
      status: 'submitted' as const,
      identityMatch: 'match' as const,
      replaces: null,
      replacedBy: null,
      isCurrentVersion: true,
      boxes: {
        '29': priorYearBox({ boxNumber: 29, normalizedValueCop: 148_984_000, role: 'historical_reference' }),
        '133': priorYearBox({ boxNumber: 133, normalizedValueCop: 79_000 }),
        '137': priorYearBox({ boxNumber: 137, normalizedValueCop: 0 }),
      },
      extractionConfidence: 'high' as const,
      parserVersion: 'form210-prior-year-1.0.0',
      createdAt: '2026-09-05T00:00:00.000Z',
      updatedAt: '2026-09-05T00:00:00.000Z',
    };
    const parsed = PriorYearTaxReturnSchema.parse(priorReturn);
    expect(parsed.boxes['133']?.normalizedValueCop).toBe(79_000);
    expect(parsed.identityMatch).toBe('match');
  });

  it('rechaza una declaración con identidad no coincidente sin bloquear el registro histórico', () => {
    // El schema NO impide `mismatch`: la restricción de negocio (no usar como
    // arrastre) vive en `derivePriorYearCarryForwardCandidates`, no aquí. El
    // registro histórico se conserva siempre para trazabilidad.
    const priorReturn = {
      id: 'prior-return:2',
      caseId: 'case:1',
      taxYear: 2024,
      filingYear: 2025,
      formType: '210' as const,
      formNumber: null,
      previousFormNumber: null,
      taxpayerIdentityMasked: '***.***.999-9',
      submittedAt: null,
      sourceDocumentId: 'doc:prior-2024-other',
      status: 'unknown' as const,
      identityMatch: 'mismatch' as const,
      replaces: null,
      replacedBy: null,
      isCurrentVersion: true,
      boxes: {},
      extractionConfidence: 'low' as const,
      parserVersion: 'form210-prior-year-1.0.0',
      createdAt: '2026-09-05T00:00:00.000Z',
      updatedAt: '2026-09-05T00:00:00.000Z',
    };
    expect(() => PriorYearTaxReturnSchema.parse(priorReturn)).not.toThrow();
  });

  it('conserva pendiente un candidato de arrastre de saldo a favor hasta la confirmación humana', () => {
    const candidate = {
      id: 'carry:137-131',
      caseId: 'case:1',
      priorYearReturnId: 'prior-return:1',
      priorYearTaxYear: 2024,
      sourceBoxNumber: 137,
      targetBoxNumber: 131,
      sourceValueCop: 1_344_000,
      refundOrCompensationRequested: 'unknown' as const,
      decision: 'pending' as const,
      finalValueCop: null,
      evidence: '137 Saldo a favor 1.344.000 — declaración AG2024',
      decidedAt: null,
      createdAt: '2026-09-05T00:00:00.000Z',
      updatedAt: '2026-09-05T00:00:00.000Z',
    };
    const parsed = PriorYearCarryForwardCandidateSchema.parse(candidate);
    expect(parsed.decision).toBe('pending');
    expect(parsed.finalValueCop).toBeNull();
  });
});
