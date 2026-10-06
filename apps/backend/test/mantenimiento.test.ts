import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { crearAppDePrueba, type AppDePrueba } from './ayudantes/baseDatosPrueba';

const UN_DIA_MS = 24 * 60 * 60 * 1000;

let prueba: AppDePrueba;
beforeEach(async () => {
  prueba = await crearAppDePrueba({ entorno: { DIAS_RETENCION_EVENTOS: '30' } });
});
afterEach(() => prueba.cerrar());

const haceDias = (dias: number) => new Date(prueba.reloj.ahora().getTime() - dias * UN_DIA_MS);

describe('ServicioMantenimiento', () => {
  it('borra eventos más antiguos que la retención y lo registra', async () => {
    await prueba.bd.evento.create({
      data: { tipo: 'sistema', origen: 'sistema', mensaje: 'viejo', fecha: haceDias(31) },
    });
    await prueba.bd.evento.create({
      data: { tipo: 'sistema', origen: 'sistema', mensaje: 'reciente', fecha: haceDias(29) },
    });
    const resultado = await prueba.servicios.mantenimiento.limpiar();
    expect(resultado.eventos).toBe(1);
    expect(await prueba.bd.evento.count({ where: { mensaje: 'viejo' } })).toBe(0);
    expect(await prueba.bd.evento.count({ where: { mensaje: 'reciente' } })).toBe(1);
    expect(
      await prueba.bd.evento.count({ where: { mensaje: { contains: 'Se borraron 1' } } }),
    ).toBe(1);
  });

  it('borra los idSolicitud de más de 24 h', async () => {
    await prueba.bd.solicitudProcesada.createMany({
      data: [
        {
          idSolicitud: 'viejo-123',
          ruta: 'x',
          codigoEstado: 200,
          respuesta: '{}',
          fecha: haceDias(2),
        },
        {
          idSolicitud: 'nuevo-123',
          ruta: 'x',
          codigoEstado: 200,
          respuesta: '{}',
          fecha: haceDias(0),
        },
      ],
    });
    expect((await prueba.servicios.mantenimiento.limpiar()).solicitudes).toBe(1);
    expect(await prueba.bd.solicitudProcesada.count()).toBe(1);
  });

  it('se repite una vez al día', async () => {
    await prueba.bd.evento.create({
      data: { tipo: 'sistema', origen: 'sistema', mensaje: 'viejo', fecha: haceDias(29.5) },
    });
    prueba.servicios.motor.detener(); // solo interesa el temporizador de limpieza
    await prueba.avanzar(UN_DIA_MS);
    expect(await prueba.bd.evento.count({ where: { mensaje: 'viejo' } })).toBe(0);
  });
});
