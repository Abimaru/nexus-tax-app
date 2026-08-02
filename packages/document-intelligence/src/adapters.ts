import type { DocumentFactCandidate, DocumentKind } from '@nexus-tax/domain';
import type {
  AdapterRule,
  CandidateBuildContext,
  DocumentAdapter,
  DocumentRepresentation,
  ExtractionResult,
  PdfReadLimits,
} from './contracts';
import { comparableText, parseColombianAmount, stableDocumentId } from './normalize';

const VERSION = '1.1.0';

function rule(
  id: string,
  labels: string[],
  category: AdapterRule['category'],
  nature: AdapterRule['nature'],
  treatment: AdapterRule['treatment'],
  productType: AdapterRule['productType'] = 'unidentified',
): AdapterRule {
  return {
    id,
    labels: labels.map((label) => new RegExp(label, 'i')),
    category,
    nature,
    treatment,
    productType,
  };
}

function adapter(
  id: string,
  kinds: DocumentKind[],
  signals: string[],
  rules: AdapterRule[],
  limitations: string[] = [],
): DocumentAdapter {
  return {
    id,
    version: VERSION,
    documentKinds: kinds,
    compatibleEntities: [],
    activationSignals: signals.map((signal) => new RegExp(signal, 'i')),
    extractableFields: rules.map((item) => item.id),
    rules,
    limitations,
    confidence: 'medium',
  };
}

