'use client';

import { forwardRef, type ButtonHTMLAttributes, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '../cn';

/* -------------------------------------------------------------------------- */
/*  GlassPanel — superficie con glassmorphism moderado (§9)                    */
/* -------------------------------------------------------------------------- */
export interface GlassPanelProps extends HTMLAttributes<HTMLDivElement> {
  as?: 'div' | 'section' | 'article';
}

export const GlassPanel = forwardRef<HTMLDivElement, GlassPanelProps>(function GlassPanel(
  { className, children, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        'rounded-2xl border border-overlay/10 bg-surface-glass backdrop-blur-md',
        'shadow-[0_8px_40px_-12px_rgba(8,12,24,0.7)]',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
});

/* -------------------------------------------------------------------------- */
/*  Button                                                                     */
/* -------------------------------------------------------------------------- */
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  leadingIcon?: ReactNode;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-gradient-to-r from-accent-cyan to-accent-blue text-slate-950 font-semibold hover:brightness-110 shadow-lg shadow-accent-blue/20',
  secondary: 'border border-overlay/15 bg-overlay/5 text-content-strong hover:bg-overlay/10',
  ghost: 'text-content hover:bg-overlay/5',
  danger: 'border border-rose-500/40 bg-rose-500/10 text-tone-rose hover:bg-rose-500/20',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', leadingIcon, children, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm',
        'transition-[filter,background-color,transform] duration-200 motion-safe:active:scale-[0.98]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-surface-base',
        'disabled:cursor-not-allowed disabled:opacity-50',
        VARIANT_CLASSES[variant],
        className,
      )}
      {...props}
    >
      {leadingIcon}
      {children}
    </button>
  );
});

/* -------------------------------------------------------------------------- */
/*  Badge                                                                      */
/* -------------------------------------------------------------------------- */
type BadgeTone = 'neutral' | 'cyan' | 'violet' | 'amber' | 'rose' | 'emerald';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: 'bg-overlay/5 text-content border-overlay/10',
  cyan: 'bg-accent-cyan/10 text-tone-cyan border-accent-cyan/30',
  violet: 'bg-accent-violet/10 text-tone-violet border-accent-violet/30',
  amber: 'bg-amber-400/10 text-tone-amber border-amber-400/30',
  rose: 'bg-rose-500/10 text-tone-rose border-rose-500/30',
  emerald: 'bg-emerald-500/10 text-tone-emerald border-emerald-500/30',
};

export function Badge({ className, tone = 'neutral', children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        TONE_CLASSES[tone],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*  Skeleton                                                                   */
/* -------------------------------------------------------------------------- */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn('motion-safe:animate-pulse rounded-md bg-overlay/10', className)}
      {...props}
    />
  );
}

/* -------------------------------------------------------------------------- */
/*  Spinner                                                                    */
/* -------------------------------------------------------------------------- */
export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Cargando"
      className={cn(
        'inline-block h-4 w-4 animate-spin rounded-full border-2 border-overlay/20 border-t-accent-cyan',
        className,
      )}
    />
  );
}

/* -------------------------------------------------------------------------- */
/*  ProgressBar — progreso real por fases (§ carga)                           */
/* -------------------------------------------------------------------------- */
export interface ProgressBarProps {
  /** 0..1 */
  ratio: number;
  label?: string;
  className?: string;
}

export function ProgressBar({ ratio, label, className }: ProgressBarProps) {
  const pct = Math.round(Math.max(0, Math.min(1, ratio)) * 100);
  return (
    <div className={cn('w-full', className)}>
      {label ? (
        <div className="mb-1 flex justify-between text-xs text-content-muted">
          <span>{label}</span>
          <span aria-hidden>{pct}%</span>
        </div>
      ) : null}
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-overlay/10"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? 'Progreso'}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-accent-cyan via-accent-blue to-accent-violet transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
