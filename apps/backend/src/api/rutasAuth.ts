import {
  esquemaLogin,
  esquemaRecuperar,
  esquemaRegistro,
  esquemaRestablecer,
} from '@lumiclass/compartido';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { Entorno } from '../config/entorno';
import { ErrorDominio } from '../dominio/errores';
import type { ServicioAutenticacion } from '../servicios/autenticacion';
import type { ServicioCorreo } from '../servicios/correo';
import { tokenDeCookie } from './autorizacion';
import { cookieBorrada, cookieDeSesion } from './cookies';
import { validar } from './manejoErrores';

const MENSAJE_RECUPERAR =
  'Si el correo está registrado, te enviamos un enlace para crear una contraseña nueva.';

/**
 * Dirección de la app para el enlace del correo. En modo simulado se usa el origen del
 * navegador (así funciona también desde un celular en la red local).
 * Con correo real debe usarse solo URL_APP, para que nadie pueda inyectar otro dominio.
 */
function urlDeLaApp(peticion: FastifyRequest, entorno: Entorno): string {
  const origen = peticion.headers.origin;
  if (entorno.CORREO_MODO === 'simulado' && origen && /^https?:\/\/[^/\s]+$/.test(origen)) {
    return origen;
  }
  return entorno.URL_APP;
}

/** Rutas públicas de autenticación (no exigen sesión). */
export function rutasAuth(
  api: FastifyInstance,
  auth: ServicioAutenticacion,
  correo: ServicioCorreo,
  entorno: Entorno,
): void {
  const cookie = (token: string) =>
    cookieDeSesion(token, auth.duracionSesionSegundos, entorno.COOKIE_SEGURA);

  api.post('/auth/registro', async (peticion, respuesta) => {
    const datos = validar(esquemaRegistro, peticion.body);
    const { usuario, token } = await auth.registrar(datos, peticion.ip);
    return respuesta.status(201).header('set-cookie', cookie(token)).send(usuario);
  });

  api.post('/auth/login', async (peticion, respuesta) => {
    const datos = validar(esquemaLogin, peticion.body);
    const { usuario, token } = await auth.iniciarSesion(datos, peticion.ip);
    return respuesta.header('set-cookie', cookie(token)).send(usuario);
  });

  api.post('/auth/logout', async (peticion, respuesta) => {
    const token = tokenDeCookie(peticion);
    if (token) await auth.cerrarSesion(token);
    return respuesta.status(204).header('set-cookie', cookieBorrada(entorno.COOKIE_SEGURA)).send();
  });

  api.get('/auth/sesion', async (peticion) => {
    const token = tokenDeCookie(peticion);
    const usuario = token ? await auth.usuarioDeToken(token) : null;
    if (!usuario) throw new ErrorDominio(401, 'NO_AUTENTICADO', 'No has iniciado sesión');
    return usuario;
  });

  api.post('/auth/recuperar', async (peticion) => {
    const { correo: direccion } = validar(esquemaRecuperar, peticion.body);
    await auth.solicitarRecuperacion(direccion, urlDeLaApp(peticion, entorno));
    return { mensaje: MENSAJE_RECUPERAR };
  });

  api.post('/auth/restablecer', async (peticion) => {
    const { token, contrasena } = validar(esquemaRestablecer, peticion.body);
    await auth.restablecer(token, contrasena);
    return { mensaje: 'Contraseña actualizada. Ya puedes iniciar sesión.' };
  });

  // Bandeja de prueba: solo existe mientras el correo es simulado.
  if (entorno.CORREO_MODO === 'simulado') {
    api.get('/auth/correos-simulados', () => correo.recientes());
  }
}