export const DOCUMENT_ADAPTERS: readonly DocumentAdapter[] = [
  adapter(
    'co.form-220.generic',
    ['form_220'],
    ['formulario 220|ingresos y retenciones'],
    [
      rule(
        'employment-income',
        ['ingresos laborales', 'pagos por salarios', 'total ingresos'],
        'employment_income',
        'income',
        'add_to_employment_income',
        'employment_income',
      ),
      rule(
        'severance',
        ['cesantias abonadas', 'cesantias pagadas'],
        'severance',
        'income',
        'requires_review',
        'severance',
      ),
      rule(
        'severance-interest',
        ['intereses de cesantias'],
        'severance',
        'income',
        'requires_review',
        'severance',
      ),
      rule(
        'health',
        ['aportes.*salud'],
        'social_security_contribution',
        'possible_deduction',
        'review_as_deduction',
        'employment_income',
      ),
      rule(
        'pension',
        ['aportes.*pension'],
        'social_security_contribution',
        'possible_deduction',
        'review_as_deduction',
        'employment_income',
      ),
      rule(
        'voluntary-pension',
        ['aportes voluntarios'],
        'deduction_candidate',
        'possible_deduction',
        'review_as_deduction',
        'employment_income',
      ),
      rule(
        'withholding',
        ['retencion(?:es)?.*(?:fuente|renta)', 'retenciones'],
        'withholding',
        'tax_credit',
        'subtract_from_tax',
        'employment_income',
      ),
    ],
    ['Los nombres y posiciones de renglones varían entre emisores.'],
  ),
  adapter(
    'co.financial.consolidated.generic',
    ['consolidated_tax_certificate', 'income_withholding_certificate'],
    ['certificado tributario|informacion tributaria'],
    [
      rule(
        'closing-balance',
        [
          'saldo(?:s)?.*(?:31 de diciembre|cierre)',
          'saldo final',
          'saldo a 31',
          'saldo de capital',
          'saldo de capital.*diciembre',
          'aportes sociales.*diciembre',
          'ahorros (?:permanentes|a plazo).*diciembre',
          'certificado.*deposito.*termino.*diciembre',
        ],
        'asset',
        'asset',
        'add_to_assets',
        'savings_account',
      ),
      rule(
        'debt',
        [
          'saldo.*(?:deuda|obligacion)',
          'saldo de capital.*(?:credito|prestamo)',
          'deudas?.*diciembre',
        ],
        'liability',
        'liability',
        'add_to_liabilities',
        'consumer_loan',
      ),
      rule(
        'interest',
        [
          'intereses pagados|rendimientos financieros',
          'intereses sobre ahorros',
          'intereses certificados.*deposito',
          'revalorizacion de aportes sociales',
        ],
        'financial_income',
        'income',
        'add_to_income',
        'savings_account',
      ),
      rule(
        'withholding',
        ['retencion(?:es)?.*(?:fuente|renta)'],
        'withholding',
        'tax_credit',
        'subtract_from_tax',
        'savings_account',
      ),
      rule(
        'gmf',
        ['gravamen.*movimientos financieros|gmf'],
        'deduction_candidate',
        'possible_deduction',
        'review_as_deduction',
        'checking_account',
      ),
      rule(
        'investment',
        ['saldo.*(?:inversion|cdt|fondo)'],
        'investment_asset',
        'asset',
        'add_to_assets',
        'investment_fund',
      ),
      rule(
        'credit-interest-expense',
        ['intereses.*creditos?.*(?:causados|pagados)'],
        'deduction_candidate',
        'possible_deduction',
        'requires_review',
        'consumer_loan',
      ),
      rule(
        'other-financial-income',
        ['premios? fidelidad|auxilios pagados|otros ingresos'],
        'other_income',
        'income',
        'requires_review',
        'employee_fund',
      ),
      rule(
        'third-party-payment',
        ['pagos realizados.*terceros'],
        'informational',
        'informational',
        'do_not_aggregate',
        'employee_fund',
      ),
    ],
    ['Un consolidado puede mezclar productos y requiere confirmación independiente.'],
  ),
  adapter(
    'co.debt.generic',
    ['debt_certificate'],
    ['certificado de deuda|saldo de capital'],
    [
      rule(
        'capital-balance',
        ['saldo de capital'],
        'liability',
        'liability',
        'add_to_liabilities',
        'consumer_loan',
      ),
      rule(
        'interest',
        ['intereses pagados|intereses causados'],
        'deduction_candidate',
        'possible_deduction',
        'requires_review',
        'consumer_loan',
      ),
      rule(
        'total-balance',
        ['saldo total'],
        'liability',
        'liability',
        'requires_review',
        'consumer_loan',
      ),
    ],
  ),
  adapter(
    'co.balance.generic',
    ['balance_certificate'],
    ['certificado de saldos|saldo al cierre'],
    [
      rule(
        'closing-balance',
        ['saldo.*(?:cierre|31 de diciembre)', 'saldo final'],
        'asset',
        'asset',
        'add_to_assets',
        'savings_account',
      ),
    ],
  ),
  adapter(
    'co.housing-interest.generic',
    ['housing_interest_certificate'],
    ['intereses de vivienda|credito hipotecario'],
    [
      rule(
        'housing-interest',
        ['intereses pagados'],
        'deduction_candidate',
        'possible_deduction',
        'review_as_deduction',
        'mortgage_loan',
      ),
      rule(
        'monetary-correction',
        ['correccion monetaria'],
        'deduction_candidate',
        'possible_deduction',
        'requires_review',
        'mortgage_loan',
      ),
      rule(
        'loan-balance',
        ['saldo.*credito'],
        'liability',
        'liability',
        'add_to_liabilities',
        'mortgage_loan',
      ),
    ],
  ),
  adapter(
    'co.severance.generic',
    ['severance_certificate'],
    ['certificado de cesantias|fondo de cesantias'],
    [
      rule(
        'closing-balance',
        ['saldo.*cierre|saldo final'],
        'asset',
        'asset',
        'requires_review',
        'severance',
      ),
      rule(
        'credited',
        ['cesantias abonadas'],
        'severance',
        'income',
        'requires_review',
        'severance',
      ),
      rule('withdrawals', ['retiros'], 'severance', 'income', 'requires_review', 'severance'),
      rule('returns', ['rendimientos'], 'financial_income', 'income', 'add_to_income', 'severance'),
    ],
  ),
  adapter(
    'co.property.generic',
    ['property_tax_certificate'],
    ['avaluo catastral|impuesto predial'],
    [
      rule(
        'cadastral-value',
        ['avaluo catastral'],
        'asset',
        'asset',
        'requires_review',
        'property',
      ),
      rule(
        'property-tax',
        ['impuesto predial'],
        'informational',
        'informational',
        'do_not_aggregate',
        'property',
      ),
      rule(
        'ownership',
        ['porcentaje.*participacion'],
        'informational',
        'informational',
        'do_not_aggregate',
        'property',
      ),
    ],
    ['La extracción no determina por sí sola el valor fiscal declarable.'],
  ),
];

