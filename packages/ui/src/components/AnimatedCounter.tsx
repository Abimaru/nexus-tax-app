'use client';

import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

export interface AnimatedCounterProps {
  value: number;
  durationMs?: number;
  /** Formateador del valor mostrado (ej. moneda). */
  format?: (value: number) => string;
  className?: string;
}

/**
 * Contador animado que respeta `prefers-reduced-motion` (§9, §14):
 * si el usuario reduce el movimiento, muestra el valor final sin animar.
 */
export function AnimatedCounter({
  value,
  durationMs = 900,
  format = (v) => String(Math.round(v)),
  className,
}: AnimatedCounterProps) {
  const reduceMotion = useReducedMotion();
  const [display, setDisplay] = useState(reduceMotion ? value : 0);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (reduceMotion) {
      setDisplay(value);
      return;
    }
    const start = performance.now();
    const from = 0;
    const animate = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(from + (value - from) * eased);
      if (progress < 1) frameRef.current = requestAnimationFrame(animate);
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [value, durationMs, reduceMotion]);

  return (
    <span className={className} aria-label={format(value)}>
      {format(display)}
    </span>
  );
}
