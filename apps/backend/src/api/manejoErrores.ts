import type { RespuestaError } from '@lumiclass/compartido';
import type { FastifyError, FastifyInstance } from 'fastify';
import type { z } from 'zod';
import { datosInvalidos, ErrorDominio } from '../dominio/errores';

/** Valida datos de entrada con un esquema Zod; si fallan, lanza un 400 con mensaje en español. */
export function validar<T extends z.ZodType>(esquema: T, datos: unknown): z.infer<T> {
  const resultado = esquema.safeParse(datos ?? {});
  if (resultado.success) return resultado.data;
  const detalles = resultado.error.issues.map((problema) => ({
    campo: problema.path.join('.') || '(cuerpo)',
    mensaje: problema.message,
  }));
  const primero = detalles[0];
  throw datosInvalidos(
    primero ? `${primero.campo}: ${primero.mensaje}` : 'Datos inválidos',
    detalles,
  );
}

const ERRORES_HTTP: Record<number, { codigo: string; mensaje: string }> = {
  400: {
    codigo: 'SOLICITUD_INVALIDA',
    mensaje: 'La solicitud no tiene un formato válido (revisa el JSON)',
  },
  404: { codigo: 'RUTA_NO_ENCONTRADA', mensaje: 'La ruta no existe' },
  413: { codigo: 'CUERPO_DEMASIADO_GRANDE', mensaje: 'La solicitud es demasiado grande' },
  415: { codigo: 'TIPO_NO_SOPORTADO', mensaje: 'Envía los datos como application/json' },
};

const cuerpoError = (codigo: string, mensaje: string, detalles?: unknown): RespuestaError => ({
  error: { codigo, mensaje, ...(detalles === undefined ? {} : { detalles }) },
});

/** Todas las respuestas de error tienen la forma { error: { codigo, mensaje, detalles? } }. */
export function registrarManejoErrores(app: FastifyInstance): void {
  app.setErrorHandler((error: FastifyError | ErrorDominio, peticion, respuesta) => {
    if (error instanceof ErrorDominio) {
      if (error.estadoHttp >= 500) peticion.log.warn({ codigo: error.codigo }, error.message);
      return respuesta
        .status(error.estadoHttp)
        .send(cuerpoError(error.codigo, error.message, error.detalles));
    }
    const estado = error.statusCode ?? 500;
    const conocido = ERRORES_HTTP[estado];
    if (estado < 500 && conocido) {
      return respuesta.status(estado).send(cuerpoError(conocido.codigo, conocido.mensaje));
    }
    peticion.log.error(error);
    return respuesta.status(500).send(cuerpoError('ERROR_INTERNO', 'Error interno del servidor'));
  });

  app.setNotFoundHandler((peticion, respuesta) => {
    respuesta
      .status(404)
      .send(
        cuerpoError('RUTA_NO_ENCONTRADA', `La ruta ${peticion.method} ${peticion.url} no existe`),
      );
  });
}
