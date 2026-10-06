import type { AccionLuz } from '@lumiclass/compartido';
import type { DriverHardware, LecturaSensor, ResultadoAccion } from './driver';

type Responder = (actuadorId: string, accion: AccionLuz) => Promise<ResultadoAccion>;

const responderSiempreOk: Responder = async (_actuadorId, accion) => ({
  ok: true,
  estadoReal: accion === 'encender' ? 'on' : 'off',
});

/**
 * Driver mínimo para pruebas: el servo responde con `responder` (por defecto, siempre obedece)
 * y las lecturas de sensores se inyectan con `emitir()`. La app usa DriverSimulado.
 */
export class DriverEnMemoria implements DriverHardware {
  readonly nombre = 'memoria';
  private conectado = false;
  private readonly oyentes = new Set<(lectura: LecturaSensor) => void>();

  constructor(private readonly responder: Responder = responderSiempreOk) {}

  async iniciar(): Promise<void> {
    this.conectado = true;
  }

  async detener(): Promise<void> {
    this.conectado = false;
  }

  estadoConexion() {
    return this.conectado ? ('conectado' as const) : ('desconectado' as const);
  }

  async leerSensores(): Promise<LecturaSensor[]> {
    return [];
  }

  alCambiarPresencia(callback: (lectura: LecturaSensor) => void): () => void {
    this.oyentes.add(callback);
    return () => this.oyentes.delete(callback);
  }

  /** Envía una lectura a quien escuche (solo pruebas). */
  emitir(lectura: LecturaSensor): void {
    for (const oyente of this.oyentes) oyente(lectura);
  }

  async accionar(actuadorId: string, accion: AccionLuz): Promise<ResultadoAccion> {
    if (!this.conectado) return { ok: false, error: 'Driver desconectado' };
    return this.responder(actuadorId, accion);
  }
}
