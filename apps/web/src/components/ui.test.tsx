import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState, SeverityBadge, formatCurrencyCOP } from '@nexus-tax/ui';

describe('componentes de UI compartidos', () => {
  it('EmptyState muestra título y descripción', () => {
    render(<EmptyState title="Sin datos" description="Carga un archivo" />);
    expect(screen.getByText('Sin datos')).toBeInTheDocument();
    expect(screen.getByText('Carga un archivo')).toBeInTheDocument();
  });

  it('SeverityBadge no depende solo del color (incluye texto)', () => {
    render(<SeverityBadge severity="error" />);
    expect(screen.getByText('Error')).toBeInTheDocument();
  });

  it('formatea moneda colombiana', () => {
    expect(formatCurrencyCOP(1250000)).toContain('1.250.000');
  });
});
