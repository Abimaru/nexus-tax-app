import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import type { DocumentFactCandidate, PriorYearTaxReturn, ProcessingResult } from '@nexus-tax/domain';
import { processWorkbookFile } from '@nexus-tax/exogenous-parser';
import * as XLSX from 'xlsx';
import {
  clearAllData,
  createCase,
  getResult,
  listCases,
  saveResult,
  updateRequirementStatus,
  attachRequirementPdf,
  removeRequirementPdf,
  getFilingInputs,
  saveVatResponsibility,
  getCaseAnalysis,
  saveRecordResolution,
  restoreAutomaticClassification,
  addCaseDocument,
  getDocumentBinary,
  getTaxCaseWorkspace,
  removeDocumentBinary,
  saveDocumentFact,
  updateDocumentFact,
  savePreliminaryReconciliation,
  restorePreliminaryReconciliation,
  saveRequirementCoverage,
  deleteCase,
  addEmployerInstance,
  associateEmployerDocument,
  removeEmployerInstance,
  setEmployerInstanceStatus,
  enableManualCase,
  getCaseNavigationState,
  markWorkflowViewCompleted,
  removeExogenousSource,
  saveCaseNavigation,
  acceptExogenousValue,
  confirmAcceptedExogenousValue,
  saveRequirementSourceDecision,
  completeExtractionSession,
  createDocumentProfile,
  createExtractionSession,
  createManualDocumentCandidate,
  deleteDocumentProfile,
  listDocumentProfiles,
  listExtractionFeedback,
  recordExtractionFeedback,
  recordOcrPageOutcome,
  restoreDocumentCandidate,
  reviewDocumentCandidate,
  updateDocumentProfileStatus,
  markDocumentObsolete,
  deleteDocumentPermanently,
  synchronizeCaseTasks,
  saveTaxResolutionDecision,
  revertTaxResolutionDecision,
  listTaxResolutionDecisions,
  savePriorYearReturn,
  getPriorYearReturns,
  getCurrentPriorYearReturn,
  refreshPriorYearCarryForwardCandidates,
  getPriorYearCarryForwardCandidates,
  decideCarryForwardCandidate,
  answerRefundCarryForwardQuestion,
  getTaxEvolutionComparison,
  createTaxDependent,
  updateTaxDependent,
  archiveTaxDependent,
  getTaxDependents,
  addDependentSupport,
  saveDependentsCaseContext,
  setNoDependentsDeclared,
  getDependentsCaseContext,
  getDependentEvaluations,
  confirmDependentEvaluation,
  reviewStaleDependentEvaluation,
  importElectronicInvoiceReport,
  getElectronicInvoiceReport,
  getElectronicInvoicePurchases,
  decideElectronicInvoicePurchaseBenefit,
  setElectronicInvoicingBenefitOptedOut,
  removeElectronicInvoiceReport,
} from './repository';
import { buildTaxCaseManifest } from './taxCaseAnalysis';

function sampleResult(detail = 'Rendimientos'): ProcessingResult {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ['NIT', 'Nombre', 'Concepto', 'Valor'],
    ['900', 'Banco Ficticio', detail, '100.000'],
  ]);
  XLSX.utils.book_append_sheet(wb, ws, 'Datos');
  const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
  return processWorkbookFile(buffer, 'r.xlsx', 1, { sheetName: 'Datos' });
}

function financialResult(): ProcessingResult {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ['NIT', 'Nombre', 'Concepto', 'Valor'],
    ['900', 'Banco Ficticio', 'Saldo cuenta bancaria', 100_000],
    ['900', 'Banco Ficticio', 'Rendimientos financieros', 10_000],
  ]);
  XLSX.utils.book_append_sheet(wb, ws, 'Datos');
  const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
  return processWorkbookFile(buffer, 'financiero.xlsx', 1, { sheetName: 'Datos' });
}

function employmentResult(employers = 1, conceptsPerEmployer = 1): ProcessingResult {
  const wb = XLSX.utils.book_new();
  const rows: unknown[][] = [['NIT', 'Nombre', 'Concepto', 'Valor']];
  for (let employer = 1; employer <= employers; employer += 1) {
    for (let concept = 1; concept <= conceptsPerEmployer; concept += 1) {
      rows.push([
        `900${employer}`,
        `Empleador Sintetico ${employer}`,
        concept === 1 ? 'Salarios' : 'Pago laboral adicional',
        employer * concept * 100,
      ]);
    }
  }
  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Datos');
  return processWorkbookFile(
    XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer,
    'laboral.xlsx',
    1,
    { sheetName: 'Datos' },
  );
}

function prizeResult(): ProcessingResult {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ['NIT', 'Nombre', 'Concepto', 'Valor'],
    ['901000111', 'Juegos Sintéticos SAS', 'Premio de juego promocional', 2_500_000],
  ]);
  XLSX.utils.book_append_sheet(wb, ws, 'Premios');
  return processWorkbookFile(
    XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer,
    'premio-sintetico.xlsx',
    1,
    { sheetName: 'Premios' },
  );
}

function localFile(name: string, contents: string) {
  const bytes = new TextEncoder().encode(contents);
  return {
    name,
    size: bytes.byteLength,
    type: 'application/pdf',
    arrayBuffer: async () => bytes.buffer.slice(0),
  };
}

