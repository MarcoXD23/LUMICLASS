import type { AccionLuz, Conexion, EstadoLuz } from '@lumiclass/compartido';
import { conflicto, hardwareNoDisponible } from './errores';

export interface SituacionLuz {
  estadoReal: EstadoLuz;
  actuador: { conexion: Conexion; ocupado: boolean };
}

export type DecisionComando =
  { tipo: 'sin_cambio'; objetivo: 'on' | 'off' } | { tipo: 'accionar'; objetivo: 'on' | 'off' };

export const objetivoDeAccion = (accion: AccionLuz): 'on' | 'off' =>
  accion === 'encender' ? 'on' : 'off';

/**
 * Decide qué hacer con una orden sobre una luz. Lanza ErrorDominio si la orden es imposible.
 * - Servo en falla o inactivo → 503 (no se puede accionar).
 * - Servo ocupado con otra orden → 409.
 * - Luz ya en el estado pedido → no se mueve el servo.
 * - Estado real desconocido → se acciona para confirmar.
 */
export function decidirComando(situacion: SituacionLuz, accion: AccionLuz): DecisionComando {
  const objetivo = objetivoDeAccion(accion);
  const { actuador } = situacion;

  if (actuador.conexion === 'falla') {
    throw hardwareNoDisponible('ACTUADOR_EN_FALLA', 'El servo de esta luz está en falla');
  }
  if (actuador.conexion === 'inactivo') {
    throw hardwareNoDisponible('ACTUADOR_DESCONECTADO', 'El servo de esta luz está desconectado');
  }
  if (situacion.estadoReal === objetivo) {
    return { tipo: 'sin_cambio', objetivo };
  }
  if (actuador.ocupado) {
    throw conflicto('ACTUADOR_OCUPADO', 'El servo está ejecutando otra orden; intenta de nuevo');
  }
  return { tipo: 'accionar', objetivo };
}

/** Convierte texto guardado en la base a un estado válido; lo imposible se trata como desconocido. */
export function normalizarEstadoLuz(valor: string): EstadoLuz {
  return valor === 'on' || valor === 'off' ? valor : 'desconocido';
}

export function normalizarConexion(valor: string): Conexion {
  return valor === 'activo' || valor === 'inactivo' ? valor : 'falla';
}
