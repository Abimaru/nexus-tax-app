/**
 * Caso tributario sintético "golden case" (Sprint 2.4, Fase G.1).
 *
 * Construye un expediente AG 2025 completamente ficticio, coherente entre
 * todas sus fuentes (exógena, documentos, declaración anterior,
 * facturación electrónica, dependiente, inmueble), pensado para demo y
 * regresión — nunca para presentar datos reales.
 *
 * ============================================================
 * PROHIBICIÓN EXPLÍCITA (§1 del prompt de Fase G.1)
 * ============================================================
 * Ningún valor de este archivo proviene de un expediente real. Nombres,
 * documentos, NIT, valores y narrativa son 100% inventados y no
 * corresponden a ninguna persona ni empresa real. Los identificadores
 * (documento "1000000001", NIT "800111222", etc.) usan patrones
 * deliberadamente distintos de cualquier documento visto durante el
 * benchmark real de Fase F/F.1 (nunca reutilizar esos NIT/documentos).
 *
 * Este módulo es puro (sin Dexie, sin React): solo construye datos y
 * buffers en memoria. `goldenCase.test.ts` es quien los persiste a través
 * del repositorio real para demostrar coherencia end-to-end.
 */
import * as XLSX from 'xlsx';
import type {
  LocalFileInput,
  SavePropertyExpenseInput,
  SaveRentalActivityInput,
  SaveTaxDependentInput,
  SaveTaxPropertyInput,
} from './repository';

export const GOLDEN_CASE_PROFILE = {
  alias: 'Persona Sintetica Golden Case AG 2025',
  taxpayerName: 'PERSONA SINTETICA GOLDEN CASE',
  /** Documento 100% ficticio; nunca coincide con un documento real. */
  documentNumber: '1000000001',
  documentType: 'CC' as const,
  taxYear: 2025,
  priorTaxYear: 2024,
  /** Empleador ficticio, coherente entre la exógena y el Formulario 220. */
  employer: { taxId: '800111222', name: 'Empresa Empleadora Sintetica SAS' },
  /** Banco ficticio, coherente entre la exógena y el certificado consolidado. */
  bank: { taxId: '900222333', name: 'Banco Sintetico Nacional S.A.' },
  /** Fondo de cesantías ficticio. */
  severanceFund: { taxId: '901444555', name: 'Fondo Sintetico de Cesantias S.A.' },
  /** Fondo de vivienda ficticio (housing_interest nunca reportado en exógena). */
  housingFund: { taxId: '860666777', name: 'Fondo Sintetico de Vivienda S.A.' },
  /** Administrador de PH ficticio. */
  propertyAdministration: { name: 'Conjunto Residencial Sintetico PH' },
  /** Dos entidades ficticias que producen la ambigüedad deliberada (§7.G). */
  ambiguousBankOne: { taxId: '900777888', name: 'Cooperativa Sintetica de Ahorro' },
  ambiguousBankTwo: { taxId: '900999111', name: 'Fondo Sintetico de Inversion Colectiva' },
} as const;

/** Valores exógenos AG 2025 (§5/§7 del prompt). Todos ficticios. */
export const GOLDEN_EXOGENOUS_VALUES = {
  /** Tope 1 — Ingresos brutos: coherente con salarios + rendimientos. */
  thresholdIncome: 56_800_000,
  /** Tope 2 — Patrimonio bruto. */
  thresholdAssets: 300_000_000,
  /** Tope 3 — Consumos con tarjeta. */
  thresholdCardConsumption: 8_000_000,
  /** Tope 4 — Consignaciones bancarias. */
  thresholdBankMovements: 20_000_000,
  /** Tope 5 — Compras y consumos, coherente con el total neto de la FE (§8). */
  thresholdPurchases: 5_800_000,
  /** A. Rendimientos financieros — exact_match. */
  financialIncome: 1_800_000,
  /** B. Retención en la fuente — rounding_match (documento con centavos). */
  withholding: 68_000,
  /** C. Saldo cuenta bancaria — minor_difference ($80 de diferencia). */
  bankBalance: 32_500_000,
  /** Aporte patronal a cesantías — coherente con el certificado. */
  severanceContribution: 4_200_000,
  /** F. Aportes obligatorios a pensión — exogenous-only (sin certificado). */
  pensionContribution: 2_400_000,
  /** Salarios — coherente con el Formulario 220. */
  employmentIncome: 55_000_000,
  /** G. Ambigüedad deliberada: dos registros con el MISMO valor. */
  ambiguousValue: 950_000,
} as const;

export interface DianRecordSpec {
  reportingDocument?: string;
  reportingName?: string;
  detail: string;
  value: number;
}

