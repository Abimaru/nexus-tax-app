import { describe, expect, it } from 'vitest';
import type { NormalizedExogenousRecord } from '@nexus-tax/domain';
import {
  DEFAULT_PDF_LIMITS,
  detectConceptRoleMarkers,
  detectSemanticContradiction,
  extractCandidates,
  suggestExogenousMatches,
} from '../src';
import { documentFromPages, representation } from './fixtures';

/**
 * Sprint 2.4, Fase F.2 — Safety & Critical Evidence Hardening.
 *
 * Cubre los 6 casos sintéticos obligatorios del prompt de Fase F.2 (§9):
 * `igualdad numérica ≠ equivalencia tributaria`. Ningún fixture usa texto,
 * NIT, nombres ni valores de documentos reales — son completamente
 * inventados para ilustrar el patrón estructural encontrado en el
 * benchmark (Fase F.1).
 */

const context = {
  caseId: 'case:synthetic',
  documentId: 'document:synthetic',
  sessionId: 'session:synthetic',
  timestamp: '2026-09-01T00:00:00.000Z',
  entityName: 'Entidad Sintética',
};

function record(
  overrides: Partial<NormalizedExogenousRecord> & { category: NormalizedExogenousRecord['category'] },
): NormalizedExogenousRecord {
  return {
    id: `record:${Math.random().toString(36).slice(2)}`,
    rawId: 'raw:1',
    source: { sheet: 'Datos', row: 1 },
    entityName: 'Entidad Sintética',
    entityTaxId: null,
    reportingEntityDocument: null,
    reportedPersonDocument: null,
    reportedPersonDocumentNormalized: null,
    identityMatch: 'unavailable',
    conceptCode: null,
    conceptLabel: 'Concepto sintético',
    reportedValue: 0,
    withholding: null,
    currency: 'COP',
    suggestedUse: null,
    classificationVersion: 'synthetic',
    nature: 'unclassified',
    treatment: 'do_not_aggregate',
    confidence: 'medium',
    classificationEvidence: [],
    secondaryUses: [],
    multiplicityType: 'single',
    multiplicityExplanation: null,
    consolidationDisposition: 'included',
    consolidationReason: 'synthetic',
    extra: {},
    ...overrides,
  } as NormalizedExogenousRecord;
}

describe('detectConceptRoleMarkers / detectSemanticContradiction — unidad (Fase F.2)', () => {
  it('detecta el marcador de retención sin importar el resto del texto', () => {
    expect(detectConceptRoleMarkers('Retención sobre rendimientos financieros')).toContain(
      'withholding',
    );
    expect(detectConceptRoleMarkers('Retención Rendimientos Financieros Ah Ordinario')).toContain(
      'withholding',
    );
  });

  it('no marca contradicción cuando no hay marcadores', () => {
    const result = detectSemanticContradiction({
      originalConcept: 'Rendimientos financieros',
      proposedCategory: 'financial_income',
    });
    expect(result.contradictory).toBe(false);
    expect(result.reason).toBeNull();
  });

  it('marca contradicción: ingreso cuyo texto describe una retención', () => {
    const result = detectSemanticContradiction({
      originalConcept: 'Retención sobre rendimientos financieros',
      proposedCategory: 'financial_income',
    });
    expect(result.contradictory).toBe(true);
    expect(result.marker).toBe('withholding');
    expect(result.reason).not.toMatch(/semantic|contradiction detected/i);
    expect(result.reason).toMatch(/retención/i);
  });

  it('marca contradicción: deducción (GMF) cuyo texto describe una base gravable', () => {
    const result = detectSemanticContradiction({
      originalConcept: 'Base gravable GMF',
      proposedCategory: 'deduction_candidate',
    });
    expect(result.contradictory).toBe(true);
    expect(result.marker).toBe('base');
  });

  it('marca contradicción: deducción (GMF) cuyo texto describe un saldo', () => {
    const result = detectSemanticContradiction({
      originalConcept: 'Saldo cuenta ahorros',
      proposedCategory: 'deduction_candidate',
    });
    expect(result.contradictory).toBe(true);
    expect(result.marker).toBe('balance');
  });

  it('no marca contradicción para un GMF sin marcadores (caso E: "Valor GMF")', () => {
    const result = detectSemanticContradiction({
      originalConcept: 'Valor GMF',
      proposedCategory: 'deduction_candidate',
    });
    expect(result.contradictory).toBe(false);
  });

  it('marca contradicción cruzada: candidato de retención comparado contra un registro de ingresos', () => {
    const result = detectSemanticContradiction({
      originalConcept: 'Retención sobre rendimientos financieros',
      proposedCategory: 'withholding',
      referenceCategories: ['financial_income'],
    });
    expect(result.contradictory).toBe(true);
  });

  it('no marca contradicción cuando la retención se compara contra un registro de retención', () => {
    const result = detectSemanticContradiction({
      originalConcept: 'Retención sobre rendimientos financieros',
      proposedCategory: 'withholding',
      referenceCategories: ['withholding'],
    });
    expect(result.contradictory).toBe(false);
  });
});

