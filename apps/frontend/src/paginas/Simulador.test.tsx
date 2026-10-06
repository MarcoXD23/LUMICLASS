import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { estadoSalonEjemplo, instalarApiFalsa, simuladorEjemplo } from '../pruebas/apiFalsa';
import { Simulador } from './Simulador';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const apiBase = () => ({
  'GET /salon/estado': { cuerpo: estadoSalonEjemplo() },
  'GET /sim/estado': { cuerpo: simuladorEjemplo },
});

describe('Simulador', () => {
  it('fuerza presencia en una zona', async () => {
    const { llamadas } = instalarApiFalsa({
      ...apiBase(),
      'POST /sim/presencia': (_c) => ({ cuerpo: simuladorEjemplo }),
    });
    render(<Simulador />);
    fireEvent.click(await screen.findByRole('button', { name: /Entra gente/ }));
    await waitFor(() =>
      expect(llamadas.find((l) => l.ruta === '/sim/presencia')?.cuerpo).toEqual({
        zonaId: 'zona-frente',
        presencia: true,
      }),
    );
  });

  it('cambia la respuesta del servo y el estado del sensor', async () => {
    const { llamadas } = instalarApiFalsa({
      ...apiBase(),
      'POST /sim/actuadores/servo-frente': (_c) => ({ cuerpo: simuladorEjemplo }),
      'POST /sim/sensores/sensor-frente': (_c) => ({ cuerpo: simuladorEjemplo }),
    });
    render(<Simulador />);
    fireEvent.change(await screen.findByLabelText('Respuesta del servo de Luces frente'), {
      target: { value: 'sin_respuesta' },
    });
    await waitFor(() =>
      expect(llamadas.find((l) => l.ruta === '/sim/actuadores/servo-frente')?.cuerpo).toEqual({
        respuesta: 'sin_respuesta',
      }),
    );
    fireEvent.change(screen.getByLabelText('Estado del sensor PIR frente'), {
      target: { value: 'falla' },
    });
    await waitFor(() =>
      expect(llamadas.find((l) => l.ruta === '/sim/sensores/sensor-frente')?.cuerpo).toEqual({
        conexion: 'falla',
      }),
    );
  });

  it('reinicia solo si se confirma', async () => {
    const { llamadas } = instalarApiFalsa({
      ...apiBase(),
      'POST /sim/reiniciar': { cuerpo: simuladorEjemplo },
    });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<Simulador />);
    fireEvent.click(await screen.findByRole('button', { name: /Reiniciar simulación/ }));
    await waitFor(() => expect(llamadas.some((l) => l.ruta === '/sim/reiniciar')).toBe(true));
  });

  it('explica que el simulador no está disponible con hardware real', async () => {
    instalarApiFalsa({ 'GET /salon/estado': { cuerpo: estadoSalonEjemplo() } }); // /sim/estado → 404
    render(<Simulador />);
    expect(await screen.findByRole('alert')).toHaveTextContent('DRIVER=simulado');
  });
});
