'use client';

import { type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '../cn';
import { AnimatedCounter } from './AnimatedCounter';

export interface StatCardProps {
  label: string;
  value: number;
  format?: (value: number) => string;
  icon?: ReactNode;
  hint?: string;
  accent?: 'cyan' | 'blue' | 'violet' | 'emerald' | 'amber';
  delay?: number;
}

const ACCENT_RING: Record<NonNullable<StatCardProps['accent']>, string> = {
  cyan: 'text-accent-cyan',
  blue: 'text-accent-blue',
  violet: 'text-accent-violet',
  emerald: 'text-emerald-300',
  amber: 'text-amber-300',
};

/** Tarjeta de métrica con contador animado y entrada sutil. */
export function StatCard({
  label,
  value,
  format,
  icon,
  hint,
  accent = 'cyan',
  delay = 0,
}: StatCardProps) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={cn(
        'rounded-2xl border border-white/10 bg-surface-glass p-5 backdrop-blur-md',
        'shadow-[0_8px_40px_-16px_rgba(8,12,24,0.7)]',
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">{label}</p>
        {icon ? <span className={cn('opacity-80', ACCENT_RING[accent])}>{icon}</span> : null}
      </div>
      <AnimatedCounter
        value={value}
        format={format}
        className="mt-2 block text-3xl font-semibold tracking-tight text-slate-50"
      />
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </motion.div>
  );
}
