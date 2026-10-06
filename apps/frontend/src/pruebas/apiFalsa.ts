import type {
  EstadoSalonDto,
  EstadoSimuladorDto,
  LuzDto,
  ReglaDto,
  RespuestaSalud,
  SensorDto,
  ZonaDto,
} from '@lumiclass/compartido';
import { vi } from 'vitest';

const FECHA = '2026-10-05T15:00:00.000Z';

export function luzEjemplo(cambios: Partial<LuzDto> = {}): LuzDto {
  return {
    id: 'luz-frente',
    zonaId: 'zona-frente',
    nombre: 'Luces frente',
    estadoDeseado: 'off',
    estadoReal: 'off',
    actuador: {
      id: 'servo-frente',
      nombre: 'Servo frente',
      conexion: 'activo',
      ocupado: false,
      ultimoResultado: null,
      actualizadoEn: FECHA,
    },
    actualizadoEn: FECHA,
    ...cambios,
  };
}

export function sensorEjemplo(cambios: Partial<SensorDto> = {}): SensorDto {
  return {
    id: 'sensor-frente',
    zonaId: 'zona-frente',
    nombre: 'PIR frente',
    tipo: 'pir',
    conexion: 'activo',
    presencia: false,
    conteoPersonas: null,
    ultimaLectura: FECHA,
    actualizadoEn: FECHA,
    ...cambios,
  };
}

export function zonaEjemplo(cambios: Partial<ZonaDto> = {}): ZonaDto {
  return {
    id: 'zona-frente',
    nombre: 'Frente',
    modo: 'automatico',
    ocupada: false,
    luces: [luzEjemplo()],
    sensores: [sensorEjemplo()],
    actualizadoEn: FECHA,
    ...cambios,
  };
}

export function estadoSalonEjemplo(cambios: Partial<EstadoSalonDto> = {}): EstadoSalonDto {
  return {
    salon: { id: 'salon-principal', nombre: 'Salón principal' },
    ocupado: false,
    personasDetectadas: null,
    resumen: { lucesEncendidas: 0, lucesTotales: 1, sensoresActivos: 1, sensoresTotales: 1 },
    zonas: [zonaEjemplo()],
    alertas: [],
    hardware: 'conectado',
    ultimaActualizacion: FECHA,
    ...cambios,
  };
}

export const saludEjemplo: RespuestaSalud = {
  estado: 'ok',
  driver: 'simulado',
  baseDatos: 'ok',
  hardware: 'conectado',
  fecha: FECHA,
};

export const reglasEjemplo: ReglaDto[] = [
  {
    id: 'regla-encender-ocupado',
    nombre: 'Encender al detectar presencia',
    activa: true,
    prioridad: 10,
    zonaId: null,
    condicion: { tipo: 'presencia', valor: 'ocupado', duracionSegundos: 0 },
    accion: { tipo: 'encender' },
    creadoEn: FECHA,
    actualizadoEn: FECHA,
    eliminadaEn: null,
  },
  {
    id: 'regla-apagar-vacio',
    nombre: 'Apagar cuando el salón queda vacío',
    activa: true,
    prioridad: 20,
    zonaId: null,
    condicion: { tipo: 'presencia', valor: 'vacio', duracionSegundos: 300 },
    accion: { tipo: 'apagar' },
    creadoEn: FECHA,
    actualizadoEn: FECHA,
    eliminadaEn: null,
  },
];

export const simuladorEjemplo: EstadoSimuladorDto = {
  sensores: [{ id: 'sensor-frente', presencia: false, conexion: 'activo', conteoPersonas: null }],
  actuadores: [{ id: 'servo-frente', respuesta: 'ok', estadoFisico: 'off' }],
  demoraLentoMs: 2000,
};

interface Respuesta {
  estado?: number;
  cuerpo?: unknown;
}
/** Calcula la respuesta a partir del cuerpo enviado. Si lanza un error, simula una red caída. */
type Manejador = (cuerpo: unknown) => Respuesta | Promise<Respuesta>;