/**
 * Registros de la exógena AG 2025 (formato "Persona que reporta", el mismo
 * usado en todos los E2E existentes). Diseñados deliberadamente para
 * producir los siete escenarios de reconciliación de §7 del prompt — ver
 * `docs/SYNTHETIC_SAMPLE_CASE.md` para la tabla completa.
 */
export const GOLDEN_EXOGENOUS_RECORDS: readonly DianRecordSpec[] = [
  {
    reportingDocument: GOLDEN_CASE_PROFILE.employer.taxId,
    reportingName: GOLDEN_CASE_PROFILE.employer.name,
    detail: 'Salarios',
    value: GOLDEN_EXOGENOUS_VALUES.employmentIncome,
  },
  {
    reportingDocument: GOLDEN_CASE_PROFILE.bank.taxId,
    reportingName: GOLDEN_CASE_PROFILE.bank.name,
    detail: 'Rendimientos financieros',
    value: GOLDEN_EXOGENOUS_VALUES.financialIncome,
  },
  {
    reportingDocument: GOLDEN_CASE_PROFILE.bank.taxId,
    reportingName: GOLDEN_CASE_PROFILE.bank.name,
    detail: 'Retencion en la fuente',
    value: GOLDEN_EXOGENOUS_VALUES.withholding,
  },
  {
    reportingDocument: GOLDEN_CASE_PROFILE.bank.taxId,
    reportingName: GOLDEN_CASE_PROFILE.bank.name,
    detail: 'Saldo cuenta bancaria',
    value: GOLDEN_EXOGENOUS_VALUES.bankBalance,
  },
  {
    reportingDocument: GOLDEN_CASE_PROFILE.severanceFund.taxId,
    reportingName: GOLDEN_CASE_PROFILE.severanceFund.name,
    detail: 'Aporte a cesantias',
    value: GOLDEN_EXOGENOUS_VALUES.severanceContribution,
  },
  {
    reportingDocument: '800555666',
    reportingName: 'Administradora de Pensiones Sintetica S.A.',
    detail: 'Aportes obligatorios a pension a cargo del trabajador',
    value: GOLDEN_EXOGENOUS_VALUES.pensionContribution,
  },
  // G. Ambigüedad deliberada: dos registros del mismo concepto y valor,
  // reportados por entidades distintas — un único candidato documental
  // que no distinga la entidad no podrá elegir entre ambos (§7.G).
  {
    reportingDocument: GOLDEN_CASE_PROFILE.ambiguousBankOne.taxId,
    reportingName: GOLDEN_CASE_PROFILE.ambiguousBankOne.name,
    detail: 'Rendimientos financieros',
    value: GOLDEN_EXOGENOUS_VALUES.ambiguousValue,
  },
  {
    reportingDocument: GOLDEN_CASE_PROFILE.ambiguousBankTwo.taxId,
    reportingName: GOLDEN_CASE_PROFILE.ambiguousBankTwo.name,
    detail: 'Rendimientos financieros',
    value: GOLDEN_EXOGENOUS_VALUES.ambiguousValue,
  },
];

/** Construye el libro exógeno AG 2025 en el formato "Persona que reporta" (mismo usado en todos los E2E). */
export function buildGoldenExogenousWorkbook(): ArrayBuffer {
  const rows: (string | number | null)[][] = [
    ['Consulta de informacion exogena - CASO SINTETICO GOLDEN CASE'],
    [null, null, null, null, null, null, 'Fecha Reporte:', '2026-01-20'],
    ['Fecha corte del proceso:', null, '2026-01-15'],
    ['Ano al que se refiere la consulta:', null, GOLDEN_CASE_PROFILE.taxYear],
    ['Identificacion del consultante'],
    ['Tipo de documento:', null, GOLDEN_CASE_PROFILE.documentType],
    ['Identificacion:', null, GOLDEN_CASE_PROFILE.documentNumber],
    ['Nombres / Razon social:', null, GOLDEN_CASE_PROFILE.taxpayerName],
    [],
    ['Advertencia: caso 100% sintetico, sin relacion con expedientes reales.'],
    ['Informacion sintetica generada para demo y regresion (Sprint 2.4, Fase G.1).'],
    [],
    ['Persona que reporta', null, 'Informacion reportada'],
    [
      'NIT',
      'Nombre / Razon Social',
      'NIT',
      'Nombre/Razon Social reportada por el tercero',
      'Detalle',
      'Valor',
      'Uso declaracion Sugerida',
    ],
    [null, null, null, null, 'Patrimonio bruto', GOLDEN_EXOGENOUS_VALUES.thresholdAssets],
    [null, null, null, null, 'Ingresos brutos', GOLDEN_EXOGENOUS_VALUES.thresholdIncome],
    [null, null, null, null, 'Consumos con tarjeta', GOLDEN_EXOGENOUS_VALUES.thresholdCardConsumption],
    [null, null, null, null, 'Compras y consumos', GOLDEN_EXOGENOUS_VALUES.thresholdPurchases],
    [null, null, null, null, 'Consignaciones bancarias', GOLDEN_EXOGENOUS_VALUES.thresholdBankMovements],
    ...GOLDEN_EXOGENOUS_RECORDS.map((record) => [
      record.reportingDocument ?? null,
      record.reportingName ?? null,
      GOLDEN_CASE_PROFILE.documentNumber,
      GOLDEN_CASE_PROFILE.taxpayerName,
      record.detail,
      record.value,
      null,
    ]),
  ];
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!merges'] = [
    XLSX.utils.decode_range('A6:B6'),
    XLSX.utils.decode_range('A7:B7'),
    XLSX.utils.decode_range('A8:B8'),
    XLSX.utils.decode_range('A13:B13'),
    XLSX.utils.decode_range('C13:G13'),
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Reporte');
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx', compression: false }) as ArrayBuffer;
}

