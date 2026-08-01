'use client';

import { useState } from 'react';
import { FileSearch, PlusCircle } from 'lucide-react';
import {
  FactCaptureMethodSchema,
  FactRequirementRelationSchema,
  TaxCategorySchema,
  TaxNatureSchema,
  TaxTreatmentSchema,
  type CaseProduct,
  type DocumentFact,
  type ProcessingResult,
  type UploadedDocument,
} from '@nexus-tax/domain';
import { Badge, Button, EmptyState, GlassPanel, formatCurrencyCOP } from '@nexus-tax/ui';
import { CATEGORY_LABEL, NATURE_LABEL, TREATMENT_LABEL } from '@/lib/analysisPresentation';
import { saveDocumentFact, updateDocumentFact } from '@/lib/repository';

export function FactsPanel({
  caseId,
  result,
  documents,
  products,
  facts,
}: {
  caseId: string;
  result?: ProcessingResult;
  documents: UploadedDocument[];
  products: CaseProduct[];
  facts: DocumentFact[];
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
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const numeric = Number(value.replaceAll('.', '').replace(',', '.'));
    if (!concept.trim() || !Number.isFinite(numeric))
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
        value: numeric,
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
        <div>
          <h2 className="text-lg font-semibold text-content-strong">
            Registrar valores manualmente
          </h2>
          <p className="mt-1 text-sm text-content-muted">
            Contrato común para soportes actuales y futuros extractores. La captura siempre muestra
            su origen.
          </p>
        </div>
        <form onSubmit={submit} className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
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
          <Field label="Concepto original">
            <input
              aria-label="Concepto original"
              value={concept}
              onChange={(event) => setConcept(event.target.value)}
              className={inputClass}
            />
          </Field>
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
          <Field label="Valor">
            <input
              aria-label="Valor documental"
              inputMode="decimal"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Moneda">
            <input
              value={currency}
              maxLength={3}
              onChange={(event) => setCurrency(event.target.value)}
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
                <option className="bg-surface-raised" key={option}>
                  {option}
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
          <Field label="Requisito cubierto">
            <select
              value={requirementId}
              onChange={(event) => setRequirementId(event.target.value)}
              className={inputClass}
            >
              <option className="bg-surface-raised" value="">
                Sin asociar
              </option>
              {result?.requirements.map((requirement) => (
                <option className="bg-surface-raised" key={requirement.id} value={requirement.id}>
                  {requirement.entityName} · {requirement.documentName}
                </option>
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
                  {option.replaceAll('_', ' ')}
                </option>
              ))}
            </select>
          </Field>
          <label className="text-xs text-content-muted md:col-span-2 xl:col-span-3">
            Evidencia u observación
            <textarea
              value={evidence}
              onChange={(event) => setEvidence(event.target.value)}
              className={`${inputClass} mt-1 min-h-20`}
            />
          </label>
          {error ? (
            <p role="alert" className="text-sm text-tone-rose md:col-span-2">
              {error}
            </p>
          ) : null}
          <div className="flex justify-end md:col-span-2 xl:col-span-3">
            <Button type="submit" leadingIcon={<PlusCircle className="h-4 w-4" />}>
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
                <div>
                  <h3 className="font-medium text-content-strong">{fact.originalConcept}</h3>
                  <p className="text-xs text-content-subtle">
                    {CATEGORY_LABEL[fact.category]} · {NATURE_LABEL[fact.nature]} ·{' '}
                    {fact.pageOrSection || 'sin página'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-content-strong">
                    {fact.currency === 'COP'
                      ? formatCurrencyCOP(fact.value)
                      : `${fact.value} ${fact.currency}`}
                  </p>
                  <Badge tone={fact.captureMethod === 'manual' ? 'violet' : 'cyan'}>
                    {fact.captureMethod}
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
                  <Badge tone="emerald">{fact.reviewStatus}</Badge>
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
  'w-full rounded-lg border border-overlay/12 bg-overlay/5 px-3 py-2 text-sm text-content-strong';
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="text-xs text-content-muted">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}
