import type { LuzDto, RespuestaComandoLuz } from '@lumiclass/compartido';
import { afterEach, describe, expect, it } from 'vitest';
import { DriverEnMemoria } from '../src/drivers/driverEnMemoria';
import { crearAppDePrueba, nuevoId, type AppDePrueba } from './ayudantes/baseDatosPrueba';

let prueba: AppDePrueba;
afterEach(() => prueba.cerrar());

const comandar = (luzId: string, cuerpo: unknown) =>
  prueba.app.inject({
    method: 'POST',
    url: `/api/v1/luces/${luzId}/comando`,
    payload: cuerpo as object,
  });

const contarEventos = (tipo: string) => prueba.bd.evento.count({ where: { tipo } });

describe('GET /api/v1/luces', () => {
  it('lista las luces con su servo', async () => {
    prueba = await crearAppDePrueba();
    const respuesta = await prueba.app.inject({ method: 'GET', url: '/api/v1/luces' });
    const luces = respuesta.json<LuzDto[]>();
    expect(luces).toHaveLength(2);
    expect(luces[0]).toMatchObject({
      id: 'luz-frente',
      estadoReal: 'off',
      actuador: { id: 'servo-frente' },
    });
  });

  it('responde 404 si la luz no existe', async () => {
    prueba = await crearAppDePrueba();
    const respuesta = await prueba.app.inject({ method: 'GET', url: '/api/v1/luces/no-existe' });
    expect(respuesta.statusCode).toBe(404);
    expect(respuesta.json().error.codigo).toBe('NO_ENCONTRADO');
  });
});

