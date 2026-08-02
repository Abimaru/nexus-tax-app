import type {
  DocumentPageRepresentation,
  DocumentSection,
  DocumentSimpleTable,
  DocumentTextBlock,
  DocumentTextLine,
} from './contracts';
import { comparableText } from './normalize';

const SECTION_PATTERNS: readonly [DocumentSection['kind'], RegExp][] = [
  ['balances', /\b(?:saldos?|patrimonio)\b/],
  ['debts', /\b(?:deudas?|pasivos?)\b/],
  ['investments', /\b(?:inversiones?|cdt)\b/],
  ['income', /\b(?:rendimientos?|ingresos?|intereses pagados)\b/],
  ['withholdings', /\bretenciones?\b/],
  ['accounts', /\bcuentas?\b/],
  ['cards', /\btarjetas?\b/],
  ['credits', /\b(?:creditos?|prestamos?)\b/],
  ['products', /\bproductos?\b/],
  ['totals', /^totales?\b/],
  ['observations', /\b(?:observaciones?|notas?|importante)\b/],
];

export function buildPageStructure(
  blocks: readonly DocumentTextBlock[],
  verticalTolerance = 4,
): Pick<DocumentPageRepresentation, 'lines' | 'sections' | 'tables'> {
  const sorted = [...blocks].sort(
    (a, b) => (b.y ?? 0) - (a.y ?? 0) || (a.x ?? 0) - (b.x ?? 0) || (a.index ?? 0) - (b.index ?? 0),
  );
  const rows: { y: number; blocks: DocumentTextBlock[] }[] = [];
  for (const block of sorted) {
    const y = block.y ?? 0;
    const row = rows.find((candidate) => Math.abs(candidate.y - y) <= verticalTolerance);
    if (row) row.blocks.push(block);
    else rows.push({ y, blocks: [block] });
  }
  const lines: DocumentTextLine[] = rows.map((row, index) => {
    row.blocks.sort((a, b) => (a.x ?? 0) - (b.x ?? 0));
    const gaps = row.blocks.slice(1).filter((block, blockIndex) => {
      const prior = row.blocks[blockIndex]!;
      return (block.x ?? 0) - ((prior.x ?? 0) + (prior.width ?? 0)) > 24;
    }).length;
    return {
      id: `line:${index + 1}`,
      text: row.blocks
        .map((block) => block.text)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim(),
      y: row.y,
      blockIndexes: row.blocks.flatMap((block) =>
        typeof block.index === 'number' ? [block.index] : [],
      ),
      columnCount: row.blocks.length ? gaps + 1 : 0,
    };
  });
  const sections = detectSections(lines);
  const tables = detectSimpleTables(lines, blocks, sections);
  return { lines, sections, tables };
}

function detectSections(lines: readonly DocumentTextLine[]): DocumentSection[] {
  const starts = lines.flatMap((line, index) => {
    const normalized = comparableText(line.text);
    const match = SECTION_PATTERNS.find(([, pattern]) => pattern.test(normalized));
    if (!match || line.text.length > 140) return [];
    return [{ index, kind: match[0], label: line.text.slice(0, 120) }];
  });
  return starts.map((section, index) => ({
    id: `section:${section.kind}:${section.index + 1}`,
    label: section.label,
    kind: section.kind,
    startLine: section.index + 1,
    endLine: (starts[index + 1]?.index ?? lines.length) || section.index + 1,
  }));
}

function detectSimpleTables(
  lines: readonly DocumentTextLine[],
  blocks: readonly DocumentTextBlock[],
  sections: readonly DocumentSection[],
): DocumentSimpleTable[] {
  const tabular = lines.filter(
    (line) => line.columnCount >= 2 && /(?:\$|\d[\d.,]{2,})/.test(line.text),
  );
  if (!tabular.length) return [];
  const rowIndexes = new Map(lines.map((line, index) => [line.id, index + 1]));
  return [
    {
      id: 'table:1',
      sectionId:
        sections.find((section) => {
          const first = rowIndexes.get(tabular[0]!.id) ?? 0;
          return first >= section.startLine && first <= section.endLine;
        })?.id ?? null,
      headerLineId:
        [...lines]
          .reverse()
          .find(
            (line) =>
              line.y > tabular[0]!.y && line.columnCount >= 2 && /[a-záéíóúñ]/i.test(line.text),
          )?.id ?? null,
      rowLineIds: tabular.map((line) => line.id),
      columnX: Array.from(
        new Set(
          tabular.flatMap((line) =>
            line.blockIndexes.map((blockIndex) =>
              Math.round(blocks.find((block) => block.index === blockIndex)?.x ?? 0),
            ),
          ),
        ),
      ).sort((a, b) => a - b),
    },
  ];
}
