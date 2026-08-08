'use client';

import { Calculator, FileSpreadsheet, Info } from 'lucide-react';
import type {
  Form210Draft,
  Form210PreliminaryLiquidation,
} from '@nexus-tax/form-210';
import type {
  DependentsDeductionComputation,
  IndividualDeductionLimitComputation,
  OccasionalGainsTaxComputation,
  TaxLimitComputation,
} from '@nexus-tax/aegis-rules';
import { Badge, Button, EmptyState, GlassPanel, formatCurrencyCOP } from '@nexus-tax/ui';
import { rebuildForm210Draft } from '@/lib/repository';

const STATUS_LABEL: Record<Form210PreliminaryLiquidation['status'], string> = {
  insufficient_data: 'Datos insuficientes',
  zero: 'Saldo cero',
  refund: 'Saldo a favor',
  to_pay: 'Saldo a pagar',
};

const STATUS_TONE: Record<
  Form210PreliminaryLiquidation['status'],
  'neutral' | 'emerald' | 'amber' | 'rose'
> = {
  insufficient_data: 'neutral',
  zero: 'neutral',
  refund: 'emerald',
  to_pay: 'amber',
};

const LIMIT_CANDIDATE_LABEL: Record<TaxLimitComputation['bindingCandidate'], string> = {
  percentage: 'Porcentaje sobre base',
  uvt_cap: 'Tope en UVT',
  component: 'Componente detectado',
};

const DEPENDENTS_CANDIDATE_LABEL: Record<
  DependentsDeductionComputation['bindingCandidate'],
  string
> = {
  percentage: 'Porcentaje sobre ingreso',
  monthly_cap: 'Tope mensual (32 UVT × meses)',
  annual_cap: 'Tope anual (384 UVT × dependientes)',
};

const ELECTRONIC_INVOICING_CANDIDATE_LABEL = {
  percentage: 'Porcentaje sobre compras',
  uvt_cap: 'Tope 240 UVT',
} as const;

const INDIVIDUAL_CANDIDATE_LABEL: Record<
  IndividualDeductionLimitComputation['bindingCandidate'],
  string
> = {
  declared: 'Declarado',
  percentage: 'Porcentaje sobre base',
  uvt_cap: 'Tope en UVT',
};

const GO_KIND_LABEL: Record<OccasionalGainsTaxComputation['components'][number]['kind'], string> = {
  general: 'Ganancia ocasional general (art. 314 ET)',
  lottery: 'Loterías, rifas y apuestas (art. 317 ET)',
};

const ORIGIN_LABEL: Record<string, string> = {
  employmentCop: 'Trabajo',
  capitalCop: 'Capital',
  nonLaborCop: 'No laboral',
  occasionalGainCop: 'Ganancias ocasionales',
  dividendsCop: 'Dividendos',
  otherCop: 'Otras',
};

function SourceBadge({ source }: { source: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-overlay/12 bg-surface-raised px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-content-muted">
      <FileSpreadsheet className="h-3 w-3" aria-hidden />
      {source}
    </span>
  );
}

function LabeledCurrency({
  label,
  value,
  hint,
  emphasize,
}: {
  label: string;
  value: number | null;
  hint?: string;
  emphasize?: boolean;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-content-subtle">{label}</p>
      <p
        className={
          emphasize
            ? 'mt-1 text-2xl font-semibold text-content-strong'
            : 'mt-1 text-lg font-semibold text-content-strong'
        }
      >
        {value === null ? '—' : formatCurrencyCOP(value)}
      </p>
      {hint ? <p className="mt-1 text-xs text-content-subtle">{hint}</p> : null}
    </div>
  );
}

