import { z } from 'zod';

/** Base SQLite local (relativa a apps/backend). */
export const URL_BD_POR_DEFECTO = 'file:./prisma/dev.db';

const esquemaEntorno = z.object({
  PUERTO: z.coerce.number().int().min(1).max(65535).default(3000),
  HOST: z.string().min(1).default('127.0.0.1'),
  DRIVER: z.enum(['simulado', 'real']).default('simulado'),
  DATABASE_URL: z
    .string()
    .regex(/^file:.+/, 'Debe empezar con "file:" (SQLite)')
    .default(URL_BD_POR_DEFECTO),
  /** Tiempo máximo que se espera la confirmación de un servo. */
  TIEMPO_MAX_ACTUADOR_MS: z.coerce.number().int().min(100).max(60_000).default(3000),
});

export type Entorno = z.infer<typeof esquemaEntorno>;

/** Valida las variables de entorno. Lanza un error legible si alguna es inválida. */
export function leerEntorno(variables: NodeJS.ProcessEnv = process.env): Entorno {
  const resultado = esquemaEntorno.safeParse(variables);
  if (!resultado.success) {
    const detalles = resultado.error.issues
      .map((problema) => `  - ${problema.path.join('.')}: ${problema.message}`)
      .join('\n');
    throw new Error(`Configuración inválida en .env:\n${detalles}`);
  }
  return resultado.data;
}
