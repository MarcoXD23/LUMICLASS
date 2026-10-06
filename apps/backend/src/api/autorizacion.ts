import type { FastifyInstance, FastifyRequest } from 'fastify';
import { ErrorDominio } from '../dominio/errores';
import type { ServicioAutenticacion } from '../servicios/autenticacion';
import type { UsuarioSesion } from '../servicios/usuarios';
import { leerCookie, NOMBRE_COOKIE_SESION } from './cookies';

declare module 'fastify' {
  interface FastifyRequest {
    /** Usuario conectado (null en rutas públicas o sin sesión). */
    usuario: UsuarioSesion | null;
  }
}

export const tokenDeCookie = (peticion: FastifyRequest): string | null =>
  leerCookie(peticion.headers.cookie, NOMBRE_COOKIE_SESION);

/** Todas las rutas registradas en `api` exigen una sesión válida (401 si no la hay). */
export function exigirSesion(api: FastifyInstance, auth: ServicioAutenticacion): void {
  api.addHook('onRequest', async (peticion) => {
    const token = tokenDeCookie(peticion);
    const usuario = token ? await auth.usuarioDeToken(token) : null;
    if (!usuario) {
      throw new ErrorDominio(401, 'NO_AUTENTICADO', 'Tu sesión no está activa. Inicia sesión.');
    }
    peticion.usuario = usuario;
  });
}

/** Úsalo como preHandler en rutas que solo puede usar el admin. */
export async function soloAdmin(peticion: FastifyRequest): Promise<void> {
  if (peticion.usuario?.rol !== 'admin') {
    throw new ErrorDominio(403, 'SOLO_ADMIN', 'Solo el administrador puede hacer esto');
  }
}
