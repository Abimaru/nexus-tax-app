'use client';

import { useState } from 'react';
import { XCircle } from 'lucide-react';
import { PROCESSING_LIMITS, SUPPORTED_FILE_EXTENSIONS } from '@nexus-tax/config';
import { Button, GlassPanel, PrivacyNotice, ProgressBar, Spinner } from '@nexus-tax/ui';
import { useWorkbenchStore } from '@/lib/workbenchStore';
import { FileDropzone } from '@/components/FileDropzone';

/** Pantalla "Cargar información exógena" (§10). Drag & drop + progreso real. */
export function UploadPanel() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const phase = useWorkbenchStore((s) => s.phase);
  const error = useWorkbenchStore((s) => s.error);
  const progress = useWorkbenchStore((s) => s.progress);
  const startInspection = useWorkbenchStore((s) => s.startInspection);
  const cancel = useWorkbenchStore((s) => s.cancel);
  const reset = useWorkbenchStore((s) => s.reset);

  const accept = SUPPORTED_FILE_EXTENSIONS.join(',');
  const maxMb = Math.round(PROCESSING_LIMITS.maxFileSizeBytes / (1024 * 1024));

  function handleFile(file: File) {
    setSelectedFile(file);
    void startInspection(file);
  }

  const isBusy = phase === 'inspecting' || phase === 'processing';

  return (
    <div className="flex flex-col gap-4">
      <GlassPanel className="p-6">
        <FileDropzone
          id="exogenous-file-input"
          variant="exogenous"
          file={selectedFile}
          onSelect={handleFile}
          onRemove={() => {
            setSelectedFile(null);
            reset();
          }}
          accept={accept}
          allowedExtensions={SUPPORTED_FILE_EXTENSIONS.map((extension) => extension.slice(1))}
          maxSizeBytes={PROCESSING_LIMITS.maxFileSizeBytes}
          busy={isBusy}
          error={phase === 'error' ? error : null}
        />

        <div className="mt-4 flex items-center justify-between gap-3">
          <PrivacyNotice />
          <span className="text-xs text-content-subtle">Límite: {maxMb} MB</span>
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
