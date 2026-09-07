'use client';

import { useState } from 'react';
import { AlertTriangle, CheckCircle2, HeartPulse, Plus, Trash2, X } from 'lucide-react';
import type {
  CaseTask,
  ComplementaryHealthBeneficiary,
  ComplementaryHealthPayment,
  ComplementaryHealthProductType,
  ComplementaryHealthSupportStatus,
  TaxDependent,
} from '@nexus-tax/domain';
import type { Form210Draft } from '@nexus-tax/form-210';
import { Badge, Button, EmptyState, GlassPanel, formatCurrencyCOP } from '@nexus-tax/ui';
import {
  COMPLEMENTARY_HEALTH_BENEFICIARY_LABEL,
  COMPLEMENTARY_HEALTH_DECISION_LABEL,
  COMPLEMENTARY_HEALTH_ELIGIBILITY_LABEL,
  COMPLEMENTARY_HEALTH_ELIGIBILITY_TONE,
  COMPLEMENTARY_HEALTH_PRODUCT_TYPE_LABEL,
  COMPLEMENTARY_HEALTH_SUPPORT_STATUS_LABEL,
  COMPLEMENTARY_HEALTH_SUPPORT_TYPE_LABEL,
  MONTH_LABEL,
  labelOrFallback,
} from '@/lib/complementaryHealthLabels';
import {
  createComplementaryHealthPayment,
  decideComplementaryHealthPayment,
  removeComplementaryHealthPayment,
  type SaveComplementaryHealthPaymentInput,
} from '@/lib/repository';

const PRODUCT_TYPE_OPTIONS: readonly ComplementaryHealthProductType[] = [
  'prepaid_medicine',
  'health_insurance',
  'additional_health_plan',
  'other',
];

const BENEFICIARY_OPTIONS: readonly ComplementaryHealthBeneficiary[] = [
  'taxpayer',
  'spouse_or_partner',
  'child',
  'dependent',
];

const SUPPORT_STATUS_OPTIONS: readonly ComplementaryHealthSupportStatus[] = [
  'sufficient',
  'partially_supported',
  'missing',
  'requires_review',
];

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) => index + 1);

/**
 * Panel de salud complementaria y medicina prepagada (Sprint 2.4, Fase H).
 * Principio inviolable: el límite del art. 387 ET es MENSUAL y agregado
 * para el contribuyente (16 UVT), nunca por proveedor ni beneficiario —
 * el flujo siempre pregunta primero el beneficiario y el mes antes de
 * mostrar cualquier candidato como elegible, y el impacto mensual se
 * explica con el mismo cálculo que produce el motor real (nunca
 * recalculado en la UI).
 */
