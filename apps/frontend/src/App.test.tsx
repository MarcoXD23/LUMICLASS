import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';

describe('App', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('muestra "API: conectada" cuando la API responde', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ estado: 'ok', driver: 'simulado', fecha: '' }), {
          status: 200,
        }),
      ),
    );
    render(<App />);
    expect(await screen.findByText('API: conectada')).toBeInTheDocument();
    expect(screen.getByText('Hardware: simulado')).toBeInTheDocument();
  });

  it('muestra un aviso si la API está caída', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    render(<App />);
    expect(await screen.findByText('Sin conexión con el servidor')).toBeInTheDocument();
  });
});
