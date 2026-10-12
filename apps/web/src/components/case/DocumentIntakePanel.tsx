'use client';

import { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Circle,
  FileText,
  KeyRound,
  Loader2,
  ShieldCheck,
  UploadCloud,
} from 'lucide-react';
import type {
  CaseProduct,
  DocumentaryRequirement,
  DocumentExtractionSession,
  DocumentFactCandidate,
  UploadedDocument,
  ProcessingResult,
  RequirementCoverage,
} from '@nexus-tax/domain';
import { PdfReadError } from '@nexus-tax/document-intelligence';
import { Badge, Button, GlassPanel } from '@nexus-tax/ui';
import { DOCUMENT_KIND_LABEL } from '@/lib/dossierPresentation';
import { buildDocumentChecklist, intakeFileType } from '@/lib/documentIntake';
import { suggestRequirementMatches } from '@/lib/requirementMatching';
import { processDocumentLocally } from '@/lib/documentProcessor';
import {
  addCaseDocument,
  applyDetectedDocumentKind,
  importElectronicInvoiceReport,
  saveRequirementCoverage,
} from '@/lib/repository';

type IntakeStatus = 'working' | 'done' | 'needs_password' | 'unrecognized' | 'duplicate' | 'error';

interface IntakeItem {
  key: string;
  file: File;
  status: IntakeStatus;
  message: string;
  /** Documento ya registrado; se reutiliza al reintentar con contraseña. */
  documentId?: string;
}

const MAX_BYTES = 25 * 1024 * 1024;

/**
 * Segundo paso del camino guiado: el usuario suelta sus documentos (PDF y el reporte de
 * facturas) y NexusTax los reconoce solo. Reutiliza la lectura local existente; no sube nada.
 * El detalle técnico (tipo, almacenamiento, entidad) sigue disponible en la biblioteca avanzada.
 */
