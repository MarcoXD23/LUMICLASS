import type { AccionLuz, EstadoLuz } from '@lumiclass/compartido';

export type ResultadoAccion =
  { ok: true; estadoReal: Exclude<EstadoLuz, 'desconocido'> } | { ok: false; error: string };

export interface LecturaSensor {
  sensorId: string;
  presencia: boolean;
  conteoPersonas: number | null;
  fecha: Date;
}

export type EstadoConexionDriver = 'conectado' | 'desconectado';

/**
 * Contrato que cumplen el driver simulado y el real (Fase 8).
 * El resto del backend solo habla con esta interfaz.
 */
export interface DriverHardware {
  readonly nombre: string;
  iniciar(): Promise<void>;
  detener(): Promise<void>;
  estadoConexion(): EstadoConexionDriver;
  leerSensores(): Promise<LecturaSensor[]>;
  /** Registra un aviso de cambio de presencia. Devuelve la función para cancelarlo. */
  alCambiarPresencia(callback: (lectura: LecturaSensor) => void): () => void;
  accionar(actuadorId: string, accion: AccionLuz): Promise<ResultadoAccion>;
}