export interface LlamadaRegistrada {
  metodo: string;
  /** Ruta sin /api/v1 ni parámetros. */
  ruta: string;
  /** Parámetros de la URL (?a=1&b=2). */
  parametros: URLSearchParams;
  cuerpo: unknown;
}

/**
 * Reemplaza fetch por una API falsa. Las claves son "MÉTODO /ruta" (sin /api/v1),
 * y cada valor es la respuesta o una función que la calcula a partir del cuerpo.
 * Rutas no definidas responden 404 con el formato de error de la API.
 */
export function instalarApiFalsa(rutas: Record<string, Respuesta | Manejador>) {
  const llamadas: LlamadaRegistrada[] = [];
  const fetchFalso = vi.fn(async (entrada: RequestInfo | URL, opciones: RequestInit = {}) => {
    const url = new URL(String(entrada), 'http://localhost');
    const ruta = url.pathname.replace(/^\/api\/v1/, '');
    const metodo = opciones.method ?? 'GET';
    const cuerpo =
      typeof opciones.body === 'string' ? (JSON.parse(opciones.body) as unknown) : undefined;
    llamadas.push({ metodo, ruta, parametros: url.searchParams, cuerpo });

    const definida = rutas[`${metodo} ${ruta}`];
    const respuesta: Respuesta = !definida
      ? { estado: 404, cuerpo: { error: { codigo: 'RUTA_NO_ENCONTRADA', mensaje: 'No existe' } } }
      : typeof definida === 'function'
        ? await definida(cuerpo)
        : definida;
    const estado = respuesta.estado ?? 200;
    return new Response(estado === 204 ? null : JSON.stringify(respuesta.cuerpo ?? null), {
      status: estado,
    });
  });
  vi.stubGlobal('fetch', fetchFalso);
  return { llamadas, fetchFalso };
}

/** Manejador que simula una red caída. */
export const redCaida: Manejador = () => Promise.reject(new TypeError('Failed to fetch'));

/**
 * EventSource falso para probar el tiempo real sin servidor.
 * Uso: `vi.stubGlobal('EventSource', EventSourceFalso)` y luego
 * `EventSourceFalso.ultima().emitir('evento', {...})`.
 */
export class EventSourceFalso {
  static instancias: EventSourceFalso[] = [];
  static ultima(): EventSourceFalso {
    const ultima = EventSourceFalso.instancias.at(-1);
    if (!ultima) throw new Error('No se abrió ninguna conexión de tiempo real');
    return ultima;
  }

  readyState = 0;
  onerror: ((evento: Event) => void) | null = null;
  private readonly oyentes = new Map<string, ((evento: MessageEvent<string>) => void)[]>();

  constructor(readonly url: string) {
    EventSourceFalso.instancias.push(this);
  }

  addEventListener(tipo: string, oyente: (evento: MessageEvent<string>) => void): void {
    this.oyentes.set(tipo, [...(this.oyentes.get(tipo) ?? []), oyente]);
  }

  close(): void {
    this.readyState = 2;
  }

  /** Simula un mensaje del servidor (`datos` se envía como JSON, o tal cual si es texto). */
  emitir(tipo: string, datos: unknown): void {
    this.readyState = 1;
    const data = typeof datos === 'string' ? datos : JSON.stringify(datos);
    for (const oyente of this.oyentes.get(tipo) ?? []) {
      oyente(new MessageEvent(tipo, { data }));
    }
  }

  /** Simula un corte. `cerrada` = el servidor rechazó la conexión (no reintenta solo). */
  fallar(cerrada = false): void {
    this.readyState = cerrada ? 2 : 0;
    this.onerror?.(new Event('error'));
  }
}

/** Respuestas de GET /auth/sesion para las pruebas. */
export const sesionAdmin = {
  id: 'u-admin',
  nombre: 'Admin Prueba',
  correo: 'admin@lumiclass.local',
  rol: 'admin' as const,
};
export const sesionUsuario = {
  id: 'u-docente',
  nombre: 'Docente Prueba',
  correo: 'docente@lumiclass.local',
  rol: 'usuario' as const,
};
export const sinSesion = {
  estado: 401,
  cuerpo: { error: { codigo: 'NO_AUTENTICADO', mensaje: 'No has iniciado sesión' } },
};
