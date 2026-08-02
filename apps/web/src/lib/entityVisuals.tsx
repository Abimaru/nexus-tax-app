import {
  Briefcase,
  Building2,
  FileText,
  HelpCircle,
  Home,
  Landmark,
  PiggyBank,
  ReceiptText,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';
import type { EntityCategory } from '@nexus-tax/domain';

/**
 * Presentación compartida por categoría de entidad: icono, tono y etiqueta.
 * Centraliza la iconografía para que las vistas de documentos se sientan
 * coherentes y "menos parcas".
 */
export interface EntityVisual {
  icon: LucideIcon;
  tone: 'cyan' | 'violet' | 'emerald' | 'amber' | 'rose' | 'neutral';
  label: string;
}

export const ENTITY_VISUALS: Record<EntityCategory, EntityVisual> = {
  employer: { icon: Briefcase, tone: 'cyan', label: 'Empleador' },
  bank: { icon: Landmark, tone: 'violet', label: 'Entidad financiera' },
  pension: { icon: PiggyBank, tone: 'emerald', label: 'Pensiones / Cesantías' },
  housing: { icon: Home, tone: 'amber', label: 'Vivienda' },
  other: { icon: Building2, tone: 'neutral', label: 'Otra entidad' },
  unknown: { icon: HelpCircle, tone: 'neutral', label: 'Sin clasificar' },
};

export function entityVisual(category: EntityCategory): EntityVisual {
  return ENTITY_VISUALS[category] ?? ENTITY_VISUALS.unknown;
}

/**
 * Clases estáticas del recuadro de icono por tono. Estáticas a propósito:
 * Tailwind no puede detectar nombres de clase construidos dinámicamente.
 */
export const TONE_BOX_CLASS: Record<EntityVisual['tone'], string> = {
  cyan: 'bg-accent-cyan/10 text-tone-cyan',
  violet: 'bg-accent-violet/10 text-tone-violet',
  emerald: 'bg-emerald-500/10 text-tone-emerald',
  amber: 'bg-amber-400/10 text-tone-amber',
  rose: 'bg-rose-500/10 text-tone-rose',
  neutral: 'bg-overlay/10 text-content',
};

/** Icono por tipo de documento, inferido del nombre (heurística de presentación). */
export function documentIcon(documentName: string): LucideIcon {
  const name = documentName.toLowerCase();
  if (name.includes('certificado tributario') || name.includes('rendimient')) return ReceiptText;
  if (name.includes('saldo') || name.includes('deuda')) return Landmark;
  if (name.includes('cesant') || name.includes('pension') || name.includes('aporte')) {
    return PiggyBank;
  }
  if (name.includes('vivienda') || name.includes('predial')) return Home;
  if (name.includes('220') || name.includes('laboral') || name.includes('ingresos')) {
    return Briefcase;
  }
  if (name.includes('seguridad social') || name.includes('salud')) return ShieldCheck;
  return FileText;
}