describe('Regresión (revisión puntual): "saldo" no contradice housing_interest cuando domina una señal más específica', () => {
  it('NO marca contradicción cuando "saldo" y "intereses pagados" conviven en el mismo concepto/fila', () => {
    // Escenario real plausible: una fila reconstruida de una tabla o un
    // concepto compuesto menciona el saldo de la obligación en el mismo
    // renglón que los intereses pagados. La frase específica de
    // intereses (la misma que activa la regla `housing-interest` en
    // `adapters.ts`) debe dominar sobre la palabra genérica "saldo".
    const result = detectSemanticContradiction({
      originalConcept: 'Saldo obligación e intereses pagados durante el año',
      proposedCategory: 'housing_interest',
    });
    expect(result.contradictory).toBe(false);
  });

  it('SÍ sigue marcando contradicción cuando "saldo" aparece SIN ninguna señal específica de intereses', () => {
    // El override es narrow: no desactiva la protección por completo,
    // solo cuando la señal fuerte y específica también está presente.
    const result = detectSemanticContradiction({
      originalConcept: 'Saldo de la obligación a diciembre',
      proposedCategory: 'housing_interest',
    });
    expect(result.contradictory).toBe(true);
    expect(result.marker).toBe('balance');
  });

  it('extremo a extremo: un candidato real de "housing-interest" con "saldo" en el mismo concepto no se degrada', () => {
    const candidate = extractCandidates(
      representation('Saldo obligación e intereses pagados durante el año: $ 450.000'),
      'housing_interest_certificate',
      context,
      DEFAULT_PDF_LIMITS,
    ).candidates.find((c) => c.ruleId === 'housing-interest');
    expect(candidate).toBeDefined();
    expect(candidate!.proposedCategory).toBe('housing_interest');
    const contradiction = detectSemanticContradiction({
      originalConcept: candidate!.originalConcept,
      normalizedConcept: candidate!.normalizedConcept,
      proposedCategory: candidate!.proposedCategory,
    });
    expect(contradiction.contradictory).toBe(false);
  });
});

