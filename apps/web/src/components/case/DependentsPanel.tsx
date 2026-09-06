'use client';

import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  History,
  Loader2,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import type {
  CaseTask,
  DependentDocumentType,
  DependentEvaluation,
  DependentRelationship,
  DependentSupport,
  DependentSupportType,
  PriorYearTaxReturn,
  TaxDependent,
} from '@nexus-tax/domain';
import type { Form210Draft } from '@nexus-tax/form-210';
import { Badge, Button, EmptyState, GlassPanel, formatCurrencyCOP } from '@nexus-tax/ui';
import {
  DEPENDENT_ELIGIBILITY_LABEL,
  DEPENDENT_RELATIONSHIP_LABEL,
  DEPENDENT_SUPPORT_TYPE_LABEL,
} from '@/lib/dependentsEngine';
import type { DependentsCaseContext } from '@/lib/db';
import {
  archiveTaxDependent,
  createTaxDependent,
  saveDependentsCaseContext,
  setNoDependentsDeclared,
  updateTaxDependent,
  type SaveTaxDependentInput,
} from '@/lib/repository';

const RELATIONSHIP_OPTIONS: readonly DependentRelationship[] = [
  'child_minor',
  'child_student',
  'child_disabled',
  'spouse_or_partner',
  'parent',
  'sibling',
  'foster_family',
  'other_review',
];

const DOCUMENT_TYPE_LABEL: Record<DependentDocumentType, string> = {
  CC: 'Cédula de ciudadanía',
  TI: 'Tarjeta de identidad',
  RC: 'Registro civil',
  CE: 'Cédula de extranjería',
  other: 'Otro',
};

/** Enmascara un documento conservando solo los últimos 4 dígitos, ej. "1.130.***.532". */
function maskDependentDocument(documentNumber: string | null): string {
  if (!documentNumber) return 'Sin documento';
  const digits = documentNumber.replace(/\D/g, '');
  if (digits.length <= 4) return documentNumber;
  const visible = digits.slice(-4);
  const middleLength = Math.max(0, digits.length - 4 - 3);
  return `${digits.slice(0, 3)}.${'*'.repeat(Math.max(3, middleLength))}.${visible}`;
}

const ELIGIBILITY_TONE: Record<
  DependentEvaluation['status'],
  'emerald' | 'amber' | 'rose' | 'neutral' | 'cyan'
> = {
  eligible: 'emerald',
  possibly_eligible: 'cyan',
  requires_support: 'amber',
  not_eligible: 'rose',
  pending_review: 'neutral',
};

