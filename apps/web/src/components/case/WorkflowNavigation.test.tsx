import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WorkflowStepper } from './WorkflowNavigation';
import { deriveWorkflowStages, type WorkflowContext } from '@/lib/workflow';

const context: WorkflowContext = {
  documents: [],
  facts: [],
  reconciliations: [],
  progress: {
    documentCoverage: 0,
    reviewedFacts: 0,
    reconciliation: 0,
    findings: 0,
    matrixPreparation: 0,
    documentCount: 0,
    pendingRequirements: 0,
    openFindings: 0,
    pendingMatrixGroups: 0,
    explanation: [],
  },
  manualMode: false,
  extractionPending: false,
  vatResponsibility: null,
};

describe('stepper accesible', () => {
  it('expone seis etapas, estado actual y explicación de bloqueos', () => {
    render(
      <WorkflowStepper
        stages={deriveWorkflowStages(context, 'fuente')}
        activeStage="fuente"
        onSelect={() => undefined}
      />,
    );
    expect(screen.getByRole('navigation', { name: 'Etapas del expediente' })).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(6);
    expect(screen.getByRole('button', { name: /Fuente/ })).toHaveAttribute('aria-current', 'step');
    expect(screen.getByRole('button', { name: /Extracción/ })).toBeDisabled();
    expect(screen.getByText(/Carga una fuente para habilitar la extracción/)).toBeInTheDocument();
  });

  it('permite activar una etapa disponible con teclado', () => {
    const onSelect = vi.fn();
    render(
      <WorkflowStepper
        stages={deriveWorkflowStages(context, 'fuente')}
        activeStage="fuente"
        onSelect={onSelect}
      />,
    );
    const exportButton = screen.getByRole('button', { name: /Exportación/ });
    exportButton.focus();
    fireEvent.keyDown(exportButton, { key: 'Enter' });
    fireEvent.click(exportButton);
    expect(onSelect).toHaveBeenCalledWith('exportacion');
  });
});
