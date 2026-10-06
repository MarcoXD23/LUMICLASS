import type { RespuestaError } from '@lumiclass/compartido';

const BASE = '/api/v1';
const TIEMPO_MAXIMO_MS = 8000;

/** Funciones que se llaman cuando la API responde 401 (sesión vencida). */
export const avisosSesionVencida = new Set<() => void>();

/** Error de la API con un mensaje listo para mostrar al usuario. */
export class ErrorApi extends Error {
  constructor(
    readonly codigo: string,
    mensaje: string,
    /** 0 si no hubo respuesta (sin conexión o tiempo agotado). */
    readonly estadoHttp: number,
  ) {
    super(mensaje);
    this.name = 'ErrorApi';
  }

  get sinConexion(): boolean {
    return this.estadoHttp === 0;
  }
}

function esRespuestaError(valor: unknown): valor is RespuestaError {
  const error = (valor as RespuestaError | null)?.error;
  return typeof error?.codigo === 'string' && typeof error.mensaje === 'string';
}

interface OpcionesPedido {
  metodo?: 'GET' | 'POST' | 'PUT' | 'PATCH';
  cuerpo?: unknown;
  senal?: AbortSignal;
}

/**
 * Llama a la API y devuelve el JSON. Cualquier problema se convierte en ErrorApi:
 * - sin red o servidor apagado → SIN_CONEXION
 * - más de 8 s → TIEMPO_AGOTADO
 * - respuesta de error → el código y mensaje que envía la API
 */
export async function pedir<T>(ruta: string, opciones: OpcionesPedido = {}): Promise<T> {
  const limite = AbortSignal.timeout(TIEMPO_MAXIMO_MS);
  const senal = opciones.senal ? AbortSignal.any([opciones.senal, limite]) : limite;

  let respuesta: Response;
  try {
    respuesta = await fetch(`${BASE}${ruta}`, {
      method: opciones.metodo ?? 'GET',
      headers: opciones.cuerpo === undefined ? undefined : { 'content-type': 'application/json' },
      body: opciones.cuerpo === undefined ? undefined : JSON.stringify(opciones.cuerpo),
      signal: senal,
    });
  } catch (error) {
    if (opciones.senal?.aborted) throw error; // cancelado a propósito: no es un error para mostrar
    if (limite.aborted) {
      throw new ErrorApi('TIEMPO_AGOTADO', 'El servidor tardó demasiado en responder', 0);
    }
    throw new ErrorApi('SIN_CONEXION', 'Sin conexión con el servidor', 0);
  }

  if (respuesta.status === 204) return undefined as T;

  let datos: unknown = null;
  try {
    datos = await respuesta.json();
  } catch {
    // Respuesta sin JSON (p. ej. un proxy caído devolviendo HTML).
  }

  if (!respuesta.ok) {
    // La sesión venció o se cerró en otro lado: avisar para volver al login.
    if (respuesta.status === 401 && !ruta.startsWith('/auth/')) {
      for (const aviso of avisosSesionVencida) aviso();
    }
    if (esRespuestaError(datos)) {
      throw new ErrorApi(datos.error.codigo, datos.error.mensaje, respuesta.status);
    }
    const sinApi = respuesta.status === 502 || respuesta.status === 504;
    throw new ErrorApi(
      sinApi ? 'SIN_CONEXION' : 'ERROR_DESCONOCIDO',
      sinApi ? 'Sin conexión con el servidor' : `Error inesperado (HTTP ${respuesta.status})`,
      sinApi ? 0 : respuesta.status,
    );
  }
  if (datos === null) {
    throw new ErrorApi(
      'RESPUESTA_INVALIDA',
      'El servidor envió una respuesta inválida',
      respuesta.status,
    );
  }
  return datos as T;
}

/** Mensaje legible de cualquier error. */
export function mensajeDeError(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return 'Ocurrió un error inesperado';
}