describe('Regresión (revisión puntual): retención domina ingreso solo en su ventana LOCAL, no en toda la línea', () => {
  it('texto plano: una línea con AMBOS conceptos separa correctamente ingreso y retención sin bloquear el ingreso', () => {
    const result = extractCandidates(
      representation('Rendimientos financieros 1.500.000 Retención 60.000'),
      'income_withholding_certificate',
      context,
      DEFAULT_PDF_LIMITS,
    );
    expect(result.candidates).toHaveLength(2);
    const income = result.candidates.find((c) => c.proposedCategory === 'financial_income');
    const withholding = result.candidates.find((c) => c.proposedCategory === 'withholding');
    expect(income).toBeDefined();
    expect(income!.extractedValue).toBe(1_500_000);
    expect(income!.ruleId).toBe('interest');
    expect(withholding).toBeDefined();
    expect(withholding!.extractedValue).toBe(60_000);
    expect(withholding!.ruleId).toBe('withholding');
    // Ningún valor debe quedar duplicado bajo la categoría equivocada.
    expect(result.candidates.filter((c) => c.extractedValue === 1_500_000)).toHaveLength(1);
    expect(result.candidates.filter((c) => c.extractedValue === 60_000)).toHaveLength(1);
  });

  it('layout posicionado en dos columnas produce exactamente lo mismo', () => {
    const document = documentFromPages([
      {
        pageNumber: 1,
        normalizedText: '',
        errors: [],
        readConfidence: 'high',
        blocks: [
          { text: 'Rendimientos financieros', x: 60, y: 700 },
          { text: '1.500.000', x: 220, y: 700 },
          { text: 'Retención', x: 340, y: 700 },
          { text: '60.000', x: 500, y: 700 },
        ],
      },
    ]);
    const result = extractCandidates(
      document,
      'income_withholding_certificate',
      context,
      DEFAULT_PDF_LIMITS,
    );
    expect(result.candidates).toHaveLength(2);
    const income = result.candidates.find((c) => c.proposedCategory === 'financial_income');
    const withholding = result.candidates.find((c) => c.proposedCategory === 'withholding');
    expect(income?.extractedValue).toBe(1_500_000);
    expect(withholding?.extractedValue).toBe(60_000);
    expect(result.candidates.filter((c) => c.extractedValue === 1_500_000)).toHaveLength(1);
    expect(result.candidates.filter((c) => c.extractedValue === 60_000)).toHaveLength(1);
  });
});

describe('Fixtures sintéticos obligatorios A-F (prompt de Fase F.2, §9)', () => {
  it('A. ingreso legítimo → exact_match permitido', () => {
    const candidate = extractCandidates(
      representation('Rendimientos financieros $ 1.234.567'),
      'income_withholding_certificate',
      context,
      DEFAULT_PDF_LIMITS,
    ).candidates[0]!;
    expect(candidate.proposedCategory).toBe('financial_income');
    const [match] = suggestExogenousMatches(candidate, [
      record({ category: 'financial_income', reportedValue: 1_234_567 }),
    ]);
    expect(match?.status).toBe('exact_match');
  });

  it('B. retención mal comparada como ingreso → NO exact/bulk confirm', () => {
    const result = extractCandidates(
      representation('Retención sobre rendimientos financieros $ 1.234.567'),
      'income_withholding_certificate',
      context,
      DEFAULT_PDF_LIMITS,
    );
    // Sprint 2.4, Fase F.2 (§3/§4): la retención domina sobre el ingreso en
    // la misma línea — no debe aparecer también un candidato `interest`.
    expect(result.candidates).toHaveLength(1);
    const candidate = result.candidates[0]!;
    expect(candidate.proposedCategory).toBe('withholding');
    const [match] = suggestExogenousMatches(candidate, [
      record({ category: 'financial_income', reportedValue: 1_234_567 }),
    ]);
    expect(match?.status).not.toBe('exact_match');
    expect(match?.status).not.toBe('rounding_match');
    expect(match?.anomalyCodes).toContain('semantic_concept_contradiction');
    expect(match?.reasons.join(' ')).not.toMatch(/semantic|score/i);
  });

  it('C. retención comparada correctamente contra retención → exact_match permitido', () => {
    const candidate = extractCandidates(
      representation('Retención sobre rendimientos financieros $ 123.456'),
      'income_withholding_certificate',
      context,
      DEFAULT_PDF_LIMITS,
    ).candidates[0]!;
    expect(candidate.proposedCategory).toBe('withholding');
    const [match] = suggestExogenousMatches(candidate, [
      record({ category: 'withholding', reportedValue: 123_456 }),
    ]);
    expect(match?.status).toBe('exact_match');
  });

  it('D. base gravable GMF → NO bulk confirm aunque el valor coincida', () => {
    const candidate = extractCandidates(
      representation('Base gravable GMF $ 50.000.000'),
      'income_withholding_certificate',
      context,
      DEFAULT_PDF_LIMITS,
    ).candidates[0]!;
    expect(candidate.proposedCategory).toBe('deduction_candidate');
    const [match] = suggestExogenousMatches(candidate, [
      record({ category: 'deduction_candidate', reportedValue: 50_000_000 }),
    ]);
    expect(match?.status).not.toBe('exact_match');
    expect(match?.status).not.toBe('rounding_match');
    expect(match?.anomalyCodes).toContain('semantic_concept_contradiction');
  });

  it('E. valor GMF explícito → coincidencia permitida', () => {
    const candidate = extractCandidates(
      representation('Valor GMF $ 200.000'),
      'income_withholding_certificate',
      context,
      DEFAULT_PDF_LIMITS,
    ).candidates[0]!;
    expect(candidate.proposedCategory).toBe('deduction_candidate');
    const [match] = suggestExogenousMatches(candidate, [
      record({ category: 'deduction_candidate', reportedValue: 200_000 }),
    ]);
    expect(match?.status).toBe('exact_match');
    expect(match?.anomalyCodes ?? []).not.toContain('semantic_concept_contradiction');
  });

  it('F. saldo de cuenta mal categorizado como deducción → NO bulk confirm (regresión real, Fase F.1 P2-02)', () => {
    // Reproduce directamente el candidato mal categorizado (el bug real de
    // extracción posicional está fuera de alcance de F.2, §11 del prompt);
    // esta prueba demuestra que el GATE bloquea el resultado aunque la
    // categorización ya esté equivocada — defensa en profundidad.
    const candidate = extractCandidates(
      representation('Valor GMF $ 10.000.000'),
      'income_withholding_certificate',
      context,
      DEFAULT_PDF_LIMITS,
    ).candidates[0]!;
    const misclassified = { ...candidate, originalConcept: 'Saldo cuenta ahorros' };
    const [match] = suggestExogenousMatches(misclassified, [
      record({ category: 'deduction_candidate', reportedValue: 10_000_000 }),
    ]);
    expect(match?.status).not.toBe('exact_match');
    expect(match?.status).not.toBe('rounding_match');
    expect(match?.anomalyCodes).toContain('semantic_concept_contradiction');
  });
});

