import type { AccionLuz } from '@lumiclass/compartido';
import type { DriverHardware, LecturaSensor, ResultadoAccion } from './driver';

type Responder = (actuadorId: string, accion: AccionLuz) => Promise<ResultadoAccion>;

const responderSiempreOk: Responder = async (_actuadorId, accion) => ({
  ok: true,
  estadoReal: accion === 'encender' ? 'on' : 'off',
});

/**
 * Driver mínimo: el servo siempre obedece y no hay lecturas de sensores.
 * Se usa en la Fase 4 y en pruebas; el simulador completo llega en la Fase 5.
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
    this.oyentes.clear();
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

  async accionar(actuadorId: string, accion: AccionLuz): Promise<ResultadoAccion> {
    if (!this.conectado) return { ok: false, error: 'Driver desconectado' };
    return this.responder(actuadorId, accion);
  }
}
