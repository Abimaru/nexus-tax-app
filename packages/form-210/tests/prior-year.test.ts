import { describe, expect, it } from 'vitest';
import type { PriorYearBoxValue, PriorYearTaxReturn } from '@nexus-tax/domain';
import {
  compareTaxEvolution,
  derivePriorYearCarryForwardCandidates,
  detectHistoricalScaleAnomalies,
  resolveRefundCarryForwardAnswer,
} from '../src/prior-year';

function box(overrides: Partial<PriorYearBoxValue> & { boxNumber: number }): PriorYearBoxValue {
  return {
    rawValue: null,
    normalizedValueCop: null,
    extractionMethod: 'native_text',
    confidence: 'high',
    role: 'historical_reference',
    page: 1,
    evidence: null,
    ...overrides,
  };
}

function priorReturn(overrides: Partial<PriorYearTaxReturn> = {}): PriorYearTaxReturn {
  return {
    id: 'prior-return:1',
    caseId: 'case-1',
    taxYear: 2024,
    filingYear: 2025,
    formType: '210',
    formNumber: '1102345678901',
    previousFormNumber: null,
    taxpayerIdentityMasked: '••••4567',
    submittedAt: '2025-05-10T00:00:00.000Z',
    sourceDocumentId: 'doc-1',
    status: 'submitted',
    identityMatch: 'match',
    replaces: null,
    replacedBy: null,
    isCurrentVersion: true,
    boxes: {
      '133': box({
        boxNumber: 133,
        normalizedValueCop: 79_000,
        role: 'carry_forward_candidate',
        evidence: '133 Anticipo 79.000',
      }),
      '137': box({
        boxNumber: 137,
        normalizedValueCop: 1_344_000,
        role: 'carry_forward_candidate',
        evidence: '137 Saldo a favor 1.344.000',
      }),
      '29': box({ boxNumber: 29, normalizedValueCop: 148_984_000 }),
    },
    extractionConfidence: 'high',
    parserVersion: 'form210-prior-year-1.0.0',
    createdAt: '2026-09-05T00:00:00.000Z',
    updatedAt: '2026-09-05T00:00:00.000Z',
    ...overrides,
  };
}

describe('derivePriorYearCarryForwardCandidates (Sprint 2.4, Fase B)', () => {
  it('genera candidatos de anticipo (133→130) y saldo a favor (137→131) pendientes de confirmación', () => {
    const candidates = derivePriorYearCarryForwardCandidates(priorReturn());
    expect(candidates).toHaveLength(2);
    const advance = candidates.find((item) => item.targetBoxNumber === 130)!;
    expect(advance.sourceBoxNumber).toBe(133);
    expect(advance.sourceValueCop).toBe(79_000);
    expect(advance.decision).toBe('pending');
    expect(advance.refundOrCompensationRequested).toBeNull();

    const refund = candidates.find((item) => item.targetBoxNumber === 131)!;
    expect(refund.sourceBoxNumber).toBe(137);
    expect(refund.sourceValueCop).toBe(1_344_000);
    expect(refund.decision).toBe('pending');
    expect(refund.refundOrCompensationRequested).toBe('unknown');
  });

  it('no genera candidatos cuando la identidad no coincide con el expediente (hallazgo bloqueante)', () => {
    const candidates = derivePriorYearCarryForwardCandidates(
      priorReturn({ identityMatch: 'mismatch' }),
    );
    expect(candidates).toHaveLength(0);
  });

  it('no duplica un candidato ya existente', () => {
    const first = derivePriorYearCarryForwardCandidates(priorReturn());
    const existingIds = new Set(first.map((candidate) => candidate.id));
    const second = derivePriorYearCarryForwardCandidates(priorReturn(), {
      existingCandidateIds: existingIds,
    });
    expect(second).toHaveLength(0);
  });

  it('no genera candidato de anticipo cuando la casilla 133 no tiene rol de arrastre', () => {
    const returnWithoutRole = priorReturn({
      boxes: {
        '133': box({ boxNumber: 133, normalizedValueCop: 79_000, role: 'historical_reference' }),
      },
    });
    expect(derivePriorYearCarryForwardCandidates(returnWithoutRole)).toHaveLength(0);
  });
});

