import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { crearAppDePrueba, type AppDePrueba } from './ayudantes/baseDatosPrueba';

const SEGUNDO = 1000;

let prueba: AppDePrueba;
beforeEach(async () => {
  prueba = await crearAppDePrueba();
});
afterEach(() => prueba.cerrar());

const presencia = async (
  sensorId: string,
  hay: boolean,
  conexion: 'activo' | 'falla' = 'activo',
) => {
  prueba.driver.emitir({
    sensorId,
    conexion,
    presencia: hay,
    conteoPersonas: null,
    fecha: prueba.reloj.ahora(),
  });
  await prueba.esperarEfectos();
};

const estadoLuz = async (luzId: string) =>
  (await prueba.bd.luz.findUnique({ where: { id: luzId } }))?.estadoReal;

describe('MotorReglas con las reglas iniciales', () => {
  it('ocupado → enciende la luz de esa zona al instante', async () => {
    await presencia('sensor-frente', true);
    expect(await estadoLuz('luz-frente')).toBe('on');
    expect(await estadoLuz('luz-fondo')).toBe('off');
    const evento = await prueba.bd.evento.findFirst({ where: { tipo: 'luz_encendida' } });
    expect(evento).toMatchObject({ origen: 'regla' });
    expect(JSON.parse(evento?.datos ?? '{}')).toMatchObject({ reglaId: 'regla-encender-ocupado' });
  });

  it('vacío → apaga solo después de 300 s', async () => {
    await presencia('sensor-frente', true);
    await presencia('sensor-frente', false);
    await prueba.avanzar(299 * SEGUNDO);
    expect(await estadoLuz('luz-frente')).toBe('on');
    await prueba.avanzar(1 * SEGUNDO);
    expect(await estadoLuz('luz-frente')).toBe('off');
  });

  it('si alguien vuelve antes de los 300 s, no apaga', async () => {
    await presencia('sensor-frente', true);
    await presencia('sensor-frente', false);
    await prueba.avanzar(200 * SEGUNDO);
    await presencia('sensor-frente', true);
    await prueba.avanzar(400 * SEGUNDO);
    expect(await estadoLuz('luz-frente')).toBe('on');
  });

  it('el conteo de 300 s se reinicia en cada nueva salida', async () => {
    await presencia('sensor-frente', true);
    await presencia('sensor-frente', false);
    await prueba.avanzar(200 * SEGUNDO);
    await presencia('sensor-frente', true);
    await presencia('sensor-frente', false);
    await prueba.avanzar(200 * SEGUNDO);
    expect(await estadoLuz('luz-frente')).toBe('on');
    await prueba.avanzar(100 * SEGUNDO);
    expect(await estadoLuz('luz-frente')).toBe('off');
  });

  it('no actúa en zonas en modo manual', async () => {
    await prueba.bd.zona.update({ where: { id: 'zona-frente' }, data: { modo: 'manual' } });
    await presencia('sensor-frente', true);
    expect(await estadoLuz('luz-frente')).toBe('off');
  });

  it('si el sensor falla, no apaga la luz (ocupación desconocida)', async () => {
    await presencia('sensor-frente', true);
    await presencia('sensor-frente', false, 'falla');
    await prueba.avanzar(600 * SEGUNDO);
    expect(await estadoLuz('luz-frente')).toBe('on');
  });

  it('al volver a automático aplica las reglas de inmediato', async () => {
    await prueba.bd.zona.update({ where: { id: 'zona-frente' }, data: { modo: 'manual' } });
    await presencia('sensor-frente', true);
    const respuesta = await prueba.app.inject({
      method: 'PATCH',
      url: '/api/v1/zonas/zona-frente/modo',
      payload: { modo: 'automatico' },
    });
    expect(respuesta.json().luces[0].estadoReal).toBe('on');
  });

  it('una falla del servo no detiene el motor', async () => {
    await prueba.bd.actuador.update({ where: { id: 'servo-frente' }, data: { conexion: 'falla' } });
    await presencia('sensor-frente', true);
    await presencia('sensor-fondo', true);
    expect(await estadoLuz('luz-frente')).toBe('off');
    expect(await estadoLuz('luz-fondo')).toBe('on');
  });
});

describe('MotorReglas con reglas editadas', () => {
  const crearRegla = (regla: object) =>
    prueba.app.inject({ method: 'POST', url: '/api/v1/reglas', payload: regla });

  it('respeta la prioridad: gana el número menor', async () => {
    // Regla más prioritaria que dice apagar aunque haya gente (p. ej. "clase con proyector").
    await crearRegla({
      nombre: 'Proyector en el frente',
      prioridad: 1,
      zonaId: 'zona-frente',
      condicion: { tipo: 'presencia', valor: 'ocupado' },
      accion: { tipo: 'apagar' },
    });
    await prueba.bd.luz.update({ where: { id: 'luz-frente' }, data: { estadoReal: 'on' } });
    await presencia('sensor-frente', true);
    expect(await estadoLuz('luz-frente')).toBe('off');
    await presencia('sensor-fondo', true);
    expect(await estadoLuz('luz-fondo')).toBe('on'); // la regla solo aplica al frente
  });

  it('respeta el horario de la regla', async () => {
    // El reloj de prueba marca las 10:00.
    await prueba.bd.regla.update({
      where: { id: 'regla-encender-ocupado' },
      data: {
        condicion: JSON.stringify({
          tipo: 'presencia',
          valor: 'ocupado',
          duracionSegundos: 0,
          horario: { desde: '14:00', hasta: '18:00' },
        }),
      },
    });
    await presencia('sensor-frente', true);
    expect(await estadoLuz('luz-frente')).toBe('off');
    // A las 14:00 la revisión periódica la enciende.
    await prueba.avanzar(4 * 60 * 60 * SEGUNDO);
    expect(await estadoLuz('luz-frente')).toBe('on');
  });

  it('ignora reglas inactivas y reglas corruptas', async () => {
    await prueba.bd.regla.update({
      where: { id: 'regla-encender-ocupado' },
      data: { activa: false },
    });
    await prueba.bd.regla.create({
      data: { nombre: 'Corrupta', prioridad: 0, condicion: '{roto', accion: '{}' },
    });
    await presencia('sensor-frente', true);
    expect(await estadoLuz('luz-frente')).toBe('off');
  });
});