/**
 * Documentos sintéticos (§6 del prompt). Representaciones TEXTUALES (nunca
 * PDF binario, §6: "preferir fixtures textuales/estructurados pequeños").
 * `expectedAdapterId` documenta qué adaptador debería resolver cada uno
 * (verificado en `goldenCase.test.ts`).
 */
export interface GoldenDocumentSpec {
  key: string;
  kind:
    | 'form_220'
    | 'consolidated_tax_certificate'
    | 'severance_certificate'
    | 'housing_interest_certificate'
    | 'property_tax_certificate'
    | 'property_administration_certificate';
  label: string;
  /** Una página de texto por entrada (una sola página basta para estos fixtures). */
  pages: readonly string[];
}

export const GOLDEN_DOCUMENTS: readonly GoldenDocumentSpec[] = [
  {
    key: 'form-220',
    kind: 'form_220',
    label: 'Formulario 220 — certificado de ingresos y retenciones laborales',
    pages: [
      [
        'Formulario 220 - Certificado de ingresos y retenciones laborales',
        `Empresa Empleadora Sintetica SAS - NIT ${GOLDEN_CASE_PROFILE.employer.taxId}`,
        'Ano gravable 2025',
        `Total ingresos laborales durante el periodo: $ ${GOLDEN_EXOGENOUS_VALUES.employmentIncome.toLocaleString('es-CO')}`,
        'Retenciones en la fuente practicadas: $ 4.600.000',
      ].join('\n'),
    ],
  },
  {
    key: 'consolidated-financial',
    kind: 'consolidated_tax_certificate',
    label: 'Certificado tributario consolidado — Banco Sintetico Nacional S.A.',
    pages: [
      [
        `Certificado tributario y de retenciones - ${GOLDEN_CASE_PROFILE.bank.name}`,
        'Ano gravable 2025',
        // A. exact_match: sin centavos, coincide exactamente con la exógena.
        `Rendimientos financieros durante el periodo: $ ${GOLDEN_EXOGENOUS_VALUES.financialIncome.toLocaleString('es-CO')}`,
        // B. rounding_match: centavos que redondean al mismo peso.
        'Retencion en la fuente sobre rendimientos financieros: $ 68.000,40',
        // C. minor_difference: $80 de diferencia frente a la exógena.
        'Saldo cuenta de ahorros a 31 de diciembre de 2025: $ 32.500.080',
        // G. ambigüedad deliberada: mismo valor que DOS registros exógenos
        // distintos, sin nombrar una entidad que permita desambiguar.
        `Rendimientos financieros consolidados: $ ${GOLDEN_EXOGENOUS_VALUES.ambiguousValue.toLocaleString('es-CO')}`,
      ].join('\n'),
    ],
  },
  {
    key: 'severance',
    kind: 'severance_certificate',
    label: 'Certificado de cesantias — Fondo Sintetico de Cesantias S.A.',
    pages: [
      [
        `Certificado de cesantias - ${GOLDEN_CASE_PROFILE.severanceFund.name}`,
        'Ano gravable 2025',
        `Aportes a cesantias consignados durante el periodo: $ ${GOLDEN_EXOGENOUS_VALUES.severanceContribution.toLocaleString('es-CO')}`,
      ].join('\n'),
    ],
  },
  {
    key: 'housing-interest',
    kind: 'housing_interest_certificate',
    label: 'Certificado de intereses de vivienda — Fondo Sintetico de Vivienda S.A.',
    pages: [
      [
        `Certificado de credito hipotecario - ${GOLDEN_CASE_PROFILE.housingFund.name}`,
        'Ano gravable 2025',
        // E. document_only: la vivienda NUNCA se reporta en exógena.
        'Intereses pagados durante el periodo: $ 3.200.000',
        'Saldo de la obligacion a diciembre: $ 45.000.000',
      ].join('\n'),
    ],
  },
  {
    key: 'property-tax',
    kind: 'property_tax_certificate',
    label: 'Certificado predial — Apartamento arrendado',
    pages: [
      [
        'Certificado catastral y predial - Apartamento arrendado',
        'Ano gravable 2025',
        'Avaluo catastral: $ 250.000.000',
        'Impuesto predial pagado: $ 1.100.000',
        'Porcentaje de participacion: 100%',
      ].join('\n'),
    ],
  },
  {
    key: 'property-administration',
    kind: 'property_administration_certificate',
    label: 'Cuenta de cobro de administracion — Conjunto Residencial Sintetico PH',
    pages: [
      [
        `Cuenta de cobro de administracion - ${GOLDEN_CASE_PROFILE.propertyAdministration.name}`,
        'Ano gravable 2025',
        'Cuota mensual de administracion: $ 320.000',
        'Total anual de administracion pagado: $ 3.840.000',
      ].join('\n'),
    ],
  },
];

