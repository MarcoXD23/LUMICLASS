export const NOMBRE_COOKIE_SESION = 'lumiclass_sesion';

/** Lee una cookie del encabezado "cookie" sin dependencias externas. */
export function leerCookie(encabezado: string | undefined, nombre: string): string | null {
  if (!encabezado) return null;
  for (const parte of encabezado.split(';')) {
    const separador = parte.indexOf('=');
    if (separador === -1) continue;
    if (parte.slice(0, separador).trim() !== nombre) continue;
    const valor = parte.slice(separador + 1).trim();
    try {
      return decodeURIComponent(valor);
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Cookie de sesión: httpOnly (JavaScript no la puede leer) y SameSite=Lax
 * (otro sitio no puede usarla para enviar órdenes). `segura` exige HTTPS.
 */
export function cookieDeSesion(token: string, segundos: number, segura: boolean): string {
  return [
    `${NOMBRE_COOKIE_SESION}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${segundos}`,
    ...(segura ? ['Secure'] : []),
  ].join('; ');
}

export const cookieBorrada = (segura: boolean): string => cookieDeSesion('', 0, segura);
