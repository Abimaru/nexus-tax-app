'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2, Eye, HelpCircle, ListChecks, Sparkles } from 'lucide-react';
import type {
  CaseProduct,
  DocumentExtractionSession,
  DocumentFactCandidate,
  EvidenceReviewSuggestion,
  ProcessingResult,
  UploadedDocument,
} from '@nexus-tax/domain';
import { Badge, Button, EmptyState, GlassPanel, formatCurrencyCOP } from '@nexus-tax/ui';
import { buildEvidenceReviewSuggestions, buildExpectedTaxEvidence } from '@/lib/evidenceReview';
import { EVIDENCE_SUGGESTION_STATUS_PRESENTATION } from '@/lib/presentationCatalogs';
import {
  confirmEvidenceMatch,
  confirmEvidenceMatchesBulk,
  createGuidedManualCapture,
  reviewDocumentCandidate,
} from '@/lib/repository';
import { DocumentExtractionReviewPanel } from './DocumentExtractionReviewPanel';

/**
 * Guided Review (Sprint 2.4, Fase E): presenta pocas decisiones humanas
 * en lugar de decenas de candidatos en bruto. NO reemplaza
 * `DocumentExtractionReviewPanel` (modo avanzado, siempre disponible
 * detrás de un interruptor): reutiliza sus mismos datos y las mismas
 * funciones de persistencia (`confirmEvidenceMatch`/`reviewDocumentCandidate`),
 * evitando así un segundo mecanismo de conciliación o doble conteo.
 */
export function EvidenceReviewPanel({
  caseId,
  result,
  documents,
  products,
  sessions,
  candidates,
  onOpenReconciliations,
}: {
  caseId: string;
  result?: ProcessingResult;
  documents: UploadedDocument[];
  products: CaseProduct[];
  sessions: DocumentExtractionSession[];
  candidates: DocumentFactCandidate[];
  onOpenReconciliations: () => void;
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const expectedEvidence = useMemo(
    () => buildExpectedTaxEvidence({ caseId, result }),
    [caseId, result],
  );
  const suggestions = useMemo(
    () => buildEvidenceReviewSuggestions({ caseId, candidates, expectedEvidence }),
    [caseId, candidates, expectedEvidence],
  );

  const matched = suggestions.filter((item) => item.status === 'matched');
  const likelyMatch = suggestions.filter((item) => item.status === 'likely_match');
  const needsReview = suggestions.filter((item) => item.status === 'needs_review');
  const unresolved = suggestions.filter((item) => item.status === 'unresolved');
  const newRelevant = suggestions.filter((item) => item.status === 'new_relevant_value');
  const safeToBulkConfirm = suggestions.filter((item) => item.safeForBulkConfirm);

  const [bulkConfirming, setBulkConfirming] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);

  async function confirmAllSafe() {
    setBulkConfirming(true);
    setBulkError(null);
    try {
      await confirmEvidenceMatchesBulk(
        safeToBulkConfirm.flatMap((item) =>
          item.candidateId && item.matchStatus
            ? [
                {
                  candidateId: item.candidateId,
                  input: {
                    exogenousRecordId:
                      expectedEvidence.find((evidence) => evidence.id === item.expectedEvidenceId)
                        ?.sourceId ?? '',
                    matchStatus: item.matchStatus,
                    exogenousValue: item.expectedValueCop ?? 0,
                    documentaryValue: item.documentValueCop ?? 0,
                  },
                },
              ]
            : [],
        ),
      );
    } catch (caught) {
      setBulkError(
        caught instanceof Error ? caught.message : 'No fue posible confirmar en bloque.',
      );
    } finally {
      setBulkConfirming(false);
    }
  }

  if (!sessions.length) {
    return (
      <EmptyState
        icon={<Sparkles className="h-8 w-8" />}
        title="Sin extracciones documentales"
        description="Carga un PDF desde Documentos y analízalo localmente. Los valores relevantes aparecerán aquí antes de incorporarlos al expediente."
      />
    );
  }

  return (
    <div className="space-y-5">
      <GlassPanel className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent-violet/10 text-tone-violet">
              <Sparkles className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-content-strong">Revisión guiada</h2>
              <p className="mt-0.5 text-sm text-content-muted">
                Encontramos {suggestions.length} valor{suggestions.length === 1 ? '' : 'es'}{' '}
                relevante{suggestions.length === 1 ? '' : 's'}. {matched.length} coincide
                {matched.length === 1 ? '' : 'n'} con la exógena.
              </p>
            </div>
          </div>
          <Button variant="ghost" onClick={() => setShowAdvanced((current) => !current)}>
            <Eye className="h-4 w-4" aria-hidden />
            {showAdvanced ? 'Ocultar modo avanzado' : 'Ver otros datos detectados'}
          </Button>
        </div>
        {safeToBulkConfirm.length > 1 ? (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-tone-emerald/20 bg-tone-emerald/5 p-3">
            <span className="inline-flex items-center gap-2 text-sm text-content">
              <CheckCircle2 className="h-4 w-4 text-tone-emerald" aria-hidden />
              {safeToBulkConfirm.length} coincidencias claras sin anomalías.
            </span>
            <Button variant="secondary" disabled={bulkConfirming} onClick={confirmAllSafe}>
              {bulkConfirming ? 'Confirmando…' : 'Confirmar todas las claras'}
            </Button>
            {bulkError ? <p className="text-xs text-tone-rose">{bulkError}</p> : null}
          </div>
        ) : null}
      </GlassPanel>

      {!suggestions.length ? (
        <EmptyState
          icon={<ListChecks className="h-8 w-8" />}
          title="Nada pendiente por revisar"
          description="No hay valores documentales ni datos esperados sin resolver en este momento."
        />
      ) : (
        <div className="space-y-4">
          <SuggestionGroup
            title="Coinciden con la exógena"
            items={matched}
            expectedEvidence={expectedEvidence}
            tone="emerald"
          />
          <SuggestionGroup
            title="Probables coincidencias"
            items={likelyMatch}
            expectedEvidence={expectedEvidence}
            tone="cyan"
          />
          <SuggestionGroup
            title="Necesitan tu decisión"
            items={needsReview}
            expectedEvidence={expectedEvidence}
            tone="amber"
          />
          <SuggestionGroup
            title="Datos que faltan"
            items={unresolved}
            expectedEvidence={expectedEvidence}
            tone="amber"
          />
          <SuggestionGroup
            title="Posibles valores nuevos"
            items={newRelevant}
            expectedEvidence={expectedEvidence}
            tone="violet"
          />
        </div>
      )}

      {showAdvanced ? (
        <div className="space-y-3">
          <p className="rounded-xl border border-accent-cyan/20 bg-accent-cyan/5 p-3 text-xs text-content-muted">
            Modo avanzado: todos los candidatos detectados, incluida la evidencia ya cubierta por
            la revisión guiada de arriba.
          </p>
          <DocumentExtractionReviewPanel
            result={result}
            documents={documents}
            products={products}
            sessions={sessions}
            candidates={candidates}
            onOpenReconciliations={onOpenReconciliations}
          />
        </div>
      ) : null}
    </div>
  );
}

