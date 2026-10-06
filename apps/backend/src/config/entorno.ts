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
  /** Cada cuánto se revisan las reglas aunque no cambie la presencia (reglas con horario). */
  INTERVALO_REGLAS_MS: z.coerce.number().int().min(1000).max(3_600_000).default(60_000),
  /** Demora del servo simulado en modo "lento". */
  SIM_DEMORA_LENTO_MS: z.coerce.number().int().min(0).max(30_000).default(2000),
  /** Máximo de pantallas conectadas en tiempo real (SSE) a la vez. */
  MAX_CONEXIONES_SSE: z.coerce.number().int().min(1).max(1000).default(50),
  /** Cada cuánto se envía un latido por SSE para que la conexión no se corte. */
  LATIDO_SSE_MS: z.coerce.number().int().min(1000).max(120_000).default(15_000),
  /** Días que se guardan los eventos del historial. */
  DIAS_RETENCION_EVENTOS: z.coerce.number().int().min(1).max(3650).default(90),
  /** Cuánto dura una sesión iniciada. */
  DURACION_SESION_HORAS: z.coerce.number().min(0.01).max(72).default(8),
  /** true solo con HTTPS: la cookie de sesión no viaja por HTTP. */
  COOKIE_SEGURA: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  /** Por ahora solo "simulado": los correos van a la consola y a la bandeja de prueba. */
  CORREO_MODO: z.enum(['simulado']).default('simulado'),
  /** Dirección de la app para los enlaces de los correos. */
  URL_APP: z.url().default('http://localhost:5173'),
  /** Primer administrador (se crea con los datos iniciales). */
  ADMIN_CORREO: z.email().default('admin@lumiclass.local'),
  ADMIN_NOMBRE: z.string().min(2).default('Administrador'),
  /** Si falta, se genera una al crear el admin y se muestra en la consola. */
  ADMIN_CONTRASENA: z.string().min(8).optional(),
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
