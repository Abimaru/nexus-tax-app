// Genera un archivo Excel SINTÉTICO de información exógena para pruebas.
// Datos completamente ficticios. Requiere que el workspace tenga instalada la
// dependencia `xlsx` (está en @nexus-tax/exogenous-parser).
//
// Uso: node samples/generate-sample.mjs
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const requireFromParser = createRequire(join(here, '../packages/exogenous-parser/package.json'));
const { utils, writeFile } = requireFromParser('xlsx');

// Hoja de portada (no contiene datos tabulares).
const cover = utils.aoa_to_sheet([
  ['Información exógena - MUESTRA SINTÉTICA'],
  ['Documento de prueba. Datos ficticios.'],
  [],
]);

// Hoja por secciones: metadatos, encabezado, topes y detalle. Las posiciones
// sirven para probar el caso, pero el parser debe detectarlas por contenido.
const rows = [
  ['Reporte de información exógena - MUESTRA SINTÉTICA'],
  ['Fecha de generación del reporte', '2026-01-15'],
  ['Fecha de corte', '2025-12-31'],
  ['Año gravable', 2025],
  [],
  ['Tipo de documento', 'NIT'],
  ['Número de identificación', '123456789'],
  ['Nombre o razón social', 'CONTRIBUYENTE SINTÉTICO SAS'],
  ['Advertencia: esta muestra contiene únicamente datos ficticios.'],
  [],
  [],
  [],
  ['Persona que reporta', null, 'Información reportada'],
  [
    'NIT',
    'Nombre o razón social',
    'NIT',
    'Nombre o razón social',
    'Detalle',
    'Valor',
    'Uso sugerido',
    'Información adicional',
  ],
  [null, null, null, null, '1. Patrimonio bruto', 211000000],
  [null, null, null, null, '2. Ingresos brutos', 65000000],
  [null, null, null, null, '3. Consumos con tarjeta', 42000000],
  [null, null, null, null, '4. Compras y consumos', 42000000],
  [null, null, null, null, '5. Consignaciones bancarias', 65000000],
  [
    '900111222',
    'BANCO FICTICIO S.A.',
    '123456789',
    'CONTRIBUYENTE SINTÉTICO SAS',
    'Rendimientos financieros',
    1250000,
    'R29 - Ingresos financieros',
    'Retención practicada: 25.000',
  ],
  [
    '800333444',
    'EMPRESA EMPLEADORA SAS',
    '123456789',
    'CONTRIBUYENTE SINTÉTICO SAS',
    'Salarios',
    48000000,
    'R30 - Rentas de trabajo',
    'Retención practicada: 3.600.000',
  ],
  [
    '901555666',
    'PENSIONES FICTICIAS S.A.',
    '123456789',
    'CONTRIBUYENTE SINTÉTICO SAS',
    'Aportes a pensión',
    2400000,
    'R58 - Aportes obligatorios',
    null,
  ],
  [
    '860777888',
    'FONDO DE VIVIENDA FICTICIO',
    '123456789',
    'CONTRIBUYENTE SINTÉTICO SAS',
    'Intereses de vivienda',
    5100000,
    'Deducción potencial',
    null,
  ],
  // Identificador largo: debe conservarse sin notación científica.
  [
    '9001112223334',
    'BANCO FICTICIO S.A.',
    '123456789',
    'CONTRIBUYENTE SINTÉTICO SAS',
    'Rendimientos financieros',
    320000,
    'R29',
    'Retención practicada: 6.400',
  ],
  [],
  // Duplicado exacto de una fila previa (para hallazgos de calidad).
  [
    '900111222',
    'BANCO FICTICIO S.A.',
    '123456789',
    'CONTRIBUYENTE SINTÉTICO SAS',
    'Rendimientos financieros',
    1250000,
    'R29 - Ingresos financieros',
    'Retención practicada: 25.000',
  ],
];
const data = utils.aoa_to_sheet(rows);
data['!merges'] = [
  { s: { r: 12, c: 0 }, e: { r: 12, c: 1 } },
  { s: { r: 12, c: 2 }, e: { r: 12, c: 7 } },
];

const workbook = utils.book_new();
utils.book_append_sheet(workbook, cover, 'Portada');
utils.book_append_sheet(workbook, data, 'Terceros');

const out = join(here, 'exogena-sintetica.xlsx');
writeFile(workbook, out);
console.log(`Archivo de ejemplo generado: ${out}`);
