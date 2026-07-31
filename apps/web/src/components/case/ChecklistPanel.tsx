'use client';

import { useMemo, useState } from 'react';
import { Info, Trash2, Upload } from 'lucide-react';
import type {
  DocumentaryRequirement,
  EntityCategory,
  ProcessingResult,
  RequirementStatus,
} from '@nexus-tax/domain';
import { Badge, EmptyState, GlassPanel, formatBytes } from '@nexus-tax/ui';
import {
  attachRequirementPdf,
  removeRequirementPdf,
  updateRequirementStatus,
} from '@/lib/repository';

const CATEGORY_LABEL: Record<EntityCategory, string> = {
  employer: 'Empleador',
  bank: 'Entidad financiera',
  pension: 'Pensiones / Cesantías',
  housing: 'Vivienda',
  other: 'Otra',
  unknown: 'Sin clasificar',
};

const STATUS_OPTIONS: { value: RequirementStatus; label: string }[] = [
  { value: 'pending', label: 'Pendiente' },
  { value: 'available', label: 'Disponible' },
  { value: 'received', label: 'Recibido' },
  { value: 'not_applicable', label: 'No aplica' },
];

const CONFIDENCE_LABEL = {
  low: 'Confianza baja',
  medium: 'Confianza media',
  high: 'Confianza alta',
};

/** Pantalla "Checklist documental" (§10). Requisitos agrupados por entidad. */
export function ChecklistPanel({ result, caseId }: { result: ProcessingResult; caseId: string }) {
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const grouped = useMemo(() => {
    const map = new Map<string, DocumentaryRequirement[]>();
    for (const req of result.requirements) {
      const list = map.get(req.entityName) ?? [];
      list.push(req);
      map.set(req.entityName, list);
    }
    return Array.from(map.entries());
  }, [result.requirements]);

  if (grouped.length === 0) {
    return (
      <EmptyState
        title="Sin requisitos sugeridos"
        description="No se detectaron entidades que activen recomendaciones documentales. Puedes revisar el mapeo de columnas."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-3 text-xs text-slate-400">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent-cyan" aria-hidden />
        <p>
          Estas son <strong className="text-slate-200">recomendaciones de soporte</strong>, no una
          lista de documentos legalmente obligatorios. Cada requisito indica su nivel de confianza y
          el origen de la recomendación.
        </p>
      </div>
      {attachmentError ? (
        <p role="alert" className="text-xs text-rose-300">
          {attachmentError}
        </p>
      ) : null}

      {grouped.map(([entityName, requirements]) => (
        <GlassPanel key={entityName} className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <h3 className="text-sm font-medium text-slate-100">{entityName}</h3>
            <Badge tone="neutral">{CATEGORY_LABEL[requirements[0]!.entityCategory]}</Badge>
          </div>
          <ul className="flex flex-col gap-3">
            {requirements.map((req) => (
              <li
                key={req.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.02] p-3"
              >
                <div className="min-w-[220px] flex-1">
                  <p className="text-sm font-medium text-slate-100">{req.documentName}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{req.reason}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                    <Badge tone="violet">{req.documentCategory}</Badge>
                    <Badge
                      tone={
                        req.confidence === 'high'
                          ? 'emerald'
                          : req.confidence === 'medium'
                            ? 'cyan'
                            : 'neutral'
                      }
                    >
                      {CONFIDENCE_LABEL[req.confidence]}
                    </Badge>
                    <span className="text-slate-500">Origen: {req.recommendationSource}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <label className="sr-only" htmlFor={`status-${req.id}`}>
                    Estado de {req.documentName}
                  </label>
                  <select
                    id={`status-${req.id}`}
                    value={req.status}
                    onChange={(e) =>
                      void updateRequirementStatus(
                        caseId,
                        req.id,
                        e.target.value as RequirementStatus,
                      )
                    }
                    className="rounded-lg border border-white/12 bg-white/5 px-2 py-1.5 text-xs text-slate-100"
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value} className="bg-surface-raised">
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  {req.attachment ? (
                    <button
                      type="button"
                      onClick={() => void removeRequirementPdf(caseId, req.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-rose-500/30 px-2 py-1.5 text-xs text-rose-300"
                      aria-label={`Eliminar PDF de ${req.documentName}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden /> Eliminar PDF
                    </button>
                  ) : (
                    <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-white/10 px-2 py-1.5 text-xs text-slate-300 hover:bg-white/5">
                      <Upload className="h-3.5 w-3.5" aria-hidden /> Asociar PDF
                      <input
                        type="file"
                        accept="application/pdf,.pdf"
                        className="sr-only"
                        aria-label={`Asociar PDF a ${req.documentName}`}
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (!file) return;
                          setAttachmentError(null);
                          void attachRequirementPdf(caseId, req.id, file).catch((error: unknown) =>
                            setAttachmentError(
                              error instanceof Error
                                ? error.message
                                : 'No fue posible asociar el PDF.',
                            ),
                          );
                          event.target.value = '';
                        }}
                      />
                    </label>
                  )}
                </div>
                {req.attachment ? (
                  <p className="w-full text-right text-[11px] text-slate-500">
                    {req.attachment.fileName} · {formatBytes(req.attachment.fileSizeBytes)} · solo
                    metadatos locales
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </GlassPanel>
      ))}
    </div>
  );
}
