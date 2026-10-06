import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { LecturaSensor } from '../src/drivers/driver';
import { DriverSimulado } from '../src/drivers/driverSimulado';

let driver: DriverSimulado;
let lecturas: LecturaSensor[];

beforeEach(async () => {
  driver = new DriverSimulado({ demoraLentoMs: 20 });
  lecturas = [];
  driver.alCambiarPresencia((lectura) => lecturas.push(lectura));
  await driver.iniciar();
});
afterEach(() => driver.detener());

describe('DriverSimulado: sensores', () => {
  it('emite una lectura al cambiar la presencia', () => {
    driver.simularPresencia('s1', true);
    expect(lecturas).toHaveLength(1);
    expect(lecturas[0]).toMatchObject({ sensorId: 's1', conexion: 'activo', presencia: true });
  });

  it('un sensor en falla informa la falla y luego no reporta presencia', () => {
    driver.simularConexionSensor('s1', 'falla');
    driver.simularPresencia('s1', true);
    expect(lecturas).toHaveLength(1);
    expect(lecturas[0]).toMatchObject({ conexion: 'falla', presencia: false });
  });

  it('al recuperarse informa la presencia guardada', () => {
    driver.simularConexionSensor('s1', 'inactivo');
    driver.simularPresencia('s1', true, 4);
    driver.simularConexionSensor('s1', 'activo');
    expect(lecturas.at(-1)).toMatchObject({
      conexion: 'activo',
      presencia: true,
      conteoPersonas: 4,
    });
  });

  it('no emite nada si el driver está detenido', async () => {
    await driver.detener();
    driver.simularPresencia('s1', true);
    expect(lecturas).toHaveLength(0);
  });
});

describe('DriverSimulado: servos', () => {
  it('ok: mueve el interruptor', async () => {
    expect(await driver.accionar('a1', 'encender')).toEqual({ ok: true, estadoReal: 'on' });
    expect(driver.estadoSimulacion().actuadores[0]).toMatchObject({ id: 'a1', estadoFisico: 'on' });
  });

  it('falla: no mueve el interruptor', async () => {
    driver.configurarServo('a1', 'falla');
    const resultado = await driver.accionar('a1', 'encender');
    expect(resultado.ok).toBe(false);
    expect(driver.estadoSimulacion().actuadores[0]?.estadoFisico).toBe('off');
  });

  it('lento: responde después de la demora configurada', async () => {
    driver.configurarServo('a1', 'lento');
    const inicio = Date.now();
    expect(await driver.accionar('a1', 'encender')).toMatchObject({ ok: true });
    expect(Date.now() - inicio).toBeGreaterThanOrEqual(15);
  });

  it('sin_respuesta: queda pendiente hasta que el driver se detiene', async () => {
    driver.configurarServo('a1', 'sin_respuesta');
    let terminado = false;
    const orden = driver.accionar('a1', 'encender').then((r) => {
      terminado = true;
      return r;
    });
    await new Promise((r) => setTimeout(r, 30));
    expect(terminado).toBe(false);
    await driver.detener();
    expect(await orden).toMatchObject({ ok: false });
  });

  it('desconectado: falla sin mover nada', async () => {
    await driver.detener();
    expect(await driver.accionar('a1', 'encender')).toMatchObject({ ok: false });
  });

  it('reiniciar vuelve todo a valores normales', async () => {
    driver.configurarServo('a1', 'falla');
    driver.forzarLuz('a1', 'on');
    driver.simularPresencia('s1', true);
    driver.reiniciar();
    const estado = driver.estadoSimulacion();
    expect(estado.actuadores[0]).toMatchObject({ respuesta: 'ok', estadoFisico: 'off' });
    expect(estado.sensores[0]).toMatchObject({ presencia: false, conexion: 'activo' });
  });
});
