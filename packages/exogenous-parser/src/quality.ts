import type {
  ColumnMapping,
  DataQualityFinding,
  FindingCode,
  FindingSeverity,
  NormalizedExogenousRecord,
  RecordRelation,
} from '@nexus-tax/domain';
import type { ColumnDescriptor } from './columns';
import type { NonNumericCell } from './normalize';
import { prefixedId } from './ids';
import { maskDocument } from './taxpayer';

/**
 * Detección de hallazgos básicos de calidad (§7).
 * Cada hallazgo adjunta evidencia (hoja, fila, columna, valor) cuando existe y
 * se clasifica en info / warning / error. Determinista y sin efectos externos.
 */

/** Máximo de hallazgos por categoría para no saturar la UI en archivos grandes. */
const MAX_PER_CATEGORY = 50;

export interface QualityInputs {
  sheetName: string;
  sheetIsEmpty: boolean;
  columns: ColumnDescriptor[];
  columnsWithData: Set<number>;
  mapping: ColumnMapping;
  normalizedRecords: NormalizedExogenousRecord[];
  emptyRowNumbers: number[];
  nonNumericCells: NonNumericCell[];
  taxpayerDocumentMasked?: string;
  relationships?: RecordRelation[];
}

interface FindingDraft {
  code: FindingCode;
  severity: FindingSeverity;
  title: string;
  message: string;
  suggestedAction?: string;
  evidence: DataQualityFinding['evidence'];
  relatedRecordId: string | null;
}

function build(sheetName: string, draft: FindingDraft): DataQualityFinding {
  const ev = draft.evidence;
  const id = prefixedId('finding', [
    draft.code,
    sheetName,
    ev?.row ?? '',
    ev?.column ?? '',
    draft.relatedRecordId ?? '',
  ]);
  return { id, ...draft };
}

