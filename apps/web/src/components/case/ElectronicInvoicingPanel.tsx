'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, FileSpreadsheet, Loader2, ReceiptText, X } from 'lucide-react';
import type {
  CaseTask,
  ElectronicInvoiceBenefitDecision,
  ElectronicInvoicePurchase,
  ElectronicInvoiceReconciliationStatus,
  ElectronicInvoiceReport,
} from '@nexus-tax/domain';
import type { Form210Draft } from '@nexus-tax/form-210';
import { Badge, Button, EmptyState, GlassPanel, formatCurrencyCOP } from '@nexus-tax/ui';
import { FileDropzone } from '@/components/FileDropzone';
import {
  BENEFIT_DECISION_LABEL,
  CUFE_STATUS_LABEL,
  PAYMENT_METHOD_CATEGORY_LABEL,
  PROCESSING_STATUS_LABEL,
  RECONCILIATION_STATUS_LABEL,
} from '@/lib/electronicInvoiceEngine';
import {
  decideElectronicInvoicePurchaseBenefit,
  importElectronicInvoiceReport,
  removeElectronicInvoiceReport,
  setElectronicInvoicingBenefitOptedOut,
} from '@/lib/repository';

/** Enmascara un CUFE mostrando solo el inicio y el final, ej. "a34f…89cd". */
function maskCufe(cufe: string | null): string {
  if (!cufe) return 'Sin CUFE';
  if (cufe.length <= 12) return cufe;
  return `${cufe.slice(0, 4)}…${cufe.slice(-4)}`;
}

type InvoiceFilter =
  | 'all'
  | 'eligible'
  | 'zero_eligible'
  | 'cash'
  | 'data_error'
  | 'duplicates'
  | 'requires_review'
  | 'excluded_from_benefit';

const FILTER_LABEL: Record<InvoiceFilter, string> = {
  all: 'Todos',
  eligible: 'Elegibles',
  zero_eligible: 'Susceptible = 0',
  cash: 'Efectivo',
  data_error: 'Error en datos',
  duplicates: 'Duplicados',
  requires_review: 'Requiere revisión',
  excluded_from_benefit: 'Excluidos del 1 %',
};

const CUFE_STATUS_TONE: Record<ElectronicInvoicePurchase['cufeStatus'], 'emerald' | 'amber' | 'rose' | 'neutral'> = {
  unique: 'neutral',
  duplicate_exact: 'amber',
  duplicate_conflicting: 'rose',
  missing_cufe: 'amber',
  requires_review: 'amber',
};

const RECONCILIATION_TONE: Record<ElectronicInvoiceReconciliationStatus, 'emerald' | 'amber' | 'rose' | 'neutral'> = {
  reconciled: 'emerald',
  rounding_difference: 'emerald',
  minor_difference: 'amber',
  relevant_difference: 'rose',
  not_comparable: 'neutral',
  missing_exogenous: 'amber',
  missing_invoice_report: 'amber',
  not_evaluated: 'neutral',
};

const BENEFIT_DECISION_OPTIONS: readonly ElectronicInvoiceBenefitDecision[] = [
  'eligible',
  'used_as_cost_or_expense',
  'used_for_other_tax_benefit',
  'not_eligible',
  'requires_review',
];

