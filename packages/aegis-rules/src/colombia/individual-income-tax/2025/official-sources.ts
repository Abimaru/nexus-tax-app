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
  {
    id: 'et-art-387',
    authority: 'Estatuto Tributario',
    title:
      'Estatuto Tributario, artículo 387 — Deducciones que se restarán de la base de retención (dependientes y salud)',
    url: 'https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=6533#387',
    verifiedAt: VERIFIED_AT,
    taxYear: null,
    scope:
      'Regula DOS deducciones distintas bajo el mismo artículo: (1) dependientes económicos (10 % ingresos brutos, hasta 32 UVT mensuales y 384 UVT anuales TOTALES para el contribuyente; sin número máximo de dependientes) y (2) pagos por salud — medicina prepagada y seguros de salud — hasta 16 UVT mensuales TOTALES para el contribuyente (Sprint 2.4, Fase H; ver `et-art-387-par-2-salud` para el detalle de esta segunda deducción). Ambas son independientes entre sí y ambas se cablean a la casilla 39.',
    relatedBoxNumbers: [39],
  },
  {
    id: 'et-art-387-par-2-salud',
    authority: 'Estatuto Tributario',
    title:
      'Estatuto Tributario, artículo 387 — Deducción por pagos de salud (medicina prepagada y seguros de salud)',
    url: 'https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=6533#387',
    verifiedAt: VERIFIED_AT,
    taxYear: null,
    scope:
      'Texto verbatim (literal (a)/(b) del art. 387 ET): "los pagos por salud, siempre que el valor a disminuir mensualmente [...] no supere dieciséis (16) UVT mensuales". El límite es MENSUAL y AGREGADO para el contribuyente (nunca por proveedor, póliza ni beneficiario — literal (b), seguros de salud, usa expresamente "la misma limitación del literal anterior": un único tope de 16 UVT compartido con literal (a), medicina prepagada). Cubre al contribuyente, cónyuge, hijos y demás dependientes definidos en el parágrafo 2 del mismo artículo. Requiere que el pago se realice a una entidad vigilada por la Superintendencia Nacional de Salud (medicina prepagada, literal a) o por la Superintendencia Financiera de Colombia (seguros de salud, literal b). Limitación de esta revisión: la numeración exacta del artículo reglamentario del Decreto 1625 de 2016 que desarrolla estos requisitos de control no se verificó con una fuente primaria confiable durante esta fase — se documenta el requisito (entidad vigilada) directamente desde el texto del art. 387 ET, que es autosuficiente para esta regla.',
    relatedBoxNumbers: [39],
  },
  {
    id: 'et-art-336-num-3',
    authority: 'Estatuto Tributario',
    title:
      'Estatuto Tributario, artículo 336, numeral 3, inciso 2 — Adición por dependientes (adicionado por la Ley 2277 de 2022)',
    url: 'https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=6533#336',
    verifiedAt: VERIFIED_AT,
    taxYear: null,
    scope:
      'Deducción adicional de 72 UVT por dependiente, máximo cuatro dependientes; adicional al límite del 40 %/1.340 UVT y a la deducción del art. 387 (arts. 1.2.1.20.3 y 2231 de 2023 del Decreto 1625 de 2016 regulan la coexistencia)',
    relatedBoxNumbers: [92, 138, 139],
  },
  {
    id: 'decreto-1625-2016-art-1.2.1.20.3',
    authority: 'Presidencia',
    title:
      'Decreto 1625 de 2016 (DUR Tributario), artículo 1.2.1.20.3, numeral 1.1.2 — Deducciones de la cédula general',
    url: 'https://normograma.dian.gov.co/dian/compilacion/docs/decreto_1625_2016.htm#1.2.1.20.3',
    verifiedAt: VERIFIED_AT,
    taxYear: null,
    scope:
      'Regla de coexistencia entre las deducciones por dependientes del art. 336 num. 3 (inciso 2) y del art. 387 ET: "un mismo dependiente solo dará lugar a una de estas dos deducciones, excepto cuando se tenga rentas provenientes de una relación laboral y legal o reglamentaria, caso en el cual se podrá aplicar ambas deducciones por un mismo dependiente." Texto vigente tras la sustitución por el Decreto 2231 de 2023.',
    relatedBoxNumbers: [39, 92, 138, 139],
  },
  {
    id: 'decreto-2231-2023',
    authority: 'Presidencia',
    title:
      'Decreto 2231 de 2023 — Reglamenta parcialmente los arts. 206, 331, 336 y 383 ET (Ley 2277 de 2022); sustituye el numeral 1.1.2 del art. 1.2.1.20.3 del Decreto 1625 de 2016',
    url: 'https://normograma.dian.gov.co/dian/compilacion/docs/decreto_2231_2023.htm',
    verifiedAt: VERIFIED_AT,
    taxYear: null,
    scope:
      'Decreto modificatorio que introdujo la regla de coexistencia entre las deducciones de dependientes del art. 336 num. 3 y del art. 387 ET (evita la concurrencia de beneficios fiscales del art. 23 de la Ley 383 de 1997, salvo para rentas de relación laboral, legal o reglamentaria)',
    relatedBoxNumbers: [39, 92, 138, 139],
  },
  {
    id: 'et-art-261',
    authority: 'Estatuto Tributario',
    title:
      'Estatuto Tributario, artículo 261 — Patrimonio bruto (valor patrimonial neto)',
    url: 'https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=6533#261',
    verifiedAt: VERIFIED_AT,
    taxYear: null,
    scope:
      'Composición del patrimonio bruto: activos poseídos al último día del año gravable',
    relatedBoxNumbers: [29, 30, 31],
  },
  {
    id: 'et-art-336-num-5',
    authority: 'Estatuto Tributario',
    title:
      'Estatuto Tributario, artículo 336, numeral 5 — Deducción especial por compras con factura electrónica (texto introducido por el art. 7 de la Ley 2277 de 2022)',
    url: 'https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=6533#336',
    verifiedAt: VERIFIED_AT,
    taxYear: null,
    scope:
      'Deducción especial: 1 % de compras soportadas con factura electrónica y pagadas con ' +
      'medios electrónicos, tope anual 240 UVT; expresamente exenta del límite del 40 %/1.340 ' +
      'UVT del numeral 3 del mismo artículo (Ley 2277 de 2022). Casilla oficial 28 del ' +
      'Formulario 210 (dato informativo previo a patrimonio), corregido tras revisión ' +
      'normativa puntual — NO es el "artículo 336-1 ET" (norma distinta, ver ese id).',
    relatedBoxNumbers: [28],
  },
  {
    id: 'et-art-336-1',
    authority: 'Estatuto Tributario',
    title:
      'Estatuto Tributario, artículo 336-1 — Estimación de costos y gastos para la cédula general (adicionado por el art. 60 de la Ley 2277 de 2022)',
    url: 'https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=6533#336-1',
    verifiedAt: VERIFIED_AT,
    taxYear: null,
    scope:
      'Tope indicativo de costos y gastos deducibles (60 % de ingresos brutos de rentas de ' +
      'trabajo, u otro tope que fije la DIAN por actividad económica); su exceso se informa ' +
      'marcando la casilla 140 del Formulario 210 (indicador booleano, no monetario). Norma ' +
      'distinta de la deducción del 1 % por facturación electrónica (ver `et-art-336-num-5`).',
    relatedBoxNumbers: [140],
  },
  {
    id: 'et-art-244-1',
    authority: 'Estatuto Tributario',
    title: 'Estatuto Tributario, artículo 244-1 — Impuesto voluntario',
    url: 'https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=6533#244-1',
    verifiedAt: VERIFIED_AT,
    taxYear: null,
    scope:
      'Aporte/impuesto voluntario adicional que el contribuyente puede optar por liquidar; ' +
      'casilla oficial 141 del Formulario 210. No modelado por NexusTax en esta fase; se ' +
      'registra únicamente para trazabilidad y para evitar que R141 se confunda con otros ' +
      'beneficios (dependientes o facturación electrónica).',
    relatedBoxNumbers: [141],
  },
  {
    id: 'et-art-126-1',
    authority: 'Estatuto Tributario',
    title:
      'Estatuto Tributario, artículo 126-1 — Aportes voluntarios a fondos de pensiones y AVC',
    url: 'https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=6533#126-1',
    verifiedAt: VERIFIED_AT,
    taxYear: null,
    scope:
      'Renta exenta por aportes voluntarios a fondos de pensiones voluntarias y cuentas AVC; tope conjunto 30 % del ingreso laboral/tributario y 3.800 UVT anuales',
    relatedBoxNumbers: [35],
  },
  {
    id: 'et-art-126-4',
    authority: 'Estatuto Tributario',
    title:
      'Estatuto Tributario, artículo 126-4 — Incentivo al ahorro AFC/AVC',
    url: 'https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=6533#126-4',
    verifiedAt: VERIFIED_AT,
    taxYear: null,
    scope:
      'Renta exenta por depósitos en cuentas AFC; comparte tope conjunto con art. 126-1 (30 % del ingreso y 3.800 UVT anuales)',
    relatedBoxNumbers: [35],
  },
  {
    id: 'et-art-119',
    authority: 'Estatuto Tributario',
    title:
      'Estatuto Tributario, artículo 119 — Deducción de intereses sobre préstamos para adquisición de vivienda',
    url: 'https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=6533#119',
    verifiedAt: VERIFIED_AT,
    taxYear: null,
    scope:
      'Deducción de intereses de crédito para vivienda; tope 100 UVT mensuales / 1.200 UVT anuales',
    relatedBoxNumbers: [38],
  },
  {
    id: 'et-art-850',
    authority: 'Estatuto Tributario',
    title:
      'Estatuto Tributario, artículo 850 — Devolución de saldos a favor',
    url: 'https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=6533#850',
    verifiedAt: VERIFIED_AT,
    taxYear: null,
    scope:
      'Saldo a favor del año anterior: aplicabilidad sujeta a no haber solicitado devolución ni compensación',
    relatedBoxNumbers: [131],
  },
  {
    id: 'et-art-373',
    authority: 'Estatuto Tributario',
    title:
      'Estatuto Tributario, artículo 373 — Los valores retenidos se imputan al impuesto',
    url: 'https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=6533#373',
    verifiedAt: VERIFIED_AT,
    taxYear: null,
    scope:
      'Retenciones en la fuente descontables como abono al impuesto sobre la renta',
    relatedBoxNumbers: [132],
  },
  {
    id: 'et-art-236',
    authority: 'Estatuto Tributario',
    title:
      'Estatuto Tributario, artículo 236 — Renta por comparación patrimonial',
    url: 'https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=6533#236',
    verifiedAt: VERIFIED_AT,
    taxYear: null,
    scope:
      'Justificación patrimonial: aumentos de patrimonio no explicados por los ingresos declarados',
    relatedBoxNumbers: [29, 31],
  },
  // Inmuebles, renta inmobiliaria y administración de propiedad horizontal
  // (Sprint 2.4, Fase G).
  {
    id: 'et-art-107',
    authority: 'Estatuto Tributario',
    title:
      'Estatuto Tributario, artículo 107 — Deducciones: relación de causalidad, necesidad y proporcionalidad',
    url: 'https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=6533#107',
    verifiedAt: VERIFIED_AT,
    taxYear: null,
    scope:
      'Requisito general de causalidad/necesidad/proporcionalidad para cualquier costo o gasto asociado a una actividad productora de renta (incluida la renta de capital por arrendamiento)',
    relatedBoxNumbers: [60],
  },
  {
    id: 'et-art-743',
    authority: 'Estatuto Tributario',
    title: 'Estatuto Tributario, artículo 743 — Idoneidad de los medios de prueba',
    url: 'https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=6533#743',
    verifiedAt: VERIFIED_AT,
    taxYear: null,
    scope:
      'La idoneidad de un soporte depende primero de lo que exija la ley para ese hecho y, en su defecto, de su conexión y valor de convicción según la sana crítica — no exige un único tipo de documento (p. ej. factura) cuando la ley no lo exige expresamente',
    relatedBoxNumbers: [60],
  },
  {
    id: 'decreto-1625-2016-art-1-3-1-13-5',
    authority: 'Presidencia',
    title:
      'Decreto 1625 de 2016, artículo 1.3.1.13.5 — Cuotas de administración de propiedad horizontal',
    url: 'https://normograma.dian.gov.co/dian/compilacion/docs/decreto_1625_2016.htm',
    verifiedAt: VERIFIED_AT,
    taxYear: null,
    scope:
      'Las cuotas de administración fijadas por la junta de copropietarios son un aporte a capital, no constituyen hecho generador de IVA ni corresponden a la venta de un bien o prestación de un servicio comercial facturable',
    relatedBoxNumbers: [60],
  },
  {
    id: 'dian-oficio-912878-2021',
    authority: 'DIAN',
    title:
      'Oficio DIAN 912878 de 2021 — Facturación electrónica y cuotas de administración de propiedad horizontal',
    url: 'https://normograma.dian.gov.co/dian/compilacion/docs/oficio_dian_912878_2021.htm',
    verifiedAt: VERIFIED_AT,
    taxYear: null,
    scope:
      'Confirma que las cuotas ordinarias/extraordinarias de administración no generan obligación de facturación electrónica por su naturaleza de expensas comunes, esenciales para el funcionamiento y conservación de bienes comunes',
    relatedBoxNumbers: [60],
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