export const GENERIC_DOCUMENT_ADAPTER: DocumentAdapter = adapter(
  'co.generic.label-value',
  ['other'],
  [],
  [
    rule(
      'generic-value',
      ['valor|saldo|total|retencion|interes|ingreso|deuda|avaluo'],
      'unclassified',
      'unclassified',
      'requires_review',
    ),
  ],
  ['Usa coincidencias concepto–valor y siempre exige revisión.'],
);

export function selectAdapter(kind: DocumentKind): DocumentAdapter {
  return (
    DOCUMENT_ADAPTERS.find((item) => item.documentKinds.includes(kind)) ?? GENERIC_DOCUMENT_ADAPTER
  );
}

const VALUE_PATTERN = /(?:cop\s*)?\$?\s*-?\d[\d.,]*(?:,\d{1,2})?/gi;

interface MonetaryMatch {
  raw: string;
  value: number;
  index: number;
}

interface CandidateSeed {
  line: string;
  rule: AdapterRule;
  amount: MonetaryMatch;
  originalConcept?: string;
  detectedLabel?: string;
  productLabel?: string | null;
  score?: number;
}

export function extractCandidates(
  document: DocumentRepresentation,
  kind: DocumentKind,
  context: CandidateBuildContext,
  limits: PdfReadLimits,
): ExtractionResult {
  const selected = selectAdapter(kind);
  const candidates: DocumentFactCandidate[] = [];
  const seen = new Set<string>();
  for (const page of document.pages) {
    const lines = buildExtractionLines(page);
    const rulesWithDetail = new Set(
      selected.rules
        .filter((currentRule) =>
          lines.some(
            (line) =>
              !isTotalLine(line) &&
              currentRule.labels.some((pattern) => pattern.test(comparableText(line))) &&
              monetaryMatches(line).length > 0,
          ),
        )
        .map((currentRule) => currentRule.id),
    );
    const addCandidate = (seed: CandidateSeed) => {
      const normalizedLine = comparableText(seed.line);
      const fingerprint = `${page.pageNumber}|${seed.rule.id}|${seed.amount.value}|${normalizedLine}|${seed.productLabel ?? ''}`;
      if (seen.has(fingerprint)) return;
      seen.add(fingerprint);
      const excerpt = seed.line.trim().slice(0, limits.maxEvidenceLength);
      const score = seed.score ?? (selected === GENERIC_DOCUMENT_ADAPTER ? 42 : 72);
      candidates.push({
        id: `candidate:${stableDocumentId(context.documentId, fingerprint)}`,
        caseId: context.caseId,
        documentId: context.documentId,
        extractionSessionId: context.sessionId,
        page: page.pageNumber,
        proposedEntityId: context.entityId ?? null,
        entityName: context.entityName ?? null,
        proposedProductId: null,
        productType: seed.rule.productType,
        productLabel: seed.productLabel ?? null,
        originalConcept:
          seed.originalConcept ??
          (seed.line
            .slice(0, seed.amount.index)
            .replace(/[:\-\s]+$/, '')
            .trim() ||
            seed.rule.id),
        normalizedConcept: normalizedLine,
        proposedCategory: seed.rule.category,
        proposedNature: seed.rule.nature,
        proposedTreatment: seed.rule.treatment,
        correctedCategory: null,
        correctedNature: null,
        correctedTreatment: null,
        extractedValue: seed.amount.value,
        correctedValue: null,
        finalValue: null,
        currency: 'COP',
        period: detectPeriod(seed.line),
        cutoffDate: detectDate(seed.line),
        evidence: {
          page: page.pageNumber,
          excerpt,
          detectedLabel: seed.detectedLabel ?? seed.rule.id,
          detectedValue: seed.amount.raw.slice(0, 80),
          location: `Página ${page.pageNumber}`,
        },
        adapterId: selected.id,
        adapterVersion: selected.version,
        ruleId: seed.rule.id,
        confidence: {
          level: selected === GENERIC_DOCUMENT_ADAPTER ? 'low' : 'medium',
          score,
          reasons: [
            selected === GENERIC_DOCUMENT_ADAPTER
              ? 'Coincidencia genérica de etiqueta y valor monetario.'
              : seed.score
                ? 'Columna y fila financiera relacionadas por posición.'
                : `Regla ${seed.rule.id} del adaptador ${selected.id}.`,
          ],
        },
        warnings: selected.limitations.slice(),
        status: selected === GENERIC_DOCUMENT_ADAPTER ? 'requires_review' : 'pending',
        possibleDuplicateIds: [],
        suggestedRequirementIds: [...(context.requirementIds ?? [])],
        suggestedExogenousMatches: [],
        selectedExogenousRecordId: null,
        observation: '',
        factId: null,
        decisions: [],
        createdAt: context.timestamp,
        updatedAt: context.timestamp,
      });
    };

    for (const [lineIndex, line] of lines.entries()) {
      const normalizedLine = comparableText(line);
      if (isExplanatoryLine(normalizedLine, line)) continue;
      for (const currentRule of selected.rules) {
        const label = currentRule.labels.find((pattern) => pattern.test(normalizedLine));
        if (!label) continue;
        if (isTotalLine(line) && rulesWithDetail.has(currentRule.id)) continue;
        for (const amount of monetaryMatches(line)) {
          addCandidate({
            line,
            rule: currentRule,
            amount,
            detectedLabel: currentRule.id,
            productLabel: nearbyProductLabel(lines, lineIndex),
          });
        }
      }
    }

    for (const seed of extractPositionedTableSeeds(page, selected.rules)) addCandidate(seed);

    if (candidates.length >= limits.maxCandidates) {
      return {
        adapter: selected,
        candidates: candidates.slice(0, limits.maxCandidates),
        warnings: ['Se alcanzó el límite de candidatos configurado.'],
      };
    }
  }
  markDuplicates(candidates);
  return { adapter: selected, candidates, warnings: [] };
}

