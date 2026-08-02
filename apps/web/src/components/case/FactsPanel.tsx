'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, Coins, FileSearch, Link2, PlusCircle, SlidersHorizontal } from 'lucide-react';
import {
  FactCaptureMethodSchema,
  FactRequirementRelationSchema,
  TaxCategorySchema,
  TaxNatureSchema,
  TaxTreatmentSchema,
  type CaseProduct,
  type AcceptedExogenousValue,
  type DocumentaryRequirement,
  type DocumentFact,
  type ProcessingResult,
  type UploadedDocument,
} from '@nexus-tax/domain';
import { Badge, Button, EmptyState, GlassPanel, formatCurrencyCOP } from '@nexus-tax/ui';
import { CATEGORY_LABEL, NATURE_LABEL, TREATMENT_LABEL } from '@/lib/analysisPresentation';
import { saveDocumentFact, updateDocumentFact } from '@/lib/repository';
import {
  CAPTURE_METHOD_PRESENTATION,
  REQUIREMENT_RELATION_PRESENTATION,
  REVIEW_STATUS_PRESENTATION,
} from '@/lib/presentationCatalogs';
import { AcceptedSourceAction } from './AcceptedSourceAction';

function parseAmount(raw: string): number | null {
  if (!raw.trim()) return null;
  const numeric = Number(raw.replaceAll('.', '').replace(',', '.'));
  return Number.isFinite(numeric) ? numeric : null;
}