function CedularLimitBlock({
  title,
  computation,
}: {
  title: string;
  computation: TaxLimitComputation | null;
}) {
  if (!computation)
    return (
      <div className="rounded-lg border border-dashed border-overlay/12 p-3 text-xs text-content-subtle">
        {title}: sin datos suficientes en la sub-cédula.
      </div>
    );
  return (
    <div className="rounded-lg border border-overlay/8 bg-surface-raised/40 p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-content-strong">{title}</p>
          <p className="text-xs text-content-muted">{computation.formula}</p>
        </div>
        <div className="text-right">
          <p className="text-base font-semibold text-content-strong">
            {formatCurrencyCOP(computation.appliedValueCop)}
          </p>
          <Badge tone="cyan">Limita {LIMIT_CANDIDATE_LABEL[computation.bindingCandidate]}</Badge>
        </div>
      </div>
      <dl className="mt-2 grid grid-cols-3 gap-2 text-[11px] text-content-subtle">
        <div>
          <dt>Base</dt>
          <dd className="text-content-muted">{formatCurrencyCOP(computation.baseValueCop)}</dd>
        </div>
        <div>
          <dt>40 % × base</dt>
          <dd className="text-content-muted">
            {formatCurrencyCOP(computation.percentageCandidateCop)}
          </dd>
        </div>
        <div>
          <dt>Tope 1.340 UVT</dt>
          <dd className="text-content-muted">
            {formatCurrencyCOP(computation.uvtCapValueCop)}
          </dd>
        </div>
      </dl>
      <div className="mt-2">
        {computation.legalSourceIds.map((id) => (
          <SourceBadge key={id} source={id} />
        ))}
      </div>
    </div>
  );
}

