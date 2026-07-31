import { APP_IDENTITY } from '@nexus-tax/config';
import { cn } from '../cn';

export interface BrandMarkProps {
  showSubtitle?: boolean;
  className?: string;
}

/** Identidad visual de NexusTax: isotipo + wordmark. */
export function BrandMark({ showSubtitle = true, className }: BrandMarkProps) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <span
        aria-hidden
        className="relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-accent-cyan via-accent-blue to-accent-violet"
      >
        <span className="h-3.5 w-3.5 rounded-sm bg-surface-base" />
      </span>
      <span className="leading-tight">
        <span className="block text-lg font-semibold tracking-tight text-slate-50">
          {APP_IDENTITY.name}
        </span>
        {showSubtitle ? (
          <span className="block text-xs text-slate-400">{APP_IDENTITY.subtitle}</span>
        ) : null}
      </span>
    </div>
  );
}
