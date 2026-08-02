'use client';

import { useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { CheckCircle2, ChevronDown, ClipboardList, Link2, Paperclip } from 'lucide-react';
import {
  CoverageStatusSchema,
  type DocumentaryRequirement,
  type EmploymentIncomeGroup,
  type ProcessingResult,
  type RequirementCoverage,
  type UploadedDocument,
} from '@nexus-tax/domain';
import { Badge, Button, EmptyState, GlassPanel } from '@nexus-tax/ui';
import { saveRequirementCoverage } from '@/lib/repository';
import { documentIcon, entityVisual, TONE_BOX_CLASS } from '@/lib/entityVisuals';
import { EmploymentIncomeGroupPanel } from './EmploymentIncomeGroupPanel';

const COVERAGE_LABEL = {
  not_evaluated: 'No evaluado',
  partial: 'Parcial',
  covered: 'Cubierto',
  not_applicable: 'No aplica',
  requires_review: 'Requiere revisión',
} as const;

type CoverageStatus = (typeof CoverageStatusSchema.options)[number];

function coverageState(related: RequirementCoverage[]): {
  label: string;
  tone: 'emerald' | 'amber' | 'neutral';
  done: boolean;
} {
  if (related.some((item) => item.status === 'covered')) {
    return { label: 'Cubierto', tone: 'emerald', done: true };
  }
  if (related.some((item) => item.status === 'partial')) {
    return { label: 'Parcial', tone: 'amber', done: false };
  }
  return { label: 'Pendiente', tone: 'neutral', done: false };
}

export function RequirementsPanel({
  caseId,
  result,
  documents,
  coverages,
  employmentGroup,
}: {
  caseId: string;
  result?: ProcessingResult;
  documents: UploadedDocument[];
  coverages: RequirementCoverage[];
  employmentGroup?: EmploymentIncomeGroup;
}) {
  const reduceMotion = useReducedMotion();
  const [documentByRequirement, setDocumentByRequirement] = useState<Record<string, string>>({});
  const [statusByRequirement, setStatusByRequirement] = useState<Record<string, CoverageStatus>>(
    {},
  );
  const [expanded, setExpanded] = useState<string | null>(null);

  const requirements = (result?.requirements ?? []).filter(
    (requirement) => !requirement.documentName.toLowerCase().includes('formulario 220'),
  );

  // Agrupa por entidad para eliminar la repetición visual y dar jerarquía.
  const groups = useMemo(() => {
    const map = new Map<string, DocumentaryRequirement[]>();
    for (const requirement of requirements) {
      const list = map.get(requirement.entityName) ?? [];
      list.push(requirement);
      map.set(requirement.entityName, list);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0], 'es'));
  }, [requirements]);

  const totalCovered = requirements.filter(
    (requirement) =>
      coverages.filter((coverage) => coverage.requirementId === requirement.id).length > 0 &&
      coverageState(coverages.filter((coverage) => coverage.requirementId === requirement.id)).done,
  ).length;

  const activeDocuments = documents.filter((document) => document.status === 'active');

  return (
    <div className="space-y-4">
      <EmploymentIncomeGroupPanel
        caseId={caseId}
        group={employmentGroup}
        documents={documents}
        result={result}
      />

      <GlassPanel className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent-cyan/10 text-tone-cyan">
              <ClipboardList className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-content-strong">Cobertura de requisitos</h2>
              <p className="mt-0.5 text-sm text-content-muted">
                Un documento puede cubrir varios requisitos; cada asociación conserva su estado y no
                afirma obligatoriedad legal.
              </p>
            </div>
          </div>
          {requirements.length ? (
            <Badge tone={totalCovered === requirements.length ? 'emerald' : 'cyan'}>
              {totalCovered} / {requirements.length} cubiertos
            </Badge>
          ) : null}
        </div>
      </GlassPanel>

      {!requirements.length ? (
        <EmptyState
          icon={<ClipboardList className="h-8 w-8" />}
          title="Sin otros requisitos sugeridos"
          description="El checklist general se genera cuando la exógena aporta evidencia concreta."
        />
      ) : null}

      {groups.map(([entityName, entityRequirements], groupIndex) => {
        const category = entityRequirements[0]!.entityCategory;
        const visual = entityVisual(category);
        const CategoryIcon = visual.icon;
        const coveredInGroup = entityRequirements.filter((requirement) =>
          coverageState(
            coverages.filter((coverage) => coverage.requirementId === requirement.id),
          ).done,
        ).length;

        return (
          <motion.section
            key={entityName}
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: Math.min(groupIndex * 0.04, 0.2) }}
          >
            <GlassPanel className="overflow-hidden p-0">
              <header className="flex flex-wrap items-center justify-between gap-3 border-b border-overlay/8 p-4">
                <div className="flex items-center gap-3">
                  <span
                    className={`grid h-10 w-10 place-items-center rounded-xl ${TONE_BOX_CLASS[visual.tone]}`}
                  >
                    <CategoryIcon className="h-5 w-5" aria-hidden />
                  </span>
                  <div>
                    <h3 className="font-semibold text-content-strong">{entityName}</h3>
                    <p className="text-xs text-content-muted">{visual.label}</p>
                  </div>
                </div>
                <Badge tone={coveredInGroup === entityRequirements.length ? 'emerald' : 'neutral'}>
                  {coveredInGroup} / {entityRequirements.length}
                </Badge>
              </header>

              <ul className="divide-y divide-overlay/6">
                {entityRequirements.map((requirement) => {
                  const related = coverages.filter(
                    (coverage) => coverage.requirementId === requirement.id,
                  );
                  const state = coverageState(related);
                  const DocIcon = documentIcon(requirement.documentName);
                  const isOpen = expanded === requirement.id;
                  const selectedDocument =
                    documentByRequirement[requirement.id] ?? activeDocuments[0]?.id ?? '';
                  const selectedStatus = statusByRequirement[requirement.id] ?? 'covered';

                  return (
                    <li key={requirement.id} className="p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-overlay/10 bg-overlay/5 text-content-muted">
                            <DocIcon className="h-4 w-4" aria-hidden />
                          </span>
                          <div className="min-w-0">
                            <p className="font-medium text-content-strong">
                              {requirement.documentName}
                            </p>
                            <p className="text-xs text-content-muted">{requirement.reason}</p>
                          </div>
                        </div>
                        <Badge tone={state.tone}>
                          {state.done ? (
                            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                          ) : null}
                          {state.label}
                        </Badge>
                      </div>

                      {related.length ? (
                        <ul className="mt-2 flex flex-wrap gap-1.5 pl-12">
                          {related.map((coverage) => (
                            <li key={coverage.id}>
                              <span className="inline-flex items-center gap-1 rounded-full border border-overlay/10 bg-overlay/5 px-2 py-0.5 text-[11px] text-content-muted">
                                <Paperclip className="h-3 w-3" aria-hidden />
                                {documents.find((document) => document.id === coverage.documentId)
                                  ?.fileName ?? 'Hecho/manual'}
                                <span className="text-content-subtle">
                                  · {COVERAGE_LABEL[coverage.status]}
                                </span>
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : null}

                      <div className="mt-2 pl-12">
                        <button
                          type="button"
                          onClick={() => setExpanded(isOpen ? null : requirement.id)}
                          aria-expanded={isOpen}
                          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-tone-cyan transition-colors hover:bg-overlay/5"
                        >
                          <Link2 className="h-3.5 w-3.5" aria-hidden />
                          {related.length ? 'Añadir otra asociación' : 'Asociar documento'}
                          <ChevronDown
                            className={`h-3.5 w-3.5 transition-transform motion-reduce:transition-none ${isOpen ? 'rotate-180' : ''}`}
                            aria-hidden
                          />
                        </button>

                        {isOpen ? (
                          <div className="mt-2 grid gap-2 rounded-xl border border-overlay/10 bg-overlay/[0.02] p-3 md:grid-cols-[1fr_180px_auto]">
                            {activeDocuments.length ? (
                              <>
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
                                  {activeDocuments.map((document) => (
                                    <option
                                      className="bg-surface-raised"
                                      key={document.id}
                                      value={document.id}
                                    >
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
                                      [requirement.id]: event.target.value as CoverageStatus,
                                    }))
                                  }
                                  className={inputClass}
                                >
                                  {CoverageStatusSchema.options.map((status) => (
                                    <option
                                      className="bg-surface-raised"
                                      key={status}
                                      value={status}
                                    >
                                      {COVERAGE_LABEL[status]}
                                    </option>
                                  ))}
                                </select>
                                <Button
                                  variant="primary"
                                  disabled={!selectedDocument}
                                  onClick={() => {
                                    void saveRequirementCoverage({
                                      caseId,
                                      requirementId: requirement.id,
                                      documentId: selectedDocument,
                                      factId: null,
                                      entityId:
                                        result?.entities.find(
                                          (entity) => entity.name === requirement.entityName,
                                        )?.id ?? null,
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
                                    });
                                    setExpanded(null);
                                  }}
                                >
                                  Guardar
                                </Button>
                              </>
                            ) : (
                              <p className="text-xs text-content-muted md:col-span-3">
                                No hay documentos activos. Agrega uno en la{' '}
                                <span className="text-content">Biblioteca documental</span> para
                                asociarlo aquí.
                              </p>
                            )}
                          </div>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </GlassPanel>
          </motion.section>
        );
      })}
    </div>
  );
}

const inputClass =
  'min-h-10 rounded-lg border border-overlay/12 bg-overlay/5 px-3 py-2 text-sm text-content-strong';
