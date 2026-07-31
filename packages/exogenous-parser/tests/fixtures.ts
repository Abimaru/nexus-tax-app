import * as XLSX from 'xlsx';

/**
 * Constructores de libros Excel SINTÉTICOS en memoria para pruebas.
 * Nunca usan datos tributarios reales.
 */

export type Aoa = (string | number | null)[][];

/** Crea un ArrayBuffer .xlsx a partir de hojas (nombre -> matriz). */
export function buildWorkbookBuffer(sheets: Record<string, Aoa>): ArrayBuffer {
  const wb = XLSX.utils.book_new();
  for (const [name, aoa] of Object.entries(sheets)) {
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    XLSX.utils.book_append_sheet(wb, ws, name);
  }
  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx', compression: false });
  return out as ArrayBuffer;
}

function replaceSameLengthAscii(buffer: ArrayBuffer, from: string, to: string): ArrayBuffer {
  if (from.length !== to.length)
    throw new Error('El reemplazo de fixture debe conservar longitud.');
  const bytes = new Uint8Array(buffer.slice(0));
  const source = new TextEncoder().encode(from);
  const replacement = new TextEncoder().encode(to);
  let match = -1;
  for (let index = 0; index <= bytes.length - source.length; index += 1) {
    if (source.every((value, offset) => bytes[index + offset] === value)) {
      match = index;
      break;
    }
  }
  if (match < 0) throw new Error(`No se encontró ${from} en el fixture XLSX.`);
  bytes.set(replacement, match);
  return bytes.buffer;
}

/** Libro de exógena típico: portada + hoja de datos con encabezados en la fila 3. */
export function sampleExogenousBuffer(): ArrayBuffer {
  return buildWorkbookBuffer({
    Portada: [['Información exógena - MUESTRA'], ['Datos ficticios'], []],
    Terceros: [
      ['Reporte de terceros'],
      [],
      ['NIT del tercero', 'Nombre del tercero', 'Concepto', 'Valor', 'Retención'],
      ['900111222', 'Banco Ficticio S.A.', 'Rendimientos financieros', '1.250.000', '25.000'],
      ['800333444', 'Empresa Empleadora SAS', 'Salarios', '48.000.000', '3.600.000'],
      ['901555666', 'Porvenir Ficticio Pensiones', 'Aportes a pensión', '2.400.000', '0'],
      [
        '860777888',
        'Fondo Nacional del Ahorro Ficticio',
        'Intereses de vivienda',
        '5.100.000',
        '0',
      ],
      [],
      // Duplicado exacto de la primera fila de datos.
      ['900111222', 'Banco Ficticio S.A.', 'Rendimientos financieros', '1.250.000', '25.000'],
    ],
  });
}

/** Hoja sintética con la misma topología por secciones observada en reportes DIAN. */
export function sectionedExogenousBuffer(): ArrayBuffer {
  return buildWorkbookBuffer({
    Reporte: [
      ['Información exógena - MUESTRA SINTÉTICA'],
      ['Advertencia: valores exclusivamente ficticios'],
      ...Array.from({ length: 11 }, () => []),
      ['Número', 'Concepto', 'NIT del tercero', 'Nombre del tercero', 'Valor'],
      [1, 'Patrimonio bruto', null, null, 211_000_000],
      [2, 'Ingresos brutos', null, null, 65_000_000],
      [3, 'Consumos con tarjeta', null, null, 42_000_000],
      [4, 'Compras y consumos', null, null, 42_000_000],
      [5, 'Consignaciones bancarias', null, null, 65_000_000],
      [null, 'Salarios', '800111222', 'Empresa Sintética SAS', 48_000_000],
      [null, 'Rendimientos financieros', '900333444', 'Banco Sintético S.A.', 1_250_000],
    ],
  });
}

/** Simula un XLSX cuyo XML declara 15 filas aunque contiene celdas hasta la 21. */
export function staleDimensionExogenousBuffer(): ArrayBuffer {
  return replaceSameLengthAscii(
    sectionedExogenousBuffer(),
    '<dimension ref="A1:E21"/>',
    '<dimension ref="A1:E15"/>',
  );
}

export interface DianRecordFixture {
  reportingDocument?: string | number;
  reportingName?: string;
  reportedDocument: string;
  reportedName?: string;
  detail: string;
  value: number;
  suggestedUse?: string;
  additionalInformation?: string;
}

/** Formato jerárquico DIAN con identidad y celdas combinadas, siempre sintético. */
export function dianIdentityBuffer(
  taxpayerDocument: string,
  records: DianRecordFixture[],
): ArrayBuffer {
  const rows: Aoa = [
    ['Consulta de información exógena - MUESTRA'],
    [null, null, null, null, null, null, 'Fecha Reporte:', '2025-01-15'],
    ['Fecha corte del proceso:', null, '2025-01-10'],
    ['Año al que se refiere la consulta:', null, 2024],
    ['Identificación del consultante'],
    ['Tipo de documento:', null, 'CC'],
    ['Identificación:', null, taxpayerDocument],
    ['Nombres / Razón social:', null, 'Persona Sintética'],
    [],
    ['Advertencia sintética'],
    ['Texto informativo sintético'],
    [],
    ['Persona que reporta', null, 'Información reportada'],
    [
      'NIT',
      'Nombre / Razón Social',
      'NIT',
      'Nombre/Razón Social reportada por el tercero',
      'Detalle',
      'Valor',
      'Uso declaración Sugerida',
      'Información Adicional',
    ],
    [null, null, null, null, 'Patrimonio bruto', 100_000_000],
    [null, null, null, null, 'Ingresos brutos', 50_000_000],
    [null, null, null, null, 'Consumos con tarjeta', 20_000_000],
    [null, null, null, null, 'Compras', 20_000_000],
    [null, null, null, null, 'Consignaciones', 50_000_000],
    ...records.map((record) => [
      record.reportingDocument ?? '900111222',
      record.reportingName ?? 'Entidad Sintética',
      record.reportedDocument,
      record.reportedName ?? 'Persona Sintética',
      record.detail,
      record.value,
      record.suggestedUse ?? null,
      record.additionalInformation ?? null,
    ]),
  ];
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!merges'] = [
    XLSX.utils.decode_range('A6:B6'),
    XLSX.utils.decode_range('A7:B7'),
    XLSX.utils.decode_range('A8:B8'),
    XLSX.utils.decode_range('A13:B13'),
    XLSX.utils.decode_range('C13:H13'),
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Reporte');
  return XLSX.write(wb, {
    type: 'array',
    bookType: 'xlsx',
    compression: false,
  }) as ArrayBuffer;
}
