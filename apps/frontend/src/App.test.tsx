import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import {
  estadoSalonEjemplo,
  EventSourceFalso,
  instalarApiFalsa,
  luzEjemplo,
  redCaida,
  reglasEjemplo,
  saludEjemplo,
  zonaEjemplo,
} from './pruebas/apiFalsa';

beforeEach(() => {
  EventSourceFalso.instancias = [];
});
afterEach(() => {
  vi.unstubAllGlobals();
});

const renderizar = (ruta = '/') =>
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <App />
    </MemoryRouter>,
  );

describe('App', () => {
  it('muestra el hardware y el dashboard (sin tiempo real, actualiza cada 5 s)', async () => {
    instalarApiFalsa({
      'GET /salud': { cuerpo: saludEjemplo },
      'GET /salon/estado': { cuerpo: estadoSalonEjemplo() },
    });
    renderizar();
    expect(await screen.findByText(/Hardware: simulado/)).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Salón principal' })).toBeInTheDocument();
    expect(screen.getByText('Actualiza cada 5 s')).toBeInTheDocument();
  });

  it('se actualiza al instante cuando llega un evento en tiempo real', async () => {
    vi.stubGlobal('EventSource', EventSourceFalso);
    let encendida = false;
    instalarApiFalsa({
      'GET /salud': { cuerpo: saludEjemplo },
      'GET /salon/estado': async () => ({
        cuerpo: estadoSalonEjemplo({
          resumen: {
            lucesEncendidas: encendida ? 1 : 0,
            lucesTotales: 1,
            sensoresActivos: 1,
            sensoresTotales: 1,
          },
          zonas: [zonaEjemplo({ luces: [luzEjemplo({ estadoReal: encendida ? 'on' : 'off' })] })],
        }),
      }),
    });
    renderizar();
    expect(await screen.findByText('0 de 1 encendidas')).toBeInTheDocument();

    act(() => EventSourceFalso.ultima().emitir('conectado', {}));
    expect(await screen.findByText('En vivo')).toBeInTheDocument();

    encendida = true;
    act(() => EventSourceFalso.ultima().emitir('evento', { id: 9, tipo: 'luz_encendida' }));
    expect(await screen.findByText('1 de 1 encendidas')).toBeInTheDocument();
  });

  it('navega entre páginas con el menú', async () => {
    instalarApiFalsa({
      'GET /salud': { cuerpo: saludEjemplo },
      'GET /salon/estado': { cuerpo: estadoSalonEjemplo() },
      'GET /reglas': { cuerpo: reglasEjemplo },
      'GET /zonas': { cuerpo: [zonaEjemplo()] },
      'GET /eventos': { cuerpo: { datos: [], pagina: 1, porPagina: 20, total: 0 } },
    });
    renderizar();
    fireEvent.click(await screen.findByRole('link', { name: 'Reglas' }));
    expect(await screen.findByRole('heading', { name: 'Reglas automáticas' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: 'Control' }));
    expect(await screen.findByRole('heading', { name: 'Control de luces' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: 'Historial' }));
    expect(await screen.findByRole('heading', { name: 'Historial' })).toBeInTheDocument();
  });

  it('oculta el simulador cuando el hardware es real', async () => {
    instalarApiFalsa({
      'GET /salud': { cuerpo: { ...saludEjemplo, driver: 'real' } },
      'GET /salon/estado': { cuerpo: estadoSalonEjemplo() },
    });
    renderizar();
    expect(await screen.findByText(/Hardware: real/)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Simulador' })).not.toBeInTheDocument();
  });

  it('muestra un aviso si la API está caída', async () => {
    instalarApiFalsa({ 'GET /salud': redCaida, 'GET /salon/estado': redCaida });
    renderizar();
    expect(
      await screen.findByText('Sin conexión con el servidor', { selector: 'p' }),
    ).toBeInTheDocument();
  });

  it('redirige rutas desconocidas al inicio', async () => {
    instalarApiFalsa({
      'GET /salud': { cuerpo: saludEjemplo },
      'GET /salon/estado': { cuerpo: estadoSalonEjemplo() },
    });
    renderizar('/no-existe');
    expect(await screen.findByRole('heading', { name: 'Salón principal' })).toBeInTheDocument();
  });
});
