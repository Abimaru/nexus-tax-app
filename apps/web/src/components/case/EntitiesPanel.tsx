'use client';

import { useMemo, useState } from 'react';
import { Building2, Layers, Plus } from 'lucide-react';
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

  /**
   * Agrupa entidades por `groupName` para evitar que marcas del mismo grupo
   * (p. ej. Bancolombia, Nequi y Fiduciaria Bancolombia) aparezcan sueltas.
   * Las entidades sin grupo caen en un bloque "Otras entidades" al final.
   */
  const grouped = useMemo(() => {
    const withGroup = new Map<string, CaseEntitySummary[]>();
    const orphans: CaseEntitySummary[] = [];
    for (const entity of entities) {
      if (entity.groupName) {
        const list = withGroup.get(entity.groupName) ?? [];
        list.push(entity);
        withGroup.set(entity.groupName, list);
      } else {
        orphans.push(entity);
      }
    }
    const namedGroups = Array.from(withGroup.entries())
      .filter(([, list]) => list.length > 1) // solo consideramos "grupo" si hay ≥2 marcas
      .sort((a, b) => a[0].localeCompare(b[0], 'es'));
    // Las entidades con groupName pero únicas se listan sueltas para no crear
    // secciones de un solo miembro que solo añaden ruido.
    const soloOrphans = [
      ...orphans,
      ...Array.from(withGroup.entries())
        .filter(([, list]) => list.length === 1)
        .flatMap(([, list]) => list),
    ];
    return { namedGroups, soloOrphans };
  }, [entities]);

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
      {grouped.namedGroups.map(([groupName, groupEntities]) => (
        <section key={groupName} aria-labelledby={`group-${groupName}`}>
          <header className="mb-3 flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent-violet/10 text-tone-violet">
              <Layers className="h-4 w-4" aria-hidden />
            </span>
            <h2 id={`group-${groupName}`} className="text-sm font-semibold text-content-strong">
              {groupName}
            </h2>
            <Badge tone="violet">{groupEntities.length} marcas</Badge>
          </header>
          <div className="grid gap-4 lg:grid-cols-2">
            {groupEntities.map((entity) => (
              <EntityCard
                key={entity.id}
                entity={entity}
                products={products}
                documents={documents}
                employmentGroup={employmentGroup}
                inGroup
              />
            ))}
          </div>
        </section>
      ))}
      {grouped.soloOrphans.length ? (
        <section aria-labelledby="group-otras">
          {grouped.namedGroups.length ? (
            <header className="mb-3 flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-overlay/10 text-content-muted">
                <Building2 className="h-4 w-4" aria-hidden />
              </span>
              <h2 id="group-otras" className="text-sm font-semibold text-content-strong">
                Otras entidades
              </h2>
              <Badge tone="neutral">{grouped.soloOrphans.length}</Badge>
            </header>
          ) : null}
          <div className="grid gap-4 lg:grid-cols-2">
            {grouped.soloOrphans.map((entity) => (
              <EntityCard
                key={entity.id}
                entity={entity}
                products={products}
                documents={documents}
                employmentGroup={employmentGroup}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function EntityCard({
  entity,
  products,
  documents,
  employmentGroup,
  inGroup = false,
}: {
  entity: CaseEntitySummary;
  products: CaseProduct[];
  documents: UploadedDocument[];
  employmentGroup?: EmploymentIncomeGroup;
  inGroup?: boolean;
}) {
  const employer = employmentGroup?.instances.find((instance) => instance.entityId === entity.id);
  const form220 = documents.find((document) => document.id === employer?.form220DocumentId);
  return (
    <GlassPanel className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-content-strong">{entity.brandName ?? entity.name}</h3>
          <p className="text-xs text-content-subtle">
            {entity.taxIdMasked ?? 'Identificación no disponible'} ·{' '}
            {ENTITY_CATEGORY_PRESENTATION[entity.category].label}
          </p>
          {entity.legalName && entity.legalName !== (entity.brandName ?? entity.name) ? (
            <p className="mt-1 text-xs text-content-muted">Razón social: {entity.legalName}</p>
          ) : null}
          {/* En vista agrupada omitimos la nota "Grupo empresarial: X" porque
              ya la muestra la cabecera del grupo. */}
          {!inGroup && entity.groupName ? (
            <p className="mt-1 text-xs text-tone-violet">
              Grupo empresarial: {entity.groupName}
            </p>
          ) : null}
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
          <p className="mt-1">Estado: {EMPLOYER_STATUS_PRESENTATION[employer.status].label}</p>
        </div>
      ) : null}
    </GlassPanel>
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
