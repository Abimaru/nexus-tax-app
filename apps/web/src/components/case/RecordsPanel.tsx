'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowDownUp, Download, FilterX, Search } from 'lucide-react';
import type {
  CaseAnalysis,
  ClassificationSnapshot,
  IdentityMatchStatus,
  MatrixEntryDisposition,
  NormalizedExogenousRecord,
  ProcessingResult,
  RecordRelationType,
  ResolutionStatus,
  TaxCategory,
  TaxNature,
  TaxTreatment,
} from '@nexus-tax/domain';
import { maskDocument, toNormalizedJson } from '@nexus-tax/exogenous-parser';
import { Badge, Button, EmptyState, GlassPanel, formatCurrencyCOP } from '@nexus-tax/ui';
import { downloadTextFile, safeBaseName } from '@/lib/download';
import {
  CATEGORY_LABEL,
  DISPOSITION_LABEL,
  NATURE_LABEL,
  RELATION_LABEL,
  RESOLUTION_LABEL,
  TREATMENT_LABEL,
} from '@/lib/analysisPresentation';

type SortKey = 'row' | 'entity' | 'concept' | 'value';
type SortDir = 'asc' | 'desc';

const PAGE_SIZE = 25;

const IDENTITY_LABEL: Record<IdentityMatchStatus, string> = {
  matched: 'Coincide',
  mismatched: 'No coincide',
  unavailable: 'No disponible',
};

const CONFIDENCE_LABEL: Record<string, string> = {
  high: 'Alta',
  medium: 'Media',
  low: 'Baja',
};

type BadgeToneName = 'neutral' | 'cyan' | 'violet' | 'amber' | 'rose' | 'emerald';

function identityBadgeTone(status: IdentityMatchStatus): BadgeToneName {
  if (status === 'matched') return 'emerald';
  if (status === 'mismatched') return 'rose';
  return 'neutral';
}

function dispositionBadgeTone(disposition: MatrixEntryDisposition): BadgeToneName {
  if (disposition === 'included') return 'emerald';
  if (disposition === 'pending') return 'amber';
  if (disposition === 'excluded') return 'rose';
  return 'neutral';
}

interface RecordsPanelProps {
  result: ProcessingResult;
  analysis?: CaseAnalysis;
  focusRecordId: string | null;
  onFocusHandled: () => void;
}

function recordViewState(record: NormalizedExogenousRecord, analysis?: CaseAnalysis) {
  const resolution = analysis?.resolutions.find((item) => item.recordId === record.id);
  const classification: ClassificationSnapshot =
    resolution && !resolution.isObsolete
      ? resolution.finalClassification
      : {
          category: record.category,
          nature: record.nature,
          treatment: record.treatment,
          confidence: record.confidence,
          evidence: record.classificationEvidence,
        };
  const resolutionStatus = resolution?.isObsolete
    ? ('pending_review' as const)
    : (resolution?.status ?? ('automatically_resolved' as const));
  const relations =
    analysis?.relationships.filter(
      (item) => item.sourceRecordId === record.id || item.targetRecordId === record.id,
    ) ?? [];
  let disposition: MatrixEntryDisposition = record.consolidationDisposition;
  if (resolutionStatus === 'pending_review') disposition = 'pending';
  else if (resolutionStatus === 'excluded_justified' || resolutionStatus === 'ignored_justified') {
    disposition = 'excluded';
  } else if (classification.nature === 'informational') disposition = 'informational';
  else if (classification.category === 'electronic_invoicing_benefit_base') {
    disposition = 'excluded';
  } else if (
    relations.some((item) => item.type === 'summary_of' && item.targetRecordId === record.id)
  ) {
    disposition = 'excluded';
  } else if (
    relations.some(
      (item) => item.type === 'possible_duplicate_of' && item.reviewStatus === 'pending_review',
    )
  ) {
    disposition = 'pending';
  } else if (resolutionStatus === 'analyst_modified') {
    disposition = classification.category === 'unclassified' ? 'pending' : 'included';
  }
  return { classification, resolutionStatus, relations, disposition };
}

