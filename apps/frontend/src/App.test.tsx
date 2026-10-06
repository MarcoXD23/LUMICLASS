import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import {
  estadoSalonEjemplo,
  instalarApiFalsa,
  redCaida,
  reglasEjemplo,
  saludEjemplo,
  zonaEjemplo,
} from './pruebas/apiFalsa';

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
  it('muestra "API: conectada" y el dashboard', async () => {
    instalarApiFalsa({
      'GET /salud': { cuerpo: saludEjemplo },
      'GET /salon/estado': { cuerpo: estadoSalonEjemplo() },
    });
    renderizar();
    expect(await screen.findByText(/API: conectada · Hardware: simulado/)).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Salón principal' })).toBeInTheDocument();
  });

  it('navega entre páginas con el menú', async () => {
    instalarApiFalsa({
      'GET /salud': { cuerpo: saludEjemplo },
      'GET /salon/estado': { cuerpo: estadoSalonEjemplo() },
      'GET /reglas': { cuerpo: reglasEjemplo },
      'GET /zonas': { cuerpo: [zonaEjemplo()] },
    });
    renderizar();
    fireEvent.click(await screen.findByRole('link', { name: 'Reglas' }));
    expect(await screen.findByRole('heading', { name: 'Reglas automáticas' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: 'Control' }));
    expect(await screen.findByRole('heading', { name: 'Control de luces' })).toBeInTheDocument();
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
