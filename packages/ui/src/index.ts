/**
 * @nexus-tax/ui
 * -------------
 * Primitivas visuales reutilizables. NO contienen reglas de parsing ni de
 * normalización (§5): solo presentación. El estado y la lógica viven fuera.
 */
export { cn } from './cn';
export { formatCurrencyCOP, formatCurrencyCompact, formatNumber, formatBytes } from './format';

export {
  GlassPanel,
  Button,
  Badge,
  Skeleton,
  Spinner,
  ProgressBar,
  type GlassPanelProps,
  type ButtonProps,
  type BadgeProps,
  type ProgressBarProps,
} from './components/primitives';
export { AnimatedCounter, type AnimatedCounterProps } from './components/AnimatedCounter';
export { StatCard, type StatCardProps } from './components/StatCard';
export { SeverityBadge } from './components/SeverityBadge';
export { EmptyState, type EmptyStateProps } from './components/EmptyState';
export { BrandMark, type BrandMarkProps } from './components/BrandMark';
export { PrivacyNotice } from './components/PrivacyNotice';
