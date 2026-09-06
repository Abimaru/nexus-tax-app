import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PDF_LIMITS,
  classifyDocument,
  extractCandidates,
} from '../src';
import { documentFromPages, representation } from './fixtures';

/**
 * Sprint 2.4, Fase F.2 — auditoría y hardening de certificados de
 * vivienda (§11-§14 del prompt). Todos los fixtures son sintéticos:
 * ningún texto proviene de un documento real (§11: "usar únicamente
 * patrones estructurales derivados del benchmark").
 */

const context = {
  caseId: 'case:synthetic',
  documentId: 'document:synthetic',
  sessionId: 'session:synthetic',
  timestamp: '2026-09-01T00:00:00.000Z',
};

describe('classifyDocument — vivienda (§12/§16 del prompt de Fase F.2)', () => {
  it('reconoce vocabulario no bancario ("préstamo de vivienda") sin exigir "crédito hipotecario"', () => {
    const classification = classifyDocument(representation('Certificado de préstamo de vivienda'));
    expect(classification.proposedKind).toBe('housing_interest_certificate');
  });

  it('una única señal aislada no basta para confianza alta (§16)', () => {
    const classification = classifyDocument(representation('Certificado de préstamo de vivienda'));
    expect(classification.confidence).not.toBe('high');
  });

  it('la combinación de varias señales sube la confianza (§16)', () => {
    const classification = classifyDocument(
      representation(
        'Certificado de préstamo de vivienda',
        'Intereses pagados durante el período: $ 450.000',
        'Saldo de la obligación a diciembre: $ 5.000.000',
      ),
    );
    expect(classification.proposedKind).toBe('housing_interest_certificate');
    expect(['medium', 'high']).toContain(classification.confidence);
  });

  it('reconoce financiación de vivienda de una entidad no bancaria', () => {
    const classification = classifyDocument(
      representation('Certificado de financiación de vivienda de la cooperativa'),
    );
    expect(classification.proposedKind).toBe('housing_interest_certificate');
  });
});

describe('co.housing-interest.generic — variantes de layout (§13/§14 del prompt de Fase F.2)', () => {
  it('A. label-value simple: extrae intereses sin confundir con saldo', () => {
    const result = extractCandidates(
      representation('Intereses pagados durante el período: $ 450.000'),
      'housing_interest_certificate',
      context,
      DEFAULT_PDF_LIMITS,
    );
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]!.ruleId).toBe('housing-interest');
    expect(result.candidates[0]!.proposedCategory).toBe('housing_interest');
  });

  it('B/C. label y valor separados espacialmente (misma fila, distinta columna x)', () => {
    const document = documentFromPages([
      {
        pageNumber: 1,
        normalizedText: '',
        errors: [],
        readConfidence: 'high',
        blocks: [
          { text: 'Intereses causados', x: 60, y: 700 },
          { text: '$ 320.000', x: 320, y: 700 },
        ],
      },
    ]);
    const result = extractCandidates(
      document,
      'housing_interest_certificate',
      context,
      DEFAULT_PDF_LIMITS,
    );
    const interestCandidate = result.candidates.find((c) => c.ruleId === 'housing-interest');
    expect(interestCandidate).toBeDefined();
    expect(interestCandidate?.proposedCategory).toBe('housing_interest');
  });

  it('D. multipágina: saldo en una página, intereses en otra — nunca se confunden ni se infiere uno del otro', () => {
    const document = documentFromPages([
      {
        pageNumber: 1,
        normalizedText: 'Saldo de la obligación a diciembre: $ 5.000.000',
        errors: [],
        readConfidence: 'high',
        blocks: [{ text: 'Saldo de la obligación a diciembre: $ 5.000.000' }],
      },
      {
        pageNumber: 2,
        normalizedText: 'Intereses pagados durante el período: $ 450.000',
        errors: [],
        readConfidence: 'high',
        blocks: [{ text: 'Intereses pagados durante el período: $ 450.000' }],
      },
    ]);
    const result = extractCandidates(
      document,
      'housing_interest_certificate',
      context,
      DEFAULT_PDF_LIMITS,
    );
    const balanceCandidate = result.candidates.find((c) => c.ruleId === 'loan-balance');
    const interestCandidate = result.candidates.find((c) => c.ruleId === 'housing-interest');
    expect(balanceCandidate?.page).toBe(1);
    expect(interestCandidate?.page).toBe(2);
    // §13: nunca se infiere el valor de intereses a partir del saldo ni se
    // calcula por diferencia — deben ser candidatos independientes con
    // valores explícitos y distintos.
    expect(interestCandidate?.extractedValue).not.toBe(balanceCandidate?.extractedValue);
    expect(balanceCandidate?.proposedCategory).toBe('liability');
    expect(interestCandidate?.proposedCategory).toBe('housing_interest');
  });

  it('distingue intereses de la corrección monetaria (nunca los mezcla bajo la misma regla)', () => {
    const result = extractCandidates(
      representation(
        'Intereses pagados durante el período: $ 450.000',
        'Corrección monetaria: $ 12.000',
      ),
      'housing_interest_certificate',
      context,
      DEFAULT_PDF_LIMITS,
    );
    const interestCandidate = result.candidates.find((c) => c.ruleId === 'housing-interest');
    const correctionCandidate = result.candidates.find((c) => c.ruleId === 'monetary-correction');
    expect(interestCandidate).toBeDefined();
    expect(correctionCandidate).toBeDefined();
    expect(interestCandidate?.proposedCategory).toBe('housing_interest');
    expect(correctionCandidate?.proposedCategory).toBe('deduction_candidate');
  });
});
