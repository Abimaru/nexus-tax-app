'use client';

import { useRef, useState } from 'react';
import { FileSpreadsheet, UploadCloud, XCircle } from 'lucide-react';
import { PROCESSING_LIMITS, SUPPORTED_FILE_EXTENSIONS } from '@nexus-tax/config';
import {
  Button,
  GlassPanel,
  PrivacyNotice,
  ProgressBar,
  Spinner,
  formatBytes,
} from '@nexus-tax/ui';
import { useWorkbenchStore } from '@/lib/workbenchStore';

/** Pantalla "Cargar información exógena" (§10). Drag & drop + progreso real. */
export function UploadPanel() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const phase = useWorkbenchStore((s) => s.phase);
  const fileName = useWorkbenchStore((s) => s.fileName);
  const fileSize = useWorkbenchStore((s) => s.fileSize);
  const error = useWorkbenchStore((s) => s.error);
  const progress = useWorkbenchStore((s) => s.progress);
  const startInspection = useWorkbenchStore((s) => s.startInspection);
  const cancel = useWorkbenchStore((s) => s.cancel);
  const reset = useWorkbenchStore((s) => s.reset);

  const accept = SUPPORTED_FILE_EXTENSIONS.join(',');
  const maxMb = Math.round(PROCESSING_LIMITS.maxFileSizeBytes / (1024 * 1024));

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (file) void startInspection(file);
  }

  const isBusy = phase === 'inspecting' || phase === 'processing';

  return (
    <div className="flex flex-col gap-4">
      <GlassPanel className="p-6">
        <div
          role="button"
          tabIndex={0}
          aria-label="Zona para arrastrar o seleccionar un archivo Excel"
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            handleFiles(e.dataTransfer.files);
          }}
          className={[
            'flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors',
            dragActive
              ? 'border-accent-cyan bg-accent-cyan/5'
              : 'border-overlay/15 hover:border-accent-cyan/40 hover:bg-overlay/[0.02]',
          ].join(' ')}
        >
          <UploadCloud className="h-10 w-10 text-tone-cyan" aria-hidden />
          <p className="mt-3 text-base font-medium text-content-strong">
            Arrastra tu Excel de información exógena aquí
          </p>
          <p className="mt-1 text-sm text-content-muted">
            o haz clic para seleccionarlo · Formatos {SUPPORTED_FILE_EXTENSIONS.join(' y ')} · hasta{' '}
            {maxMb} MB
          </p>
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            className="sr-only"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>

        <div className="mt-4 flex items-center justify-between">
          <PrivacyNotice />
          {fileName && !isBusy ? (
            <span className="inline-flex items-center gap-2 text-sm text-content">
              <FileSpreadsheet className="h-4 w-4 text-tone-cyan" aria-hidden />
              {fileName} · {formatBytes(fileSize)}
            </span>
          ) : null}
        </div>
      </GlassPanel>

      {phase === 'inspecting' && (
        <GlassPanel className="flex items-center gap-3 p-4 text-sm text-content">
          <Spinner />
          Leyendo el archivo localmente…
        </GlassPanel>
      )}

      {phase === 'processing' && (
        <GlassPanel className="p-5">
          <ProgressBar ratio={progress?.ratio ?? 0} label={progress?.message ?? 'Procesando'} />
          <div className="mt-3 flex justify-end">
            <Button
              variant="ghost"
              onClick={cancel}
              leadingIcon={<XCircle className="h-4 w-4" aria-hidden />}
            >
              Cancelar
            </Button>
          </div>
        </GlassPanel>
      )}

      {phase === 'error' && error && (
        <GlassPanel className="p-5">
          <div className="flex items-start gap-3">
            <XCircle className="mt-0.5 h-5 w-5 text-tone-rose" aria-hidden />
            <div>
              <p className="text-sm font-medium text-tone-rose">No se pudo cargar el archivo</p>
              <p className="mt-1 text-sm text-content-muted">{error}</p>
              <Button variant="secondary" className="mt-3" onClick={reset}>
                Intentar con otro archivo
              </Button>
            </div>
          </div>
        </GlassPanel>
      )}
    </div>
  );
}
