import type { EventoDto, PaginaEventos } from '@lumiclass/compartido';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { instalarApiFalsa } from '../pruebas/apiFalsa';
import { Historial } from './Historial';
import { ListaEventos } from './ListaEventos';

afterEach(() => {
  vi.unstubAllGlobals();
});

const evento = (id: number, cambios: Partial<EventoDto> = {}): EventoDto => ({
  id,
  fecha: new Date().toISOString(),
  tipo: 'luz_encendida',
  origen: 'regla',
  severidad: 'info',
  entidad: 'luz',
  entidadId: 'luz-frente',
  mensaje: `Evento ${id}`,
  datos: {},
  ...cambios,
});

const pagina = (datos: EventoDto[], total = datos.length, numero = 1): PaginaEventos => ({
  datos,
  pagina: numero,
  porPagina: 20,
  total,
});

const renderizar = () =>
  render(
    <MemoryRouter initialEntries={['/historial']}>
      <Routes>
        <Route path="historial" element={<Historial />}>
          <Route index element={<ListaEventos />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );

describe('Historial de eventos', () => {
  it('lista los eventos con su origen', async () => {
    instalarApiFalsa({
      'GET /eventos': {
        cuerpo: pagina([
          evento(2, { mensaje: 'Luz "Luces frente" encendida' }),
          evento(1, {
            tipo: 'error_actuador',
            severidad: 'error',
            origen: 'usuario',
            mensaje: 'No se pudo encender',
          }),
        ]),
      },
    });
    renderizar();
    expect(await screen.findByText('Luz "Luces frente" encendida')).toBeInTheDocument();
    expect(screen.getByText('No se pudo encender')).toBeInTheDocument();
    expect(
      within(screen.getByRole('list', { name: 'Eventos' })).getByText(/Regla automática/),
    ).toBeInTheDocument();
    expect(screen.getByText('2 eventos')).toBeInTheDocument();
  });

  it('envía los filtros elegidos a la API y vuelve a la página 1', async () => {
    const { llamadas } = instalarApiFalsa({ 'GET /eventos': { cuerpo: pagina([evento(1)]) } });
    renderizar();
    await screen.findByText('Evento 1');
    fireEvent.change(screen.getByLabelText('Tipo'), { target: { value: 'error_sensor' } });
    fireEvent.change(screen.getByLabelText('Origen'), { target: { value: 'simulador' } });
    await waitFor(() => {
      const ultima = llamadas.at(-1)?.parametros;
      expect(ultima?.get('tipo')).toBe('error_sensor');
      expect(ultima?.get('origen')).toBe('simulador');
      expect(ultima?.get('pagina')).toBe('1');
    });
    expect(screen.getByRole('button', { name: 'Quitar filtros' })).toBeInTheDocument();
  });

  it('pagina hacia eventos más antiguos', async () => {
    const { llamadas } = instalarApiFalsa({
      'GET /eventos': { cuerpo: pagina([evento(1)], 45) },
    });
    renderizar();
    expect(await screen.findByText('Página 1 de 3')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Más antiguos/ }));
    await waitFor(() => expect(llamadas.at(-1)?.parametros.get('pagina')).toBe('2'));
  });

  it('avisa cuando no hay eventos', async () => {
    instalarApiFalsa({ 'GET /eventos': { cuerpo: pagina([]) } });
    renderizar();
    expect(await screen.findByText('No hay eventos con estos filtros.')).toBeInTheDocument();
  });
});
