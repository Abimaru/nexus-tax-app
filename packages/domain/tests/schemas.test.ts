import { describe, expect, it } from 'vitest';
import {
  CreateTaxCaseInputSchema,
  DocumentaryRequirementSchema,
  DOCUMENT_CATALOG,
  DocumentFactSchema,
  UploadedDocumentSchema,
  ExogenousReportStructureSchema,
  EmploymentIncomeGroupSchema,
  TaxYearSchema,
  AcceptedExogenousValueSchema,
  RequirementSourceDecisionSchema,
  DocumentExtractionSessionSchema,
  DocumentFactCandidateSchema,
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

  it('mantiene un catalogo documental completo y multiproposito', () => {
    expect(DOCUMENT_CATALOG).toHaveLength(16);
    const consolidated = DOCUMENT_CATALOG.find(
      (entry) => entry.kind === 'consolidated_tax_certificate',
    );
    expect(consolidated?.supportsMultipleProducts).toBe(true);
    expect(consolidated?.requirementCapabilities).toContain('debts');
  });

  it('distingue hechos manuales de extracciones automaticas', () => {
    const parsed = DocumentFactSchema.safeParse({
      id: 'fact:1',
      caseId: 'case:1',
      documentId: null,
      entityId: null,
      productId: null,
      originalConcept: 'Saldo sintetico',
      category: 'asset',
      nature: 'asset',
      treatment: 'add_to_assets',
      value: 100,
      currency: 'COP',
      cutoffDate: null,
      period: '2025',
      pageOrSection: '1',
      evidence: 'Registro de prueba',
      captureMethod: 'manual',
      confidence: 'high',
      reviewStatus: 'pending',
      requirementIds: [],
      author: 'Analista local',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      history: [],
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.captureMethod).toBe('manual');
  });

  it('el documento persistible no admite una contrasena', () => {
    expect('password' in UploadedDocumentSchema.shape).toBe(false);
  });

  it('limita el grupo laboral a tres instancias', () => {
    const instance = {
      id: 'employer:1',
      employerName: 'Empleador sintetico',
      taxIdMasked: '••••9001',
      workedPeriod: '2025',
      entityId: 'entity:1',
      form220DocumentId: null,
      complementaryDocumentIds: [],
      status: 'pending',
      coverage: 'not_evaluated',
      observations: '',
      source: 'detected',
      manualMatchConfirmed: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    const group = {
      id: 'employment-group:case:1',
      caseId: 'case:1',
      title: 'Ingresos laborales y empleadores',
      receivedEmploymentIncome: true,
      instances: [instance, { ...instance, id: 'employer:2' }, { ...instance, id: 'employer:3' }],
      additionalDetectedEmployers: [],
      coverage: 'pending',
      findings: [],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    expect(EmploymentIncomeGroupSchema.safeParse(group).success).toBe(true);
    expect(
      EmploymentIncomeGroupSchema.safeParse({
        ...group,
        instances: [...group.instances, { ...instance, id: 'employer:4' }],
      }).success,
    ).toBe(false);
  });

  it('valida una aceptación exógena provisional con historial', () => {
    const parsed = AcceptedExogenousValueSchema.safeParse({
      id: 'accepted:1',
      caseId: 'case:1',
      exogenousRecordId: 'record:1',
      requirementId: null,
      entityId: null,
      primarySource: 'exogenous_information',
      secondarySources: ['analyst_resolution'],
      captureMethod: 'analyst_resolution',
      confidence: 'medium',
      status: 'provisionally_accepted',
      reason: 'validated_by_holder',
      observation: 'Fixture sintético.',
      originalConcept: 'Premio sintético',
      originalValue: 100,
      provisionalValue: 100,
      category: 'occasional_gain',
      taxGroup: 'occasional_gain',
      source: { sheet: 'Premios', row: 2 },
      includedInMatrix: true,
      documentId: null,
      replacementDecisionId: null,
      occasionalGainRecognition: 'own_prize',
      beneficiaryAlias: null,
      ruleVersion: 'accepted-exogenous-v1',
      author: 'Analista local',
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-01T00:00:00.000Z',
      history: [],
    });
    expect(parsed.success).toBe(true);
  });

  it('distingue un requisito no emitido de no aplica', () => {
    expect(
      RequirementSourceDecisionSchema.safeParse({
        id: 'decision:1',
        caseId: 'case:1',
        requirementId: 'requirement:1',
        status: 'justified_unavailable',
        reason: 'La entidad no emite el soporte.',
        managedAt: '2026-08-01',
        channel: 'portal',
        observation: '',
        evidenceDocumentId: null,
        acceptedSourceId: null,
        author: 'Analista local',
        createdAt: '2026-08-01T00:00:00.000Z',
        updatedAt: '2026-08-01T00:00:00.000Z',
      }).success,
    ).toBe(true);
  });

  it('valida sesiones sin texto persistido y candidatos separados de hechos', () => {
    const timestamp = '2026-08-01T00:00:00.000Z';
    expect(
      DocumentExtractionSessionSchema.safeParse({
        id: 'extraction:1',
        caseId: 'case:1',
        documentId: 'document:1',
        runNumber: 1,
        status: 'ready_for_review',
        phase: 'review',
        completedPhases: ['reading', 'classifying', 'extracting'],
        pageCount: 1,
        readablePageCount: 1,
        candidateIds: ['candidate:1'],
        classification: null,
        adapterId: 'co.balance.generic',
        adapterVersion: '1.0.0',
        findings: [],
        textPersisted: false,
        errorCode: null,
        errorMessage: null,
        supersedesSessionId: null,
        obsoleteCandidateIds: [],
        startedAt: timestamp,
        finishedAt: timestamp,
        updatedAt: timestamp,
      }).success,
    ).toBe(true);
    expect(
      DocumentFactCandidateSchema.safeParse({
        id: 'candidate:1',
        caseId: 'case:1',
        documentId: 'document:1',
        extractionSessionId: 'extraction:1',
        page: 1,
        proposedEntityId: null,
        entityName: null,
        proposedProductId: null,
        productType: 'unidentified',
        productLabel: null,
        originalConcept: 'Saldo sintético',
        normalizedConcept: 'saldo sintetico',
        proposedCategory: 'asset',
        proposedNature: 'asset',
        proposedTreatment: 'add_to_assets',
        correctedCategory: null,
        correctedNature: null,
        correctedTreatment: null,
        extractedValue: 100,
        correctedValue: null,
        finalValue: null,
        currency: 'COP',
        period: null,
        cutoffDate: null,
        evidence: {
          page: 1,
          excerpt: 'Saldo: $100',
          detectedLabel: 'saldo',
          detectedValue: '$100',
          location: 'Página 1',
        },
        adapterId: 'generic',
        adapterVersion: '1',
        ruleId: 'saldo',
        confidence: { level: 'low', score: 40, reasons: [] },
        warnings: [],
        status: 'pending',
        possibleDuplicateIds: [],
        suggestedRequirementIds: [],
        suggestedExogenousMatches: [],
        selectedExogenousRecordId: null,
        observation: '',
        factId: null,
        decisions: [],
        createdAt: timestamp,
        updatedAt: timestamp,
      }).success,
    ).toBe(true);
  });
});