export function RecordsPanel({
  result,
  analysis,
  focusRecordId,
  onFocusHandled,
}: RecordsPanelProps) {
  const [query, setQuery] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<TaxCategory | 'all'>('all');
  const [identityFilter, setIdentityFilter] = useState<IdentityMatchStatus | 'all'>('all');
  const [natureFilter, setNatureFilter] = useState<TaxNature | 'all'>('all');
  const [treatmentFilter, setTreatmentFilter] = useState<TaxTreatment | 'all'>('all');
  const [resolutionFilter, setResolutionFilter] = useState<ResolutionStatus | 'all'>('all');
  const [relationFilter, setRelationFilter] = useState<RecordRelationType | 'all'>('all');
  const [dispositionFilter, setDispositionFilter] = useState<MatrixEntryDisposition | 'all'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('row');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [page, setPage] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const entityNames = useMemo(
    () =>
      Array.from(new Set(result.entities.map((e) => e.name))).sort((a, b) =>
        a.localeCompare(b, 'es'),
      ),
    [result.entities],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = result.normalizedRecords.filter((r) => {
      const state = recordViewState(r, analysis);
      if (entityFilter && r.entityName !== entityFilter) return false;
      if (categoryFilter !== 'all' && state.classification.category !== categoryFilter)
        return false;
      if (identityFilter !== 'all' && r.identityMatch !== identityFilter) return false;
      if (natureFilter !== 'all' && state.classification.nature !== natureFilter) return false;
      if (treatmentFilter !== 'all' && state.classification.treatment !== treatmentFilter)
        return false;
      if (resolutionFilter !== 'all' && state.resolutionStatus !== resolutionFilter) return false;
      if (
        relationFilter !== 'all' &&
        !state.relations.some((item) => item.type === relationFilter)
      ) {
        return false;
      }
      if (dispositionFilter !== 'all' && state.disposition !== dispositionFilter) return false;
      if (!q) return true;
      return [r.entityName, r.reportingEntityDocument, r.conceptCode, r.conceptLabel]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });

    const dir = sortDir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      switch (sortKey) {
        case 'entity':
          return (a.entityName ?? '').localeCompare(b.entityName ?? '', 'es') * dir;
        case 'concept':
          return (
            (a.conceptLabel ?? a.conceptCode ?? '').localeCompare(
              b.conceptLabel ?? b.conceptCode ?? '',
              'es',
            ) * dir
          );
        case 'value':
          return ((a.reportedValue ?? 0) - (b.reportedValue ?? 0)) * dir;
        case 'row':
        default:
          return (a.source.row - b.source.row) * dir;
      }
    });
  }, [
    result.normalizedRecords,
    query,
    entityFilter,
    categoryFilter,
    identityFilter,
    natureFilter,
    treatmentFilter,
    resolutionFilter,
    relationFilter,
    dispositionFilter,
    analysis,
    sortKey,
    sortDir,
  ]);

  // Navegación desde Hallazgos: limpia filtros y salta a la página del registro.
  useEffect(() => {
    if (!focusRecordId) return;
    setQuery('');
    setEntityFilter('');
    setCategoryFilter('all');
    setIdentityFilter('all');
    setNatureFilter('all');
    setTreatmentFilter('all');
    setResolutionFilter('all');
    setRelationFilter('all');
    setDispositionFilter('all');
    setSortKey('row');
    setSortDir('asc');
    const index = result.normalizedRecords
      .slice()
      .sort((a, b) => a.source.row - b.source.row)
      .findIndex((r) => r.id === focusRecordId);
    if (index >= 0) setPage(Math.floor(index / PAGE_SIZE));
    setExpandedId(focusRecordId);
    onFocusHandled();
  }, [focusRecordId, result.normalizedRecords, onFocusHandled]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  function handleExport() {
    const json = toNormalizedJson(result);
    downloadTextFile(`${safeBaseName(result.workbook.fileName)}.normalized.json`, json);
  }

  const hasActiveFilters =
    query.trim() !== '' ||
    entityFilter !== '' ||
    categoryFilter !== 'all' ||
    identityFilter !== 'all' ||
    natureFilter !== 'all' ||
    treatmentFilter !== 'all' ||
    resolutionFilter !== 'all' ||
    relationFilter !== 'all' ||
    dispositionFilter !== 'all';

  function clearFilters() {
    setQuery('');
    setEntityFilter('');
    setCategoryFilter('all');
    setIdentityFilter('all');
    setNatureFilter('all');
    setTreatmentFilter('all');
    setResolutionFilter('all');
    setRelationFilter('all');
    setDispositionFilter('all');
    setPage(0);
  }

  return (
    <div className="flex flex-col gap-4">
      <GlassPanel className="p-4">
        {/* Fila 1: búsqueda + acciones, siempre alineadas */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-[200px] flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-content-subtle"
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
              placeholder="Buscar por entidad, NIT o concepto…"
              aria-label="Buscar registros"
              className="w-full rounded-xl border border-overlay/12 bg-overlay/5 py-2 pl-9 pr-3 text-sm text-content-strong placeholder:text-content-subtle focus-visible:border-accent-cyan/50"
            />
          </div>
          <div className="flex items-center gap-2">
            {hasActiveFilters ? (
              <Button
                variant="ghost"
                onClick={clearFilters}
                leadingIcon={<FilterX className="h-4 w-4" aria-hidden />}
              >
                Limpiar filtros
              </Button>
            ) : null}
            <Button
              variant="secondary"
              onClick={handleExport}
              leadingIcon={<Download className="h-4 w-4" aria-hidden />}
            >
              Exportar JSON
            </Button>
          </div>
        </div>

        {/* Fila 2: filtros de ancho uniforme en grilla ordenada */}
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          <FilterSelect
            label="Filtrar por entidad"
            allLabel="Todas las entidades"
            allValue=""
            value={entityFilter}
            options={entityNames.map((name) => ({ value: name, label: name }))}
            onChange={(value) => {
              setEntityFilter(value);
              setPage(0);
            }}
          />
          <FilterSelect
            label="Filtrar por categoría tributaria"
            allLabel="Todas las categorías"
            value={categoryFilter}
            options={Object.entries(CATEGORY_LABEL).map(([value, label]) => ({ value, label }))}
            onChange={(value) => {
              setCategoryFilter(value as TaxCategory | 'all');
              setPage(0);
            }}
          />
          <FilterSelect
            label="Filtrar por coincidencia de identidad"
            allLabel="Toda coincidencia"
            value={identityFilter}
            options={Object.entries(IDENTITY_LABEL).map(([value, label]) => ({ value, label }))}
            onChange={(value) => {
              setIdentityFilter(value as IdentityMatchStatus | 'all');
              setPage(0);
            }}
          />
          <FilterSelect
            label="Filtrar por naturaleza"
            allLabel="Toda naturaleza"
            value={natureFilter}
            options={Object.entries(NATURE_LABEL).map(([value, label]) => ({ value, label }))}
            onChange={(value) => {
              setNatureFilter(value as TaxNature | 'all');
              setPage(0);
            }}
          />
          <FilterSelect
            label="Filtrar por tratamiento"
            allLabel="Todo tratamiento"
            value={treatmentFilter}
            options={Object.entries(TREATMENT_LABEL).map(([value, label]) => ({ value, label }))}
            onChange={(value) => {
              setTreatmentFilter(value as TaxTreatment | 'all');
              setPage(0);
            }}
          />
          <FilterSelect
            label="Filtrar por estado de resolución"
            allLabel="Toda resolución"
            value={resolutionFilter}
            options={Object.entries(RESOLUTION_LABEL).map(([value, label]) => ({ value, label }))}
            onChange={(value) => {
              setResolutionFilter(value as ResolutionStatus | 'all');
              setPage(0);
            }}
          />
          <FilterSelect
            label="Filtrar por tipo de relación"
            allLabel="Toda relación"
            value={relationFilter}
            options={Object.entries(RELATION_LABEL).map(([value, label]) => ({ value, label }))}
            onChange={(value) => {
              setRelationFilter(value as RecordRelationType | 'all');
              setPage(0);
            }}
          />
          <FilterSelect
            label="Filtrar por consolidación"
            allLabel="Todo consolidado"
            value={dispositionFilter}
            options={Object.entries(DISPOSITION_LABEL).map(([value, label]) => ({ value, label }))}
            onChange={(value) => {
              setDispositionFilter(value as MatrixEntryDisposition | 'all');
              setPage(0);
            }}
          />
        </div>
      </GlassPanel>

      {filtered.length === 0 ? (
        <EmptyState title="Sin registros" description="Ajusta la búsqueda o los filtros." />
      ) : (
        <GlassPanel className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-overlay/8 text-xs uppercase tracking-wide text-content-muted">
                <tr>
                  <SortableTh
                    label="Fila"
                    active={sortKey === 'row'}
                    dir={sortDir}
                    onClick={() => toggleSort('row')}
                  />
                  <SortableTh
                    label="Entidad"
                    active={sortKey === 'entity'}
                    dir={sortDir}
                    onClick={() => toggleSort('entity')}
                  />
                  <SortableTh
                    label="Concepto"
                    active={sortKey === 'concept'}
                    dir={sortDir}
                    onClick={() => toggleSort('concept')}
                  />
                  <th className="px-4 py-2.5">Clasificación</th>
                  <SortableTh
                    label="Valor"
                    active={sortKey === 'value'}
                    dir={sortDir}
                    onClick={() => toggleSort('value')}
                    align="right"
                  />
                </tr>
              </thead>
              <tbody>
                {pageRows.map((record) => (
                  <RecordRow
                    key={record.id}
                    record={record}
                    analysis={analysis}
                    expanded={expandedId === record.id}
                    onToggle={() => setExpandedId((id) => (id === record.id ? null : record.id))}
                  />
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-overlay/8 px-4 py-3 text-xs text-content-muted">
            <span>
              {filtered.length} registro(s) · página {currentPage + 1} de {pageCount}
            </span>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                disabled={currentPage === 0}
                onClick={() => setPage(currentPage - 1)}
              >
                Anterior
              </Button>
              <Button
                variant="ghost"
                disabled={currentPage >= pageCount - 1}
                onClick={() => setPage(currentPage + 1)}
              >
                Siguiente
              </Button>
            </div>
          </div>
        </GlassPanel>
      )}
    </div>
  );
}

function SortableTh({
  label,
  active,
  dir,
  onClick,
  align = 'left',
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
  align?: 'left' | 'right';
}) {
  return (
    <th className={`px-4 py-2.5 ${align === 'right' ? 'text-right' : ''}`}>
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center gap-1 ${active ? 'text-content-strong' : ''}`}
        aria-label={`Ordenar por ${label}`}
      >
        {label}
        <ArrowDownUp className="h-3 w-3 opacity-60" aria-hidden />
        {active ? (
          <span className="sr-only">{dir === 'asc' ? 'ascendente' : 'descendente'}</span>
        ) : null}
      </button>
    </th>
  );
}

/** Desplegable de filtro con ancho uniforme para la grilla. */
function FilterSelect({
  label,
  value,
  allLabel,
  allValue = 'all',
  options,
  onChange,
}: {
  label: string;
  value: string;
  allLabel: string;
  allValue?: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label={label}
      className="w-full rounded-xl border border-overlay/12 bg-overlay/5 px-3 py-2 text-sm text-content-strong focus-visible:border-accent-cyan/50"
    >
      <option value={allValue} className="bg-surface-raised">
        {allLabel}
      </option>
      {options.map((option) => (
        <option key={option.value} value={option.value} className="bg-surface-raised">
          {option.label}
        </option>
      ))}
    </select>
  );
}

type DotTone = 'emerald' | 'rose' | 'amber' | 'cyan' | 'slate';

const DOT_TONE_CLASS: Record<DotTone, string> = {
  emerald: 'bg-emerald-400',
  rose: 'bg-rose-400',
  amber: 'bg-amber-400',
  cyan: 'bg-accent-cyan',
  slate: 'bg-slate-500',
};

/** Punto de estado: hace la lectura no dependiente solo del texto. */
function StatusDot({ tone }: { tone: DotTone }) {
  return (
    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOT_TONE_CLASS[tone]}`} aria-hidden />
  );
}

function categoryTone(category: TaxCategory): 'amber' | 'neutral' | 'cyan' {
  if (category === 'unclassified') return 'amber';
  if (category === 'informational') return 'neutral';
  return 'cyan';
}

function identityTone(status: IdentityMatchStatus): DotTone {
  if (status === 'matched') return 'emerald';
  if (status === 'mismatched') return 'rose';
  return 'slate';
}

function resolutionTone(status: ResolutionStatus): DotTone {
  if (status === 'pending_review') return 'amber';
  if (status === 'analyst_confirmed' || status === 'analyst_modified') return 'cyan';
  if (status === 'excluded_justified' || status === 'ignored_justified') return 'rose';
  return 'slate';
}

/** Sección etiquetada del detalle expandido de un registro. */
function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h4 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-content-subtle">
        {title}
      </h4>
      {children}
    </section>
  );
}

/** Par etiqueta/valor dentro de una sección de detalle. */
function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-content-subtle">{label}</dt>
      <dd className="mt-0.5 text-content">{value}</dd>
    </div>
  );
}

