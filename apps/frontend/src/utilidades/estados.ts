import type {
  Conexion,
  EventoDto,
  OrigenEvento,
  TipoEvento,
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
  Info,
  Lightbulb,
  LightbulbOff,
  ListChecks,
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

export const TEXTO_TIPO_EVENTO: Record<TipoEvento, string> = {
  luz_encendida: 'Luz encendida',
  luz_apagada: 'Luz apagada',
  presencia_detectada: 'Presencia detectada',
  salon_vacio: 'Zona sin presencia',
  modo_cambiado: 'Cambio de modo',
  regla_cambiada: 'Cambio en reglas',
  error_actuador: 'Error de servo',
  error_sensor: 'Error de sensor',
  sistema: 'Sistema',
};

export const TEXTO_ORIGEN: Record<OrigenEvento, string> = {
  usuario: 'Usuario',
  regla: 'Regla automática',
  sistema: 'Sistema',
  simulador: 'Simulador',
};

const ICONO_TIPO_EVENTO: Record<TipoEvento, { icono: LucideIcon; tono: Tono }> = {
  luz_encendida: { icono: Lightbulb, tono: 'luzOn' },
  luz_apagada: { icono: LightbulbOff, tono: 'luzOff' },
  presencia_detectada: { icono: User, tono: 'ocupado' },
  salon_vacio: { icono: UserX, tono: 'vacio' },
  modo_cambiado: { icono: Bot, tono: 'automatico' },
  regla_cambiada: { icono: ListChecks, tono: 'neutro' },
  error_actuador: { icono: TriangleAlert, tono: 'error' },
  error_sensor: { icono: TriangleAlert, tono: 'error' },
  sistema: { icono: Info, tono: 'neutro' },
};

/** Ícono y color de un evento del historial; la severidad manda sobre el tipo. */
export function describirEvento(evento: Pick<EventoDto, 'tipo' | 'severidad'>): Descripcion {
  const base = ICONO_TIPO_EVENTO[evento.tipo] ?? { icono: Info, tono: 'neutro' as const };
  const tono: Tono =
    evento.severidad === 'error'
      ? 'error'
      : evento.severidad === 'advertencia'
        ? 'advertencia'
        : base.tono;
  return { texto: TEXTO_TIPO_EVENTO[evento.tipo] ?? evento.tipo, icono: base.icono, tono };
}
