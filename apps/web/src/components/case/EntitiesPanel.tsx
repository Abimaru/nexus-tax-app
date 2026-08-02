'use client';

import { useState } from 'react';
import { Building2, Plus } from 'lucide-react';
import {
  ProductTypeSchema,
  type CaseEntitySummary,
  type CaseProduct,
  type EmploymentIncomeGroup,
  type UploadedDocument,
} from '@nexus-tax/domain';
import { Badge, Button, EmptyState, GlassPanel, ProgressBar } from '@nexus-tax/ui';
import { PRODUCT_LABEL } from '@/lib/dossierPresentation';
import {
  EMPLOYER_STATUS_PRESENTATION,
  ENTITY_CATEGORY_PRESENTATION,
} from '@/lib/presentationCatalogs';
import { saveProduct } from '@/lib/repository';

export function EntitiesPanel({
  caseId,
  entities,
  products,
  employmentGroup,
  documents,
}: {
  caseId: string;
  entities: CaseEntitySummary[];
  products: CaseProduct[];
  employmentGroup?: EmploymentIncomeGroup;
  documents: UploadedDocument[];
}) {
  const [entityId, setEntityId] = useState(entities[0]?.id ?? '');
  const [type, setType] = useState<(typeof ProductTypeSchema.options)[number]>('unidentified');
  const [label, setLabel] = useState('');
  if (!entities.length)
    return (
      <EmptyState
        icon={<Building2 className="h-8 w-8" />}
        title="Sin entidades"
        description="Procesa la información exógena para crear la vista agrupada por entidad."
      />
    );
  return (
    <div className="space-y-4">
      <GlassPanel className="p-4">
        <h2 className="font-medium text-content-strong">Asociar producto</h2>
        <div className="mt-3 grid gap-2 md:grid-cols-[1fr_1fr_1fr_auto]">
          <select
            aria-label="Entidad del producto"
            value={entityId}
            onChange={(event) => setEntityId(event.target.value)}
            className="rounded-lg border border-overlay/12 bg-overlay/5 px-3 py-2 text-sm text-content-strong"
          >
            {entities.map((entity) => (
              <option className="bg-surface-raised" key={entity.id} value={entity.id}>
                {entity.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Tipo de producto"
            value={type}
            onChange={(event) => setType(event.target.value as typeof type)}
            className="rounded-lg border border-overlay/12 bg-overlay/5 px-3 py-2 text-sm text-content-strong"
          >
            {ProductTypeSchema.options.map((option) => (
              <option className="bg-surface-raised" key={option} value={option}>
                {PRODUCT_LABEL[option]}
              </option>
            ))}
          </select>
          <input
            aria-label="Nombre del producto"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="Etiqueta opcional"
            className="rounded-lg border border-overlay/12 bg-overlay/5 px-3 py-2 text-sm text-content-strong"
          />
          <Button
            leadingIcon={<Plus className="h-4 w-4" />}
            onClick={() =>
              void saveProduct({
                caseId,
                entityId,
                type,
                label: label.trim() || PRODUCT_LABEL[type],
                status: type === 'unidentified' ? 'unidentified' : 'active',
                notes: '',
              }).then(() => setLabel(''))
            }
          >
            Agregar
          </Button>
        </div>
      </GlassPanel>
      <div className="grid gap-4 lg:grid-cols-2">
        {entities.map((entity) => {
          const employer = employmentGroup?.instances.find(
            (instance) => instance.entityId === entity.id,
          );
          const form220 = documents.find((document) => document.id === employer?.form220DocumentId);
          return (
            <GlassPanel key={entity.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-content-strong">{entity.name}</h3>
                  <p className="text-xs text-content-subtle">
                    {entity.taxIdMasked ?? 'Identificación no disponible'} ·{' '}
                    {ENTITY_CATEGORY_PRESENTATION[entity.category].label}
                  </p>
                </div>
                <Badge tone={entity.status === 'al_dia' ? 'emerald' : 'amber'}>
                  {entity.status === 'al_dia' ? 'Al día' : 'Requiere revisión'}
                </Badge>
              </div>
              <div className="mt-4">
                <ProgressBar ratio={entity.coveragePercentage / 100} label="Cobertura documental" />
              </div>
              <dl className="mt-4 grid grid-cols-3 gap-3 text-xs">
                <Metric label="Registros" value={entity.exogenousRecordCount} />
                <Metric label="Documentos" value={entity.documentCount} />
                <Metric
                  label="Requisitos"
                  value={`${entity.coveredRequirementCount}/${entity.requirementCount}`}
                />
                <Metric label="Hechos" value={entity.factCount} />
                <Metric label="Conciliaciones" value={entity.reconciliationCount} />
                <Metric label="Hallazgos" value={entity.openFindingCount} />
              </dl>
              <div className="mt-3 flex flex-wrap gap-1">
                {entity.inferredProducts.map((product) => (
                  <Badge key={`inferred:${product}`} tone="cyan">
                    Inferido: {product}
                  </Badge>
                ))}
                {products
                  .filter((product) => product.entityId === entity.id)
                  .map((product) => (
                    <Badge key={product.id} tone="violet">
                      {product.label}
                    </Badge>
                  ))}
              </div>
              {employer ? (
                <div className="mt-4 rounded-lg border border-overlay/10 bg-overlay/[0.03] p-3 text-xs text-content-muted">
                  <p className="font-medium text-content-strong">Ingreso laboral asociado</p>
                  <p className="mt-1">
                    Formulario 220: {form220?.fileName ?? 'pendiente'} · periodo{' '}
                    {employer.workedPeriod || 'por confirmar'}
                  </p>
                  <p className="mt-1">
                    Estado: {EMPLOYER_STATUS_PRESENTATION[employer.status].label}
                  </p>
                </div>
              ) : null}
            </GlassPanel>
          );
        })}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dt className="text-content-subtle">{label}</dt>
      <dd className="mt-1 text-base text-content-strong">{value}</dd>
    </div>
  );
}