export function FactsPanel({
  caseId,
  result,
  documents,
  products,
  facts,
  acceptedSources,
}: {
  caseId: string;
  result?: ProcessingResult;
  documents: UploadedDocument[];
  products: CaseProduct[];
  facts: DocumentFact[];
  acceptedSources: AcceptedExogenousValue[];
}) {
  const [entityId, setEntityId] = useState('');
  const [documentId, setDocumentId] = useState('');
  const [productId, setProductId] = useState('');
  const [concept, setConcept] = useState('');
  const [category, setCategory] =
    useState<(typeof TaxCategorySchema.options)[number]>('unclassified');
  const [nature, setNature] = useState<(typeof TaxNatureSchema.options)[number]>('unclassified');
  const [treatment, setTreatment] =
    useState<(typeof TaxTreatmentSchema.options)[number]>('requires_review');
  const [value, setValue] = useState('');
  const [currency, setCurrency] = useState('COP');
  const [cutoffDate, setCutoffDate] = useState('');
  const [period, setPeriod] = useState('');
  const [page, setPage] = useState('');
  const [evidence, setEvidence] = useState('');
  const [requirementId, setRequirementId] = useState('');
  const [requirementRelation, setRequirementRelation] =
    useState<(typeof FactRequirementRelationSchema.options)[number]>('provides_evidence');
  const [method, setMethod] = useState<(typeof FactCaptureMethodSchema.options)[number]>('manual');
  const [confidence, setConfidence] = useState<'low' | 'medium' | 'high'>('medium');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsedValue = useMemo(() => parseAmount(value), [value]);
  const isCop = currency.trim().toUpperCase() === 'COP';

  // Requisitos agrupados por entidad para el selector (evita repetición).
  const requirementGroups = useMemo(() => {
    const map = new Map<string, DocumentaryRequirement[]>();
    for (const requirement of result?.requirements ?? []) {
      const list = map.get(requirement.entityName) ?? [];
      list.push(requirement);
      map.set(requirement.entityName, list);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0], 'es'));
  }, [result?.requirements]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!concept.trim() || parsedValue === null)
      return setError('Completa concepto y valor numérico.');
    await saveDocumentFact(
      caseId,
      {
        documentId: documentId || null,
        entityId: entityId || null,
        productId: productId || null,
        originalConcept: concept.trim(),
        category,
        nature,
        treatment,
        value: parsedValue,
        currency: currency.toUpperCase().slice(0, 3).padEnd(3, 'X'),
        cutoffDate: cutoffDate || null,
        period,
        pageOrSection: page,
        evidence,
        captureMethod: method,
        confidence,
        reviewStatus: 'pending',
        requirementIds: requirementId ? [requirementId] : [],
        author: 'Analista local',
      },
      requirementRelation,
    );
    setConcept('');
    setValue('');
    setEvidence('');
    setPage('');
    setError(null);
  }

  return (
    <div className="space-y-5">
      <GlassPanel className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent-cyan/10 text-tone-cyan">
              <Coins className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-content-strong">
                Registrar valores manualmente
              </h2>
              <p className="mt-0.5 text-sm text-content-muted">
                Toma un valor de un certificado o soporte. Siempre conserva su origen y no se
                presenta como extracción automática.
              </p>
            </div>
          </div>
          <div>
            <AcceptedSourceAction
              caseId={caseId}
              result={result}
              acceptedSources={acceptedSources}
            />
          </div>
        </div>

        <form onSubmit={submit} className="mt-5 space-y-5">
          {/* 1. Lo esencial */}
          <Section icon={<Coins className="h-4 w-4" aria-hidden />} title="Qué registras">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="md:col-span-2">
                <Field label="Concepto original">
                  <input
                    aria-label="Concepto original"
                    value={concept}
                    onChange={(event) => setConcept(event.target.value)}
                    placeholder="Ej. Rendimientos financieros gravados"
                    className={inputClass}
                  />
                </Field>
              </div>
              <Field label="Valor">
                <input
                  aria-label="Valor documental"
                  inputMode="decimal"
                  value={value}
                  onChange={(event) => setValue(event.target.value)}
                  placeholder="Ej. 1.250.000"
                  className={inputClass}
                />
                <p className="mt-1 text-xs text-content-subtle">
                  {parsedValue === null
                    ? 'Escribe el monto con separadores de miles.'
                    : isCop
                      ? `≈ ${formatCurrencyCOP(parsedValue)}`
                      : `≈ ${parsedValue.toLocaleString('es-CO')} ${currency.toUpperCase()}`}
                </p>
              </Field>
              <Field label="Moneda">
                <input
                  value={currency}
                  maxLength={3}
                  onChange={(event) => setCurrency(event.target.value)}
                  className={inputClass}
                />
              </Field>
            </div>
          </Section>

          {/* 2. Trazabilidad del dato */}
          <Section icon={<FileSearch className="h-4 w-4" aria-hidden />} title="Origen del dato">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <Field label="Entidad">
                <select
                  value={entityId}
                  onChange={(event) => setEntityId(event.target.value)}
                  className={inputClass}
                >
                  <option className="bg-surface-raised" value="">
                    Sin asociar
                  </option>
                  {result?.entities.map((entity) => (
                    <option className="bg-surface-raised" key={entity.id} value={entity.id}>
                      {entity.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Documento asociado">
                <select
                  value={documentId}
                  onChange={(event) => setDocumentId(event.target.value)}
                  className={inputClass}
                >
                  <option className="bg-surface-raised" value="">
                    Sin documento
                  </option>
                  {documents.map((document) => (
                    <option className="bg-surface-raised" key={document.id} value={document.id}>
                      {document.fileName}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Producto">
                <select
                  value={productId}
                  onChange={(event) => setProductId(event.target.value)}
                  className={inputClass}
                >
                  <option className="bg-surface-raised" value="">
                    Producto por identificar
                  </option>
                  {products.map((product) => (
                    <option className="bg-surface-raised" key={product.id} value={product.id}>
                      {product.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Periodo">
                <input
                  value={period}
                  onChange={(event) => setPeriod(event.target.value)}
                  placeholder="Ej. enero-diciembre"
                  className={inputClass}
                />
              </Field>
              <Field label="Página o sección">
                <input
                  value={page}
                  onChange={(event) => setPage(event.target.value)}
                  placeholder="Ej. pág. 2"
                  className={inputClass}
                />
              </Field>
              <Field label="Fecha de corte">
                <input
                  type="date"
                  value={cutoffDate}
                  onChange={(event) => setCutoffDate(event.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Método de captura">
                <select
                  value={method}
                  onChange={(event) => setMethod(event.target.value as typeof method)}
                  className={inputClass}
                >
                  {FactCaptureMethodSchema.options.map((option) => (
                    <option className="bg-surface-raised" key={option} value={option}>
                      {CAPTURE_METHOD_PRESENTATION[option].label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Confianza">
                <select
                  value={confidence}
                  onChange={(event) => setConfidence(event.target.value as typeof confidence)}
                  className={inputClass}
                >
                  <option className="bg-surface-raised" value="low">
                    Baja
                  </option>
                  <option className="bg-surface-raised" value="medium">
                    Media
                  </option>
                  <option className="bg-surface-raised" value="high">
                    Alta
                  </option>
                </select>
              </Field>
            </div>
          </Section>

          {/* 3. Vínculo con requisito */}
          <Section icon={<Link2 className="h-4 w-4" aria-hidden />} title="Vínculo con requisito">
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Requisito cubierto">
                <select
                  value={requirementId}
                  onChange={(event) => setRequirementId(event.target.value)}
                  className={inputClass}
                >
                  <option className="bg-surface-raised" value="">
                    Sin asociar
                  </option>
                  {requirementGroups.map(([entityName, entityRequirements]) => (
                    <optgroup key={entityName} label={entityName} className="bg-surface-raised">
                      {entityRequirements.map((requirement) => (
                        <option
                          className="bg-surface-raised"
                          key={requirement.id}
                          value={requirement.id}
                        >
                          {requirement.documentName}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </Field>
              <Field label="Relación con el requisito">
                <select
                  value={requirementRelation}
                  onChange={(event) =>
                    setRequirementRelation(event.target.value as typeof requirementRelation)
                  }
                  className={inputClass}
                >
                  {FactRequirementRelationSchema.options.map((option) => (
                    <option className="bg-surface-raised" key={option} value={option}>
                      {REQUIREMENT_RELATION_PRESENTATION[option].label}
                    </option>
                  ))}
                </select>
                <span className="mt-1 block text-[11px] text-content-subtle">
                  {REQUIREMENT_RELATION_PRESENTATION[requirementRelation].description}
                </span>
              </Field>
            </div>
          </Section>

          {/* 4. Clasificación tributaria (avanzado / opcional) */}
          <div className="rounded-xl border border-overlay/8 bg-overlay/[0.015]">
            <button
              type="button"
              onClick={() => setAdvancedOpen((open) => !open)}
              aria-expanded={advancedOpen}
              className="flex w-full items-center gap-2 px-4 py-3 text-left"
            >
              <SlidersHorizontal className="h-4 w-4 text-content-muted" aria-hidden />
              <span className="text-sm font-medium text-content-strong">
                Clasificación tributaria
              </span>
              <span className="text-xs text-content-subtle">(opcional)</span>
              {!advancedOpen ? (
                <span className="ml-auto truncate text-xs text-content-subtle">
                  {CATEGORY_LABEL[category]} · {NATURE_LABEL[nature]}
                </span>
              ) : null}
              <ChevronDown
                className={`${advancedOpen ? 'rotate-180' : ''} ml-2 h-4 w-4 shrink-0 text-content-muted transition-transform motion-reduce:transition-none`}
                aria-hidden
              />
            </button>
            {advancedOpen ? (
              <div className="grid gap-3 border-t border-overlay/8 p-4 md:grid-cols-3">
                <Field label="Categoría normalizada">
                  <select
                    value={category}
                    onChange={(event) => setCategory(event.target.value as typeof category)}
                    className={inputClass}
                  >
                    {TaxCategorySchema.options.map((option) => (
                      <option className="bg-surface-raised" key={option} value={option}>
                        {CATEGORY_LABEL[option]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Naturaleza">
                  <select
                    value={nature}
                    onChange={(event) => setNature(event.target.value as typeof nature)}
                    className={inputClass}
                  >
                    {TaxNatureSchema.options.map((option) => (
                      <option className="bg-surface-raised" key={option} value={option}>
                        {NATURE_LABEL[option]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Tratamiento">
                  <select
                    value={treatment}
                    onChange={(event) => setTreatment(event.target.value as typeof treatment)}
                    className={inputClass}
                  >
                    {TaxTreatmentSchema.options.map((option) => (
                      <option className="bg-surface-raised" key={option} value={option}>
                        {TREATMENT_LABEL[option]}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            ) : null}
          </div>

          <label className="block text-xs text-content-muted">
            Evidencia u observación
            <textarea
              value={evidence}
              onChange={(event) => setEvidence(event.target.value)}
              placeholder="De dónde se tomó el dato, aclaraciones, etc."
              className={`${inputClass} mt-1 min-h-20`}
            />
          </label>

          {error ? (
            <p role="alert" className="text-sm text-tone-rose">
              {error}
            </p>
          ) : null}

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={!concept.trim() || parsedValue === null}
              leadingIcon={<PlusCircle className="h-4 w-4" />}
            >
              Guardar hecho
            </Button>
          </div>
        </form>
      </GlassPanel>

      {!facts.length ? (
        <EmptyState
          icon={<FileSearch className="h-8 w-8" />}
          title="Sin hechos documentales"
          description="Registra manualmente un valor de un certificado o soporte. No se presentará como extracción automática."
        />
      ) : (
        <div className="space-y-3">
          {[...facts].reverse().map((fact) => (
            <GlassPanel key={fact.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent-cyan/10 text-tone-cyan">
                    <Coins className="h-4 w-4" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-medium text-content-strong">{fact.originalConcept}</h3>
                    <p className="text-xs text-content-subtle">
                      {CATEGORY_LABEL[fact.category]} · {NATURE_LABEL[fact.nature]} ·{' '}
                      {fact.pageOrSection || 'sin página'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-content-strong">
                    {fact.currency === 'COP'
                      ? formatCurrencyCOP(fact.value)
                      : `${fact.value} ${fact.currency}`}
                  </p>
                  <Badge tone={fact.captureMethod === 'manual' ? 'violet' : 'cyan'}>
                    {CAPTURE_METHOD_PRESENTATION[fact.captureMethod].label}
                  </Badge>
                </div>
              </div>
              <p className="mt-2 text-xs text-content-muted">
                {fact.evidence || 'Sin observación'} · autor: {fact.author}
              </p>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-content-subtle">
                  Historial: {fact.history.length} eventos
                </span>
                {fact.reviewStatus === 'pending' ? (
                  <Button
                    variant="secondary"
                    className="px-3 py-1.5 text-xs"
                    onClick={() =>
                      void updateDocumentFact(
                        fact.id,
                        { reviewStatus: 'reviewed' },
                        'Revisión manual confirmada desde la interfaz.',
                      )
                    }
                  >
                    Marcar revisado
                  </Button>
                ) : (
                  <Badge tone="emerald">
                    {REVIEW_STATUS_PRESENTATION[fact.reviewStatus].label}
                  </Badge>
                )}
              </div>
            </GlassPanel>
          ))}
        </div>
      )}
    </div>
  );
}

const inputClass =
  'w-full min-h-10 rounded-lg border border-overlay/12 bg-overlay/5 px-3 py-2 text-sm text-content-strong';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs text-content-muted">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-2 text-content-muted">
        {icon}
        <h3 className="text-xs font-semibold uppercase tracking-wide">{title}</h3>
      </div>
      {children}
    </section>
  );
}
