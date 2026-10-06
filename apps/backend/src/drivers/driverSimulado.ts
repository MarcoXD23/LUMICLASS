import type {
  AccionLuz,
  Conexion,
  EstadoSimuladorDto,
  RespuestaServo,
} from '@lumiclass/compartido';
import type { DriverHardware, LecturaSensor, ResultadoAccion } from './driver';

interface SensorSimulado {
  presencia: boolean;
  conexion: Conexion;
  conteoPersonas: number | null;
}

interface ServoSimulado {
  respuesta: RespuestaServo;
  /** Posición real del interruptor (lo que "vería" alguien en el salón). */
  estadoFisico: 'on' | 'off';
}

const sensorInicial = (): SensorSimulado => ({
  presencia: false,
  conexion: 'activo',
  conteoPersonas: null,
});
const servoInicial = (): ServoSimulado => ({ respuesta: 'ok', estadoFisico: 'off' });

/**
 * Hardware simulado. Cumple la misma interfaz que el driver real y además permite
 * forzar presencia, fallas de sensor, la respuesta de cada servo y el interruptor a mano.
 * Los sensores y servos se crean al primer uso con valores normales.
 */
export class DriverSimulado implements DriverHardware {
  readonly nombre = 'simulado';
  private conectado = false;
  private readonly oyentes = new Set<(lectura: LecturaSensor) => void>();
  private readonly sensores = new Map<string, SensorSimulado>();
  private readonly servos = new Map<string, ServoSimulado>();
  /** Órdenes "sin respuesta" pendientes; se liberan al detener el driver. */
  private readonly pendientes = new Set<(resultado: ResultadoAccion) => void>();

  constructor(private readonly opciones: { demoraLentoMs: number } = { demoraLentoMs: 2000 }) {}

  async iniciar(): Promise<void> {
    this.conectado = true;
  }

  async detener(): Promise<void> {
    this.conectado = false;
    for (const resolver of this.pendientes) resolver({ ok: false, error: 'Driver detenido' });
    this.pendientes.clear();
  }

  estadoConexion() {
    return this.conectado ? ('conectado' as const) : ('desconectado' as const);
  }

  async leerSensores(): Promise<LecturaSensor[]> {
    return [...this.sensores.keys()].map((id) => this.lectura(id));
  }

  alCambiarPresencia(callback: (lectura: LecturaSensor) => void): () => void {
    this.oyentes.add(callback);
    return () => this.oyentes.delete(callback);
  }

  async accionar(actuadorId: string, accion: AccionLuz): Promise<ResultadoAccion> {
    if (!this.conectado) return { ok: false, error: 'hardware desconectado' };
    const servo = this.servo(actuadorId);
    const objetivo = accion === 'encender' ? 'on' : 'off';

    switch (servo.respuesta) {
      case 'ok':
        servo.estadoFisico = objetivo;
        return { ok: true, estadoReal: objetivo };
      case 'falla':
        return { ok: false, error: 'el servo no pudo mover el interruptor (simulado)' };
      case 'lento':
        await new Promise((resolver) => setTimeout(resolver, this.opciones.demoraLentoMs).unref());
        servo.estadoFisico = objetivo;
        return { ok: true, estadoReal: objetivo };
      case 'sin_respuesta':
        return new Promise((resolver) => this.pendientes.add(resolver));
    }
  }

  // ---- Controles de simulación ----

  /** Cambia la presencia de un sensor. Un sensor en falla o inactivo no informa nada. */
  simularPresencia(
    sensorId: string,
    presencia: boolean,
    conteoPersonas: number | null = null,
  ): void {
    const sensor = this.sensor(sensorId);
    sensor.presencia = presencia;
    sensor.conteoPersonas = conteoPersonas;
    if (sensor.conexion === 'activo') this.emitir(sensorId);
  }

  /** Simula que un sensor falla, se desconecta o se recupera. */
  simularConexionSensor(sensorId: string, conexion: Conexion): void {
    this.sensor(sensorId).conexion = conexion;
    this.emitir(sensorId);
  }

  configurarServo(actuadorId: string, respuesta: RespuestaServo): void {
    this.servo(actuadorId).respuesta = respuesta;
  }

  /** Alguien movió el interruptor a mano. */
  forzarLuz(actuadorId: string, estado: 'on' | 'off'): void {
    this.servo(actuadorId).estadoFisico = estado;
  }

  /** Vuelve todo a valores normales (sin presencia, sensores activos, servos ok, luces apagadas). */
  reiniciar(): void {
    for (const resolver of this.pendientes) resolver({ ok: false, error: 'Simulación reiniciada' });
    this.pendientes.clear();
    for (const id of this.sensores.keys()) this.sensores.set(id, sensorInicial());
    for (const id of this.servos.keys()) this.servos.set(id, servoInicial());
  }

  estadoSimulacion(): EstadoSimuladorDto {
    return {
      sensores: [...this.sensores].map(([id, s]) => ({ id, ...s })),
      actuadores: [...this.servos].map(([id, s]) => ({ id, ...s })),
      demoraLentoMs: this.opciones.demoraLentoMs,
    };
  }

  private lectura(sensorId: string): LecturaSensor {
    const sensor = this.sensor(sensorId);
    const activo = sensor.conexion === 'activo';
    return {
      sensorId,
      conexion: sensor.conexion,
      presencia: activo && sensor.presencia,
      conteoPersonas: activo ? sensor.conteoPersonas : null,
      fecha: new Date(),
    };
  }

  private emitir(sensorId: string): void {
    if (!this.conectado) return;
    const lectura = this.lectura(sensorId);
    for (const oyente of this.oyentes) oyente(lectura);
  }

  private sensor(id: string): SensorSimulado {
    let sensor = this.sensores.get(id);
    if (!sensor) this.sensores.set(id, (sensor = sensorInicial()));
    return sensor;
  }

  private servo(id: string): ServoSimulado {
    let servo = this.servos.get(id);
    if (!servo) this.servos.set(id, (servo = servoInicial()));
    return servo;
  }
}
