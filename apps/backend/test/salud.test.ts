import { afterEach, describe, expect, it } from 'vitest';
import { construirApp } from '../src/app';
import { leerEntorno } from '../src/config/entorno';

describe('GET /api/v1/salud', () => {
  const app = construirApp(leerEntorno({}));

  afterEach(async () => {
    await app.close();
  });

  it('responde ok con el driver configurado', async () => {
    const respuesta = await app.inject({ method: 'GET', url: '/api/v1/salud' });
    expect(respuesta.statusCode).toBe(200);
    expect(respuesta.json()).toMatchObject({ estado: 'ok', driver: 'simulado' });
  });
});

describe('leerEntorno', () => {
  it('usa valores por defecto si no hay variables', () => {
    expect(leerEntorno({})).toEqual({ PUERTO: 3000, HOST: '127.0.0.1', DRIVER: 'simulado' });
  });

  it('rechaza un driver inválido con un mensaje claro', () => {
    expect(() => leerEntorno({ DRIVER: 'otro' })).toThrow(/Configuración inválida/);
  });

  it('rechaza un puerto fuera de rango', () => {
    expect(() => leerEntorno({ PUERTO: '99999' })).toThrow(/PUERTO/);
  });
});