export function detectFindings(inputs: QualityInputs): DataQualityFinding[] {
  const { sheetName, mapping, normalizedRecords } = inputs;
  const findings: DataQualityFinding[] = [];
  const push = (draft: FindingDraft) => findings.push(build(sheetName, draft));

  // Hoja sin datos.
  if (inputs.sheetIsEmpty || normalizedRecords.length === 0) {
    push({
      code: 'empty_sheet',
      severity: 'error',
      title: 'Hoja sin datos',
      message: `La hoja "${sheetName}" no contiene registros procesables.`,
      suggestedAction: 'Verifica que seleccionaste la hoja correcta.',
      evidence: { sheet: sheetName },
      relatedRecordId: null,
    });
  }

  // Formato no reconocido: no se pudo mapear ningún campo relevante.
  const hasAnyMapping =
    Boolean(mapping.reportedValue) ||
    Boolean(mapping.entityName) ||
    Boolean(mapping.reportingEntityDocument) ||
    Boolean(mapping.reportedPersonDocument) ||
    Boolean(mapping.conceptCode) ||
    Boolean(mapping.conceptLabel);
  if (!hasAnyMapping && !inputs.sheetIsEmpty) {
    push({
      code: 'unknown_format',
      severity: 'warning',
      title: 'Formato no reconocido',
      message:
        'No se reconocieron columnas de entidad, concepto ni valor. Usa el mapeo manual de columnas.',
      suggestedAction: 'Abre el mapeo manual y asigna las columnas.',
      evidence: { sheet: sheetName },
      relatedRecordId: null,
    });
  }

  // Encabezados duplicados y columnas sin nombre (con datos).
  for (const col of inputs.columns) {
    if (col.isDuplicate) {
      push({
        code: 'duplicate_header',
        severity: 'warning',
        title: 'Encabezado duplicado',
        message: `El encabezado jerárquico "${col.path}" aparece más de una vez.`,
        suggestedAction: 'Renombra o mapea manualmente la columna correcta.',
        evidence: { sheet: sheetName, column: col.path },
        relatedRecordId: null,
      });
    }
    if (col.isUnnamed && inputs.columnsWithData.has(col.index)) {
      push({
        code: 'unnamed_column',
        severity: 'warning',
        title: 'Columna sin nombre',
        message: `La columna ${col.index + 1} tiene datos pero no tiene encabezado.`,
        suggestedAction: 'Asigna un encabezado o mapéala manualmente.',
        evidence: { sheet: sheetName, column: col.key },
        relatedRecordId: null,
      });
    }
  }

  // Filas vacías (informativo).
  inputs.emptyRowNumbers.slice(0, MAX_PER_CATEGORY).forEach((row) => {
    push({
      code: 'empty_row',
      severity: 'info',
      title: 'Fila vacía',
      message: `La fila ${row} está vacía y fue omitida.`,
      evidence: { sheet: sheetName, row },
      relatedRecordId: null,
    });
  });

  // Valores no numéricos donde se esperaba número (error).
  inputs.nonNumericCells.slice(0, MAX_PER_CATEGORY).forEach((cell) => {
    push({
      code: 'non_numeric_value',
      severity: 'error',
      title: 'Valor no numérico',
      message: `Se esperaba un número en "${cell.column}" pero se encontró "${cell.value}".`,
      suggestedAction: 'Corrige el valor en el archivo o revisa el mapeo.',
      evidence: { sheet: sheetName, row: cell.row, column: cell.column, value: cell.value },
      relatedRecordId: null,
    });
  });

  // Hallazgos por registro con límite por categoría.
  const counters: Partial<Record<FindingCode, number>> = {};
  const withinLimit = (code: FindingCode): boolean => {
    const next = (counters[code] ?? 0) + 1;
    counters[code] = next;
    return next <= MAX_PER_CATEGORY;
  };

  const seenSignatures = new Map<string, string>();

  for (const rec of normalizedRecords) {
    if (
      rec.entityName === null &&
      rec.reportingEntityDocument === null &&
      withinLimit('record_without_entity')
    ) {
      push({
        code: 'record_without_entity',
        severity: 'warning',
        title: 'Registro sin entidad',
        message: `La fila ${rec.source.row} no tiene entidad reportante identificable.`,
        evidence: { sheet: sheetName, row: rec.source.row },
        relatedRecordId: rec.id,
      });
    }
    if (
      rec.conceptCode === null &&
      rec.conceptLabel === null &&
      withinLimit('record_without_concept')
    ) {
      push({
        code: 'record_without_concept',
        severity: 'warning',
        title: 'Registro sin concepto',
        message: `La fila ${rec.source.row} no tiene concepto identificable.`,
        evidence: { sheet: sheetName, row: rec.source.row },
        relatedRecordId: rec.id,
      });
    }
    if (
      mapping.reportedValue &&
      rec.reportedValue === null &&
      withinLimit('record_without_value')
    ) {
      push({
        code: 'record_without_value',
        severity: 'warning',
        title: 'Registro sin valor',
        message: `La fila ${rec.source.row} no tiene un valor reportado.`,
        evidence: { sheet: sheetName, row: rec.source.row },
        relatedRecordId: rec.id,
      });
    }
    if (
      rec.reportingEntityDocument &&
      /e\+?\d+/i.test(rec.reportingEntityDocument) &&
      withinLimit('possibly_truncated_identifier')
    ) {
      push({
        code: 'possibly_truncated_identifier',
        severity: 'warning',
        title: 'Identificador posiblemente truncado',
        message: `El identificador ${maskDocument(rec.reportingEntityDocument)} parece estar en notación científica.`,
        suggestedAction: 'Verifica el NIT/documento en el archivo original.',
        evidence: {
          sheet: sheetName,
          row: rec.source.row,
          value: maskDocument(rec.reportingEntityDocument),
        },
        relatedRecordId: rec.id,
      });
    }

    if (rec.identityMatch === 'mismatched' && withinLimit('reported_person_mismatch')) {
      push({
        code: 'reported_person_mismatch',
        severity: 'warning',
        title: 'La persona reportada no coincide con el consultante',
        message:
          'El documento de la fila no coincide con el consultante. Puede ser un error de reporte, una estructura diferente o una operación relacionada con otra persona.',
        suggestedAction: 'Verifica el documento en el archivo original y el mapeo de la columna.',
        evidence: {
          sheet: sheetName,
          row: rec.source.row,
          expectedMasked: inputs.taxpayerDocumentMasked,
          foundMasked: maskDocument(rec.reportedPersonDocument),
        },
        relatedRecordId: rec.id,
      });
    }
    if (rec.category === 'unclassified' && withinLimit('unclassified_tax_record')) {
      push({
        code: 'unclassified_tax_record',
        severity: 'warning',
        title: 'Registro tributario sin clasificar',
        message: `La fila ${rec.source.row} no tiene señales suficientes para una clasificación inicial.`,
        suggestedAction: 'Revisa el detalle y el uso sugerido antes de consolidar este valor.',
        evidence: { sheet: sheetName, row: rec.source.row },
        relatedRecordId: rec.id,
      });
    }
    if (rec.multiplicityType === 'real_ambiguity' && withinLimit('real_tax_ambiguity')) {
      push({
        code: 'real_tax_ambiguity',
        severity: 'warning',
        title: 'Uso sugerido ambiguo',
        message: `La fila ${rec.source.row} menciona grupos tributarios principales diferentes.`,
        suggestedAction:
          'Revisa las casillas y condiciones sugeridas antes de clasificar definitivamente.',
        evidence: { sheet: sheetName, row: rec.source.row },
        relatedRecordId: rec.id,
      });
    }

    // Posible duplicado exacto por firma (entidad + concepto + valor).
    const signature = [
      rec.reportingEntityDocument ?? rec.entityName ?? '',
      rec.conceptCode ?? rec.conceptLabel ?? '',
      rec.reportedValue ?? '',
    ].join('|');
    const priorRecordId = seenSignatures.get(signature);
    if (priorRecordId && signature !== '||' && withinLimit('possible_exact_duplicate')) {
      push({
        code: 'possible_exact_duplicate',
        severity: 'warning',
        title: 'Posible duplicado exacto',
        message: `La fila ${rec.source.row} coincide con otro registro (misma entidad, concepto y valor).`,
        suggestedAction: 'Confirma si es un duplicado real antes de conciliar.',
        evidence: { sheet: sheetName, row: rec.source.row },
        relatedRecordId: rec.id,
      });
    } else if (!priorRecordId) {
      seenSignatures.set(signature, rec.id);
    }
  }

  const relationships = inputs.relationships ?? [];
  for (const relation of relationships) {
    if (
      relation.type === 'possible_duplicate_of' &&
      relation.reviewStatus === 'pending_review' &&
      withinLimit('possible_unresolved_double_count')
    ) {
      const record = normalizedRecords.find((item) => item.id === relation.sourceRecordId);
      push({
        code: 'possible_unresolved_double_count',
        severity: 'warning',
        title: 'Posible doble conteo pendiente',
        message: 'Dos registros coinciden y la relación de posible duplicado aún no está resuelta.',
        suggestedAction: 'Confirma cuál registro debe participar en el consolidado.',
        evidence: record ? { sheet: record.source.sheet, row: record.source.row } : null,
        relatedRecordId: relation.sourceRecordId,
      });
    }
  }
  for (const record of normalizedRecords) {
    if (
      record.category === 'electronic_invoicing_benefit_base' &&
      !relationships.some(
        (item) => item.type === 'subset_of' && item.sourceRecordId === record.id,
      ) &&
      withinLimit('missing_required_relationship')
    ) {
      push({
        code: 'missing_required_relationship',
        severity: 'warning',
        title: 'Falta relación de subconjunto',
        message:
          'La base susceptible de factura electrónica no pudo relacionarse con un total facturado.',
        suggestedAction: 'Revisa si falta el registro total o confirma la relación manualmente.',
        evidence: { sheet: record.source.sheet, row: record.source.row },
        relatedRecordId: record.id,
      });
    }
  }

  const comparedIdentity = normalizedRecords.filter(
    (record) => record.identityMatch !== 'unavailable',
  );
  const mismatchedIdentity = comparedIdentity.filter(
    (record) => record.identityMatch === 'mismatched',
  );
  if (comparedIdentity.length > 0 && mismatchedIdentity.length > comparedIdentity.length / 2) {
    push({
      code: 'possible_column_mapping_error',
      severity: 'warning',
      title: 'Posible mapeo incorrecto del documento reportado',
      message:
        'La mayoría de los documentos reportados no coincide con la identidad del consultante.',
      suggestedAction:
        'Confirma que “Información reportada > NIT” esté asignada al documento de la persona reportada.',
      evidence: { sheet: sheetName, expectedMasked: inputs.taxpayerDocumentMasked },
      relatedRecordId: null,
    });
  }

  // Orden determinista por severidad y fila.
  const severityRank: Record<FindingSeverity, number> = { error: 0, warning: 1, info: 2 };
  findings.sort(
    (a, b) =>
      severityRank[a.severity] - severityRank[b.severity] ||
      (a.evidence?.row ?? 0) - (b.evidence?.row ?? 0) ||
      a.code.localeCompare(b.code),
  );

  return findings;
}
