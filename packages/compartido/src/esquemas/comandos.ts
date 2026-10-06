import { z } from 'zod';
import { esquemaModoZona, type LuzDto } from './entidades';

export const ACCIONES_LUZ = ['encender', 'apagar'] as const;
export const esquemaAccionLuz = z.enum(ACCIONES_LUZ);
export type AccionLuz = z.infer<typeof esquemaAccionLuz>;

/**
 * Identificador que genera el cliente para cada orden (p. ej. crypto.randomUUID()).
 * Si la misma orden llega dos veces, la API no la ejecuta de nuevo.
 */
export const esquemaIdSolicitud = z
  .string()
  .trim()
  .min(8)
  .max(64)
  .regex(/^[A-Za-z0-9_-]+$/, 'Solo letras, números, guion y guion bajo');

export const esquemaComandoLuz = z.strictObject({
  accion: esquemaAccionLuz,
  idSolicitud: esquemaIdSolicitud,
});
export type ComandoLuz = z.infer<typeof esquemaComandoLuz>;

export const esquemaCambioModo = z.strictObject({
  modo: esquemaModoZona,
});
export type CambioModo = z.infer<typeof esquemaCambioModo>;

export interface RespuestaComandoLuz {
  luz: LuzDto;
  /** false si la luz ya estaba en el estado pedido y el servo no se movió. */
  cambio: boolean;
}

export interface ResultadoLuzEnZona {
  luzId: string;
  ok: boolean;
  cambio: boolean;
  error?: { codigo: string; mensaje: string };
}

export interface RespuestaComandoZona {
  zonaId: string;
  todasOk: boolean;
  resultados: ResultadoLuzEnZona[];
}