export function DependentsPanel({
  caseId,
  taxYear,
  dependents,
  supports,
  evaluations,
  caseContext,
  priorYearReturns,
  form210Draft,
  tasks,
  advanced,
  onToggleAdvanced,
}: {
  caseId: string;
  taxYear: number;
  dependents: readonly TaxDependent[];
  supports: readonly DependentSupport[];
  evaluations: readonly DependentEvaluation[];
  caseContext?: DependentsCaseContext;
  priorYearReturns: readonly PriorYearTaxReturn[];
  form210Draft?: Form210Draft;
  tasks: readonly CaseTask[];
  advanced: boolean;
  onToggleAdvanced: () => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const activeDependents = useMemo(
    () => dependents.filter((dependent) => dependent.status === 'active'),
    [dependents],
  );
  const evaluationByDependent = useMemo(
    () => new Map(evaluations.map((item) => [item.dependentId, item])),
    [evaluations],
  );
  const noDependentsDeclared = caseContext?.noDependentsDeclared ?? false;

  const priorYearDependentsCount = useMemo(() => {
    const current = priorYearReturns.find(
      (item) => item.isCurrentVersion && item.taxYear === taxYear - 1,
    );
    const box = current?.boxes['138'];
    return box?.normalizedValueCop ?? null;
  }, [priorYearReturns, taxYear]);

  async function handleEmploymentNatureChange(value: DependentsCaseContext['employmentIncomeNature']) {
    await saveDependentsCaseContext(caseId, { employmentIncomeNature: value });
  }

  async function handleNoDependents(value: boolean) {
    await setNoDependentsDeclared(caseId, value);
  }

  const dependentsDeduction = form210Draft?.preliminaryLiquidation?.dependentsDeduction;
  const additionalDeduction = form210Draft?.preliminaryLiquidation?.dependentsAdditionalDeduction;

  return (
    <div className="space-y-5">
      <GlassPanel className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-content-strong">Beneficios y deducciones</h2>
            <p className="mt-1 text-sm text-content-muted">Dependientes</p>
            <p className="mt-2 max-w-2xl text-sm text-content-muted">
              Registra las personas que dependen económicamente de ti. NexusTax evalúa localmente
              qué beneficios podrían aplicar; la certificación final siempre requiere revisión
              humana.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onToggleAdvanced}>
              {advanced ? 'Modo normal' : 'Modo avanzado'}
            </Button>
            <Button
              leadingIcon={<UserPlus className="h-4 w-4" />}
              onClick={() => {
                setEditingId(null);
                setShowForm(true);
              }}
            >
              Agregar dependiente
            </Button>
          </div>
        </div>

        <label className="mt-4 block max-w-md text-xs text-content-muted">
          ¿Cómo obtienes tus rentas de trabajo? (define qué beneficios pueden coexistir)
          <select
            value={caseContext?.employmentIncomeNature ?? 'unknown'}
            onChange={(event) =>
              void handleEmploymentNatureChange(
                event.target.value as DependentsCaseContext['employmentIncomeNature'],
              )
            }
            className="mt-1 w-full rounded-lg border border-overlay/12 bg-surface-raised px-3 py-2 text-sm text-content-strong"
          >
            <option value="unknown">Por definir</option>
            <option value="labor_relation">Relación laboral, legal o reglamentaria (asalariado)</option>
            <option value="independent">Independiente (honorarios o servicios personales)</option>
          </select>
        </label>

        {priorYearDependentsCount && priorYearDependentsCount > 0 ? (
          <div className="mt-4 rounded-lg border border-accent-violet/20 bg-accent-violet/5 p-3 text-sm">
            <p className="flex items-center gap-2 text-content-strong">
              <History className="h-4 w-4" aria-hidden />
              El año anterior registraste {priorYearDependentsCount} dependiente(s) económico(s).
            </p>
            <p className="mt-1 text-xs text-content-subtle">
              Revisaremos esto en Beneficios y dependientes. No se crean dependientes
              automáticamente: confirma cada uno para este año.
            </p>
          </div>
        ) : null}
      </GlassPanel>

      {advanced && (dependentsDeduction || additionalDeduction) ? (
        <GlassPanel className="p-5">
          <h3 className="font-semibold text-content-strong">Detalle normativo (modo avanzado)</h3>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            {dependentsDeduction ? (
              <div className="rounded-lg border border-overlay/10 bg-overlay/[0.02] p-3 text-sm">
                <p className="font-medium text-content-strong">Beneficio A — art. 387 ET</p>
                <p className="mt-1 text-content-muted">{dependentsDeduction.formula}</p>
                <p className="mt-2 text-lg font-semibold text-content-strong">
                  {formatCurrencyCOP(dependentsDeduction.appliedDeductionCop)}
                </p>
              </div>
            ) : null}
            {additionalDeduction ? (
              <div className="rounded-lg border border-overlay/10 bg-overlay/[0.02] p-3 text-sm">
                <p className="font-medium text-content-strong">Beneficio B — art. 336 num. 3 ET (72 UVT)</p>
                <p className="mt-1 text-content-muted">{additionalDeduction.formula}</p>
                <p className="mt-2 text-lg font-semibold text-content-strong">
                  {formatCurrencyCOP(additionalDeduction.totalCop)}
                </p>
                {additionalDeduction.excludedDependents.length ? (
                  <p className="mt-1 text-xs text-tone-amber">
                    {additionalDeduction.dependentsEligibleCount} elegibles;{' '}
                    {additionalDeduction.dependentsAppliedCount} considerados para este beneficio;{' '}
                    {additionalDeduction.excludedDependents.length} fuera del máximo de cuatro.
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </GlassPanel>
      ) : null}

      {noDependentsDeclared ? (
        <GlassPanel className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-content-muted">
              Marcaste &ldquo;No tengo dependientes&rdquo; para este expediente.
            </p>
            <Button variant="ghost" onClick={() => void handleNoDependents(false)}>
              Revertir
            </Button>
          </div>
        </GlassPanel>
      ) : null}

      {activeDependents.length === 0 ? (
        <EmptyState
          icon={<Users className="h-8 w-8" />}
          title="No has registrado dependientes"
          description="Si tienes hijos, cónyuge, padres u otras personas a tu cargo, agrégalas para revisar qué beneficios podrían aplicar."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button
                onClick={() => {
                  setEditingId(null);
                  setShowForm(true);
                }}
              >
                Agregar dependiente
              </Button>
              {!noDependentsDeclared ? (
                <Button variant="secondary" onClick={() => void handleNoDependents(true)}>
                  No tengo dependientes
                </Button>
              ) : null}
            </div>
          }
        />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            {activeDependents.map((dependent) => (
              <DependentCard
                key={dependent.id}
                dependent={dependent}
                evaluation={evaluationByDependent.get(dependent.id)}
                pendingTaskCount={
                  tasks.filter((task) => task.dependentId === dependent.id && task.status === 'pending')
                    .length
                }
                advanced={advanced}
                onEdit={() => {
                  setEditingId(dependent.id);
                  setShowForm(true);
                }}
                onArchive={() => void archiveTaxDependent(dependent.id)}
              />
            ))}
          </div>
          {!noDependentsDeclared ? (
            <Button variant="ghost" onClick={() => void handleNoDependents(true)}>
              No tengo dependientes
            </Button>
          ) : null}
        </>
      )}

      {showForm ? (
        <DependentFormDrawer
          caseId={caseId}
          dependent={dependents.find((item) => item.id === editingId)}
          existingSupports={supports.filter((support) => support.dependentId === editingId)}
          saving={saving}
          onSave={async (input) => {
            setSaving(true);
            try {
              if (editingId) await updateTaxDependent(editingId, input);
              else await createTaxDependent(caseId, input);
              setShowForm(false);
              setEditingId(null);
            } finally {
              setSaving(false);
            }
          }}
          onClose={() => {
            setShowForm(false);
            setEditingId(null);
          }}
        />
      ) : null}
    </div>
  );
}

function DependentCard({
  dependent,
  evaluation,
  pendingTaskCount,
  advanced,
  onEdit,
  onArchive,
}: {
  dependent: TaxDependent;
  evaluation: DependentEvaluation | undefined;
  pendingTaskCount: number;
  advanced: boolean;
  onEdit: () => void;
  onArchive: () => void;
}) {
  const status = evaluation?.status ?? 'pending_review';
  const benefitCount = evaluation?.candidateBenefits.length ?? 0;
  return (
    <GlassPanel className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-content-strong">{dependent.fullName || 'Sin nombre'}</p>
          <p className="text-sm text-content-muted">{DEPENDENT_RELATIONSHIP_LABEL[dependent.relationship]}</p>
        </div>
        <Badge tone={ELIGIBILITY_TONE[status] ?? 'neutral'}>{DEPENDENT_ELIGIBILITY_LABEL[status]}</Badge>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div>
          <dt className="text-content-subtle">Documento</dt>
          <dd className="text-content">
            {dependent.documentType ? `${DOCUMENT_TYPE_LABEL[dependent.documentType]} · ` : ''}
            {maskDependentDocument(dependent.documentNumber)}
          </dd>
        </div>
        <div>
          <dt className="text-content-subtle">Beneficios potenciales</dt>
          <dd className="text-content">
            {advanced
              ? evaluation?.candidateBenefits
                  .map((benefit) => (benefit === 'article_387' ? 'Art. 387' : 'Art. 336 (72 UVT)'))
                  .join(', ') || 'Ninguno todavía'
              : benefitCount > 0
                ? `Puede aplicar a ${benefitCount} beneficio${benefitCount > 1 ? 's' : ''}`
                : 'Sin beneficios todavía'}
          </dd>
        </div>
      </dl>
      {pendingTaskCount > 0 ? (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-tone-amber">
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
          {pendingTaskCount} pendiente{pendingTaskCount > 1 ? 's' : ''}
        </p>
      ) : evaluation?.status === 'eligible' ? (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-tone-emerald">
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Sin pendientes
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="secondary" onClick={onEdit}>
          Revisar
        </Button>
        <Button variant="ghost" onClick={onEdit}>
          Editar
        </Button>
        <Button variant="ghost" leadingIcon={<Trash2 className="h-4 w-4" />} onClick={onArchive}>
          Eliminar
        </Button>
      </div>
    </GlassPanel>
  );
}

const SUPPORT_TYPES: readonly DependentSupportType[] = [
  'civil_registry',
  'identity_document',
  'education_certificate',
  'income_or_no_income_certificate',
  'accountant_certificate',
  'medical_certificate',
  'dependency_declaration',
  'economic_support_receipts',
  'other',
];

function DependentFormDrawer({
  caseId: _caseId,
  dependent,
  existingSupports,
  saving,
  onSave,
  onClose,
}: {
  caseId: string;
  dependent?: TaxDependent;
  existingSupports: readonly DependentSupport[];
  saving: boolean;
  onSave: (input: SaveTaxDependentInput) => Promise<void>;
  onClose: () => void;
}) {
  const [fullName, setFullName] = useState(dependent?.fullName ?? '');
  const [documentType, setDocumentType] = useState<DependentDocumentType>(
    dependent?.documentType ?? 'CC',
  );
  const [documentNumber, setDocumentNumber] = useState(dependent?.documentNumber ?? '');
  const [relationship, setRelationship] = useState<DependentRelationship>(
    dependent?.relationship ?? 'child_minor',
  );
  const [dateOfBirth, setDateOfBirth] = useState(dependent?.dateOfBirth ?? '');
  const [annualIncomeCop, setAnnualIncomeCop] = useState(
    dependent?.annualIncomeCop != null ? String(dependent.annualIncomeCop) : '',
  );
  const [studentStatus, setStudentStatus] = useState<TaxDependent['studentStatus']>(
    dependent?.studentStatus ?? 'not_applicable',
  );
  const [educationalInstitution, setEducationalInstitution] = useState(
    dependent?.educationalInstitution ?? '',
  );
  const [disabilityCondition, setDisabilityCondition] = useState<boolean | null>(
    dependent?.disabilityOrDependencyCondition ?? null,
  );
  const [monthsClaimed, setMonthsClaimed] = useState(dependent?.monthsClaimed ?? 12);
  const [notes, setNotes] = useState(dependent?.notes ?? '');

  const providedSupportTypes = new Set(existingSupports.map((support) => support.type));

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    await onSave({
      fullName,
      documentType,
      documentNumber: documentNumber || null,
      relationship,
      dateOfBirth: dateOfBirth || null,
      dependencyType: disabilityCondition
        ? 'physical_or_psychological'
        : annualIncomeCop
          ? 'no_income_or_low_income'
          : 'unknown',
      annualIncomeCop: annualIncomeCop ? Number(annualIncomeCop) : null,
      studentStatus,
      educationalInstitution: educationalInstitution || null,
      disabilityOrDependencyCondition: disabilityCondition,
      monthsClaimed,
      notes,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-surface-base/80" role="presentation">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Cerrar formulario de dependiente"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-label={dependent ? 'Editar dependiente' : 'Agregar dependiente'}
        className="relative flex h-full w-full max-w-xl flex-col overflow-y-auto border-l border-overlay/10 bg-surface-base p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-semibold text-content-strong">
            {dependent ? 'Editar dependiente' : 'Agregar dependiente'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-content-subtle hover:bg-overlay/10"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-5">
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-content-strong">Identidad</legend>
            <label className="block text-xs text-content-muted">
              Nombre completo
              <input
                required
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className="mt-1 w-full rounded-lg border border-overlay/12 bg-surface-raised px-3 py-2 text-sm text-content-strong"
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-xs text-content-muted">
                Tipo de documento
                <select
                  value={documentType}
                  onChange={(event) => setDocumentType(event.target.value as DependentDocumentType)}
                  className="mt-1 w-full rounded-lg border border-overlay/12 bg-surface-raised px-3 py-2 text-sm text-content-strong"
                >
                  {Object.entries(DOCUMENT_TYPE_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs text-content-muted">
                Número
                <input
                  value={documentNumber}
                  onChange={(event) => setDocumentNumber(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-overlay/12 bg-surface-raised px-3 py-2 text-sm text-content-strong"
                />
              </label>
            </div>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-content-strong">Relación</legend>
            <label className="block text-xs text-content-muted">
              Parentesco
              <select
                value={relationship}
                onChange={(event) => setRelationship(event.target.value as DependentRelationship)}
                className="mt-1 w-full rounded-lg border border-overlay/12 bg-surface-raised px-3 py-2 text-sm text-content-strong"
              >
                {RELATIONSHIP_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {DEPENDENT_RELATIONSHIP_LABEL[option]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs text-content-muted">
              Fecha de nacimiento (opcional)
              <input
                type="date"
                value={dateOfBirth ?? ''}
                onChange={(event) => setDateOfBirth(event.target.value)}
                className="mt-1 w-full rounded-lg border border-overlay/12 bg-surface-raised px-3 py-2 text-sm text-content-strong"
              />
            </label>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-content-strong">Situación</legend>
            <label className="block text-xs text-content-muted">
              Ingresos anuales conocidos (opcional, en pesos)
              <input
                type="number"
                min={0}
                value={annualIncomeCop}
                onChange={(event) => setAnnualIncomeCop(event.target.value)}
                className="mt-1 w-full rounded-lg border border-overlay/12 bg-surface-raised px-3 py-2 text-sm text-content-strong"
              />
            </label>
            {relationship === 'child_student' ? (
              <>
                <label className="block text-xs text-content-muted">
                  ¿Está estudiando y financias su educación?
                  <select
                    value={studentStatus}
                    onChange={(event) =>
                      setStudentStatus(event.target.value as TaxDependent['studentStatus'])
                    }
                    className="mt-1 w-full rounded-lg border border-overlay/12 bg-surface-raised px-3 py-2 text-sm text-content-strong"
                  >
                    <option value="unknown">Por confirmar</option>
                    <option value="studying">Sí, está estudiando</option>
                    <option value="not_studying">No está estudiando</option>
                  </select>
                </label>
                <label className="block text-xs text-content-muted">
                  Institución educativa (opcional)
                  <input
                    value={educationalInstitution}
                    onChange={(event) => setEducationalInstitution(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-overlay/12 bg-surface-raised px-3 py-2 text-sm text-content-strong"
                  />
                </label>
              </>
            ) : null}
            {['child_disabled', 'spouse_or_partner', 'parent', 'sibling'].includes(relationship) ? (
              <label className="block text-xs text-content-muted">
                ¿Tiene una condición física o psicológica certificada?
                <select
                  value={disabilityCondition === null ? 'unknown' : disabilityCondition ? 'yes' : 'no'}
                  onChange={(event) =>
                    setDisabilityCondition(
                      event.target.value === 'unknown' ? null : event.target.value === 'yes',
                    )
                  }
                  className="mt-1 w-full rounded-lg border border-overlay/12 bg-surface-raised px-3 py-2 text-sm text-content-strong"
                >
                  <option value="unknown">Por confirmar</option>
                  <option value="yes">Sí, certificada</option>
                  <option value="no">No</option>
                </select>
              </label>
            ) : null}
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-content-strong">Periodo</legend>
            <label className="block text-xs text-content-muted">
              Meses del año con dependencia
              <input
                type="number"
                min={0}
                max={12}
                value={monthsClaimed}
                onChange={(event) => setMonthsClaimed(Number(event.target.value))}
                className="mt-1 w-full rounded-lg border border-overlay/12 bg-surface-raised px-3 py-2 text-sm text-content-strong"
              />
            </label>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-content-strong">Soportes</legend>
            <p className="text-xs text-content-subtle">
              Los soportes se gestionan desde la biblioteca documental del expediente; aquí se
              muestra cuáles ya están asociados.
            </p>
            <ul className="flex flex-wrap gap-1.5">
              {SUPPORT_TYPES.map((type) => (
                <li key={type}>
                  <Badge tone={providedSupportTypes.has(type) ? 'emerald' : 'neutral'}>
                    {DEPENDENT_SUPPORT_TYPE_LABEL[type]}
                  </Badge>
                </li>
              ))}
            </ul>
          </fieldset>

          <label className="block text-xs text-content-muted">
            Notas (opcional)
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={2}
              className="mt-1 w-full rounded-lg border border-overlay/12 bg-surface-raised px-3 py-2 text-sm text-content-strong"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <Button
              type="submit"
              disabled={saving}
              leadingIcon={saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : undefined}
            >
              Guardar
            </Button>
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
          </div>
        </form>
      </aside>
    </div>
  );
}
