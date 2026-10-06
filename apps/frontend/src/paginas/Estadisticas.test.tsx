import type { EstadisticasDto } from '@lumiclass/compartido';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { instalarApiFalsa } from '../pruebas/apiFalsa';
import { Estadisticas } from './Estadisticas';

afterEach(() => {
  vi.unstubAllGlobals();
});

const estadisticas = (cambios: Partial<EstadisticasDto> = {}): EstadisticasDto => ({
  desde: '2026-10-04T12:00:00.000Z',
  hasta: '2026-10-05T12:00:00.000Z',
  luces: [
    {
      luzId: 'luz-frente',
      nombre: 'Luces frente',
      zonaId: 'zona-frente',
      segundosEncendida: 5400,
      encendidos: 3,
      apagados: 2,
    },
    {
      luzId: 'luz-fondo',
      nombre: 'Luces fondo',
      zonaId: 'zona-fondo',
      segundosEncendida: 0,
      encendidos: 0,
      apagados: 0,
    },
  ],
  zonas: [{ zonaId: 'zona-frente', nombre: 'Frente', segundosOcupada: 3600 }],
  accionesPorOrigen: {
    usuario: { encendidos: 1, apagados: 0 },
    regla: { encendidos: 2, apagados: 2 },
    sistema: { encendidos: 0, apagados: 0 },
    simulador: { encendidos: 0, apagados: 0 },
  },
  errores: { actuador: 2, sensor: 0 },
  totalEventos: 17,
  ...cambios,
});

describe('Estadísticas', () => {
  it('muestra tiempos, origen de las acciones y errores', async () => {
    instalarApiFalsa({ 'GET /estadisticas': { cuerpo: estadisticas() } });
    render(<Estadisticas />);
    expect(await screen.findByText('Luces frente: 1 h 30 min')).toBeInTheDocument();
    expect(screen.getByText('Zona Frente: 1 h')).toBeInTheDocument();
    expect(screen.getByText('17')).toBeInTheDocument();
    expect(screen.getByText('Regla automática')).toBeInTheDocument();
    // Orígenes sin acciones no aparecen en la tabla.
    expect(screen.queryByRole('cell', { name: 'Simulador' })).not.toBeInTheDocument();
    expect(screen.getByText(/falta confirmar la potencia/)).toBeInTheDocument();
  });

  it('pide otro período al cambiar el selector', async () => {
    const { llamadas } = instalarApiFalsa({ 'GET /estadisticas': { cuerpo: estadisticas() } });
    render(<Estadisticas />);
    await screen.findByText('Luces frente: 1 h 30 min');
    const antes = llamadas.length;
    fireEvent.change(screen.getByLabelText('Período'), { target: { value: '7d' } });
    await waitFor(() => expect(llamadas.length).toBeGreaterThan(antes));
    const desde = llamadas.at(-1)?.parametros.get('desde');
    const dias = (Date.now() - new Date(desde ?? '').getTime()) / (24 * 60 * 60 * 1000);
    expect(Math.round(dias)).toBe(7);
  });

  it('sin actividad lo dice en lugar de mostrar una tabla vacía', async () => {
    instalarApiFalsa({
      'GET /estadisticas': {
        cuerpo: estadisticas({
          accionesPorOrigen: {
            usuario: { encendidos: 0, apagados: 0 },
            regla: { encendidos: 0, apagados: 0 },
            sistema: { encendidos: 0, apagados: 0 },
            simulador: { encendidos: 0, apagados: 0 },
          },
        }),
      },
    });
    render(<Estadisticas />);
    expect(
      await screen.findByText('No hubo encendidos ni apagados en este período.'),
    ).toBeInTheDocument();
  });
});
