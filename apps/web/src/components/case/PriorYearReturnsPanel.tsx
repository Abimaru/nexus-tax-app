'use client';

import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Banknote,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  FileText,
  History,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';
import type { CaseTask, PriorYearCarryForwardCandidate, PriorYearTaxReturn, TaxCase } from '@nexus-tax/domain';
import type { Form210Draft, TaxEvolutionMetric } from '@nexus-tax/form-210';
import { compareTaxEvolution } from '@nexus-tax/form-210';
import { Badge, Button, EmptyState, GlassPanel, formatCurrencyCOP } from '@nexus-tax/ui';
import { FileDropzone } from '@/components/FileDropzone';
import {
  PriorYearUploadError,
  buildPriorYearReturnFromExtraction,
  checkPriorYearIdentity,
  processPriorYearReturnUpload,
  type PriorYearUploadResult,
} from '@/lib/priorYearReturns';
import { priorYearBoxLabel } from '@/lib/priorYearBoxLabels';
import {
  answerRefundCarryForwardQuestion,
  decideCarryForwardCandidate,
  discardCaseTask,
  refreshPriorYearCarryForwardCandidates,
  removePriorYearReturn,
  saveTaxResolutionDecision,
  savePriorYearReturn,
} from '@/lib/repository';

type UploadStage =
  | 'idle'
  | 'analizando'
  | 'reconocido'
  | 'requiere-revision'
  | 'no-reconocido'
  | 'error';

const STATUS_LABEL: Record<PriorYearTaxReturn['status'], string> = {
  submitted: 'Presentada',
  draft: 'Borrador',
  amended: 'Corrección',
  unknown: 'Por confirmar',
};

const STATUS_TONE: Record<PriorYearTaxReturn['status'], 'emerald' | 'amber' | 'violet' | 'neutral'> = {
  submitted: 'emerald',
  draft: 'amber',
  amended: 'violet',
  unknown: 'neutral',
};

function formatBoxValue(value: number | null): string {
  if (value === null) return '—';
  return formatCurrencyCOP(value);
}