export function DocumentIntakePanel({
  caseId,
  taxYear,
  result,
  products,
  requirements,
  coverages,
  documents,
  sessions,
  candidates,
  pendingReviewCount,
  onContinue,
  onOpenLibrary,
}: {
  caseId: string;
  taxYear: number;
  result?: ProcessingResult;
  products: CaseProduct[];
  requirements: readonly DocumentaryRequirement[];
  coverages: readonly RequirementCoverage[];
  documents: readonly UploadedDocument[];
  sessions: readonly DocumentExtractionSession[];
  candidates: readonly DocumentFactCandidate[];
  pendingReviewCount: number;
  onContinue: () => void;
  onOpenLibrary: () => void;
}) {
  const [items, setItems] = useState<IntakeItem[]>([]);
  const [passwords, setPasswords] = useState<Record<string, string>>({});
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const registered = useRef(new Map<string, UploadedDocument>());
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);
  const checklist = buildDocumentChecklist(requirements, coverages);
  const suggestions = useMemo(
    () =>
      suggestRequirementMatches({
        documents,
        sessions,
        candidates,
        requirements,
        coverages,
        entities: result?.entities ?? [],
      }).filter((item) => !dismissed.has(item.key)),
    [documents, sessions, candidates, requirements, coverages, result?.entities, dismissed],
  );
  const strongSuggestions = suggestions.filter((item) => item.strength === 'strong');

  async function confirmMatches(selected: typeof suggestions) {
    setConfirming(true);
    setMatchError(null);
    try {
      for (const item of selected) {
        await saveRequirementCoverage({
          caseId,
          requirementId: item.requirementId,
          documentId: item.documentId,
          factId: null,
          entityId: item.entityId,
          status: 'covered',
          relation: 'covers',
          notes:
            'Asociado desde «Sube tus documentos»: sugerido por NexusTax y confirmado por el usuario.',
        });
      }
    } catch (caught) {
      setMatchError(caught instanceof Error ? caught.message : 'No pudimos guardar la asociación.');
    } finally {
      setConfirming(false);
    }
  }
  const busy = items.some((item) => item.status === 'working');

  function patch(key: string, change: Partial<IntakeItem>) {
    setItems((current) =>
      current.map((item) => (item.key === key ? { ...item, ...change } : item)),
    );
  }

  async function processFile(item: IntakeItem, password?: string) {
    const { file, key } = item;
    patch(key, { status: 'working', message: 'Leyendo el archivo en tu equipo…' });
    try {
      if (file.size > MAX_BYTES) {
        patch(key, { status: 'error', message: 'El archivo pesa más de 25 MB.' });
        return;
      }
      const type = intakeFileType(file.name);
      if (type === 'unsupported') {
        patch(key, {
          status: 'unrecognized',
          message: 'Solo leemos archivos PDF y Excel (.xlsx).',
        });
        return;
      }
      if (type === 'sheet') {
        const report = await importElectronicInvoiceReport(caseId, taxYear, file);
        patch(
          key,
          report
            ? { status: 'done', message: 'Reporte de facturación electrónica cargado.' }
            : {
                status: 'unrecognized',
                message:
                  'No lo reconocimos como reporte de facturas electrónicas. Si es tu exógena, ya está cargada.',
              },
        );
        return;
      }
      let document = registered.current.get(key);
      if (!document) {
        document = await addCaseDocument(caseId, file, {
          kind: 'other',
          storageMode: 'metadata_only',
          taxYear,
        });
        registered.current.set(key, document);
      }
      const sessionId = await processDocumentLocally({
        document,
        file,
        password,
        autoDetect: true,
        result,
        products,
      });
      const detected = await applyDetectedDocumentKind(document.id, sessionId);
      patch(key, {
        status: 'done',
        message: !detected
          ? 'Leído. No estamos seguros de qué documento es; confírmalo en la revisión.'
          : detected.adopted
            ? `Reconocido como: ${DOCUMENT_KIND_LABEL[detected.kind]}.`
            : `Parece ser: ${DOCUMENT_KIND_LABEL[detected.kind]}. Confírmalo en la revisión.`,
      });
    } catch (caught) {
      if (
        caught instanceof PdfReadError &&
        (caught.code === 'password_required' || caught.code === 'incorrect_password')
      ) {
        patch(key, {
          status: 'needs_password',
          message:
            caught.code === 'incorrect_password'
              ? 'La clave no es correcta. Inténtalo de nuevo.'
              : 'Este PDF tiene clave. Escríbela para poder leerlo.',
        });
        return;
      }
      const message = caught instanceof Error ? caught.message : '';
      if (message.includes('ya existe')) {
        patch(key, { status: 'duplicate', message: 'Ya habías subido este archivo.' });
        return;
      }
      patch(key, {
        status: 'error',
        message: message || 'No pudimos leer este archivo. Puedes intentarlo desde la biblioteca.',
      });
    }
  }

  async function handleFiles(list: FileList | File[]) {
    const files = Array.from(list);
    if (files.length === 0) return;
    const fresh = files.map<IntakeItem>((file, index) => ({
      key: `${Date.now()}-${index}-${file.name}`,
      file,
      status: 'working',
      message: 'En cola…',
    }));
    setItems((current) => [...fresh, ...current]);
    // Secuencial: la lectura de PDF es pesada y así el progreso es legible.
    for (const item of fresh) await processFile(item);
  }

  return (
    <div className="flex flex-col gap-5">
      <GlassPanel className="p-6">
        <h2 className="text-xl font-semibold text-content-strong">Suma tus documentos</h2>
        <p className="mt-2 text-sm text-content-muted">
          Tu exógena es el punto de partida. Los certificados y el reporte de facturas completan el
          cuadro. Puedes soltar varios a la vez: reconocemos cada uno solos.
        </p>
        <p className="mt-2 flex items-start gap-2 text-xs text-content-muted">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-tone-emerald" aria-hidden />
          Todo se lee en tu navegador. No subimos nada y no guardamos los archivos ni las claves.
        </p>

        <label
          htmlFor="intake-files"
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            void handleFiles(event.dataTransfer.files);
          }}
          className={`mt-5 flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed p-8 text-center transition-colors focus-within:ring-2 focus-within:ring-accent-cyan/50 motion-reduce:transition-none ${
            dragging
              ? 'border-accent-cyan bg-accent-cyan/10'
              : 'border-overlay/20 hover:bg-overlay/5'
          }`}
        >
          <UploadCloud className="h-8 w-8 text-tone-cyan" aria-hidden />
          <span className="text-sm font-medium text-content-strong">
            Arrastra tus archivos aquí o haz clic para elegirlos
          </span>
          <span className="text-xs text-content-muted">
            PDF (certificados, soportes) y Excel (reporte de facturas electrónicas de la DIAN)
          </span>
          <input
            ref={inputRef}
            id="intake-files"
            type="file"
            multiple
            accept=".pdf,.xlsx,.xls"
            className="sr-only"
            disabled={busy}
            onChange={(event) => {
              void handleFiles(event.target.files ?? []);
              event.target.value = '';
            }}
          />
        </label>

        {items.length > 0 ? (
          <ul className="mt-5 space-y-2" aria-live="polite">
            {items.map((item) => (
              <li key={item.key} className="rounded-xl border border-overlay/10 p-3">
                <div className="flex items-start gap-3">
                  <StatusIcon status={item.status} />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 truncate text-sm font-medium text-content-strong">
                      <FileText className="h-3.5 w-3.5 shrink-0 text-content-subtle" aria-hidden />
                      <span className="truncate">{item.file.name}</span>
                    </p>
                    <p className="mt-0.5 text-xs text-content-muted">{item.message}</p>
                    {item.status === 'needs_password' ? (
                      <form
                        className="mt-2 flex flex-wrap items-center gap-2"
                        onSubmit={(event) => {
                          event.preventDefault();
                          void processFile(item, passwords[item.key]);
                        }}
                      >
                        <label className="sr-only" htmlFor={`pw-${item.key}`}>
                          Clave del PDF {item.file.name}
                        </label>
                        <input
                          id={`pw-${item.key}`}
                          type="password"
                          autoComplete="off"
                          value={passwords[item.key] ?? ''}
                          onChange={(event) =>
                            setPasswords((current) => ({
                              ...current,
                              [item.key]: event.target.value,
                            }))
                          }
                          className="min-h-10 rounded-lg border border-overlay/15 bg-transparent px-3 text-sm text-content"
                        />
                        <Button
                          type="submit"
                          leadingIcon={<KeyRound className="h-4 w-4" aria-hidden />}
                        >
                          Desbloquear
                        </Button>
                      </form>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button
            onClick={onContinue}
            disabled={busy}
            leadingIcon={<ArrowRight className="h-4 w-4" aria-hidden />}
          >
            {pendingReviewCount > 0 ? 'Revisar lo que encontramos' : 'Continuar'}
          </Button>
          {pendingReviewCount > 0 ? (
            <Badge tone="cyan">
              {pendingReviewCount === 1
                ? '1 dato por revisar'
                : `${pendingReviewCount} datos por revisar`}
            </Badge>
          ) : (
            <span className="text-xs text-content-muted">
              Puedes continuar sin subir nada y volver cuando tengas los archivos.
            </span>
          )}
          <button
            type="button"
            onClick={onOpenLibrary}
            className="text-sm text-tone-cyan underline-offset-2 hover:underline"
          >
            Abrir la biblioteca avanzada
          </button>
        </div>
      </GlassPanel>

      {suggestions.length > 0 ? (
        <GlassPanel className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-medium text-content-strong">
                Asociaciones que encontramos
              </h3>
              <p className="mt-1 text-xs text-content-muted">
                Creemos que estos documentos soportan estos requisitos. Nada se guarda hasta que lo
                confirmes.
              </p>
            </div>
            {strongSuggestions.length > 1 ? (
              <Button
                onClick={() => void confirmMatches(strongSuggestions)}
                disabled={confirming}
                leadingIcon={<CheckCircle2 className="h-4 w-4" aria-hidden />}
              >
                Confirmar las {strongSuggestions.length} seguras
              </Button>
            ) : null}
          </div>
          {matchError ? <p className="mt-3 text-xs text-tone-amber">{matchError}</p> : null}
          <ul className="mt-4 space-y-2">
            {suggestions.map((item) => (
              <li key={item.key} className="rounded-xl border border-overlay/10 p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm text-content-strong">
                      <span className="truncate font-medium">{item.documentFileName}</span>
                      <Badge tone={item.strength === 'strong' ? 'emerald' : 'amber'}>
                        {item.strength === 'strong' ? 'Segura' : 'Probable'}
                      </Badge>
                    </p>
                    <p className="mt-1 text-xs text-content">
                      Soportaría: {item.requirementName} · {item.entityName}
                    </p>
                    <p className="mt-0.5 text-xs text-content-muted">{item.reason}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => void confirmMatches([item])}
                      disabled={confirming}
                      aria-label={`Confirmar: ${item.documentFileName} soporta ${item.requirementName} de ${item.entityName}`}
                    >
                      Confirmar
                    </Button>
                    <button
                      type="button"
                      onClick={() => setDismissed((current) => new Set(current).add(item.key))}
                      className="min-h-10 rounded-lg border border-overlay/12 px-3 text-sm text-content-muted hover:bg-overlay/5"
                      aria-label={`Descartar: ${item.documentFileName} no soporta ${item.requirementName} de ${item.entityName}`}
                    >
                      No es este
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </GlassPanel>
      ) : null}

      {checklist.items.length > 0 ? (
        <section aria-labelledby="que-suele-faltar">
          <h3 id="que-suele-faltar" className="text-sm font-medium text-content-strong">
            Qué soportes sugiere tu exógena
          </h3>
          <p className="mb-3 mt-1 text-xs text-content-muted">
            {checklist.coveredRequirements} de {checklist.totalRequirements} asociados. Es una
            recomendación, no una obligación: sube los que tengas. Se marcan como completos cuando
            confirmas a qué soporte corresponde cada documento, en la revisión.
          </p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {checklist.items.map((item) => (
              <li key={item.name}>
                <GlassPanel className="h-full p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-content-strong">{item.name}</p>
                    <Badge tone={item.complete ? 'emerald' : 'amber'}>
                      {item.complete ? 'Completo' : `${item.covered} de ${item.total}`}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-content-muted">
                    {item.entities.join(', ')}
                    {item.extraEntities > 0 ? ` y ${item.extraEntities} más` : ''}
                  </p>
                </GlassPanel>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function StatusIcon({ status }: { status: IntakeStatus }) {
  if (status === 'working')
    return (
      <Loader2
        className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-tone-cyan motion-reduce:animate-none"
        aria-label="Procesando"
      />
    );
  if (status === 'done')
    return (
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-tone-emerald" aria-label="Listo" />
    );
  if (status === 'needs_password')
    return (
      <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-tone-amber" aria-label="Necesita clave" />
    );
  if (status === 'duplicate')
    return <Circle className="mt-0.5 h-4 w-4 shrink-0 text-content-subtle" aria-label="Repetido" />;
  return (
    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-tone-amber" aria-label="Atención" />
  );
}