function buildExtractionLines(page: DocumentRepresentation['pages'][number]): string[] {
  const lines = page.normalizedText
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const positioned = positionedRows(page)
    .map((row) =>
      row.cells
        .map((cell) => cell.text)
        .join(' ')
        .trim(),
    )
    .filter(Boolean);
  return Array.from(new Set([...lines, ...positioned]));
}

function monetaryMatches(line: string): MonetaryMatch[] {
  const normalized = comparableText(line);
  if (isExplanatoryLine(normalized, line)) return [];
  return [...line.matchAll(VALUE_PATTERN)].flatMap((match) => {
    const raw = match[0];
    const index = match.index ?? 0;
    const value = parseColombianAmount(raw);
    if (value === null || isOutlineNumber(line, raw, index)) return [];
    const following = line.slice(index + raw.length, index + raw.length + 2);
    const preceding = line.slice(Math.max(0, index - 1), index);
    if (following.includes('%') || /[xX]$/.test(preceding) || /^[xX]/.test(following)) return [];
    if (Number.isInteger(value) && value >= 1900 && value <= 2100) return [];
    const explicitCurrency = /(?:\$|cop)/i.test(raw);
    const formatted = /[.,]/.test(raw);
    const terminalZero = value === 0 && line.slice(index + raw.length).trim() === '';
    if (!explicitCurrency && !formatted && Math.abs(value) < 10_000 && !terminalZero) return [];
    return [{ raw, value, index }];
  });
}

