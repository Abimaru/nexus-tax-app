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

/* ------------------------------------------------------------------------ */
/* Reporte DIAN de facturación electrónica (Sprint 2.4, Fase D)             */
/* ------------------------------------------------------------------------ */

const FE_HEADER_ROW = [
  'Identificación Emisor Factura',
  'Nombre Emisor Factura',
  'Fecha Emisión',
  'Num_factura_venta',
  'Valor Facturado',
  'Valor Notas Crédito',
  'Valor Notas Débito',
  'Valor Factura / Afectada con Notas Débito - Crédito',
  'Valor Susceptible Beneficio',
  'Medios De Pago',
  'CUFE',
];

/** Genera un CUFE hexadecimal sintético (96 caracteres), determinista por índice. */
export function syntheticCufe(index: number): string {
  const seed = (index * 2654435761) % 0xffffffff;
  const hex = seed.toString(16).padStart(8, '0');
  return hex.repeat(12).slice(0, 96);
}

export interface SyntheticInvoiceRowSpec {
  issuerTaxId: string;
  issuerName: string;
  issuedAt: string;
  invoiceNumber: string;
  grossValue: string | number;
  creditNoteValue: string | number;
  debitNoteValue: string | number;
  officialNetValue?: string | number | null;
  eligibleBenefitValue: string | number;
  paymentMethod: string;
  cufe: string | null;
}

function invoiceRowToAoa(spec: SyntheticInvoiceRowSpec): (string | number | null)[] {
  return [
    spec.issuerTaxId,
    spec.issuerName,
    spec.issuedAt,
    spec.invoiceNumber,
    spec.grossValue,
    spec.creditNoteValue,
    spec.debitNoteValue,
    spec.officialNetValue ?? null,
    spec.eligibleBenefitValue,
    spec.paymentMethod,
    spec.cufe,
  ];
}

/**
 * Libro sintético "realista" (§30 del prompt de Fase D): metadatos
 * superiores, texto explicativo, filas vacías, encabezado tardío (después de
 * la fila 20) y un puñado de facturas que ejercitan CUFE duplicado exacto,
 * duplicado conflictivo, CUFE ausente, notas crédito/débito y métodos de
 * pago electrónico/efectivo/error.
 */