export function ComplementaryHealthPanel({
  caseId,
  dependents,
  payments,
  form210Draft,
  tasks,
  advanced,
  onToggleAdvanced,
}: {
  caseId: string;
  dependents: readonly TaxDependent[];
  payments: readonly ComplementaryHealthPayment[];
  form210Draft?: Form210Draft;
  tasks: readonly CaseTask[];
  advanced: boolean;
  onToggleAdvanced: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const activeDependents = dependents.filter((dependent) => dependent.status === 'active');
  const capComputation = form210Draft?.preliminaryLiquidation?.complementaryHealthDeduction ?? null;

  const totalConfirmedCop = payments
    .filter((payment) => payment.decisionStatus === 'confirmed')
    .reduce((sum, payment) => sum + (payment.eligibleAmountCop ?? 0), 0);

  return (
    <div className="space-y-5">
      <GlassPanel className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-content-strong">Salud complementaria</h2>
            <p className="mt-1 text-sm text-content-muted">Medicina prepagada y seguros de salud</p>
            <p className="mt-2 max-w-2xl text-sm text-content-muted">
              ¿Pagaste medicina prepagada, seguro de salud o un plan adicional de salud durante
              2025? Este beneficio tiene un límite mensual, por eso necesitamos saber en qué meses
              hiciste los pagos.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onToggleAdvanced}>
              {advanced ? 'Modo normal' : 'Modo avanzado'}
            </Button>
            <Button leadingIcon={<Plus className="h-4 w-4" />} onClick={() => setShowForm(true)}>
              Agregar pago
            </Button>
          </div>
        </div>
        {advanced && totalConfirmedCop > 0 ? (
          <div className="mt-4 rounded-lg border border-accent-violet/20 bg-accent-violet/5 p-3 text-sm">
            <p className="text-content-strong">
              Impacto preliminar confirmado: {formatCurrencyCOP(totalConfirmedCop)}
            </p>
            <p className="mt-1 text-xs text-content-subtle">
              Suma de pagos que confirmaste, ya considerando el tope mensual de 16 UVT (art. 387
              ET). Se cablea a la casilla 39 del Formulario 210.
            </p>
          </div>
        ) : null}
      </GlassPanel>

      {advanced && capComputation && capComputation.months.length > 0 ? (
        <GlassPanel className="p-5">
          <h3 className="font-semibold text-content-strong">Tope mensual por mes (16 UVT)</h3>
          <p className="mt-1 text-xs text-content-subtle">
            Máximo aplicable: {formatCurrencyCOP(capComputation.monthlyCapCop)} por mes.
          </p>
          <div className="mt-3 space-y-2">
            {capComputation.months.map((month) => (
              <div
                key={month.month}
                className="flex items-center justify-between rounded-lg border border-overlay/10 bg-overlay/[0.02] p-2 text-xs"
              >
                <span className="text-content-muted">{MONTH_LABEL[month.month] ?? month.month}</span>
                <span className="text-content-subtle">
                  Pagaste {formatCurrencyCOP(month.totalPaidCop)}
                </span>
                <span className={month.capApplied ? 'text-tone-amber' : 'text-tone-emerald'}>
                  Valor considerado: {formatCurrencyCOP(month.eligibleCop)}
                  {month.capApplied ? ' (tope aplicado)' : ''}
                </span>
              </div>
            ))}
          </div>
        </GlassPanel>
      ) : null}

      {payments.length === 0 ? (
        <EmptyState
          icon={<HeartPulse className="h-8 w-8" />}
          title="No has registrado pagos de salud complementaria"
          description="Si pagaste medicina prepagada, un seguro de salud o un plan adicional de salud, agrégalo para revisar el beneficio orientativo del art. 387 ET."
          action={<Button onClick={() => setShowForm(true)}>Agregar pago</Button>}
        />
      ) : (
        <div className="space-y-3">
          {payments.map((payment) => (
            <ComplementaryHealthPaymentCard
              key={payment.id}
              payment={payment}
              dependents={activeDependents}
              pendingTaskCount={
                tasks.filter(
                  (task) => task.complementaryHealthPaymentId === payment.id && task.status === 'pending',
                ).length
              }
              advanced={advanced}
            />
          ))}
        </div>
      )}

      {showForm ? (
        <ComplementaryHealthFormDrawer
          dependents={activeDependents}
          onSave={async (input) => {
            await createComplementaryHealthPayment(caseId, input);
            setShowForm(false);
          }}
          onClose={() => setShowForm(false)}
        />
      ) : null}
    </div>
  );
}

