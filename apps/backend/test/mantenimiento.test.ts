import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { crearAppDePrueba, type AppDePrueba } from './ayudantes/baseDatosPrueba';

const UN_DIA_MS = 24 * 60 * 60 * 1000;

let prueba: AppDePrueba;
beforeEach(async () => {
  prueba = await crearAppDePrueba();
});
afterEach(() => prueba.cerrar());

const haceDias = (dias: number) => new Date(prueba.reloj.ahora().getTime() - dias * UN_DIA_MS);

describe('ServicioMantenimiento (borrado lógico: marca, no borra)', () => {
  it('nunca borra eventos, aunque sean muy antiguos', async () => {
    await prueba.bd.evento.create({
      data: { tipo: 'sistema', origen: 'sistema', mensaje: 'de hace 2 años', fecha: haceDias(730) },
    });
    await prueba.servicios.mantenimiento.ejecutar();
    expect(await prueba.bd.evento.count({ where: { mensaje: 'de hace 2 años' } })).toBe(1);
  });

  it('marca como vencidas las órdenes de más de 24 h (siguen guardadas)', async () => {
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
    expect((await prueba.servicios.mantenimiento.ejecutar()).solicitudes).toBe(1);
    expect(await prueba.bd.solicitudProcesada.count()).toBe(2);
    const vieja = await prueba.bd.solicitudProcesada.findUnique({
      where: { idSolicitud: 'viejo-123' },
    });
    expect(vieja?.vencidaEn).not.toBeNull();
  });

  it('marca sesiones y enlaces de recuperación vencidos', async () => {
    const admin = await prueba.bd.usuario.findUniqueOrThrow({
      where: { correo: 'admin@prueba.local' },
    });
    await prueba.bd.sesion.create({
      data: { usuarioId: admin.id, tokenHash: 'h-sesion-vieja', expiraEn: haceDias(1) },
    });
    await prueba.bd.tokenRecuperacion.create({
      data: { usuarioId: admin.id, tokenHash: 'h-token-viejo', expiraEn: haceDias(1) },
    });
    const resultado = await prueba.servicios.mantenimiento.ejecutar();
    expect(resultado).toMatchObject({ sesiones: 1, tokens: 1 });
    const sesion = await prueba.bd.sesion.findUnique({ where: { tokenHash: 'h-sesion-vieja' } });
    expect(sesion?.activa).toBe(false);
    const token = await prueba.bd.tokenRecuperacion.findUnique({
      where: { tokenHash: 'h-token-viejo' },
    });
    expect(token?.estado).toBe('vencido');
  });

  it('se repite una vez al día', async () => {
    await prueba.bd.solicitudProcesada.create({
      data: {
        idSolicitud: 'orden-123',
        ruta: 'x',
        codigoEstado: 200,
        respuesta: '{}',
        fecha: haceDias(0.5),
      },
    });
    prueba.servicios.motor.detener(); // solo interesa el temporizador de mantenimiento
    await prueba.avanzar(UN_DIA_MS);
    const orden = await prueba.bd.solicitudProcesada.findUnique({
      where: { idSolicitud: 'orden-123' },
    });
    expect(orden?.vencidaEn).not.toBeNull();
  });
});
