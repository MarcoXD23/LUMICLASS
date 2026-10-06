import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { instalarApiFalsa, reglasEjemplo, zonaEjemplo } from '../pruebas/apiFalsa';
import { Reglas } from './Reglas';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const apiBase = () => ({
  'GET /reglas': { cuerpo: reglasEjemplo },
  'GET /zonas': { cuerpo: [zonaEjemplo(), zonaEjemplo({ id: 'zona-fondo', nombre: 'Fondo' })] },
});

describe('Reglas', () => {
  it('explica cada regla en una frase', async () => {
    instalarApiFalsa(apiBase());
    render(<Reglas />);
    expect(
      await screen.findByText('Si cualquier zona queda vacía durante 5 min, apagar las luces.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Si cualquier zona está ocupada, encender las luces.'),
    ).toBeInTheDocument();
  });

  it('valida el formulario antes de enviar', async () => {
    const { llamadas } = instalarApiFalsa(apiBase());
    render(<Reglas />);
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
    render(<Reglas />);
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
    render(<Reglas />);
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
    render(<Reglas />);
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
      'DELETE /reglas/regla-apagar-vacio': { estado: 204 },
    });
    const confirmar = vi
      .spyOn(window, 'confirm')
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);
    render(<Reglas />);
    const boton = await screen.findByRole('button', {
      name: 'Eliminar Apagar cuando el salón queda vacío',
    });
    fireEvent.click(boton);
    expect(llamadas.some((l) => l.metodo === 'DELETE')).toBe(false);
    fireEvent.click(boton);
    await waitFor(() => expect(llamadas.some((l) => l.metodo === 'DELETE')).toBe(true));
    expect(confirmar).toHaveBeenCalledTimes(2);
  });
});
