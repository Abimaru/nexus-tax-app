'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowDownUp, Download, Search } from 'lucide-react';
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

  return (
    <div className="flex flex-col gap-4">
      <GlassPanel className="flex flex-wrap items-center gap-3 p-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
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
            className="w-full rounded-xl border border-white/12 bg-white/5 py-2 pl-9 pr-3 text-sm text-slate-100 placeholder:text-slate-500"
          />
        </div>
        <select
          value={entityFilter}
          onChange={(e) => {
            setEntityFilter(e.target.value);
            setPage(0);
          }}
          aria-label="Filtrar por entidad"
          className="rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-sm text-slate-100"
        >
          <option value="" className="bg-surface-raised">
            Todas las entidades
          </option>
          {entityNames.map((name) => (
            <option key={name} value={name} className="bg-surface-raised">
              {name}
            </option>
          ))}
        </select>
        <select
          value={categoryFilter}
          onChange={(event) => {
            setCategoryFilter(event.target.value as TaxCategory | 'all');
            setPage(0);
          }}
          aria-label="Filtrar por categoría tributaria"
          className="rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-sm text-slate-100"
        >
          <option value="all" className="bg-surface-raised">
            Todas las categorías
          </option>
          {Object.entries(CATEGORY_LABEL).map(([value, label]) => (
            <option key={value} value={value} className="bg-surface-raised">
              {label}
            </option>
          ))}
        </select>
        <select
          value={identityFilter}
          onChange={(event) => {
            setIdentityFilter(event.target.value as IdentityMatchStatus | 'all');
            setPage(0);
          }}
          aria-label="Filtrar por coincidencia de identidad"
          className="rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-sm text-slate-100"
        >
          <option value="all" className="bg-surface-raised">
            Toda coincidencia
          </option>
          {Object.entries(IDENTITY_LABEL).map(([value, label]) => (
            <option key={value} value={value} className="bg-surface-raised">
              {label}
            </option>
          ))}
        </select>
        <select
          value={natureFilter}
          onChange={(event) => {
            setNatureFilter(event.target.value as TaxNature | 'all');
            setPage(0);
          }}
          aria-label="Filtrar por naturaleza"
          className="rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-sm text-slate-100"
        >
          <option value="all" className="bg-surface-raised">
            Toda naturaleza
          </option>
          {Object.entries(NATURE_LABEL).map(([value, label]) => (
            <option key={value} value={value} className="bg-surface-raised">
              {label}
            </option>
          ))}
        </select>
        <select
          value={treatmentFilter}
          onChange={(event) => {
            setTreatmentFilter(event.target.value as TaxTreatment | 'all');
            setPage(0);
          }}
          aria-label="Filtrar por tratamiento"
          className="rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-sm text-slate-100"
        >
          <option value="all" className="bg-surface-raised">
            Todo tratamiento
          </option>
          {Object.entries(TREATMENT_LABEL).map(([value, label]) => (
            <option key={value} value={value} className="bg-surface-raised">
              {label}
            </option>
          ))}
        </select>
        <select
          value={resolutionFilter}
          onChange={(event) => {
            setResolutionFilter(event.target.value as ResolutionStatus | 'all');
            setPage(0);
          }}
          aria-label="Filtrar por estado de resolución"
          className="rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-sm text-slate-100"
        >
          <option value="all" className="bg-surface-raised">
            Toda resolución
          </option>
          {Object.entries(RESOLUTION_LABEL).map(([value, label]) => (
            <option key={value} value={value} className="bg-surface-raised">
              {label}
            </option>
          ))}
        </select>
        <select
          value={relationFilter}
          onChange={(event) => {
            setRelationFilter(event.target.value as RecordRelationType | 'all');
            setPage(0);
          }}
          aria-label="Filtrar por tipo de relación"
          className="rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-sm text-slate-100"
        >
          <option value="all" className="bg-surface-raised">
            Toda relación
          </option>
          {Object.entries(RELATION_LABEL).map(([value, label]) => (
            <option key={value} value={value} className="bg-surface-raised">
              {label}
            </option>
          ))}
        </select>
        <select
          value={dispositionFilter}
          onChange={(event) => {
            setDispositionFilter(event.target.value as MatrixEntryDisposition | 'all');
            setPage(0);
          }}
          aria-label="Filtrar por consolidación"
          className="rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-sm text-slate-100"
        >
          <option value="all" className="bg-surface-raised">
            Todo consolidado
          </option>
          {Object.entries(DISPOSITION_LABEL).map(([value, label]) => (
            <option key={value} value={value} className="bg-surface-raised">
              {label}
            </option>
          ))}
        </select>
        <Button
          variant="secondary"
          onClick={handleExport}
          leadingIcon={<Download className="h-4 w-4" aria-hidden />}
        >
          Exportar JSON
        </Button>
      </GlassPanel>

      {filtered.length === 0 ? (
        <EmptyState title="Sin registros" description="Ajusta la búsqueda o los filtros." />
      ) : (
        <GlassPanel className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-white/8 text-xs uppercase tracking-wide text-slate-400">
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

          <div className="flex items-center justify-between border-t border-white/8 px-4 py-3 text-xs text-slate-400">
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
        className={`inline-flex items-center gap-1 ${active ? 'text-slate-100' : ''}`}
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
        className={`cursor-pointer border-b border-white/5 transition-colors hover:bg-white/[0.03] ${expanded ? 'bg-white/[0.03]' : ''}`}
        onClick={onToggle}
      >
        <td className="px-4 py-2.5 text-slate-500">{record.source.row}</td>
        <td className="px-4 py-2.5">
          <span className="text-slate-100">{record.entityName ?? '—'}</span>
          {record.reportingEntityDocument ? (
            <span className="block text-xs text-slate-500">{record.reportingEntityDocument}</span>
          ) : null}
        </td>
        <td className="px-4 py-2.5 text-slate-300">
          {record.conceptLabel ?? record.conceptCode ?? '—'}
        </td>
        <td className="px-4 py-2.5">
          <Badge tone={state.classification.category === 'unclassified' ? 'amber' : 'cyan'}>
            {CATEGORY_LABEL[state.classification.category]}
          </Badge>
          <span className="mt-1 block text-[11px] text-slate-500">
            {IDENTITY_LABEL[record.identityMatch]}
          </span>
          <span className="mt-1 block text-[11px] text-slate-500">
            {RESOLUTION_LABEL[state.resolutionStatus]}
          </span>
        </td>
        <td className="px-4 py-2.5 text-right font-medium text-slate-100">
          {record.reportedValue !== null ? formatCurrencyCOP(record.reportedValue) : '—'}
        </td>
      </tr>
      {expanded ? (
        <tr className="border-b border-white/5 bg-surface-raised/40">
          <td colSpan={5} className="px-4 py-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <Badge tone="cyan">
                Origen: {record.source.sheet} · fila {record.source.row}
              </Badge>
              {record.withholding !== null ? (
                <Badge tone="violet">Retención: {formatCurrencyCOP(record.withholding)}</Badge>
              ) : null}
              <Badge
                tone={
                  record.identityMatch === 'matched'
                    ? 'emerald'
                    : record.identityMatch === 'mismatched'
                      ? 'rose'
                      : 'neutral'
                }
              >
                Identidad: {IDENTITY_LABEL[record.identityMatch]} ·{' '}
                {maskDocument(record.reportedPersonDocument)}
              </Badge>
              <Badge tone={state.disposition === 'pending' ? 'amber' : 'neutral'}>
                {DISPOSITION_LABEL[state.disposition]}
              </Badge>
              {state.relations.some((item) => item.type === 'subset_of') ? (
                <Badge tone="violet">Subconjunto</Badge>
              ) : null}
              {state.relations.some((item) => item.type === 'summary_of') ? (
                <Badge tone="cyan">Resumen</Badge>
              ) : null}
              {state.disposition === 'informational' ? (
                <Badge tone="neutral">Informativo</Badge>
              ) : null}
              {state.disposition === 'excluded' ? <Badge tone="rose">No se consolida</Badge> : null}
              {state.disposition === 'pending' ? <Badge tone="amber">Pendiente</Badge> : null}
            </div>
            <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <dt className="text-slate-500">Categoría</dt>
                <dd className="text-slate-300">{CATEGORY_LABEL[state.classification.category]}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Naturaleza</dt>
                <dd className="text-slate-300">{NATURE_LABEL[state.classification.nature]}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Tratamiento</dt>
                <dd className="text-slate-300">
                  {TREATMENT_LABEL[state.classification.treatment]}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Confianza</dt>
                <dd className="text-slate-300">{state.classification.confidence}</dd>
              </div>
            </dl>
            {state.relations.length ? (
              <div className="mt-3 rounded-lg border border-white/8 p-3 text-xs">
                <p className="text-slate-500">Relaciones</p>
                <ul className="mt-1 space-y-1 text-slate-300">
                  {state.relations.map((relation) => (
                    <li key={relation.id}>
                      {RELATION_LABEL[relation.type]} · confianza {relation.confidence}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {record.suggestedUse ? (
              <div className="mt-3 rounded-lg border border-white/8 p-3 text-xs">
                <p className="text-slate-500">Uso declaración sugerida</p>
                <p className="mt-1 text-slate-300">{record.suggestedUse.originalText}</p>
                {record.suggestedUse.boxReferences.length ? (
                  <p className="mt-1 text-slate-500">
                    Casillas:{' '}
                    {record.suggestedUse.boxReferences
                      .map((reference) => reference.code)
                      .join(', ')}
                  </p>
                ) : null}
              </div>
            ) : null}
            {Object.keys(record.extra).length > 0 ? (
              <dl className="mt-3 grid gap-x-6 gap-y-1 sm:grid-cols-2">
                {Object.entries(record.extra).map(([key, value]) => (
                  <div
                    key={key}
                    className="flex justify-between gap-4 border-b border-white/5 py-1"
                  >
                    <dt className="text-slate-500">{key}</dt>
                    <dd className="text-slate-300">{value === null ? '—' : String(value)}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="mt-2 text-xs text-slate-500">Sin columnas adicionales.</p>
            )}
          </td>
        </tr>
      ) : null}
    </>
  );
}