function ComplementaryHealthPaymentCard({
  payment,
  dependents,
  pendingTaskCount,
  advanced,
}: {
  payment: ComplementaryHealthPayment;
  dependents: readonly TaxDependent[];
  pendingTaskCount: number;
  advanced: boolean;
}) {
  const tone = COMPLEMENTARY_HEALTH_ELIGIBILITY_TONE[payment.eligibilityStatus] ?? 'neutral';
  const canDecide = payment.eligibilityStatus === 'eligible' || payment.eligibilityStatus === 'cap_applied';
  const dependentName =
    payment.beneficiary === 'dependent'
      ? dependents.find((item) => item.id === payment.beneficiaryDependentId)?.fullName ?? 'Sin vincular'
      : null;

  async function handleDecision(status: 'confirmed' | 'rejected') {
    await decideComplementaryHealthPayment(payment.id, status);
  }

  return (
    <GlassPanel className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-content-strong">{payment.providerName}</p>
          <p className="text-sm text-content-muted">
            {labelOrFallback(COMPLEMENTARY_HEALTH_PRODUCT_TYPE_LABEL, payment.productType)} ·{' '}
            {labelOrFallback(COMPLEMENTARY_HEALTH_BENEFICIARY_LABEL, payment.beneficiary)}
            {dependentName ? ` (${dependentName})` : ''}
          </p>
        </div>
        <Badge tone={tone}>{labelOrFallback(COMPLEMENTARY_HEALTH_ELIGIBILITY_LABEL, payment.eligibilityStatus)}</Badge>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div>
          <dt className="text-content-subtle">Mes</dt>
          <dd className="text-content">
            {payment.month ? MONTH_LABEL[payment.month] : payment.coveragePeriodDescription || 'Sin definir'}
          </dd>
        </div>
        <div>
          <dt className="text-content-subtle">Pagaste</dt>
          <dd className="text-content">{formatCurrencyCOP(payment.amountPaidCop)}</dd>
        </div>
      </dl>
      {payment.eligibleAmountCop !== null ? (
        <p className="mt-2 text-xs text-content-muted">
          Valor considerado: {formatCurrencyCOP(payment.eligibleAmountCop)}
          {payment.eligibilityStatus === 'cap_applied' ? ' (tope mensual de 16 UVT aplicado)' : ''}
        </p>
      ) : null}
      {advanced && payment.eligibilityReasons.length > 0 ? (
        <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-content-subtle">
          {payment.eligibilityReasons.map((reason, index) => (
            <li key={index}>{reason}</li>
          ))}
        </ul>
      ) : null}
      {pendingTaskCount > 0 ? (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-tone-amber">
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
          {pendingTaskCount} pendiente{pendingTaskCount > 1 ? 's' : ''}
        </p>
      ) : payment.decisionStatus !== 'pending' ? (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-tone-emerald">
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Sin pendientes
        </p>
      ) : null}
      {payment.decisionStatus !== 'pending' ? (
        <p className="mt-2 text-xs text-content-subtle">
          {COMPLEMENTARY_HEALTH_DECISION_LABEL[payment.decisionStatus]}
        </p>
      ) : canDecide ? (
        <div className="mt-3 flex gap-2">
          <Button variant="secondary" onClick={() => void handleDecision('confirmed')}>
            Confirmar
          </Button>
          <Button variant="ghost" onClick={() => void handleDecision('rejected')}>
            Descartar
          </Button>
        </div>
      ) : null}
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          className="text-content-subtle hover:text-tone-rose"
          aria-label="Eliminar pago"
          onClick={() => void removeComplementaryHealthPayment(payment.id)}
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
    </GlassPanel>
  );
}

