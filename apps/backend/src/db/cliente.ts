import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '../generated/prisma/client';

export type BaseDatos = PrismaClient;

/** Crea el cliente de Prisma sobre SQLite. `url` tiene la forma "file:./ruta.db". */
export function crearBaseDatos(url: string): BaseDatos {
  const adaptador = new PrismaBetterSqlite3({ url });
  return new PrismaClient({ adapter: adaptador });
}

/** true si la base responde. Nunca lanza error. */
export async function baseDatosDisponible(bd: BaseDatos): Promise<boolean> {
  try {
    await bd.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}
