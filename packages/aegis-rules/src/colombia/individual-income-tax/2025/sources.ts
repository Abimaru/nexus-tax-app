import type { FilingRuleSource } from '../../../types';

export const VERIFIED_AT = '2026-07-31';

export const FILING_RULE_SOURCES_2025 = [
  {
    id: 'dian-renta-personas-naturales-ag-2025',
    authority: 'DIAN',
    title: 'Declaración de Renta Personas Naturales — año gravable 2025',
    url: 'https://micrositios.dian.gov.co/renta-personas-naturales-ag-2025/',
    verifiedAt: VERIFIED_AT,
  },
  {
    id: 'dian-resolucion-000193-2024',
    authority: 'DIAN',
    title: 'Resolución DIAN 000193 de 2024 — UVT aplicable en 2025',
    url: 'https://normograma.dian.gov.co/dian/compilacion/docs/resolucion_dian_0193_2024.htm',
    verifiedAt: VERIFIED_AT,
  },
  {
    id: 'dian-calendario-tributario-2026',
    authority: 'DIAN',
    title: 'Calendario tributario DIAN 2026',
    url: 'https://www.dian.gov.co/Calendarios/Calendario_Tributario_2026.pdf',
    verifiedAt: VERIFIED_AT,
  },
] as const satisfies readonly FilingRuleSource[];

export function getFilingRuleSource(sourceId: string): FilingRuleSource {
  const source = FILING_RULE_SOURCES_2025.find((item) => item.id === sourceId);
  if (!source) throw new Error(`Fuente de regla desconocida: ${sourceId}`);
  return source;
}