function ComplementaryHealthFormDrawer({
  dependents,
  onSave,
  onClose,
}: {
  dependents: readonly TaxDependent[];
  onSave: (input: SaveComplementaryHealthPaymentInput) => Promise<void>;
  onClose: () => void;
}) {
  const [providerName, setProviderName] = useState('');
  const [productType, setProductType] = useState<ComplementaryHealthProductType>('prepaid_medicine');
  const [beneficiary, setBeneficiary] = useState<ComplementaryHealthBeneficiary>('taxpayer');
  const [beneficiaryDependentId, setBeneficiaryDependentId] = useState<string>(dependents[0]?.id ?? '');
  const [hasKnownMonth, setHasKnownMonth] = useState(true);
  const [month, setMonth] = useState(1);
  const [coveragePeriodDescription, setCoveragePeriodDescription] = useState('');
  const [amountPaidCop, setAmountPaidCop] = useState('');
  const [supportStatus, setSupportStatus] = useState<ComplementaryHealthSupportStatus>('missing');
  const [supportTypes, setSupportTypes] = useState<string[]>([]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    await onSave({
      providerName,
      productType,
      beneficiary,
      beneficiaryDependentId: beneficiary === 'dependent' ? beneficiaryDependentId || null : null,
      month: hasKnownMonth ? month : null,
      coveragePeriodDescription: hasKnownMonth ? null : coveragePeriodDescription || null,
      amountPaidCop: Number(amountPaidCop) || 0,
      supportStatus,
      supportTypes,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-surface-base/80" role="presentation">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Cerrar formulario de salud complementaria"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-label="Agregar pago de salud complementaria"
        className="relative flex h-full w-full max-w-xl flex-col overflow-y-auto border-l border-overlay/10 bg-surface-base p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-semibold text-content-strong">Agregar pago</h3>
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
          <label className="block text-xs text-content-muted">
            Proveedor (empresa de medicina prepagada o aseguradora)
            <input
              required
              value={providerName}
              onChange={(event) => setProviderName(event.target.value)}
              className="mt-1 w-full rounded-lg border border-overlay/12 bg-surface-raised px-3 py-2 text-sm text-content-strong"
            />
          </label>
          <label className="block text-xs text-content-muted">
            Tipo de producto
            <select
              value={productType}
              onChange={(event) => setProductType(event.target.value as ComplementaryHealthProductType)}
              className="mt-1 w-full rounded-lg border border-overlay/12 bg-surface-raised px-3 py-2 text-sm text-content-strong"
            >
              {PRODUCT_TYPE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {COMPLEMENTARY_HEALTH_PRODUCT_TYPE_LABEL[option]}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-content-muted">
            ¿Quién estaba cubierto?
            <select
              value={beneficiary}
              onChange={(event) => setBeneficiary(event.target.value as ComplementaryHealthBeneficiary)}
              className="mt-1 w-full rounded-lg border border-overlay/12 bg-surface-raised px-3 py-2 text-sm text-content-strong"
            >
              {BENEFICIARY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {COMPLEMENTARY_HEALTH_BENEFICIARY_LABEL[option]}
                </option>
              ))}
            </select>
          </label>
          {beneficiary === 'dependent' ? (
            <label className="block text-xs text-content-muted">
              Dependiente
              <select
                value={beneficiaryDependentId}
                onChange={(event) => setBeneficiaryDependentId(event.target.value)}
                className="mt-1 w-full rounded-lg border border-overlay/12 bg-surface-raised px-3 py-2 text-sm text-content-strong"
              >
                <option value="">Sin vincular todavía</option>
                {dependents.map((dependent) => (
                  <option key={dependent.id} value={dependent.id}>
                    {dependent.fullName}
                  </option>
                ))}
              </select>
              {dependents.length === 0 ? (
                <span className="mt-1 block text-tone-amber">
                  No tienes dependientes registrados. Agrega uno en Beneficios y deducciones.
                </span>
              ) : null}
            </label>
          ) : null}
          <fieldset className="space-y-2">
            <legend className="text-xs text-content-muted">
              El límite del art. 387 ET es mensual: necesitamos saber en qué mes hiciste este pago.
            </legend>
            <label className="flex items-center gap-2 text-xs text-content-muted">
              <input
                type="radio"
                checked={hasKnownMonth}
                onChange={() => setHasKnownMonth(true)}
              />
              Conozco el mes exacto
            </label>
            {hasKnownMonth ? (
              <select
                aria-label="Mes del pago"
                value={month}
                onChange={(event) => setMonth(Number(event.target.value))}
                className="w-full rounded-lg border border-overlay/12 bg-surface-raised px-3 py-2 text-sm text-content-strong"
              >
                {MONTH_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {MONTH_LABEL[option]}
                  </option>
                ))}
              </select>
            ) : null}
            <label className="flex items-center gap-2 text-xs text-content-muted">
              <input
                type="radio"
                checked={!hasKnownMonth}
                onChange={() => setHasKnownMonth(false)}
              />
              Solo tengo un certificado anual sin detalle mensual
            </label>
            {!hasKnownMonth ? (
              <input
                value={coveragePeriodDescription}
                onChange={(event) => setCoveragePeriodDescription(event.target.value)}
                placeholder="Período de cobertura (ej. Enero-Diciembre 2025), si lo conoces"
                className="w-full rounded-lg border border-overlay/12 bg-surface-raised px-3 py-2 text-sm text-content-strong"
              />
            ) : null}
          </fieldset>
          <label className="block text-xs text-content-muted">
            Valor pagado (COP)
            <input
              type="number"
              min={0}
              required
              value={amountPaidCop}
              onChange={(event) => setAmountPaidCop(event.target.value)}
              className="mt-1 w-full rounded-lg border border-overlay/12 bg-surface-raised px-3 py-2 text-sm text-content-strong"
            />
          </label>
          <label className="block text-xs text-content-muted">
            Estado del soporte
            <select
              value={supportStatus}
              onChange={(event) => setSupportStatus(event.target.value as ComplementaryHealthSupportStatus)}
              className="mt-1 w-full rounded-lg border border-overlay/12 bg-surface-raised px-3 py-2 text-sm text-content-strong"
            >
              {SUPPORT_STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {COMPLEMENTARY_HEALTH_SUPPORT_STATUS_LABEL[option]}
                </option>
              ))}
            </select>
          </label>
          <fieldset className="space-y-1">
            <legend className="text-xs text-content-muted">
              Soporte disponible (no se exige factura electrónica)
            </legend>
            {Object.entries(COMPLEMENTARY_HEALTH_SUPPORT_TYPE_LABEL).map(([value, label]) => (
              <label key={value} className="flex items-center gap-2 text-xs text-content-muted">
                <input
                  type="checkbox"
                  checked={supportTypes.includes(value)}
                  onChange={(event) =>
                    setSupportTypes((current) =>
                      event.target.checked
                        ? [...current, value]
                        : current.filter((item) => item !== value),
                    )
                  }
                />
                {label}
              </label>
            ))}
          </fieldset>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">Guardar pago</Button>
          </div>
        </form>
      </aside>
    </div>
  );
}
