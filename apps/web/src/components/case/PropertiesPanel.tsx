'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Home,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import type {
  CaseTask,
  PropertyAllocationMethod,
  PropertyExpense,
  PropertyExpenseDecisionStatus,
  PropertyExpenseType,
  PropertySupportStatus,
  PropertyType,
  PropertyUse,
  RentalActivity,
  RentalIncome,
  TaxProperty,
} from '@nexus-tax/domain';
import { Badge, Button, EmptyState, GlassPanel, formatCurrencyCOP } from '@nexus-tax/ui';
import {
  ADMINISTRATION_SUPPORT_TYPE_LABEL,
  PROPERTY_ALLOCATION_METHOD_LABEL,
  PROPERTY_EXPENSE_DECISION_LABEL,
  PROPERTY_EXPENSE_ELIGIBILITY_LABEL,
  PROPERTY_EXPENSE_ELIGIBILITY_TONE,
  PROPERTY_EXPENSE_TYPE_LABEL,
  PROPERTY_SUPPORT_STATUS_LABEL,
  PROPERTY_TYPE_LABEL,
  PROPERTY_USE_LABEL,
  PROPERTY_USE_TONE,
  labelOrFallback,
} from '@/lib/propertyLabels';
import {
  createPropertyExpense,
  createRentalActivity,
  createTaxProperty,
  decidePropertyExpense,
  deleteTaxProperty,
  linkRentalIncome,
  removePropertyExpense,
  removeRentalActivity,
  removeRentalIncome,
  updateTaxProperty,
  type SavePropertyExpenseInput,
  type SaveRentalActivityInput,
  type SaveTaxPropertyInput,
} from '@/lib/repository';

const PROPERTY_TYPE_OPTIONS: readonly PropertyType[] = [
  'apartment',
  'house',
  'parking',
  'storage',
  'commercial',
  'land',
  'other',
];

const PROPERTY_USE_OPTIONS: readonly PropertyUse[] = [
  'unknown',
  'personal_residence',
  'rented',
  'business_use',
  'mixed',
  'vacant',
  'other',
];

const EXPENSE_TYPE_OPTIONS: readonly PropertyExpenseType[] = [
  'administration_fee',
  'property_tax',
  'maintenance',
  'repair',
  'insurance',
  'utilities',
  'mortgage_interest',
  'other',
];

const SUPPORT_STATUS_OPTIONS: readonly PropertySupportStatus[] = [
  'sufficient',
  'partially_supported',
  'missing',
  'requires_review',
];

const ALLOCATION_METHOD_OPTIONS: readonly PropertyAllocationMethod[] = [
  'unknown',
  'percentage',
  'period',
  'both',
];

/**
 * Panel de inmuebles, renta inmobiliaria y administración de propiedad
 * horizontal (Sprint 2.4, Fase G). Principio inviolable (§2): la sola
 * propiedad de un inmueble NUNCA sugiere un gasto deducible — primero se
 * pregunta el uso, luego (si aplica) el período de arrendamiento y el
 * ingreso conciliado, y solo entonces se muestran los gastos como
 * candidatos "potencialmente deducibles", siempre sujetos a decisión
 * humana. Esta fase no escribe ningún valor al Formulario 210 (§25): el
 * impacto mostrado aquí es preliminar e informativo.
 */
