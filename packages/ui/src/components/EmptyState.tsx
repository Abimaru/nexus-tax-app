import { type ReactNode } from 'react';
import { cn } from '../cn';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

/** Estado vacío orientativo (§9): explica qué hacer, no solo que no hay datos. */
export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/12',
        'bg-white/[0.02] px-6 py-12 text-center',
        className,
      )}
    >
      {icon ? <div className="mb-3 text-accent-cyan/80">{icon}</div> : null}
      <h3 className="text-base font-medium text-slate-200">{title}</h3>
      {description ? <p className="mt-1 max-w-sm text-sm text-slate-400">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
