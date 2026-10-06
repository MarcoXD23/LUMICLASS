// Tipos de estado compartidos entre backend y frontend.
// En la Fase 4 se agregan los esquemas Zod de las entidades.

export const ESTADOS_LUZ = ['on', 'off', 'desconocido'] as const;
export type EstadoLuz = (typeof ESTADOS_LUZ)[number];

export const MODOS_ZONA = ['automatico', 'manual'] as const;
export type ModoZona = (typeof MODOS_ZONA)[number];

export const CONEXIONES_SENSOR = ['activo', 'inactivo', 'falla'] as const;
export type ConexionSensor = (typeof CONEXIONES_SENSOR)[number];

export interface RespuestaSalud {
  estado: 'ok';
  driver: 'simulado' | 'real';
  fecha: string;
}