function isOutlineNumber(line: string, raw: string, index: number): boolean {
  if (index > 6) return false;
  return /^\s*\d+(?:\.\d+)+\s/.test(line) && /^\s*\d+(?:\.\d+)+/.test(raw);
}

function isExplanatoryLine(normalizedLine: string, originalLine: string): boolean {
  if (/\b(?:articulo|estatuto tributario|decreto|ley)\b/.test(normalizedLine)) return true;
  return (
    /(?:solo el\s+\d+\s*%|es deducible|4x1000)/.test(normalizedLine) &&
    !/(?:\$|cop)/i.test(originalLine)
  );
}

function isTotalLine(line: string): boolean {
  return /^\s*(?:\*+\s*)?total(?:es)?\b/i.test(line);
}

function nearbyProductLabel(lines: readonly string[], index: number): string | null {
  for (let cursor = index; cursor >= Math.max(0, index - 8); cursor -= 1) {
    const label = productLabelFromText(lines[cursor] ?? '');
    if (label) return label;
  }
  return null;
}

function productLabelFromText(value: string): string | null {
  const withoutAmount = value.replace(VALUE_PATTERN, ' ').replace(/\s+/g, ' ').trim();
  const normalized = comparableText(withoutAmount);
  if (/^(?:tu|tus)\s+(?:cuenta|tarjeta|cdt|fondo|credito)/.test(normalized)) {
    return withoutAmount.slice(0, 120);
  }
  if (
    /^(?:cuenta (?:de )?ahorros?|cuenta corriente|deposito|tarjeta de credito|cdt)\b/.test(
      normalized,
    )
  ) {
    return withoutAmount.slice(0, 120);
  }
  return null;
}

interface PositionedRow {
  y: number;
  cells: { text: string; x: number }[];
}

function positionedRows(page: DocumentRepresentation['pages'][number]): PositionedRow[] {
  const blocks = page.blocks
    .filter(
      (block): block is typeof block & { x: number; y: number } =>
        typeof block.x === 'number' && typeof block.y === 'number',
    )
    .sort((a, b) => b.y - a.y || a.x - b.x);
  const rows: PositionedRow[] = [];
  for (const block of blocks) {
    const row = rows.find((item) => Math.abs(item.y - block.y) <= 4);
    if (row) row.cells.push({ text: block.text, x: block.x });
    else rows.push({ y: block.y, cells: [{ text: block.text, x: block.x }] });
  }
  for (const row of rows) row.cells.sort((a, b) => a.x - b.x);
  return rows;
}

