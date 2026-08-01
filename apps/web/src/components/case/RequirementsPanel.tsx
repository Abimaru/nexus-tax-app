'use client';

import { useState } from 'react';
import { ClipboardList } from 'lucide-react';
import {
  CoverageStatusSchema,
  type ProcessingResult,
  type RequirementCoverage,
  type UploadedDocument,
} from '@nexus-tax/domain';
import { Badge, Button, EmptyState, GlassPanel } from '@nexus-tax/ui';
import { saveRequirementCoverage } from '@/lib/repository';

const COVERAGE_LABEL = {
  not_evaluated: 'No evaluado',
  partial: 'Parcial',
  covered: 'Cubierto',
  not_applicable: 'No aplica',
  requires_review: 'Requiere revisión',
} as const;

export function RequirementsPanel({
  caseId,
  result,
  documents,
  coverages,
}: {
  caseId: string;
  result?: ProcessingResult;
  documents: UploadedDocument[];
  coverages: RequirementCoverage[];
}) {
  const [documentByRequirement, setDocumentByRequirement] = useState<Record<string, string>>({});
  const [statusByRequirement, setStatusByRequirement] = useState<
    Record<string, (typeof CoverageStatusSchema.options)[number]>
  >({});
  if (!result?.requirements.length)
    return (
      <EmptyState
        icon={<ClipboardList className="h-8 w-8" />}
        title="Sin requisitos sugeridos"
        description="El checklist se genera solo cuando la exógena aporta evidencia concreta."
      />
    );
  return (
    <div className="space-y-3">
      <GlassPanel className="p-5">
        <h2 className="text-lg font-semibold text-content-strong">Cobertura de requisitos</h2>
        <p className="mt-1 text-sm text-content-muted">
          Un documento puede cubrir varios requisitos; cada asociación conserva su estado y no
          afirma obligatoriedad legal.
        </p>
      </GlassPanel>
      {result.requirements.map((requirement) => {
        const related = coverages.filter((coverage) => coverage.requirementId === requirement.id);
        const selectedDocument = documentByRequirement[requirement.id] ?? documents[0]?.id ?? '';
        const selectedStatus = statusByRequirement[requirement.id] ?? 'not_evaluated';
        return (
          <GlassPanel key={requirement.id} className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-medium text-content-strong">{requirement.documentName}</h3>
                <p className="text-xs text-content-muted">
                  {requirement.entityName} · {requirement.reason}
                </p>
              </div>
              <Badge
                tone={
                  related.some((item) => item.status === 'covered')
                    ? 'emerald'
                    : related.some((item) => item.status === 'partial')
                      ? 'amber'
                      : 'neutral'
                }
              >
                {related.some((item) => item.status === 'covered')
                  ? 'Cubierto'
                  : related.some((item) => item.status === 'partial')
                    ? 'Parcial'
                    : 'Pendiente'}
              </Badge>
            </div>
            {related.length ? (
              <ul className="mt-3 space-y-1 text-xs text-content-muted">
                {related.map((coverage) => (
                  <li key={coverage.id}>
                    •{' '}
                    {documents.find((document) => document.id === coverage.documentId)?.fileName ??
                      'Hecho/manual'}{' '}
                    · {COVERAGE_LABEL[coverage.status]}
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="mt-3 grid gap-2 md:grid-cols-[1fr_180px_auto]">
              <select
                aria-label={`Documento para ${requirement.documentName}`}
                value={selectedDocument}
                onChange={(event) =>
                  setDocumentByRequirement((current) => ({
                    ...current,
                    [requirement.id]: event.target.value,
                  }))
                }
                className={inputClass}
              >
                <option className="bg-surface-raised" value="">
                  Selecciona documento
                </option>
                {documents
                  .filter((document) => document.status === 'active')
                  .map((document) => (
                    <option className="bg-surface-raised" key={document.id} value={document.id}>
                      {document.fileName}
                    </option>
                  ))}
              </select>
              <select
                aria-label={`Cobertura de ${requirement.documentName}`}
                value={selectedStatus}
                onChange={(event) =>
                  setStatusByRequirement((current) => ({
                    ...current,
                    [requirement.id]: event.target.value as typeof selectedStatus,
                  }))
                }
                className={inputClass}
              >
                {CoverageStatusSchema.options.map((status) => (
                  <option className="bg-surface-raised" key={status} value={status}>
                    {COVERAGE_LABEL[status]}
                  </option>
                ))}
              </select>
              <Button
                variant="secondary"
                disabled={!selectedDocument}
                onClick={() =>
                  void saveRequirementCoverage({
                    caseId,
                    requirementId: requirement.id,
                    documentId: selectedDocument,
                    factId: null,
                    entityId:
                      result.entities.find((entity) => entity.name === requirement.entityName)
                        ?.id ?? null,
                    status: selectedStatus,
                    relation:
                      selectedStatus === 'covered'
                        ? 'covers'
                        : selectedStatus === 'partial'
                          ? 'partially_covers'
                          : selectedStatus === 'requires_review'
                            ? 'requires_support'
                            : 'provides_evidence',
                    notes: 'Cobertura revisada manualmente.',
                  })
                }
              >
                Guardar cobertura
              </Button>
            </div>
          </GlassPanel>
        );
      })}
    </div>
  );
}
const inputClass =
  'rounded-lg border border-overlay/12 bg-overlay/5 px-3 py-2 text-sm text-content-strong';