function RecordRow({
  record,
  analysis,
  expanded,
  onToggle,
}: {
  record: NormalizedExogenousRecord;
  analysis?: CaseAnalysis;
  expanded: boolean;
  onToggle: () => void;
}) {
  const state = recordViewState(record, analysis);
  return (
    <>
      <tr
        className={`cursor-pointer border-b border-overlay/5 transition-colors hover:bg-overlay/[0.03] ${expanded ? 'bg-overlay/[0.03]' : ''}`}
        onClick={onToggle}
      >
        <td className="px-4 py-3 align-top text-content-subtle">{record.source.row}</td>
        <td className="px-4 py-3 align-top">
          <span className="text-content-strong">{record.entityName ?? '—'}</span>
          {record.reportingEntityDocument ? (
            <span className="block text-xs text-content-subtle">
              {record.reportingEntityDocument}
            </span>
          ) : null}
        </td>
        <td className="px-4 py-3 align-top text-content">
          {record.conceptLabel ?? record.conceptCode ?? '—'}
        </td>
        <td className="px-4 py-3 align-top">
          <div className="flex min-w-[190px] flex-col gap-1.5">
            <Badge tone={categoryTone(state.classification.category)}>
              {CATEGORY_LABEL[state.classification.category]}
            </Badge>
            <div className="flex flex-col gap-1 text-[11px] leading-tight text-content-muted">
              <span className="inline-flex items-center gap-1.5">
                <StatusDot tone={identityTone(record.identityMatch)} />
                {IDENTITY_LABEL[record.identityMatch]}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <StatusDot tone={resolutionTone(state.resolutionStatus)} />
                {RESOLUTION_LABEL[state.resolutionStatus]}
              </span>
            </div>
          </div>
        </td>
        <td className="px-4 py-3 align-top text-right font-medium text-content-strong">
          {record.reportedValue !== null ? formatCurrencyCOP(record.reportedValue) : '—'}
        </td>
      </tr>
      {expanded ? (
        <tr className="border-b border-overlay/5 bg-surface-raised/40">
          <td colSpan={5} className="px-4 py-4">
            <div className="flex flex-col gap-4">
              {/* Clasificación tributaria */}
              <DetailSection title="Clasificación">
                <dl className="grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
                  <DetailField
                    label="Categoría"
                    value={CATEGORY_LABEL[state.classification.category]}
                  />
                  <DetailField
                    label="Naturaleza"
                    value={NATURE_LABEL[state.classification.nature]}
                  />
                  <DetailField
                    label="Tratamiento"
                    value={TREATMENT_LABEL[state.classification.treatment]}
                  />
                  <DetailField
                    label="Confianza"
                    value={
                      CONFIDENCE_LABEL[state.classification.confidence] ?? 'Confianza no reconocida'
                    }
                  />
                </dl>
              </DetailSection>

              {/* Trazabilidad del registro */}
              <DetailSection title="Trazabilidad">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="cyan">
                    Origen: {record.source.sheet} · fila {record.source.row}
                  </Badge>
                  {record.withholding !== null ? (
                    <Badge tone="violet">Retención: {formatCurrencyCOP(record.withholding)}</Badge>
                  ) : null}
                  <Badge tone={identityBadgeTone(record.identityMatch)}>
                    Identidad: {IDENTITY_LABEL[record.identityMatch]} ·{' '}
                    {maskDocument(record.reportedPersonDocument)}
                  </Badge>
                </div>
              </DetailSection>

              {/* Estado de consolidación */}
              <DetailSection title="Consolidación">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={dispositionBadgeTone(state.disposition)}>
                    {DISPOSITION_LABEL[state.disposition]}
                  </Badge>
                  {state.relations.some((item) => item.type === 'subset_of') ? (
                    <Badge tone="violet">Subconjunto</Badge>
                  ) : null}
                  {state.relations.some((item) => item.type === 'summary_of') ? (
                    <Badge tone="cyan">Resumen</Badge>
                  ) : null}
                </div>
              </DetailSection>

              {state.relations.length ? (
                <DetailSection title="Relaciones">
                  <ul className="space-y-1 text-xs text-content">
                    {state.relations.map((relation) => (
                      <li key={relation.id}>
                        {RELATION_LABEL[relation.type]} · confianza {relation.confidence}
                      </li>
                    ))}
                  </ul>
                </DetailSection>
              ) : null}

              {record.suggestedUse ? (
                <DetailSection title="Uso declaración sugerida">
                  <p className="text-xs text-content">{record.suggestedUse.originalText}</p>
                  {record.suggestedUse.boxReferences.length ? (
                    <p className="mt-1 text-xs text-content-subtle">
                      Casillas:{' '}
                      {record.suggestedUse.boxReferences
                        .map((reference) => reference.code)
                        .join(', ')}
                    </p>
                  ) : null}
                </DetailSection>
              ) : null}

              {Object.keys(record.extra).length > 0 ? (
                <DetailSection title="Columnas adicionales">
                  <dl className="grid gap-x-6 gap-y-1 text-xs sm:grid-cols-2">
                    {Object.entries(record.extra).map(([key, value]) => (
                      <div
                        key={key}
                        className="flex justify-between gap-4 border-b border-overlay/5 py-1"
                      >
                        <dt className="text-content-subtle">{key}</dt>
                        <dd className="text-content">{value === null ? '—' : String(value)}</dd>
                      </div>
                    ))}
                  </dl>
                </DetailSection>
              ) : null}
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}
