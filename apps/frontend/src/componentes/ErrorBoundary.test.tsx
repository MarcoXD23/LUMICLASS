import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from './ErrorBoundary';

afterEach(() => {
  vi.restoreAllMocks();
});

let romper = true;
function Fragil() {
  if (romper) throw new Error('fallo de prueba');
  return <p>Pantalla funcionando</p>;
}

describe('ErrorBoundary', () => {
  it('muestra un aviso amigable en lugar de una página en blanco y permite reintentar', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined); // React registra el error
    romper = true;
    render(
      <ErrorBoundary>
        <Fragil />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Algo salió mal al mostrar esta pantalla');

    romper = false;
    fireEvent.click(screen.getByRole('button', { name: 'Volver a intentar' }));
    expect(screen.getByText('Pantalla funcionando')).toBeInTheDocument();
  });
});
