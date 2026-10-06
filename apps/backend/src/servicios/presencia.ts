import { CONEXIONES } from '@lumiclass/compartido';
import type { BaseDatos } from '../db/cliente';
import type { LecturaSensor } from '../drivers/driver';
import type { ServicioEventos } from './eventos';
import { aSensorDto, calcularOcupacion } from './sensores';

/** Revisa que una lectura del driver tenga sentido antes de guardarla. */
function lecturaValida(lectura: LecturaSensor): boolean {
  return (
    typeof lectura.sensorId === 'string' &&
    lectura.sensorId.length > 0 &&
    (CONEXIONES as readonly string[]).includes(lectura.conexion) &&
    typeof lectura.presencia === 'boolean' &&
    (lectura.conteoPersonas === null ||
      (Number.isInteger(lectura.conteoPersonas) && lectura.conteoPersonas >= 0)) &&
    lectura.fecha instanceof Date &&
    !Number.isNaN(lectura.fecha.getTime())
  );
}

/**
 * Recibe las lecturas del driver, actualiza los sensores, registra eventos
 * y avisa qué zona cambió. Procesa una lectura a la vez para que no se pisen.
 */
export class ServicioPresencia {
  private cola: Promise<unknown> = Promise.resolve();
  /** Se llama con la zona cuya lectura se procesó (lo conecta el motor de reglas). */
  alProcesarZona: (zonaId: string) => void = () => undefined;

  constructor(
    private readonly bd: BaseDatos,
    private readonly eventos: ServicioEventos,
  ) {}

  procesar(lectura: LecturaSensor): Promise<void> {
    const tarea = this.cola.then(() => this.procesarAhora(lectura));
    this.cola = tarea.catch(() => undefined);
    return tarea;
  }

  /** Espera a que se procesen las lecturas pendientes. */
  async esperar(): Promise<void> {
    await this.cola;
  }

  private async procesarAhora(lectura: LecturaSensor): Promise<void> {
    if (!lecturaValida(lectura)) {
      await this.eventos.registrar({
        tipo: 'error_sensor',
        origen: 'sistema',
        severidad: 'advertencia',
        entidad: 'sensor',
        entidadId: typeof lectura.sensorId === 'string' ? lectura.sensorId : undefined,
        mensaje: 'Se ignoró una lectura de sensor con datos inválidos',
      });
      return;
    }

    const sensor = await this.bd.sensor.findUnique({
      where: { id: lectura.sensorId },
      include: { zona: { include: { sensores: true } } },
    });
    if (!sensor) {
      await this.eventos.registrar({
        tipo: 'error_sensor',
        origen: 'sistema',
        severidad: 'advertencia',
        entidadId: lectura.sensorId,
        mensaje: `Llegó una lectura de un sensor desconocido ("${lectura.sensorId}")`,
      });
      return;
    }

    const ocupadaAntes = calcularOcupacion(sensor.zona.sensores.map(aSensorDto));
    const activo = lectura.conexion === 'activo';
    await this.bd.sensor.update({
      where: { id: sensor.id },
      data: {
        conexion: lectura.conexion,
        presencia: activo && lectura.presencia,
        conteoPersonas: activo ? lectura.conteoPersonas : null,
        ...(activo ? { ultimaLectura: lectura.fecha } : {}),
      },
    });
    const sensoresZona = await this.bd.sensor.findMany({ where: { zonaId: sensor.zonaId } });
    const ocupadaAhora = calcularOcupacion(sensoresZona.map(aSensorDto));

    await this.registrarCambioConexion(sensor, lectura.conexion);
    if (ocupadaAhora !== null && ocupadaAhora !== ocupadaAntes) {
      await this.eventos.registrar({
        tipo: ocupadaAhora ? 'presencia_detectada' : 'salon_vacio',
        origen: 'sistema',
        entidad: 'zona',
        entidadId: sensor.zonaId,
        mensaje: ocupadaAhora
          ? `Presencia detectada en la zona "${sensor.zona.nombre}"`
          : `La zona "${sensor.zona.nombre}" quedó sin presencia`,
        datos: { sensorId: sensor.id },
      });
    }
    this.alProcesarZona(sensor.zonaId);
  }

  private async registrarCambioConexion(
    sensor: { id: string; nombre: string; conexion: string },
    nueva: LecturaSensor['conexion'],
  ): Promise<void> {
    if (sensor.conexion === nueva) return;
    if (nueva === 'activo') {
      await this.eventos.registrar({
        tipo: 'sistema',
        origen: 'sistema',
        entidad: 'sensor',
        entidadId: sensor.id,
        mensaje: `Sensor "${sensor.nombre}" recuperado`,
      });
      return;
    }
    await this.eventos.registrar({
      tipo: 'error_sensor',
      origen: 'sistema',
      severidad: nueva === 'falla' ? 'error' : 'advertencia',
      entidad: 'sensor',
      entidadId: sensor.id,
      mensaje: `Sensor "${sensor.nombre}" ${nueva === 'falla' ? 'en falla' : 'desconectado'}`,
    });
  }
}
