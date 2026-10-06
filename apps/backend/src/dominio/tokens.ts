import { createHash, randomBytes } from 'node:crypto';

/** Token aleatorio de 256 bits, apto para URL y cookies. */
export const generarToken = (): string => randomBytes(32).toString('base64url');

/** En la base solo se guarda el hash: si alguien lee la base, no puede usar los tokens. */
export const hashDeToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex');
