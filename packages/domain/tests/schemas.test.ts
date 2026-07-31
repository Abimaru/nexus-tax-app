import { describe, expect, it } from 'vitest';
import {
  CreateTaxCaseInputSchema,
  DocumentaryRequirementSchema,
  ExogenousReportStructureSchema,
  TaxYearSchema,
} from '../src/index';

describe('esquemas de dominio', () => {
  it('valida el año gravable dentro del rango', () => {
    expect(TaxYearSchema.safeParse(2024).success).toBe(true);
    expect(TaxYearSchema.safeParse(1999).success).toBe(false);
  });

  it('rechaza alias demasiado corto', () => {
    expect(CreateTaxCaseInputSchema.safeParse({ alias: 'a', taxYear: 2024 }).success).toBe(false);
    expect(CreateTaxCaseInputSchema.safeParse({ alias: 'Personal', taxYear: 2024 }).success).toBe(
      true,
    );
  });

  it('un requisito documental nunca es legalmente obligatorio', () => {
    const parsed = DocumentaryRequirementSchema.safeParse({
      id: 'r1',
      entityName: 'Banco',
      entityCategory: 'bank',
      documentName: 'Certificado',
      documentCategory: 'Financiero',
      reason: 'x',
      status: 'pending',
      recommendationSource: 'rule.bank.v1',
      confidence: 'high',
      isLegallyRequired: true, // debe fallar: solo se admite false
    });
    expect(parsed.success).toBe(false);
  });

  it('valida el orden 1-based de las secciones de exógena', () => {
    expect(
      ExogenousReportStructureSchema.safeParse({
        headerRow: 14,
        thresholdsStartRow: 15,
        thresholdsEndRow: 19,
        detailsStartRow: 20,
      }).success,
    ).toBe(true);
    expect(
      ExogenousReportStructureSchema.safeParse({
        headerRow: 14,
        thresholdsStartRow: 15,
        thresholdsEndRow: 20,
        detailsStartRow: 20,
      }).success,
    ).toBe(false);
  });
});
