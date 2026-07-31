'use client';

import type { TaxpayerIdentity } from '@nexus-tax/domain';
import { maskDocument } from '@nexus-tax/exogenous-parser';
import { Badge, GlassPanel } from '@nexus-tax/ui';

export function TaxpayerIdentityPanel({ taxpayer }: { taxpayer: TaxpayerIdentity }) {
  return (
    <GlassPanel className="mt-4 p-4" aria-label="Identidad del contribuyente">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="text-xs uppercase tracking-wide text-slate-500">Contribuyente</span>
          <h2 className="text-base font-medium text-slate-100">
            {taxpayer.taxpayerName ?? 'Nombre no detectado'}
          </h2>
        </div>
        <Badge tone={taxpayer.documentNormalized ? 'emerald' : 'amber'}>
          {taxpayer.documentType ?? 'Documento'} · {maskDocument(taxpayer.documentNormalized)}
        </Badge>
      </div>
      <dl className="mt-3 grid gap-3 text-xs sm:grid-cols-3">
        <div>
          <dt className="text-slate-500">Año gravable</dt>
          <dd className="text-slate-300">{taxpayer.taxYear ?? 'No detectado'}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Fecha de corte</dt>
          <dd className="text-slate-300">{taxpayer.cutoffDate ?? 'No detectada'}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Fecha del reporte</dt>
          <dd className="text-slate-300">{taxpayer.reportDate ?? 'No detectada'}</dd>
        </div>
      </dl>
    </GlassPanel>
  );
}
