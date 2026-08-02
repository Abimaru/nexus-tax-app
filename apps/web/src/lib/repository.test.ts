import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import type { DocumentFactCandidate, ProcessingResult } from '@nexus-tax/domain';
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
  createExtractionSession,
  restoreDocumentCandidate,
  reviewDocumentCandidate,
  markDocumentObsolete,
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
    });
    expect(manifest.schemaVersion).toBe('2.1.0');
    expect(manifest.includesBinaryData).toBe(false);
    expect(JSON.stringify(manifest)).not.toContain('secreto sintetico');
    expect(JSON.stringify(manifest)).not.toContain('bytes');
    expect(manifest.employmentIncomeGroup?.instances).toHaveLength(1);
    expect(manifest.workflow?.lastView).toBe('manifiesto');
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
    const workspace = await getTaxCaseWorkspace(created.id);
    expect(workspace.extractionSessions[0]).toMatchObject({
      status: 'ready_for_review',
      textPersisted: false,
      candidateIds: [candidate.id],
    });
    expect(JSON.stringify(workspace.extractionSessions)).not.toMatch(/password|PDF sintético/);
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

  it('conserva decisiones al restaurar y limpia temporales al eliminar el documento', async () => {
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
      observation: 'No corresponde al periodo sintético.',
    });
    await restoreDocumentCandidate(candidate.id);
    expect((await getTaxCaseWorkspace(created.id)).documentCandidates[0]?.decisions).toHaveLength(
      2,
    );
    await markDocumentObsolete(document.id);
    const workspace = await getTaxCaseWorkspace(created.id);
    expect(workspace.extractionSessions).toHaveLength(0);
    expect(workspace.documentCandidates).toHaveLength(0);
    expect(await getDocumentBinary(document.id)).toBeUndefined();
  });
});