export function PriorYearReturnsPanel({
  caseId,
  taxCase,
  form210Draft,
  priorYearReturns,
  carryForwardCandidates,
  tasks,
  focusTaskId,
}: {
  caseId: string;
  taxCase: TaxCase;
  form210Draft?: Form210Draft;
  priorYearReturns: readonly PriorYearTaxReturn[];
  carryForwardCandidates: readonly PriorYearCarryForwardCandidate[];
  tasks: readonly CaseTask[];
  focusTaskId?: string | null;
}) {
  const [showUpload, setShowUpload] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [needsPassword, setNeedsPassword] = useState(false);
  const [stage, setStage] = useState<UploadStage>('idle');
  const [error, setError] = useState<string | null>(null);
  const [pendingUpload, setPendingUpload] = useState<PriorYearUploadResult | null>(null);
  const [confirmedTaxYear, setConfirmedTaxYear] = useState<number>(taxCase.taxYear - 1);
  const [replacesId, setReplacesId] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [detailReturnId, setDetailReturnId] = useState<string | null>(null);
  const [advancedEvidence, setAdvancedEvidence] = useState(false);
  const [comparisonYear, setComparisonYear] = useState<number | null>(null);
  const [busyCandidateId, setBusyCandidateId] = useState<string | null>(null);

  const focusedTask = focusTaskId ? tasks.find((task) => task.id === focusTaskId) : undefined;

  const returnsByYear = useMemo(() => {
    const map = new Map<number, PriorYearTaxReturn[]>();
    for (const item of priorYearReturns) {
      const list = map.get(item.taxYear) ?? [];
      list.push(item);
      map.set(item.taxYear, list);
    }
    return [...map.entries()].sort((a, b) => b[0] - a[0]);
  }, [priorYearReturns]);

  const identityDetectionPreview =
    pendingUpload && checkPriorYearIdentity(taxCase, pendingUpload.extraction.detection);

  async function handleUpload() {
    if (!file) return;
    setError(null);
    setStage('analizando');
    try {
      const result = await processPriorYearReturnUpload({
        caseId,
        file,
        password: password || undefined,
        storageMode: 'metadata_only',
        fallbackTaxYear: taxCase.taxYear - 1,
      });
      setPendingUpload(result);
      setConfirmedTaxYear(result.extraction.detection.taxYear ?? taxCase.taxYear - 1);
      const hasBoxes = result.extraction.boxes.length > 0;
      if (!result.extraction.detection.isForm210 && !hasBoxes) {
        setStage('no-reconocido');
      } else if (result.extraction.detection.confidence === 'low' || !hasBoxes) {
        setStage('requiere-revision');
      } else {
        setStage('reconocido');
      }
    } catch (caught) {
      if (caught instanceof PriorYearUploadError && caught.code === 'password_required') {
        setNeedsPassword(true);
        setStage('idle');
        setError('Este archivo requiere contraseña. La contraseña solo se usa en memoria.');
        return;
      }
      setStage('error');
      setError(
        caught instanceof Error ? caught.message : 'No pudimos identificar este archivo como un Formulario 210.',
      );
    }
  }

  async function handleSaveReturn() {
    if (!pendingUpload) return;
    setSaving(true);
    try {
      const identityMatch = checkPriorYearIdentity(taxCase, pendingUpload.extraction.detection);
      const record = buildPriorYearReturnFromExtraction({
        caseId,
        documentId: pendingUpload.documentId,
        extraction: pendingUpload.extraction,
        identityMatch,
        confirmedTaxYear,
        replaces: replacesId || null,
      });
      await savePriorYearReturn(record);
      await refreshPriorYearCarryForwardCandidates(caseId);
      setPendingUpload(null);
      setFile(null);
      setPassword('');
      setNeedsPassword(false);
      setStage('idle');
      setReplacesId('');
      setShowUpload(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No fue posible guardar la declaración.');
    } finally {
      setSaving(false);
    }
  }

  function cancelUpload() {
    setPendingUpload(null);
    setFile(null);
    setPassword('');
    setNeedsPassword(false);
    setStage('idle');
    setError(null);
  }

  async function applyCandidate(candidate: PriorYearCarryForwardCandidate, valueCop: number) {
    setBusyCandidateId(candidate.id);
    try {
      await saveTaxResolutionDecision(caseId, {
        type: 'adjust_form_box',
        objectType: 'form_box',
        objectId: String(candidate.targetBoxNumber),
        previousState: 'no_data',
        finalState: 'confirmed',
        selectedAlternative: `Arrastre confirmado desde la declaración AG ${candidate.priorYearTaxYear} (casilla ${candidate.sourceBoxNumber})`,
        finalValue: valueCop,
        reason: 'Arrastre confirmado por el analista desde una declaración anterior (Sprint 2.4, Fase B1).',
        evidence: [
          { kind: 'manual_note', referenceId: candidate.priorYearReturnId, description: candidate.evidence },
        ],
      });
      await decideCarryForwardCandidate(candidate.id, 'confirmed', valueCop);
    } finally {
      setBusyCandidateId(null);
    }
  }

  async function rejectCandidate(candidate: PriorYearCarryForwardCandidate) {
    setBusyCandidateId(candidate.id);
    try {
      await decideCarryForwardCandidate(candidate.id, 'rejected', null);
    } finally {
      setBusyCandidateId(null);
    }
  }

  async function answerRefund(candidate: PriorYearCarryForwardCandidate, answer: 'yes' | 'no' | 'unknown') {
    setBusyCandidateId(candidate.id);
    try {
      await answerRefundCarryForwardQuestion(candidate.id, answer);
    } finally {
      setBusyCandidateId(null);
    }
  }

  async function removeReturn(id: string) {
    await removePriorYearReturn(id);
  }

  const detailReturn = priorYearReturns.find((item) => item.id === detailReturnId);

  return (
    <div className="space-y-5">
      <GlassPanel className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-content-strong">Declaraciones anteriores</h2>
            <p className="mt-1 max-w-2xl text-sm text-content-muted">
              Úsalas para trasladar el anticipo, revisar el saldo a favor, comparar patrimonio e
              ingresos, detectar variaciones y aportar contexto histórico. No siempre son
              obligatorias: agrégalas solo si tienes el Formulario 210 del año anterior a mano.
            </p>
          </div>
          <Button leadingIcon={<UploadCloud className="h-4 w-4" />} onClick={() => setShowUpload(true)}>
            Agregar declaración
          </Button>
        </div>
      </GlassPanel>

      {showUpload ? (
        <UploadCard
          file={file}
          onSelect={setFile}
          onRemove={() => setFile(null)}
          password={password}
          onPasswordChange={setPassword}
          needsPassword={needsPassword}
          stage={stage}
          error={error}
          pendingUpload={pendingUpload}
          identityMatch={identityDetectionPreview ?? null}
          confirmedTaxYear={confirmedTaxYear}
          onConfirmedTaxYearChange={setConfirmedTaxYear}
          replacesId={replacesId}
          onReplacesIdChange={setReplacesId}
          existingReturns={priorYearReturns}
          onUpload={handleUpload}
          onSave={handleSaveReturn}
          onCancel={() => {
            cancelUpload();
            if (priorYearReturns.length) setShowUpload(false);
          }}
          saving={saving}
        />
      ) : null}

      {priorYearReturns.length === 0 && !showUpload ? (
        <EmptyState
          icon={<History className="h-8 w-8" />}
          title="No has agregado declaraciones anteriores"
          description="Sirven para trasladar el anticipo, revisar el saldo a favor, comparar patrimonio e ingresos y detectar variaciones frente al año actual."
          action={<Button onClick={() => setShowUpload(true)}>Agregar declaración</Button>}
        />
      ) : null}

      {returnsByYear.map(([taxYear, group]) => (
        <YearGroupCard
          key={taxYear}
          taxYear={taxYear}
          group={group}
          highlight={focusedTask?.documentId ? group.some((item) => item.sourceDocumentId === focusedTask.documentId) : false}
          onViewDetail={setDetailReturnId}
          onCompare={() => setComparisonYear(taxYear)}
          onRemove={removeReturn}
        />
      ))}

      <CarryForwardSection
        candidates={carryForwardCandidates}
        busyCandidateId={busyCandidateId}
        onApply={applyCandidate}
        onReject={rejectCandidate}
        onAnswerRefund={answerRefund}
      />

      {comparisonYear !== null ? (
        <EvolutionSection
          priorReturn={priorYearReturns.find(
            (item) => item.taxYear === comparisonYear && item.isCurrentVersion,
          )}
          form210Draft={form210Draft}
          tasks={tasks}
          onDismissTask={discardCaseTask}
          onClose={() => setComparisonYear(null)}
        />
      ) : null}

      {detailReturn ? (
        <PriorYearDetailDrawer
          priorReturn={detailReturn}
          advanced={advancedEvidence}
          onToggleAdvanced={() => setAdvancedEvidence((value) => !value)}
          onClose={() => setDetailReturnId(null)}
        />
      ) : null}
    </div>
  );
}

function UploadCard(props: {
  file: File | null;
  onSelect: (file: File) => void;
  onRemove: () => void;
  password: string;
  onPasswordChange: (value: string) => void;
  needsPassword: boolean;
  stage: UploadStage;
  error: string | null;
  pendingUpload: PriorYearUploadResult | null;
  identityMatch: 'match' | 'mismatch' | 'unknown' | null;
  confirmedTaxYear: number;
  onConfirmedTaxYearChange: (value: number) => void;
  replacesId: string;
  onReplacesIdChange: (value: string) => void;
  existingReturns: readonly PriorYearTaxReturn[];
  onUpload: () => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const {
    file,
    onSelect,
    onRemove,
    password,
    onPasswordChange,
    needsPassword,
    stage,
    error,
    pendingUpload,
    identityMatch,
    confirmedTaxYear,
    onConfirmedTaxYearChange,
    replacesId,
    onReplacesIdChange,
    existingReturns,
    onUpload,
    onSave,
    onCancel,
    saving,
  } = props;

  return (
    <GlassPanel className="p-6">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold text-content-strong">Agregar declaración anterior</h3>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg p-1.5 text-content-subtle hover:bg-overlay/10"
          aria-label="Cerrar formulario de carga"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>

      {!pendingUpload ? (
        <div className="mt-4 space-y-3">
          <FileDropzone
            id="prior-year-return-file"
            variant="document"
            file={file}
            onSelect={onSelect}
            onRemove={onRemove}
            accept="application/pdf"
            allowedExtensions={['pdf']}
            busy={stage === 'analizando'}
          />
          {needsPassword ? (
            <label className="block text-xs text-content-muted">
              Contraseña del PDF (solo se usa en memoria)
              <input
                type="password"
                value={password}
                onChange={(event) => onPasswordChange(event.target.value)}
                className="mt-1 w-full rounded-lg border border-overlay/12 bg-surface-raised px-3 py-2 text-sm text-content-strong"
              />
            </label>
          ) : null}
          <StageBanner stage={stage} error={error} onRetry={onUpload} />
          <Button onClick={onUpload} disabled={!file || stage === 'analizando'}>
            {stage === 'analizando' ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Analizando documento…
              </>
            ) : (
              'Analizar documento'
            )}
          </Button>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <StageBanner stage={stage} error={error} onRetry={onUpload} />
          <IdentityBanner identityMatch={identityMatch} detection={pendingUpload.extraction.detection} />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-content-muted">
              Año gravable de esta declaración
              <input
                type="number"
                value={confirmedTaxYear}
                onChange={(event) => onConfirmedTaxYearChange(Number(event.target.value))}
                className="mt-1 w-full rounded-lg border border-overlay/12 bg-surface-raised px-3 py-2 text-sm text-content-strong"
              />
            </label>
            {existingReturns.some((item) => item.taxYear === confirmedTaxYear) ? (
              <label className="text-xs text-content-muted">
                ¿Esta declaración corrige otra ya cargada?
                <select
                  value={replacesId}
                  onChange={(event) => onReplacesIdChange(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-overlay/12 bg-surface-raised px-3 py-2 text-sm text-content-strong"
                >
                  <option value="">No, es una declaración independiente</option>
                  {existingReturns
                    .filter((item) => item.taxYear === confirmedTaxYear)
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        Corrige {item.formNumber ?? item.id}
                      </option>
                    ))}
                </select>
              </label>
            ) : null}
          </div>
          <p className="text-xs text-content-subtle">
            {pendingUpload.extraction.boxes.length} casilla(s) reconocida(s) · confianza de lectura{' '}
            {pendingUpload.lowestReadConfidence}.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={onSave}
              disabled={saving || identityMatch === 'mismatch'}
              leadingIcon={saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : undefined}
            >
              Guardar declaración histórica
            </Button>
            <Button variant="secondary" onClick={onCancel}>
              Descartar
            </Button>
          </div>
          {identityMatch === 'mismatch' ? (
            <p className="text-xs text-tone-rose">
              No puedes guardar esta declaración mientras la identidad no coincida con el
              expediente.
            </p>
          ) : null}
        </div>
      )}
    </GlassPanel>
  );
}

function StageBanner({
  stage,
  error,
  onRetry,
}: {
  stage: UploadStage;
  error: string | null;
  onRetry: () => void;
}) {
  if (stage === 'idle') return null;
  if (stage === 'analizando') {
    return (
      <p className="flex items-center gap-2 text-sm text-content-muted">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Analizando documento…
      </p>
    );
  }
  if (stage === 'reconocido') {
    return (
      <p className="flex items-center gap-2 text-sm text-tone-emerald">
        <CheckCircle2 className="h-4 w-4" aria-hidden /> Formulario reconocido.
      </p>
    );
  }
  if (stage === 'requiere-revision') {
    return (
      <p className="flex items-center gap-2 text-sm text-tone-amber">
        <AlertTriangle className="h-4 w-4" aria-hidden /> Requiere revisión: pocas casillas
        reconocidas con confianza suficiente.
      </p>
    );
  }
  if (stage === 'no-reconocido' || stage === 'error') {
    return (
      <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-3 text-sm text-tone-rose">
        <p className="flex items-center gap-2 font-medium">
          <AlertTriangle className="h-4 w-4" aria-hidden />
          {error ?? 'No pudimos identificar este archivo como un Formulario 210.'}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button variant="secondary" onClick={onRetry}>
            Intentar nuevamente
          </Button>
        </div>
      </div>
    );
  }
  return null;
}

function IdentityBanner({
  identityMatch,
  detection,
}: {
  identityMatch: 'match' | 'mismatch' | 'unknown' | null;
  detection: PriorYearUploadResult['extraction']['detection'];
}) {
  if (identityMatch === 'mismatch') {
    return (
      <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-3 text-sm text-tone-rose">
        <p className="flex items-center gap-2 font-medium">
          <ShieldAlert className="h-4 w-4" aria-hidden /> Este formulario parece pertenecer a otra
          persona.
        </p>
        <p className="mt-1 text-xs">
          Identidad detectada: {detection.taxpayerIdentityMasked ?? 'no disponible'}. No se
          importarán sus valores.
        </p>
      </div>
    );
  }
  if (identityMatch === 'match') {
    return (
      <p className="flex items-center gap-2 text-sm text-tone-emerald">
        <ShieldCheck className="h-4 w-4" aria-hidden /> Identidad verificada.
      </p>
    );
  }
  return (
    <p className="flex items-center gap-2 text-sm text-content-muted">
      <ShieldAlert className="h-4 w-4" aria-hidden /> No fue posible comparar la identidad
      automáticamente; revísala manualmente.
    </p>
  );
}

function YearGroupCard({
  taxYear,
  group,
  highlight,
  onViewDetail,
  onCompare,
  onRemove,
}: {
  taxYear: number;
  group: readonly PriorYearTaxReturn[];
  highlight: boolean;
  onViewDetail: (id: string) => void;
  onCompare: () => void;
  onRemove: (id: string) => void;
}) {
  const current = group.find((item) => item.isCurrentVersion) ?? group[0]!;
  const boxCount = Object.keys(current.boxes).length;
  return (
    <GlassPanel className={`p-6 ${highlight ? 'ring-2 ring-accent-cyan/60' : ''}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-content-strong">AG {taxYear}</h3>
            <Badge tone={STATUS_TONE[current.status]}>{STATUS_LABEL[current.status]}</Badge>
            {current.identityMatch === 'mismatch' ? (
              <Badge tone="rose">Identidad no verificada</Badge>
            ) : current.identityMatch === 'match' ? (
              <Badge tone="emerald">Identidad verificada</Badge>
            ) : null}
            {group.length > 1 ? <Badge tone="violet">{group.length} declaraciones</Badge> : null}
          </div>
          <p className="mt-1 text-sm text-content-muted">
            Formulario 210 · {boxCount} casilla(s) reconocida(s)
          </p>
        </div>
        <FileText className="h-7 w-7 text-tone-cyan" aria-hidden />
      </div>
      {group.length > 1 ? (
        <ul className="mt-3 space-y-1 text-xs text-content-subtle">
          {group.map((item) => (
            <li key={item.id} className="flex items-center gap-2">
              <ChevronRight className="h-3 w-3" aria-hidden />
              {item.replaces ? 'Corrección' : 'Original'}
              {item.isCurrentVersion ? <Badge tone="emerald">Vigente</Badge> : null}
            </li>
          ))}
        </ul>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => onViewDetail(current.id)}>
          Ver declaración
        </Button>
        <Button variant="secondary" onClick={() => onViewDetail(current.id)}>
          Valores extraídos
        </Button>
        <Button variant="ghost" onClick={onCompare}>
          Comparar con año actual
        </Button>
        <Button
          variant="ghost"
          leadingIcon={<Trash2 className="h-4 w-4" />}
          onClick={() => onRemove(current.id)}
        >
          Eliminar
        </Button>
      </div>
    </GlassPanel>
  );
}

function CarryForwardSection({
  candidates,
  busyCandidateId,
  onApply,
  onReject,
  onAnswerRefund,
}: {
  candidates: readonly PriorYearCarryForwardCandidate[];
  busyCandidateId: string | null;
  onApply: (candidate: PriorYearCarryForwardCandidate, value: number) => void;
  onReject: (candidate: PriorYearCarryForwardCandidate) => void;
  onAnswerRefund: (candidate: PriorYearCarryForwardCandidate, answer: 'yes' | 'no' | 'unknown') => void;
}) {
  const advance = candidates.find((item) => item.targetBoxNumber === 130);
  const refund = candidates.find((item) => item.targetBoxNumber === 131);
  if (!advance && !refund) return null;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {advance ? (
        <CarryForwardCard
          title="Anticipo del año anterior"
          icon={<Banknote className="h-6 w-6 text-tone-cyan" aria-hidden />}
          candidate={advance}
          busy={busyCandidateId === advance.id}
          onApply={onApply}
          onReject={onReject}
        />
      ) : null}
      {refund ? (
        <CarryForwardCard
          title="Saldo a favor del año anterior"
          icon={<CalendarClock className="h-6 w-6 text-tone-violet" aria-hidden />}
          candidate={refund}
          busy={busyCandidateId === refund.id}
          onApply={onApply}
          onReject={onReject}
          onAnswerRefund={onAnswerRefund}
        />
      ) : null}
    </div>
  );
}

function CarryForwardCard({
  title,
  icon,
  candidate,
  busy,
  onApply,
  onReject,
  onAnswerRefund,
}: {
  title: string;
  icon: React.ReactNode;
  candidate: PriorYearCarryForwardCandidate;
  busy: boolean;
  onApply: (candidate: PriorYearCarryForwardCandidate, value: number) => void;
  onReject: (candidate: PriorYearCarryForwardCandidate) => void;
  onAnswerRefund?: (candidate: PriorYearCarryForwardCandidate, answer: 'yes' | 'no' | 'unknown') => void;
}) {
  const value = candidate.sourceValueCop ?? 0;
  if (!value) {
    return (
      <GlassPanel className="p-5">
        <div className="flex items-center gap-2">
          {icon}
          <h4 className="font-semibold text-content-strong">{title}</h4>
        </div>
        <p className="mt-3 text-sm text-content-muted">
          El formulario anterior no registra saldo para trasladar en este concepto.
        </p>
      </GlassPanel>
    );
  }
  const needsRefundAnswer =
    candidate.targetBoxNumber === 131 &&
    onAnswerRefund &&
    candidate.refundOrCompensationRequested === 'unknown';
  const blockedByRefund = candidate.targetBoxNumber === 131 && candidate.refundOrCompensationRequested === 'yes';
  const decided = candidate.decision !== 'pending';

  return (
    <GlassPanel className="p-5">
      <div className="flex items-center gap-2">
        {icon}
        <h4 className="font-semibold text-content-strong">{title}</h4>
        {decided ? (
          <Badge tone={candidate.decision === 'confirmed' || candidate.decision === 'corrected' ? 'emerald' : 'neutral'}>
            {candidate.decision === 'confirmed'
              ? 'Aplicado'
              : candidate.decision === 'corrected'
                ? 'Aplicado (corregido)'
                : 'No usado'}
          </Badge>
        ) : null}
      </div>
      <p className="mt-2 text-sm text-content-muted">
        Declaración AG {candidate.priorYearTaxYear} · casilla {candidate.sourceBoxNumber}
      </p>
      <p className="mt-1 text-2xl font-semibold text-content-strong">{formatCurrencyCOP(value)}</p>
      <p className="mt-1 text-xs text-content-subtle">
        Destino propuesto: Formulario actual · casilla {candidate.targetBoxNumber}
      </p>

      {needsRefundAnswer ? (
        <div className="mt-4 rounded-lg border border-overlay/10 bg-overlay/[0.02] p-3">
          <p className="text-sm font-medium text-content-strong">
            ¿Solicitaste este saldo a favor en devolución o compensación?
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => onAnswerRefund!(candidate, 'no')}>
              No
            </Button>
            <Button variant="secondary" onClick={() => onAnswerRefund!(candidate, 'yes')}>
              Sí
            </Button>
            <Button variant="ghost" onClick={() => onAnswerRefund!(candidate, 'unknown')}>
              No estoy seguro
            </Button>
          </div>
        </div>
      ) : blockedByRefund ? (
        <p className="mt-3 text-sm text-content-muted">
          Indicaste que ya solicitaste este saldo en devolución o compensación: no se traslada.
        </p>
      ) : !decided ? (
        <div className="mt-4 space-y-2">
          <div className="flex flex-wrap gap-2">
            <Button disabled={busy} onClick={() => onApply(candidate, value)}>
              Aplicar
            </Button>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => {
                const corrected = window.prompt('Valor corregido (COP):', String(value));
                if (corrected === null) return;
                const parsed = Number(corrected.replace(/[^0-9.-]/g, ''));
                if (Number.isFinite(parsed) && parsed >= 0) onApply(candidate, parsed);
              }}
            >
              Corregir
            </Button>
            <Button variant="ghost" disabled={busy} onClick={() => onReject(candidate)}>
              No usar
            </Button>
          </div>
        </div>
      ) : null}
    </GlassPanel>
  );
}

function EvolutionSection({
  priorReturn,
  form210Draft,
  tasks,
  onDismissTask,
  onClose,
}: {
  priorReturn?: PriorYearTaxReturn;
  form210Draft?: Form210Draft;
  tasks: readonly CaseTask[];
  onDismissTask: (taskId: string) => void;
  onClose: () => void;
}) {
  const currentBoxValues = useMemo(() => {
    const map: Record<number, number | null> = {};
    for (const box of form210Draft?.boxes ?? []) {
      map[box.number] = box.confirmedValue ?? box.suggestedValue ?? null;
    }
    return map;
  }, [form210Draft]);
  const metrics = useMemo(
    () => compareTaxEvolution(priorReturn ?? null, currentBoxValues),
    [priorReturn, currentBoxValues],
  );
  const anomalyTasks = tasks.filter(
    (task) => task.type === 'review_historical_scale_anomaly' && task.status === 'pending',
  );

  return (
    <GlassPanel className="p-6">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-content-strong">Evolución tributaria</h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-content-subtle hover:bg-overlay/10"
          aria-label="Cerrar evolución tributaria"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-content-subtle">
              <th className="pb-2">Concepto</th>
              <th className="pb-2">Año anterior</th>
              <th className="pb-2">Año actual</th>
              <th className="pb-2">Variación</th>
              <th className="pb-2">Estado</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((metric) => (
              <EvolutionRow key={metric.key} metric={metric} />
            ))}
          </tbody>
        </table>
      </div>
      {anomalyTasks.length ? (
        <div className="mt-5 space-y-3">
          {anomalyTasks.map((task) => (
            <div
              key={task.id}
              className="rounded-lg border border-amber-400/30 bg-amber-400/5 p-3 text-sm"
            >
              <p className="flex items-center gap-2 font-medium text-tone-amber">
                <AlertTriangle className="h-4 w-4" aria-hidden /> {task.title}
              </p>
              <p className="mt-1 text-content-muted">{task.explanation}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button variant="ghost" onClick={() => onDismissTask(task.id)}>
                  Descartar alerta
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </GlassPanel>
  );
}

const EVOLUTION_STATUS_LABEL: Record<TaxEvolutionMetric['status'], string> = {
  stable: 'Estable',
  increase: 'Aumentó',
  decrease: 'Disminuyó',
  relevant_variation: 'Variación relevante',
  incomplete: 'Incompleto',
  not_comparable: 'No comparable',
};

const EVOLUTION_STATUS_TONE: Record<
  TaxEvolutionMetric['status'],
  'neutral' | 'cyan' | 'violet' | 'amber'
> = {
  stable: 'neutral',
  increase: 'cyan',
  decrease: 'violet',
  relevant_variation: 'amber',
  incomplete: 'neutral',
  not_comparable: 'neutral',
};

function EvolutionRow({ metric }: { metric: TaxEvolutionMetric }) {
  return (
    <tr className="border-t border-overlay/8">
      <td className="py-2 pr-3 text-content-strong">{metric.label}</td>
      <td className="py-2 pr-3 text-content-muted">{formatBoxValue(metric.priorValueCop)}</td>
      <td className="py-2 pr-3 text-content-muted">{formatBoxValue(metric.currentValueCop)}</td>
      <td className="py-2 pr-3 text-content-muted">
        {metric.absoluteDifferenceCop === null
          ? '—'
          : `${metric.absoluteDifferenceCop >= 0 ? '+' : ''}${formatCurrencyCOP(metric.absoluteDifferenceCop)}${
              metric.percentageDifference !== null
                ? ` (${metric.percentageDifference >= 0 ? '+' : ''}${metric.percentageDifference}%)`
                : ''
            }`}
      </td>
      <td className="py-2">
        <Badge tone={EVOLUTION_STATUS_TONE[metric.status]}>{EVOLUTION_STATUS_LABEL[metric.status]}</Badge>
      </td>
    </tr>
  );
}

function PriorYearDetailDrawer({
  priorReturn,
  advanced,
  onToggleAdvanced,
  onClose,
}: {
  priorReturn: PriorYearTaxReturn;
  advanced: boolean;
  onToggleAdvanced: () => void;
  onClose: () => void;
}) {
  const boxes = Object.values(priorReturn.boxes).sort((a, b) => a.boxNumber - b.boxNumber);
  const dependentsBox = priorReturn.boxes['138'];
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-surface-base/80" role="presentation">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Cerrar declaración"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-label={`Declaración AG ${priorReturn.taxYear}`}
        className="relative flex h-full w-full max-w-2xl flex-col overflow-y-auto border-l border-overlay/10 bg-surface-base p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-semibold text-content-strong">
            Declaración AG {priorReturn.taxYear}
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

        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <Info label="Formulario" value="210" />
          <Info label="Número" value={priorReturn.formNumber ?? '—'} />
          <Info
            label="Fecha"
            value={priorReturn.submittedAt ? new Date(priorReturn.submittedAt).toLocaleDateString('es-CO') : '—'}
          />
          <Info label="Estado" value={STATUS_LABEL[priorReturn.status]} />
          <Info label="Identidad" value={priorReturn.taxpayerIdentityMasked ?? '—'} />
          <Info
            label="Confianza de extracción"
            value={priorReturn.extractionConfidence}
          />
        </dl>

        {dependentsBox?.normalizedValueCop ? (
          <div className="mt-4 rounded-lg border border-accent-violet/20 bg-accent-violet/5 p-3 text-sm">
            <p className="text-content-strong">
              En AG {priorReturn.taxYear} registraste {dependentsBox.normalizedValueCop} dependiente(s)
              económico(s).
            </p>
            <p className="mt-1 text-xs text-content-subtle">
              Lo revisaremos en Beneficios y dependientes. Todavía no se crean dependientes ni se
              calcula la adición de 72 UVT para este año.
            </p>
          </div>
        ) : null}

        <div className="mt-5 flex items-center justify-between">
          <h4 className="font-medium text-content-strong">Casillas extraídas</h4>
          <Button variant="ghost" onClick={onToggleAdvanced}>
            {advanced ? 'Ocultar procedencia' : 'Ver procedencia'}
          </Button>
        </div>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-content-subtle">
                <th className="pb-2">Casilla</th>
                <th className="pb-2">Concepto</th>
                <th className="pb-2">Valor</th>
                <th className="pb-2">Confianza</th>
                <th className="pb-2">Uso este año</th>
              </tr>
            </thead>
            <tbody>
              {boxes.map((box) => (
                <tr key={box.boxNumber} className="border-t border-overlay/8 align-top">
                  <td className="py-2 pr-3 text-content-muted">{box.boxNumber}</td>
                  <td className="py-2 pr-3 text-content-strong">{priorYearBoxLabel(box.boxNumber)}</td>
                  <td className="py-2 pr-3 text-content-muted">{formatBoxValue(box.normalizedValueCop)}</td>
                  <td className="py-2 pr-3">
                    <Badge tone={box.confidence === 'high' ? 'emerald' : box.confidence === 'medium' ? 'amber' : 'rose'}>
                      {box.confidence}
                    </Badge>
                  </td>
                  <td className="py-2 pr-3 text-xs text-content-muted">
                    {box.role === 'carry_forward_candidate'
                      ? `Candidato para R${box.boxNumber === 133 ? 130 : 131}`
                      : box.role === 'comparison_only'
                        ? 'Comparación con año actual'
                        : 'Referencia histórica — no se arrastra'}
                    {advanced ? (
                      <p className="mt-1 text-content-subtle">
                        {box.extractionMethod} · pág. {box.page ?? '—'} ·{' '}
                        {box.evidence ?? 'Sin evidencia registrada'}
                      </p>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </aside>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-content-subtle">{label}</dt>
      <dd className="mt-0.5 text-content">{value}</dd>
    </div>
  );
}
