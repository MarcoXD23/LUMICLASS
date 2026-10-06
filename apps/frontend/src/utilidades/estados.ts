import type {
  Conexion,
  EstadoLuz,
  ModoZona,
  RespuestaServo,
  SeveridadAlerta,
} from '@lumiclass/compartido';
import {
  Bot,
  CircleCheck,
  CircleHelp,
  Hand,
  Lightbulb,
  LightbulbOff,
  Timer,
  TriangleAlert,
  User,
  UserX,
  WifiOff,
  type LucideIcon,
} from 'lucide-react';

/**
 * Cada estado se muestra con texto + ícono + color (nunca solo color).
 * Este archivo es la única fuente de esas equivalencias.
 */
export type Tono =
  | 'luzOn'
  | 'luzOff'
  | 'ocupado'
  | 'vacio'
  | 'error'
  | 'advertencia'
  | 'automatico'
  | 'manual'
  | 'ok'
  | 'neutro';

/** Clases completas (Tailwind solo detecta clases escritas literalmente). */
export const CLASES_TONO: Record<Tono, string> = {
  luzOn: 'border-luz-on bg-luz-on/15 text-amber-900',
  luzOff: 'border-luz-off bg-luz-off/10 text-slate-700',
  ocupado: 'border-ocupado bg-ocupado/10 text-green-900',
  vacio: 'border-vacio bg-vacio/10 text-blue-900',
  error: 'border-error bg-error/10 text-red-900',
  advertencia: 'border-advertencia bg-advertencia/10 text-orange-900',
  automatico: 'border-automatico bg-automatico/10 text-violet-900',
  manual: 'border-manual bg-manual/10 text-teal-900',
  ok: 'border-ocupado bg-ocupado/10 text-green-900',
  neutro: 'border-borde bg-slate-100 text-slate-700',
};

export interface Descripcion {
  texto: string;
  icono: LucideIcon;
  tono: Tono;
}

export function describirLuz(estado: EstadoLuz): Descripcion {
  if (estado === 'on') return { texto: 'Encendida', icono: Lightbulb, tono: 'luzOn' };
  if (estado === 'off') return { texto: 'Apagada', icono: LightbulbOff, tono: 'luzOff' };
  return { texto: 'Estado desconocido', icono: CircleHelp, tono: 'advertencia' };
}

export function describirOcupacion(ocupado: boolean | null): Descripcion {
  if (ocupado === true) return { texto: 'Ocupado', icono: User, tono: 'ocupado' };
  if (ocupado === false) return { texto: 'Vacío', icono: UserX, tono: 'vacio' };
  return { texto: 'Sin datos de presencia', icono: CircleHelp, tono: 'advertencia' };
}

export function describirModo(modo: ModoZona): Descripcion {
  return modo === 'automatico'
    ? { texto: 'Automático', icono: Bot, tono: 'automatico' }
    : { texto: 'Manual', icono: Hand, tono: 'manual' };
}

export function describirConexion(conexion: Conexion): Descripcion {
  if (conexion === 'activo') return { texto: 'Activo', icono: CircleCheck, tono: 'ok' };
  if (conexion === 'inactivo')
    return { texto: 'Desconectado', icono: WifiOff, tono: 'advertencia' };
  return { texto: 'En falla', icono: TriangleAlert, tono: 'error' };
}

export function describirSeveridad(severidad: SeveridadAlerta): Descripcion {
  return severidad === 'error'
    ? { texto: 'Error', icono: TriangleAlert, tono: 'error' }
    : { texto: 'Advertencia', icono: TriangleAlert, tono: 'advertencia' };
}

export const TEXTO_RESPUESTA_SERVO: Record<RespuestaServo, string> = {
  ok: 'Responde bien',
  falla: 'Falla al mover',
  lento: 'Lento',
  sin_respuesta: 'No responde',
};

export const ICONO_ESPERA = Timer;
