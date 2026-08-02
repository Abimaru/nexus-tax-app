'use client';

import { useRef, useState } from 'react';
import { File, FileSpreadsheet, Loader2, UploadCloud, X } from 'lucide-react';
import { formatBytes } from '@nexus-tax/ui';

type DropzoneVariant = 'exogenous' | 'document' | 'evidence' | 'optional';

const VARIANT_COPY: Record<DropzoneVariant, { title: string; privacy: string }> = {
  exogenous: {
    title: 'Arrastra tu Excel de información exógena aquí',
    privacy: 'Se procesa localmente y el archivo original no se conserva.',
  },
  document: {
    title: 'Arrastra un soporte o selecciónalo',
    privacy: 'Se procesa localmente; tú decides si se conserva el archivo.',
  },
  evidence: {
    title: 'Adjunta evidencia de la gestión',
    privacy: 'La evidencia permanece en este navegador.',
  },
  optional: {
    title: 'Selecciona un archivo opcional',
    privacy: 'Puedes continuar sin adjuntar un archivo.',
  },
};

export function FileDropzone({
  id,
  variant,
  file,
  onSelect,
  onRemove,
  accept,
  allowedExtensions,
  maxSizeBytes,
  disabled = false,
  busy = false,
  error,
  compact = false,
}: {
  id: string;
  variant: DropzoneVariant;
  file: File | null;
  onSelect: (file: File) => void;
  onRemove?: () => void;
  accept?: string;
  allowedExtensions?: readonly string[];
  maxSizeBytes?: number;
  disabled?: boolean;
  busy?: boolean;
  error?: string | null;
  compact?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const copy = VARIANT_COPY[variant];

  function choose(selected?: File) {
    if (!selected || disabled || busy) return;
    const extension = selected.name.split('.').pop()?.toLowerCase() ?? '';
    if (allowedExtensions?.length && !allowedExtensions.includes(extension)) {
      setLocalError(`Formato no permitido. Usa ${allowedExtensions.join(', ')}.`);
      return;
    }
    if (maxSizeBytes && selected.size > maxSizeBytes) {
      setLocalError(`El archivo supera el límite de ${formatBytes(maxSizeBytes)}.`);
      return;
    }
    setLocalError(null);
    onSelect(selected);
  }

  const message = error ?? localError;
  const SpreadsheetIcon = variant === 'exogenous' ? FileSpreadsheet : File;

  return (
    <div>
      <div
        role="button"
        tabIndex={disabled || busy ? -1 : 0}
        aria-disabled={disabled || busy}
        aria-describedby={`${id}-help${message ? ` ${id}-error` : ''}`}
        onClick={() => !disabled && !busy && inputRef.current?.click()}
        onKeyDown={(event) => {
          if (!disabled && !busy && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled && !busy) setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragActive(false);
          choose(event.dataTransfer.files?.[0]);
        }}
        className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed text-center transition-colors motion-reduce:transition-none ${compact ? 'px-4 py-4' : 'px-6 py-8'} ${
          disabled || busy
            ? 'cursor-not-allowed border-overlay/8 bg-overlay/[0.02] opacity-60'
            : dragActive
              ? 'cursor-pointer border-accent-cyan bg-accent-cyan/5'
              : 'cursor-pointer border-overlay/15 hover:border-accent-cyan/40 hover:bg-overlay/[0.02]'
        }`}
      >
        {busy ? (
          <>
            <Loader2
              className="h-7 w-7 animate-spin text-tone-cyan motion-reduce:animate-none"
              aria-hidden
            />
            <p className="mt-2 text-sm font-medium text-content">Procesando localmente…</p>
          </>
        ) : file ? (
          <div className="flex max-w-full items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-accent-cyan/10 text-tone-cyan">
              <SpreadsheetIcon className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0 text-left">
              <p className="truncate text-sm font-medium text-content-strong">{file.name}</p>
              <p className="text-xs text-content-subtle">{formatBytes(file.size)}</p>
            </div>
            {onRemove ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  if (inputRef.current) inputRef.current.value = '';
                  onRemove();
                }}
                className="rounded-lg p-1.5 text-content-subtle hover:bg-overlay/10 hover:text-tone-rose"
                aria-label="Quitar archivo seleccionado"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            ) : null}
          </div>
        ) : (
          <>
            <UploadCloud
              className={`${compact ? 'h-6 w-6' : 'h-8 w-8'} text-tone-cyan`}
              aria-hidden
            />
            <p className="mt-2 text-sm font-medium text-content">{copy.title}</p>
            <p id={`${id}-help`} className="mt-0.5 text-xs text-content-subtle">
              {copy.privacy}
              {allowedExtensions?.length ? ` Formatos: ${allowedExtensions.join(', ')}.` : ''}
            </p>
          </>
        )}
        <input
          id={id}
          ref={inputRef}
          type="file"
          accept={accept}
          disabled={disabled || busy}
          className="sr-only"
          onChange={(event) => choose(event.target.files?.[0])}
        />
      </div>
      {message ? (
        <p id={`${id}-error`} role="alert" className="mt-2 text-xs text-tone-rose">
          {message}
        </p>
      ) : null}
    </div>
  );
}
