import type { PaginaEventos } from '@lumiclass/compartido';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { crearAppDePrueba, nuevoId, type AppDePrueba } from './ayudantes/baseDatosPrueba';

let prueba: AppDePrueba;
beforeEach(async () => {
  prueba = await crearAppDePrueba();
});
afterEach(() => prueba.cerrar());

const listar = async (consulta = '') => {
  const respuesta = await prueba.app.inject({ method: 'GET', url: `/api/v1/eventos${consulta}` });
  return { codigo: respuesta.statusCode, cuerpo: respuesta.json<PaginaEventos>() };
};

describe('GET /api/v1/eventos', () => {
  it('incluye el evento de datos iniciales', async () => {
    const { cuerpo } = await listar();
    expect(cuerpo.total).toBe(1);
    expect(cuerpo.datos[0]).toMatchObject({ tipo: 'sistema', origen: 'sistema', datos: {} });
  });

  it('filtra por tipo y ordena del más reciente al más antiguo', async () => {
    for (const accion of ['encender', 'apagar', 'encender']) {
      await prueba.app.inject({
        method: 'POST',
        url: '/api/v1/luces/luz-frente/comando',
        payload: { accion, idSolicitud: nuevoId() },
      });
    }
    const { cuerpo } = await listar('?tipo=luz_encendida');
    expect(cuerpo.total).toBe(2);
    const { cuerpo: todos } = await listar();
    expect(todos.datos[0]?.tipo).toBe('luz_encendida');
    expect(todos.datos.at(-1)?.tipo).toBe('sistema');
  });

  it('pagina los resultados', async () => {
    for (let i = 0; i < 5; i++) {
      await prueba.bd.evento.create({
        data: { tipo: 'presencia_detectada', origen: 'simulador', mensaje: `e${i}` },
      });
    }
    const { cuerpo } = await listar('?pagina=2&porPagina=4');
    expect(cuerpo).toMatchObject({ pagina: 2, porPagina: 4, total: 6 });
    expect(cuerpo.datos).toHaveLength(2);
  });

  it('filtra por rango de fechas', async () => {
    await prueba.bd.evento.create({
      data: {
        tipo: 'error_sensor',
        origen: 'sistema',
        mensaje: 'viejo',
        fecha: new Date('2020-01-01T00:00:00Z'),
      },
    });
    const { cuerpo } = await listar('?hasta=2021-01-01T00:00:00Z');
    expect(cuerpo.datos.map((e) => e.mensaje)).toEqual(['viejo']);
  });

  it('rechaza filtros inválidos con 400', async () => {
    expect((await listar('?tipo=fiesta')).codigo).toBe(400);
    expect((await listar('?porPagina=500')).codigo).toBe(400);
    expect((await listar('?desde=2026-02-01T00:00:00Z&hasta=2026-01-01T00:00:00Z')).codigo).toBe(
      400,
    );
    expect((await listar('?inventado=1')).codigo).toBe(400);
  });
});
