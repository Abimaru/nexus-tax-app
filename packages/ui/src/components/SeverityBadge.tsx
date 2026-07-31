import { AlertTriangle, Info, XCircle } from 'lucide-react';
import { Badge } from './primitives';

type Severity = 'info' | 'warning' | 'error';

const CONFIG: Record<
  Severity,
  { tone: 'cyan' | 'amber' | 'rose'; label: string; icon: typeof Info }
> = {
  info: { tone: 'cyan', label: 'Info', icon: Info },
  warning: { tone: 'amber', label: 'Advertencia', icon: AlertTriangle },
  error: { tone: 'rose', label: 'Error', icon: XCircle },
};

/**
 * Insignia de severidad. El estado NO depende solo del color (§14): incluye
 * icono y texto para accesibilidad.
 */
export function SeverityBadge({ severity }: { severity: Severity }) {
  const { tone, label, icon: Icon } = CONFIG[severity];
  return (
    <Badge tone={tone}>
      <Icon className="h-3.5 w-3.5" aria-hidden />
      <span>{label}</span>
    </Badge>
  );
}
