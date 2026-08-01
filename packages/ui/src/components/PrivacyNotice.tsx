import { ShieldCheck } from 'lucide-react';
import { cn } from '../cn';

/** Aviso visible de procesamiento local (§12). */
export function PrivacyNotice({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1.5 text-xs text-tone-emerald',
        className,
      )}
    >
      <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
      <span>
        {compact
          ? 'Procesamiento 100% local'
          : 'Tus archivos se procesan solo en este navegador. Nada se sube a ningún servidor.'}
      </span>
    </div>
  );
}
