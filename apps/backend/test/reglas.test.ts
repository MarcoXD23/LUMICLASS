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

const pedir = (method: 'GET' | 'POST' | 'PUT', url: string, payload?: object) =>
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

    const eliminada = await pedir('POST', `/reglas/${id}/eliminar`);
    expect(eliminada.statusCode).toBe(200);
    expect(eliminada.json<ReglaDto>().eliminadaEn).not.toBeNull();
    expect((await pedir('GET', `/reglas/${id}`)).statusCode).toBe(404);
    expect(await prueba.bd.evento.count({ where: { tipo: 'regla_cambiada' } })).toBe(3);
  });

  it('borrado lógico: la regla eliminada sigue en la base y en el historial', async () => {
    const { id } = (await pedir('POST', '/reglas', nuevaRegla)).json<ReglaDto>();
    await pedir('POST', `/reglas/${id}/eliminar`);

    const enBase = await prueba.bd.regla.findUnique({ where: { id } });
    expect(enBase?.inactivoDesde).not.toBeNull();
    expect(enBase?.inactivadoPorId).not.toBeNull();

    const vigentes = (await pedir('GET', '/reglas')).json<ReglaDto[]>();
    expect(vigentes.some((r) => r.id === id)).toBe(false);
    const todas = (await pedir('GET', '/reglas?incluirEliminadas=true')).json<ReglaDto[]>();
    expect(todas.find((r) => r.id === id)?.eliminadaEn).not.toBeNull();

    // Una regla eliminada ya no se puede editar ni eliminar otra vez.
    expect((await pedir('PUT', `/reglas/${id}`, nuevaRegla)).statusCode).toBe(404);
    expect((await pedir('POST', `/reglas/${id}/eliminar`)).statusCode).toBe(404);
  });

  it('al editar guarda la versión anterior (no sobrescribe sin copia)', async () => {
    const { id } = (await pedir('POST', '/reglas', nuevaRegla)).json<ReglaDto>();
    await pedir('PUT', `/reglas/${id}`, { ...nuevaRegla, prioridad: 50 });
    await pedir('PUT', `/reglas/${id}`, { ...nuevaRegla, prioridad: 60 });

    const versiones = (await pedir('GET', `/reglas/${id}/versiones`)).json<
      { datos: { prioridad: number }; reemplazadoPorId: string }[]
    >();
    expect(versiones.map((v) => v.datos.prioridad)).toEqual([50, 5]);
    expect(versiones[0]?.reemplazadoPorId).toBeTruthy();
  });

  it('rechaza nombres duplicados con 409 (salvo que la otra esté eliminada)', async () => {
    const { id } = (await pedir('POST', '/reglas', nuevaRegla)).json<ReglaDto>();
    const repetida = await pedir('POST', '/reglas', nuevaRegla);
    expect(repetida.statusCode).toBe(409);
    expect(repetida.json().error.codigo).toBe('REGLA_DUPLICADA');

    await pedir('POST', `/reglas/${id}/eliminar`);
    expect((await pedir('POST', '/reglas', nuevaRegla)).statusCode).toBe(201);
  });

  it('no existe DELETE: la ruta responde 404', async () => {
    const respuesta = await prueba.app.inject({
      method: 'DELETE',
      url: '/api/v1/reglas/regla-apagar-vacio',
    });
    expect(respuesta.statusCode).toBe(404);
    expect(await prueba.bd.regla.count({ where: { id: 'regla-apagar-vacio' } })).toBe(1);
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
    expect((await pedir('POST', '/reglas/nada/eliminar')).statusCode).toBe(404);
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
