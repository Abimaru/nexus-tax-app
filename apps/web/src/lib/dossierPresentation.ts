import { DOCUMENT_CATALOG, type ProductType, type TaxCaseStatus } from '@nexus-tax/domain';

export const CASE_STATUS_LABEL: Record<TaxCaseStatus, string> = {
  new: 'Nuevo',
  collecting_documents: 'Recopilando documentos',
  under_analysis: 'En análisis',
  pending_information: 'Pendiente de información',
  ready_for_review: 'Listo para revisión',
  closed: 'Cerrado',
};

export const DOCUMENT_KIND_LABEL = Object.fromEntries(
  DOCUMENT_CATALOG.map((entry) => [entry.kind, entry.name]),
) as Record<(typeof DOCUMENT_CATALOG)[number]['kind'], string>;

export const PRODUCT_LABEL: Record<ProductType, string> = {
  checking_account: 'Cuenta corriente',
  savings_account: 'Cuenta de ahorros',
  credit_card: 'Tarjeta de crédito',
  mortgage_loan: 'Crédito de vivienda',
  consumer_loan: 'Crédito de consumo',
  cdt: 'CDT',
  investment_fund: 'Fondo de inversión',
  employee_fund: 'Fondo de empleados',
  severance: 'Cesantías',
  property: 'Inmueble',
  employment_income: 'Ingreso laboral',
  prize: 'Premio',
  other: 'Otro',
  unidentified: 'Producto por identificar',
};
