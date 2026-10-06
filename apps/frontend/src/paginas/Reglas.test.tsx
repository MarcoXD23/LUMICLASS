import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProveedorSesion } from '../hooks/useSesion';
import {
  instalarApiFalsa,
  reglasEjemplo,
  sesionAdmin,
  sesionUsuario,
  zonaEjemplo,
} from '../pruebas/apiFalsa';
import { Reglas } from './Reglas';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const apiBase = () => ({
  'GET /auth/sesion': { cuerpo: sesionAdmin },
  'GET /reglas': { cuerpo: reglasEjemplo },
  'GET /zonas': { cuerpo: [zonaEjemplo(), zonaEjemplo({ id: 'zona-fondo', nombre: 'Fondo' })] },
});

const renderizar = () =>
  render(
    <ProveedorSesion>
      <Reglas />
    </ProveedorSesion>,
  );

describe('Reglas', () => {
  it('explica cada regla en una frase', async () => {
    instalarApiFalsa(apiBase());
    renderizar();
    expect(
      await screen.findByText('Si cualquier zona queda vacía durante 5 min, apagar las luces.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Si cualquier zona está ocupada, encender las luces.'),
    ).toBeInTheDocument();
  });

  it('valida el formulario antes de enviar', async () => {
    const { llamadas } = instalarApiFalsa(apiBase());
    renderizar();
    fireEvent.click(await screen.findByRole('button', { name: /Nueva regla/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/Nombre/);
    expect(llamadas.some((l) => l.metodo === 'POST')).toBe(false);
  });

  it('crea una regla con horario para una zona', async () => {
    const { llamadas } = instalarApiFalsa({
      ...apiBase(),
      'POST /reglas': (cuerpo) => ({ estado: 201, cuerpo: { ...(cuerpo as object), id: 'nueva' } }),
    });
    renderizar();
    fireEvent.click(await screen.findByRole('button', { name: /Nueva regla/ }));
    const formulario = screen.getByRole('form', { name: 'Nueva regla' });
    const campo = (nombre: RegExp) => within(formulario).getByLabelText(nombre);
    fireEvent.change(campo(/^Nombre/), { target: { value: 'Tarde en el fondo' } });
    fireEvent.change(campo(/^Zona/), { target: { value: 'zona-fondo' } });
    fireEvent.click(campo(/Solo en un horario/));
    fireEvent.change(campo(/^Desde/), { target: { value: '14:00' } });
    fireEvent.click(within(formulario).getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(llamadas.some((l) => l.metodo === 'POST')).toBe(true));
    expect(llamadas.find((l) => l.metodo === 'POST')?.cuerpo).toMatchObject({
      nombre: 'Tarde en el fondo',
      zonaId: 'zona-fondo',
      condicion: { valor: 'ocupado', horario: { desde: '14:00', hasta: '18:00' } },
      accion: { tipo: 'encender' },
    });
    await waitFor(() => expect(screen.queryByRole('form')).not.toBeInTheDocument());
  });

  it('muestra el error de nombre duplicado que envía la API', async () => {
    instalarApiFalsa({
      ...apiBase(),
      'POST /reglas': (_cuerpo) => ({
        estado: 409,
        cuerpo: {
          error: { codigo: 'REGLA_DUPLICADA', mensaje: 'Ya existe una regla llamada "X"' },
        },
      }),
    });
    renderizar();
    fireEvent.click(await screen.findByRole('button', { name: /Nueva regla/ }));
    fireEvent.change(screen.getByLabelText(/^Nombre/), { target: { value: 'X12' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText('Ya existe una regla llamada "X"')).toBeInTheDocument();
    expect(screen.getByRole('form')).toBeInTheDocument(); // el formulario sigue abierto
  });

  it('desactiva una regla enviándola completa con activa = false', async () => {
    const { llamadas } = instalarApiFalsa({
      ...apiBase(),
      'PUT /reglas/regla-apagar-vacio': (cuerpo) => ({ cuerpo }),
    });
    renderizar();
    fireEvent.click(
      await screen.findByRole('button', { name: 'Desactivar Apagar cuando el salón queda vacío' }),
    );
    await waitFor(() => expect(llamadas.some((l) => l.metodo === 'PUT')).toBe(true));
    expect(llamadas.find((l) => l.metodo === 'PUT')?.cuerpo).toMatchObject({
      activa: false,
      nombre: 'Apagar cuando el salón queda vacío',
    });
  });

  it('pide confirmación antes de eliminar', async () => {
    const { llamadas } = instalarApiFalsa({
      ...apiBase(),
      'POST /reglas/regla-apagar-vacio/eliminar': (_c) => ({ cuerpo: reglasEjemplo[1] }),
    });
    const confirmar = vi
      .spyOn(window, 'confirm')
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);
    renderizar();
    const boton = await screen.findByRole('button', {
      name: 'Eliminar Apagar cuando el salón queda vacío',
    });
    fireEvent.click(boton);
    expect(llamadas.some((l) => l.ruta.endsWith('/eliminar'))).toBe(false);
    fireEvent.click(boton);
    await waitFor(() => expect(llamadas.some((l) => l.ruta.endsWith('/eliminar'))).toBe(true));
    expect(confirmar).toHaveBeenCalledTimes(2);
  });

  it('un usuario normal ve las reglas pero no los botones para cambiarlas', async () => {
    instalarApiFalsa({ ...apiBase(), 'GET /auth/sesion': { cuerpo: sesionUsuario } });
    renderizar();
    expect(
      await screen.findByText(/Solo el administrador puede crear o cambiar reglas/),
    ).toBeInTheDocument();
    expect(screen.getByText('Encender al detectar presencia')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Nueva regla/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Eliminar / })).not.toBeInTheDocument();
  });
  it('muestra las reglas eliminadas marcadas y sin botones', async () => {
    const { llamadas } = instalarApiFalsa({
      ...apiBase(),
      'GET /reglas': {
        cuerpo: [
          {
            ...reglasEjemplo[0]!,
            id: 'vieja',
            nombre: 'Regla vieja',
            eliminadaEn: new Date().toISOString(),
          },
        ],
      },
    });
    renderizar();
    fireEvent.click(await screen.findByLabelText(/Mostrar también las reglas eliminadas/));
    await waitFor(() => expect(llamadas.at(-1)?.parametros.get('incluirEliminadas')).toBe('true'));
    expect(await screen.findByText(/^Eliminada/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Editar Regla vieja' })).not.toBeInTheDocument();
  });
});