export function ElectronicInvoicingPanel({
  caseId,
  taxYear,
  report,
  purchases,
  form210Draft,
  tasks,
  advanced,
  onToggleAdvanced,
}: {
  caseId: string;
  taxYear: number;
  report?: ElectronicInvoiceReport;
  purchases: readonly ElectronicInvoicePurchase[];
  form210Draft?: Form210Draft;
  tasks: readonly CaseTask[];
  advanced: boolean;
  onToggleAdvanced: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [filter, setFilter] = useState<InvoiceFilter>('all');
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [decisionReason, setDecisionReason] = useState('');
  const pageSize = 20;

  const electronicInvoicingDeduction = form210Draft?.preliminaryLiquidation?.electronicInvoicingDeduction;
  const relatedTasks = tasks.filter((task) => task.source === 'electronic_invoice');

  async function handleImport() {
    if (!file) return;
    setImporting(true);
    setImportError(null);
    try {
      const result = await importElectronicInvoiceReport(caseId, taxYear, file);
      if (!result) {
        setImportError(
          `"${file.name}" no se reconoció como reporte DIAN de facturación electrónica. Verifica que sea el archivo correcto (debe incluir CUFE, valor facturado, notas crédito/débito y valor susceptible de beneficio).`,
        );
        return;
      }
      setFile(null);
    } finally {
      setImporting(false);
    }
  }

  async function handleRemove() {
    await removeElectronicInvoiceReport(caseId);
  }

  async function handleOptOut(value: boolean) {
    await setElectronicInvoicingBenefitOptedOut(
      caseId,
      value,
      value
        ? 'El analista decidió no usar la deducción de facturación electrónica.'
        : 'El analista revirtió la decisión de no usar la deducción.',
    );
  }

  async function handleDecision(purchaseId: string, decision: ElectronicInvoiceBenefitDecision) {
    await decideElectronicInvoicePurchaseBenefit(
      purchaseId,
      decision,
      decisionReason.trim() || `Marcada como "${BENEFIT_DECISION_LABEL[decision]}" por el analista.`,
    );
    setDecisionReason('');
  }

  const filteredPurchases = useMemo(() => {
    switch (filter) {
      case 'eligible':
        return purchases.filter((p) => p.benefitDecision === 'eligible');
      case 'zero_eligible':
        return purchases.filter((p) => (p.eligibleBenefitValue.roundedTaxValue ?? 0) === 0);
      case 'cash':
        return purchases.filter((p) => p.paymentMethodCategory === 'cash');
      case 'data_error':
        return purchases.filter((p) => p.paymentMethodCategory === 'data_error');
      case 'duplicates':
        return purchases.filter(
          (p) => p.cufeStatus === 'duplicate_exact' || p.cufeStatus === 'duplicate_conflicting',
        );
      case 'requires_review':
        return purchases.filter(
          (p) => p.cufeStatus === 'requires_review' || p.benefitDecision === 'requires_review',
        );
      case 'excluded_from_benefit':
        return purchases.filter(
          (p) => p.benefitDecision === 'used_as_cost_or_expense' || p.benefitDecision === 'used_for_other_tax_benefit' || p.benefitDecision === 'not_eligible',
        );
      default:
        return purchases;
    }
  }, [purchases, filter]);
  const pageCount = Math.max(1, Math.ceil(filteredPurchases.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const pagePurchases = filteredPurchases.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <div className="space-y-5">
      <GlassPanel className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-content-strong">Facturación electrónica</h2>
            <p className="mt-2 max-w-2xl text-sm text-content-muted">
              Carga el reporte DIAN de facturación electrónica para conciliarlo con tus compras y
              estimar la deducción del 1 % (art. 336-1 ET). Todo se procesa localmente; la
              certificación final siempre requiere revisión humana.
            </p>
          </div>
          {report ? <Button variant="ghost" onClick={onToggleAdvanced}>{advanced ? 'Modo normal' : 'Modo avanzado'}</Button> : null}
        </div>
      </GlassPanel>

      {!report ? (
        <GlassPanel className="p-6">
          <FileDropzone
            id="electronic-invoice-report-upload"
            variant="electronic_invoice"
            file={file}
            onSelect={setFile}
            onRemove={() => setFile(null)}
            accept=".xlsx,.xls"
            allowedExtensions={['xlsx', 'xls']}
            busy={importing}
            error={importError}
          />
          {file ? (
            <div className="mt-4 flex justify-end">
              <Button onClick={() => void handleImport()} disabled={importing}>
                {importing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden />
                    Analizando…
                  </>
                ) : (
                  'Procesar reporte'
                )}
              </Button>
            </div>
          ) : null}
          <div className="mt-6">
            <EmptyState
              icon={<ReceiptText className="h-8 w-8" />}
              title="No cargado"
              description="Descarga el reporte de facturación electrónica desde el portal DIAN y cárgalo aquí."
            />
          </div>
        </GlassPanel>
      ) : (
        <>
          <GlassPanel className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-tone-cyan" aria-hidden />
                <div>
                  <p className="text-sm font-medium text-content-strong">{report.fileName}</p>
                  <p className="text-xs text-content-subtle">
                    {PROCESSING_STATUS_LABEL[report.processingStatus]}
                    {report.reconciliation
                      ? ` · Conciliación: ${RECONCILIATION_STATUS_LABEL[report.reconciliation.status]}`
                      : ''}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  onClick={() => void handleOptOut(!report.benefitOptedOut)}
                >
                  {report.benefitOptedOut
                    ? 'Revertir: sí usaré la deducción'
                    : 'No usaré deducción por facturación electrónica'}
                </Button>
                <Button variant="danger" leadingIcon={<X className="h-4 w-4" />} onClick={() => void handleRemove()}>
                  Eliminar reporte
                </Button>
              </div>
            </div>
            {report.benefitOptedOut ? (
              <p className="mt-3 rounded-lg border border-amber-400/20 bg-amber-400/5 p-3 text-xs text-tone-amber">
                No se aplicará la deducción del 1 % en el borrador del Formulario 210, aunque el
                reporte y las facturas se conservan. Puedes revertir esta decisión en cualquier
                momento.
              </p>
            ) : null}
          </GlassPanel>

          <GlassPanel className="p-5">
            <h3 className="text-sm font-semibold text-content-strong">Resumen</h3>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <SummaryMetric label="Facturas" value={report.totals.rowCount.toLocaleString('es-CO')} />
              <SummaryMetric label="Compras netas" value={formatCurrencyCOP(report.totals.netTotalCop)} />
              <SummaryMetric
                label="Base susceptible"
                value={formatCurrencyCOP(report.totals.eligibleBenefitTotalCop)}
              />
              <SummaryMetric
                label="Conciliación con exógena"
                value={
                  report.reconciliation
                    ? RECONCILIATION_STATUS_LABEL[report.reconciliation.status]
                    : 'Sin evaluar'
                }
                tone={report.reconciliation ? RECONCILIATION_TONE[report.reconciliation.status] : 'neutral'}
              />
              <SummaryMetric
                label="Deducción estimada 1 %"
                value={formatCurrencyCOP(electronicInvoicingDeduction?.appliedDeductionCop ?? 0)}
              />
            </div>
            {advanced && electronicInvoicingDeduction ? (
              <div className="mt-4 rounded-lg border border-overlay/10 bg-overlay/[0.02] p-3 text-sm">
                <p className="font-medium text-content-strong">Detalle normativo (art. 336-1 ET)</p>
                <p className="mt-1 text-content-muted">{electronicInvoicingDeduction.formula}</p>
                <p className="mt-1 text-xs text-content-subtle">
                  Fuera del límite conjunto del 40 %/1.340 UVT (Decreto 2231 de 2023): componente de
                  la casilla 92, nunca de la casilla 39.
                </p>
              </div>
            ) : null}
            {relatedTasks.length > 0 ? (
              <p className="mt-3 flex items-center gap-2 text-xs text-tone-amber">
                <AlertTriangle className="h-4 w-4" aria-hidden />
                {relatedTasks.length} pendiente(s) relacionado(s) con este reporte.
              </p>
            ) : null}
          </GlassPanel>

          <GlassPanel className="p-5">
            <div className="flex flex-wrap gap-2">
              {(Object.keys(FILTER_LABEL) as InvoiceFilter[])
                .sort((a, b) => FILTER_LABEL[a].localeCompare(FILTER_LABEL[b], 'es-CO'))
                .map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setFilter(key);
                      setPage(1);
                    }}
                    className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                      filter === key
                        ? 'border-accent-cyan/40 bg-accent-cyan/10 text-tone-cyan'
                        : 'border-overlay/10 text-content-muted hover:bg-overlay/5'
                    }`}
                  >
                    {FILTER_LABEL[key]}
                  </button>
                ))}
            </div>

            {/* Escritorio: tabla; móvil (<640px): tarjetas apiladas, sin overflow horizontal. */}
            <div className="mt-4 hidden overflow-x-auto sm:block">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase text-content-subtle">
                  <tr>
                    <th className="pb-2 pr-3">Fecha</th>
                    <th className="pb-2 pr-3">Emisor</th>
                    <th className="pb-2 pr-3">Factura</th>
                    <th className="pb-2 pr-3">Neto</th>
                    <th className="pb-2 pr-3">Susceptible</th>
                    <th className="pb-2 pr-3">Pago</th>
                    <th className="pb-2 pr-3">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {pagePurchases.map((purchase) => (
                    <InvoiceRow
                      key={purchase.id}
                      purchase={purchase}
                      expanded={expandedId === purchase.id}
                      onToggle={() => setExpandedId(expandedId === purchase.id ? null : purchase.id)}
                      decisionReason={decisionReason}
                      onDecisionReasonChange={setDecisionReason}
                      onDecide={(decision) => void handleDecision(purchase.id, decision)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 space-y-3 sm:hidden">
              {pagePurchases.map((purchase) => (
                <InvoiceCard
                  key={purchase.id}
                  purchase={purchase}
                  expanded={expandedId === purchase.id}
                  onToggle={() => setExpandedId(expandedId === purchase.id ? null : purchase.id)}
                  decisionReason={decisionReason}
                  onDecisionReasonChange={setDecisionReason}
                  onDecide={(decision) => void handleDecision(purchase.id, decision)}
                />
              ))}
            </div>
            {filteredPurchases.length === 0 ? (
              <p className="mt-4 text-sm text-content-muted">No hay facturas para este filtro.</p>
            ) : null}
            {pageCount > 1 ? (
              <div className="mt-4 flex items-center justify-between text-xs text-content-subtle">
                <span>
                  Página {safePage} de {pageCount} ({filteredPurchases.length} facturas)
                </span>
                <div className="flex gap-2">
                  <Button variant="ghost" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>
                    Anterior
                  </Button>
                  <Button variant="ghost" disabled={safePage >= pageCount} onClick={() => setPage(safePage + 1)}>
                    Siguiente
                  </Button>
                </div>
              </div>
            ) : null}
          </GlassPanel>
        </>
      )}
    </div>
  );
}

function SummaryMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'emerald' | 'amber' | 'rose' | 'neutral';
}) {
  return (
    <div className="rounded-lg border border-overlay/10 bg-overlay/[0.02] p-3">
      <p className="text-xs text-content-subtle">{label}</p>
      {tone ? (
        <Badge tone={tone} className="mt-1">
          {value}
        </Badge>
      ) : (
        <p className="mt-1 text-sm font-semibold text-content-strong">{value}</p>
      )}
    </div>
  );
}

function DecisionControls({
  purchase,
  decisionReason,
  onDecisionReasonChange,
  onDecide,
}: {
  purchase: ElectronicInvoicePurchase;
  decisionReason: string;
  onDecisionReasonChange: (value: string) => void;
  onDecide: (decision: ElectronicInvoiceBenefitDecision) => void;
}) {
  return (
    <div className="mt-3 space-y-2 text-xs">
      <p className="text-content-subtle">Decisión tributaria (nunca modifica la evidencia original):</p>
      <input
        type="text"
        placeholder="Motivo de la decisión (opcional)"
        value={decisionReason}
        onChange={(event) => onDecisionReasonChange(event.target.value)}
        className="w-full rounded-lg border border-overlay/12 bg-surface-raised px-2 py-1.5 text-xs text-content-strong"
      />
      <div className="flex flex-wrap gap-1.5">
        {BENEFIT_DECISION_OPTIONS.map((decision) => (
          <button
            key={decision}
            type="button"
            onClick={() => onDecide(decision)}
            className={`rounded-full border px-2.5 py-1 transition-colors ${
              purchase.benefitDecision === decision
                ? 'border-accent-cyan/40 bg-accent-cyan/10 text-tone-cyan'
                : 'border-overlay/10 text-content-muted hover:bg-overlay/5'
            }`}
          >
            {BENEFIT_DECISION_LABEL[decision]}
          </button>
        ))}
      </div>
      {purchase.benefitDecisionReason ? (
        <p className="text-content-subtle">Motivo registrado: {purchase.benefitDecisionReason}</p>
      ) : null}
    </div>
  );
}

function InvoiceDetail({ purchase }: { purchase: ElectronicInvoicePurchase }) {
  return (
    <dl className="grid grid-cols-2 gap-2 text-xs text-content-muted sm:grid-cols-3">
      <div>
        <dt className="text-content-subtle">NIT emisor</dt>
        <dd>{purchase.issuerTaxId ?? '—'}</dd>
      </div>
      <div>
        <dt className="text-content-subtle">Bruto</dt>
        <dd>{formatCurrencyCOP(purchase.grossValue.roundedTaxValue ?? 0)}</dd>
      </div>
      <div>
        <dt className="text-content-subtle">Notas crédito</dt>
        <dd>{formatCurrencyCOP(purchase.creditNoteValue.roundedTaxValue ?? 0)}</dd>
      </div>
      <div>
        <dt className="text-content-subtle">Notas débito</dt>
        <dd>{formatCurrencyCOP(purchase.debitNoteValue.roundedTaxValue ?? 0)}</dd>
      </div>
      <div>
        <dt className="text-content-subtle">CUFE (completo, solo modo avanzado)</dt>
        <dd className="break-all">{purchase.rawCufe ?? 'Sin CUFE'}</dd>
      </div>
      <div>
        <dt className="text-content-subtle">Fila fuente</dt>
        <dd>{purchase.sourceRow}</dd>
      </div>
      <div className="col-span-2 sm:col-span-3">
        <dt className="text-content-subtle">Estado CUFE</dt>
        <dd>{CUFE_STATUS_LABEL[purchase.cufeStatus]}</dd>
      </div>
    </dl>
  );
}

function InvoiceRow({
  purchase,
  expanded,
  onToggle,
  decisionReason,
  onDecisionReasonChange,
  onDecide,
}: {
  purchase: ElectronicInvoicePurchase;
  expanded: boolean;
  onToggle: () => void;
  decisionReason: string;
  onDecisionReasonChange: (value: string) => void;
  onDecide: (decision: ElectronicInvoiceBenefitDecision) => void;
}) {
  return (
    <>
      <tr className="cursor-pointer border-t border-overlay/8 hover:bg-overlay/[0.02]" onClick={onToggle}>
        <td className="py-2 pr-3">{purchase.issuedAt ?? '—'}</td>
        <td className="py-2 pr-3">{purchase.issuerName ?? '—'}</td>
        <td className="py-2 pr-3">{purchase.invoiceNumber ?? '—'}</td>
        <td className="py-2 pr-3">{formatCurrencyCOP(purchase.computedNetValueCop)}</td>
        <td className="py-2 pr-3">{formatCurrencyCOP(purchase.eligibleBenefitValue.roundedTaxValue ?? 0)}</td>
        <td className="py-2 pr-3">{PAYMENT_METHOD_CATEGORY_LABEL[purchase.paymentMethodCategory]}</td>
        <td className="py-2 pr-3">
          <Badge tone={CUFE_STATUS_TONE[purchase.cufeStatus]}>{CUFE_STATUS_LABEL[purchase.cufeStatus]}</Badge>
        </td>
      </tr>
      {expanded ? (
        <tr className="border-t border-overlay/8 bg-overlay/[0.02]">
          <td colSpan={7} className="p-3">
            <InvoiceDetail purchase={purchase} />
            <DecisionControls
              purchase={purchase}
              decisionReason={decisionReason}
              onDecisionReasonChange={onDecisionReasonChange}
              onDecide={onDecide}
            />
          </td>
        </tr>
      ) : null}
    </>
  );
}

function InvoiceCard({
  purchase,
  expanded,
  onToggle,
  decisionReason,
  onDecisionReasonChange,
  onDecide,
}: {
  purchase: ElectronicInvoicePurchase;
  expanded: boolean;
  onToggle: () => void;
  decisionReason: string;
  onDecisionReasonChange: (value: string) => void;
  onDecide: (decision: ElectronicInvoiceBenefitDecision) => void;
}) {
  return (
    <div className="rounded-lg border border-overlay/10 p-3">
      <button type="button" onClick={onToggle} className="w-full text-left">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-content-strong">{purchase.invoiceNumber ?? maskCufe(purchase.normalizedCufe)}</p>
          <Badge tone={CUFE_STATUS_TONE[purchase.cufeStatus]}>{CUFE_STATUS_LABEL[purchase.cufeStatus]}</Badge>
        </div>
        <p className="mt-1 text-xs text-content-subtle">{purchase.issuerName ?? '—'} · {purchase.issuedAt ?? '—'}</p>
        <p className="mt-1 text-sm text-content-strong">{formatCurrencyCOP(purchase.computedNetValueCop)}</p>
      </button>
      {expanded ? (
        <div className="mt-3 border-t border-overlay/10 pt-3">
          <InvoiceDetail purchase={purchase} />
          <DecisionControls
            purchase={purchase}
            decisionReason={decisionReason}
            onDecisionReasonChange={onDecisionReasonChange}
            onDecide={onDecide}
          />
        </div>
      ) : null}
    </div>
  );
}
