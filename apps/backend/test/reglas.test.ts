import type { ReglaDto } from '@lumiclass/compartido';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { crearAppDePrueba, type AppDePrueba } from './ayudantes/baseDatosPrueba';

let prueba: AppDePrueba;
beforeEach(async () => {
  prueba = await crearAppDePrueba();
});
afterEach(() => prueba.cerrar());

const nuevaRegla = {
  nombre: 'Encender el fondo en la tarde',
  prioridad: 5,
  zonaId: 'zona-fondo',
  condicion: { tipo: 'presencia', valor: 'ocupado', horario: { desde: '14:00', hasta: '18:00' } },
  accion: { tipo: 'encender' },
};

const pedir = (method: 'GET' | 'POST' | 'PUT' | 'DELETE', url: string, payload?: object) =>
  prueba.app.inject({ method, url: `/api/v1${url}`, ...(payload ? { payload } : {}) });

describe('reglas', () => {
  it('lista las 2 reglas iniciales ordenadas por prioridad', async () => {
    const reglas = (await pedir('GET', '/reglas')).json<ReglaDto[]>();
    expect(reglas.map((r) => r.id)).toEqual(['regla-encender-ocupado', 'regla-apagar-vacio']);
    expect(reglas[1]?.condicion).toMatchObject({ valor: 'vacio', duracionSegundos: 300 });
  });

  it('crea, edita y elimina una regla, y lo registra en el historial', async () => {
    const creada = await pedir('POST', '/reglas', nuevaRegla);
    expect(creada.statusCode).toBe(201);
    const { id } = creada.json<ReglaDto>();

    const editada = await pedir('PUT', `/reglas/${id}`, { ...nuevaRegla, activa: false });
    expect(editada.json<ReglaDto>().activa).toBe(false);

    expect((await pedir('DELETE', `/reglas/${id}`)).statusCode).toBe(204);
    expect((await pedir('GET', `/reglas/${id}`)).statusCode).toBe(404);
    expect(await prueba.bd.evento.count({ where: { tipo: 'regla_cambiada' } })).toBe(3);
  });

  it('rechaza nombres duplicados con 409', async () => {
    await pedir('POST', '/reglas', nuevaRegla);
    const repetida = await pedir('POST', '/reglas', nuevaRegla);
    expect(repetida.statusCode).toBe(409);
    expect(repetida.json().error.codigo).toBe('REGLA_DUPLICADA');
  });

  it('rechaza datos inválidos y zonas inexistentes', async () => {
    const sinAccion = await pedir('POST', '/reglas', { ...nuevaRegla, accion: undefined });
    expect(sinAccion.statusCode).toBe(400);
    const zonaMala = await pedir('POST', '/reglas', { ...nuevaRegla, zonaId: 'zona-x' });
    expect(zonaMala.statusCode).toBe(400);
    expect(zonaMala.json().error.mensaje).toMatch(/zona-x/);
  });

  it('responde 404 al editar o borrar una regla inexistente', async () => {
    expect((await pedir('PUT', '/reglas/nada', nuevaRegla)).statusCode).toBe(404);
    expect((await pedir('DELETE', '/reglas/nada')).statusCode).toBe(404);
  });

  it('detecta una regla corrupta en la base sin tumbar el servidor', async () => {
    await prueba.bd.regla.update({
      where: { id: 'regla-apagar-vacio' },
      data: { condicion: '{roto' },
    });
    const respuesta = await pedir('GET', '/reglas/regla-apagar-vacio');
    expect(respuesta.statusCode).toBe(500);
    expect(respuesta.json().error.codigo).toBe('REGLA_CORRUPTA');
    expect((await pedir('GET', '/salud')).statusCode).toBe(200);
  });
});
