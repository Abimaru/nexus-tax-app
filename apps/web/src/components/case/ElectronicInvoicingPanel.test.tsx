import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { AmountCandidate, ElectronicInvoicePurchase, ElectronicInvoiceReport } from '@nexus-tax/domain';
import { ElectronicInvoicingPanel } from './ElectronicInvoicingPanel';

vi.mock('@/lib/repository', () => ({
  importElectronicInvoiceReport: vi.fn(),
  removeElectronicInvoiceReport: vi.fn(),
  setElectronicInvoicingBenefitOptedOut: vi.fn(),
  decideElectronicInvoicePurchaseBenefit: vi.fn(),
}));

function amount(roundedTaxValue: number, rawText = String(roundedTaxValue)): AmountCandidate {
  return {
    rawText,
    normalizedText: String(roundedTaxValue),
    parsedValue: roundedTaxValue,
    decimalValue: roundedTaxValue,
    roundedTaxValue,
    detectedLocale: 'es_CO',
    decimalSeparator: '.',
    thousandsSeparator: ',',
    parsingStrategy: 'grouped_integer',
    confidence: 'high',
    warnings: [],
    sourceDocumentId: null,
    page: null,
    boundingBox: null,
    extractionMethod: 'imported',
    originalEvidence: rawText,
    parserVersion: '2.0.0',
  };
}

function report(overrides: Partial<ElectronicInvoiceReport> = {}): ElectronicInvoiceReport {
  return {
    id: 'fe-report-1',
    caseId: 'case-1',
    taxYear: 2025,
    sourceKind: 'dian_electronic_invoice_report',
    sourceDocumentId: null,
    fileName: 'facturas.xlsx',
    detectedTitle: 'CUFE · Valor Facturado',
    headerRowIndex: 25,
    headerConfidence: 0.9,
    importedAt: '2026-09-06T00:00:00.000Z',
    parserVersion: '1.0.0',
    rowCount: 1,
    totals: {
      rowCount: 1,
      uniqueInvoiceCount: 1,
      grossTotalCop: 1_000_000,
      creditNoteTotalCop: 0,
      debitNoteTotalCop: 0,
      netTotalCop: 1_000_000,
      eligibleBenefitTotalCop: 1_000_000,
      countByPaymentMethod: { electronic: 1, cash: 0, other: 0, data_error: 0, not_informed: 0 },
      countEligibleZero: 0,
      duplicateExactCount: 0,
      duplicateConflictingCount: 0,
      missingCufeCount: 0,
      anomalyCount: 0,
    },
    reconciliation: null,
    processingStatus: 'processed',
    benefitOptedOut: false,
    warnings: [],
    ...overrides,
  };
}

function purchase(overrides: Partial<ElectronicInvoicePurchase> = {}): ElectronicInvoicePurchase {
  return {
    id: 'fe-purchase-1',
    reportId: 'fe-report-1',
    caseId: 'case-1',
    sourceRow: 26,
    issuerTaxId: '900111222',
    issuerName: 'Proveedor Sintético SAS',
    issuedAt: '2025-02-10',
    invoiceNumber: 'FES-0001',
    rawCufe: 'a'.repeat(96),
    normalizedCufe: 'a'.repeat(96),
    cufeStatus: 'unique',
    grossValue: amount(1_000_000),
    creditNoteValue: amount(0, '0'),
    debitNoteValue: amount(0, '0'),
    officialNetValue: amount(1_000_000),
    computedNetValueCop: 1_000_000,
    netReconciliationStatus: 'exact',
    eligibleBenefitValue: amount(1_000_000),
    paymentMethodRaw: 'Tarjeta débito o crédito',
    paymentMethodCategory: 'electronic',
    benefitDecision: 'eligible',
    benefitDecisionReason: null,
    createdAt: '2026-09-06T00:00:00.000Z',
    ...overrides,
  };
}

describe('ElectronicInvoicingPanel (Sprint 2.4, Fase D)', () => {
  it('muestra el estado "No cargado" cuando no hay reporte', () => {
    render(
      <ElectronicInvoicingPanel
        caseId="case-1"
        taxYear={2025}
        purchases={[]}
        tasks={[]}
        advanced={false}
        onToggleAdvanced={() => {}}
      />,
    );
    expect(screen.getByText('No cargado')).toBeInTheDocument();
  });

  it('muestra la tarjeta resumen con los totales del reporte', () => {
    render(
      <ElectronicInvoicingPanel
        caseId="case-1"
        taxYear={2025}
        report={report()}
        purchases={[purchase()]}
        tasks={[]}
        advanced={false}
        onToggleAdvanced={() => {}}
      />,
    );
    expect(screen.getByText('facturas.xlsx')).toBeInTheDocument();
    expect(screen.getAllByText('$ 1.000.000').length).toBeGreaterThan(0);
  });

  it('nunca muestra el CUFE completo en modo normal (solo enmascarado en el detalle avanzado)', () => {
    render(
      <ElectronicInvoicingPanel
        caseId="case-1"
        taxYear={2025}
        report={report()}
        purchases={[purchase()]}
        tasks={[]}
        advanced={false}
        onToggleAdvanced={() => {}}
      />,
    );
    expect(screen.queryByText('a'.repeat(96))).not.toBeInTheDocument();
  });

  it('ofrece la acción "No usaré deducción por facturación electrónica"', () => {
    render(
      <ElectronicInvoicingPanel
        caseId="case-1"
        taxYear={2025}
        report={report()}
        purchases={[purchase()]}
        tasks={[]}
        advanced={false}
        onToggleAdvanced={() => {}}
      />,
    );
    expect(
      screen.getByRole('button', { name: 'No usaré deducción por facturación electrónica' }),
    ).toBeInTheDocument();
  });
});
