'use client';

import { useMemo } from 'react';
import { PlayCircle } from 'lucide-react';
import {
  CANONICAL_FIELDS,
  type CanonicalField,
  type CellValue,
  type ColumnMapping,
} from '@nexus-tax/domain';
import { PROCESSING_LIMITS } from '@nexus-tax/config';
import {
  buildColumns,
  guessColumnMapping,
  type ColumnDescriptor,
} from '@nexus-tax/exogenous-parser';
import { Badge, Button, EmptyState, GlassPanel, formatBytes } from '@nexus-tax/ui';
import { useWorkbenchStore } from '@/lib/workbenchStore';

const FIELD_LABELS: Record<CanonicalField, string> = {
  entityName: 'Entidad / Tercero',
  reportingEntityDocument: 'NIT de quien reporta',
  reportedPersonDocument: 'NIT de la persona reportada',
  conceptCode: 'Código de concepto',
  conceptLabel: 'Concepto / Descripción',
  reportedValue: 'Valor reportado',
  withholding: 'Retención',
  suggestedUse: 'Uso declaración sugerida',
  additionalInformation: 'Información adicional',
};

function cellText(value: CellValue): string {
  if (value === null || value === undefined) return '';
  return String(value);
}

/** Pantalla "Inspección del libro" (§10). Selección de hoja, encabezado y mapeo. */
export function InspectPanel() {
  const inspect = useWorkbenchStore((s) => s.inspect);
  const fileSize = useWorkbenchStore((s) => s.fileSize);
  const selectedSheet = useWorkbenchStore((s) => s.selectedSheet);
  const headerRowIndex = useWorkbenchStore((s) => s.headerRowIndex);
  const columnMapping = useWorkbenchStore((s) => s.columnMapping);
  const structure = useWorkbenchStore((s) => s.structure);
  const phase = useWorkbenchStore((s) => s.phase);
  const setSheet = useWorkbenchStore((s) => s.setSheet);
  const setHeaderRow = useWorkbenchStore((s) => s.setHeaderRow);
  const setColumnMapping = useWorkbenchStore((s) => s.setColumnMapping);
  const setStructure = useWorkbenchStore((s) => s.setStructure);
  const runProcessing = useWorkbenchStore((s) => s.runProcessing);

  const sheetMeta = inspect?.metadata.sheets.find((s) => s.name === selectedSheet);
  const sheetInspection = useMemo(
    () => inspect?.previews.find((item) => item.name === selectedSheet),
    [inspect, selectedSheet],
  );
  const previewRows = useMemo(() => sheetInspection?.previewRows ?? [], [sheetInspection]);
  const columnCount = sheetMeta?.columnCount ?? 0;

  const effectiveHeaderIndex = useMemo(() => {
    if (headerRowIndex !== null) return headerRowIndex;
    return sheetInspection?.detectedHeaderRowIndex ?? 0;
  }, [headerRowIndex, sheetInspection]);

  const columns: ColumnDescriptor[] = useMemo(
    () =>
      buildColumns(
        previewRows[effectiveHeaderIndex] ?? [],
        columnCount,
        previewRows[effectiveHeaderIndex - 1] ?? [],
      ),
    [previewRows, effectiveHeaderIndex, columnCount],
  );

  const effectiveMapping: ColumnMapping = useMemo(() => {
    if (columnMapping) return columnMapping;
    if (headerRowIndex === null && sheetInspection) return sheetInspection.detectedColumnMapping;
    return guessColumnMapping(columns);
  }, [columnMapping, headerRowIndex, sheetInspection, columns]);

  const detectedSections = useMemo(() => {
    const detected = sheetInspection?.detectedStructure ?? {
      headerRow: effectiveHeaderIndex + 1,
      detailsStartRow: effectiveHeaderIndex + 2,
    };

    // La detección proviene siempre de `fullRows`. Al corregir manualmente el
    // encabezado solo se refleja esa elección; los límites siguen siendo
    // editables y el pipeline los vuelve a detectar sobre la hoja completa.
    return {
      structure:
        headerRowIndex === null ? detected : { ...detected, headerRow: effectiveHeaderIndex + 1 },
      confidence: sheetInspection?.structureConfidence ?? 0,
    };
  }, [headerRowIndex, sheetInspection, effectiveHeaderIndex]);
  const effectiveStructure = structure ?? detectedSections.structure;

  if (!inspect) {
    return (
      <EmptyState
        title="Aún no hay un libro leído"
        description="Vuelve a la pestaña Cargar y selecciona un archivo Excel."
      />
    );
  }

  const headerScanLimit = Math.min(PROCESSING_LIMITS.maxHeaderScanRows, previewRows.length);

  function updateMapping(field: CanonicalField, original: string | null) {
    const next: ColumnMapping = { ...effectiveMapping };
    if (original) next[field] = original;
    else delete next[field];
    setColumnMapping(next);
  }

  function updateDetailsStart(row: number) {
    const minimumDetailsRow =
      effectiveStructure.thresholdsStartRow === undefined
        ? effectiveStructure.headerRow + 1
        : effectiveStructure.headerRow + 2;
    const maximumDetailsRow = Math.max(sheetMeta?.rowCount ?? minimumDetailsRow, minimumDetailsRow);
    const detailsStartRow = Math.min(Math.max(minimumDetailsRow, row), maximumDetailsRow);
    if (
      effectiveStructure.thresholdsStartRow !== undefined &&
      effectiveStructure.thresholdsEndRow !== undefined
    ) {
      const thresholdsEndRow = Math.min(effectiveStructure.thresholdsEndRow, detailsStartRow - 1);
      const thresholdsStartRow = Math.min(effectiveStructure.thresholdsStartRow, thresholdsEndRow);
      setStructure({
        ...effectiveStructure,
        thresholdsStartRow,
        thresholdsEndRow,
        detailsStartRow,
      });
      return;
    }
    setStructure({ ...effectiveStructure, detailsStartRow });
  }

  function toggleThresholds(enabled: boolean) {
    if (!enabled) {
      setStructure({
        headerRow: effectiveStructure.headerRow,
        detailsStartRow: effectiveStructure.detailsStartRow,
      });
      return;
    }
    const detailsStartRow = Math.max(
      effectiveStructure.detailsStartRow,
      effectiveStructure.headerRow + 2,
    );
    setStructure({
      headerRow: effectiveStructure.headerRow,
      thresholdsStartRow: effectiveStructure.headerRow + 1,
      thresholdsEndRow: detailsStartRow - 1,
      detailsStartRow,
    });
  }

  function updateThresholdRange(field: 'start' | 'end', row: number) {
    const currentStart = effectiveStructure.thresholdsStartRow ?? effectiveStructure.headerRow + 1;
    const currentEnd =
      effectiveStructure.thresholdsEndRow ?? effectiveStructure.detailsStartRow - 1;
    const thresholdsStartRow =
      field === 'start'
        ? Math.max(effectiveStructure.headerRow + 1, Math.min(row, currentEnd))
        : Math.min(currentStart, row);
    const thresholdsEndRow =
      field === 'end'
        ? Math.max(thresholdsStartRow, Math.min(row, effectiveStructure.detailsStartRow - 1))
        : Math.max(currentEnd, thresholdsStartRow);
    setStructure({ ...effectiveStructure, thresholdsStartRow, thresholdsEndRow });
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Metadatos del libro */}
      <GlassPanel className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-medium text-content">{inspect.metadata.fileName}</h2>
            <p className="text-xs text-content-subtle">
              {formatBytes(fileSize)} · {inspect.metadata.sheetCount} hoja(s)
            </p>
          </div>
          <Badge tone="cyan">
            {sheetMeta
              ? `${sheetMeta.rowCount} filas totales × ${sheetMeta.columnCount} col.`
              : 'Sin hoja'}
          </Badge>
        </div>

        <div className="mt-4">
          <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-content-subtle">
            Hojas
          </span>
          <div className="flex flex-wrap gap-2">
            {inspect.metadata.sheets.map((sheet) => (
              <button
                key={sheet.name}
                type="button"
                onClick={() => setSheet(sheet.name)}
                disabled={sheet.isEmpty}
                className={[
                  'rounded-lg border px-3 py-1.5 text-sm transition-colors',
                  sheet.name === selectedSheet
                    ? 'border-accent-cyan/50 bg-accent-cyan/10 text-content-strong'
                    : 'border-overlay/10 text-content hover:bg-overlay/5',
                  sheet.isEmpty ? 'cursor-not-allowed opacity-40' : '',
                ].join(' ')}
              >
                {sheet.name}
                {sheet.isEmpty ? ' (vacía)' : ''}
              </button>
            ))}
          </div>
        </div>
      </GlassPanel>

      {/* Secciones del reporte */}
      <GlassPanel className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-medium text-content">Secciones detectadas</h3>
            <p className="text-xs text-content-subtle">
              Revisa los límites antes de procesar. Las filas se muestran como aparecen en Excel.
            </p>
          </div>
          <Badge tone={detectedSections.confidence >= 0.7 ? 'emerald' : 'amber'}>
            Confianza {Math.round(detectedSections.confidence * 100)}%
          </Badge>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-overlay/8 bg-overlay/[0.02] p-3">
            <span className="block text-xs text-content-subtle">Metadatos</span>
            <span className="text-sm text-content">
              {effectiveStructure.headerRow > 1
                ? `Filas 1–${effectiveStructure.headerRow - 1}`
                : 'Sin filas previas'}
            </span>
          </div>
          <div className="rounded-lg border border-accent-cyan/20 bg-accent-cyan/5 p-3">
            <span className="block text-xs text-content-subtle">Encabezados</span>
            <span className="text-sm text-content">Fila {effectiveStructure.headerRow}</span>
          </div>
          <label className="rounded-lg border border-accent-violet/20 bg-accent-violet/5 p-3">
            <span className="block text-xs text-content-subtle">Detalle desde</span>
            <input
              type="number"
              min={
                effectiveStructure.thresholdsStartRow === undefined
                  ? effectiveStructure.headerRow + 1
                  : effectiveStructure.headerRow + 2
              }
              max={Math.max(sheetMeta?.rowCount ?? 1, effectiveStructure.headerRow + 1)}
              value={effectiveStructure.detailsStartRow}
              onChange={(event) => updateDetailsStart(Number(event.target.value))}
              className="mt-1 w-full rounded border border-overlay/12 bg-overlay/5 px-2 py-1 text-sm text-content-strong"
            />
          </label>
          <label className="flex items-center gap-2 rounded-lg border border-overlay/8 bg-overlay/[0.02] p-3 text-sm text-content">
            <input
              type="checkbox"
              checked={effectiveStructure.thresholdsStartRow !== undefined}
              onChange={(event) => toggleThresholds(event.target.checked)}
              disabled={(sheetMeta?.rowCount ?? 0) < effectiveStructure.headerRow + 2}
              className="h-4 w-4 accent-accent-cyan"
            />
            El reporte incluye resumen de topes
          </label>
        </div>

        {effectiveStructure.thresholdsStartRow !== undefined &&
        effectiveStructure.thresholdsEndRow !== undefined ? (
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-content">
            <span>Topes:</span>
            <label className="flex items-center gap-2">
              desde fila
              <input
                type="number"
                min={effectiveStructure.headerRow + 1}
                max={effectiveStructure.thresholdsEndRow}
                value={effectiveStructure.thresholdsStartRow}
                onChange={(event) => updateThresholdRange('start', Number(event.target.value))}
                className="w-20 rounded border border-overlay/12 bg-overlay/5 px-2 py-1 text-content-strong"
              />
            </label>
            <label className="flex items-center gap-2">
              hasta fila
              <input
                type="number"
                min={effectiveStructure.thresholdsStartRow}
                max={effectiveStructure.detailsStartRow - 1}
                value={effectiveStructure.thresholdsEndRow}
                onChange={(event) => updateThresholdRange('end', Number(event.target.value))}
                className="w-20 rounded border border-overlay/12 bg-overlay/5 px-2 py-1 text-content-strong"
              />
            </label>
          </div>
        ) : null}
      </GlassPanel>

      {/* Fila de encabezados */}
      <GlassPanel className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-medium text-content">Fila de encabezados</h3>
            <p className="text-xs text-content-subtle">
              Detectada automáticamente; ajústala si los títulos están en otra fila.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm text-content">
            Encabezado en la
            <select
              value={effectiveHeaderIndex}
              onChange={(e) => setHeaderRow(Number(e.target.value))}
              className="rounded-lg border border-overlay/12 bg-overlay/5 px-2 py-1.5 text-content-strong"
            >
              {Array.from({ length: Math.max(headerScanLimit, 1) }, (_, i) => (
                <option key={i} value={i} className="bg-surface-raised">
                  Fila {i + 1}
                </option>
              ))}
            </select>
          </label>
        </div>
      </GlassPanel>

      {/* Mapeo manual de columnas */}
      <GlassPanel className="p-5">
        <h3 className="text-sm font-medium text-content">Mapeo de columnas</h3>
        <p className="text-xs text-content-subtle">
          Sugerido automáticamente. Puedes reasignar cada campo a la columna correcta.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {CANONICAL_FIELDS.map((field) => (
            <label key={field} className="flex flex-col gap-1">
              <span className="text-xs text-content-muted">{FIELD_LABELS[field]}</span>
              <select
                value={effectiveMapping[field] ?? ''}
                onChange={(e) => updateMapping(field, e.target.value || null)}
                className="rounded-lg border border-overlay/12 bg-overlay/5 px-2 py-2 text-sm text-content-strong"
              >
                <option value="" className="bg-surface-raised">
                  — Sin asignar —
                </option>
                {columns
                  .filter((c) => !c.isUnnamed)
                  .map((c) => (
                    <option key={c.key} value={c.key} className="bg-surface-raised">
                      {c.path}
                    </option>
                  ))}
              </select>
            </label>
          ))}
        </div>
      </GlassPanel>

      {/* Vista previa */}
      <GlassPanel className="p-5">
        <h3 className="text-sm font-medium text-content">Vista previa</h3>
        <p className="mb-3 text-xs text-content-subtle">
          Mostrando {previewRows.length} de {sheetMeta?.rowCount ?? 0} filas. Los colores distinguen
          encabezado, topes y detalle; el procesamiento siempre usa la hoja completa.
        </p>
        <div className="max-h-80 overflow-auto rounded-lg border border-overlay/8">
          <table className="min-w-full border-collapse text-left text-xs">
            <tbody>
              {previewRows
                .slice(0, PROCESSING_LIMITS.previewRowCount + effectiveHeaderIndex + 1)
                .map((row, r) => {
                  const rowNumber = r + 1;
                  const isHeader = rowNumber === effectiveStructure.headerRow;
                  const isThreshold =
                    effectiveStructure.thresholdsStartRow !== undefined &&
                    effectiveStructure.thresholdsEndRow !== undefined &&
                    rowNumber >= effectiveStructure.thresholdsStartRow &&
                    rowNumber <= effectiveStructure.thresholdsEndRow;
                  const isDetail = rowNumber >= effectiveStructure.detailsStartRow;
                  return (
                    <tr
                      key={r}
                      className={
                        isHeader
                          ? 'bg-accent-cyan/10 font-medium text-content-strong'
                          : isThreshold
                            ? 'bg-amber-400/10 text-tone-amber'
                            : isDetail
                              ? 'bg-accent-violet/5 text-content'
                              : 'text-content-muted'
                      }
                    >
                      <td className="sticky left-0 bg-surface-raised/80 px-2 py-1 text-content-subtle">
                        {r + 1}
                      </td>
                      {Array.from({ length: columnCount }, (_, c) => (
                        <td key={c} className="whitespace-nowrap px-2 py-1">
                          {cellText(row[c] ?? null)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </GlassPanel>

      <div className="flex justify-end">
        <Button
          onClick={() => void runProcessing()}
          disabled={phase === 'processing' || !selectedSheet}
          leadingIcon={<PlayCircle className="h-4 w-4" aria-hidden />}
        >
          {phase === 'processing' ? 'Procesando…' : 'Procesar información'}
        </Button>
      </div>
    </div>
  );
}
