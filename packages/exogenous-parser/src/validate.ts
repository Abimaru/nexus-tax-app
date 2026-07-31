import { PROCESSING_LIMITS, SUPPORTED_FILE_EXTENSIONS } from '@nexus-tax/config';

/**
 * Validación del archivo ANTES de procesarlo.
 * Comprueba extensión y tamaño. No abre el contenido: es un filtro barato para
 * rechazar temprano archivos no admitidos o demasiado grandes.
 */

export interface FileDescriptor {
  name: string;
  size: number;
  type?: string;
}

export interface FileValidation {
  ok: boolean;
  errors: string[];
}

function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.slice(dot).toLowerCase() : '';
}

export function validateFile(file: FileDescriptor): FileValidation {
  const errors: string[] = [];

  const ext = extensionOf(file.name);
  if (!SUPPORTED_FILE_EXTENSIONS.includes(ext as (typeof SUPPORTED_FILE_EXTENSIONS)[number])) {
    errors.push(
      `Formato no admitido (${ext || 'sin extensión'}). Usa ${SUPPORTED_FILE_EXTENSIONS.join(' o ')}.`,
    );
  }

  if (file.size <= 0) {
    errors.push('El archivo está vacío.');
  } else if (file.size > PROCESSING_LIMITS.maxFileSizeBytes) {
    const maxMb = Math.round(PROCESSING_LIMITS.maxFileSizeBytes / (1024 * 1024));
    errors.push(`El archivo supera el límite de ${maxMb} MB.`);
  }

  return { ok: errors.length === 0, errors };
}