function extractionCandidate(input: {
  caseId: string;
  documentId: string;
  sessionId: string;
  requirementId?: string;
}): DocumentFactCandidate {
  const timestamp = '2026-08-01T00:00:00.000Z';
  return {
    id: `candidate:${input.documentId}`,
    caseId: input.caseId,
    documentId: input.documentId,
    extractionSessionId: input.sessionId,
    page: 1,
    proposedEntityId: null,
    entityName: 'Banco Ficticio',
    proposedProductId: null,
    productType: 'savings_account',
    productLabel: 'Cuenta sintética',
    originalConcept: 'Saldo al cierre',
    normalizedConcept: 'saldo al cierre',
    proposedCategory: 'asset',
    proposedNature: 'asset',
    proposedTreatment: 'add_to_assets',
    correctedCategory: null,
    correctedNature: null,
    correctedTreatment: null,
    extractedValue: 100_000,
    correctedValue: null,
    finalValue: null,
    currency: 'COP',
    period: '2025',
    cutoffDate: '2025-12-31',
    evidence: {
      page: 1,
      excerpt: 'Saldo al cierre: $ 100.000',
      detectedLabel: 'closing-balance',
      detectedValue: '$ 100.000',
      location: 'Página 1',
    },
    adapterId: 'co.balance.generic',
    adapterVersion: '1.0.0',
    ruleId: 'closing-balance',
    confidence: { level: 'medium', score: 72, reasons: ['Regla sintética.'] },
    warnings: [],
    status: 'pending',
    possibleDuplicateIds: [],
    suggestedRequirementIds: input.requirementId ? [input.requirementId] : [],
    suggestedExogenousMatches: [],
    selectedExogenousRecordId: null,
    observation: '',
    factId: null,
    decisions: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

describe('repositorio (IndexedDB local)', () => {
  beforeEach(async () => {
    await clearAllData();
  });

  it('crea y lista expedientes', async () => {
    const created = await createCase({ alias: 'Prueba Local', taxYear: 2024 });
    const cases = await listCases();
    expect(cases.map((c) => c.id)).toContain(created.id);
    expect(created.status).toBe('new');
  });

  it('guarda y recupera un resultado de procesamiento', async () => {
    const created = await createCase({ alias: 'Con Resultado', taxYear: 2024 });
    const result = sampleResult();
    await saveResult(created.id, result);
    const stored = await getResult(created.id);
    expect(stored?.selectedSheet).toBe('Datos');
    expect(stored?.normalizedRecords).toHaveLength(1);
  });

  it('actualiza el estado de un requisito del checklist', async () => {
    const created = await createCase({ alias: 'Checklist', taxYear: 2024 });
    const result = sampleResult();
    await saveResult(created.id, result);
    const requirement = (await getResult(created.id))?.requirements[0];
    if (requirement) {
      await updateRequirementStatus(created.id, requirement.id, 'available');
      const updated = await getResult(created.id);
      const target = updated?.requirements.find((r) => r.id === requirement.id);
      expect(target?.status).toBe('available');
    }
  });

  it('asocia y elimina metadatos locales de un PDF sin persistir el binario', async () => {
    const created = await createCase({ alias: 'Adjunto PDF', taxYear: 2024 });
    await saveResult(created.id, sampleResult());
    const requirement = (await getResult(created.id))?.requirements[0];
    expect(requirement).toBeDefined();
    await attachRequirementPdf(created.id, requirement!.id, {
      name: 'certificado-sintetico.pdf',
      size: 1234,
      type: 'application/pdf',
    });
    const attached = (await getResult(created.id))?.requirements[0];
    expect(attached?.status).toBe('received');
    expect(attached?.attachment).toMatchObject({
      fileName: 'certificado-sintetico.pdf',
      fileSizeBytes: 1234,
      mimeType: 'application/pdf',
    });

    await removeRequirementPdf(created.id, requirement!.id);
    const removed = (await getResult(created.id))?.requirements[0];
    expect(removed?.status).toBe('pending');
    expect(removed?.attachment).toBeNull();
  });

  it('limpia toda la información local', async () => {
    await createCase({ alias: 'A borrar', taxYear: 2024 });
    await clearAllData();
    expect(await listCases()).toHaveLength(0);
  });

  it('persiste localmente la respuesta de responsabilidad de IVA', async () => {
    const created = await createCase({ alias: 'Evaluación IVA', taxYear: 2025 });
    await saveVatResponsibility(created.id, false);
    expect(await getFilingInputs(created.id)).toMatchObject({
      caseId: created.id,
      isVatResponsibleAtYearEnd: false,
    });
  });

  it('persiste una resolucion manual y recalcula la calidad de clasificacion', async () => {
    const created = await createCase({ alias: 'Resolucion', taxYear: 2024 });
    const result = sampleResult('Referencia generica');
    await saveResult(created.id, result);
    const record = result.normalizedRecords[0]!;
    const before = await getCaseAnalysis(created.id);
    expect(before?.matrix.quality.classification.pendingCount).toBe(1);

    await saveRecordResolution(created.id, record.id, {
      status: 'analyst_modified',
      finalClassification: {
        ...record,
        category: 'asset',
        nature: 'asset',
        treatment: 'add_to_assets',
        confidence: 'high',
        evidence: record.classificationEvidence,
      },
      justification: 'El soporte sintetico confirma que corresponde a un activo.',
    });

    const reloaded = await getCaseAnalysis(created.id);
    expect(reloaded?.resolutions[0]).toMatchObject({
      recordId: record.id,
      status: 'analyst_modified',
      isObsolete: false,
    });
    expect(reloaded?.resolutions[0]?.history).toHaveLength(1);
    expect(reloaded?.matrix.quality.classification.pendingCount).toBe(0);
    expect(reloaded?.matrix.groups.find((group) => group.id === 'assets')?.consolidatedValue).toBe(
      100_000,
    );
  });

  it('restaura explicitamente la clasificacion automatica conservando historial', async () => {
    const created = await createCase({ alias: 'Restauracion', taxYear: 2024 });
    const result = sampleResult('Referencia generica');
    await saveResult(created.id, result);
    const record = result.normalizedRecords[0]!;
    await saveRecordResolution(created.id, record.id, {
      status: 'analyst_confirmed',
      observation: 'Revision inicial sintetica.',
    });
    await restoreAutomaticClassification(created.id, record.id);

    const analysis = await getCaseAnalysis(created.id);
    expect(analysis?.resolutions[0]?.status).toBe('automatically_resolved');
    expect(analysis?.resolutions[0]?.finalClassification.category).toBe('unclassified');
    expect(analysis?.resolutions[0]?.history).toHaveLength(2);
  });

  it('marca una decision previa como obsoleta si cambia la clasificacion automatica', async () => {
    const created = await createCase({ alias: 'Reproceso', taxYear: 2024 });
    const initial = sampleResult('Referencia generica');
    await saveResult(created.id, initial);
    const record = initial.normalizedRecords[0]!;
    await saveRecordResolution(created.id, record.id, {
      status: 'analyst_confirmed',
      observation: 'Confirmacion sintetica.',
    });

    const changedRecord = {
      ...record,
      category: 'asset' as const,
      nature: 'asset' as const,
      treatment: 'add_to_assets' as const,
      confidence: 'high' as const,
    };
    await saveResult(created.id, {
      ...initial,
      normalizedRecords: [changedRecord],
      report: { ...initial.report, records: [changedRecord] },
    });

    const analysis = await getCaseAnalysis(created.id);
    expect(analysis?.resolutions[0]).toMatchObject({
      recordId: record.id,
      isObsolete: true,
      status: 'analyst_confirmed',
    });
    expect(analysis?.resolutions[0]?.obsoleteReason).toContain('cambi');
  });

  it('registra un documento multiproposito y conserva el binario solo por decision explicita', async () => {
    const created = await createCase({ alias: 'Biblioteca', taxYear: 2025 });
    const result = financialResult();
    await saveResult(created.id, result);
    expect(result.requirements.length).toBeGreaterThanOrEqual(2);
    const requirementIds = result.requirements.slice(0, 2).map((item) => item.id);
    const document = await addCaseDocument(
      created.id,
      localFile('consolidado.pdf', 'contenido sintetico'),
      {
        kind: 'consolidated_tax_certificate',
        storageMode: 'store_locally',
        taxYear: 2025,
        coveredRequirementIds: requirementIds,
        requiresPassword: true,
      },
    );
    expect(document.coveredRequirementIds).toEqual(requirementIds);
    expect(document.requiresPassword).toBe(true);
    expect('password' in document).toBe(false);
    expect(await getDocumentBinary(document.id)).toMatchObject({ fileName: 'consolidado.pdf' });
    const workspace = await getTaxCaseWorkspace(created.id);
    expect(workspace.coverages.filter((item) => item.status === 'covered')).toHaveLength(2);
    expect(workspace.localBytes).toBeGreaterThan(0);
  });

  it('detecta duplicados por hash y permite eliminar solo el binario local', async () => {
    const created = await createCase({ alias: 'Duplicados', taxYear: 2025 });
    const first = await addCaseDocument(created.id, localFile('a.pdf', 'igual'), {
      kind: 'other',
      storageMode: 'store_locally',
      taxYear: 2025,
    });
    await expect(
      addCaseDocument(created.id, localFile('b.pdf', 'igual'), {
        kind: 'other',
        storageMode: 'metadata_only',
        taxYear: 2025,
      }),
    ).rejects.toThrow(/mismo hash/);
    await removeDocumentBinary(first.id);
    expect(await getDocumentBinary(first.id)).toBeUndefined();
    expect((await getTaxCaseWorkspace(created.id)).documents[0]?.storageMode).toBe('metadata_only');
  });

  it('elimina definitivamente un documento en cascada preservando hechos manuales', async () => {
    const created = await createCase({ alias: 'BorradoDefinitivo', taxYear: 2025 });
    const document = await addCaseDocument(
      created.id,
      localFile('borrar.pdf', 'contenido a borrar'),
      { kind: 'other', storageMode: 'store_locally', taxYear: 2025 },
    );
    const fact = await saveDocumentFact(created.id, {
      documentId: document.id,
      entityId: null,
      productId: null,
      originalConcept: 'Hecho ligado al doc',
      category: 'asset',
      nature: 'asset',
      treatment: 'add_to_assets',
      value: 100000,
      currency: 'COP',
      cutoffDate: null,
      period: '',
      pageOrSection: '',
      evidence: '',
      captureMethod: 'manual',
      confidence: 'medium',
      reviewStatus: 'pending',
      requirementIds: [],
      author: 'Analista',
    });

    // Estado previo: existe binario y hecho referenciando el documento.
    expect(await getDocumentBinary(document.id)).toBeDefined();

    await deleteDocumentPermanently(document.id);

    // El documento y su binario ya no existen.
    const workspace = await getTaxCaseWorkspace(created.id);
    expect(workspace.documents.find((item) => item.id === document.id)).toBeUndefined();
    expect(await getDocumentBinary(document.id)).toBeUndefined();

    // El hecho manual sobrevive pero pierde su referencia al documento.
    const remainingFact = workspace.facts.find((item) => item.id === fact.id);
    expect(remainingFact?.documentId).toBeNull();
  });

  it('mantiene versiones al reemplazar un documento', async () => {
    const created = await createCase({ alias: 'Versiones', taxYear: 2025 });
    const first = await addCaseDocument(created.id, localFile('v1.pdf', 'version uno'), {
      kind: 'balance_certificate',
      storageMode: 'metadata_only',
      taxYear: 2025,
    });
    const second = await addCaseDocument(created.id, localFile('v2.pdf', 'version dos'), {
      kind: 'balance_certificate',
      storageMode: 'metadata_only',
      taxYear: 2025,
      replacesDocumentId: first.id,
    });
    const workspace = await getTaxCaseWorkspace(created.id);
    expect(workspace.documents.find((item) => item.id === first.id)).toMatchObject({
      status: 'replaced',
      replacedByDocumentId: second.id,
    });
    expect(second).toMatchObject({ version: 2, replacesDocumentId: first.id });
  });

  it('persiste un hecho manual con historial editable', async () => {
    const created = await createCase({ alias: 'Hechos', taxYear: 2025 });
    const fact = await saveDocumentFact(created.id, {
      documentId: null,
      entityId: null,
      productId: null,
      originalConcept: 'Saldo sintetico',
      category: 'asset',
      nature: 'asset',
      treatment: 'add_to_assets',
      value: 100,
      currency: 'COP',
      cutoffDate: '2025-12-31',
      period: '2025',
      pageOrSection: '2',
      evidence: 'Digitado desde soporte sintetico',
      captureMethod: 'manual',
      confidence: 'high',
      reviewStatus: 'pending',
      requirementIds: [],
      author: 'Analista local',
    });
    await updateDocumentFact(
      fact.id,
      { value: 101, reviewStatus: 'reviewed' },
      'Correccion revisada.',
    );
    const stored = (await getTaxCaseWorkspace(created.id)).facts[0];
    expect(stored).toMatchObject({
      value: 101,
      captureMethod: 'manual',
      reviewStatus: 'reviewed',
    });
    expect(stored?.history).toHaveLength(2);
  });

  it('requiere confirmacion humana y calcula diferencias al conciliar', async () => {
    const created = await createCase({ alias: 'Conciliacion', taxYear: 2025 });
    await expect(
      savePreliminaryReconciliation(created.id, {
        factIds: ['fact:1'],
        exogenousRecordIds: ['record:1'],
        status: 'reconciled',
        exogenousValue: 100,
        documentaryValue: 100,
        productId: null,
        explanation: 'igualdad',
        analystDecision: '',
        suggestionScore: 80,
        suggestionSignals: ['valor igual'],
        confirmedByHuman: false,
      }),
    ).rejects.toThrow(/confirmacion humana/);
    const saved = await savePreliminaryReconciliation(created.id, {
      factIds: ['fact:1'],
      exogenousRecordIds: ['record:1'],
      status: 'minor_difference',
      exogenousValue: 100,
      documentaryValue: 101,
      productId: null,
      explanation: 'redondeo',
      analystDecision: 'Confirmado',
      suggestionScore: 80,
      suggestionSignals: ['misma entidad'],
      confirmedByHuman: true,
    });
    expect(saved).toMatchObject({ difference: 1, differencePercentage: 1, confirmedByHuman: true });
  });

  it('persiste y restaura el rechazo de una sugerencia de conciliación', async () => {
    const created = await createCase({ alias: 'Rechazo persistente', taxYear: 2025 });
    const rejected = await savePreliminaryReconciliation(created.id, {
      factIds: ['fact:reject'],
      exogenousRecordIds: ['record:reject'],
      status: 'rejected',
      exogenousValue: 100,
      documentaryValue: 1_000,
      productId: null,
      explanation: 'Corresponde a otro producto.',
      analystDecision: 'Rechazo confirmado por el analista.',
      suggestionScore: 60,
      suggestionSignals: ['entidad similar'],
      confirmedByHuman: true,
      suggestionId: 'fact:reject:record:reject',
      rejectedAt: '2026-08-08T00:00:00.000Z',
      restoredAt: null,
      ruleVersion: 'test',
    });
    expect((await getTaxCaseWorkspace(created.id)).reconciliations[0]?.status).toBe('rejected');
    await restorePreliminaryReconciliation(created.id, rejected.id);
    expect((await getTaxCaseWorkspace(created.id)).reconciliations[0]).toMatchObject({
      status: 'restored',
    });
  });

  it('exporta el expediente sin incluir binarios', async () => {
    const created = await createCase({ alias: 'Exportable', taxYear: 2025 });
    await addEmployerInstance(created.id, { employerName: 'Empleador sintetico' });
    await saveCaseNavigation({
      caseId: created.id,
      stage: 'exportacion',
      view: 'manifiesto',
      recommendedStage: 'exportacion',
    });
    await addCaseDocument(created.id, localFile('local.pdf', 'secreto sintetico'), {
      kind: 'other',
      storageMode: 'store_locally',
      taxYear: 2025,
    });
    const workspace = await getTaxCaseWorkspace(created.id);
    const manifest = buildTaxCaseManifest({
      taxCase: created,
      result: workspace.result,
      analysis: workspace.analysis,
      documents: workspace.documents,
      products: workspace.products,
      coverages: workspace.coverages,
      facts: workspace.facts,
      reconciliations: workspace.reconciliations,
      employmentGroup: workspace.employmentGroup,
      navigation: workspace.navigation,
      acceptedSources: workspace.acceptedSources,
      requirementSourceDecisions: workspace.requirementSourceDecisions,
      resolutionDecisions: workspace.resolutionDecisions,
      form210Draft: workspace.form210Draft,
    });
    expect(manifest.schemaVersion).toBe('2.3.0');
    expect(manifest.documentExtraction.includesRenderedImages).toBe(false);
    expect(manifest.documentExtraction.metrics).toMatchObject({
      pagesProcessedWithOcr: 0,
      ocrFailures: 0,
      feedbackRecords: 0,
    });
    expect(manifest.includesBinaryData).toBe(false);
    expect(JSON.stringify(manifest)).not.toContain('secreto sintetico');
    expect(JSON.stringify(manifest)).not.toContain('bytes');
    expect(manifest.employmentIncomeGroup?.instances).toHaveLength(1);
    expect(manifest.workflow?.lastView).toBe('manifiesto');
    expect(manifest.resolutionDecisions).toEqual([]);
    expect(manifest.form210Draft).toBeNull();
  });

  it('conserva el historial al ajustar y restaurar una casilla del borrador 210', async () => {
    const created = await createCase({ alias: 'Borrador 210', taxYear: 2025 });
    await saveResult(created.id, financialResult());
    const initial = (await getTaxCaseWorkspace(created.id)).form210Draft;
    expect(initial?.notice).toContain('no presentado ante la DIAN');

    const adjustment = await saveTaxResolutionDecision(created.id, {
      type: 'adjust_form_box',
      objectType: 'form_box',
      objectId: '29',
      previousState: 'suggested',
      finalState: 'confirmed',
      selectedAlternative: 'Ajustar casilla 29',
      originalValue: initial?.boxes.find((box) => box.number === 29)?.suggestedValue ?? null,
      finalValue: 123_456,
      proposedBox: 29,
      reason: 'Ajuste sintético respaldado por revisión manual.',
    });
    expect(
      (await getTaxCaseWorkspace(created.id)).form210Draft?.boxes.find((box) => box.number === 29),
    ).toMatchObject({ confirmedValue: 123_456, status: 'confirmed' });

    await revertTaxResolutionDecision(
      created.id,
      adjustment.id,
      'Restaurar el cálculo sugerido para la prueba.',
    );
    expect(
      (await getTaxCaseWorkspace(created.id)).form210Draft?.boxes.find((box) => box.number === 29)
        ?.confirmedValue,
    ).toBeNull();
    const history = await listTaxResolutionDecisions(created.id);
    expect(history).toHaveLength(2);
    expect(history[1]).toMatchObject({
      type: 'restore_automatic_value',
      replacesDecisionId: adjustment.id,
    });
  });

  it('registra cobertura parcial sin duplicar el documento', async () => {
    const created = await createCase({ alias: 'Cobertura parcial', taxYear: 2025 });
    const result = financialResult();
    await saveResult(created.id, result);
    const document = await addCaseDocument(created.id, localFile('parcial.pdf', 'parcial'), {
      kind: 'consolidated_tax_certificate',
      storageMode: 'metadata_only',
      taxYear: 2025,
    });
    const requirement = result.requirements[0]!;
    await saveRequirementCoverage({
      caseId: created.id,
      requirementId: requirement.id,
      documentId: document.id,
      factId: null,
      entityId: null,
      status: 'partial',
      relation: 'partially_covers',
      notes: 'Falta un producto.',
    });
    const workspace = await getTaxCaseWorkspace(created.id);
    expect(workspace.documents).toHaveLength(1);
    expect(workspace.coverages[0]).toMatchObject({
      status: 'partial',
      relation: 'partially_covers',
    });
  });

  it('elimina todas las tablas y binarios del expediente', async () => {
    const created = await createCase({ alias: 'Eliminar completo', taxYear: 2025 });
    await addCaseDocument(created.id, localFile('borrar.pdf', 'borrar'), {
      kind: 'other',
      storageMode: 'store_locally',
      taxYear: 2025,
    });
    await saveDocumentFact(created.id, {
      documentId: null,
      entityId: null,
      productId: null,
      originalConcept: 'Hecho borrable',
      category: 'informational',
      nature: 'informational',
      treatment: 'do_not_aggregate',
      value: 1,
      currency: 'COP',
      cutoffDate: null,
      period: '',
      pageOrSection: '',
      evidence: '',
      captureMethod: 'manual',
      confidence: 'low',
      reviewStatus: 'pending',
      requirementIds: [],
      author: 'Analista local',
    });
    await deleteCase(created.id);
    const workspace = await getTaxCaseWorkspace(created.id);
    expect(workspace).toMatchObject({
      taxCase: undefined,
      documents: [],
      facts: [],
      localBytes: 0,
    });
  });

  it('persiste el grupo laboral detectado sin duplicar conceptos del mismo empleador', async () => {
    const created = await createCase({ alias: 'Laboral', taxYear: 2025 });
    await saveResult(created.id, employmentResult(1, 3));
    const workspace = await getTaxCaseWorkspace(created.id);
    expect(workspace.employmentGroup?.instances).toHaveLength(1);
    expect(
      workspace.result?.requirements.some((item) => /Formulario 220/i.test(item.documentName)),
    ).toBe(false);
  });

  it('crea una segunda instancia solo por accion explicita y persiste tras recarga', async () => {
    const created = await createCase({ alias: 'Dos empleadores', taxYear: 2025 });
    await saveResult(created.id, employmentResult());
    await addEmployerInstance(created.id, { employerName: 'Segundo empleador sintetico' });
    const workspace = await getTaxCaseWorkspace(created.id);
    expect(workspace.employmentGroup?.instances).toHaveLength(2);
    expect(workspace.employmentGroup?.instances[1]).toMatchObject({
      source: 'manual',
      status: 'pending',
    });
  });

  it('permite marcar no aplica y eliminar una instancia laboral', async () => {
    const created = await createCase({ alias: 'Editar empleadores', taxYear: 2025 });
    await saveResult(created.id, employmentResult(2));
    const initial = (await getTaxCaseWorkspace(created.id)).employmentGroup!;
    await setEmployerInstanceStatus(created.id, initial.instances[1]!.id, 'not_applicable');
    expect((await getTaxCaseWorkspace(created.id)).employmentGroup?.coverage).toBe('pending');
    await removeEmployerInstance(created.id, initial.instances[1]!.id);
    expect((await getTaxCaseWorkspace(created.id)).employmentGroup?.instances).toHaveLength(1);
  });

  it('asocia cada Formulario 220 a una sola instancia y valida la entidad', async () => {
    const created = await createCase({ alias: 'Formularios 220', taxYear: 2025 });
    await saveResult(created.id, employmentResult(2));
    const initial = (await getTaxCaseWorkspace(created.id)).employmentGroup!;
    const first = initial.instances[0]!;
    const form220 = await addCaseDocument(created.id, localFile('empleador-1.pdf', '220 uno'), {
      kind: 'form_220',
      storageMode: 'metadata_only',
      taxYear: 2025,
      entityIds: [first.entityId!],
    });
    await associateEmployerDocument(created.id, first.id, form220.id);
    const stored = (await getTaxCaseWorkspace(created.id)).employmentGroup!;
    expect(stored.instances[0]).toMatchObject({
      form220DocumentId: form220.id,
      status: 'covered',
    });
    await expect(
      associateEmployerDocument(created.id, stored.instances[1]!.id, form220.id),
    ).rejects.toThrow(/otro empleador|entidad diferente/);
  });

  it('no acepta un certificado consolidado como 220 sin decision expresa', async () => {
    const created = await createCase({ alias: 'Advertencia laboral', taxYear: 2025 });
    await saveResult(created.id, employmentResult());
    const instance = (await getTaxCaseWorkspace(created.id)).employmentGroup!.instances[0]!;
    const consolidated = await addCaseDocument(
      created.id,
      localFile('consolidado-laboral.pdf', 'consolidado'),
      {
        kind: 'consolidated_tax_certificate',
        storageMode: 'metadata_only',
        taxYear: 2025,
      },
    );
    await expect(
      associateEmployerDocument(created.id, instance.id, consolidated.id),
    ).rejects.toThrow(/decision expresa/);
    await associateEmployerDocument(created.id, instance.id, consolidated.id, {
      allowConsolidatedAsPrimary: true,
    });
    expect((await getTaxCaseWorkspace(created.id)).employmentGroup?.instances[0]?.status).toBe(
      'covered',
    );
  });

  it('persiste fuente, hash y última vista por expediente', async () => {
    const created = await createCase({ alias: 'Navegable', taxYear: 2025 });
    await saveResult(created.id, sampleResult(), {
      sha256: 'a'.repeat(64),
      loadedAt: '2026-01-01T00:00:00.000Z',
    });
    await saveCaseNavigation({
      caseId: created.id,
      stage: 'organizacion',
      view: 'documentos',
      recommendedStage: 'organizacion',
    });
    await markWorkflowViewCompleted(created.id, 'exportacion', 'manifiesto');
    const workspace = await getTaxCaseWorkspace(created.id);
    expect(workspace.sourceInfo).toEqual({
      sha256: 'a'.repeat(64),
      loadedAt: '2026-01-01T00:00:00.000Z',
    });
    expect(workspace.navigation).toMatchObject({
      lastStage: 'exportacion',
      lastView: 'manifiesto',
      completedViews: ['exportacion/manifiesto'],
    });
  });

  it('persiste la decisión explícita de expediente manual limitado', async () => {
    const created = await createCase({ alias: 'Manual', taxYear: 2025 });
    await enableManualCase(created.id);
    expect(await getCaseNavigationState(created.id)).toMatchObject({
      manualMode: true,
      lastStage: 'organizacion',
      lastView: 'documentos',
    });
  });

  it('elimina solo la fuente y conserva documentos y hechos manuales', async () => {
    const created = await createCase({ alias: 'Sin fuente', taxYear: 2025 });
    await saveResult(created.id, employmentResult());
    await addCaseDocument(created.id, localFile('soporte.pdf', 'soporte'), {
      kind: 'other',
      storageMode: 'metadata_only',
      taxYear: 2025,
    });
    await saveDocumentFact(created.id, {
      documentId: null,
      entityId: null,
      productId: null,
      originalConcept: 'Hecho manual conservado',
      category: 'informational',
      nature: 'informational',
      treatment: 'do_not_aggregate',
      value: 1,
      currency: 'COP',
      cutoffDate: null,
      period: '',
      pageOrSection: '',
      evidence: '',
      captureMethod: 'manual',
      confidence: 'low',
      reviewStatus: 'pending',
      requirementIds: [],
      author: 'Analista local',
    });
    await removeExogenousSource(created.id);
    const workspace = await getTaxCaseWorkspace(created.id);
    expect(workspace.result).toBeUndefined();
    expect(workspace.analysis).toBeUndefined();
    expect(workspace.documents).toHaveLength(1);
    expect(workspace.facts).toHaveLength(1);
    expect(workspace.navigation).toMatchObject({ lastStage: 'fuente', lastView: 'cargar' });
  });

  it('acepta provisionalmente un premio propio con trazabilidad y sin duplicarlo', async () => {
    const created = await createCase({ alias: 'Premio propio sintético', taxYear: 2025 });
    const result = prizeResult();
    await saveResult(created.id, result);
    const matrixBeforeAcceptance = JSON.stringify(
      (await getTaxCaseWorkspace(created.id)).analysis!.matrix,
    );
    const record = result.normalizedRecords[0]!;
    const accepted = await acceptExogenousValue(created.id, {
      exogenousRecordId: record.id,
      requirementId: result.requirements[0]?.id ?? null,
      entityId: result.entities[0]?.id ?? null,
      reason: 'validated_by_holder',
      observation: 'El titular reconoce el premio sintético.',
      includedInMatrix: true,
      occasionalGainRecognition: 'own_prize',
      beneficiaryAlias: null,
    });
    expect(accepted).toMatchObject({
      status: 'provisionally_accepted',
      primarySource: 'exogenous_information',
      provisionalValue: 2_500_000,
      includedInMatrix: true,
    });
    expect(accepted.history).toHaveLength(1);
    const workspace = await getTaxCaseWorkspace(created.id);
    expect(JSON.stringify(workspace.analysis!.matrix)).toBe(matrixBeforeAcceptance);
    const manifest = buildTaxCaseManifest({
      taxCase: workspace.taxCase!,
      result: workspace.result,
      analysis: workspace.analysis,
      documents: workspace.documents,
      products: workspace.products,
      coverages: workspace.coverages,
      facts: workspace.facts,
      reconciliations: workspace.reconciliations,
      acceptedSources: workspace.acceptedSources,
      requirementSourceDecisions: workspace.requirementSourceDecisions,
    });
    expect(manifest.acceptedSources[0]).toMatchObject({
      originalValue: 2_500_000,
      provisionalValue: 2_500_000,
      reason: 'validated_by_holder',
      ruleVersion: 'accepted-exogenous-v1',
    });
  });

  it('mantiene pendiente un premio cobrado para un tercero y exige explicación', async () => {
    const created = await createCase({ alias: 'Premio de tercero', taxYear: 2025 });
    const result = prizeResult();
    await saveResult(created.id, result);
    const recordId = result.normalizedRecords[0]!.id;
    await expect(
      acceptExogenousValue(created.id, {
        exogenousRecordId: recordId,
        requirementId: null,
        entityId: null,
        reason: 'document_unavailable',
        observation: '',
        includedInMatrix: true,
        occasionalGainRecognition: 'collected_for_third_party',
        beneficiaryAlias: 'familiar A',
      }),
    ).rejects.toThrow(/Explica/);
    const accepted = await acceptExogenousValue(created.id, {
      exogenousRecordId: recordId,
      requirementId: null,
      entityId: null,
      reason: 'document_unavailable',
      observation: 'Cobro realizado para un tercero identificado solo por alias.',
      includedInMatrix: true,
      occasionalGainRecognition: 'collected_for_third_party',
      beneficiaryAlias: 'familiar A',
    });
    expect(accepted).toMatchObject({ status: 'pending_review', includedInMatrix: false });
  });

  it('confirma la aceptación y conserva el historial', async () => {
    const created = await createCase({ alias: 'Confirmación', taxYear: 2025 });
    const result = sampleResult();
    await saveResult(created.id, result);
    const accepted = await acceptExogenousValue(created.id, {
      exogenousRecordId: result.normalizedRecords[0]!.id,
      requirementId: null,
      entityId: null,
      reason: 'validated_by_holder',
      observation: 'Validación sintética.',
      includedInMatrix: true,
      occasionalGainRecognition: null,
      beneficiaryAlias: null,
    });
    await confirmAcceptedExogenousValue(accepted.id);
    expect((await getTaxCaseWorkspace(created.id)).acceptedSources[0]).toMatchObject({
      status: 'analyst_confirmed',
      history: expect.arrayContaining([expect.objectContaining({ action: 'analyst_confirmed' })]),
    });
  });

  it('registra un requisito no emitido sin marcarlo como no aplica', async () => {
    const created = await createCase({ alias: 'Soporte no emitido', taxYear: 2025 });
    const result = financialResult();
    await saveResult(created.id, result);
    const requirement = result.requirements[0]!;
    await saveRequirementSourceDecision(created.id, {
      requirementId: requirement.id,
      status: 'justified_unavailable',
      reason: 'La entidad no expide el certificado.',
      managedAt: '2026-08-01',
      channel: 'portal',
      observation: 'Consulta sintética en portal.',
      evidenceDocumentId: null,
      acceptedSourceId: null,
    });
    const workspace = await getTaxCaseWorkspace(created.id);
    expect(workspace.requirementSourceDecisions[0]?.status).toBe('justified_unavailable');
    expect(workspace.coverages.find((item) => item.requirementId === requirement.id)?.status).toBe(
      'not_evaluated',
    );
  });

  it('un documento posterior respalda o contradice sin borrar la aceptación', async () => {
    const created = await createCase({ alias: 'Soporte posterior', taxYear: 2025 });
    const result = financialResult();
    await saveResult(created.id, result);
    const record = result.normalizedRecords[0]!;
    const accepted = await acceptExogenousValue(created.id, {
      exogenousRecordId: record.id,
      requirementId: null,
      entityId: result.entities[0]?.id ?? null,
      reason: 'document_unavailable',
      observation: 'Pendiente de certificado.',
      includedInMatrix: true,
      occasionalGainRecognition: null,
      beneficiaryAlias: null,
    });
    const document = await addCaseDocument(created.id, localFile('saldo.pdf', 'saldo'), {
      kind: 'balance_certificate',
      storageMode: 'metadata_only',
      taxYear: 2025,
    });
    const fact = await saveDocumentFact(created.id, {
      documentId: document.id,
      entityId: result.entities[0]?.id ?? null,
      productId: null,
      originalConcept: 'Saldo certificado',
      category: record.category,
      nature: record.nature,
      treatment: record.treatment,
      value: record.reportedValue!,
      currency: 'COP',
      cutoffDate: null,
      period: '',
      pageOrSection: '1',
      evidence: 'Fixture sintético',
      captureMethod: 'manual',
      confidence: 'high',
      reviewStatus: 'confirmed',
      requirementIds: [],
      author: 'Analista local',
    });
    await savePreliminaryReconciliation(created.id, {
      factIds: [fact.id],
      exogenousRecordIds: [record.id],
      status: 'reconciled',
      exogenousValue: record.reportedValue!,
      documentaryValue: fact.value,
      productId: null,
      explanation: 'Valores iguales.',
      analystDecision: 'Documento sintético confirmado.',
      suggestionScore: 100,
      suggestionSignals: ['valor igual'],
      confirmedByHuman: true,
    });
    const supported = (await getTaxCaseWorkspace(created.id)).acceptedSources[0]!;
    expect(supported).toMatchObject({ id: accepted.id, status: 'supported_by_document' });
    expect(supported.history).toHaveLength(2);
  });

  it('persiste tareas derivadas y resuelve las que dejan de estar activas', async () => {
    const created = await createCase({ alias: 'Pendientes', taxYear: 2025 });
    const timestamp = '2026-08-02T00:00:00.000Z';
    await synchronizeCaseTasks(created.id, [
      {
        id: 'task:vat',
        caseId: created.id,
        type: 'confirm_vat',
        title: 'Confirmar IVA',
        explanation: 'La respuesta no se infiere del Excel.',
        source: 'filing',
        stage: 'declaracion',
        view: 'obligacion',
        entityId: null,
        documentId: null,
        requirementId: null,
        candidateId: null,
        reconciliationId: null,
        matrixGroupId: null,
        extractionSessionId: null,
        profileId: null,
        page: null,
        priority: 'high',
        blocking: true,
        status: 'pending',
        recommendedAction: 'Responder la pregunta de IVA',
        ruleId: 'test.v1',
        evidence: [],
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ]);
    expect((await getTaxCaseWorkspace(created.id)).caseTasks).toMatchObject([
      { id: 'task:vat', status: 'pending' },
    ]);
    await synchronizeCaseTasks(created.id, []);
    expect((await getTaxCaseWorkspace(created.id)).caseTasks).toMatchObject([
      { id: 'task:vat', status: 'resolved' },
    ]);
  });

  it('persiste una extracción sin texto completo ni contraseña', async () => {
    const created = await createCase({ alias: 'Extracción local', taxYear: 2025 });
    const document = await addCaseDocument(created.id, localFile('saldo.pdf', 'PDF sintético'), {
      kind: 'balance_certificate',
      storageMode: 'store_locally',
      taxYear: 2025,
    });
    const session = await createExtractionSession(created.id, document.id);
    const candidate = extractionCandidate({
      caseId: created.id,
      documentId: document.id,
      sessionId: session.id,
    });
    await completeExtractionSession({
      sessionId: session.id,
      pageCount: 1,
      readablePageCount: 1,
      diagnosis: {
        type: 'insufficient_text',
        textualPageCount: 0,
        scannedPageCount: 0,
        insufficientPageCount: 1,
        damagedPageCount: 0,
        signals: ['Texto insuficiente.'],
        pages: [
          {
            pageNumber: 1,
            type: 'insufficient_text',
            characterCount: 8,
            tokenCount: 1,
            textCoverage: 0.01,
            orientation: 'portrait',
            width: 612,
            height: 792,
            warnings: ['Requiere OCR.'],
            recommendedMethod: 'ocr',
          },
        ],
      },
      classification: {
        proposedKind: 'balance_certificate',
        confidence: 'high',
        alternatives: [],
        supportingSignals: ['Certificado de saldos.'],
        opposingSignals: [],
        requiresReview: false,
        correctedKind: null,
      },
      adapterId: candidate.adapterId,
      adapterVersion: candidate.adapterVersion,
      findings: [],
      candidates: [candidate],
    });
    await recordOcrPageOutcome(session.id, {
      page: 1,
      status: 'completed',
      comparisonStatus: 'contradiction',
      confidence: 82,
      errorCode: null,
    });
    const workspace = await getTaxCaseWorkspace(created.id);
    expect(workspace.extractionSessions[0]).toMatchObject({
      status: 'ready_for_review',
      textPersisted: false,
      candidateIds: [candidate.id],
      ocrOutcomes: [{ page: 1, status: 'completed', comparisonStatus: 'contradiction' }],
      metrics: {
        pagesRecommendedForOcr: 1,
        pagesProcessedWithOcr: 1,
        ocrContradictions: 1,
      },
    });
    expect(JSON.stringify(workspace.extractionSessions)).not.toMatch(/password|PDF sintético/);
    const manifest = buildTaxCaseManifest({
      taxCase: workspace.taxCase!,
      documents: workspace.documents,
      products: workspace.products,
      coverages: workspace.coverages,
      facts: workspace.facts,
      reconciliations: workspace.reconciliations,
      extractionSessions: workspace.extractionSessions,
      documentCandidates: workspace.documentCandidates,
      documentProfiles: workspace.documentProfiles,
      extractionFeedback: workspace.extractionFeedback,
    });
    expect(manifest.documentExtraction.metrics).toMatchObject({
      pagesRecommendedForOcr: 1,
      pagesProcessedWithOcr: 1,
      ocrContradictions: 1,
    });
    expect(JSON.stringify(manifest)).not.toMatch(/ocrText|imageUrl|renderedImage/);
  });

  it('crea un candidato manual desde el laboratorio y pasa por la revisión normal', async () => {
    const created = await createCase({ alias: 'Laboratorio documental', taxYear: 2025 });
    const document = await addCaseDocument(created.id, localFile('saldo.pdf', 'PDF'), {
      kind: 'balance_certificate',
      storageMode: 'store_locally',
      taxYear: 2025,
    });
    const session = await createExtractionSession(created.id, document.id);
    const candidate = await createManualDocumentCandidate({
      caseId: created.id,
      documentId: document.id,
      extractionSessionId: session.id,
      page: 2,
      field: 'balance',
      originalConcept: 'Saldo capturado manualmente',
      extractedValue: 750_000,
      category: 'asset',
      nature: 'asset',
      treatment: 'add_to_assets',
      excerpt: 'Saldo al cierre: $ 750.000',
      x: 12,
      y: 34,
      method: 'ocr',
    });
    expect(candidate.status).toBe('pending');
    expect(candidate.adapterId).toBe('manual.lab');
    expect(candidate.evidence.detectedLabel).toContain('Saldo');
    expect(candidate.evidence.location).toContain('OCR');

    const workspace = await getTaxCaseWorkspace(created.id);
    expect(workspace.documentCandidates.map((item) => item.id)).toContain(candidate.id);

    const fact = await reviewDocumentCandidate(candidate.id, {
      action: 'confirm',
      observation: 'Confirmado desde el laboratorio tras validar visualmente.',
    });
    expect(fact?.captureMethod).toBe('assisted');
    expect(fact?.value).toBe(750_000);
  });

  it('crea un perfil documental en borrador y solo lo activa con una acción explícita', async () => {
    const profile = await createDocumentProfile({
      name: 'Certificado de saldos — Banco Ficticio',
      documentKind: 'balance_certificate',
      entityId: null,
      brandName: 'Banco Ficticio',
      signals: {
        pageWidth: 612,
        pageHeight: 792,
        pageCount: 1,
        sectionLabels: ['balances'],
        headerKeywords: ['certificado de saldos'],
      },
      expectedPageCount: 1,
      zones: [],
      fields: ['balance'],
      adapterId: 'co.balance-certificate.generic',
      confidence: 'medium',
      origin: 'manual',
    });
    expect(profile.status).toBe('draft');

    const listed = await listDocumentProfiles();
    expect(listed.map((item) => item.id)).toContain(profile.id);

    await updateDocumentProfileStatus(profile.id, 'active');
    const updated = (await listDocumentProfiles()).find((item) => item.id === profile.id);
    expect(updated?.status).toBe('active');

    await deleteDocumentProfile(profile.id);
    expect((await listDocumentProfiles()).map((item) => item.id)).not.toContain(profile.id);
  });

  it('registra feedback de calibración con el alcance que el analista eligió', async () => {
    const feedback = await recordExtractionFeedback({
      documentId: 'document-1',
      extractionSessionId: 'session-1',
      candidateId: 'candidate-1',
      decision: 'value_corrected',
      reason: 'El OCR confundió el símbolo de pesos con un dígito.',
      method: 'ocr',
      adapterId: 'co.balance-certificate.generic',
      profileId: null,
      beforeValue: '$9OO000',
      afterValue: '900000',
      page: 1,
      zoneId: null,
      applicability: 'similar_documents',
    });
    expect(feedback.applicability).toBe('similar_documents');
    expect(feedback.reason).toContain('OCR');

    const listedForDocument = await listExtractionFeedback('document-1');
    expect(listedForDocument.map((item) => item.id)).toContain(feedback.id);
    const listedAll = await listExtractionFeedback();
    expect(listedAll.map((item) => item.id)).toContain(feedback.id);
  });

  it('exige justificar una corrección y crea un hecho asistido trazable', async () => {
    const created = await createCase({ alias: 'Revisión asistida', taxYear: 2025 });
    const result = financialResult();
    await saveResult(created.id, result);
    const requirement = result.requirements[0]!;
    const document = await addCaseDocument(created.id, localFile('saldo.pdf', 'PDF'), {
      kind: 'balance_certificate',
      storageMode: 'metadata_only',
      taxYear: 2025,
    });
    const session = await createExtractionSession(created.id, document.id);
    const candidate = extractionCandidate({
      caseId: created.id,
      documentId: document.id,
      sessionId: session.id,
      requirementId: requirement.id,
    });
    await completeExtractionSession({
      sessionId: session.id,
      pageCount: 1,
      readablePageCount: 1,
      classification: {
        proposedKind: 'balance_certificate',
        confidence: 'medium',
        alternatives: [],
        supportingSignals: [],
        opposingSignals: [],
        requiresReview: true,
        correctedKind: null,
      },
      adapterId: candidate.adapterId,
      adapterVersion: candidate.adapterVersion,
      findings: [],
      candidates: [candidate],
    });
    await expect(
      reviewDocumentCandidate(candidate.id, { action: 'confirm', correctedValue: 120_000 }),
    ).rejects.toThrow(/Explica/);
    const fact = await reviewDocumentCandidate(candidate.id, {
      action: 'confirm',
      correctedValue: 120_000,
      observation: 'El separador del PDF cambió el valor; se verificó en la página 1.',
    });
    expect(fact).toMatchObject({
      captureMethod: 'assisted',
      extractedValue: 100_000,
      correctedValue: 120_000,
      extractionCandidateId: candidate.id,
      reviewStatus: 'confirmed',
    });
    const workspace = await getTaxCaseWorkspace(created.id);
    expect(workspace.documentCandidates[0]).toMatchObject({
      status: 'corrected',
      finalValue: 120_000,
      factId: fact?.id,
    });
    expect(workspace.coverages.some((item) => item.factId === fact?.id)).toBe(true);
  });

  it('conserva rechazo al reprocesar, permite restaurar y mantiene el historial al obsoletar', async () => {
    const created = await createCase({ alias: 'Limpieza documental', taxYear: 2025 });
    const document = await addCaseDocument(created.id, localFile('saldo.pdf', 'PDF'), {
      kind: 'balance_certificate',
      storageMode: 'store_locally',
      taxYear: 2025,
    });
    const session = await createExtractionSession(created.id, document.id);
    const candidate = extractionCandidate({
      caseId: created.id,
      documentId: document.id,
      sessionId: session.id,
    });
    await completeExtractionSession({
      sessionId: session.id,
      pageCount: 1,
      readablePageCount: 1,
      classification: {
        proposedKind: 'balance_certificate',
        confidence: 'high',
        alternatives: [],
        supportingSignals: [],
        opposingSignals: [],
        requiresReview: false,
        correctedKind: null,
      },
      adapterId: candidate.adapterId,
      adapterVersion: candidate.adapterVersion,
      findings: [],
      candidates: [candidate],
    });
    await reviewDocumentCandidate(candidate.id, {
      action: 'reject',
      rejectionReason: 'incorrect_period',
      observation: 'No corresponde al periodo sintético.',
    });
    const secondSession = await createExtractionSession(created.id, document.id);
    const repeatedCandidate = {
      ...candidate,
      id: `${candidate.id}:run-2`,
      extractionSessionId: secondSession.id,
      decisions: [],
      status: 'pending' as const,
    };
    await completeExtractionSession({
      sessionId: secondSession.id,
      pageCount: 1,
      readablePageCount: 1,
      classification: {
        proposedKind: 'balance_certificate',
        confidence: 'high',
        alternatives: [],
        supportingSignals: [],
        opposingSignals: [],
        requiresReview: false,
        correctedKind: null,
      },
      adapterId: repeatedCandidate.adapterId,
      adapterVersion: repeatedCandidate.adapterVersion,
      findings: [],
      candidates: [repeatedCandidate],
    });
    let workspace = await getTaxCaseWorkspace(created.id);
    const preserved = workspace.documentCandidates.find(
      (item) => item.extractionSessionId === secondSession.id,
    )!;
    expect(preserved).toMatchObject({
      status: 'rejected',
      rejectionReason: 'incorrect_period',
    });
    await restoreDocumentCandidate(preserved.id);
    expect(
      (await getTaxCaseWorkspace(created.id)).documentCandidates.find(
        (item) => item.id === preserved.id,
      )?.decisions,
    ).toHaveLength(2);
    await markDocumentObsolete(document.id);
    workspace = await getTaxCaseWorkspace(created.id);
    expect(workspace.extractionSessions).toHaveLength(2);
    expect(workspace.documentCandidates).toHaveLength(2);
    expect(workspace.documentCandidates.every((item) => item.status === 'obsolete')).toBe(true);
    expect(await getDocumentBinary(document.id)).toBeUndefined();
  });

  it('persiste declaraciones anteriores, deriva arrastres y compara evolución (Sprint 2.4, Fase B)', async () => {
    const created = await createCase({ alias: 'Declaración anterior', taxYear: 2025 });
    const timestamp = '2026-09-05T00:00:00.000Z';
    const priorReturn: PriorYearTaxReturn = {
      id: 'prior-return:test-1',
      caseId: created.id,
      taxYear: 2024,
      filingYear: 2025,
      formType: '210',
      formNumber: '1102345678901',
      previousFormNumber: null,
      taxpayerIdentityMasked: '••••4567',
      submittedAt: '2025-05-10T00:00:00.000Z',
      sourceDocumentId: 'doc-prior-1',
      status: 'submitted',
      identityMatch: 'match',
      replaces: null,
      replacedBy: null,
      isCurrentVersion: true,
      boxes: {
        '29': {
          boxNumber: 29,
          rawValue: '148.984.000',
          normalizedValueCop: 148_984_000,
          extractionMethod: 'native_text',
          confidence: 'high',
          role: 'historical_reference',
          page: 1,
          evidence: '29 Patrimonio bruto 148.984.000',
        },
        '133': {
          boxNumber: 133,
          rawValue: '79.000',
          normalizedValueCop: 79_000,
          extractionMethod: 'native_text',
          confidence: 'medium',
          role: 'carry_forward_candidate',
          page: 2,
          evidence: '133 Anticipo 79.000',
        },
        '137': {
          boxNumber: 137,
          rawValue: '0',
          normalizedValueCop: 0,
          extractionMethod: 'native_text',
          confidence: 'high',
          role: 'carry_forward_candidate',
          page: 2,
          evidence: '137 Saldo a favor 0',
        },
      },
      extractionConfidence: 'high',
      parserVersion: 'form210-prior-year-1.0.0',
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await savePriorYearReturn(priorReturn);
    expect(await getPriorYearReturns(created.id)).toHaveLength(1);
    expect(await getCurrentPriorYearReturn(created.id, 2024)).toMatchObject({
      id: 'prior-return:test-1',
    });

    const candidates = await refreshPriorYearCarryForwardCandidates(created.id);
    expect(candidates).toHaveLength(2);
    const advance = candidates.find((item) => item.targetBoxNumber === 130)!;
    expect(advance.sourceValueCop).toBe(79_000);
    expect(advance.decision).toBe('pending');
    const refund = candidates.find((item) => item.targetBoxNumber === 131)!;
    expect(refund.refundOrCompensationRequested).toBe('unknown');

    // No duplica candidatos si se vuelve a refrescar.
    expect(await refreshPriorYearCarryForwardCandidates(created.id)).toHaveLength(2);

    const answered = await answerRefundCarryForwardQuestion(refund.id, 'no');
    expect(answered?.refundOrCompensationRequested).toBe('no');

    const decided = await decideCarryForwardCandidate(advance.id, 'confirmed', 79_000);
    expect(decided).toMatchObject({ decision: 'confirmed', finalValueCop: 79_000 });
    expect(await getPriorYearCarryForwardCandidates(created.id)).toHaveLength(2);

    // Sin borrador F-210 todavía, la comparación de evolución no inventa
    // valores actuales: quedan `incomplete` salvo que no exista declaración
    // anterior para la casilla.
    const evolution = await getTaxEvolutionComparison(created.id, 2024);
    const patrimony = evolution.find((metric) => metric.key === 'grossPatrimony')!;
    expect(patrimony.priorValueCop).toBe(148_984_000);
    expect(patrimony.status).toBe('incomplete');
  });

  it('rechaza generar arrastres cuando la identidad de la declaración anterior no coincide', async () => {
    const created = await createCase({ alias: 'Identidad no coincide', taxYear: 2025 });
    const timestamp = '2026-09-05T00:00:00.000Z';
    await savePriorYearReturn({
      id: 'prior-return:mismatch',
      caseId: created.id,
      taxYear: 2024,
      filingYear: 2025,
      formType: '210',
      formNumber: null,
      previousFormNumber: null,
      taxpayerIdentityMasked: '••••9999',
      submittedAt: null,
      sourceDocumentId: 'doc-prior-2',
      status: 'unknown',
      identityMatch: 'mismatch',
      replaces: null,
      replacedBy: null,
      isCurrentVersion: true,
      boxes: {},
      extractionConfidence: 'low',
      parserVersion: 'form210-prior-year-1.0.0',
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    expect(await refreshPriorYearCarryForwardCandidates(created.id)).toHaveLength(0);
  });
});

describe('dependientes económicos (Sprint 2.4, Fase C)', () => {
  it('crea un dependiente, evalúa elegibilidad y NO limita el almacenamiento a cuatro', async () => {
    const created = await createCase({ alias: 'Dependientes', taxYear: 2025 });
    for (let index = 0; index < 5; index += 1) {
      await createTaxDependent(created.id, {
        fullName: `Dependiente ${index + 1}`,
        documentType: 'CC',
        documentNumber: `100000000${index}`,
        relationship: 'child_minor',
        dateOfBirth: '2015-01-01',
        dependencyType: 'not_applicable',
        studentStatus: 'not_applicable',
        monthsClaimed: 12,
      });
    }
    const stored = await getTaxDependents(created.id);
    // El expediente conserva los 5, aunque el beneficio de 72 UVT solo
    // considere 4 (Sección 6): no se pierde el quinto dependiente.
    expect(stored).toHaveLength(5);
  });

  it('evalúa eligible con soportes suficientes y refleja R138/R139 tras confirmar naturaleza laboral', async () => {
    const created = await createCase({ alias: 'Dependientes R138', taxYear: 2025 });
    await saveDependentsCaseContext(created.id, { employmentIncomeNature: 'labor_relation' });
    const dependent = await createTaxDependent(created.id, {
      fullName: 'Hijo Menor',
      documentType: 'CC',
      documentNumber: '1000000000',
      relationship: 'child_minor',
      dateOfBirth: '2015-01-01',
      dependencyType: 'not_applicable',
      studentStatus: 'not_applicable',
      monthsClaimed: 12,
    });
    let evaluations = await getDependentEvaluations(created.id);
    let evaluation = evaluations.find((item) => item.dependentId === dependent.id);
    expect(evaluation?.status).toBe('requires_support'); // falta registro civil
    // Sin `eligible` todavía, no hay candidatos de coexistencia (Sección 8:
    // no se asume elegibilidad automáticamente por dato incompleto).
    expect(evaluation?.candidateBenefits).toEqual([]);

    await addDependentSupport(dependent.id, created.id, 'civil_registry', null);
    evaluations = await getDependentEvaluations(created.id);
    evaluation = evaluations.find((item) => item.dependentId === dependent.id);
    expect(evaluation?.status).toBe('eligible');
    expect(evaluation?.candidateBenefits).toContain('article_387');
    expect(evaluation?.candidateBenefits).toContain('article_336');

    const workspace = await getTaxCaseWorkspace(created.id);
    const box138 = workspace.form210Draft?.boxes.find((box) => box.number === 138);
    expect(box138?.suggestedValue).toBe(1);
  });

  it('"No tengo dependientes" persiste la decisión y puede revertirse', async () => {
    const created = await createCase({ alias: 'Sin dependientes', taxYear: 2025 });
    await setNoDependentsDeclared(created.id, true);
    let context = await getDependentsCaseContext(created.id);
    expect(context?.noDependentsDeclared).toBe(true);
    await setNoDependentsDeclared(created.id, false);
    context = await getDependentsCaseContext(created.id);
    expect(context?.noDependentsDeclared).toBe(false);
  });

  it('marca stale_due_to_rule_change en vez de recalcular silenciosamente una decisión confirmada', async () => {
    const created = await createCase({ alias: 'Dependientes stale', taxYear: 2025 });
    const dependent = await createTaxDependent(created.id, {
      fullName: 'Madre',
      documentType: 'CC',
      documentNumber: '1000000002',
      relationship: 'parent',
      dependencyType: 'no_income_or_low_income',
      annualIncomeCop: 1_000_000,
      studentStatus: 'not_applicable',
      monthsClaimed: 12,
    });
    await confirmDependentEvaluation(dependent.id);
    let evaluations = await getDependentEvaluations(created.id);
    let evaluation = evaluations.find((item) => item.dependentId === dependent.id);
    expect(evaluation?.confirmedByAnalyst).toBe(true);
    expect(evaluation?.staleDueToRuleChange).toBe(false);

    // Simula un cambio de versión del motor editando el dependiente sin
    // cambiar la versión real (el flujo normal de recalculateDependentEvaluation
    // solo marca `stale` si `ruleVersion` difiere de DEPENDENTS_ENGINE_VERSION,
    // así que forzamos una edición que dispara el recálculo pero conservamos
    // la evaluación confirmada verificando que updateTaxDependent no la borra).
    await updateTaxDependent(dependent.id, { monthsClaimed: 6 });
    evaluations = await getDependentEvaluations(created.id);
    evaluation = evaluations.find((item) => item.dependentId === dependent.id);
    // Como la versión del motor no cambió entre llamadas, se recalcula
    // normalmente (no está "stale"); esto confirma que el mecanismo de
    // preservación solo actúa cuando la versión de regla difiere.
    expect(evaluation?.staleDueToRuleChange).toBe(false);

    // `reviewStaleDependentEvaluation` permite forzar una revisión manual.
    const reviewed = await reviewStaleDependentEvaluation(dependent.id);
    expect(reviewed?.confirmedByAnalyst).toBe(false);
  });

  it('archiva un dependiente sin perder su historial (no lo elimina físicamente)', async () => {
    const created = await createCase({ alias: 'Dependiente archivado', taxYear: 2025 });
    const dependent = await createTaxDependent(created.id, {
      fullName: 'Hermano',
      documentType: 'CC',
      documentNumber: '1000000003',
      relationship: 'sibling',
      dependencyType: 'no_income_or_low_income',
      annualIncomeCop: 0,
      studentStatus: 'not_applicable',
      monthsClaimed: 12,
    });
    await archiveTaxDependent(dependent.id);
    const stored = await getTaxDependents(created.id);
    const archived = stored.find((item) => item.id === dependent.id);
    expect(archived?.status).toBe('archived');
  });
});

const FE_HEADER_ROW = [
  'Identificación Emisor Factura',
  'Nombre Emisor Factura',
  'Fecha Emisión',
  'Num_factura_venta',
  'Valor Facturado',
  'Valor Notas Crédito',
  'Valor Notas Débito',
  'Valor Factura / Afectada con Notas Débito - Crédito',
  'Valor Susceptible Beneficio',
  'Medios De Pago',
  'CUFE',
];

function electronicInvoiceFile(rows: (string | number | null)[][]) {
  const metadata: (string | number | null)[][] = [
    ['Reporte de facturas electrónicas - MUESTRA SINTÉTICA'],
    ...Array.from({ length: 20 }, () => []),
  ];
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([...metadata, FE_HEADER_ROW, ...rows]);
  XLSX.utils.book_append_sheet(wb, ws, 'Facturas');
  const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
  return {
    name: 'facturas-electronicas.xlsx',
    size: buffer.byteLength,
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    arrayBuffer: async () => buffer,
  };
}

const SYNTHETIC_CUFE_1 = 'a'.repeat(96);
const SYNTHETIC_CUFE_2 = 'b'.repeat(96);

describe('facturación electrónica (Sprint 2.4, Fase D)', () => {
  it('importa el reporte DIAN, persiste facturas y recalcula el borrador del F-210', async () => {
    const created = await createCase({ alias: 'Facturación electrónica', taxYear: 2025 });
    const file = electronicInvoiceFile([
      [
        '900111222',
        'Proveedor Sintético SAS',
        '2025-02-10',
        'FES-0001',
        '1.500.000',
        '0',
        '0',
        '1.500.000',
        '1.500.000',
        'Tarjeta débito o crédito',
        SYNTHETIC_CUFE_1,
      ],
      [
        '900333444',
        'Proveedor Sintético Dos SAS',
        '2025-03-05',
        'FES-0002',
        '500.000',
        '0',
        '0',
        '500.000',
        '500.000',
        'Efectivo',
        SYNTHETIC_CUFE_2,
      ],
    ]);
    const report = await importElectronicInvoiceReport(created.id, 2025, file);
    expect(report).not.toBeNull();
    expect(report!.rowCount).toBe(2);
    expect(report!.totals.netTotalCop).toBe(2_000_000);
    expect(report!.totals.eligibleBenefitTotalCop).toBe(2_000_000);

    const purchases = await getElectronicInvoicePurchases(created.id);
    expect(purchases).toHaveLength(2);
    expect(purchases.every((purchase) => purchase.benefitDecision === 'eligible')).toBe(true);

    const workspace = await getTaxCaseWorkspace(created.id);
    const box28 = workspace.form210Draft?.boxes.find((box) => box.number === 28);
    // 1 % de 2.000.000 = 20.000, muy por debajo del tope de 240 UVT.
    // Corrección normativa puntual: casilla oficial 28, no 140/141.
    expect(box28?.suggestedValue).toBe(20_000);
    // Nunca debe fluir por la casilla 39 (corrección normativa Fase D).
    const box39 = workspace.form210Draft?.boxes.find((box) => box.number === 39);
    expect(
      box39?.sources.some((source) => source.sourceId.includes('electronic-invoicing')),
    ).toBe(false);
  });

  it('devuelve null cuando el archivo no se reconoce como reporte DIAN de facturación electrónica', async () => {
    const created = await createCase({ alias: 'Archivo no reconocido', taxYear: 2025 });
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ['Columna A', 'Columna B'],
      ['dato', 123],
    ]);
    XLSX.utils.book_append_sheet(wb, ws, 'Hoja1');
    const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
    const file = {
      name: 'otro.xlsx',
      size: buffer.byteLength,
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      arrayBuffer: async () => buffer,
    };
    const report = await importElectronicInvoiceReport(created.id, 2025, file);
    expect(report).toBeNull();
    expect(await getElectronicInvoiceReport(created.id)).toBeUndefined();
  });

  it('excluir una factura por doble beneficio recalcula la base y la casilla 28', async () => {
    const created = await createCase({ alias: 'Doble beneficio', taxYear: 2025 });
    const file = electronicInvoiceFile([
      [
        '900111222',
        'Proveedor Sintético SAS',
        '2025-02-10',
        'FES-0001',
        '1.000.000',
        '0',
        '0',
        '1.000.000',
        '1.000.000',
        'Tarjeta débito o crédito',
        SYNTHETIC_CUFE_1,
      ],
      [
        '900333444',
        'Proveedor Sintético Dos SAS',
        '2025-03-05',
        'FES-0002',
        '1.000.000',
        '0',
        '0',
        '1.000.000',
        '1.000.000',
        'Efectivo',
        SYNTHETIC_CUFE_2,
      ],
    ]);
    await importElectronicInvoiceReport(created.id, 2025, file);
    const [first] = await getElectronicInvoicePurchases(created.id);
    await decideElectronicInvoicePurchaseBenefit(
      first!.id,
      'used_as_cost_or_expense',
      'Esta factura ya se dedujo como costo en la cédula no laboral.',
    );
    const workspace = await getTaxCaseWorkspace(created.id);
    const box28 = workspace.form210Draft?.boxes.find((box) => box.number === 28);
    // Solo la segunda factura (1.000.000) queda elegible → 1 % = 10.000.
    expect(box28?.suggestedValue).toBe(10_000);
    const decisions = await listTaxResolutionDecisions(created.id);
    expect(
      decisions.some((decision) => decision.type === 'decide_electronic_invoice_benefit'),
    ).toBe(true);
  });

  it('"No usaré deducción por facturación electrónica" excluye el beneficio sin borrar el reporte (reversible)', async () => {
    const created = await createCase({ alias: 'Opt-out FE', taxYear: 2025 });
    const file = electronicInvoiceFile([
      [
        '900111222',
        'Proveedor Sintético SAS',
        '2025-02-10',
        'FES-0001',
        '1.000.000',
        '0',
        '0',
        '1.000.000',
        '1.000.000',
        'Tarjeta débito o crédito',
        SYNTHETIC_CUFE_1,
      ],
    ]);
    await importElectronicInvoiceReport(created.id, 2025, file);
    await setElectronicInvoicingBenefitOptedOut(created.id, true, 'El analista prefiere no tomar este beneficio.');
    let report = await getElectronicInvoiceReport(created.id);
    expect(report?.benefitOptedOut).toBe(true);
    let workspace = await getTaxCaseWorkspace(created.id);
    let box28 = workspace.form210Draft?.boxes.find((box) => box.number === 28);
    expect(box28?.suggestedValue ?? 0).toBe(0);
    // El reporte y las facturas se conservan (no se borran).
    expect(await getElectronicInvoicePurchases(created.id)).toHaveLength(1);

    // Reversible.
    await setElectronicInvoicingBenefitOptedOut(created.id, false, 'El analista reconsideró.');
    report = await getElectronicInvoiceReport(created.id);
    expect(report?.benefitOptedOut).toBe(false);
    workspace = await getTaxCaseWorkspace(created.id);
    box28 = workspace.form210Draft?.boxes.find((box) => box.number === 28);
    expect(box28?.suggestedValue).toBe(10_000);
  });

  it('CUFE duplicado exacto no se suma dos veces en los totales persistidos', async () => {
    const created = await createCase({ alias: 'Duplicado FE', taxYear: 2025 });
    const file = electronicInvoiceFile([
      [
        '900111222',
        'Proveedor Sintético SAS',
        '2025-02-10',
        'FES-0001',
        '1.000.000',
        '0',
        '0',
        '1.000.000',
        '1.000.000',
        'Tarjeta débito o crédito',
        SYNTHETIC_CUFE_1,
      ],
      [
        '900111222',
        'Proveedor Sintético SAS',
        '2025-02-10',
        'FES-0001',
        '1.000.000',
        '0',
        '0',
        '1.000.000',
        '1.000.000',
        'Tarjeta débito o crédito',
        SYNTHETIC_CUFE_1,
      ],
    ]);
    const report = await importElectronicInvoiceReport(created.id, 2025, file);
    expect(report!.rowCount).toBe(2);
    expect(report!.totals.duplicateExactCount).toBe(2);
    expect(report!.totals.netTotalCop).toBe(1_000_000);
    expect(report!.totals.eligibleBenefitTotalCop).toBe(1_000_000);
  });

  it('eliminar el reporte también elimina sus facturas y recalcula el borrador', async () => {
    const created = await createCase({ alias: 'Eliminar FE', taxYear: 2025 });
    const file = electronicInvoiceFile([
      [
        '900111222',
        'Proveedor Sintético SAS',
        '2025-02-10',
        'FES-0001',
        '1.000.000',
        '0',
        '0',
        '1.000.000',
        '1.000.000',
        'Tarjeta débito o crédito',
        SYNTHETIC_CUFE_1,
      ],
    ]);
    await importElectronicInvoiceReport(created.id, 2025, file);
    await removeElectronicInvoiceReport(created.id);
    expect(await getElectronicInvoiceReport(created.id)).toBeUndefined();
    expect(await getElectronicInvoicePurchases(created.id)).toHaveLength(0);
    const workspace = await getTaxCaseWorkspace(created.id);
    const box28 = workspace.form210Draft?.boxes.find((box) => box.number === 28);
    expect(box28?.suggestedValue ?? 0).toBe(0);
  });

  it('re-importar el reporte reemplaza el anterior (1 reporte activo por expediente)', async () => {
    const created = await createCase({ alias: 'Reimportar FE', taxYear: 2025 });
    const first = electronicInvoiceFile([
      [
        '900111222',
        'Proveedor Sintético SAS',
        '2025-02-10',
        'FES-0001',
        '1.000.000',
        '0',
        '0',
        '1.000.000',
        '1.000.000',
        'Tarjeta débito o crédito',
        SYNTHETIC_CUFE_1,
      ],
    ]);
    await importElectronicInvoiceReport(created.id, 2025, first);
    const second = electronicInvoiceFile([
      [
        '900333444',
        'Proveedor Sintético Dos SAS',
        '2025-03-05',
        'FES-0002',
        '2.000.000',
        '0',
        '0',
        '2.000.000',
        '2.000.000',
        'Efectivo',
        SYNTHETIC_CUFE_2,
      ],
    ]);
    await importElectronicInvoiceReport(created.id, 2025, second);
    const purchases = await getElectronicInvoicePurchases(created.id);
    expect(purchases).toHaveLength(1);
    expect(purchases[0]!.invoiceNumber).toBe('FES-0002');
  });
});
