import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import type { ProcessingResult } from '@nexus-tax/domain';
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
} from './repository';

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

describe('repositorio (IndexedDB local)', () => {
  beforeEach(async () => {
    await clearAllData();
  });

  it('crea y lista expedientes', async () => {
    const created = await createCase({ alias: 'Prueba Local', taxYear: 2024 });
    const cases = await listCases();
    expect(cases.map((c) => c.id)).toContain(created.id);
    expect(created.status).toBe('draft');
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
});
