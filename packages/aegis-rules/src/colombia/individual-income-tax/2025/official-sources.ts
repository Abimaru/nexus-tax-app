import type { OfficialSourceReference } from '../../../types';
import { VERIFIED_AT } from './sources';

/**
 * Catálogo consolidado de fuentes oficiales para el año gravable 2025 y su
 * presentación en 2026. Reúne las fuentes usadas por la evaluación de la
 * obligación de declarar (aegis-rules) y las que respaldan las casillas del
 * Formulario 210 (form-210). Otras reglas se referencian por `sourceId`.
 *
 * No se descarga nada en tiempo de ejecución del usuario: `verifiedAt` marca la
 * última fecha en que un humano confirmó el contenido durante desarrollo.
 */
export const OFFICIAL_SOURCES_2025: readonly OfficialSourceReference[] = [
  // Obligación de declarar y calendario
  {
    id: 'dian-renta-personas-naturales-ag-2025',
    authority: 'DIAN',
    title: 'Declaración de Renta Personas Naturales — año gravable 2025',
    url: 'https://micrositios.dian.gov.co/renta-personas-naturales-ag-2025/',
    verifiedAt: VERIFIED_AT,
    taxYear: 2025,
    scope: 'Obligación de declarar y guía general',
  },
  {
    id: 'dian-resolucion-000193-2024',
    authority: 'DIAN',
    title: 'Resolución DIAN 000193 de 2024 — UVT aplicable en 2025',
    url: 'https://normograma.dian.gov.co/dian/compilacion/docs/resolucion_dian_0193_2024.htm',
    verifiedAt: VERIFIED_AT,
    taxYear: 2025,
    scope: 'Unidad de Valor Tributario (UVT)',
  },
  {
    id: 'dian-calendario-tributario-2026',
    authority: 'DIAN',
    title: 'Calendario tributario DIAN 2026',
    url: 'https://www.dian.gov.co/Calendarios/Calendario_Tributario_2026.pdf',
    verifiedAt: VERIFIED_AT,
    taxYear: 2025,
    scope: 'Vencimientos de presentación',
  },
  // Formulario 210
  {
    id: 'dian-formulario-210-2025',
    authority: 'DIAN',
    title: 'Formulario 210 e instructivo — año gravable 2023 y siguientes',
    url: 'https://www.dian.gov.co/atencionciudadano/formulariosinstructivos/Formularios/2025/Formulario_210_2025.pdf',
    verifiedAt: VERIFIED_AT,
    taxYear: 2025,
    scope: 'Formulario 210 e instructivo oficial',
  },
  {
    id: 'dian-resolucion-000044-2024',
    authority: 'DIAN',
    title: 'Resolución DIAN 000044 de 2024',
    url: 'https://normograma.dian.gov.co/dian/compilacion/docs/resolucion_dian_0044_2024.htm',
    verifiedAt: VERIFIED_AT,
    taxYear: 2025,
    scope: 'Prescripción de formularios',
  },
  {
    id: 'dian-resolucion-000227-2025',
    authority: 'DIAN',
    title: 'Resolución Única DIAN 000227 de 2025',
    url: 'https://normograma.dian.gov.co/dian/compilacion/docs/resolucion_dian_0227_2025.htm',
    verifiedAt: VERIFIED_AT,
    taxYear: 2025,
    scope: 'Compilación de formularios y procedimientos',
  },
  // Estatuto Tributario — reglas transversales, no dependen del año.
  {
    id: 'et-art-241',
    authority: 'Estatuto Tributario',
    title: 'Estatuto Tributario, artículo 241 — Tarifa para personas naturales residentes',
    url: 'https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=6533#241',
    verifiedAt: VERIFIED_AT,
    taxYear: null,
    scope: 'Tarifa progresiva de renta',
    relatedBoxNumbers: [],
  },
  {
    id: 'et-art-336',
    authority: 'Estatuto Tributario',
    title:
      'Estatuto Tributario, artículo 336 — Renta líquida gravable de la cédula general',
    url: 'https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=6533#336',
    verifiedAt: VERIFIED_AT,
    taxYear: null,
    scope: 'Límite conjunto de rentas exentas y deducciones (40 % + 1.340 UVT)',
    relatedBoxNumbers: [41, 65, 82],
  },
  {
    id: 'et-art-314',
    authority: 'Estatuto Tributario',
    title:
      'Estatuto Tributario, artículo 314 — Tarifa para personas naturales residentes por ganancias ocasionales',
    url: 'https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=6533#314',
    verifiedAt: VERIFIED_AT,
    taxYear: null,
    scope: 'Tarifa general de ganancias ocasionales (15 %, Ley 2277 de 2022)',
    relatedBoxNumbers: [115],
  },
  {
    id: 'et-art-317',
    authority: 'Estatuto Tributario',
    title:
      'Estatuto Tributario, artículo 317 — Loterías, rifas, apuestas y similares',
    url: 'https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=6533#317',
    verifiedAt: VERIFIED_AT,
    taxYear: null,
    scope: 'Tarifa de ganancias ocasionales por loterías (20 %)',
    relatedBoxNumbers: [115],
  },
  {
    id: 'et-art-807',
    authority: 'Estatuto Tributario',
    title:
      'Estatuto Tributario, artículo 807 — Anticipo del impuesto sobre la renta',
    url: 'https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=6533#807',
    verifiedAt: VERIFIED_AT,
    taxYear: null,
    scope: 'Anticipo del impuesto de renta (25 % / 50 % / 75 %)',
    relatedBoxNumbers: [],
  },
] as const;

/**
 * Recupera una fuente por identificador. Lanza en desarrollo si el id no
 * existe: los identificadores forman parte del contrato de las reglas y una
 * referencia inválida indica desincronización entre regla y catálogo.
 */
export function getOfficialSource(id: string): OfficialSourceReference {
  const source = OFFICIAL_SOURCES_2025.find((entry) => entry.id === id);
  if (!source) {
    throw new Error(`Fuente oficial desconocida: "${id}". Revisa OFFICIAL_SOURCES_2025.`);
  }
  return source;
}

/** Devuelve todas las fuentes que amparan una casilla dada del Formulario 210. */
export function officialSourcesForBox(boxNumber: number): readonly OfficialSourceReference[] {
  return OFFICIAL_SOURCES_2025.filter((source) => source.relatedBoxNumbers?.includes(boxNumber));
}