export function realisticElectronicInvoiceBuffer(): ArrayBuffer {
  const metadataBlock: Aoa = [
    ['Reporte de facturas electrónicas - MUESTRA SINTÉTICA'],
    ['Dirección de Impuestos y Aduanas Nacionales'],
    ['Este reporte es orientativo y no reemplaza al RUV. Datos ficticios.'],
    ['NIT consultante:', '900.000.000-1 (sintético)'],
    ['Año gravable:', 2025],
    ['Fecha de generación:', '2026-02-01'],
    [],
    ['Este archivo agrupa las facturas electrónicas recibidas durante el año.'],
    ['Verifique la información con su proveedor tecnológico autorizado.'],
    [],
    [],
  ];
  while (metadataBlock.length < 21) metadataBlock.push([]);

  const cufeA = syntheticCufe(1);
  const cufeB = syntheticCufe(2);
  const rows: SyntheticInvoiceRowSpec[] = [
    {
      issuerTaxId: '900111222',
      issuerName: 'Proveedor Sintético Uno SAS',
      issuedAt: '2025-02-10',
      invoiceNumber: 'FES-0001',
      grossValue: '1.500.000',
      creditNoteValue: '0',
      debitNoteValue: '0',
      officialNetValue: '1.500.000',
      eligibleBenefitValue: '1.500.000',
      paymentMethod: 'Tarjeta débito o crédito',
      cufe: cufeA,
    },
    {
      // Duplicado EXACTO de la factura anterior (mismo CUFE, mismos valores).
      issuerTaxId: '900111222',
      issuerName: 'Proveedor Sintético Uno SAS',
      issuedAt: '2025-02-10',
      invoiceNumber: 'FES-0001',
      grossValue: '1.500.000',
      creditNoteValue: '0',
      debitNoteValue: '0',
      officialNetValue: '1.500.000',
      eligibleBenefitValue: '1.500.000',
      paymentMethod: 'Tarjeta débito o crédito',
      cufe: cufeA,
    },
    {
      issuerTaxId: '900333444',
      issuerName: 'Proveedor Sintético Dos SAS',
      issuedAt: '2025-03-05',
      invoiceNumber: 'FES-0002',
      grossValue: '2.200.500',
      creditNoteValue: '200.500',
      debitNoteValue: '0',
      officialNetValue: '2.000.000',
      eligibleBenefitValue: '2.000.000',
      paymentMethod: 'Transferencia electrónica',
      cufe: cufeB,
    },
    {
      // Mismo CUFE que la anterior pero con valores DISTINTOS -> conflictivo.
      issuerTaxId: '900333444',
      issuerName: 'Proveedor Sintético Dos SAS',
      issuedAt: '2025-03-05',
      invoiceNumber: 'FES-0002',
      grossValue: '2.500.000',
      creditNoteValue: '0',
      debitNoteValue: '0',
      officialNetValue: '2.500.000',
      eligibleBenefitValue: '2.500.000',
      paymentMethod: 'Transferencia electrónica',
      cufe: cufeB,
    },
    {
      issuerTaxId: '900555666',
      issuerName: 'Proveedor Sintético Tres SAS',
      issuedAt: '2025-04-12',
      invoiceNumber: 'FES-0003',
      grossValue: '364.741,49',
      creditNoteValue: '0',
      debitNoteValue: '0',
      officialNetValue: '364.741,49',
      eligibleBenefitValue: '0',
      paymentMethod: 'Efectivo',
      cufe: syntheticCufe(3),
    },
    {
      // Sin CUFE.
      issuerTaxId: '900777888',
      issuerName: 'Proveedor Sintético Cuatro SAS',
      issuedAt: '2025-05-20',
      invoiceNumber: 'FES-0004',
      grossValue: '41.585.075',
      creditNoteValue: '0',
      debitNoteValue: '0',
      officialNetValue: '41.585.075',
      eligibleBenefitValue: '41.585.075',
      paymentMethod: 'Error en datos',
      cufe: null,
    },
    {
      issuerTaxId: '900999000',
      issuerName: 'Proveedor Sintético Cinco SAS',
      issuedAt: '2025-06-01',
      invoiceNumber: 'FES-0005',
      grossValue: 0,
      creditNoteValue: 0,
      debitNoteValue: 0,
      officialNetValue: 0,
      eligibleBenefitValue: 0,
      paymentMethod: 'No informado',
      cufe: syntheticCufe(5),
    },
    {
      // CUFE presente pero malformado (no hexadecimal / longitud incorrecta).
      issuerTaxId: '900222111',
      issuerName: 'Proveedor Sintético Seis SAS',
      issuedAt: '2025-06-10',
      invoiceNumber: 'FES-0006',
      grossValue: '800.000',
      creditNoteValue: '0',
      debitNoteValue: '0',
      officialNetValue: '800.000',
      eligibleBenefitValue: '800.000',
      paymentMethod: 'Tarjeta débito o crédito',
      cufe: 'cufe-no-valido-123',
    },
  ];

  const sheet: Aoa = [
    ...metadataBlock,
    FE_HEADER_ROW,
    ...rows.map(invoiceRowToAoa),
    [],
    ['Total registros:', rows.length],
  ];

  return buildWorkbookBuffer({ Facturas: sheet });
}

export interface ElectronicInvoiceRegressionOracle {
  rowCount: number;
  grossTotalCop: number;
  creditNoteTotalCop: number;
  debitNoteTotalCop: number;
  netTotalCop: number;
  eligibleBenefitTotalCop: number;
  electronicCount: number;
  cashCount: number;
  errorCount: number;
}

/**
 * Fixture de regresión numérica grande (§31-32 del prompt de Fase D): 227
 * facturas sintéticas con CUFE únicos, sin notas débito, con notas crédito
 * concentradas en las primeras filas y distribución de medios de pago
 * 216 electrónico / 10 efectivo / 1 error. Los totales son un ORÁCULO DE
 * PARSER/AGREGACIÓN de este fixture (no una regla tributaria) y solo se usan
 * en pruebas, nunca en producción.
 */