function SuggestionGroup({
  title,
  items,
  expectedEvidence,
  tone,
}: {
  title: string;
  items: EvidenceReviewSuggestion[];
  expectedEvidence: ReturnType<typeof buildExpectedTaxEvidence>;
  tone: 'emerald' | 'cyan' | 'amber' | 'violet';
}) {
  if (!items.length) return null;
  return (
    <GlassPanel className="p-4">
      <div className="mb-3 flex items-center gap-2">
        <Badge tone={tone}>{items.length}</Badge>
        <h3 className="text-sm font-semibold text-content-strong">{title}</h3>
      </div>
      <ul className="space-y-3">
        {items.map((item) => (
          <SuggestionCard key={item.id} suggestion={item} expectedEvidence={expectedEvidence} />
        ))}
      </ul>
    </GlassPanel>
  );
}

function SuggestionCard({
  suggestion,
  expectedEvidence,
}: {
  suggestion: EvidenceReviewSuggestion;
  expectedEvidence: ReturnType<typeof buildExpectedTaxEvidence>;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [captureValue, setCaptureValue] = useState('');
  const [showCaptureForm, setShowCaptureForm] = useState(false);
  const presentation = EVIDENCE_SUGGESTION_STATUS_PRESENTATION[suggestion.status];
  const expectation = expectedEvidence.find((item) => item.id === suggestion.expectedEvidenceId);

  async function confirm() {
    if (!suggestion.candidateId || !suggestion.expectedEvidenceId || !suggestion.matchStatus)
      return;
    setSaving(true);
    setError(null);
    try {
      await confirmEvidenceMatch(suggestion.candidateId, {
        exogenousRecordId: expectation?.sourceId ?? '',
        matchStatus: suggestion.matchStatus,
        exogenousValue: suggestion.expectedValueCop ?? 0,
        documentaryValue: suggestion.documentValueCop ?? 0,
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No fue posible confirmar.');
    } finally {
      setSaving(false);
    }
  }

  async function markNewValue() {
    if (!suggestion.candidateId) return;
    setSaving(true);
    setError(null);
    try {
      await reviewDocumentCandidate(suggestion.candidateId, {
        action: 'confirm',
        observation: 'Marcado como posible valor nuevo desde la revisión guiada.',
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No fue posible registrar el valor.');
    } finally {
      setSaving(false);
    }
  }

  async function captureManually() {
    if (!expectation) return;
    const parsed = Number(captureValue.replace(/\./g, '').replace(',', '.'));
    if (!Number.isFinite(parsed)) {
      setError('Escribe un valor numérico válido.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createGuidedManualCapture(expectation.caseId, {
        expectedEvidenceId: expectation.id,
        entityId: expectation.entityId,
        productId: null,
        originalConcept: expectation.conceptLabel,
        category: expectation.category,
        nature: expectation.nature,
        treatment: expectation.treatment,
        value: parsed,
        period: expectation.period ?? '',
        evidence: 'Captura guiada: sin documento con el valor completo.',
      });
      setShowCaptureForm(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No fue posible registrar el valor.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <li className="rounded-xl border border-overlay/8 bg-overlay/[0.02] p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-content-strong">
            {expectation?.conceptLabel ?? 'Valor documental sin relación con la exógena'}
          </p>
          <p className="mt-0.5 text-xs text-content-muted">{presentation.description}</p>
        </div>
        <Badge
          tone={
            suggestion.status === 'matched'
              ? 'emerald'
              : suggestion.status === 'likely_match'
                ? 'cyan'
                : 'amber'
          }
        >
          {presentation.label}
        </Badge>
      </div>

      <dl className="mt-3 grid gap-3 sm:grid-cols-3">
        {suggestion.expectedValueCop !== null ? (
          <div>
            <dt className="text-xs text-content-subtle">Reportado en la exógena</dt>
            <dd className="mt-1 text-sm text-content">
              {formatCurrencyCOP(suggestion.expectedValueCop)}
            </dd>
          </div>
        ) : null}
        {suggestion.documentValueCop !== null ? (
          <div>
            <dt className="text-xs text-content-subtle">Valor documental</dt>
            <dd className="mt-1 text-sm text-content">
              {formatCurrencyCOP(suggestion.documentValueCop)}
            </dd>
          </div>
        ) : null}
        {suggestion.differenceCop !== null && suggestion.differenceCop > 0 ? (
          <div>
            <dt className="text-xs text-content-subtle">Diferencia</dt>
            <dd className="mt-1 text-sm text-content">
              {formatCurrencyCOP(suggestion.differenceCop)}
            </dd>
          </div>
        ) : null}
      </dl>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {suggestion.allowedActions.includes('confirm') && suggestion.candidateId ? (
          <Button variant="secondary" disabled={saving} onClick={confirm}>
            {saving ? 'Confirmando…' : 'Confirmar'}
          </Button>
        ) : null}
        {suggestion.allowedActions.includes('mark_new_value') && suggestion.candidateId ? (
          <Button variant="ghost" disabled={saving} onClick={markNewValue}>
            Registrar como nuevo
          </Button>
        ) : null}
        {suggestion.allowedActions.includes('capture_manually') && expectation ? (
          <Button
            variant="ghost"
            disabled={saving}
            onClick={() => setShowCaptureForm((current) => !current)}
          >
            <HelpCircle className="h-4 w-4" aria-hidden /> Capturar manualmente
          </Button>
        ) : null}
      </div>

      {showCaptureForm && expectation ? (
        <div className="mt-3 flex flex-wrap items-end gap-2 rounded-lg border border-overlay/10 bg-overlay/5 p-3">
          <label className="block text-xs text-content-muted">
            Valor observado en el documento
            <input
              inputMode="decimal"
              value={captureValue}
              onChange={(event) => setCaptureValue(event.target.value)}
              className="mt-1 min-h-10 w-40 rounded-lg border border-overlay/12 bg-overlay/5 px-3 py-2 text-sm text-content-strong"
            />
          </label>
          <Button disabled={saving} onClick={captureManually}>
            {saving ? 'Guardando…' : 'Guardar'}
          </Button>
        </div>
      ) : null}

      {error ? <p className="mt-2 text-xs text-tone-rose">{error}</p> : null}
    </li>
  );
}
