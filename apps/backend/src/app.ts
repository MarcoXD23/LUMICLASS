import Fastify from 'fastify';
import type { Entorno } from './config/entorno';
import type { BaseDatos } from './db/cliente';
import { relojReal, type Reloj } from './dominio/reloj';
import type { DriverHardware } from './drivers/driver';
import { DriverSimulado } from './drivers/driverSimulado';
import { registrarManejoErrores } from './api/manejoErrores';
import { rutasEventos } from './api/rutasEventos';
import { rutasLuces } from './api/rutasLuces';
import { rutasReglas } from './api/rutasReglas';
import { rutasSalon } from './api/rutasSalon';
import { rutasSensores } from './api/rutasSensores';
import { rutasSimulador } from './api/rutasSimulador';
import { rutasZonas } from './api/rutasZonas';
import { ServicioEventos } from './servicios/eventos';
import { RegistroSolicitudes } from './servicios/idempotencia';
import { ServicioLuces } from './servicios/luces';
import { MotorReglas } from './servicios/motorReglas';
import { ServicioPresencia } from './servicios/presencia';
import { ServicioReglas } from './servicios/reglas';
import { ServicioSalon } from './servicios/salon';
import { ServicioSensores } from './servicios/sensores';
import { ServicioSimulador } from './servicios/simulador';
import { ServicioZonas } from './servicios/zonas';

export interface DependenciasApp {
  entorno: Entorno;
  bd: BaseDatos;
  driver: DriverHardware;
  /** Por defecto, el reloj del sistema; las pruebas usan uno manual. */
  reloj?: Reloj;
  registrar?: boolean;
}

export type Servicios = ReturnType<typeof crearServicios>;

export function crearServicios({ entorno, bd, driver, reloj = relojReal }: DependenciasApp) {
  const eventos = new ServicioEventos(bd);
  const luces = new ServicioLuces(bd, driver, eventos, entorno.TIEMPO_MAX_ACTUADOR_MS);
  const zonas = new ServicioZonas(bd, luces, eventos);
  const reglas = new ServicioReglas(bd, eventos);
  const presencia = new ServicioPresencia(bd, eventos);
  const motor = new MotorReglas(bd, luces, reglas, reloj, entorno.INTERVALO_REGLAS_MS);
  presencia.alProcesarZona = (zonaId) => void motor.evaluarZona(zonaId);

  return {
    entorno,
    bd,
    driver,
    eventos,
    luces,
    zonas,
    reglas,
    presencia,
    motor,
    sensores: new ServicioSensores(bd),
    salon: new ServicioSalon(bd, zonas, driver),
    solicitudes: new RegistroSolicitudes(bd),
    simulador:
      driver instanceof DriverSimulado
        ? new ServicioSimulador(bd, driver, presencia, motor, eventos)
        : null,
  };
}

/** Construye la app sin abrir el puerto, para poder probarla con inject(). */
export function construirApp(dependencias: DependenciasApp) {
  const app = Fastify({ logger: dependencias.registrar ?? false, bodyLimit: 64 * 1024 });
  const servicios = crearServicios(dependencias);
  let dejarDeEscuchar: (() => void) | null = null;

  registrarManejoErrores(app);

  app.addHook('onReady', async () => {
    await servicios.luces.liberarActuadoresBloqueados();
    dejarDeEscuchar = servicios.driver.alCambiarPresencia((lectura) => {
      servicios.presencia.procesar(lectura).catch((error: unknown) => app.log.error(error));
    });
    await servicios.simulador?.sincronizar();
    await servicios.motor.iniciar();
  });

  app.addHook('onClose', async () => {
    dejarDeEscuchar?.();
    servicios.motor.detener();
    await servicios.presencia.esperar();
    await servicios.motor.esperarInactivo();
  });

  app.register(
    async (api) => {
      rutasSalon(api, servicios);
      rutasZonas(api, servicios);
      rutasLuces(api, servicios);
      rutasSensores(api, servicios);
      rutasReglas(api, servicios);
      rutasEventos(api, servicios);
      if (servicios.simulador) rutasSimulador(api, servicios.simulador);
    },
    { prefix: '/api/v1' },
  );

  return Object.assign(app, { servicios });
}