export function PreliminaryLiquidationPanel({
  caseId,
  draft,
}: {
  caseId: string;
  draft?: Form210Draft;
}) {
  if (!draft) {
    return (
      <EmptyState
        icon={<Calculator className="h-8 w-8" />}
        title="Aún no hay borrador para liquidar"
        description="Genera primero el borrador del Formulario 210 y regresa aquí para revisar la liquidación preliminar orientativa."
        action={<Button onClick={() => void rebuildForm210Draft(caseId)}>Generar borrador</Button>}
      />
    );
  }
  const liq = draft.preliminaryLiquidation;
  if (!liq) {
    return (
      <EmptyState
        icon={<Calculator className="h-8 w-8" />}
        title="Liquidación no disponible"
        description="El borrador se generó sin liquidación preliminar. Regenera para obtenerla."
        action={<Button onClick={() => void rebuildForm210Draft(caseId)}>Regenerar</Button>}
      />
    );
  }
  const netIsPositive = liq.netBalanceCop > 0;
  const netIsNegative = liq.netBalanceCop < 0;
  return (
    <div className="space-y-5">
      <GlassPanel className="overflow-hidden">
        <div className="bg-gradient-to-r from-accent-cyan/15 via-accent-blue/10 to-transparent p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-tone-cyan">
                Año gravable 2025 · presentación 2026
              </p>
              <h2 className="mt-1 text-xl font-semibold text-content-strong">
                Liquidación privada preliminar
              </h2>
              <p className="mt-2 font-medium text-tone-amber">{liq.notice}</p>
              <p className="mt-1 max-w-3xl text-sm text-content-muted">
                Los importes se calculan con los motores puros de{' '}
                <code className="rounded bg-surface-raised px-1 py-0.5 text-xs">
                  @nexus-tax/aegis-rules
                </code>
                . Cada componente conserva su fuente normativa.
              </p>
            </div>
            <div className="text-right">
              <Badge tone={STATUS_TONE[liq.status]}>{STATUS_LABEL[liq.status]}</Badge>
              <p
                className={`mt-2 text-3xl font-semibold ${
                  netIsPositive
                    ? 'text-tone-amber'
                    : netIsNegative
                      ? 'text-tone-emerald'
                      : 'text-content-strong'
                }`}
              >
                {formatCurrencyCOP(Math.abs(liq.netBalanceCop))}
              </p>
              <p className="text-xs text-content-subtle">
                {netIsPositive
                  ? 'A pagar'
                  : netIsNegative
                    ? 'A favor del contribuyente'
                    : 'Saldo cero'}
              </p>
            </div>
          </div>
        </div>
      </GlassPanel>

      <section aria-labelledby="liq-cedular">
        <GlassPanel className="p-5">
          <h3 id="liq-cedular" className="text-lg font-semibold text-content-strong">
            Cédula general y límites (art. 336 ET)
          </h3>
          <p className="mt-1 text-xs text-content-subtle">
            Base cedular consolidada:{' '}
            <strong className="text-content">
              {formatCurrencyCOP(liq.generalCedularTaxableIncomeCop)}
            </strong>{' '}
            ({liq.generalCedularTaxableIncomeUvt.toFixed(2)} UVT).
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <CedularLimitBlock
              title="Trabajo (casilla 41)"
              computation={liq.employmentLimit}
            />
            <CedularLimitBlock title="Capital (casilla 65)" computation={liq.capitalLimit} />
            <CedularLimitBlock
              title="No laboral (casilla 82)"
              computation={liq.nonLaborLimit}
            />
          </div>
        </GlassPanel>
      </section>

      <section aria-labelledby="liq-impuesto">
        <GlassPanel className="p-5">
          <h3 id="liq-impuesto" className="text-lg font-semibold text-content-strong">
            Impuestos calculados
          </h3>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-content-subtle">
                Renta (art. 241 ET)
              </p>
              {liq.incomeTax ? (
                <>
                  <p className="mt-1 text-2xl font-semibold text-content-strong">
                    {formatCurrencyCOP(liq.incomeTax.totalTaxCopRounded)}
                  </p>
                  <p className="mt-1 text-xs text-content-muted">
                    Rango {liq.incomeTax.bracket.fromUvt} UVT
                    {liq.incomeTax.bracket.toUvt !== undefined
                      ? ` – ${liq.incomeTax.bracket.toUvt} UVT`
                      : ' en adelante'}{' '}
                    · marginal {(liq.incomeTax.bracket.marginalRate * 100).toFixed(0)} %
                  </p>
                  <p className="mt-1 text-xs text-content-subtle">
                    Fórmula: {liq.incomeTax.formula}
                  </p>
                  <div className="mt-2">
                    <SourceBadge source={liq.incomeTax.ruleSourceId} />
                  </div>
                </>
              ) : (
                <p className="mt-1 text-sm text-content-muted">
                  Sin renta líquida cedular; no se calcula impuesto de renta.
                </p>
              )}
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-content-subtle">
                Ganancias ocasionales
              </p>
              {liq.occasionalGainsTax ? (
                <>
                  <p className="mt-1 text-2xl font-semibold text-content-strong">
                    {formatCurrencyCOP(liq.occasionalGainsTax.totalTaxCop)}
                  </p>
                  <ul className="mt-1 space-y-1 text-xs text-content-muted">
                    {liq.occasionalGainsTax.components.map((component) => (
                      <li key={component.kind}>
                        {GO_KIND_LABEL[component.kind]} —{' '}
                        {formatCurrencyCOP(component.baseCop)} ×{' '}
                        {(component.rate * 100).toFixed(0)} % ={' '}
                        <strong className="text-content">
                          {formatCurrencyCOP(component.taxCop)}
                        </strong>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {liq.occasionalGainsTax.ruleSourceIds.map((id) => (
                      <SourceBadge key={id} source={id} />
                    ))}
                  </div>
                </>
              ) : (
                <p className="mt-1 text-sm text-content-muted">
                  Sin base de ganancias ocasionales (casilla 115 en cero).
                </p>
              )}
            </div>
          </div>
          <div className="mt-4 border-t border-overlay/8 pt-3">
            <LabeledCurrency
              emphasize
              label="Total impuesto a cargo (renta + GO)"
              value={liq.totalTaxDueCop}
              hint="Antes de descontar créditos y sumar anticipo."
            />
          </div>
        </GlassPanel>
      </section>

      {(liq.dependentsDeduction ||
        liq.electronicInvoicingDeduction ||
        liq.individualDeductionLimits.length > 0) && (
        <section aria-labelledby="liq-deducciones">
          <GlassPanel className="p-5">
            <h3
              id="liq-deducciones"
              className="text-lg font-semibold text-content-strong"
            >
              Deducciones y rentas exentas con límite
            </h3>
            <ul className="mt-3 space-y-3">
              {liq.dependentsDeduction ? (
                <li className="rounded-lg border border-overlay/8 bg-surface-raised/40 p-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-medium text-content-strong">
                      Dependientes (art. 387 ET) — {liq.dependentsDeduction.dependentsEligibleCount}
                      /{liq.dependentsDeduction.dependentsProvidedCount}
                    </p>
                    <p className="font-semibold text-content-strong">
                      {formatCurrencyCOP(liq.dependentsDeduction.appliedDeductionCop)}
                    </p>
                  </div>
                  <p className="text-xs text-content-muted">
                    {liq.dependentsDeduction.formula}
                  </p>
                  <div className="mt-1">
                    <Badge tone="cyan">
                      Limita{' '}
                      {DEPENDENTS_CANDIDATE_LABEL[liq.dependentsDeduction.bindingCandidate]}
                    </Badge>
                    <SourceBadge source={liq.dependentsDeduction.ruleSourceId} />
                  </div>
                </li>
              ) : null}
              {liq.electronicInvoicingDeduction ? (
                <li className="rounded-lg border border-overlay/8 bg-surface-raised/40 p-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-medium text-content-strong">
                      Facturas electrónicas (art. 336-1 ET)
                    </p>
                    <p className="font-semibold text-content-strong">
                      {formatCurrencyCOP(liq.electronicInvoicingDeduction.appliedDeductionCop)}
                    </p>
                  </div>
                  <p className="text-xs text-content-muted">
                    {liq.electronicInvoicingDeduction.formula}
                  </p>
                  <div className="mt-1">
                    <Badge tone="cyan">
                      Limita{' '}
                      {
                        ELECTRONIC_INVOICING_CANDIDATE_LABEL[
                          liq.electronicInvoicingDeduction.bindingCandidate
                        ]
                      }
                    </Badge>
                    <SourceBadge source={liq.electronicInvoicingDeduction.ruleSourceId} />
                  </div>
                </li>
              ) : null}
              {liq.individualDeductionLimits.map((item) => (
                <li
                  key={item.ruleId}
                  className="rounded-lg border border-overlay/8 bg-surface-raised/40 p-3"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-medium text-content-strong">
                      {item.ruleId === 'afc-fvp-avc-2025'
                        ? 'AFC / AVC / FVP (arts. 126-1 y 126-4 ET)'
                        : item.ruleId === 'housing-interest-2025'
                          ? 'Intereses de vivienda (art. 119 ET)'
                          : 'Medicina prepagada (art. 387 ET, par. 2)'}
                    </p>
                    <p className="font-semibold text-content-strong">
                      {formatCurrencyCOP(item.appliedCop)}
                    </p>
                  </div>
                  <p className="text-xs text-content-muted">
                    Declarado {formatCurrencyCOP(item.declaredCop)} · {item.formula}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <Badge
                      tone={item.bindingCandidate === 'declared' ? 'emerald' : 'amber'}
                    >
                      Limita {INDIVIDUAL_CANDIDATE_LABEL[item.bindingCandidate]}
                    </Badge>
                    {item.ruleSourceIds.map((id) => (
                      <SourceBadge key={id} source={id} />
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </GlassPanel>
        </section>
      )}

      <section aria-labelledby="liq-creditos">
        <GlassPanel className="p-5">
          <h3 id="liq-creditos" className="text-lg font-semibold text-content-strong">
            Créditos y anticipo
          </h3>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <LabeledCurrency
              label="Anticipo año anterior (casilla 130)"
              value={liq.priorYearAdvanceCop}
            />
            <LabeledCurrency
              label="Saldo a favor anterior aplicado"
              value={liq.priorYearBalanceCop}
              hint={
                liq.priorYearBalance
                  ? liq.priorYearBalance.reason
                  : 'Aporta el contexto para descontar el saldo.'
              }
            />
            <LabeledCurrency
              label="Retenciones (casilla 132)"
              value={liq.withholdingsCop}
              hint={
                liq.withholdings.entriesCount > 0
                  ? `${liq.withholdings.entriesCount} retenciones · ${liq.withholdings.entriesWithoutSupportCount} sin certificado`
                  : 'Sin retenciones consolidadas.'
              }
            />
          </div>
          {liq.withholdings.breakdown ? (
            <div className="mt-4 rounded-lg border border-overlay/8 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-content-subtle">
                Desglose de retenciones por origen
              </p>
              <dl className="mt-2 grid grid-cols-2 gap-2 text-xs text-content-muted md:grid-cols-3">
                {(Object.entries(liq.withholdings.breakdown) as [string, number][]).map(
                  ([key, value]) => (
                    <div key={key}>
                      <dt>{ORIGIN_LABEL[key] ?? key}</dt>
                      <dd className="text-content-strong">{formatCurrencyCOP(value)}</dd>
                    </div>
                  ),
                )}
              </dl>
              {!liq.withholdings.breakdownMatchesReported ? (
                <p className="mt-2 text-xs text-tone-amber">
                  El desglose no cuadra con las retenciones reportadas (diferencia{' '}
                  {formatCurrencyCOP(liq.withholdings.breakdownDifferenceCop)}).
                </p>
              ) : null}
            </div>
          ) : null}
          {liq.nextYearAdvance ? (
            <div className="mt-4 rounded-lg border border-overlay/8 bg-surface-raised/40 p-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-content-strong">
                    Anticipo año siguiente (art. 807 ET)
                  </p>
                  <p className="text-xs text-content-muted">
                    {liq.nextYearAdvance.bracket.description}
                  </p>
                  <p className="text-xs text-content-subtle">
                    {liq.nextYearAdvance.rationale}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-base font-semibold text-content-strong">
                    {formatCurrencyCOP(liq.nextYearAdvance.netAdvanceCop)}
                  </p>
                  <p className="text-xs text-content-subtle">
                    Bruto {formatCurrencyCOP(liq.nextYearAdvance.grossAdvanceCop)} − retenciones{' '}
                    {formatCurrencyCOP(liq.nextYearAdvance.withholdingsAppliedCop)}
                  </p>
                </div>
              </div>
              <div className="mt-2">
                <SourceBadge source={liq.nextYearAdvance.ruleSourceId} />
              </div>
            </div>
          ) : null}
        </GlassPanel>
      </section>

      <section aria-labelledby="liq-total">
        <GlassPanel className="p-5">
          <h3 id="liq-total" className="text-lg font-semibold text-content-strong">
            Cálculo del saldo neto
          </h3>
          <table className="mt-4 w-full text-sm">
            <tbody>
              <tr>
                <td className="py-1 text-content-muted">Impuesto a cargo</td>
                <td className="py-1 text-right font-medium text-content-strong">
                  + {formatCurrencyCOP(liq.totalTaxDueCop)}
                </td>
              </tr>
              <tr>
                <td className="py-1 text-content-muted">Anticipo año siguiente</td>
                <td className="py-1 text-right font-medium text-content-strong">
                  + {formatCurrencyCOP(liq.nextYearAdvance?.netAdvanceCop ?? 0)}
                </td>
              </tr>
              <tr>
                <td className="py-1 text-content-muted">Anticipo año anterior</td>
                <td className="py-1 text-right font-medium text-content-strong">
                  − {formatCurrencyCOP(liq.priorYearAdvanceCop)}
                </td>
              </tr>
              <tr>
                <td className="py-1 text-content-muted">Saldo a favor anterior</td>
                <td className="py-1 text-right font-medium text-content-strong">
                  − {formatCurrencyCOP(liq.priorYearBalanceCop)}
                </td>
              </tr>
              <tr>
                <td className="py-1 text-content-muted">Retenciones</td>
                <td className="py-1 text-right font-medium text-content-strong">
                  − {formatCurrencyCOP(liq.withholdingsCop)}
                </td>
              </tr>
              <tr className="border-t border-overlay/8">
                <td className="py-2 font-semibold text-content-strong">Saldo neto</td>
                <td
                  className={`py-2 text-right text-lg font-semibold ${
                    netIsPositive
                      ? 'text-tone-amber'
                      : netIsNegative
                        ? 'text-tone-emerald'
                        : 'text-content-strong'
                  }`}
                >
                  {netIsPositive ? '+ ' : netIsNegative ? '− ' : ''}
                  {formatCurrencyCOP(Math.abs(liq.netBalanceCop))}
                </td>
              </tr>
            </tbody>
          </table>
        </GlassPanel>
      </section>

      {liq.warnings.length ? (
        <section aria-labelledby="liq-warnings">
          <GlassPanel className="p-5">
            <h3 id="liq-warnings" className="text-lg font-semibold text-content-strong">
              Advertencias del cálculo ({liq.warnings.length})
            </h3>
            <ul className="mt-3 space-y-2">
              {liq.warnings.map((warning, index) => (
                <li
                  key={index}
                  className="flex gap-2 rounded-lg border border-amber-400/20 bg-amber-400/5 p-3 text-sm text-content-muted"
                >
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-tone-amber" aria-hidden />
                  <span>{warning}</span>
                </li>
              ))}
            </ul>
          </GlassPanel>
        </section>
      ) : null}

      <p className="text-xs text-content-subtle">
        Reglas {liq.ruleVersion} · generado {new Date(liq.generatedAt).toLocaleString('es-CO')} ·
        todo el cálculo permanece en este navegador.
      </p>
    </div>
  );
}
