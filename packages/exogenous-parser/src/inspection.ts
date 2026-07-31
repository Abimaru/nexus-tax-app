import type { ColumnMapping, ExogenousReportStructure } from '@nexus-tax/domain';
import { buildColumns } from './columns';
import { detectHeaderRow } from './headers';
import { guessColumnMapping } from './mapping';
import { detectReportSections } from './sections';
import { buildWorkbookPreviews, type ReadWorkbookResult, type SheetPreview } from './workbook';

/** Inspección derivada de `fullRows`; `previewRows` solo acompaña para render. */
export interface SheetInspection extends SheetPreview {
  detectedHeaderRowIndex: number;
  detectedColumnMapping: ColumnMapping;
  detectedStructure: ExogenousReportStructure;
  structureConfidence: number;
}

export function inspectWorkbookSheets(
  read: ReadWorkbookResult,
  previewRowLimit: number,
  maxHeaderScanRows: number,
): SheetInspection[] {
  const previews = new Map(
    buildWorkbookPreviews(read, previewRowLimit).map((preview) => [preview.name, preview]),
  );

  return read.metadata.sheets.map((sheet) => {
    const fullRows = read.fullRows[sheet.name] ?? [];
    const detectedHeader = detectHeaderRow(fullRows, maxHeaderScanRows);
    const columns = buildColumns(
      fullRows[detectedHeader.headerRowIndex] ?? [],
      sheet.columnCount,
      fullRows[detectedHeader.headerRowIndex - 1] ?? [],
    );
    const detectedColumnMapping = guessColumnMapping(columns);
    const sections = detectReportSections(
      fullRows,
      detectedHeader.headerRowIndex,
      columns,
      detectedColumnMapping,
    );

    return {
      name: sheet.name,
      previewRows: previews.get(sheet.name)?.previewRows ?? [],
      detectedHeaderRowIndex: detectedHeader.headerRowIndex,
      detectedColumnMapping,
      detectedStructure: sections.structure,
      structureConfidence: sections.confidence,
    };
  });
}
