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
        'flex flex-col items-center justify-center rounded-2xl border border-dashed border-overlay/12',
        'bg-overlay/[0.02] px-6 py-12 text-center',
        className,
      )}
    >
      {icon ? <div className="mb-3 text-tone-cyan/80">{icon}</div> : null}
      <h3 className="text-base font-medium text-content">{title}</h3>
      {description ? <p className="mt-1 max-w-sm text-sm text-content-muted">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
