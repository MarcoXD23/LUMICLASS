import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { leerEntorno } from '../src/config/entorno';
import { crearAppDePrueba, type AppDePrueba } from './ayudantes/baseDatosPrueba';

describe('GET /api/v1/salud', () => {
  let prueba: AppDePrueba;
  beforeAll(async () => {
    prueba = await crearAppDePrueba();
  });
  afterAll(() => prueba.cerrar());

  it('responde ok con driver, base de datos y hardware', async () => {
    const respuesta = await prueba.app.inject({ method: 'GET', url: '/api/v1/salud' });
    expect(respuesta.statusCode).toBe(200);
    expect(respuesta.json()).toMatchObject({
      estado: 'ok',
      driver: 'simulado',
      baseDatos: 'ok',
      hardware: 'conectado',
    });
  });

  it('informa "degradado" si el hardware se desconecta', async () => {
    await prueba.driver.detener();
    const respuesta = await prueba.app.inject({ method: 'GET', url: '/api/v1/salud' });
    expect(respuesta.json()).toMatchObject({ estado: 'degradado', hardware: 'desconectado' });
    await prueba.driver.iniciar();
  });

  it('responde 404 con formato de error en rutas inexistentes', async () => {
    const respuesta = await prueba.app.inject({ method: 'GET', url: '/api/v1/no-existe' });
    expect(respuesta.statusCode).toBe(404);
    expect(respuesta.json().error.codigo).toBe('RUTA_NO_ENCONTRADA');
  });
});

describe('leerEntorno', () => {
  it('usa valores por defecto si no hay variables', () => {
    expect(leerEntorno({})).toEqual({
      PUERTO: 3000,
      HOST: '127.0.0.1',
      DRIVER: 'simulado',
      DATABASE_URL: 'file:./prisma/dev.db',
      TIEMPO_MAX_ACTUADOR_MS: 3000,
      INTERVALO_REGLAS_MS: 60_000,
      SIM_DEMORA_LENTO_MS: 2000,
    });
  });

  it('rechaza un driver inválido con un mensaje claro', () => {
    expect(() => leerEntorno({ DRIVER: 'otro' })).toThrow(/Configuración inválida/);
  });

  it('rechaza un puerto fuera de rango', () => {
    expect(() => leerEntorno({ PUERTO: '99999' })).toThrow(/PUERTO/);
  });

  it('rechaza una base de datos que no sea SQLite', () => {
    expect(() => leerEntorno({ DATABASE_URL: 'postgres://x' })).toThrow(/DATABASE_URL/);
  });
});
