import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  estadoSalonEjemplo,
  instalarApiFalsa,
  luzEjemplo,
  redCaida,
  zonaEjemplo,
} from '../pruebas/apiFalsa';
import { Inicio } from './Inicio';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Inicio (dashboard)', () => {
  it('muestra el salón vacío con luces apagadas y sin alertas', async () => {
    instalarApiFalsa({ 'GET /salon/estado': { cuerpo: estadoSalonEjemplo() } });
    render(<Inicio />);
    expect(await screen.findByRole('heading', { name: 'Salón principal' })).toBeInTheDocument();
    expect(screen.getAllByText('Vacío').length).toBeGreaterThan(0);
    expect(screen.getByText('0 de 1 encendidas')).toBeInTheDocument();
    expect(screen.getByText(/Sin alertas/)).toBeInTheDocument();
    expect(screen.queryByText('Personas detectadas')).not.toBeInTheDocument();
  });

  it('muestra ocupado, luces encendidas, personas y alertas', async () => {
    instalarApiFalsa({
      'GET /salon/estado': {
        cuerpo: estadoSalonEjemplo({
          ocupado: true,
          personasDetectadas: 12,
          resumen: { lucesEncendidas: 1, lucesTotales: 1, sensoresActivos: 0, sensoresTotales: 1 },
          zonas: [
            zonaEjemplo({
              ocupada: true,
              modo: 'manual',
              luces: [luzEjemplo({ estadoReal: 'on' })],
            }),
          ],
          alertas: [
            {
              severidad: 'error',
              entidad: 'sensor',
              entidadId: 's',
              mensaje: 'Sensor "PIR frente" en falla',
            },
          ],
        }),
      },
    });
    render(<Inicio />);
    expect(await screen.findByText('1 de 1 encendidas')).toBeInTheDocument();
    expect(screen.getAllByText('Ocupado').length).toBeGreaterThan(0);
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('Manual')).toBeInTheDocument();
    expect(screen.getByText('Sensor "PIR frente" en falla')).toBeInTheDocument();
    expect(screen.getByText('Luces frente: encendida')).toBeInTheDocument();
  });

  it('si la API no responde, lo dice claramente', async () => {
    instalarApiFalsa({ 'GET /salon/estado': redCaida });
    render(<Inicio />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Sin conexión con el servidor');
  });
});
