import type { SensorDto } from '@lumiclass/compartido';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { crearAppDePrueba, type AppDePrueba } from './ayudantes/baseDatosPrueba';

let prueba: AppDePrueba;
beforeEach(async () => {
  prueba = await crearAppDePrueba();
});
afterEach(() => prueba.cerrar());

describe('sensores', () => {
  it('lista los sensores con su estado', async () => {
    const respuesta = await prueba.app.inject({ method: 'GET', url: '/api/v1/sensores' });
    const sensores = respuesta.json<SensorDto[]>();
    expect(sensores).toHaveLength(2);
    expect(sensores[0]).toMatchObject({
      id: 'sensor-frente',
      tipo: 'pir',
      conexion: 'activo',
      presencia: false,
      conteoPersonas: null,
      ultimaLectura: null,
    });
  });

  it('devuelve el detalle o 404', async () => {
    const encontrado = await prueba.app.inject({
      method: 'GET',
      url: '/api/v1/sensores/sensor-fondo',
    });
    expect(encontrado.json<SensorDto>().zonaId).toBe('zona-fondo');
    const faltante = await prueba.app.inject({ method: 'GET', url: '/api/v1/sensores/nada' });
    expect(faltante.statusCode).toBe(404);
  });

  it('normaliza valores imposibles guardados en la base', async () => {
    await prueba.bd.sensor.update({
      where: { id: 'sensor-frente' },
      data: { conexion: 'raro', tipo: 'laser', conteoPersonas: -3 },
    });
    const respuesta = await prueba.app.inject({
      method: 'GET',
      url: '/api/v1/sensores/sensor-frente',
    });
    expect(respuesta.json<SensorDto>()).toMatchObject({
      conexion: 'falla',
      tipo: 'otro',
      conteoPersonas: null,
    });
  });
});
