import { z } from 'zod';

// Valores permitidos de cada estado. La base de datos guarda texto y se valida con estas listas.

export const ESTADOS_LUZ = ['on', 'off', 'desconocido'] as const;
export const esquemaEstadoLuz = z.enum(ESTADOS_LUZ);
export type EstadoLuz = z.infer<typeof esquemaEstadoLuz>;

export const MODOS_ZONA = ['automatico', 'manual'] as const;
export const esquemaModoZona = z.enum(MODOS_ZONA);
export type ModoZona = z.infer<typeof esquemaModoZona>;

export const CONEXIONES = ['activo', 'inactivo', 'falla'] as const;
export const esquemaConexion = z.enum(CONEXIONES);
export type Conexion = z.infer<typeof esquemaConexion>;

export const TIPOS_SENSOR = ['pir', 'radar', 'ultrasonico', 'otro'] as const;
export type TipoSensor = (typeof TIPOS_SENSOR)[number];

export type NombreDriver = 'simulado' | 'real';

// Formas de las respuestas de la API (las fechas viajan como texto ISO).

export interface ActuadorDto {
  id: string;
  nombre: string;
  conexion: Conexion;
  ocupado: boolean;
  ultimoResultado: string | null;
  actualizadoEn: string;
}

export interface LuzDto {
  id: string;
  zonaId: string;
  nombre: string;
  estadoDeseado: Exclude<EstadoLuz, 'desconocido'>;
  estadoReal: EstadoLuz;
  actuador: ActuadorDto;
  actualizadoEn: string;
}

export interface SensorDto {
  id: string;
  zonaId: string;
  nombre: string;
  tipo: TipoSensor;
  conexion: Conexion;
  presencia: boolean;
  /** Solo existe si el hardware puede contar personas; si no, es null. */
  conteoPersonas: number | null;
  ultimaLectura: string | null;
  actualizadoEn: string;
}

export interface ZonaDto {
  id: string;
  nombre: string;
  modo: ModoZona;
  /** null si ningún sensor activo puede informar presencia. */
  ocupada: boolean | null;
  luces: LuzDto[];
  sensores: SensorDto[];
  actualizadoEn: string;
}

export type SeveridadAlerta = 'advertencia' | 'error';

export interface AlertaDto {
  severidad: SeveridadAlerta;
  entidad: 'sensor' | 'actuador' | 'luz' | 'hardware';
  entidadId: string | null;
  mensaje: string;
}

export interface EstadoSalonDto {
  salon: { id: string; nombre: string };
  /** null = desconocido (no hay sensores activos). */
  ocupado: boolean | null;
  personasDetectadas: number | null;
  resumen: {
    lucesEncendidas: number;
    lucesTotales: number;
    sensoresActivos: number;
    sensoresTotales: number;
  };
  zonas: ZonaDto[];
  alertas: AlertaDto[];
  hardware: 'conectado' | 'desconectado';
  ultimaActualizacion: string;
}

export interface RespuestaSalud {
  estado: 'ok' | 'degradado';
  driver: NombreDriver;
  baseDatos: 'ok' | 'error';
  hardware: 'conectado' | 'desconectado';
  fecha: string;
}

/** Formato único de error de la API. */
export interface RespuestaError {
  error: {
    codigo: string;
    mensaje: string;
    detalles?: unknown;
  };
}
