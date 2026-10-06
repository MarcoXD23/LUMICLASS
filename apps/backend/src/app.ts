import Fastify from 'fastify';
import type { Entorno } from './config/entorno';
import type { BaseDatos } from './db/cliente';
import type { DriverHardware } from './drivers/driver';
import { registrarManejoErrores } from './api/manejoErrores';
import { rutasEventos } from './api/rutasEventos';
import { rutasLuces } from './api/rutasLuces';
import { rutasReglas } from './api/rutasReglas';
import { rutasSalon } from './api/rutasSalon';
import { rutasSensores } from './api/rutasSensores';
import { rutasZonas } from './api/rutasZonas';
import { ServicioEventos } from './servicios/eventos';
import { RegistroSolicitudes } from './servicios/idempotencia';
import { ServicioLuces } from './servicios/luces';
import { ServicioReglas } from './servicios/reglas';
import { ServicioSalon } from './servicios/salon';
import { ServicioSensores } from './servicios/sensores';
import { ServicioZonas } from './servicios/zonas';

export interface DependenciasApp {
  entorno: Entorno;
  bd: BaseDatos;
  driver: DriverHardware;
  registrar?: boolean;
}

export type Servicios = ReturnType<typeof crearServicios>;

export function crearServicios({ entorno, bd, driver }: DependenciasApp) {
  const eventos = new ServicioEventos(bd);
  const luces = new ServicioLuces(bd, driver, eventos, entorno.TIEMPO_MAX_ACTUADOR_MS);
  const zonas = new ServicioZonas(bd, luces, eventos);
  return {
    entorno,
    bd,
    driver,
    eventos,
    luces,
    zonas,
    sensores: new ServicioSensores(bd),
    reglas: new ServicioReglas(bd, eventos),
    salon: new ServicioSalon(bd, zonas, driver),
    solicitudes: new RegistroSolicitudes(bd),
  };
}

/** Construye la app sin abrir el puerto, para poder probarla con inject(). */
export function construirApp(dependencias: DependenciasApp) {
  const app = Fastify({ logger: dependencias.registrar ?? false, bodyLimit: 64 * 1024 });
  const servicios = crearServicios(dependencias);

  registrarManejoErrores(app);
  app.addHook('onReady', async () => {
    await servicios.luces.liberarActuadoresBloqueados();
  });

  app.register(
    async (api) => {
      rutasSalon(api, servicios);
      rutasZonas(api, servicios);
      rutasLuces(api, servicios);
      rutasSensores(api, servicios);
      rutasReglas(api, servicios);
      rutasEventos(api, servicios);
    },
    { prefix: '/api/v1' },
  );

  return app;
}
