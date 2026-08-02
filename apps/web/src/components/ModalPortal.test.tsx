import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ModalPortal } from './ModalPortal';

describe('ModalPortal', () => {
  it('renderiza fuera del ancestro recortado, bloquea el fondo y permite cerrar con Escape', () => {
    const onClose = vi.fn();
    const { unmount } = render(
      <div data-testid="contenedor-recortado">
        <ModalPortal onClose={onClose}>
          <div role="dialog" aria-label="Diálogo de prueba">
            Contenido
          </div>
        </ModalPortal>
      </div>,
    );

    const dialog = screen.getByRole('dialog', { name: 'Diálogo de prueba' });
    expect(dialog.closest('[data-testid="contenedor-recortado"]')).toBeNull();
    expect(dialog.parentElement).toBe(document.body);
    expect(document.body.style.overflow).toBe('hidden');

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();

    unmount();
    expect(document.body.style.overflow).toBe('');
  });
});