function extractPositionedTableSeeds(
  page: DocumentRepresentation['pages'][number],
  rules: readonly AdapterRule[],
): CandidateSeed[] {
  const rows = positionedRows(page);
  const seeds: CandidateSeed[] = [];
  let headers: { x: number; y: number; label: string; rule: AdapterRule }[] = [];
  let sectionLabel: string | null = null;
  for (const row of rows) {
    const rowText = row.cells.map((cell) => cell.text).join(' ');
    const normalizedRow = comparableText(rowText);
    const directProduct = productLabelFromText(rowText);
    if (directProduct) sectionLabel = directProduct;
    if (/^productos? de\b/.test(normalizedRow)) sectionLabel = rowText.trim().slice(0, 120);

    const detectedHeaders = row.cells.flatMap((cell) => {
      if (monetaryMatches(cell.text).length) return [];
      const headerLabel = rows
        .filter((nearbyRow) => Math.abs(nearbyRow.y - row.y) <= 36)
        .flatMap((nearbyRow) =>
          nearbyRow.cells.filter(
            (nearbyCell) =>
              Math.abs(nearbyCell.x - cell.x) <= 24 &&
              monetaryMatches(nearbyCell.text).length === 0,
          ),
        )
        .map((nearbyCell) => nearbyCell.text)
        .join(' ');
      const normalizedCell = comparableText(headerLabel);
      if (/^base gravable\b/.test(normalizedCell)) return [];
      const currentRule = rules.find((ruleItem) =>
        ruleItem.labels.some((pattern) => pattern.test(normalizedCell)),
      );
      return currentRule ? [{ x: cell.x, y: row.y, label: headerLabel, rule: currentRule }] : [];
    });
    if (detectedHeaders.length >= 2) {
      headers = detectedHeaders;
      continue;
    }
    if (!headers.length || row.y > headers[0]!.y || headers[0]!.y - row.y > 220) continue;
    if (isTotalLine(rowText)) continue;

    const rowProduct = productLabelFromRow(row) ?? sectionLabel;
    for (const cell of row.cells) {
      const amount = monetaryMatches(cell.text)[0];
      if (!amount) continue;
      const header = headers.reduce((nearest, current) =>
        Math.abs(current.x - cell.x) < Math.abs(nearest.x - cell.x) ? current : nearest,
      );
      const orderedHeaders = [...headers].sort((a, b) => a.x - b.x);
      const headerIndex = orderedHeaders.findIndex((item) => item === header);
      const previousHeader = orderedHeaders[headerIndex - 1];
      const nextHeader = orderedHeaders[headerIndex + 1];
      const leftBoundary =
        previousHeader === undefined
          ? header.x - ((nextHeader?.x ?? header.x + 160) - header.x) / 2
          : (previousHeader.x + header.x) / 2;
      const rightBoundary =
        nextHeader === undefined
          ? header.x + (header.x - (previousHeader?.x ?? header.x - 160)) / 2
          : (header.x + nextHeader.x) / 2;
      if (cell.x < leftBoundary || cell.x >= rightBoundary) continue;
      seeds.push({
        line: rowText,
        rule: header.rule,
        amount: { ...amount, index: Math.max(0, rowText.indexOf(cell.text)) },
        originalConcept: rowProduct ? `${header.label} · ${rowProduct}` : header.label,
        detectedLabel: header.label,
        productLabel: rowProduct,
        score: 78,
      });
    }
  }
  return seeds;
}

function productLabelFromRow(row: PositionedRow): string | null {
  const labels = row.cells
    .filter((cell) => /[a-záéíóúñ]/i.test(cell.text) && monetaryMatches(cell.text).length === 0)
    .map((cell) => cell.text.trim())
    .filter((text) => !/^(?:total|totales)$/i.test(text));
  if (!labels.length) return null;
  return labels.join(' ').replace(/\s+/g, ' ').slice(0, 120);
}

function detectPeriod(value: string): string | null {
  return value.match(/\b20\d{2}\b/)?.[0] ?? null;
}

function detectDate(value: string): string | null {
  const match = value.match(/\b(20\d{2})[-/]([01]?\d)[-/]([0-3]?\d)\b/);
  return match ? `${match[1]}-${match[2]!.padStart(2, '0')}-${match[3]!.padStart(2, '0')}` : null;
}

function markDuplicates(candidates: DocumentFactCandidate[]) {
  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index]!;
    const duplicates = candidates
      .slice(0, index)
      .filter(
        (prior) =>
          prior.extractedValue === candidate.extractedValue &&
          prior.proposedCategory === candidate.proposedCategory,
      )
      .map((prior) => prior.id);
    if (duplicates.length) {
      candidate.possibleDuplicateIds = duplicates;
      candidate.warnings.push('Existe otro candidato con el mismo valor y categoría.');
    }
  }
}
