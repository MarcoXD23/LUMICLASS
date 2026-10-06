import type { EstadoSalonDto, EstadoSimuladorDto } from '@lumiclass/compartido';
import { afterEach, describe, expect, it } from 'vitest';
import { DriverSimulado } from '../src/drivers/driverSimulado';
import { crearAppDePrueba, nuevoId, type AppDePrueba } from './ayudantes/baseDatosPrueba';

let prueba: AppDePrueba<DriverSimulado>;
afterEach(() => prueba.cerrar());

const iniciar = async () => {
  prueba = await crearAppDePrueba({ driver: new DriverSimulado({ demoraLentoMs: 50 }) });
};

const sim = (url: string, payload?: object) =>
  prueba.app.inject({ method: 'POST', url: `/api/v1/sim${url}`, ...(payload ? { payload } : {}) });

const estadoSalon = async () =>
  (await prueba.app.inject({ method: 'GET', url: '/api/v1/salon/estado' })).json<EstadoSalonDto>();

const luz = (estado: EstadoSalonDto, id: string) =>
  estado.zonas.flatMap((z) => z.luces).find((l) => l.id === id);

describe('rutas /sim', () => {
  it('no existen si el driver no es el simulado', async () => {
    prueba = (await crearAppDePrueba()) as unknown as AppDePrueba<DriverSimulado>;
    expect((await sim('/reiniciar')).statusCode).toBe(404);
  });

  it('GET /sim/estado muestra los sensores y servos sincronizados', async () => {
    await iniciar();
    const respuesta = await prueba.app.inject({ method: 'GET', url: '/api/v1/sim/estado' });
    const estado = respuesta.json<EstadoSimuladorDto>();
    expect(estado.sensores.map((s) => s.id).sort()).toEqual(['sensor-fondo', 'sensor-frente']);
    expect(estado.actuadores.map((a) => a.id).sort()).toEqual(['servo-fondo', 'servo-frente']);
  });

  it('presencia en una zona → la regla enciende esa zona', async () => {
    await iniciar();
    expect((await sim('/presencia', { zonaId: 'zona-frente', presencia: true })).statusCode).toBe(
      200,
    );
    const estado = await estadoSalon();
    expect(estado.ocupado).toBe(true);
    expect(luz(estado, 'luz-frente')?.estadoReal).toBe('on');
    expect(luz(estado, 'luz-fondo')?.estadoReal).toBe('off');
  });

  it('presencia sin zona afecta a todo el salón y puede contar personas', async () => {
    await iniciar();
    await sim('/presencia', { presencia: true, conteoPersonas: 7 });
    const estado = await estadoSalon();
    expect(estado.resumen.lucesEncendidas).toBe(2);
    expect(estado.personasDetectadas).toBe(14); // 7 por cada uno de los 2 sensores
  });

  it('sensor en falla → alerta en el dashboard', async () => {
    await iniciar();
    await sim('/sensores/sensor-fondo', { conexion: 'falla' });
    const estado = await estadoSalon();
    expect(
      estado.alertas.some((a) => a.entidadId === 'sensor-fondo' && a.severidad === 'error'),
    ).toBe(true);
  });

  it('servo en falla → la orden responde 503 y la luz queda desconocida', async () => {
    await iniciar();
    await sim('/actuadores/servo-fondo', { respuesta: 'falla' });
    const orden = await prueba.app.inject({
      method: 'POST',
      url: '/api/v1/luces/luz-fondo/comando',
      payload: { accion: 'encender', idSolicitud: nuevoId() },
    });
    expect(orden.statusCode).toBe(503);
    expect(luz(await estadoSalon(), 'luz-fondo')?.estadoReal).toBe('desconocido');
  });

  it('servo sin respuesta → 503 por tiempo, sin bloquear la API', async () => {
    await iniciar();
    await sim('/actuadores/servo-fondo', { respuesta: 'sin_respuesta' });
    const orden = await prueba.app.inject({
      method: 'POST',
      url: '/api/v1/luces/luz-fondo/comando',
      payload: { accion: 'encender', idSolicitud: nuevoId() },
    });
    expect(orden.statusCode).toBe(503);
    expect(orden.json().error.mensaje).toMatch(/sin respuesta/);
  });

  it('servo lento → responde bien después de la demora', async () => {
    await iniciar();
    await sim('/actuadores/servo-fondo', { respuesta: 'lento' });
    const orden = await prueba.app.inject({
      method: 'POST',
      url: '/api/v1/luces/luz-fondo/comando',
      payload: { accion: 'encender', idSolicitud: nuevoId() },
    });
    expect(orden.statusCode).toBe(200);
  });

  it('interruptor a mano → el sistema registra el cambio', async () => {
    await iniciar();
    await sim('/luces/luz-fondo', { estado: 'on' });
    expect(luz(await estadoSalon(), 'luz-fondo')?.estadoReal).toBe('on');
    const evento = await prueba.bd.evento.findFirst({
      where: { origen: 'simulador', tipo: 'luz_encendida' },
    });
    expect(evento?.mensaje).toMatch(/a mano/);
  });

  it('reiniciar deja todo como al inicio', async () => {
    await iniciar();
    await sim('/presencia', { presencia: true });
    await sim('/sensores/sensor-fondo', { conexion: 'falla' });
    await sim('/actuadores/servo-frente', { respuesta: 'falla' });
    await prueba.app.inject({
      method: 'PATCH',
      url: '/api/v1/zonas/zona-fondo/modo',
      payload: { modo: 'manual' },
    });
    expect((await sim('/reiniciar')).statusCode).toBe(200);
    const estado = await estadoSalon();
    expect(estado.ocupado).toBe(false);
    expect(estado.resumen.lucesEncendidas).toBe(0);
    expect(estado.alertas).toEqual([]);
    expect(estado.zonas.every((z) => z.modo === 'automatico')).toBe(true);
    expect(prueba.driver.estadoSimulacion().actuadores.every((a) => a.respuesta === 'ok')).toBe(
      true,
    );
  });

  it('valida datos y responde 404 con ids inexistentes', async () => {
    await iniciar();
    expect((await sim('/presencia', { presencia: 'mucha' })).statusCode).toBe(400);
    expect((await sim('/actuadores/servo-frente', { respuesta: 'explota' })).statusCode).toBe(400);
    expect((await sim('/presencia', { zonaId: 'zona-x', presencia: true })).statusCode).toBe(404);
    expect((await sim('/sensores/nada', { conexion: 'falla' })).statusCode).toBe(404);
    expect((await sim('/luces/nada', { estado: 'on' })).statusCode).toBe(404);
  });
});