/**
 * Declaración anterior AG 2024 (§4 del prompt), en el mismo formato de
 * texto plano usado por `extractPriorYearForm210` en los E2E existentes
 * (nunca reutiliza los valores oráculo reales del benchmark).
 */
export const GOLDEN_PRIOR_YEAR_TEXT_LINES: readonly string[] = [
  'Declaracion de Renta y Complementarios - Formulario 210',
  'Ano gravable 2024',
  `NIT ${GOLDEN_CASE_PROFILE.documentNumber}`,
  'Numero de formulario 1109988776601',
  'Fecha de presentacion el 2025-08-12',
  '29 Patrimonio bruto 260.000.000',
  '89 Renta liquida gravable cedula general 62.500.000',
  '130 Anticipo de renta liquidado el ano anterior 1.200.000',
  '132 Retenciones del ano gravable 4.100.000',
  '133 Anticipo de renta por el ano gravable siguiente 950.000',
  '137 Saldo a favor 0',
];

/** Factura electrónica sintética (§8 del prompt): 3 CUFE únicos, una compra no elegible (pago en efectivo). */
const FE_HEADER_ROW = [
  'Identificacion Emisor Factura',
  'Nombre Emisor Factura',
  'Fecha Emision',
  'Num_factura_venta',
  'Valor Facturado',
  'Valor Notas Credito',
  'Valor Notas Debito',
  'Valor Factura / Afectada con Notas Debito - Credito',
  'Valor Susceptible Beneficio',
  'Medios De Pago',
  'CUFE',
];

function goldenCufe(seed: number): string {
  const hex = (seed * 2654435761 % 0xffffffff).toString(16).padStart(8, '0');
  return hex.repeat(12).slice(0, 96);
}

export const GOLDEN_ELECTRONIC_INVOICE_EXPECTATIONS = {
  invoiceCount: 3,
  grossTotalCop: 2_000_000 + 3_500_000 + 800_000,
  creditNoteTotalCop: 500_000,
  netTotalCop: 2_000_000 + 3_000_000 + 800_000,
  eligibleBenefitTotalCop: 2_000_000 + 3_000_000,
} as const;

export function buildGoldenElectronicInvoiceWorkbook(): ArrayBuffer {
  const metadataBlock: (string | number | null)[][] = [
    ['Reporte de facturas electronicas - CASO SINTETICO GOLDEN CASE'],
    ['Direccion de Impuestos y Aduanas Nacionales'],
    ['Reporte orientativo, sin relacion con expedientes reales.'],
    ['Ano gravable:', GOLDEN_CASE_PROFILE.taxYear],
    [],
  ];
  const rows: (string | number | null)[][] = [
    [
      '900333111',
      'Proveedor Sintetico Golden Uno SAS',
      '2025-02-10',
      'FGC-0001',
      '2.000.000',
      '0',
      '0',
      '2.000.000',
      '2.000.000',
      'Tarjeta debito o credito',
      goldenCufe(1),
    ],
    [
      '900333222',
      'Proveedor Sintetico Golden Dos SAS',
      '2025-04-05',
      'FGC-0002',
      '3.500.000',
      '500.000',
      '0',
      '3.000.000',
      '3.000.000',
      'Transferencia electronica',
      goldenCufe(2),
    ],
    // Anomalía comprensible: pago en efectivo, sin beneficio (§8).
    [
      '900333333',
      'Proveedor Sintetico Golden Tres SAS',
      '2025-06-18',
      'FGC-0003',
      '800.000',
      '0',
      '0',
      '800.000',
      '0',
      'Efectivo',
      goldenCufe(3),
    ],
  ];
  const sheet = [...metadataBlock, FE_HEADER_ROW, ...rows];
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(sheet);
  XLSX.utils.book_append_sheet(wb, ws, 'Facturas');
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx', compression: false }) as ArrayBuffer;
}