describe('False confident matches = 0 (métrica de éxito de Fase F.2, §10/§24)', () => {
  it('ningún fixture del corpus sintético de regresión produce un exact_match/rounding_match con contradicción semántica sin degradar', () => {
    const cases: Array<{ line: string; recordCategory: NormalizedExogenousRecord['category']; value: number }> = [
      { line: 'Rendimientos financieros $ 1.234.567', recordCategory: 'financial_income', value: 1_234_567 },
      { line: 'Retención sobre rendimientos financieros $ 1.234.567', recordCategory: 'financial_income', value: 1_234_567 },
      { line: 'Retención sobre rendimientos financieros $ 123.456', recordCategory: 'withholding', value: 123_456 },
      { line: 'Base gravable GMF $ 50.000.000', recordCategory: 'deduction_candidate', value: 50_000_000 },
      { line: 'Valor GMF $ 200.000', recordCategory: 'deduction_candidate', value: 200_000 },
    ];
    let falseConfidentCount = 0;
    for (const testCase of cases) {
      const candidate = extractCandidates(
        representation(testCase.line),
        'income_withholding_certificate',
        context,
        DEFAULT_PDF_LIMITS,
      ).candidates[0];
      if (!candidate) continue;
      const [match] = suggestExogenousMatches(candidate, [
        record({ category: testCase.recordCategory, reportedValue: testCase.value }),
      ]);
      if (!match) continue;
      const isConfident = match.status === 'exact_match' || match.status === 'rounding_match';
      const hasContradiction = (match.anomalyCodes ?? []).includes(
        'semantic_concept_contradiction',
      );
      // Un "false confident match" es, por definición, un estado confiado
      // (exact/rounding) que además carga una contradicción semántica sin
      // degradar — el gate garantiza que esto nunca coexista.
      if (isConfident && hasContradiction) falseConfidentCount += 1;
    }
    expect(falseConfidentCount).toBe(0);
  });
});