describe('POST /api/v1/luces/:id/comando', () => {
  it('enciende la luz, registra el evento y pasa la zona a manual', async () => {
    prueba = await crearAppDePrueba();
    const respuesta = await comandar('luz-frente', { accion: 'encender', idSolicitud: nuevoId() });
    expect(respuesta.statusCode).toBe(200);
    const cuerpo = respuesta.json<RespuestaComandoLuz>();
    expect(cuerpo.cambio).toBe(true);
    expect(cuerpo.luz).toMatchObject({
      estadoDeseado: 'on',
      estadoReal: 'on',
      actuador: { ocupado: false },
    });
    expect(await contarEventos('luz_encendida')).toBe(1);
    const zona = await prueba.bd.zona.findUnique({ where: { id: 'zona-frente' } });
    expect(zona?.modo).toBe('manual');
    expect(await contarEventos('modo_cambiado')).toBe(1);
  });

  it('no mueve el servo si la luz ya está en ese estado', async () => {
    let llamadas = 0;
    const driver = new DriverEnMemoria(async () => {
      llamadas++;
      return { ok: true, estadoReal: 'off' };
    });
    prueba = await crearAppDePrueba({ driver });
    const respuesta = await comandar('luz-frente', { accion: 'apagar', idSolicitud: nuevoId() });
    expect(respuesta.json<RespuestaComandoLuz>().cambio).toBe(false);
    expect(llamadas).toBe(0);
  });

  it('no repite una orden duplicada (mismo idSolicitud)', async () => {
    let llamadas = 0;
    const driver = new DriverEnMemoria(async () => {
      llamadas++;
      return { ok: true, estadoReal: 'on' };
    });
    prueba = await crearAppDePrueba({ driver });
    const orden = { accion: 'encender', idSolicitud: nuevoId() };
    const primera = await comandar('luz-frente', orden);
    const segunda = await comandar('luz-frente', orden);
    expect(segunda.statusCode).toBe(200);
    expect(segunda.headers['x-solicitud-repetida']).toBe('true');
    expect(segunda.json()).toEqual(primera.json());
    expect(llamadas).toBe(1);
    expect(await contarEventos('luz_encendida')).toBe(1);
  });

  it('no repite órdenes duplicadas que llegan al mismo tiempo', async () => {
    let llamadas = 0;
    const driver = new DriverEnMemoria(async () => {
      llamadas++;
      await new Promise((r) => setTimeout(r, 30));
      return { ok: true, estadoReal: 'on' };
    });
    prueba = await crearAppDePrueba({ driver });
    const orden = { accion: 'encender', idSolicitud: nuevoId() };
    const respuestas = await Promise.all([
      comandar('luz-frente', orden),
      comandar('luz-frente', orden),
    ]);
    expect(respuestas.map((r) => r.statusCode)).toEqual([200, 200]);
    expect(llamadas).toBe(1);
  });

  it('rechaza reutilizar un idSolicitud para otra orden', async () => {
    prueba = await crearAppDePrueba();
    const id = nuevoId();
    await comandar('luz-frente', { accion: 'encender', idSolicitud: id });
    const respuesta = await comandar('luz-frente', { accion: 'apagar', idSolicitud: id });
    expect(respuesta.statusCode).toBe(409);
    expect(respuesta.json().error.codigo).toBe('ID_SOLICITUD_REUTILIZADO');
  });

  it('responde 409 si el servo está ocupado con otra orden', async () => {
    const driver = new DriverEnMemoria(async () => {
      await new Promise((r) => setTimeout(r, 50));
      return { ok: true, estadoReal: 'on' };
    });
    prueba = await crearAppDePrueba({ driver });
    const [a, b] = await Promise.all([
      comandar('luz-frente', { accion: 'encender', idSolicitud: nuevoId() }),
      comandar('luz-frente', { accion: 'encender', idSolicitud: nuevoId() }),
    ]);
    expect([a.statusCode, b.statusCode].sort()).toEqual([200, 409]);
    expect([a, b].find((r) => r.statusCode === 409)?.json().error.codigo).toBe('ACTUADOR_OCUPADO');
  });

  it('si el servo falla: 503, luz en "desconocido" y evento de error', async () => {
    const driver = new DriverEnMemoria(async () => ({ ok: false, error: 'atascado' }));
    prueba = await crearAppDePrueba({ driver });
    const respuesta = await comandar('luz-frente', { accion: 'encender', idSolicitud: nuevoId() });
    expect(respuesta.statusCode).toBe(503);
    expect(respuesta.json().error.codigo).toBe('ACTUADOR_SIN_RESPUESTA');
    const luz = await prueba.bd.luz.findUnique({
      where: { id: 'luz-frente' },
      include: { actuador: true },
    });
    expect(luz?.estadoReal).toBe('desconocido');
    expect(luz?.actuador.ocupado).toBe(false);
    expect(await contarEventos('error_actuador')).toBe(1);
  });

  it('si el servo no responde a tiempo, responde 503 sin bloquear la API', async () => {
    const driver = new DriverEnMemoria(() => new Promise(() => undefined)); // nunca responde
    prueba = await crearAppDePrueba({ driver });
    const respuesta = await comandar('luz-frente', { accion: 'encender', idSolicitud: nuevoId() });
    expect(respuesta.statusCode).toBe(503);
    expect(respuesta.json().error.mensaje).toMatch(/sin respuesta/);
  });

  it('si el driver lanza una excepción, responde 503', async () => {
    const driver = new DriverEnMemoria(async () => {
      throw new Error('cable suelto');
    });
    prueba = await crearAppDePrueba({ driver });
    const respuesta = await comandar('luz-frente', { accion: 'encender', idSolicitud: nuevoId() });
    expect(respuesta.statusCode).toBe(503);
    expect(respuesta.json().error.mensaje).toMatch(/cable suelto/);
  });

  it('si el hardware está desconectado, responde 503', async () => {
    prueba = await crearAppDePrueba();
    await prueba.driver.detener();
    const respuesta = await comandar('luz-frente', { accion: 'encender', idSolicitud: nuevoId() });
    expect(respuesta.statusCode).toBe(503);
  });

  it('rechaza un servo en falla sin intentar moverlo', async () => {
    prueba = await crearAppDePrueba();
    await prueba.bd.actuador.update({ where: { id: 'servo-frente' }, data: { conexion: 'falla' } });
    const respuesta = await comandar('luz-frente', { accion: 'encender', idSolicitud: nuevoId() });
    expect(respuesta.statusCode).toBe(503);
    expect(respuesta.json().error.codigo).toBe('ACTUADOR_EN_FALLA');
  });

  it('rechaza datos inválidos con 400 y mensaje en español', async () => {
    prueba = await crearAppDePrueba();
    const sinId = await comandar('luz-frente', { accion: 'encender' });
    expect(sinId.statusCode).toBe(400);
    expect(sinId.json().error).toMatchObject({ codigo: 'DATOS_INVALIDOS' });
    expect(sinId.json().error.mensaje).toMatch(/idSolicitud/);

    const accionMala = await comandar('luz-frente', { accion: 'explotar', idSolicitud: nuevoId() });
    expect(accionMala.statusCode).toBe(400);

    const jsonRoto = await prueba.app.inject({
      method: 'POST',
      url: '/api/v1/luces/luz-frente/comando',
      headers: { 'content-type': 'application/json' },
      payload: '{"accion":',
    });
    expect(jsonRoto.statusCode).toBe(400);
    expect(jsonRoto.json().error.codigo).toBe('SOLICITUD_INVALIDA');
  });

  it('libera al arrancar los servos que quedaron marcados como ocupados', async () => {
    prueba = await crearAppDePrueba();
    await prueba.bd.actuador.update({ where: { id: 'servo-frente' }, data: { ocupado: true } });
    await prueba.app.close();
    // Simula un reinicio: una nueva app sobre la misma base.
    const { construirApp } = await import('../src/app');
    const { leerEntorno } = await import('../src/config/entorno');
    const app = construirApp({ entorno: leerEntorno({}), bd: prueba.bd, driver: prueba.driver });
    await app.ready();
    const servo = await prueba.bd.actuador.findUnique({ where: { id: 'servo-frente' } });
    expect(servo?.ocupado).toBe(false);
    await app.close();
  });
});
