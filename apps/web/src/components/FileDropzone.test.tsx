import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FileDropzone } from './FileDropzone';

describe('FileDropzone compartido', () => {
  it('abre el selector con teclado y acepta un formato permitido', () => {
    const onSelect = vi.fn();
    render(
      <FileDropzone
        id="fixture-file"
        variant="document"
        file={null}
        allowedExtensions={['pdf']}
        onSelect={onSelect}
      />,
    );
    const zone = screen.getByRole('button');
    const input = document.querySelector<HTMLInputElement>('#fixture-file')!;
    const click = vi.spyOn(input, 'click');
    zone.focus();
    fireEvent.keyDown(zone, { key: 'Enter' });
    expect(click).toHaveBeenCalled();
    fireEvent.change(input, { target: { files: [new File(['pdf'], 'soporte.pdf')] } });
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it('muestra un error humano para un formato rechazado', () => {
    const onSelect = vi.fn();
    render(
      <FileDropzone
        id="fixture-invalid"
        variant="evidence"
        file={null}
        allowedExtensions={['pdf']}
        onSelect={onSelect}
      />,
    );
    fireEvent.change(document.querySelector('#fixture-invalid')!, {
      target: { files: [new File(['x'], 'soporte.exe')] },
    });
    expect(screen.getByRole('alert')).toHaveTextContent('Formato no permitido');
    expect(onSelect).not.toHaveBeenCalled();
  });
});
