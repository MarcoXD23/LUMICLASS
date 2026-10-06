import type { EstadoSalonDto } from '@lumiclass/compartido';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { crearAppDePrueba, type AppDePrueba } from './ayudantes/baseDatosPrueba';

describe('GET /api/v1/salon/estado', () => {
  let prueba: AppDePrueba;
  beforeEach(async () => {
    prueba = await crearAppDePrueba();
  });
  afterEach(() => prueba.cerrar());

  const pedirEstado = async () => {
    const respuesta = await prueba.app.inject({ method: 'GET', url: '/api/v1/salon/estado' });
    return { codigo: respuesta.statusCode, estado: respuesta.json<EstadoSalonDto>() };
  };

  it('devuelve el salón inicial: vacío, luces apagadas y sin alertas', async () => {
    const { codigo, estado } = await pedirEstado();
    expect(codigo).toBe(200);
    expect(estado.salon.nombre).toBe('Salón principal');
    expect(estado.ocupado).toBe(false);
    expect(estado.personasDetectadas).toBeNull();
    expect(estado.resumen).toEqual({
      lucesEncendidas: 0,
      lucesTotales: 2,
      sensoresActivos: 2,
      sensoresTotales: 2,
    });
    expect(estado.zonas.map((z) => z.id)).toEqual(['zona-frente', 'zona-fondo']);
    expect(estado.alertas).toEqual([]);
    expect(estado.hardware).toBe('conectado');
  });

  it('marca ocupado si algún sensor activo detecta presencia', async () => {
    await prueba.bd.sensor.update({ where: { id: 'sensor-fondo' }, data: { presencia: true } });
    const { estado } = await pedirEstado();
    expect(estado.ocupado).toBe(true);
    expect(estado.zonas.find((z) => z.id === 'zona-fondo')?.ocupada).toBe(true);
    expect(estado.zonas.find((z) => z.id === 'zona-frente')?.ocupada).toBe(false);
  });

  it('ignora sensores en falla y genera alertas', async () => {
    await prueba.bd.sensor.updateMany({ data: { conexion: 'falla', presencia: true } });
    const { estado } = await pedirEstado();
    expect(estado.ocupado).toBeNull();
    expect(
      estado.alertas.filter((a) => a.entidad === 'sensor' && a.severidad === 'error'),
    ).toHaveLength(2);
  });

  it('trata un estado imposible guardado en la base como "desconocido"', async () => {
    await prueba.bd.luz.update({
      where: { id: 'luz-frente' },
      data: { estadoReal: 'encendidísimo' },
    });
    const { estado } = await pedirEstado();
    const luz = estado.zonas[0]?.luces[0];
    expect(luz?.estadoReal).toBe('desconocido');
    expect(estado.alertas.some((a) => a.entidadId === 'luz-frente')).toBe(true);
  });

  it('suma personas solo si el hardware las cuenta', async () => {
    await prueba.bd.sensor.update({
      where: { id: 'sensor-frente' },
      data: { conteoPersonas: 12, presencia: true },
    });
    const { estado } = await pedirEstado();
    expect(estado.personasDetectadas).toBe(12);
  });

  it('responde 404 claro si la base no tiene salón', async () => {
    await prueba.cerrar();
    prueba = await crearAppDePrueba({ sinDatos: true });
    const { codigo, estado } = await pedirEstado();
    expect(codigo).toBe(404);
    expect((estado as unknown as { error: { codigo: string } }).error.codigo).toBe(
      'SALON_NO_CONFIGURADO',
    );
  });
});
