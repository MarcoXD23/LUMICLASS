import Fastify from 'fastify';
import type { Entorno } from './config/entorno';
import type { BaseDatos } from './db/cliente';
import { relojReal, type Reloj } from './dominio/reloj';
import type { DriverHardware } from './drivers/driver';
import { DriverSimulado } from './drivers/driverSimulado';
import { exigirSesion } from './api/autorizacion';
import { registrarManejoErrores } from './api/manejoErrores';
import { rutasAuth } from './api/rutasAuth';
import { rutasEstadisticas } from './api/rutasEstadisticas';
import { rutasEventos } from './api/rutasEventos';
import { rutasLuces } from './api/rutasLuces';
import { rutasReglas } from './api/rutasReglas';
import { rutasSalon, rutasSalud } from './api/rutasSalon';
import { rutasSensores } from './api/rutasSensores';
import { rutasSimulador } from './api/rutasSimulador';
import { rutasTiempoReal } from './api/rutasTiempoReal';
import { rutasUsuarios } from './api/rutasUsuarios';
import { rutasZonas } from './api/rutasZonas';
import type { EventoDto } from '@lumiclass/compartido';
import { ServicioAutenticacion } from './servicios/autenticacion';
import { ServicioCorreo } from './servicios/correo';
import { Difusor } from './servicios/difusor';
import { ServicioEstadisticas } from './servicios/estadisticas';
import { ServicioEventos } from './servicios/eventos';
import { RegistroSolicitudes } from './servicios/idempotencia';
import { ServicioLuces } from './servicios/luces';
import { ServicioMantenimiento } from './servicios/mantenimiento';
import { MotorReglas } from './servicios/motorReglas';
import { ServicioPresencia } from './servicios/presencia';
import { ServicioReglas } from './servicios/reglas';
import { ServicioSalon } from './servicios/salon';
import { ServicioSensores } from './servicios/sensores';
import { ServicioSimulador } from './servicios/simulador';
import { ServicioUsuarios } from './servicios/usuarios';
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
  const difusor = new Difusor<EventoDto>();
  const eventos = new ServicioEventos(bd, difusor);
  const luces = new ServicioLuces(bd, driver, eventos, entorno.TIEMPO_MAX_ACTUADOR_MS);
  const zonas = new ServicioZonas(bd, luces, eventos);
  const reglas = new ServicioReglas(bd, eventos);
  const presencia = new ServicioPresencia(bd, eventos);
  const motor = new MotorReglas(bd, luces, reglas, reloj, entorno.INTERVALO_REGLAS_MS);
  presencia.alProcesarZona = (zonaId) => void motor.evaluarZona(zonaId);
  const correo = new ServicioCorreo(bd);
  const auth = new ServicioAutenticacion(
    bd,
    eventos,
    correo,
    reloj,
    entorno.DURACION_SESION_HORAS * 60 * 60 * 1000,
  );

  return {
    entorno,
    bd,
    driver,
    difusor,
    eventos,
    correo,
    auth,
    usuarios: new ServicioUsuarios(bd, eventos, reloj),
    luces,
    zonas,
    reglas,
    presencia,
    motor,
    sensores: new ServicioSensores(bd),
    salon: new ServicioSalon(bd, zonas, driver),
    solicitudes: new RegistroSolicitudes(bd),
    estadisticas: new ServicioEstadisticas(bd, reloj),
    mantenimiento: new ServicioMantenimiento(bd, eventos, reloj, entorno.DIAS_RETENCION_EVENTOS),
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
  let cerrarTiempoReal: () => void = () => undefined;

  registrarManejoErrores(app);
  app.decorateRequest('usuario', null);

  app.addHook('onReady', async () => {
    await servicios.luces.liberarActuadoresBloqueados();
    dejarDeEscuchar = servicios.driver.alCambiarPresencia((lectura) => {
      servicios.presencia.procesar(lectura).catch((error: unknown) => app.log.error(error));
    });
    await servicios.simulador?.sincronizar();
    await servicios.motor.iniciar();
    await servicios.mantenimiento.iniciar();
  });

  // Las conexiones SSE quedan abiertas: hay que cerrarlas para que el servidor pueda apagarse.
  app.addHook('preClose', async () => {
    cerrarTiempoReal();
  });

  app.addHook('onClose', async () => {
    dejarDeEscuchar?.();
    servicios.motor.detener();
    servicios.mantenimiento.detener();
    await servicios.presencia.esperar();
    await servicios.motor.esperarInactivo();
  });

  app.register(
    async (api) => {
      // Públicas: salud y autenticación.
      rutasSalud(api, servicios);
      rutasAuth(api, servicios.auth, servicios.correo, dependencias.entorno);

      // Todo lo demás exige sesión iniciada.
      await api.register(async (protegidas) => {
        exigirSesion(protegidas, servicios.auth);
        rutasSalon(protegidas, servicios);
        rutasZonas(protegidas, servicios);
        rutasLuces(protegidas, servicios);
        rutasSensores(protegidas, servicios);
        rutasReglas(protegidas, servicios);
        rutasEventos(protegidas, servicios);
        rutasEstadisticas(protegidas, servicios.estadisticas);
        rutasUsuarios(protegidas, servicios.usuarios);
        cerrarTiempoReal = rutasTiempoReal(protegidas, servicios.difusor, {
          maxConexiones: dependencias.entorno.MAX_CONEXIONES_SSE,
          latidoMs: dependencias.entorno.LATIDO_SSE_MS,
        });
        if (servicios.simulador) rutasSimulador(protegidas, servicios.simulador);
      });
    },
    { prefix: '/api/v1' },
  );

  return Object.assign(app, { servicios });
}
