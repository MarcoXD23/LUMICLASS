import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { estadoSalonEjemplo, instalarApiFalsa, luzEjemplo, zonaEjemplo } from '../pruebas/apiFalsa';
import { Control } from './Control';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Control de luces', () => {
  it('enciende una luz y vuelve a cargar el estado', async () => {
    let encendida = false;
    const { llamadas } = instalarApiFalsa({
      'GET /salon/estado': async () => ({
        cuerpo: estadoSalonEjemplo({
          zonas: [zonaEjemplo({ luces: [luzEjemplo({ estadoReal: encendida ? 'on' : 'off' })] })],
        }),
      }),
      'POST /luces/luz-frente/comando': (cuerpo) => {
        encendida = true;
        return {
          cuerpo: { luz: luzEjemplo({ estadoReal: 'on' }), cambio: true, recibido: cuerpo },
        };
      },
    });
    render(<Control />);
    fireEvent.click(await screen.findByRole('button', { name: 'Encender Luces frente' }));
    expect(await screen.findByRole('button', { name: 'Apagar Luces frente' })).toBeInTheDocument();
    const orden = llamadas.find((l) => l.metodo === 'POST');
    expect(orden?.cuerpo).toMatchObject({ accion: 'encender' });
  });

  it('muestra el mensaje de la API si el servo falla', async () => {
    instalarApiFalsa({
      'GET /salon/estado': { cuerpo: estadoSalonEjemplo() },
      'POST /luces/luz-frente/comando': (_cuerpo) => ({
        estado: 503,
        cuerpo: {
          error: {
            codigo: 'ACTUADOR_SIN_RESPUESTA',
            mensaje: 'El servo no confirmó la orden: atascado',
          },
        },
      }),
    });
    render(<Control />);
    fireEvent.click(await screen.findByRole('button', { name: 'Encender Luces frente' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El servo no confirmó la orden: atascado',
    );
  });

  it('cambia el modo de la zona', async () => {
    const { llamadas } = instalarApiFalsa({
      'GET /salon/estado': { cuerpo: estadoSalonEjemplo() },
      'PATCH /zonas/zona-frente/modo': (cuerpo) => ({
        cuerpo: { ...zonaEjemplo(), ...(cuerpo as object) },
      }),
    });
    render(<Control />);
    fireEvent.click(await screen.findByRole('button', { name: /Manual/ }));
    await waitFor(() => expect(llamadas.some((l) => l.metodo === 'PATCH')).toBe(true));
    expect(llamadas.find((l) => l.metodo === 'PATCH')?.cuerpo).toEqual({ modo: 'manual' });
  });

  it('informa qué luces de la zona fallaron', async () => {
    instalarApiFalsa({
      'GET /salon/estado': { cuerpo: estadoSalonEjemplo() },
      'POST /zonas/zona-frente/comando': (_cuerpo) => ({
        cuerpo: {
          zonaId: 'zona-frente',
          todasOk: false,
          resultados: [
            {
              luzId: 'luz-frente',
              ok: false,
              cambio: false,
              error: { codigo: 'X', mensaje: 'Servo en falla' },
            },
          ],
        },
      }),
    });
    render(<Control />);
    fireEvent.click(await screen.findByRole('button', { name: /Encender todo/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Algunas luces no respondieron: Servo en falla',
    );
  });
});