export function electronicInvoiceRegressionBuffer(): {
  buffer: ArrayBuffer;
  oracle: ElectronicInvoiceRegressionOracle;
} {
  const rowCount = 227;
  const grossTotalCop = 42_784_423;
  const creditNoteTotalCop = 1_199_349;
  const debitNoteTotalCop = 0;
  const eligibleBenefitTotalCop = 40_679_401;
  const electronicCount = 216;
  const cashCount = 10;
  const errorCount = 1;

  const baseGross = Math.floor(grossTotalCop / rowCount);
  const grossRemainder = grossTotalCop - baseGross * rowCount;
  // Solo las primeras 40 facturas traen nota crédito (realista: la mayoría no la tiene).
  const creditRows = 40;
  const baseCredit = Math.floor(creditNoteTotalCop / creditRows);
  const creditRemainder = creditNoteTotalCop - baseCredit * creditRows;
  // Cinco facturas quedan con valor susceptible = 0 (§10: countEligibleZero).
  const eligibleZeroRows = 5;
  const eligibleRows = rowCount - eligibleZeroRows;
  const baseEligible = Math.floor(eligibleBenefitTotalCop / eligibleRows);
  const eligibleRemainder = eligibleBenefitTotalCop - baseEligible * eligibleRows;

  const rows: SyntheticInvoiceRowSpec[] = Array.from({ length: rowCount }, (_, index) => {
    const gross = baseGross + (index === rowCount - 1 ? grossRemainder : 0);
    const credit = index < creditRows ? baseCredit + (index === creditRows - 1 ? creditRemainder : 0) : 0;
    const isEligibleZero = index >= rowCount - eligibleZeroRows;
    const eligible = isEligibleZero
      ? 0
      : baseEligible + (index === eligibleRows - 1 ? eligibleRemainder : 0);
    const net = gross - credit;
    const paymentMethod =
      index < electronicCount
        ? 'Tarjeta débito o crédito'
        : index < electronicCount + cashCount
          ? 'Efectivo'
          : 'Error en datos';
    return {
      issuerTaxId: `9000${String(100000 + index).slice(-6)}`,
      issuerName: `Proveedor Sintético Regresión ${index + 1}`,
      issuedAt: '2025-06-15',
      invoiceNumber: `FES-R-${String(index + 1).padStart(4, '0')}`,
      grossValue: gross,
      creditNoteValue: credit,
      debitNoteValue: 0,
      officialNetValue: net,
      eligibleBenefitValue: eligible,
      paymentMethod,
      cufe: syntheticCufe(1000 + index),
    };
  });

  const netTotalCop = rows.reduce(
    (sum, row) => sum + (Number(row.grossValue) - Number(row.creditNoteValue) + Number(row.debitNoteValue)),
    0,
  );

  const metadataBlock: Aoa = [
    ['Reporte de facturas electrónicas - MUESTRA SINTÉTICA DE REGRESIÓN'],
    ['Fixture de regresión numérica. Datos exclusivamente sintéticos.'],
    [],
  ];
  while (metadataBlock.length < 23) metadataBlock.push([]);

  const sheet: Aoa = [...metadataBlock, FE_HEADER_ROW, ...rows.map(invoiceRowToAoa)];

  return {
    buffer: buildWorkbookBuffer({ Facturas: sheet }),
    oracle: {
      rowCount,
      grossTotalCop,
      creditNoteTotalCop,
      debitNoteTotalCop,
      netTotalCop,
      eligibleBenefitTotalCop,
      electronicCount,
      cashCount,
      errorCount,
    },
  };
}

/**
 * Fixture mínimo para probar la conciliación con diferencia de exactamente
 * $1 frente a la exógena (§17): no debe existir una excepción especial para
 * este caso, solo la política de tolerancia ya existente.
 */
export function offByOnePesoElectronicInvoiceBuffer(): {
  buffer: ArrayBuffer;
  exogenousNetTotalCop: number;
} {
  const rows: SyntheticInvoiceRowSpec[] = [
    {
      issuerTaxId: '900111222',
      issuerName: 'Proveedor Sintético Redondeo SAS',
      issuedAt: '2025-07-01',
      invoiceNumber: 'FES-R1',
      grossValue: '1.000.000',
      creditNoteValue: '0',
      debitNoteValue: '0',
      officialNetValue: '1.000.000',
      eligibleBenefitValue: '1.000.000',
      paymentMethod: 'Efectivo',
      cufe: syntheticCufe(9001),
    },
  ];
  const sheet: Aoa = [
    ['Reporte de facturas electrónicas - MUESTRA SINTÉTICA'],
    ...Array.from({ length: 20 }, () => []),
    FE_HEADER_ROW,
    ...rows.map(invoiceRowToAoa),
  ];
  return {
    buffer: buildWorkbookBuffer({ Facturas: sheet }),
    // Exógena reporta X+1 para forzar una diferencia de exactamente $1.
    exogenousNetTotalCop: 1_000_001,
  };
}
