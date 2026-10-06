import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { LecturaSensor } from '../src/drivers/driver';
import { crearAppDePrueba, type AppDePrueba } from './ayudantes/baseDatosPrueba';

let prueba: AppDePrueba;
beforeEach(async () => {
  prueba = await crearAppDePrueba();
});
afterEach(() => prueba.cerrar());

const lectura = (cambios: Partial<LecturaSensor> = {}): LecturaSensor => ({
  sensorId: 'sensor-frente',
  conexion: 'activo',
  presencia: true,
  conteoPersonas: null,
  fecha: new Date('2026-10-05T15:00:00Z'),
  ...cambios,
});

const emitir = async (cambios: Partial<LecturaSensor> = {}) => {
  prueba.driver.emitir(lectura(cambios));
  await prueba.esperarEfectos();
};

const eventos = (tipo: string) => prueba.bd.evento.findMany({ where: { tipo } });

describe('ServicioPresencia', () => {
  it('guarda la lectura y registra presencia solo cuando cambia', async () => {
    await emitir();
    await emitir(); // misma presencia: no hay evento nuevo
    const sensor = await prueba.bd.sensor.findUnique({ where: { id: 'sensor-frente' } });
    expect(sensor).toMatchObject({ presencia: true, conexion: 'activo' });
    expect(sensor?.ultimaLectura?.toISOString()).toBe('2026-10-05T15:00:00.000Z');
    expect(await eventos('presencia_detectada')).toHaveLength(1);

    await emitir({ presencia: false });
    expect(await eventos('salon_vacio')).toHaveLength(1);
  });

  it('registra la falla del sensor y su recuperación', async () => {
    await emitir({ conexion: 'falla', presencia: false });
    const [falla] = await eventos('error_sensor');
    expect(falla).toMatchObject({ severidad: 'error', entidadId: 'sensor-frente' });

    await emitir({ conexion: 'activo', presencia: false });
    const recuperado = await prueba.bd.evento.findFirst({
      where: { mensaje: { contains: 'recuperado' } },
    });
    expect(recuperado).not.toBeNull();
  });

  it('un sensor en falla no cuenta como presencia', async () => {
    await emitir({ conexion: 'falla', presencia: true });
    const sensor = await prueba.bd.sensor.findUnique({ where: { id: 'sensor-frente' } });
    expect(sensor?.presencia).toBe(false);
  });

  it('ignora lecturas inválidas o de sensores desconocidos sin romperse', async () => {
    await emitir({ conteoPersonas: -5 });
    await emitir({ presencia: 'si' as unknown as boolean });
    await emitir({ sensorId: 'sensor-fantasma' });
    expect(await eventos('error_sensor')).toHaveLength(3);
    const sensor = await prueba.bd.sensor.findUnique({ where: { id: 'sensor-frente' } });
    expect(sensor?.presencia).toBe(false);
  });

  it('procesa en orden muchas lecturas seguidas', async () => {
    for (let i = 0; i < 10; i++) prueba.driver.emitir(lectura({ presencia: i % 2 === 0 }));
    await prueba.esperarEfectos();
    const sensor = await prueba.bd.sensor.findUnique({ where: { id: 'sensor-frente' } });
    expect(sensor?.presencia).toBe(false); // la última (i = 9) es sin presencia
    expect(await eventos('presencia_detectada')).toHaveLength(5);
  });
});
