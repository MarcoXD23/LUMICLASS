import type { RespuestaComandoZona, ZonaDto } from '@lumiclass/compartido';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { crearAppDePrueba, nuevoId, type AppDePrueba } from './ayudantes/baseDatosPrueba';

let prueba: AppDePrueba;
beforeEach(async () => {
  prueba = await crearAppDePrueba();
});
afterEach(() => prueba.cerrar());

const cambiarModo = (zonaId: string, cuerpo: unknown) =>
  prueba.app.inject({
    method: 'PATCH',
    url: `/api/v1/zonas/${zonaId}/modo`,
    payload: cuerpo as object,
  });

describe('zonas', () => {
  it('lista las zonas en orden con luces y sensores', async () => {
    const respuesta = await prueba.app.inject({ method: 'GET', url: '/api/v1/zonas' });
    const zonas = respuesta.json<ZonaDto[]>();
    expect(zonas.map((z) => z.nombre)).toEqual(['Frente', 'Fondo']);
    expect(zonas[0]).toMatchObject({ modo: 'automatico', ocupada: false });
    expect(zonas[0]?.luces).toHaveLength(1);
    expect(zonas[0]?.sensores).toHaveLength(1);
  });

  it('cambia el modo y registra un solo evento aunque se repita', async () => {
    const primera = await cambiarModo('zona-fondo', { modo: 'manual' });
    expect(primera.statusCode).toBe(200);
    expect(primera.json<ZonaDto>().modo).toBe('manual');
    await cambiarModo('zona-fondo', { modo: 'manual' });
    expect(await prueba.bd.evento.count({ where: { tipo: 'modo_cambiado' } })).toBe(1);
  });

  it('rechaza un modo inválido y zonas inexistentes', async () => {
    expect((await cambiarModo('zona-fondo', { modo: 'turbo' })).statusCode).toBe(400);
    expect((await cambiarModo('zona-x', { modo: 'manual' })).statusCode).toBe(404);
  });

  it('enciende todas las luces de la zona con una orden', async () => {
    const respuesta = await prueba.app.inject({
      method: 'POST',
      url: '/api/v1/zonas/zona-fondo/comando',
      payload: { accion: 'encender', idSolicitud: nuevoId() },
    });
    expect(respuesta.statusCode).toBe(200);
    const cuerpo = respuesta.json<RespuestaComandoZona>();
    expect(cuerpo).toMatchObject({ zonaId: 'zona-fondo', todasOk: true });
    expect(cuerpo.resultados).toEqual([{ luzId: 'luz-fondo', ok: true, cambio: true }]);
    const luz = await prueba.bd.luz.findUnique({ where: { id: 'luz-fondo' } });
    expect(luz?.estadoReal).toBe('on');
  });

  it('informa por luz si alguna falla, sin detener las demás', async () => {
    // Una segunda luz en la zona, con su servo en falla.
    await prueba.bd.actuador.create({
      data: { id: 'servo-extra', nombre: 'Servo extra', conexion: 'falla' },
    });
    await prueba.bd.luz.create({
      data: {
        id: 'luz-extra',
        zonaId: 'zona-fondo',
        nombre: 'Luz extra',
        estadoReal: 'off',
        actuadorId: 'servo-extra',
      },
    });
    const respuesta = await prueba.app.inject({
      method: 'POST',
      url: '/api/v1/zonas/zona-fondo/comando',
      payload: { accion: 'encender', idSolicitud: nuevoId() },
    });
    const cuerpo = respuesta.json<RespuestaComandoZona>();
    expect(cuerpo.todasOk).toBe(false);
    const extra = cuerpo.resultados.find((r) => r.luzId === 'luz-extra');
    const normal = cuerpo.resultados.find((r) => r.luzId === 'luz-fondo');
    expect(extra).toMatchObject({ ok: false, error: { codigo: 'ACTUADOR_EN_FALLA' } });
    expect(normal).toMatchObject({ ok: true });
  });
});
