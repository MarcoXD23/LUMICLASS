import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto';

// Parámetros de scrypt (recomendados por OWASP para scrypt: N=2^15, r=8, p=1).
const N = 2 ** 15;
const R = 8;
const P = 1;
const LARGO_CLAVE = 64;
const MEMORIA_MAXIMA = 64 * 1024 * 1024;

function derivar(contrasena: string, sal: Buffer, opciones: ScryptOptions): Promise<Buffer> {
  return new Promise((resolver, rechazar) => {
    scrypt(contrasena.normalize('NFKC'), sal, LARGO_CLAVE, opciones, (error, clave) =>
      error ? rechazar(error) : resolver(clave),
    );
  });
}

/** Devuelve "scrypt$N$r$p$sal$hash" (base64url). La contraseña nunca se guarda tal cual. */
export async function hashearContrasena(contrasena: string): Promise<string> {
  const sal = randomBytes(16);
  const clave = await derivar(contrasena, sal, { N, r: R, p: P, maxmem: MEMORIA_MAXIMA });
  return ['scrypt', N, R, P, sal.toString('base64url'), clave.toString('base64url')].join('$');
}

/** Compara en tiempo constante. Un hash con formato inválido simplemente no coincide. */
export async function verificarContrasena(contrasena: string, guardado: string): Promise<boolean> {
  const partes = guardado.split('$');
  if (partes.length !== 6 || partes[0] !== 'scrypt') return false;
  const [, n, r, p, salTexto, claveTexto] = partes;
  const esperado = Buffer.from(claveTexto ?? '', 'base64url');
  if (esperado.length !== LARGO_CLAVE) return false;
  try {
    const clave = await derivar(contrasena, Buffer.from(salTexto ?? '', 'base64url'), {
      N: Number(n),
      r: Number(r),
      p: Number(p),
      maxmem: MEMORIA_MAXIMA,
    });
    return timingSafeEqual(clave, esperado);
  } catch {
    return false;
  }
}