describe('resolveRefundCarryForwardAnswer (art. 850 ET)', () => {
  it('rechaza el arrastre cuando el saldo ya fue solicitado en devolución/compensación', () => {
    const [candidate] = derivePriorYearCarryForwardCandidates(priorReturn()).filter(
      (item) => item.targetBoxNumber === 131,
    );
    const resolved = resolveRefundCarryForwardAnswer(candidate!, 'yes');
    expect(resolved.decision).toBe('rejected');
    expect(resolved.finalValueCop).toBeNull();
  });

  it('habilita el arrastre como candidato cuando no fue solicitado', () => {
    const [candidate] = derivePriorYearCarryForwardCandidates(priorReturn()).filter(
      (item) => item.targetBoxNumber === 131,
    );
    const resolved = resolveRefundCarryForwardAnswer(candidate!, 'no');
    expect(resolved.decision).toBe('pending');
    expect(resolved.refundOrCompensationRequested).toBe('no');
  });

  it('deja pendiente de revisión cuando el analista no sabe', () => {
    const [candidate] = derivePriorYearCarryForwardCandidates(priorReturn()).filter(
      (item) => item.targetBoxNumber === 131,
    );
    const resolved = resolveRefundCarryForwardAnswer(candidate!, 'unknown');
    expect(resolved.decision).toBe('pending');
    expect(resolved.refundOrCompensationRequested).toBe('unknown');
  });
});

describe('compareTaxEvolution (Sprint 2.4, Fase B)', () => {
  it('clasifica una variación relevante sin llamarla error', () => {
    const metrics = compareTaxEvolution(priorReturn(), { 29: 300_000_000 });
    const patrimony = metrics.find((metric) => metric.key === 'grossPatrimony')!;
    expect(patrimony.priorValueCop).toBe(148_984_000);
    expect(patrimony.currentValueCop).toBe(300_000_000);
    expect(patrimony.status).toBe('relevant_variation');
  });

  it('marca estable una diferencia menor al 2 %', () => {
    const metrics = compareTaxEvolution(priorReturn(), { 29: 149_500_000 });
    expect(metrics.find((metric) => metric.key === 'grossPatrimony')!.status).toBe('stable');
  });

  it('marca incompleto cuando falta el valor actual o el anterior', () => {
    const metrics = compareTaxEvolution(priorReturn(), {});
    expect(metrics.find((metric) => metric.key === 'grossPatrimony')!.status).toBe('incomplete');
  });

  it('marca no_comparable cuando no hay declaración anterior', () => {
    const metrics = compareTaxEvolution(null, { 29: 100_000_000 });
    expect(metrics.every((metric) => metric.status === 'not_comparable')).toBe(true);
  });
});

describe('detectHistoricalScaleAnomalies (reutiliza Sprint 2.3.2)', () => {
  it('detecta un salto de escala ×10 entre años', () => {
    const metrics = compareTaxEvolution(priorReturn(), { 29: 1_489_840_000 });
    const anomalies = detectHistoricalScaleAnomalies(metrics);
    expect(anomalies.some((item) => item.label === 'Patrimonio bruto')).toBe(true);
    expect(
      anomalies.find((item) => item.label === 'Patrimonio bruto')!.anomalies[0]!
        .possibleScaleFactor,
    ).toBe(10);
  });

  it('no genera anomalías para una variación normal', () => {
    const metrics = compareTaxEvolution(priorReturn(), { 29: 160_000_000 });
    expect(detectHistoricalScaleAnomalies(metrics)).toHaveLength(0);
  });
});