/** Envuelve un ArrayBuffer como `LocalFileInput` (repository.ts) sin tocar el DOM. */
export function toLocalFileInput(name: string, buffer: ArrayBuffer): LocalFileInput {
  return {
    name,
    size: buffer.byteLength,
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    arrayBuffer: async () => buffer,
  };
}

/**
 * Dependiente sintético (§9 del prompt): hijo menor elegible con soporte
 * de registro civil, coherente con `employmentIncomeNature: 'labor_relation'`
 * (ambos beneficios coexisten automáticamente, sin decisión adicional).
 */
export const GOLDEN_DEPENDENT_INPUT: SaveTaxDependentInput = {
  fullName: 'Hijo Menor Sintetico Golden Case',
  documentType: 'RC',
  documentNumber: '1000000099',
  relationship: 'child_minor',
  dateOfBirth: '2016-03-10',
  dependencyType: 'not_applicable',
  studentStatus: 'not_applicable',
  monthsClaimed: 12,
};

/**
 * Inmueble sintético (§10 del prompt): apartamento arrendado todo el año,
 * con ingreso vinculado manualmente (§ limitación documentada en
 * `docs/PROPERTY_INCOME_EXPENSES_2025.md`: la UI aún no ofrece un
 * selector para vincular un registro exógeno/hecho documental existente)
 * y un gasto de administración con soporte suficiente.
 */
export const GOLDEN_PROPERTY_INPUT: SaveTaxPropertyInput = {
  label: 'Apartamento arrendado (Golden Case)',
  propertyType: 'apartment',
  use: 'rented',
  ownershipPercentage: 100,
  taxYear: GOLDEN_CASE_PROFILE.taxYear,
  cadastralValue: 250_000_000,
};

export const GOLDEN_RENTAL_ACTIVITY_INPUT: SaveRentalActivityInput = {
  from: '2025-01-01',
  to: '2025-12-31',
  monthsCovered: 12,
};

export const GOLDEN_RENTAL_INCOME_AMOUNT_COP = 18_000_000;

export const GOLDEN_PROPERTY_EXPENSE_INPUT: SavePropertyExpenseInput = {
  expenseType: 'administration_fee',
  amountCop: 320_000,
  supportStatus: 'sufficient',
  supportTypes: ['administration_account_statement'],
};

/**
 * Salud complementaria sintética (Sprint 2.4, Fase H, §23 del prompt):
 * medicina prepagada del contribuyente en dos meses (uno bajo el tope,
 * otro que lo supera) y un seguro de salud del dependiente ya registrado
 * (`GOLDEN_DEPENDENT_INPUT`), vinculado explícitamente — nunca se asume
 * elegibilidad solo por la relación textual (§4/§14).
 */
export const GOLDEN_HEALTH_PROVIDER = { name: 'Medicina Prepagada Sintetica Golden Case SAS' } as const;

/** Enero: pago bajo el tope mensual de 16 UVT (~$ 796.784). */
export const GOLDEN_HEALTH_PAYMENT_JANUARY_COP = 300_000;
/** Junio: pago que SUPERA el tope mensual — demuestra el recorte explicado en la UI (§19). */
export const GOLDEN_HEALTH_PAYMENT_JUNE_COP = 1_200_000;
/** Seguro de salud del dependiente (marzo), vinculado a `GOLDEN_DEPENDENT_INPUT`. */
export const GOLDEN_HEALTH_PAYMENT_DEPENDENT_COP = 250_000;

export const GOLDEN_HEALTH_MONTHLY_CAP_COP = Math.round(16 * 49_799);

/** Resultado esperado del tope agregado (§23): enero íntegro, junio recortado, marzo íntegro. */
export const GOLDEN_HEALTH_EXPECTED_ANNUAL_ELIGIBLE_COP =
  GOLDEN_HEALTH_PAYMENT_JANUARY_COP + GOLDEN_HEALTH_MONTHLY_CAP_COP + GOLDEN_HEALTH_PAYMENT_DEPENDENT_COP;
