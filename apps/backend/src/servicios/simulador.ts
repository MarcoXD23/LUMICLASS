import type {
  Conexion,
  EstadoSimuladorDto,
  RespuestaServo,
  SimPresencia,
} from '@lumiclass/compartido';
import type { BaseDatos } from '../db/cliente';
import { noEncontrado } from '../dominio/errores';
import type { DriverSimulado } from '../drivers/driverSimulado';
import type { ServicioEventos } from './eventos';
import type { MotorReglas } from './motorReglas';
import type { ServicioPresencia } from './presencia';

/** Controles de la página "Simulador": cambian el hardware simulado y esperan sus efectos. */
export class ServicioSimulador {
  constructor(
    private readonly bd: BaseDatos,
    private readonly driver: DriverSimulado,
    private readonly presencia: ServicioPresencia,
    private readonly motor: MotorReglas,
    private readonly eventos: ServicioEventos,
  ) {}

  /** Al arrancar: sensores activos y sin presencia; cada interruptor en la posición guardada. */
  async sincronizar(): Promise<void> {
    const [sensores, luces] = await Promise.all([
      this.bd.sensor.findMany({ where: { inactivoDesde: null }, select: { id: true } }),
      this.bd.luz.findMany({
        where: { inactivoDesde: null },
        select: { actuadorId: true, estadoReal: true },
      }),
    ]);
    for (const luz of luces) {
      this.driver.forzarLuz(luz.actuadorId, luz.estadoReal === 'on' ? 'on' : 'off');
    }
    for (const sensor of sensores) this.driver.simularConexionSensor(sensor.id, 'activo');
    await this.esperarEfectos();
  }

  estado(): EstadoSimuladorDto {
    return this.driver.estadoSimulacion();
  }

  /** Fuerza presencia en una zona o, sin zonaId, en todo el salón. */
  async forzarPresencia(entrada: SimPresencia): Promise<EstadoSimuladorDto> {
    if (entrada.zonaId) {
      const zona = await this.bd.zona.findUnique({ where: { id: entrada.zonaId } });
      if (!zona) throw noEncontrado('una zona', entrada.zonaId);
    }
    const sensores = await this.bd.sensor.findMany({
      where: { inactivoDesde: null, ...(entrada.zonaId ? { zonaId: entrada.zonaId } : {}) },
      select: { id: true },
    });
    for (const sensor of sensores) {
      this.driver.simularPresencia(sensor.id, entrada.presencia, entrada.conteoPersonas ?? null);
    }
    await this.esperarEfectos();
    return this.estado();
  }

  async cambiarConexionSensor(sensorId: string, conexion: Conexion): Promise<EstadoSimuladorDto> {
    const sensor = await this.bd.sensor.findUnique({ where: { id: sensorId } });
    if (!sensor) throw noEncontrado('un sensor', sensorId);
    this.driver.simularConexionSensor(sensorId, conexion);
    await this.esperarEfectos();
    return this.estado();
  }

  async configurarServo(
    actuadorId: string,
    respuesta: RespuestaServo,
  ): Promise<EstadoSimuladorDto> {
    const actuador = await this.bd.actuador.findUnique({ where: { id: actuadorId } });
    if (!actuador) throw noEncontrado('un servo', actuadorId);
    this.driver.configurarServo(actuadorId, respuesta);
    await this.eventos.registrar({
      tipo: 'sistema',
      origen: 'simulador',
      entidad: 'actuador',
      entidadId: actuadorId,
      mensaje: `Simulador: "${actuador.nombre}" responderá "${respuesta}"`,
      datos: { respuesta },
    });
    return this.estado();
  }

  /** Simula que alguien movió el interruptor a mano: el sistema solo se entera del nuevo estado. */
  async forzarLuz(luzId: string, estado: 'on' | 'off'): Promise<EstadoSimuladorDto> {
    const luz = await this.bd.luz.findUnique({ where: { id: luzId } });
    if (!luz) throw noEncontrado('una luz', luzId);
    this.driver.forzarLuz(luz.actuadorId, estado);
    if (luz.estadoReal !== estado) {
      await this.bd.luz.update({ where: { id: luzId }, data: { estadoReal: estado } });
      await this.eventos.registrar({
        tipo: estado === 'on' ? 'luz_encendida' : 'luz_apagada',
        origen: 'simulador',
        entidad: 'luz',
        entidadId: luzId,
        mensaje: `Luz "${luz.nombre}" ${estado === 'on' ? 'encendida' : 'apagada'} a mano (interruptor)`,
        datos: { zonaId: luz.zonaId, manual: true },
      });
    }
    return this.estado();
  }

  /** Todo a valores iniciales: sin presencia, sensores y servos ok, luces apagadas, zonas en automático. */
  async reiniciar(): Promise<EstadoSimuladorDto> {
    this.driver.reiniciar();
    this.motor.reiniciar();
    await this.presencia.esperar();
    await this.bd.$transaction([
      this.bd.sensor.updateMany({
        data: { presencia: false, conexion: 'activo', conteoPersonas: null },
      }),
      this.bd.actuador.updateMany({
        data: { conexion: 'activo', ocupado: false, ultimoResultado: null },
      }),
      this.bd.luz.updateMany({ data: { estadoDeseado: 'off', estadoReal: 'off' } }),
      this.bd.zona.updateMany({ data: { modo: 'automatico' } }),
    ]);
    await this.eventos.registrar({
      tipo: 'sistema',
      origen: 'simulador',
      mensaje: 'Simulación reiniciada',
    });
    await this.sincronizar();
    return this.estado();
  }

  /** Espera a que el servicio de presencia y el motor terminen de reaccionar. */
  private async esperarEfectos(): Promise<void> {
    await this.presencia.esperar();
    await this.motor.esperarInactivo();
  }
}