export function PropertiesPanel({
  caseId,
  taxYear,
  properties,
  rentalActivities,
  rentalIncomes,
  propertyExpenses,
  tasks,
  advanced,
  onToggleAdvanced,
}: {
  caseId: string;
  taxYear: number;
  properties: readonly TaxProperty[];
  rentalActivities: readonly RentalActivity[];
  rentalIncomes: readonly RentalIncome[];
  propertyExpenses: readonly PropertyExpense[];
  tasks: readonly CaseTask[];
  advanced: boolean;
  onToggleAdvanced: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const activitiesByProperty = useMemo(() => {
    const map = new Map<string, RentalActivity[]>();
    for (const activity of rentalActivities) {
      const list = map.get(activity.propertyId) ?? [];
      list.push(activity);
      map.set(activity.propertyId, list);
    }
    return map;
  }, [rentalActivities]);

  const incomesByProperty = useMemo(() => {
    const map = new Map<string, RentalIncome[]>();
    for (const income of rentalIncomes) {
      const list = map.get(income.propertyId) ?? [];
      list.push(income);
      map.set(income.propertyId, list);
    }
    return map;
  }, [rentalIncomes]);

  const expensesByProperty = useMemo(() => {
    const map = new Map<string, PropertyExpense[]>();
    for (const expense of propertyExpenses) {
      const list = map.get(expense.propertyId) ?? [];
      list.push(expense);
      map.set(expense.propertyId, list);
    }
    return map;
  }, [propertyExpenses]);

  const potentialImpactCop = useMemo(
    () =>
      propertyExpenses
        .filter(
          (expense) =>
            expense.eligibilityStatus === 'potentially_deductible' &&
            expense.decisionStatus === 'confirmed',
        )
        .reduce((sum, expense) => sum + expense.amountCop, 0),
    [propertyExpenses],
  );

  return (
    <div className="space-y-5">
      <GlassPanel className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-content-strong">Inmuebles</h2>
            <p className="mt-1 text-sm text-content-muted">
              Renta inmobiliaria y administración de propiedad horizontal
            </p>
            <p className="mt-2 max-w-2xl text-sm text-content-muted">
              Ser propietario de un inmueble no implica ningún gasto deducible por sí solo.
              Registra primero qué hiciste con cada inmueble durante el año; NexusTax solo sugiere
              gastos candidatos cuando hay uso, período e ingreso compatibles, y siempre esperando
              tu confirmación.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onToggleAdvanced}>
              {advanced ? 'Modo normal' : 'Modo avanzado'}
            </Button>
            <Button
              leadingIcon={<Plus className="h-4 w-4" />}
              onClick={() => {
                setEditingId(null);
                setShowForm(true);
              }}
            >
              Agregar inmueble
            </Button>
          </div>
        </div>
        {advanced && potentialImpactCop > 0 ? (
          <div className="mt-4 rounded-lg border border-accent-violet/20 bg-accent-violet/5 p-3 text-sm">
            <p className="text-content-strong">
              Impacto preliminar confirmado: {formatCurrencyCOP(potentialImpactCop)}
            </p>
            <p className="mt-1 text-xs text-content-subtle">
              Suma de gastos que confirmaste como potencialmente deducibles. Es informativo: esta
              fase todavía no lo incorpora al Formulario 210 (ver limitaciones documentadas).
            </p>
          </div>
        ) : null}
      </GlassPanel>

      {properties.length === 0 ? (
        <EmptyState
          icon={<Home className="h-8 w-8" />}
          title="No has registrado inmuebles"
          description="Si eres propietario de un apartamento, casa, parqueadero, depósito o local, agrégalo para revisar su tratamiento tributario orientativo."
          action={
            <Button
              onClick={() => {
                setEditingId(null);
                setShowForm(true);
              }}
            >
              Agregar inmueble
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {properties.map((property) => (
            <PropertyCard
              key={property.id}
              property={property}
              activities={activitiesByProperty.get(property.id) ?? []}
              incomes={incomesByProperty.get(property.id) ?? []}
              expenses={expensesByProperty.get(property.id) ?? []}
              pendingTaskCount={
                tasks.filter(
                  (task) =>
                    (task.propertyId === property.id ||
                      expensesByProperty
                        .get(property.id)
                        ?.some((expense) => expense.id === task.propertyExpenseId)) &&
                    task.status === 'pending',
                ).length
              }
              advanced={advanced}
              expanded={expandedId === property.id}
              onToggleExpanded={() =>
                setExpandedId((current) => (current === property.id ? null : property.id))
              }
              onEdit={() => {
                setEditingId(property.id);
                setShowForm(true);
              }}
              onDelete={() => void deleteTaxProperty(property.id)}
            />
          ))}
        </div>
      )}

      {showForm ? (
        <PropertyFormDrawer
          taxYear={taxYear}
          property={properties.find((item) => item.id === editingId)}
          onSave={async (input) => {
            if (editingId) await updateTaxProperty(editingId, input);
            else await createTaxProperty(caseId, input);
            setShowForm(false);
            setEditingId(null);
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

function PropertyCard({
  property,
  activities,
  incomes,
  expenses,
  pendingTaskCount,
  advanced,
  expanded,
  onToggleExpanded,
  onEdit,
  onDelete,
}: {
  property: TaxProperty;
  activities: readonly RentalActivity[];
  incomes: readonly RentalIncome[];
  expenses: readonly PropertyExpense[];
  pendingTaskCount: number;
  advanced: boolean;
  expanded: boolean;
  onToggleExpanded: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const totalIncomeCop = incomes.reduce((sum, income) => sum + income.amountCop, 0);
  const needsAllocation = property.use === 'mixed';
  const requiresRentalContext =
    property.use === 'rented' || property.use === 'mixed' || property.use === 'business_use';

  return (
    <GlassPanel className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 font-semibold text-content-strong">
            <Building2 className="h-4 w-4 text-content-subtle" aria-hidden />
            {property.label}
          </p>
          <p className="text-sm text-content-muted">
            {labelOrFallback(PROPERTY_TYPE_LABEL, property.propertyType)} · {property.ownershipPercentage}%
            de propiedad
          </p>
        </div>
        <Badge tone={PROPERTY_USE_TONE[property.use] ?? 'neutral'}>
          {labelOrFallback(PROPERTY_USE_LABEL, property.use)}
        </Badge>
      </div>

      {requiresRentalContext ? (
        <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div>
            <dt className="text-content-subtle">Período de actividad</dt>
            <dd className="text-content">
              {activities.length > 0
                ? `${activities.length} período${activities.length > 1 ? 's' : ''} registrado${activities.length > 1 ? 's' : ''}`
                : 'Sin período registrado'}
            </dd>
          </div>
          <div>
            <dt className="text-content-subtle">Ingreso vinculado</dt>
            <dd className="text-content">
              {incomes.length > 0 ? formatCurrencyCOP(totalIncomeCop) : 'Sin ingreso vinculado'}
            </dd>
          </div>
        </dl>
      ) : null}

      {pendingTaskCount > 0 ? (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-tone-amber">
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
          {pendingTaskCount} pendiente{pendingTaskCount > 1 ? 's' : ''}
        </p>
      ) : expenses.length > 0 ? (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-tone-emerald">
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Sin pendientes
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="secondary" onClick={onToggleExpanded}>
          {expanded ? 'Ocultar detalle' : 'Gestionar'}
        </Button>
        <Button variant="ghost" onClick={onEdit}>
          Editar
        </Button>
        <Button variant="ghost" leadingIcon={<Trash2 className="h-4 w-4" />} onClick={onDelete}>
          Eliminar
        </Button>
      </div>

      {expanded ? (
        <div className="mt-5 space-y-4 border-t border-overlay/10 pt-4">
          {requiresRentalContext ? (
            <PropertyRentalSection
              property={property}
              activities={activities}
              incomes={incomes}
              needsAllocation={needsAllocation}
            />
          ) : null}
          <PropertyExpensesSection property={property} activities={activities} expenses={expenses} advanced={advanced} />
        </div>
      ) : null}
    </GlassPanel>
  );
}

function PropertyRentalSection({
  property,
  activities,
  incomes,
  needsAllocation,
}: {
  property: TaxProperty;
  activities: readonly RentalActivity[];
  incomes: readonly RentalIncome[];
  needsAllocation: boolean;
}) {
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [showIncomeForm, setShowIncomeForm] = useState(false);
  const [activityFrom, setActivityFrom] = useState('');
  const [activityTo, setActivityTo] = useState('');
  const [activityMonths, setActivityMonths] = useState(12);
  const [incomeActivityId, setIncomeActivityId] = useState<string>(activities[0]?.id ?? '');
  const [incomeAmount, setIncomeAmount] = useState('');
  const [incomePeriod, setIncomePeriod] = useState('');

  // Si el período se registra mientras este formulario ya estaba montado
  // (p. ej. la sección de arrendamiento se expande antes de agregar el
  // período), la selección por defecto se sincroniza con el período más
  // reciente en vez de quedar vacía silenciosamente.
  useEffect(() => {
    const latest = activities[activities.length - 1];
    if (!incomeActivityId && latest) {
      setIncomeActivityId(latest.id);
    }
  }, [activities, incomeActivityId]);

  async function handleAddActivity(event: React.FormEvent) {
    event.preventDefault();
    const input: SaveRentalActivityInput = {
      from: activityFrom,
      to: activityTo,
      monthsCovered: activityMonths,
    };
    await createRentalActivity(property.caseId, property.id, input);
    setShowActivityForm(false);
    setActivityFrom('');
    setActivityTo('');
    setActivityMonths(12);
  }

  async function handleAddIncome(event: React.FormEvent) {
    event.preventDefault();
    await linkRentalIncome(property.caseId, {
      propertyId: property.id,
      rentalActivityId: incomeActivityId || null,
      sourceKind: 'manual',
      sourceId: null,
      amountCop: Number(incomeAmount) || 0,
      period: incomePeriod || null,
    });
    setShowIncomeForm(false);
    setIncomeAmount('');
    setIncomePeriod('');
  }

  return (
    <div className="rounded-lg border border-overlay/10 bg-overlay/[0.02] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-medium text-content-strong">
          Período de arrendamiento / actividad
        </h4>
        <Button variant="ghost" onClick={() => setShowActivityForm((value) => !value)}>
          Agregar período
        </Button>
      </div>
      {needsAllocation ? (
        <p className="mt-1 text-xs text-tone-amber">
          Uso mixto: define el porcentaje o período de asignación al editar el inmueble antes de
          confirmar gastos.
        </p>
      ) : null}
      <ul className="mt-2 space-y-1 text-xs text-content-muted">
        {activities.length === 0 ? (
          <li>No hay ningún período registrado. Sin período, no se asume el año completo.</li>
        ) : (
          activities.map((activity) => (
            <li key={activity.id} className="flex items-center justify-between gap-2">
              <span>
                {activity.from} a {activity.to} · {activity.monthsCovered} mes
                {activity.monthsCovered === 1 ? '' : 'es'}
              </span>
              <button
                type="button"
                className="text-content-subtle hover:text-tone-rose"
                aria-label="Eliminar período"
                onClick={() => void removeRentalActivity(activity.id)}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
              </button>
            </li>
          ))
        )}
      </ul>
      {showActivityForm ? (
        <form onSubmit={handleAddActivity} className="mt-3 grid grid-cols-3 gap-2 text-xs">
          <label className="block text-content-muted">
            Desde
            <input
              type="date"
              required
              value={activityFrom}
              onChange={(event) => setActivityFrom(event.target.value)}
              className="mt-1 w-full rounded-lg border border-overlay/12 bg-surface-raised px-2 py-1.5 text-content-strong"
            />
          </label>
          <label className="block text-content-muted">
            Hasta
            <input
              type="date"
              required
              value={activityTo}
              onChange={(event) => setActivityTo(event.target.value)}
              className="mt-1 w-full rounded-lg border border-overlay/12 bg-surface-raised px-2 py-1.5 text-content-strong"
            />
          </label>
          <label className="block text-content-muted">
            Meses cubiertos
            <input
              type="number"
              min={0}
              max={12}
              value={activityMonths}
              onChange={(event) => setActivityMonths(Number(event.target.value))}
              className="mt-1 w-full rounded-lg border border-overlay/12 bg-surface-raised px-2 py-1.5 text-content-strong"
            />
          </label>
          <div className="col-span-3 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setShowActivityForm(false)}>
              Cancelar
            </Button>
            <Button type="submit">Guardar período</Button>
          </div>
        </form>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-medium text-content-strong">Ingreso vinculado</h4>
        <Button variant="ghost" onClick={() => setShowIncomeForm((value) => !value)}>
          Vincular ingreso
        </Button>
      </div>
      <ul className="mt-2 space-y-1 text-xs text-content-muted">
        {incomes.length === 0 ? (
          <li>Sin ingreso vinculado todavía.</li>
        ) : (
          incomes.map((income) => (
            <li key={income.id} className="flex items-center justify-between gap-2">
              <span>
                {formatCurrencyCOP(income.amountCop)}
                {income.period ? ` · ${income.period}` : ''}
              </span>
              <button
                type="button"
                className="text-content-subtle hover:text-tone-rose"
                aria-label="Quitar ingreso"
                onClick={() => void removeRentalIncome(income.id)}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
              </button>
            </li>
          ))
        )}
      </ul>
      {showIncomeForm ? (
        <form onSubmit={handleAddIncome} className="mt-3 grid grid-cols-3 gap-2 text-xs">
          <label className="block text-content-muted">
            Período (opcional)
            <select
              value={incomeActivityId}
              onChange={(event) => setIncomeActivityId(event.target.value)}
              className="mt-1 w-full rounded-lg border border-overlay/12 bg-surface-raised px-2 py-1.5 text-content-strong"
            >
              <option value="">Sin período específico</option>
              {activities.map((activity) => (
                <option key={activity.id} value={activity.id}>
                  {activity.from} a {activity.to}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-content-muted">
            Valor (COP)
            <input
              type="number"
              min={0}
              required
              value={incomeAmount}
              onChange={(event) => setIncomeAmount(event.target.value)}
              className="mt-1 w-full rounded-lg border border-overlay/12 bg-surface-raised px-2 py-1.5 text-content-strong"
            />
          </label>
          <label className="block text-content-muted">
            Período (texto libre)
            <input
              value={incomePeriod}
              onChange={(event) => setIncomePeriod(event.target.value)}
              placeholder="Ej. Ene-Dic 2025"
              className="mt-1 w-full rounded-lg border border-overlay/12 bg-surface-raised px-2 py-1.5 text-content-strong"
            />
          </label>
          <p className="col-span-3 text-content-subtle">
            Este valor es un enlace manual de presentación; si el ingreso ya está en tu exógena o
            en un documento confirmado, no lo dupliques aquí — solo úsalo cuando aún no exista esa
            fuente.
          </p>
          <div className="col-span-3 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setShowIncomeForm(false)}>
              Cancelar
            </Button>
            <Button type="submit">Guardar ingreso</Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}

function PropertyExpensesSection({
  property,
  activities,
  expenses,
  advanced,
}: {
  property: TaxProperty;
  activities: readonly RentalActivity[];
  expenses: readonly PropertyExpense[];
  advanced: boolean;
}) {
  const [showForm, setShowForm] = useState(false);
  return (
    <div className="rounded-lg border border-overlay/10 bg-overlay/[0.02] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-medium text-content-strong">Gastos del inmueble</h4>
        <Button variant="ghost" onClick={() => setShowForm((value) => !value)}>
          Agregar gasto
        </Button>
      </div>
      {expenses.length === 0 ? (
        <p className="mt-2 text-xs text-content-muted">
          Sin gastos registrados. Administración, predial, mantenimiento y otros gastos solo se
          sugieren como candidatos cuando el uso, período e ingreso lo permiten.
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          {expenses.map((expense) => (
            <PropertyExpenseCard key={expense.id} expense={expense} advanced={advanced} />
          ))}
        </div>
      )}
      {showForm ? (
        <PropertyExpenseForm
          property={property}
          activities={activities}
          onSave={async (input) => {
            await createPropertyExpense(property.caseId, property.id, input);
            setShowForm(false);
          }}
          onClose={() => setShowForm(false)}
        />
      ) : null}
    </div>
  );
}

function PropertyExpenseCard({
  expense,
  advanced,
}: {
  expense: PropertyExpense;
  advanced: boolean;
}) {
  const tone = PROPERTY_EXPENSE_ELIGIBILITY_TONE[expense.eligibilityStatus] ?? 'neutral';
  const canDecide = expense.eligibilityStatus === 'potentially_deductible';

  async function handleDecision(status: PropertyExpenseDecisionStatus) {
    await decidePropertyExpense(expense.id, status);
  }

  return (
    <div className="rounded-lg border border-overlay/10 bg-surface-raised p-3 text-xs">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium text-content-strong">
            {labelOrFallback(PROPERTY_EXPENSE_TYPE_LABEL, expense.expenseType)}
            {expense.isExtraordinary ? ' (extraordinaria)' : ''}
          </p>
          <p className="text-content-muted">{formatCurrencyCOP(expense.amountCop)}</p>
        </div>
        <Badge tone={tone}>
          {labelOrFallback(PROPERTY_EXPENSE_ELIGIBILITY_LABEL, expense.eligibilityStatus)}
        </Badge>
      </div>
      {advanced && expense.eligibilityReasons.length > 0 ? (
        <ul className="mt-2 list-disc space-y-1 pl-4 text-content-subtle">
          {expense.eligibilityReasons.map((reason, index) => (
            <li key={index}>{reason}</li>
          ))}
        </ul>
      ) : null}
      {expense.decisionStatus !== 'pending' ? (
        <p className="mt-2 text-content-subtle">
          {PROPERTY_EXPENSE_DECISION_LABEL[expense.decisionStatus]}
        </p>
      ) : canDecide ? (
        <div className="mt-2 flex gap-2">
          <Button variant="secondary" onClick={() => void handleDecision('confirmed')}>
            Confirmar
          </Button>
          <Button variant="ghost" onClick={() => void handleDecision('rejected')}>
            Descartar
          </Button>
        </div>
      ) : null}
      <div className="mt-2 flex justify-end">
        <button
          type="button"
          className="text-content-subtle hover:text-tone-rose"
          aria-label="Eliminar gasto"
          onClick={() => void removePropertyExpense(expense.id)}
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
    </div>
  );
}

function PropertyExpenseForm({
  property,
  activities,
  onSave,
  onClose,
}: {
  property: TaxProperty;
  activities: readonly RentalActivity[];
  onSave: (input: SavePropertyExpenseInput) => Promise<void>;
  onClose: () => void;
}) {
  const [expenseType, setExpenseType] = useState<PropertyExpenseType>('administration_fee');
  const [rentalActivityId, setRentalActivityId] = useState<string>(activities[0]?.id ?? '');
  const [amountCop, setAmountCop] = useState('');
  const [period, setPeriod] = useState('');
  const [supportStatus, setSupportStatus] = useState<PropertySupportStatus>('missing');
  const [supportTypes, setSupportTypes] = useState<string[]>([]);
  const [allocationMethod, setAllocationMethod] = useState<PropertyAllocationMethod>(
    property.use === 'mixed' ? 'unknown' : 'unknown',
  );
  const [allocationPercentage, setAllocationPercentage] = useState('');
  const [isExtraordinary, setIsExtraordinary] = useState(false);

  // Igual que en `PropertyRentalSection`: si el período se registra
  // mientras este formulario ya estaba montado, la selección se
  // sincroniza en vez de quedar vacía.
  useEffect(() => {
    const latest = activities[activities.length - 1];
    if (!rentalActivityId && latest) {
      setRentalActivityId(latest.id);
    }
  }, [activities, rentalActivityId]);

  const isAdministration = expenseType === 'administration_fee';

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    await onSave({
      expenseType,
      rentalActivityId: rentalActivityId || null,
      period: period || null,
      amountCop: Number(amountCop) || 0,
      supportStatus,
      supportTypes,
      allocationMethod,
      allocationPercentage: allocationPercentage ? Number(allocationPercentage) : null,
      isExtraordinary,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-3 rounded-lg border border-overlay/10 p-3 text-xs">
      <div className="grid grid-cols-2 gap-2">
        <label className="block text-content-muted">
          Tipo de gasto
          <select
            value={expenseType}
            onChange={(event) => setExpenseType(event.target.value as PropertyExpenseType)}
            className="mt-1 w-full rounded-lg border border-overlay/12 bg-surface-raised px-2 py-1.5 text-content-strong"
          >
            {EXPENSE_TYPE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {PROPERTY_EXPENSE_TYPE_LABEL[option]}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-content-muted">
          Valor (COP)
          <input
            type="number"
            min={0}
            required
            value={amountCop}
            onChange={(event) => setAmountCop(event.target.value)}
            className="mt-1 w-full rounded-lg border border-overlay/12 bg-surface-raised px-2 py-1.5 text-content-strong"
          />
        </label>
      </div>
      {activities.length > 0 ? (
        <label className="block text-content-muted">
          Período asociado (opcional)
          <select
            value={rentalActivityId}
            onChange={(event) => setRentalActivityId(event.target.value)}
            className="mt-1 w-full rounded-lg border border-overlay/12 bg-surface-raised px-2 py-1.5 text-content-strong"
          >
            <option value="">Sin período específico</option>
            {activities.map((activity) => (
              <option key={activity.id} value={activity.id}>
                {activity.from} a {activity.to}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <label className="block text-content-muted">
        Período (texto libre, opcional)
        <input
          value={period}
          onChange={(event) => setPeriod(event.target.value)}
          placeholder="Ej. Marzo 2025"
          className="mt-1 w-full rounded-lg border border-overlay/12 bg-surface-raised px-2 py-1.5 text-content-strong"
        />
      </label>
      <label className="block text-content-muted">
        Estado del soporte
        <select
          value={supportStatus}
          onChange={(event) => setSupportStatus(event.target.value as PropertySupportStatus)}
          className="mt-1 w-full rounded-lg border border-overlay/12 bg-surface-raised px-2 py-1.5 text-content-strong"
        >
          {SUPPORT_STATUS_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {PROPERTY_SUPPORT_STATUS_LABEL[option]}
            </option>
          ))}
        </select>
      </label>
      {isAdministration ? (
        <fieldset className="space-y-1">
          <legend className="text-content-muted">
            Soporte disponible (nunca se exige factura para administración de PH)
          </legend>
          {Object.entries(ADMINISTRATION_SUPPORT_TYPE_LABEL).map(([value, label]) => (
            <label key={value} className="flex items-center gap-2 text-content-muted">
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
      ) : null}
      {property.use === 'mixed' ? (
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-content-muted">
            Método de asignación
            <select
              value={allocationMethod}
              onChange={(event) => setAllocationMethod(event.target.value as PropertyAllocationMethod)}
              className="mt-1 w-full rounded-lg border border-overlay/12 bg-surface-raised px-2 py-1.5 text-content-strong"
            >
              {ALLOCATION_METHOD_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {PROPERTY_ALLOCATION_METHOD_LABEL[option]}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-content-muted">
            % asignado a la actividad generadora de renta
            <input
              type="number"
              min={0}
              max={100}
              value={allocationPercentage}
              onChange={(event) => setAllocationPercentage(event.target.value)}
              className="mt-1 w-full rounded-lg border border-overlay/12 bg-surface-raised px-2 py-1.5 text-content-strong"
            />
          </label>
        </div>
      ) : null}
      {isAdministration ? (
        <label className="flex items-center gap-2 text-content-muted">
          <input
            type="checkbox"
            checked={isExtraordinary}
            onChange={(event) => setIsExtraordinary(event.target.checked)}
          />
          Es una cuota extraordinaria (se revisa por separado de la ordinaria)
        </label>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit">Guardar gasto</Button>
      </div>
    </form>
  );
}

function PropertyFormDrawer({
  taxYear,
  property,
  onSave,
  onClose,
}: {
  taxYear: number;
  property?: TaxProperty;
  onSave: (input: SaveTaxPropertyInput) => Promise<void>;
  onClose: () => void;
}) {
  const [label, setLabel] = useState(property?.label ?? '');
  const [propertyType, setPropertyType] = useState<PropertyType>(property?.propertyType ?? 'apartment');
  const [use, setUse] = useState<PropertyUse>(property?.use ?? 'unknown');
  const [ownershipPercentage, setOwnershipPercentage] = useState(
    property?.ownershipPercentage ?? 100,
  );
  const [ownedFrom, setOwnedFrom] = useState(property?.ownedFrom ?? '');
  const [ownedUntil, setOwnedUntil] = useState(property?.ownedUntil ?? '');
  const [cadastralValue, setCadastralValue] = useState(
    property?.cadastralValue != null ? String(property.cadastralValue) : '',
  );

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    await onSave({
      label,
      propertyType,
      use,
      ownershipPercentage,
      ownedFrom: ownedFrom || null,
      ownedUntil: ownedUntil || null,
      taxYear,
      cadastralValue: cadastralValue ? Number(cadastralValue) : null,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-surface-base/80" role="presentation">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Cerrar formulario de inmueble"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-label={property ? 'Editar inmueble' : 'Agregar inmueble'}
        className="relative flex h-full w-full max-w-xl flex-col overflow-y-auto border-l border-overlay/10 bg-surface-base p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-semibold text-content-strong">
            {property ? 'Editar inmueble' : 'Agregar inmueble'}
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
          <label className="block text-xs text-content-muted">
            Nombre / referencia (no uses la dirección exacta)
            <input
              required
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="Ej. Apartamento principal"
              className="mt-1 w-full rounded-lg border border-overlay/12 bg-surface-raised px-3 py-2 text-sm text-content-strong"
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-xs text-content-muted">
              Tipo
              <select
                value={propertyType}
                onChange={(event) => setPropertyType(event.target.value as PropertyType)}
                className="mt-1 w-full rounded-lg border border-overlay/12 bg-surface-raised px-3 py-2 text-sm text-content-strong"
              >
                {PROPERTY_TYPE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {PROPERTY_TYPE_LABEL[option]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs text-content-muted">
              % de propiedad
              <input
                type="number"
                min={0}
                max={100}
                value={ownershipPercentage}
                onChange={(event) => setOwnershipPercentage(Number(event.target.value))}
                className="mt-1 w-full rounded-lg border border-overlay/12 bg-surface-raised px-3 py-2 text-sm text-content-strong"
              />
            </label>
          </div>
          <label className="block text-xs text-content-muted">
            ¿Qué hiciste con este inmueble durante {taxYear}?
            <select
              value={use}
              onChange={(event) => setUse(event.target.value as PropertyUse)}
              className="mt-1 w-full rounded-lg border border-overlay/12 bg-surface-raised px-3 py-2 text-sm text-content-strong"
            >
              {PROPERTY_USE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {PROPERTY_USE_LABEL[option]}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-xs text-content-muted">
              Propietario desde (opcional)
              <input
                type="date"
                value={ownedFrom}
                onChange={(event) => setOwnedFrom(event.target.value)}
                className="mt-1 w-full rounded-lg border border-overlay/12 bg-surface-raised px-3 py-2 text-sm text-content-strong"
              />
            </label>
            <label className="block text-xs text-content-muted">
              Propietario hasta (opcional)
              <input
                type="date"
                value={ownedUntil}
                onChange={(event) => setOwnedUntil(event.target.value)}
                className="mt-1 w-full rounded-lg border border-overlay/12 bg-surface-raised px-3 py-2 text-sm text-content-strong"
              />
            </label>
          </div>
          <label className="block text-xs text-content-muted">
            Valor catastral (opcional)
            <input
              type="number"
              min={0}
              value={cadastralValue}
              onChange={(event) => setCadastralValue(event.target.value)}
              className="mt-1 w-full rounded-lg border border-overlay/12 bg-surface-raised px-3 py-2 text-sm text-content-strong"
            />
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">Guardar inmueble</Button>
          </div>
        </form>
      </aside>
    </div>
  );
}
